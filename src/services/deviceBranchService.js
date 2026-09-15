import { supabase } from "../lib/supabaseClient";

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
