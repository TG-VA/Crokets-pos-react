import { supabase } from "../../../../../lib/supabaseClient";

import {
  toNumber,
  uniqueValues,
} from "./reportsDashboardUtils";

export const getSaleReturns = async (
  saleIds = []
) => {
  if (!saleIds.length) return [];

  const { data, error } = await supabase
    .from("sale_returns")
    .select(`
      id,
      sale_id,
      total_refund,
      created_at
    `)
    .in("sale_id", saleIds);

  if (error) throw error;

  return data || [];
};

export const getReturnItems = async (
  returnIds = []
) => {
  if (!returnIds.length) return [];

  const { data, error } = await supabase
    .from("sale_return_items")
    .select(`
      id,
      return_id,
      sale_detail_id,
      product_id,
      quantity,
      unit_price,
      total_price
    `)
    .in("return_id", returnIds);

  if (error) throw error;

  return data || [];
};

export const getTodayCancelledSales = async ({
  branchId,
  todayStart,
  todayEnd,
}) => {
  const {
    data: cancelledRows,
    error: cancelledError,
  } = await supabase
    .from("canceled_sales")
    .select("sale_id, created_at")
    .gte("created_at", todayStart)
    .lte("created_at", todayEnd);

  if (cancelledError) {
    throw cancelledError;
  }

  const saleIds = uniqueValues(
    (cancelledRows || []).map(
      (row) => row.sale_id
    )
  );

  if (!saleIds.length) return 0;

  const {
    data: salesRows,
    error: salesError,
  } = await supabase
    .from("sales")
    .select("id")
    .in("id", saleIds)
    .eq("branch_id", branchId);

  if (salesError) {
    throw salesError;
  }

  return (salesRows || []).length;
};

export const getTodayReturns = async ({
  branchId,
  todayStart,
  todayEnd,
}) => {
  const {
    data: returnRows,
    error: returnsError,
  } = await supabase
    .from("sale_returns")
    .select(`
      id,
      sale_id,
      total_refund,
      created_at
    `)
    .gte("created_at", todayStart)
    .lte("created_at", todayEnd);

  if (returnsError) {
    throw returnsError;
  }

  const saleIds = uniqueValues(
    (returnRows || []).map(
      (row) => row.sale_id
    )
  );

  if (!saleIds.length) {
    return {
      count: 0,
      amount: 0,
      units: 0,
      rows: [],
      items: [],
    };
  }

  const {
    data: salesRows,
    error: salesError,
  } = await supabase
    .from("sales")
    .select("id")
    .in("id", saleIds)
    .eq("branch_id", branchId);

  if (salesError) {
    throw salesError;
  }

  const validSaleIds = new Set(
    (salesRows || []).map(
      (row) => row.id
    )
  );

  const branchReturns = (
    returnRows || []
  ).filter((row) =>
    validSaleIds.has(row.sale_id)
  );

  const returnIds = uniqueValues(
    branchReturns.map(
      (row) => row.id
    )
  );

  const returnItems =
    await getReturnItems(returnIds);

  const amount = branchReturns.reduce(
    (sum, row) =>
      sum + toNumber(row.total_refund),
    0
  );

  const units = returnItems.reduce(
    (sum, item) =>
      sum + toNumber(item.quantity),
    0
  );

  return {
    count: branchReturns.length,
    amount,
    units,
    rows: branchReturns,
    items: returnItems,
  };
};
