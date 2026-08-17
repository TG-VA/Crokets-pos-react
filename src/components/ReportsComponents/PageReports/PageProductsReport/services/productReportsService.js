import { supabase } from "../../../../../lib/supabaseClient";

export const fetchProductsReportData = async ({ startDate, endDate, branchId }) => {
  if (!startDate || !endDate || !branchId) {
    throw new Error("Parámetros de consulta incompletos.");
  }

  // 1. CONSULTAR VENTAS DEL PERIODO  
  let salesQuery = supabase
    .from("sale_details")
    .select(`
      quantity,
      total_price,
      product_id,
      products (
        name,
        barcode,
        department_id,
        department:departments ( name ) 
      ),
      sales!inner ( status, branch_id, created_at )
    `)
    .eq("sales.status", "completed")
    .gte("sales.created_at", startDate)
    .lte("sales.created_at", endDate);

  if (branchId !== "ALL") {
    salesQuery = salesQuery.eq("sales.branch_id", branchId);
  }

  const { data: saleDetails, error: salesError } = await salesQuery;

  if (salesError) throw salesError;

  // 2. AGREGACIÓN DE DATOS EN MEMORIA (VENTAS)
  const productMap = {};
  const departmentMap = {};
  const soldProductIds = new Set();
  let totalUnits = 0;
  let totalRevenue = 0;

  (saleDetails || []).forEach((detail) => {
    const qty = Number(detail.quantity || 0);
    const revenue = Number(detail.total_price || 0);
    const productId = detail.product_id;
    const productName = detail.products?.name || "Producto Desconocido";
    
    const deptName = detail.products?.department?.name || detail.products?.departments?.name || "Sin Departamento";

    if (productId) {
      soldProductIds.add(productId);
    }

    totalUnits += qty;
    totalRevenue += revenue;

    if (!productMap[productId]) {
      productMap[productId] = {
        id: productId,
        name: productName,
        barcode: detail.products?.barcode,
        quantity: 0,
        revenue: 0,
      };
    }
    productMap[productId].quantity += qty;
    productMap[productId].revenue += revenue;

    if (!departmentMap[deptName]) {
      departmentMap[deptName] = { name: deptName, quantity: 0, revenue: 0 };
    }
    departmentMap[deptName].quantity += qty;
    departmentMap[deptName].revenue += revenue;
  });

  // 3. CONSULTAR INVENTARIO (CRUZAR STOCK Y MUERTOS)
  let inventoryQuery = supabase
    .from("branch_inventory")
    .select(`
      stock,
      product_id,
      products (
        id,
        name,
        barcode,
        department:departments ( name ) 
      )
    `)
    .eq("is_active", true); // Quitamos el > 0 temporalmente para ver todo el panorama

  if (branchId !== "ALL") {
    inventoryQuery = inventoryQuery.eq("branch_id", branchId);
  }

  const { data: inventoryRows, error: inventoryError } = await inventoryQuery;
  if (inventoryError) throw inventoryError;

  const deadStockMap = {};
  const globalStockMap = {};

  (inventoryRows || []).forEach((inv) => {
    const pId = inv.product_id;
    const currentStock = Number(inv.stock || 0);

    // Guardamos el stock global de cada producto
    if (pId) {
      if (!globalStockMap[pId]) globalStockMap[pId] = 0;
      globalStockMap[pId] += currentStock;
    }

    // Lógica original de inventario muerto (Solo si hay stock > 0 y no se vendió)
    if (pId && !soldProductIds.has(pId) && currentStock > 0) {
      if (!deadStockMap[pId]) {
        deadStockMap[pId] = {
          id: pId,
          barcode: inv.products?.barcode || "N/A",
          name: inv.products?.name || "Producto Sin Nombre",
          departmentName: inv.products?.department?.name || inv.products?.departments?.name || "Sin Depto.",
          stock: 0,
        };
      }
      deadStockMap[pId].stock += currentStock;
    }
  });

  const deadStock = Object.values(deadStockMap).sort((a, b) => b.stock - a.stock);

  // 4. ORDENAMIENTO FINAL Y CRUCE
  const productsArray = Object.values(productMap).map(prod => ({
    ...prod,
    stock: globalStockMap[prod.id] || 0 // Si no hay registro, asumimos 0
  }));
  
  const departmentsArray = Object.values(departmentMap).sort((a, b) => b.revenue - a.revenue);

  // Top Productos (Todos)
  const topProducts = [...productsArray].sort((a, b) => b.quantity - a.quantity);
  
  // Peor Rotación (Solo menos de 3 ventas)
  const bottomProducts = [...productsArray]
    .filter(item => item.quantity < 3)
    .sort((a, b) => a.quantity - b.quantity);

  const topDepartment = departmentsArray[0] || { name: "N/A", revenue: 0 };
  const bestProduct = topProducts[0] || { name: "N/A", quantity: 0 };

  return {
    kpis: {
      totalUnits,
      totalRevenue,
      topDepartment: topDepartment.name,
      bestProduct: bestProduct.name,
    },
    byDepartment: departmentsArray,
    topProducts,
    bottomProducts,
    deadStock,
  };
};