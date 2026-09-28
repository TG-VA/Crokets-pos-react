/**
 * customerModalService.js
 * Consultas y mutaciones del alta y edicion de clientes de puntos.
 */

import { supabase } from "../../../../../lib/supabaseClient";

const DUPLICATE_CHECK_COLUMNS = `
        id,
        name,
        phone,
        email,
        razon_social,
        status,
        is_billing_customer,
        is_points_customer
      `;

/**
 * Cliente que ya ocupa el telefono indicado.
 *
 * Al editar se excluye el propio registro: si no, el cliente apareceria siempre
 * como duplicado de si mismo.
 */
export const findCustomerByPhone = async ({ phone, excludeCustomerId }) => {
  let query = supabase
    .from("customers")
    .select(DUPLICATE_CHECK_COLUMNS)
    .eq("phone", phone)
    .limit(1);

  if (excludeCustomerId) {
    query = query.neq("id", excludeCustomerId);
  }

  const { data, error } = await query;

  if (error) throw error;

  return data?.[0] || null;
};

/**
 * Campos comunes de alta y edicion de un cliente de puntos.
 */
const buildCustomerPayload = (normalizedData) => ({
  name: normalizedData.name,
  phone: normalizedData.phone,
  email: normalizedData.email || null,
  status: normalizedData.status,
  is_points_customer: true,
  updated_at: new Date().toISOString(),
});

/**
 * Actualiza un cliente existente.
 *
 * El mismo camino sirve para editar un cliente de puntos y para incorporar uno
 * fiscal como cliente de puntos: en ambos casos el registro ya existe y solo
 * cambia su clasificacion y datos de contacto.
 */
export const updateCustomer = async ({ customerId, normalizedData }) => {
  const { error } = await supabase
    .from("customers")
    .update(buildCustomerPayload(normalizedData))
    .eq("id", customerId);

  if (error) throw error;
};

/**
 * Inserta un cliente de puntos nuevo. Nace sin datos fiscales.
 */
export const createCustomer = async (normalizedData) => {
  const { error } = await supabase.from("customers").insert([
    {
      id: crypto.randomUUID(),
      ...buildCustomerPayload(normalizedData),
      is_billing_customer: false,
      created_at: new Date().toISOString(),
    },
  ]);

  if (error) throw error;
};

/**
 * Traduce los errores de unicidad de Postgres a un mensaje entendible.
 */
export const resolveCustomerSaveErrorMessage = (error) => {
  const errorMessage = String(error?.message || "");

  if (errorMessage.includes("customers_email_key")) {
    return "Ya existe un cliente registrado con ese correo.";
  }

  if (errorMessage.includes("duplicate key")) {
    return "Ya existe un cliente con información duplicada.";
  }

  return error?.message || "No se pudo guardar el cliente.";
};
