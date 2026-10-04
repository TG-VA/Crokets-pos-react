/**
 * invoicesCatalogService.js
 * Catalogos fiscales del SAT y consulta de codigos postales.
 *
 * Estos catalogos los consumen cuatro pantallas del modulo (clientes fiscales,
 * modal de datos fiscales, configuracion CFDI y facturacion de venta), asi que
 * la consulta vive una sola vez aqui. Es el unico punto del modulo que conoce
 * el cliente de Supabase junto con las tablas `cfdi_uses`, `tax_regimes` y
 * `postal_codes` (DIP, AGENTS.md).
 */

import { supabase } from "../../../lib/supabaseClient";

const CATALOG_COLUMNS = "id, description";

/**
 * Usos de CFDI (G01, S01, D01...) activos, ordenados por clave.
 */
export const fetchCfdiUses = async () => {
  const { data, error } = await supabase
    .from("cfdi_uses")
    .select(CATALOG_COLUMNS)
    .eq("status", true)
    .order("id", { ascending: true });

  if (error) throw error;

  return data || [];
};

/**
 * Regimenes fiscales (601, 612...) activos, ordenados por clave.
 */
export const fetchTaxRegimes = async () => {
  const { data, error } = await supabase
    .from("tax_regimes")
    .select(CATALOG_COLUMNS)
    .eq("status", true)
    .order("id", { ascending: true });

  if (error) throw error;

  return data || [];
};

/**
 * Usos de CFDI y regimenes fiscales en una sola promesa.
 *
 * Se lanza en paralelo porque las dos consultas son independientes; si alguna
 * falla, el error que se propaga es el de la primera consulta en rechazarse.
 */
export const fetchFiscalCatalogs = async () => {
  const [cfdiUses, taxRegimes] = await Promise.all([
    fetchCfdiUses(),
    fetchTaxRegimes(),
  ]);

  return { cfdiUses, taxRegimes };
};

/**
 * Ficha de un codigo postal del catalogo SEPOMEX.
 *
 * Devuelve la fila o `null` cuando el catalogo no la tiene. El mensaje de
 * error lo decide cada pantalla, porque no todas lo comunican igual al usuario.
 * Un C.P. incompleto se resuelve a `null` sin tocar la base.
 */
export const lookupPostalCode = async (postalCode) => {
  const cp = String(postalCode || "")
    .replace(/\D/g, "")
    .slice(0, 5);

  if (cp.length !== 5) return null;

  const { data, error } = await supabase
    .from("postal_codes")
    .select("postal_code, municipality, state, city")
    .eq("postal_code", cp)
    .eq("status", true)
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  return data || null;
};
