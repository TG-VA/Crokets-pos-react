import { supabase } from "../../../lib/supabaseClient";

export const createSaleTransaction = async ({
  branchId,
  userId,
  customerId = null,
  subtotal,
  tax = 0,
  total,
  saleDate,
  productsPayload,
  paymentsPayload,
  saleToken,
  notes = null,
}) => {
  if (!branchId) {
    throw new Error(
      "No se detectó la sucursal.",
    );
  }

  if (!userId) {
    throw new Error(
      "No se detectó el usuario.",
    );
  }

  if (!saleToken) {
    throw new Error(
      "No se generó el token de venta.",
    );
  }

  if (
    !Array.isArray(productsPayload) ||
    productsPayload.length === 0
  ) {
    throw new Error(
      "La venta no contiene productos válidos.",
    );
  }

  if (!Array.isArray(paymentsPayload)) {
    throw new Error(
      "Los pagos de la venta no son válidos.",
    );
  }

  const { data: saleId, error } =
    await supabase.rpc(
      "create_sale_transaction",
      {
        p_branch_id: branchId,
        p_user_id: userId,
        p_customer_id:
          customerId || null,
        p_subtotal: Number(
          subtotal || 0,
        ),
        p_tax: Number(tax || 0),
        p_total: Number(total || 0),
        p_sale_date:
          saleDate ||
          new Date().toISOString(),
        p_products: productsPayload,
        p_payments: paymentsPayload,
        p_client_sale_token:
          saleToken,
        p_notes:
          notes?.trim?.() || null,
      },
    );

  if (error) {
    throw error;
  }

  if (!saleId) {
    throw new Error(
      "La venta se procesó sin devolver un identificador.",
    );
  }

  return saleId;
};