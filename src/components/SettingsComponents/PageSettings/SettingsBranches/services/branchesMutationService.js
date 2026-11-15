import { supabase } from "../../../../../lib/supabaseClient";
import { BRANCH_TYPES } from "../../../../../services/branchScopeService";

const BRANCHES_RETURNING =
  "id, code, name, phone, email, address, city, state, timezone, is_active, branch_type";

const buildRpcError = (data, fallback) => ({
  success: false,
  data: null,
  error: data?.message || fallback,
});

export const createBranch = async (payload) => {
  if (!payload?.code?.trim() || !payload?.name?.trim()) {
    return {
      success: false,
      data: null,
      error: "El código y el nombre de la sucursal son obligatorios.",
    };
  }

  if (!payload?.adminId) {
    return {
      success: false,
      data: null,
      error: "No se identificó al administrador responsable.",
    };
  }

  try {
    const { data, error } = await supabase.rpc("create_branch", {
      p_code: payload.code.trim().toUpperCase(),
      p_name: payload.name.trim(),
      p_admin_id: payload.adminId,
      p_phone: payload.phone || null,
      p_email: payload.email || null,
      p_address: payload.address || null,
      p_city: payload.city || null,
      p_state: payload.state || null,
      p_timezone: payload.timezone || "America/Cancun",
      p_branch_type: payload.branchType || BRANCH_TYPES.OPERATIONAL,
    });

    if (error) throw error;

    if (!data?.success) {
      return buildRpcError(data, "No se pudo crear la sucursal.");
    }

    return { success: true, data: data.branch, error: null };
  } catch (error) {
    console.error("Error creando sucursal:", error);

    return {
      success: false,
      data: null,
      error: error.message || "No se pudo crear la sucursal.",
    };
  }
};

export const updateBranchContact = async (branchId, updates) => {
  if (!branchId) {
    return {
      success: false,
      data: null,
      error: "No se recibió el ID de la sucursal.",
    };
  }

  const allowedUpdates = {};
  if (updates.name !== undefined) allowedUpdates.name = updates.name;
  if (updates.city !== undefined) allowedUpdates.city = updates.city;
  if (updates.state !== undefined) allowedUpdates.state = updates.state;
  if (updates.timezone !== undefined)
    allowedUpdates.timezone = updates.timezone;
  if (updates.phone !== undefined) allowedUpdates.phone = updates.phone;
  if (updates.email !== undefined) allowedUpdates.email = updates.email;
  if (updates.address !== undefined) allowedUpdates.address = updates.address;
  if (updates.branchType !== undefined) {
    allowedUpdates.branch_type = updates.branchType;
  }

  if (Object.keys(allowedUpdates).length === 0) {
    return {
      success: false,
      data: null,
      error: "No hay campos válidos para actualizar.",
    };
  }

  try {
    if (allowedUpdates.name) {
      const { data: existing, error: checkError } = await supabase
        .from("branches")
        .select("id")
        .ilike("name", allowedUpdates.name.trim())
        .neq("id", branchId)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existing?.id) {
        return {
          success: false,
          data: null,
          error: "Ya existe una sucursal con ese nombre.",
        };
      }
    }

    const { data, error } = await supabase
      .from("branches")
      .update(allowedUpdates)
      .eq("id", branchId)
      .select(BRANCHES_RETURNING)
      .maybeSingle();

    if (error) throw error;

    return { success: true, data: data || null, error: null };
  } catch (error) {
    console.error("Error actualizando datos de la sucursal:", error);

    return {
      success: false,
      data: null,
      error: error.message || "No se pudieron actualizar los datos.",
    };
  }
};

export const setBranchActive = async ({ branchId, isActive, adminId }) => {
  if (!branchId) {
    return {
      success: false,
      data: null,
      error: "No se recibió el ID de la sucursal.",
    };
  }

  if (typeof isActive !== "boolean") {
    return {
      success: false,
      data: null,
      error: "No se recibió el estado destino de la sucursal.",
    };
  }

  if (!adminId) {
    return {
      success: false,
      data: null,
      error: "No se identificó al administrador responsable.",
    };
  }

  try {
    const { data, error } = await supabase.rpc("set_branch_active", {
      p_branch_id: branchId,
      p_is_active: isActive,
      p_admin_id: adminId,
    });

    if (error) throw error;

    if (!data?.success) {
      return {
        success: false,
        data: null,
        error: data?.message || "No se pudo cambiar el estado de la sucursal.",
        blockers: data?.blockers || null,
      };
    }

    return {
      success: true,
      data: data.branch,
      error: null,
      warnings: data?.warnings || null,
    };
  } catch (error) {
    console.error("Error cambiando el estado de la sucursal:", error);

    return {
      success: false,
      data: null,
      error: error.message || "No se pudo cambiar el estado de la sucursal.",
    };
  }
};
