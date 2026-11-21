import { supabase } from "../lib/supabaseClient";
import { fetchByIdsInBatches } from "./supabase/paginatedQuery";

export const fetchSatClaves = async () => {
  const { data, error } = await supabase
    .from("sat_claves_productos_servicios")
    .select("clave, descripcion")
    .eq("status", true)
    .order("descripcion", { ascending: true });

  if (error) throw error;

  return data || [];
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
