import { supabase } from "../lib/supabaseClient";

export const fetchActiveCashSession = async (branchId) => {
  if (!branchId) {
    return {
      success: false,
      data: null,
      error: "No se recibió la sucursal.",
      partial: false,
    };
  }

  try {
    const { data, error } = await supabase.rpc("get_cash_register_session", {
      p_branch_id: branchId,
    });

    if (error) throw error;

    return {
      success: data?.success !== false,
      data: data?.session || null,
      error: data?.success === false ? data?.message || "Error verificando caja" : null,
      partial: false,
    };
  } catch (error) {
    console.error("Error verificando caja:", error);

    return {
      success: false,
      data: null,
      error: error.message || "Error verificando caja",
      partial: false,
    };
  }
};

export const openCashRegister = async (branchId, openingAmount) => {
  if (!branchId) {
    return {
      success: false,
      data: null,
      error: "No se recibió la sucursal.",
      code: null,
      message: null,
      partial: false,
    };
  }

  try {
    const { data, error } = await supabase.rpc("open_cash_register", {
      p_branch_id: branchId,
      p_opening_amount: openingAmount,
    });

    if (error) throw error;

    return {
      success: data?.success === true,
      data: data?.session || null,
      error: data?.success === true ? null : data?.message || "Error al abrir caja",
      code: data?.code || null,
      message: data?.message || null,
      partial: false,
    };
  } catch (error) {
    console.error("Error abriendo caja:", error);

    return {
      success: false,
      data: null,
      error: error.message || "Error al abrir caja",
      code: null,
      message: null,
      partial: false,
    };
  }
};
