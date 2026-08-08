import { supabase } from "../../../lib/supabaseClient";

const TIME_ZONE = "America/Cancun";

export const formatCurrency = (val) => `$${Number(val || 0).toFixed(2)}`;
export const formatTime = (iso) => iso ? new Date(iso).toLocaleTimeString("es-MX", { timeZone: TIME_ZONE, hour: "numeric", minute: "2-digit", hour12: true }) : "";
export const formatDateTime = (iso) => iso ? new Date(iso).toLocaleString("es-MX", { timeZone: TIME_ZONE, year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true }) : "";
export const getDisplayFolio = (sale) => sale?.id ? sale.id.slice(0, 8).toUpperCase() : "";
export const hasPartialReturns = (t) => Number(t?.totalReturned || 0) > 0 || (t?.returns?.length || 0) > 0;

export const getDerivedStatus = (ticket) => {
  const norm = ticket?.status?.toLowerCase();
  if (norm === "cancelled") return "cancelled";
  if (hasPartialReturns(ticket)) return "partial_return";
  if (norm === "pending") return "pending";
  return "completed";
};

export const getPaymentMethodLabel = (payments) => {
  if (!payments?.length) return "SIN PAGOS";
  const names = payments.map(p => p.payment_method_name || p.paymentMethod).filter(Boolean);
  return names.length === 0 ? "SIN PAGOS" : names.length === 1 ? names[0].toUpperCase() : "MIXTO";
};

export const normalizeCurrency = (cur) => ["USD", "DOLARES", "DÓLARES"].includes(String(cur || "MXN").trim().toUpperCase()) ? "USD" : "MXN";
export const normalizePaymentMethodName = (name) => String(name || "").trim().toUpperCase();

export const getPaymentSummary = (payments = [], total = 0) => {
  let cash = 0, terminal = 0, usd = 0, usdToMxn = 0, exchangeRate = 0, mxnOther = 0;
  for (const p of payments) {
    const amount = Number(p.amount || 0);
    const currency = normalizeCurrency(p.currency);
    const name = normalizePaymentMethodName(p.paymentMethod || p.payment_method_name);
    const rate = Number(p.exchangeRate ?? p.exchange_rate ?? 0);

    if (currency === "USD") {
      usd += amount;
      if (rate > 0) { exchangeRate = rate; usdToMxn += amount * rate; }
      continue;
    }
    if (name.includes("EFECTIVO")) cash += amount;
    else if (["TERMINAL", "TARJETA", "CARD"].some(k => name.includes(k))) terminal += amount;
    else mxnOther += amount;
  }
  const amountReceived = cash + terminal + mxnOther + usdToMxn;
  return { cash, terminal, usd, usdToMxn, exchangeRate, mxnOther, amountReceived, changeAmount: Math.max(amountReceived - Number(total || 0), 0) };
};

export const fetchPaymentMethods = async () => {
  const { data, error } = await supabase.from("payment_methods").select("id, name").order("name");
  if (error) throw error;
  return data || [];
};

export const fetchCashiers = async () => {
  const { data, error } = await supabase.from("users").select("id, username, email, status").eq("status", true).order("username");
  if (error) throw error;
  return (data || []).map((u) => ({ id: u.id, name: (u.username || u.email || "SIN NOMBRE").toUpperCase() }));
};

export const buildCustomerPointsMaps = async ({ saleIds = [], customerIds = [] }) => {
  const sIds = [...new Set(saleIds.filter(Boolean))], cIds = [...new Set(customerIds.filter(Boolean))];
  const [sRes, retRes, rewRes, balRes] = await Promise.all([
    sIds.length ? supabase.from("customer_points").select("customer_id, related_sale_id, points, source").in("related_sale_id", sIds).eq("source", "sale") : Promise.resolve({ data: [] }),
    sIds.length ? supabase.from("customer_points").select("customer_id, related_sale_id, points, source").in("related_sale_id", sIds).eq("source", "partial_return") : Promise.resolve({ data: [] }),
    sIds.length ? supabase.from("customer_points").select("customer_id, related_sale_id, points, source").in("related_sale_id", sIds).eq("source", "reward") : Promise.resolve({ data: [] }),
    cIds.length ? supabase.from("customer_points").select("customer_id, points").in("customer_id", cIds) : Promise.resolve({ data: [] }),
  ]);
  
  const agg = (data, condition, abs = false) => data.reduce((acc, row) => {
    if (!row.related_sale_id) return acc;
    const p = Number(row.points || 0);
    if (condition(p)) acc[row.related_sale_id] = (acc[row.related_sale_id] || 0) + (abs ? Math.abs(p) : p);
    return acc;
  }, {});

  return {
    pointsBySale: agg(sRes.data || [], p => p > 0),
    returnedPointsBySale: agg(retRes.data || [], p => p < 0, true),
    rewardPointsBySale: agg(rewRes.data || [], p => p < 0, true),
    balanceByCustomer: (balRes.data || []).reduce((acc, row) => {
      if (row.customer_id) acc[row.customer_id] = (acc[row.customer_id] || 0) + Number(row.points || 0);
      return acc;
    }, {})
  };
};

