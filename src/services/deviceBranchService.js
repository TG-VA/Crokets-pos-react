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
    });

    if (!authResult.ok) {
      return { success: false, error: authResult.message };
    }

    const { data, error } = await supabase.rpc("register_pos_device", {
      p_device_code: deviceCode,
      p_branch_id: branchId,
      p_admin_id: authResult.authorizedBy,
    });

    if (error) throw error;

    if (!data?.success || !data?.branch?.id) {
      return {
        success: false,
        error: data?.message || "No se pudo registrar el dispositivo.",
      };
    }

    return {
      success: true,
      branch: {
        id: data.branch.id,
        name: data.branch.name,
        code: data.branch.code,
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
