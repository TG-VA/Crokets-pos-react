import { supabase } from "../lib/supabaseClient";

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
  
  const { data, error } = await supabase
    .from("sat_claves_productos_servicios")
    .select("clave")
    .in("clave", satCodes);
    
  if (error) throw error;
  
  return data || [];
};