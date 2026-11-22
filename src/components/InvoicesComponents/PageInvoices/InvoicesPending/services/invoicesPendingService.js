/**
 * invoicesPendingService.js
 * Consulta de las ventas completadas de una sucursal que aun no se facturan.
 *
 * Solo este archivo conoce el cliente de Supabase y la forma de la tabla
 * `sales` con sus relaciones (DIP, AGENTS.md).
 */

import { supabase } from "../../../../../lib/supabaseClient";
import { fetchAllPages } from "../../../../../services/supabase/paginatedQuery";
import { sortByDateDesc } from "../../../../../utils/sortByDateDesc";

const PENDING_SALES_COLUMNS = `
          id,
          sale_date,
          subtotal,
          tax,
          total,
          status,
          user_id,
          customer_id,
          branch_id,
          users:user_id (
            username,
            email
          ),
          customers:customer_id (
            id,
            phone,
            email,
            fiscal_email,
            rfc,
            razon_social,
            cfdi_use,
            tax_regime,
            postal_code,
            is_billing_customer,
            status
          ),
          invoices (
            id
          )
        `;

/**
 * Ventas completadas de la sucursal, del dia indicado cuando se pasa rango.
 *
 * El filtro de "sin factura" se aplica en memoria, no en la consulta: la
 * relacion `invoices` es un arreglo embebido y no admite un `not exists` sin
 * una vista o una RPC.
 */
export const fetchCompletedBranchSales = async ({ branchId, dayRange }) => {
  // Sin rango se lee todo el historial de la sucursal: se pagina para no
  // perder ventas por el tope de filas de PostgREST.
  const buildQuery = () => {
    let query = supabase
      .from("sales")
      .select(PENDING_SALES_COLUMNS)
      .eq("branch_id", branchId)
      .eq("status", "completed");

    if (dayRange) {
      query = query
        .gte("sale_date", dayRange.start)
        .lte("sale_date", dayRange.end);
    }

    return query;
  };

  const { data, error } = await fetchAllPages(buildQuery);

  if (error) throw error;

  return sortByDateDesc(data, "sale_date");
};
