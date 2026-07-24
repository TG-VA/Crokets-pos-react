import { supabase } from "../../../../../lib/supabaseClient";

export const getSalesRows = async ({
  branchId,
  start,
  end,
}) => {
  const { data, error } = await supabase
    .from("sales")
    .select(`
      id,
      sale_date,
      subtotal,
      tax,
      total,
      discount_total,
      status,
      branch_id
    `)
    .eq("branch_id", branchId)
    .gte("sale_date", start)
    .lte("sale_date", end)
    .order("sale_date", { ascending: true });

  if (error) throw error;

  return data || [];
};

export const getSaleDetails = async (saleIds) => {
  if (!saleIds.length) return [];

  const { data, error } = await supabase
    .from("sale_details")
    .select(`
      sale_id,
      product_id,
      quantity,
      total_price
    `)
    .in("sale_id", saleIds);

  if (error) throw error;

  return data || [];
};

export const getSalePayments = async (saleIds) => {
  if (!saleIds.length) return [];

  const { data, error } = await supabase
    .from("sale_payments")
    .select(`
      sale_id,
      amount,
      currency,
      exchange_rate,
      payment_method_id
    `)
    .in("sale_id", saleIds);

  if (error) throw error;

  return data || [];
};

export const getProductsByIds = async (productIds) => {
  if (!productIds.length) return [];

  const { data, error } = await supabase
    .from("products")
    .select(`
      id,
      name,
      barcode
    `)
    .in("id", productIds);

  if (error) throw error;

  return data || [];
};

export const getPaymentMethodsByIds = async (
  paymentMethodIds,
) => {
  if (!paymentMethodIds.length) return [];

  const { data, error } = await supabase
    .from("payment_methods")
    .select("id, name")
    .in("id", paymentMethodIds);

  if (error) throw error;

  return data || [];
};