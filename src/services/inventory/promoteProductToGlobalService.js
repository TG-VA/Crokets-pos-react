// Vuelve global un producto local mediante el RPC promote_product_to_global.
// El RPC valida admin, kit y estado; aqui solo se traduce su respuesta.

import { supabase } from "../../lib/supabaseClient";

export const promoteProductToGlobal = async (productId) => {
  const { data, error } = await supabase.rpc("promote_product_to_global", {
    p_product_id: productId,
  });

  if (error) throw error;

  if (!data?.success) {
    throw new Error(data?.message || "No se pudo volver global el producto.");
  }

  return data;
};
