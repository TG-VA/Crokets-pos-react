// Consultas a profundidad (detalle) de pedidos de abastecimiento.

import { supabase } from "../../../../../lib/supabaseClient";
import { normalizeStoreOrder } from "../utils/ordersFormatters";

const sortItems = (items = []) =>
  [...items].sort((a, b) => {
    const departmentCompare = (a.departmentName || "").localeCompare(
      b.departmentName || "",
      "es"
    );

    if (departmentCompare !== 0) return departmentCompare;

    return (a.productName || "").localeCompare(b.productName || "", "es");
  });

const normalizeOrder = (order) => {
  const normalized = normalizeStoreOrder(order);

  if (!normalized) return null;

  return {
    ...normalized,
    items: sortItems(normalized.items),
  };
};

export const STORE_ORDER_SELECT = `
  id,
  order_number,
  order_name,
  from_branch_id,
  to_branch_id,
  created_by_user_id,
  received_by_user_id,
  status,
  departments_summary,
  notes,
  discrepancy_notes,
  receipt_notes,
  sent_at,
  accepted_at,
  created_at,
  updated_at,
  from_branch:branches!store_orders_from_branch_id_fkey (
    id,
    name,
    code
  ),
  to_branch:branches!store_orders_to_branch_id_fkey (
    id,
    name,
    code
  ),
  created_by:users!store_orders_created_by_user_id_fkey (
    id,
    username,
    email
  ),
  received_by:users!store_orders_received_by_user_id_fkey (
    id,
    username,
    email
  ),
  store_order_items (
    id,
    order_id,
    product_id,
    barcode,
    product_name,
    department_id,
    department_name,
    expected_qty,
    received_qty,
    difference_qty,
    cost_price,
    created_at
  )
`;

export const fetchStoreOrderById = async (orderId) => {
  if (!orderId) return null;

  const { data, error } = await supabase
    .from("store_orders")
    .select(STORE_ORDER_SELECT)
    .eq("id", orderId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return normalizeOrder(data);
};
