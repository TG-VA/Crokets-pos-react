import { supabase } from "../../../../../lib/supabaseClient";

export const fetchInventoryReportData = async (branchId = "ALL") => {
  try {
    // 1. Consultar productos y sucursales activas en inventario
    const inventoryQuery = supabase
      .from("branch_inventory")
      .select("product_id, branch_id, stock, min_stock, max_stock, is_active, has_been_stocked, cost_price, sale_price")
      .eq("is_active", true);

    if (branchId && branchId !== "ALL") {
      inventoryQuery.eq("branch_id", branchId);
    }

    const [productsRes, inventoryRes, departmentsRes] = await Promise.all([
      supabase
        .from("products")
        .select("id, barcode, name, cost_price, sale_price, tracks_inventory, is_kit, status, department_id, departments(id, name)")
        .eq("status", true)
        .order("name", { ascending: true }),
      inventoryQuery,
      supabase
        .from("departments")
        .select("id, name")
        .eq("status", true)
        .order("name", { ascending: true }),
    ]);

    if (productsRes.error) throw productsRes.error;
    if (inventoryRes.error) throw inventoryRes.error;
    if (departmentsRes.error) throw departmentsRes.error;

    const products = productsRes.data || [];
    const inventoryRows = inventoryRes.data || [];
    const departments = departmentsRes.data || [];

    // 2. Mapear inventario por producto
    // Cuando branchId === "ALL", calculamos la valorización exacta por cada sucursal
    // sumando (stock * cost_price) y (stock * sale_price) de cada registro individual.
    const inventoryMap = {};

    inventoryRows.forEach((row) => {
      const pId = row.product_id;
      const rowStock = Number(row.stock || 0);
      const rowCost = Number(row.cost_price ?? 0);
      const rowSale = Number(row.sale_price ?? 0);
      const rowMin = Number(row.min_stock || 0);
      const rowMax = Number(row.max_stock || 0);

      if (!inventoryMap[pId]) {
        inventoryMap[pId] = {
          product_id: pId,
          stock: 0,
          min_stock: 0,
          max_stock: 0,
          total_cost: 0,
          total_sale: 0,
          has_been_stocked: false,
          has_inventory_record: true,
          fallback_cost: rowCost,
          fallback_sale: rowSale,
        };
      }

      inventoryMap[pId].stock += rowStock;
      inventoryMap[pId].min_stock += rowMin;
      inventoryMap[pId].max_stock += rowMax;
      inventoryMap[pId].total_cost += rowStock > 0 ? rowStock * rowCost : 0;
      inventoryMap[pId].total_sale += rowStock > 0 ? rowStock * rowSale : 0;

      if (row.has_been_stocked) {
        inventoryMap[pId].has_been_stocked = true;
      }
    });

    // 3. Procesar items y calcular valorizaciones y estados
    let totalCostValuation = 0;
    let totalSaleValuation = 0;
    let totalUnits = 0;
    let exhaustedCount = 0;
    let lowStockCount = 0;
    let optimalStockCount = 0;
    let excessStockCount = 0;

    const items = products.map((product) => {
      const inv = inventoryMap[product.id];
      const tracks = product.tracks_inventory !== false && !product.is_kit;
      const baseCost = Number(product.cost_price || 0);
      const baseSale = Number(product.sale_price || 0);

      const stock = tracks ? Number(inv?.stock || 0) : 0;
      const minStock = tracks ? Number(inv?.min_stock || 0) : 0;
      const maxStock = tracks ? Number(inv?.max_stock || 0) : 0;
      const hasBeenStocked = Boolean(inv?.has_been_stocked);

      // Costo y precio unitario efectivo (promedio ponderado si hay existencias consolidadas)
      let costPrice = baseCost;
      let salePrice = baseSale;

      if (inv) {
        if (stock > 0 && inv.total_cost > 0) {
          costPrice = inv.total_cost / stock;
        } else if (inv.fallback_cost > 0) {
          costPrice = inv.fallback_cost;
        }

        if (stock > 0 && inv.total_sale > 0) {
          salePrice = inv.total_sale / stock;
        } else if (inv.fallback_sale > 0) {
          salePrice = inv.fallback_sale;
        }
      }

      const totalCost = tracks && inv ? inv.total_cost : (stock > 0 ? stock * costPrice : 0);
      const totalSale = tracks && inv ? inv.total_sale : (stock > 0 ? stock * salePrice : 0);

      // Determinación precisa del estado de stock
      let status = "optimal";
      let statusLabel = "Óptimo";

      if (!tracks) {
        status = "no_control";
        statusLabel = product.is_kit ? "Kit" : "Sin control";
      } else if (!hasBeenStocked && stock <= 0) {
        // El producto no ha sido surtido en esta sucursal (no es un quiebre de stock)
        status = "not_stocked";
        statusLabel = "No surtido";
      } else if (stock <= 0) {
        // Ha sido surtido previamente y se agotó la existencia
        status = "exhausted";
        statusLabel = "Agotado";
        exhaustedCount += 1;
      } else if (minStock > 0 && stock <= minStock) {
        status = "low";
        statusLabel = "Stock Bajo";
        lowStockCount += 1;
      } else if (maxStock > 0 && stock > maxStock) {
        status = "excess";
        statusLabel = "Exceso";
        excessStockCount += 1;
      } else {
        status = "optimal";
        statusLabel = "Óptimo";
        optimalStockCount += 1;
      }

      if (stock > 0 && tracks) {
        totalCostValuation += totalCost;
        totalSaleValuation += totalSale;
        totalUnits += stock;
      }

      // Reglas de negocio para el cálculo de sugerencia de reorden:
      // 1. Si el producto tiene stock máximo configurado (> 0): pedir la diferencia (maxStock - stock).
      // 2. Si no tiene stock máximo pero tiene stock mínimo (> 0): sugerir abastecer el doble del mínimo (2 * minStock - stock).
      // 3. Si no tiene mínimos ni máximos pero está agotado y ya fue surtido: sugerir 1 unidad como cantidad base mínima.
      let suggestedQty = 0;
      if (tracks && (status === "exhausted" || status === "low")) {
        if (maxStock > 0 && maxStock > stock) {
          suggestedQty = maxStock - stock;
        } else if (minStock > 0 && minStock >= stock) {
          suggestedQty = (minStock * 2) - stock;
        } else if (status === "exhausted") {
          suggestedQty = 1;
        }
      }

      const estimatedInvestment = suggestedQty * costPrice;
      const departmentName = product.departments?.name || "Sin departamento";

      return {
        id: product.id,
        barcode: product.barcode || "",
        name: product.name || "Sin nombre",
        departmentId: product.department_id,
        departmentName,
        tracks_inventory: tracks,
        is_kit: Boolean(product.is_kit),
        stock,
        min_stock: minStock,
        max_stock: maxStock,
        cost_price: costPrice,
        sale_price: salePrice,
        total_cost: totalCost,
        total_sale: totalSale,
        status,
        statusLabel,
        has_been_stocked: hasBeenStocked,
        suggestedQty,
        estimatedInvestment,
      };
    });

    // 4. Calcular KPIs consolidados
    const projectedProfit = Math.max(totalSaleValuation - totalCostValuation, 0);
    const profitMargin = totalSaleValuation > 0 ? (projectedProfit / totalSaleValuation) * 100 : 0;

    const kpis = {
      totalCostValuation,
      totalSaleValuation,
      projectedProfit,
      profitMargin,
      totalUnits,
      totalSkus: items.filter((i) => i.tracks_inventory).length,
      exhaustedCount,
      lowStockCount,
      optimalStockCount,
      excessStockCount,
    };

    // 5. Agrupación y rendimiento por departamento
    const deptAccumulator = {};
    items.forEach((item) => {
      const deptName = item.departmentName || "Sin departamento";
      if (!deptAccumulator[deptName]) {
        deptAccumulator[deptName] = {
          name: deptName,
          productCount: 0,
          totalUnits: 0,
          totalCost: 0,
          totalSale: 0,
        };
      }
      deptAccumulator[deptName].productCount += 1;
      deptAccumulator[deptName].totalUnits += item.stock;
      deptAccumulator[deptName].totalCost += item.total_cost;
      deptAccumulator[deptName].totalSale += item.total_sale;
    });

    const byDepartment = Object.values(deptAccumulator)
      .map((dept) => ({
        ...dept,
        percentage: totalCostValuation > 0 ? (dept.totalCost / totalCostValuation) * 100 : 0,
      }))
      .sort((a, b) => b.totalCost - a.totalCost);

    // 6. Listas especializadas
    const reorderSuggestions = items
      .filter((i) => i.tracks_inventory && (i.status === "exhausted" || i.status === "low"))
      .sort((a, b) => a.stock - b.stock);

    const exhaustedProducts = items
      .filter((i) => i.tracks_inventory && i.status === "exhausted")
      .sort((a, b) => a.name.localeCompare(b.name));

    return {
      items,
      kpis,
      byDepartment,
      reorderSuggestions,
      exhaustedProducts,
      departments,
    };
  } catch (error) {
    console.error("Error al obtener datos del reporte de inventario:", error);
    throw error;
  }
};
