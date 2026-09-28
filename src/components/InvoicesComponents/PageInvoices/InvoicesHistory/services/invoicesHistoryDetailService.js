/**
 * invoicesHistoryDetailService.js
 * Consulta a profundidad del modal de detalle de una factura.
 *
 * Separada del servicio de reporte porque su ciclo de vida es distinto: se
 * dispara bajo demanda, al abrir una factura, y no en la carga de la pagina
 * (AGENTS.md, "servicios segregados por ciclo de vida").
 */

import { supabase } from "../../../../lib/supabaseClient";

const INVOICE_ITEMS_COLUMNS = `
          id,
          invoice_id,
          product_id,
          description,
          clave_prod_serv,
          quantity,
          unit_price,
          discount,
          tax_rate,
          tax_amount,
          total,
          created_at
        `;

/**
 * Conceptos de una factura, en el orden en que se emitieron.
 */
export const fetchInvoiceItems = async (invoiceId) => {
  const { data, error } = await supabase
    .from("invoice_items")
    .select(INVOICE_ITEMS_COLUMNS)
    .eq("invoice_id", invoiceId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return data || [];
};