export const loadRewardRedemptionsForSale = async (saleId) => {
  if (!saleId) return [];
  const { data, error } = await supabase.from("sale_reward_redemptions").select("id, sale_id, sale_detail_id, customer_id, reward_id, product_id, quantity, total_points, created_at, reversed_at, reversed_by, reversal_reason").eq("sale_id", saleId).order("created_at");
  if (error) throw error;
  if (!data?.length) return [];

  const rewIds = [...new Set(data.map(r => r.reward_id).filter(Boolean))], pIds = [...new Set(data.map(r => r.product_id).filter(Boolean))];
  const [rewRes, pRes] = await Promise.all([
    rewIds.length ? supabase.from("rewards").select("id, name, points_required").in("id", rewIds) : Promise.resolve({ data: [] }),
    pIds.length ? supabase.from("products").select("id, name, barcode, sale_price").in("id", pIds) : Promise.resolve({ data: [] })
  ]);

  const rewMap = (rewRes.data || []).reduce((a, r) => ({ ...a, [r.id]: r }), {}), pMap = (pRes.data || []).reduce((a, p) => ({ ...a, [p.id]: p }), {});

  return data.map(row => {
    const rew = rewMap[row.reward_id] || {}, prod = pMap[row.product_id] || {};
    const qty = Number(row.quantity || 1), totPts = Math.abs(Number(row.total_points || 0));
    const ppu = qty > 0 && totPts > 0 ? totPts / qty : Math.abs(Number(rew.points_required || 0));
    return { ...row, reward_name: rew.name || "RECOMPENSA", product_name: prod.name || prod.barcode || "PRODUCTO", product_price: Number(prod.sale_price || 0), quantity: qty, points_per_unit: ppu, total_points: totPts > 0 ? totPts : ppu * qty };
  });
};

export const fetchTicketsBatch = async (branchId, start, end, cashierFilter) => {
  let query = supabase.from("sales").select("id, sale_date, subtotal, tax, total, discount_total, status, user_id, customer_id, branch_id, notes").eq("branch_id", branchId).gte("sale_date", start).lte("sale_date", end).order("sale_date", { ascending: false });
  if (cashierFilter !== "all") query = query.eq("user_id", cashierFilter);
  const { data: sales, error } = await query;
  if (error) throw error;
  return sales || [];
};

export const executeCancelSaleTransaction = async (saleId, userId, branchId, reason, refundMethodId) => {
  const { data, error } = await supabase.rpc("cancel_sale_transaction", {
    p_sale_id: saleId, p_user_id: userId, p_branch_id: branchId, p_cancel_reason: reason, p_refund_method_uuid: refundMethodId
  });
  if (error) throw error;
  return data;
};

// --- NUEVAS FUNCIONES EXTRAÍDAS DEL HOOK ---

export const fetchSalesRelatedData = async (saleIds, userIds, customerIds) => {
  const [detRes, uRes, cRes, pRes, canRes, retRes] = await Promise.all([
    supabase.from("sale_details").select("sale_id, quantity").in("sale_id", saleIds),
    supabase.from("users").select("id, username, email").in("id", userIds),
    supabase.from("customers").select("id, name, phone").in("id", customerIds),
    supabase.from("sale_payments").select("sale_id, amount, currency, exchange_rate, payment_method_id, reference").in("sale_id", saleIds),
    supabase.from("canceled_sales").select("sale_id, cancel_reason, refund_method_id, created_at").in("sale_id", saleIds),
    supabase.from("sale_returns").select("id, sale_id, total_refund, refund_method_id, return_reason, created_at").in("sale_id", saleIds)
  ]);
  return { 
    details: detRes.data || [], users: uRes.data || [], customers: cRes.data || [], 
    payments: pRes.data || [], canceled: canRes.data || [], returns: retRes.data || [] 
  };
};

export const fetchTicketDetailsData = async (ticketId) => {
  const [dRes, kRes] = await Promise.all([
    supabase.from("sale_details").select("id, quantity, unit_price, total_price, product_id, original_unit_price, final_unit_price, discount_type, discount_value, discount_amount").eq("sale_id", ticketId),
    supabase.from("sale_kit_items").select("sale_detail_id, component_product_id, quantity").eq("sale_id", ticketId)
  ]);
  return { details: dRes.data || [], kits: kRes.data || [] };
};

export const fetchProductsByIds = async (pIds) => {
  if (!pIds.length) return [];
  const { data } = await supabase.from("products").select("id, name, barcode, sale_price, is_kit").in("id", pIds);
  return data || [];
};

export const fetchSaleReturnsData = async (saleId) => {
  const { data: retData } = await supabase.from("sale_returns").select("id, sale_id, total_refund, refund_method_id, return_reason, created_at").eq("sale_id", saleId).order("created_at", { ascending: false });
  if (!retData?.length) return { returns: [], returnItems: [] };
  const itemsRes = await supabase.from("sale_return_items").select("return_id, quantity, total_price, product_id").in("return_id", retData.map(r => r.id));
  return { returns: retData, returnItems: itemsRes.data || [] };
};

export const fetchCanceledSaleData = async (saleId) => {
  const { data } = await supabase.from("canceled_sales").select("cancel_reason, refund_method_id").eq("sale_id", saleId).maybeSingle();
  return data || {};
};