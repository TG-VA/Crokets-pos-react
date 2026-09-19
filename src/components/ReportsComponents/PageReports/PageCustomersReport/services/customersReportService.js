/**
 * customersReportService.js
 * Servicio de consultas a base de datos (Supabase) para el Reporte de Clientes.
 */

import { supabase } from "../../../../../lib/supabaseClient";
import {
  calculatePointsByCustomer,
  aggregateSalesByCustomer,
  calculateCustomersKpis,
  aggregateTopProducts,
} from "./customersReportCalculationService";
import { getDaysAgo, getCustomerRiskBadge } from "../utils/customersReportFormatters";

/**
 * Obtiene la lista de sucursales disponibles
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
    console.error("Error al consultar sucursales en customersReportService:", err);
    return [];
  }
};

/**
 * Obtiene los datos consolidados para el reporte de clientes según filtros (historial completo)
 */
export const fetchCustomersReportData = async ({
  branchId = "ALL",
  customerType = "ALL", // "ALL", "POINTS", "BILLING"
}) => {
  try {
    // 1. Cargar catálogo de clientes
    const customersQuery = supabase
      .from("customers")
      .select(`
        id,
        name,
        phone,
        email,
        rfc,
        is_billing_customer,
        is_points_customer,
        status,
        created_at
      `);

    // 2. Cargar historial completo de ventas para clientes identificados
    let salesQuery = supabase
      .from("sales")
      .select(`
        id,
        sale_date,
        total,
        discount_total,
        status,
        customer_id,
        branch_id
      `)
      .not("customer_id", "is", null);

    if (branchId !== "ALL") salesQuery = salesQuery.eq("branch_id", branchId);

    // 3. Cargar historial completo de movimientos de puntos
    let pointsQuery = supabase
      .from("customer_points")
      .select(`
        id,
        customer_id,
        points,
        movement_type,
        source,
        branch_id,
        created_at
      `);

    if (branchId !== "ALL") pointsQuery = pointsQuery.eq("branch_id", branchId);

    // 4. Cargar historial completo de redenciones de recompensas
    let redemptionsQuery = supabase
      .from("sale_reward_redemptions")
      .select(`
        id,
        sale_id,
        customer_id,
        branch_id,
        reward_name,
        product_name,
        quantity,
        total_points,
        discount_amount,
        created_at
      `);

    if (branchId !== "ALL") redemptionsQuery = redemptionsQuery.eq("branch_id", branchId);

    const branchesQuery = supabase
      .from("branches")
      .select("id, name, timezone, code");

    // Ejecutar consultas principales en paralelo
    const [
      customersRes,
      salesRes,
      pointsRes,
      redemptionsRes,
      branchesRes,
    ] = await Promise.all([
      customersQuery,
      salesQuery,
      pointsQuery,
      redemptionsQuery,
      branchesQuery,
    ]);

    if (customersRes.error) throw customersRes.error;
    if (salesRes.error) throw salesRes.error;
    if (pointsRes.error) throw pointsRes.error;
    if (redemptionsRes.error) throw redemptionsRes.error;

    const allCustomersList = customersRes.data || [];
    const salesList = salesRes.data || [];
    const pointsList = pointsRes.data || [];
    const rawRedemptionsList = redemptionsRes.data || [];

    // Mapa general de clientes para lookup de nombres y datos
    const customerMap = {};
    for (const c of allCustomersList) {
      customerMap[c.id] = c;
    }

    // Mapa general de sucursales para lookup de nombres
    const branchMap = {};
    for (const b of (branchesRes.data || [])) {
      branchMap[b.id] = b;
    }

    // Enriquecer canjes con nombre de cliente y nombre de sucursal
    const redemptionsList = rawRedemptionsList.map((r) => {
      const cust = customerMap[r.customer_id] || null;
      const branch = branchMap[r.branch_id] || null;
      return {
        ...r,
        customer_name: cust?.name || "Cliente General",
        branch_name: branch?.name || "Sucursal",
        timezone: branch?.timezone || "America/Cancun",
      };
    });

    // Filtrar clientes para el ranking según customerType
    const customersList = allCustomersList.filter((c) => {
      if (customerType === "POINTS") return c.is_points_customer === true;
      if (customerType === "BILLING") return c.is_billing_customer === true;
      return true;
    });

    // 5. Cargar detalles de venta (productos) con protección contra saturación
    const saleIds = salesList.map((s) => s.id);
    let saleDetailsList = [];

    if (saleIds.length > 0) {
      // Tomamos hasta las 500 ventas más recientes para no colapsar la conexión con miles de queries
      const saleIdsForDetails = saleIds.slice(0, 500);
      const chunkSize = 100;

      for (let i = 0; i < saleIdsForDetails.length; i += chunkSize) {
        const chunk = saleIdsForDetails.slice(i, i + chunkSize);
        const { data: chunkData, error: chunkErr } = await supabase
          .from("sale_details")
          .select(`
            id,
            sale_id,
            product_id,
            quantity,
            unit_price,
            total_price,
            products (
              id,
              name,
              barcode
            ),
            sales (
              customer_id,
              sale_date,
              created_at
            )
          `)
          .in("sale_id", chunk);

        if (!chunkErr && chunkData) {
          saleDetailsList.push(...chunkData);
        }
      }
    }

    // 6. Procesar y cruzar datos
    const pointsMap = calculatePointsByCustomer(pointsList);
    const salesMap = aggregateSalesByCustomer(salesList);

    // Conteo de recompensas canjeadas por cliente
    const redemptionsMap = {};
    for (const red of redemptionsList) {
      const cId = red.customer_id;
      if (!cId) continue;
      if (!redemptionsMap[cId]) {
        redemptionsMap[cId] = {
          count: 0,
          totalDiscount: 0,
          pointsUsed: 0,
        };
      }
      redemptionsMap[cId].count += Number(red.quantity || 1);
      redemptionsMap[cId].totalDiscount += Number(red.discount_amount || 0);
      redemptionsMap[cId].pointsUsed += Number(red.total_points || 0);
    }

    // Armar tabla de ranking unificada
    const rankedCustomers = customersList.map((cust) => {
      const sData = salesMap[cust.id] || {
        totalSpent: 0,
        totalDiscounts: 0,
        purchasesCount: 0,
        lastSaleDate: null,
      };

      const pData = pointsMap[cust.id] || {
        balance: 0,
        earned: 0,
        redeemed: 0,
      };

      const rData = redemptionsMap[cust.id] || {
        count: 0,
        totalDiscount: 0,
        pointsUsed: 0,
      };

      const averageTicket =
        sData.purchasesCount > 0 ? sData.totalSpent / sData.purchasesCount : 0;

      const daysAgo = getDaysAgo(sData.lastSaleDate);
      const riskInfo = getCustomerRiskBadge(daysAgo);

      return {
        id: cust.id,
        name: cust.name || "Cliente sin nombre",
        phone: cust.phone || "",
        email: cust.email || "",
        rfc: cust.rfc || "",
        isBillingCustomer: cust.is_billing_customer || false,
        isPointsCustomer: cust.is_points_customer || false,
        status: cust.status !== false,
        totalSpent: sData.totalSpent,
        totalDiscounts: sData.totalDiscounts,
        purchasesCount: sData.purchasesCount,
        averageTicket,
        lastSaleDate: sData.lastSaleDate,
        daysAgo,
        riskInfo,
        pointsBalance: pData.balance,
        pointsEarned: pData.earned,
        pointsRedeemed: pData.redeemed,
        rewardsRedeemedCount: rData.count,
        rewardsDiscountSum: rData.totalDiscount,
      };
    })
    .filter((c) => c.purchasesCount > 0);

    // Calcular KPIs
    const kpis = calculateCustomersKpis({
      rankedCustomers,
      pointsRows: pointsList,
      redemptionsRows: redemptionsList,
    });

    // Calcular Top Productos con detalle de compradores
    const topProducts = aggregateTopProducts(saleDetailsList, customerMap);

    return {
      rankedCustomers,
      kpis,
      topProducts,
      redemptionsList,
      pointsList,
      salesCount: salesList.length,
    };
  } catch (err) {
    console.error("Error al obtener datos del reporte de clientes:", err);
    throw err;
  }
};

// Re-exportar fetchCustomerDetailReport para retrocompatibilidad
export { fetchCustomerDetailReport } from "./customerDetailService";
