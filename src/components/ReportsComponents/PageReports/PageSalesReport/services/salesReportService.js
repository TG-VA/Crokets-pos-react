import { supabase } from "../../../../../lib/supabaseClient";

const toUpper = (str) => (str ? str.toUpperCase() : "");

export const getBranchesList = async () => {
  const { data, error } = await supabase.from("branches").select("id, name");
  if (error) return [{ id: "Todas", name: "Todas las sucursales" }];
  return [{ id: "Todas", name: "Todas las sucursales" }, ...data.map((b) => ({ id: b.id, name: b.name }))];
};

export const getCashiersList = async () => {
  const { data, error } = await supabase.from("users").select("id, username").eq("status", true);
  if (error) return [{ id: "Todos", name: "Todos los cajeros" }];
  return [{ id: "Todos", name: "TODOS LOS CAJEROS" }, ...data.map((c) => ({ id: c.id, name: c.username ? toUpper(c.username) : "SIN NOMBRE" }))];
};

// Función de ayuda para aplicar filtros dinámicos al Query
const applyFilters = (query, filters) => {
  query.gte("created_at", filters.startDate.toISOString())
       .lte("created_at", filters.endDate.toISOString());

  if (filters.branch !== "Todas") query.eq("branch_id", filters.branch);
  if (filters.cashier !== "Todos") query.eq("user_id", filters.cashier);
  if (filters.status !== "Todos") query.eq("computed_status", filters.status);
  if (filters.payment !== "Todos") query.eq("payment_method", filters.payment);
  if (filters.discount !== "Todos") query.eq("discount_filter", filters.discount);
  
  return query;
};

// 1. PAGINACIÓN REAL DEL SERVIDOR
export const getPaginatedSales = async (filters, page, pageSize = 10) => {
  let query = supabase.from("v_sales_report_list").select("*", { count: "exact" });
  query = applyFilters(query, filters);
  
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query.order("created_at", { ascending: false }).range(from, to);
  
  const { data, count, error } = await query;
  if (error) throw error;
  
  const mappedData = data.map(sale => ({
    id: sale.id,
    ticketNumber: sale.id ? sale.id.substring(0, 8).toUpperCase() : "S/N",
    date: new Date(sale.created_at).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" }),
    cashier: sale.cashier_name ? toUpper(sale.cashier_name) : "SISTEMA",
    client: sale.customer_name ? toUpper(sale.customer_name) : "PÚBLICO GENERAL",
    branch: sale.branch_name || "Principal",
    method: sale.payment_method,
    discount: Number(sale.discount_total) || 0,
    total: Number(sale.total) || 0,
    status: sale.computed_status,
    notes: sale.notes || "",
  }));

  return { data: mappedData, totalCount: count };
};

// 2. CALCULAR KPIs DIRECTO EN LA BASE DE DATOS (RPC)
export const getSalesKPIs = async (filters) => {
  const { data, error } = await supabase.rpc("get_sales_report_kpis", {
    p_start: filters.startDate.toISOString(),
    p_end: filters.endDate.toISOString(),
    p_branch: filters.branch !== "Todas" ? filters.branch : null,
    p_cashier: filters.cashier !== "Todos" ? filters.cashier : null,
    p_status: filters.status,
    p_payment: filters.payment,
    p_discount: filters.discount
  });

  if (error) throw error;
  
  return {
    totalIncome: data[0]?.total_income || 0,
    totalDiscounts: data[0]?.total_discounts || 0,
    totalTickets: data[0]?.total_tickets || 0,
  };
};

export const getSaleDetailsById = async (saleId) => {
  const [detailsResponse, rewardsResponse] = await Promise.all([
    supabase.from("sale_details").select(`id, product_id, quantity, unit_price, discount_amount, discount_type, total_price, products ( name, barcode )`).eq("sale_id", saleId),
    supabase.from("sale_reward_redemptions").select("sale_detail_id, product_id, reward_name").eq("sale_id", saleId)
  ]);

  if (detailsResponse.error) throw detailsResponse.error;

  const detailsData = detailsResponse.data || [];
  const rewardsData = rewardsResponse.data || [];

  return detailsData.map((item) => {
    let discountReason = "";
    if (Number(item.discount_amount) > 0) {
      const isReward = rewardsData.find((reward) => reward.sale_detail_id === item.id || reward.product_id === item.product_id);
      if (isReward) {
        discountReason = "Canje"; 
      } else {
        const typeStr = item.discount_type ? item.discount_type.toLowerCase() : "";
        if (typeStr === "amount") discountReason = "Monto Fijo";
        else if (typeStr === "percentage") discountReason = "Porcentaje";
        else if (typeStr === "manual" || typeStr === "global") discountReason = toUpper(typeStr);
        else discountReason = "Manual";
      }
    }
    return {
      id: item.id,
      productName: item.products?.name || "Producto sin nombre",
      barcode: item.products?.barcode || "N/A",
      quantity: Number(item.quantity) || 0,
      unitPrice: Number(item.unit_price) || 0,
      discount: Number(item.discount_amount) || 0,
      discountType: discountReason, 
      total: Number(item.total_price) || 0,
    };
  });
};

