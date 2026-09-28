/**
 * invoiceCustomersService.js
 * Lectura y mutacion de clientes con datos fiscales.
 *
 * Solo este archivo conoce el cliente de Supabase y las columnas de la tabla
 * `customers` que usa la pantalla de clientes fiscales (DIP, AGENTS.md).
 */

import { supabase } from "../../../../lib/supabaseClient";

const FISCAL_CUSTOMERS_COLUMNS = `
          id,
          name,
          phone,
          email,
          fiscal_email,
          rfc,
          address,
          razon_social,
          postal_code,
          tax_regime,
          cfdi_use,
          status,
          is_billing_customer,
          is_points_customer,
          created_at,
          updated_at
        `;

const POINTS_CUSTOMER_COLUMNS = `
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
          status,
          is_billing_customer,
          is_points_customer
        `;

/**
 * Clientes de facturacion. El doble `order` resuelve el caso de las razones
 * sociales nulas, que en SQL ordenan al final.
 */
export const fetchInvoiceCustomers = async () => {
  const { data, error } = await supabase
    .from("customers")
    .select(FISCAL_CUSTOMERS_COLUMNS)
    .eq("is_billing_customer", true)
    .order("status", { ascending: false, nullsFirst: false })
    .order("razon_social", { ascending: true, nullsFirst: false });

  if (error) throw error;

  return data || [];
};

/**
 * Cliente de puntos con el mismo telefono que todavia no es cliente fiscal, para
 * ofrecerle el alta fiscal sin duplicar el registro.
 */
export const searchPointsCustomerByPhone = async (phone) => {
  const { data, error } = await supabase
    .from("customers")
    .select(POINTS_CUSTOMER_COLUMNS)
    .eq("phone", phone)
    .eq("is_points_customer", true)
    .or("is_billing_customer.is.null,is_billing_customer.eq.false")
    .maybeSingle();

  if (error) throw error;

  return data || null;
};

/**
 * Activa o desactiva un cliente fiscal.
 */
export const updateInvoiceCustomerStatus = async ({
  customerId,
  nextStatus,
}) => {
  const { error } = await supabase
    .from("customers")
    .update({
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", customerId);

  if (error) throw error;
};

/**
 * Decide si un evento realtime de la tabla `customers` debe recargar la lista.
 *
 * La tabla `customers` tambien recibe altas de puntos y de ventas, que no
 * aparecen en esta pantalla: filtrar aqui evita recargar en cada venta.
 */
export const shouldRefreshOnCustomerChange = (payload) => {
  const newRow = payload?.new;
  const oldRow = payload?.old;

  return (
    newRow?.is_billing_customer === true ||
    oldRow?.is_billing_customer === true ||
    newRow?.is_points_customer === true ||
    oldRow?.is_points_customer === true
  );
};
