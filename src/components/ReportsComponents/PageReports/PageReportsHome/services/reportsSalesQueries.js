import { supabase } from "../../../../../lib/supabaseClient";
import { fetchOperationalBranches } from "../../../../../services/branchScopeService";
import {
  fetchAllPages,
  fetchByIdsInBatches,
} from "../../../../../services/supabase/paginatedQuery";
import { fetchInChunks } from "./reportsDashboardUtils";

const SALE_IDS_BATCH_SIZE = 150;

// Por instante: PostgreSQL omite la fraccion cero y el orden de texto fallaria.
const bySaleDate = (left, right) =>
  Date.parse(left.sale_date) - Date.parse(right.sale_date);

// El cursor de fetchAllPages ordena por id: el orden por fecha se aplica en memoria.
export const getSalesRows = async ({ branchId, start, end }) => {
  const { data, error } = await fetchAllPages(() => {
    let query = supabase
      .from("sales")
      .select(
        `
        id,
        sale_date,
        subtotal,
        tax,
        total,
        discount_total,
        status,
        branch_id
      `
      )
      .gte("sale_date", start)
      .lte("sale_date", end);

    if (branchId && branchId !== "ALL" && branchId !== "Todas") {
      query = query.eq("branch_id", branchId);
    }

    return query;
  });

  if (error) throw error;

  return data.sort(bySaleDate);
};

export const getBranchesCatalog = async () => {
  const { data, error } = await fetchOperationalBranches({
    columns: "id, name",
  });

  if (error) throw error;

  return data || [];
};

export const getSaleDetails = async (saleIds) => {
  if (!saleIds.length) return [];

  const { data, error } = await fetchByIdsInBatches(
    saleIds,
    (batch) =>
      supabase
        .from("sale_details")
        .select(
          `
          id,
          sale_id,
          product_id,
          quantity,
          total_price
        `
        )
        .in("sale_id", batch),
    { batchSize: SALE_IDS_BATCH_SIZE }
  );

  if (error) throw error;

  return data;
};

export const getSalePayments = async (saleIds) => {
  if (!saleIds.length) return [];

  const { data, error } = await fetchByIdsInBatches(
    saleIds,
    (batch) =>
      supabase
        .from("sale_payments")
        .select(
          `
          id,
          sale_id,
          amount,
          currency,
          exchange_rate,
          payment_method_id
        `
        )
        .in("sale_id", batch),
    { batchSize: SALE_IDS_BATCH_SIZE }
  );

  if (error) throw error;

  return data;
};

export const getProductsByIds = async (productIds) => {
  if (!productIds.length) return [];

  return fetchInChunks(productIds, 150, async (chunk) => {
    const { data, error } = await supabase
      .from("products")
      .select(
        `
        id,
        name,
        barcode
      `
      )
      .in("id", chunk);

    if (error) throw error;

    return data || [];
  });
};

export const getPaymentMethodsByIds = async (paymentMethodIds) => {
  if (!paymentMethodIds.length) return [];

  return fetchInChunks(paymentMethodIds, 150, async (chunk) => {
    const { data, error } = await supabase
      .from("payment_methods")
      .select("id, name")
      .in("id", chunk);

    if (error) throw error;

    return data || [];
  });
};

export const getProductById = async (productId) => {
  if (!productId) return null;

  const { data, error } = await supabase
    .from("products")
    .select(
      `
      id,
      name,
      barcode
    `
    )
    .eq("id", productId)
    .maybeSingle();

  if (error) throw error;

  return data || null;
};
