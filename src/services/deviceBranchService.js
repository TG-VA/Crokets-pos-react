import { supabase } from "../lib/supabaseClient";
import { authorizeAdminAction } from "../lib/adminAuthorizationService";

export const resolveBranchByDevice = async (deviceCode) => {
  if (!deviceCode) {
    return {
      success: false,
      data: null,
      error: "No se recibió el código del dispositivo.",
      partial: false,
    };
  }

  try {
    const { data, error } = await supabase.rpc("get_branch_by_device", {
      p_device_code: deviceCode,
    });

    if (error) throw error;

    if (!data?.success || !data?.branch?.id) {
      return {
        success: false,
        data: null,
        error: data?.message || "Este POS no está asignado a ninguna sucursal",
        partial: false,
      };
    }

    return {
      success: true,
      data: data.branch,
      error: null,
      partial: false,
    };
  } catch (error) {
    console.error("Error resolviendo la sucursal del dispositivo:", error);

    return {
      success: false,
      data: null,
      error: error.message || "Error resolviendo la sucursal del POS",
      partial: false,
    };
  }
};

export const fetchActiveBranches = async () => {
  try {
    const { data, error } = await supabase
      .from("branches")
      .select("id, name, code, city, state")
      .eq("is_active", true)
      .order("name");

    if (error) throw error;

    return { success: true, data: data || [], error: null };
  } catch (error) {
    console.error("Error cargando el catálogo de sucursales:", error);

    return {
      success: false,
      data: [],
      error: error.message || "No se pudieron cargar las sucursales.",
    };
  }
};

/**
 * Vincula este equipo a una sucursal. La edge function valida al
 * administrador y registra el dispositivo con service role: la RPC
 * `register_pos_device` ya no se ejecuta desde el cliente.
 */
export const registerPosDevice = async ({
  deviceCode,
  branchId,
  username,
  password,
}) => {
  try {
    const authResult = await authorizeAdminAction({
      action: "register_pos_device",
      username,
      password,
      branchId,
      deviceCode,
    });

    if (!authResult.ok) {
      return { success: false, error: authResult.message };
    }

    const branch = authResult.device?.branch;

    if (!branch?.id) {
      return {
        success: false,
        error: "No se pudo registrar el dispositivo.",
      };
    }

    return {
      success: true,
      branch: {
        id: branch.id,
        name: branch.name,
        code: branch.code,
      },
    };
  } catch (error) {
    console.error("Error registrando dispositivo POS:", error);

    return {
      success: false,
      error: error.message || "No se pudo registrar el dispositivo.",
    };
  }
};
