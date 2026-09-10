import { supabase } from "../../lib/supabaseClient";

export const createDepartment = async (name, commissionData = {}) => {
  const cleanName = (name || "").trim();

  if (!cleanName) return false;

  try {
    const { error } = await supabase.from("departments").insert({
      name: cleanName,
      status: true,
      commission_enabled: !!commissionData.commission_enabled,
      commission_type: commissionData.commission_type || "percent",
      commission_value: Number(commissionData.commission_value || 0),
    });

    if (error) throw error;

    return true;
  } catch (error) {
    console.error("Error agregando departamento:", error);

    return false;
  }
};

export const updateDepartment = async (id, data) => {
  if (!id || !data) return false;

  try {
    const { data: oldDept, error: oldDeptError } = await supabase
      .from("departments")
      .select("commission_enabled, commission_type, commission_value")
      .eq("id", id)
      .maybeSingle();

    if (oldDeptError) throw oldDeptError;

    const payload = {};

    if (typeof data.name === "string") {
      payload.name = data.name.trim();
    }

    if (typeof data.status === "boolean") {
      payload.status = data.status;
    }

    if (typeof data.commission_enabled === "boolean") {
      payload.commission_enabled = data.commission_enabled;
    }

    if (typeof data.commission_type === "string") {
      payload.commission_type = data.commission_type;
    }

    if (
      typeof data.commission_value === "number" ||
      typeof data.commission_value === "string"
    ) {
      payload.commission_value = Number(data.commission_value || 0);
    }

    payload.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from("departments")
      .update(payload)
      .eq("id", id);

    if (error) throw error;

    if (data.propagateToProducts) {
      const comEnabled =
        typeof data.commission_enabled === "boolean"
          ? data.commission_enabled
          : false;
      const comType = data.commission_type || "percent";
      const comVal = Number(data.commission_value || 0);

      let query = supabase
        .from("products")
        .update({
          commission_enabled: comEnabled,
          commission_type: comType,
          commission_value: comVal,
          commission_percent:
            comType === "percent" && comEnabled ? comVal : 0.0,
        })
        .eq("department_id", id);

      if (oldDept) {
        query = query
          .eq("commission_enabled", !!oldDept.commission_enabled)
          .eq("commission_type", oldDept.commission_type || "percent")
          .eq("commission_value", Number(oldDept.commission_value || 0));
      }

      const { error: productsUpdateError } = await query;
      if (productsUpdateError) throw productsUpdateError;
    }

    return true;
  } catch (error) {
    console.error("Error actualizando departamento:", error);

    return false;
  }
};

export const deactivateDepartment = async (id) => {
  if (!id) return false;

  try {
    const { error } = await supabase
      .from("departments")
      .update({
        status: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error("Error desactivando departamento:", error);

    return false;
  }
};
