import { supabase } from "../lib/supabaseClient";
import { fetchAllPages, fetchByIdsInBatches } from "./supabase/paginatedQuery";
import { sortRowsBy } from "./supabase/sortRows";

// Se pagina sobre clave (la tabla no tiene id) para no truncar en 1000 filas
// si el catalogo crece, y se ordena por descripcion en memoria.
export const fetchSatClaves = async () => {
  const { data, error } = await fetchAllPages(
    () =>
      supabase
        .from("sat_claves_productos_servicios")
        .select("clave, descripcion")
        .eq("status", true),
    { cursorColumn: "clave" }
  );

  if (error) throw error;

  return sortRowsBy(data, "descripcion");
};

export const validateSatClaves = async (satCodes) => {
  if (!satCodes || satCodes.length === 0) return [];

  // La tabla no tiene id: el cursor de cada lote es la propia clave.
  const { data, error } = await fetchByIdsInBatches(
    [...new Set(satCodes)],
    (batch) =>
      supabase
        .from("sat_claves_productos_servicios")
        .select("clave")
        .in("clave", batch),
    { cursorColumn: "clave" }
  );

  if (error) throw error;

  return data || [];
};
