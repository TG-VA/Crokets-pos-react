import { supabase } from "../../../lib/supabaseClient";

export const getCashMaxOpeningAmount = async () => {
  try {
    const { data, error } = await supabase.rpc("get_cash_max_opening_amount");

    if (error) throw error;

    return {
      success: true,
      amount: data == null ? null : Number(data),
      error: null,
    };
  } catch (error) {
    console.error("Error obteniendo el tope de apertura de caja:", error);

    return {
      success: false,
      amount: null,
      error: error.message || "Error obteniendo el tope de apertura de caja",
    };
  }
};

export const updateCashMaxOpeningAmount = async (amount) => {
  if (String(amount).trim() === "") {
    return {
      success: false,
      amount: null,
      error: "El tope de apertura no puede estar vacío.",
    };
  }

  if (amount == null || Number.isNaN(Number(amount))) {
    return {
      success: false,
      amount: null,
      error: "El tope de apertura debe ser un número válido.",
    };
  }

  try {
    const { data, error } = await supabase.rpc(
      "update_cash_max_opening_amount",
      {
        p_amount: Number(amount),
      }
    );

    if (error) throw error;

    if (data?.success === false) {
      return {
        success: false,
        amount: null,
        error: data.message || "No se pudo actualizar el tope de apertura",
      };
    }

    return {
      success: true,
      amount: data?.amount == null ? Number(amount) : Number(data.amount),
      error: null,
    };
  } catch (error) {
    console.error("Error actualizando el tope de apertura de caja:", error);

    return {
      success: false,
      amount: null,
      error: error.message || "Error actualizando el tope de apertura de caja",
    };
  }
};
