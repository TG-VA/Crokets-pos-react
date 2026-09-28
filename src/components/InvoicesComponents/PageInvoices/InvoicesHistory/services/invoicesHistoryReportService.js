/**
 * invoicesHistoryReportService.js
 * Consulta principal del historial: sucursales y listado de facturas.
 *
 * Solo este archivo conoce el cliente de Supabase para el dataset global de la
 * vista (DIP: "servicios segregados por ciclo de vida" en AGENTS.md).
 */

import { supabase } from "../../../../../lib/supabaseClient";
import { buildInvoicesDateRange } from "./invoicesHistoryCalculationService";

const INVOICES_COLUMNS = `
          id,
          sale_id,
          customer_id,
          uuid,
          serie,
          folio,
          invoice_date,
          cfdi_use,
          payment_method,
          payment_form,
          subtotal,
          tax,
          total,
          pdf_url,
          xml_url,
          is_canceled,
          canceled_at,
          created_at,
          branch_id,
          branches:branch_id (
            id,
            name,
            code
          ),
          customers:customer_id (
            id,
            rfc,
            razon_social,
            fiscal_email,
            postal_code,
            tax_regime
          )
        `;

/**
 * Sucursales activas, para el selector de filtro.
 */
export const fetchActiveBranches = async () => {
  const { data, error } = await supabase
    .from("branches")
    .select("id, name, code, status")
    .eq("status", true)
    .order("name", { ascending: true });

  if (error) throw error;

  return data || [];
};

/**
 * Facturas del rango de fechas, acotadas a una sucursal o a todas.
 *
 * El filtro de sucursal se arma en el servicio porque el valor del selector es
 * una triparticion: `current` usa la sucursal de la sesion, `all` no filtra, y
 * cualquier otro valor es un id concreto.
 */
export const fetchInvoicesHistory = async ({
  startDate,
  endDate,
  branchFilter,
  currentBranchId,
}) => {
  const range = buildInvoicesDateRange(startDate, endDate);

  let query = supabase
    .from("invoices")
    .select(INVOICES_COLUMNS)
    .gte("created_at", range.start)
    .lte("created_at", range.end)
    .order("created_at", { ascending: false });

  if (branchFilter === "current") {
    query = query.eq("branch_id", currentBranchId);
  } else if (branchFilter !== "all") {
    query = query.eq("branch_id", branchFilter);
  }

  const { data, error } = await query;

  if (error) throw error;

  return data || [];
};
