import { supabase } from "../../../../../lib/supabaseClient";
import { BRANCH_NOT_UPDATED_ERROR } from "../../../../../utils/branchMessages";

export const fetchBranchProfile = async (branchId) => {
  if (!branchId) {
    return {
      success: false,
      data: null,
      error: "No se recibió el ID de la sucursal.",
      partial: false,
    };
  }

  try {
    const { data, error } = await supabase
      .from("branches")
      .select("id, code, name, address, phone, email, city, timezone")
      .eq("id", branchId)
      .maybeSingle();

    if (error) throw error;

    return {
      success: true,
      data: data || null,
      error: null,
      partial: false,
    };
  } catch (error) {
    console.error("Error obteniendo perfil de sucursal:", error);

    return {
      success: false,
      data: null,
      error: error.message || "Error obteniendo perfil de sucursal",
      partial: false,
    };
  }
};

export const updateBranchContact = async (branchId, updates) => {
  if (!branchId) {
    return {
      success: false,
      data: null,
      error: "No se recibió el ID de la sucursal.",
      partial: false,
    };
  }

  const allowedUpdates = {};
  if (updates.name !== undefined) allowedUpdates.name = updates.name;
  if (updates.city !== undefined) allowedUpdates.city = updates.city;
  if (updates.timezone !== undefined)
    allowedUpdates.timezone = updates.timezone;
  if (updates.phone !== undefined) allowedUpdates.phone = updates.phone;
  if (updates.email !== undefined) allowedUpdates.email = updates.email;
  if (updates.address !== undefined) allowedUpdates.address = updates.address;

  if (Object.keys(allowedUpdates).length === 0) {
    return {
      success: false,
      data: null,
      error: "No hay campos válidos para actualizar.",
      partial: false,
    };
  }

  try {
    const { data, error } = await supabase
      .from("branches")
      .update(allowedUpdates)
      .eq("id", branchId)
      .select("id, code, name, address, phone, email, city, timezone")
      .maybeSingle();

    if (error) throw error;

    // Con RLS, un UPDATE sin permiso no falla: afecta 0 filas y data llega null.
    if (!data) {
      return {
        success: false,
        data: null,
        error: BRANCH_NOT_UPDATED_ERROR,
        partial: false,
      };
    }

    return {
      success: true,
      data,
      error: null,
      partial: false,
    };
  } catch (error) {
    console.error("Error actualizando contacto de sucursal:", error);

    return {
      success: false,
      data: null,
      error: error.message || "Error actualizando contacto de sucursal",
      partial: false,
    };
  }
};
