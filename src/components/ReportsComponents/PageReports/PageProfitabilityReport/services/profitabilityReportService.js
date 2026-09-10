/**
 * profitabilityReportService.js
 * Servicio de consultas a base de datos (Supabase) para el Reporte de Rentabilidad.
 */

import { supabase } from "../../../../../lib/supabaseClient";
import {
  aggregateProductsProfitability,
  aggregateDepartmentsProfitability,
  calculateProfitabilityKpis,
} from "./profitabilityReportCalculationService";

/**
 * Consulta la lista de sucursales activas
 */
export const fetchBranchesList = async () => {
  try {
    const { data, error } = await supabase
      .from("branches")
      .select("id, name, timezone, code")
      .order("name", { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("Error al consultar sucursales en profitabilityReportService:", err);
    return [];
  }
};

/**
 * Consulta la lista de departamentos de productos
 */
export const fetchDepartmentsList = async () => {
  try {
    const { data, error } = await supabase
      .from("departments")
      .select("id, name")
      .order("name", { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("Error al consultar departamentos en profitabilityReportService:", err);
    return [];
  }
};

/**
 * Consulta y consolida los datos de rentabilidad para el periodo y filtros dados
 */
export const fetchProfitabilityReportData = async ({
  branchId = "ALL",
  departmentId = "ALL",
  startDate = null,
  endDate = null,
}) => {
  try {
    // 1-3. Cargar catalogos en paralelo (departments, products, kits no dependen entre si)
    const [departmentsList, productsRes, kitsRes] = await Promise.all([
      fetchDepartmentsList(),
      supabase
        .from("products")
        .select("id, name, barcode, department_id, cost_price, sale_price, status, is_kit"),
      supabase
        .from("product_kits")
        .select(`
          id,
          kit_product_id,
          is_active,
          product_kit_items (
            component_product_id,
            quantity
          )
        `),
    ]);

    if (productsRes.error) throw productsRes.error;

    const departmentsMap = {};
    for (const d of departmentsList) {
      departmentsMap[d.id] = d;
    }

    const productsMap = {};
    for (const p of productsRes.data || []) {
      productsMap[p.id] = p;
    }

    if (kitsRes.error) {
      console.error("Error al consultar kits de productos en profitabilityReportService:", kitsRes.error);
    }

    const kitsMap = {};
    for (const kit of kitsRes.data || []) {
      if (kit.kit_product_id) {
        kitsMap[kit.kit_product_id] = kit;
      }
    }

    // 4. Cargar inventario por sucursal y ventas del periodo en paralelo
    let branchInvQuery = supabase
      .from("branch_inventory")
      .select("branch_id, product_id, cost_price, sale_price, stock");

    if (branchId !== "ALL") {
      branchInvQuery = branchInvQuery.eq("branch_id", branchId);
    }

    let salesQuery = supabase
      .from("sales")
      .select("id, sale_date, total, discount_total, status, branch_id")
      .not("status", "in", '("cancelled","cancelada")');

    if (branchId !== "ALL") {
      salesQuery = salesQuery.eq("branch_id", branchId);
    }

    if (startDate) {
      const startIso = new Date(startDate);
      startIso.setHours(0, 0, 0, 0);
      salesQuery = salesQuery.gte("sale_date", startIso.toISOString());
    }

    if (endDate) {
      const endIso = new Date(endDate);
      endIso.setHours(23, 59, 59, 999);
      salesQuery = salesQuery.lte("sale_date", endIso.toISOString());
    }

    const [branchInvResult, salesResult] = await Promise.all([
      branchInvQuery,
      salesQuery,
    ]);

    if (branchInvResult.error) {
      console.error("Error al consultar inventario por sucursal para costos:", branchInvResult.error);
    }

    const branchInvData = branchInvResult.data || [];

    const branchInventoryMap = {};
    for (const row of branchInvData) {
      const key = `${row.branch_id}_${row.product_id}`;
      branchInventoryMap[key] = row;
    }

    // 5. Procesar ventas del periodo
    const salesData = salesResult.data || [];

    const salesList = salesData;
    const salesMap = {};
    const saleIds = [];

    for (const s of salesList) {
      salesMap[s.id] = s;
      saleIds.push(s.id);
    }

    // 5. Cargar detalles de venta (sale_details) por lotes de seguridad (chunks de 100)
    let saleDetailsList = [];
    if (saleIds.length > 0) {
      const CHUNK_SIZE = 100;
      const MAX_SALES = 600;
      const limitedSaleIds = saleIds.slice(0, MAX_SALES);

      for (let i = 0; i < limitedSaleIds.length; i += CHUNK_SIZE) {
        const chunk = limitedSaleIds.slice(i, i + CHUNK_SIZE);
        const { data: chunkDetails, error: chunkErr } = await supabase
          .from("sale_details")
          .select(`
            id,
            sale_id,
            product_id,
            quantity,
            unit_price,
            discount_amount,
            total_price,
            products:product_id (
              id,
              name,
              barcode,
              department_id,
              cost_price
            )
          `)
          .in("sale_id", chunk);

        if (!chunkErr && chunkDetails) {
          saleDetailsList = saleDetailsList.concat(chunkDetails);
        } else if (chunkErr) {
          console.error("Error al cargar lote de detalles de venta:", chunkErr);
        }
      }
    }

    // 6. Filtrar por departamento si está seleccionado en los filtros
    let filteredDetails = saleDetailsList;
    if (departmentId !== "ALL") {
      filteredDetails = saleDetailsList.filter((d) => {
        const prod = productsMap[d.product_id] || d.products;
        const isKit = prod?.is_kit || !!kitsMap[d.product_id];
        if (departmentId === "KIT_PROMO") {
          return isKit && (!prod?.department_id || String(prod.department_id) === "KIT_PROMO");
        }
        return prod && String(prod.department_id) === String(departmentId);
      });
    }

    // 7. Calcular agregaciones de productos, departamentos y KPIs considerando kits
    const productsProfitability = aggregateProductsProfitability({
      saleDetails: filteredDetails,
      salesMap,
      branchInventoryMap,
      productsMap,
      departmentsMap,
      kitsMap,
    });

    const kpis = calculateProfitabilityKpis({
      productsProfitabilityList: productsProfitability,
      totalSalesCount: salesList.length,
    });

    const departmentsProfitability = aggregateDepartmentsProfitability({
      productsProfitabilityList: productsProfitability,
      departmentsMap,
      totalBusinessProfit: kpis.grossProfit,
    });

    // Añadir la opción "Kits y Promociones" a la lista de departamentos si existen kits
    const hasKits = Object.keys(kitsMap).length > 0;
    const finalDepartmentsList = hasKits
      ? [...departmentsList, { id: "KIT_PROMO", name: "Kits y Promociones" }]
      : departmentsList;

    return {
      productsProfitability,
      departmentsProfitability,
      departmentsList: finalDepartmentsList,
      kpis,
      totalSalesCount: salesList.length,
    };
  } catch (err) {
    console.error("Error al obtener datos del reporte de rentabilidad:", err);
    throw err;
  }
};
