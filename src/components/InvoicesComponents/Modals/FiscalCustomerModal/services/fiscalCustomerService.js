/**
 * fiscalCustomerService.js
 * Lectura y escritura de los datos fiscales de un cliente.
 *
 * Solo este archivo conoce el cliente de Supabase y la forma de la tabla
 * `customers` para el alta y la edicion fiscal (DIP, AGENTS.md).
 */

import { supabase } from "../../../../lib/supabaseClient";

const FISCAL_SEARCH_COLUMNS = `
          id,
          name,
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
 * Busca clientes por telefono, correo, RFC, nombre comercial o razon social.
 *
 * El limite de 20 resultados y el orden por nombre los fija la vista: la
 * busqueda es exploratoria, no un reporte.
 */
export const searchFiscalCustomerCandidates = async (term) => {
  const like = `%${term}%`;

  const { data, error } = await supabase
    .from("customers")
    .select(FISCAL_SEARCH_COLUMNS)
    .or(
      `phone.ilike.${like},email.ilike.${like},fiscal_email.ilike.${like},rfc.ilike.${like},name.ilike.${like},razon_social.ilike.${like}`
    )
    .order("name", { ascending: true })
    .limit(20);

  if (error) throw error;

  return data || [];
};

/**
 * Guarda los datos fiscales: actualiza el cliente cuando ya tiene `id` y lo
 * da de alta como cliente fiscal cuando no lo tiene.
 */
export const saveFiscalCustomer = async ({ customerId, payload }) => {
  if (customerId) {
    const { error } = await supabase
      .from("customers")
      .update(payload)
      .eq("id", customerId);

    if (error) throw error;

    return;
  }

  const { error } = await supabase.from("customers").insert({
    ...payload,
    created_at: new Date().toISOString(),
  });

  if (error) throw error;
};

/**
 * Traduce el error de violacion de unicidad de Postgres al mensaje que ve el
 * usuario, y deja el resto de errores en un mensaje generico.
 */
export const getFiscalCustomerErrorMessage = (error) =>
  error?.code === "23505"
    ? "Ya existe un cliente con ese RFC o correo."
    : "No se pudo guardar el cliente fiscal.";