// 3. EXPORTAR RESUMEN (Trae todos los registros del filtro sin paginar)
export const getAllSalesForExport = async (filters) => {
  let query = supabase.from("v_sales_report_list").select("*");
  query = applyFilters(query, filters);
  query.order("created_at", { ascending: false });

  const { data, error } = await query;
  if (error) throw error;

  return data.map(sale => ({
    ticketNumber: sale.id ? sale.id.substring(0, 8).toUpperCase() : "S/N",
    date: new Date(sale.created_at).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" }),
    cashier: sale.cashier_name ? toUpper(sale.cashier_name) : "SISTEMA",
    client: sale.customer_name ? toUpper(sale.customer_name) : "PÚBLICO GENERAL",
    branch: sale.branch_name || "Principal",
    method: sale.payment_method,
    discount: Number(sale.discount_total) || 0,
    total: Number(sale.total) || 0,
    status: sale.computed_status,
  }));
};

// 4. EXPORTAR DETALLADO
export const getDetailedSalesForExport = async (filters) => {
  let query = supabase.from("v_sales_report_list").select("id, branch_name, cashier_name, customer_name, computed_status, created_at");
  query = applyFilters(query, filters);
  
  const { data: sales, error: salesError } = await query;
  if (salesError) throw salesError;
  if (!sales || sales.length === 0) return [];

  const saleIds = sales.map((s) => s.id);
  const chunkSize = 150;
  let allDetailedRows = [];

  for (let i = 0; i < saleIds.length; i += chunkSize) {
    const chunk = saleIds.slice(i, i + chunkSize);
    const [detailsRes, rewardsRes] = await Promise.all([
      supabase.from("sale_details").select("id, sale_id, product_id, quantity, unit_price, discount_amount, discount_type, total_price, products (name, barcode)").in("sale_id", chunk),
      supabase.from("sale_reward_redemptions").select("sale_detail_id, product_id, reward_name").in("sale_id", chunk),
    ]);

    if (detailsRes.error) continue;

    detailsRes.data.forEach((item) => {
      const parentSale = sales.find((s) => s.id === item.sale_id);
      if (!parentSale) return;

      let discountReason = "Ninguno";
      if (Number(item.discount_amount) > 0) {
        const isReward = (rewardsRes.data || []).find((r) => r.sale_detail_id === item.id || r.product_id === item.product_id);
        if (isReward) { discountReason = "Canje Puntos"; } 
        else {
          const typeStr = item.discount_type ? item.discount_type.toLowerCase() : "";
          if (typeStr === "amount") discountReason = "Monto Fijo";
          else if (typeStr === "percentage") discountReason = "Porcentaje";
          else if (typeStr === "manual" || typeStr === "global") discountReason = toUpper(typeStr);
          else discountReason = "Manual";
        }
      }

      allDetailedRows.push({
        ticketNumber: parentSale.id ? parentSale.id.substring(0, 8).toUpperCase() : "S/N",
        date: new Date(parentSale.created_at).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" }),
        branch: parentSale.branch_name || "Principal",
        cashier: parentSale.cashier_name ? toUpper(parentSale.cashier_name) : "SISTEMA",
        client: parentSale.customer_name ? toUpper(parentSale.customer_name) : "PÚBLICO GENERAL",
        status: parentSale.computed_status,
        productName: item.products?.name || "Producto Eliminado",
        barcode: item.products?.barcode || "N/A",
        quantity: Number(item.quantity) || 0,
        unitPrice: Number(item.unit_price) || 0,
        discountType: discountReason,
        discountAmount: Number(item.discount_amount) || 0,
        totalPrice: Number(item.total_price) || 0,
      });
    });
  }
  return allDetailedRows;
};