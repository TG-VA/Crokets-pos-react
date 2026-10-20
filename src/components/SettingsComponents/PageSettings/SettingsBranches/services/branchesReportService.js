import { supabase } from "../../../../../lib/supabaseClient";

const BRANCH_SELECT =
  "id, code, name, phone, email, address, city, state, timezone, is_active, pos_devices(count)";

const mapBranchRow = (row) => ({
  id: row.id,
  code: row.code,
  name: row.name,
  phone: row.phone,
  email: row.email,
  address: row.address,
  city: row.city,
  state: row.state,
  timezone: row.timezone,
  isActive: row.is_active,
  posDevicesCount: Array.isArray(row.pos_devices)
    ? (row.pos_devices[0]?.count ?? 0)
    : 0,
});

export const fetchBranchesCatalog = async () => {
  try {
    const { data, error } = await supabase
      .from("branches")
      .select(BRANCH_SELECT)
      .order("name", { ascending: true });

    if (error) throw error;

    return {
      success: true,
      data: (data || []).map(mapBranchRow),
      error: null,
    };
  } catch (error) {
    console.error(
      "Error cargando el catálogo corporativo de sucursales:",
      error
    );

    return {
      success: false,
      data: [],
      error: error.message || "No se pudo cargar el catálogo de sucursales.",
    };
  }
};
