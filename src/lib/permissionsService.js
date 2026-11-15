import { supabase } from "./supabaseClient";
import { isAdminBranch } from "../services/branchScopeCalculationService";

export const checkUserIsAdmin = async (userId) => {
  if (!userId) {
    return false;
  }

  try {
    const { data, error } = await supabase
      .from("users")
      .select(
        `
        id,
        status,
        roles (
          name
        )
      `
      )
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

// Una terminal ligada a una sucursal admin no vende, no corta caja ni factura. Es la unica regla
// de acceso por tipo de sucursal; el rol del usuario sigue resolviendose arriba.
export const ADMIN_BRANCH_BLOCKED_PATHS = Object.freeze([
  "/dashboard",
  "/sales",
  "/cashcut",
  "/invoices",
]);

export const ADMIN_BRANCH_HOME_PATH = "/reports";

const matchesPath = (pathname, basePath) =>
  pathname === basePath || pathname.startsWith(`${basePath}/`);

export const canBranchAccessPath = (branch, pathname = "") =>
  !isAdminBranch(branch) ||
  !ADMIN_BRANCH_BLOCKED_PATHS.some((basePath) =>
    matchesPath(pathname, basePath)
  );

// Una terminal admin no cobra: no abre caja ni pasa por /cash-register.
export const branchRequiresCashRegister = (branch) => !isAdminBranch(branch);
