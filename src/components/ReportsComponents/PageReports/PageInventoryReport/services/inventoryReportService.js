import { supabase } from "../../../../../lib/supabaseClient";

export const fetchInventoryReportData = async (branchId = "ALL") => {
  try {
    // 1. Consultar productos y departamentos
    const [productsRes, inventoryRes, departmentsRes] = await Promise.all([
      supabase
        .from("products")
        .select("id, barcode, name, cost_price, sale_price, tracks_inventory, is_kit, status, department_id, departments(id, name)")
        .eq("status", true)
        .order("name", { ascending: true }),
      
      branchId && branchId !== "ALL"
        ? supabase
            .from("branch_inventory")
            .select("product_id, branch_id, stock, min_stock, max_stock, is_active, has_been_stocked, cost_price, sale_price")
            .eq("branch_id", branchId)
        : supabase
            .from("branch_inventory")
            .select("product_id, branch_id, stock, min_stock, max_stock, is_active, has_been_stocked, cost_price, sale_price"),

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
    const inventoryMap = {};
    if (branchId !== "ALL") {
      inventoryRows.forEach((row) => {
        inventoryMap[row.product_id] = row;
      });
    } else {
      // Consolidar inventarios de todas las sucursales
      inventoryRows.forEach((row) => {
        const pId = row.product_id;
        if (!inventoryMap[pId]) {
          inventoryMap[pId] = {
            product_id: pId,
            stock: 0,
            min_stock: 0,
            max_stock: 0,
            cost_price: row.cost_price,
            sale_price: row.sale_price,
            is_active: row.is_active,
            has_been_stocked: row.has_been_stocked,
          };
        }
        inventoryMap[pId].stock += Number(row.stock || 0);
        inventoryMap[pId].min_stock += Number(row.min_stock || 0);
        inventoryMap[pId].max_stock += Number(row.max_stock || 0);
      });
    }

    // 3. Procesar items y calcular valorizaciones individuales
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
      
      const stock = tracks ? Number(inv?.stock || 0) : 0;
      const minStock = tracks ? Number(inv?.min_stock || 0) : 0;
      const maxStock = tracks ? Number(inv?.max_stock || 0) : 0;
      
      const costPrice = Number(inv?.cost_price ?? product.cost_price ?? 0);
      const salePrice = Number(inv?.sale_price ?? product.sale_price ?? 0);
      
      const totalCost = stock > 0 ? stock * costPrice : 0;
      const totalSale = stock > 0 ? stock * salePrice : 0;

      let status = "optimal";
      let statusLabel = "Óptimo";

      if (!tracks) {
        status = "no_control";
        statusLabel = product.is_kit ? "Kit" : "Sin inventario";
      } else if (stock <= 0) {
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

      // Cálculo de cantidad sugerida de reorden
      let suggestedQty = 0;
      if (tracks && (status === "exhausted" || status === "low")) {
        if (maxStock > 0 && maxStock > stock) {
          suggestedQty = maxStock - stock;
        } else if (minStock > 0 && minStock >= stock) {
          suggestedQty = (minStock * 2) - stock;
        } else {
          suggestedQty = stock <= 0 ? 5 : 1;
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
