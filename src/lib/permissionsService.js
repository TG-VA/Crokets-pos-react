import { supabase } from "./supabaseClient";

export const checkUserIsAdmin = async (userId) => {
  if (!userId) {
    return false;
  }

  try {
    const { data, error } = await supabase
      .from("users")
      .select(`
        id,
        status,
        roles (
          name
        )
      `)
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("Error verificando si el usuario es admin:", error);
      return false;
    }

    const roleName = Array.isArray(data?.roles)
      ? data.roles[0]?.name
      : data?.roles?.name;

    return data?.status === true && roleName === "admin";
  } catch (error) {
    console.error("Error general verificando permisos del usuario:", error);
    return false;
  }
};