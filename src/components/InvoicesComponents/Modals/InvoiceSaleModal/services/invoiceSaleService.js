/**
 * invoiceSaleService.js
 * Lectura de la venta a facturar y escritura de la factura interna.
 *
 * Solo este archivo conoce el cliente de Supabase y las tablas `sale_details`,
 * `sale_payments`, `customers`, `invoices`, `invoice_items` e
 * `invoice_payments` en el contexto de facturacion (DIP, AGENTS.md).
 */

import { supabase } from "../../../../lib/supabaseClient";

const SALE_DETAILS_COLUMNS = `
            id,
            sale_id,
            product_id,
            quantity,
            unit_price,
            total_price,
            original_unit_price,
            final_unit_price,
            discount_amount,
            products:product_id (
              id,
              name,
              barcode,
              sale_price
            )
          `;

const SALE_PAYMENTS_COLUMNS = `
            id,
            sale_id,
            payment_method_id,
            amount,
            currency,
            exchange_rate,
            reference
          `;

const BILLING_CUSTOMER_COLUMNS = `
          id,
          phone,
          email,
          fiscal_email,
          rfc,
          razon_social,
          postal_code,
          tax_regime,
          cfdi_use,
          address,
          status,
          is_billing_customer
        `;

/**
 * Conceptos y pagos de la venta, en paralelo porque son independientes.
 */
export const fetchSaleInvoiceData = async (saleId) => {
  const [detailsResult, paymentsResult] = await Promise.all([
    supabase
      .from("sale_details")
      .select(SALE_DETAILS_COLUMNS)
      .eq("sale_id", saleId),
    supabase
      .from("sale_payments")
      .select(SALE_PAYMENTS_COLUMNS)
      .eq("sale_id", saleId),
  ]);

  if (detailsResult.error) throw detailsResult.error;
  if (paymentsResult.error) throw paymentsResult.error;

  return {
    saleDetails: detailsResult.data || [],
    salePayments: paymentsResult.data || [],
  };
};

/**
 * Clientes con datos fiscales completos y activos, ordenados por razon social.
 */
export const fetchFiscalCustomers = async () => {
  const { data, error } = await supabase
    .from("customers")
    .select(BILLING_CUSTOMER_COLUMNS)
    .eq("is_billing_customer", true)
    .eq("status", true)
    .order("razon_social", { ascending: true });

  if (error) throw error;

  return data || [];
};

/**
 * Id de la factura de una venta, si ya existe. Se consulta antes de insertar
 * para no duplicar la factura de una venta que ya fue facturada.
 */
export const fetchExistingInvoiceId = async (saleId) => {
  const { data, error } = await supabase
    .from("invoices")
    .select("id")
    .eq("sale_id", saleId)
    .maybeSingle();

  if (error) throw error;

  return data?.id || null;
};

/**
 * Inserta la factura interna y devuelve su id, que es la clave foranea de los
 * conceptos y de los pagos.
 */
export const insertInvoice = async (payload) => {
  const { data, error } = await supabase
    .from("invoices")
    .insert(payload)
    .select("id")
    .single();

  if (error) throw error;

  return data.id;
};

/**
 * Inserta los conceptos de la factura. El lote va entero: la vista no reintenta
 * conceptos parciales.
 */
export const insertInvoiceItems = async (items) => {
  const { error } = await supabase.from("invoice_items").insert(items);

  if (error) throw error;
};

/**
 * Inserta los pagos de la factura, solo si la venta los tiene.
 */
export const insertInvoicePayments = async (payments) => {
  const { error } = await supabase.from("invoice_payments").insert(payments);

  if (error) throw error;
};
