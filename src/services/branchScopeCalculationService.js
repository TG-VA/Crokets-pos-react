/**
 * Reglas puras del alcance de sucursales (sin I/O). Una sucursal admin no vende, no cobra ni
 * tiene stock. Una fila sin branch_type se trata como operativa: es el default de la BD.
 */
export const BRANCH_TYPES = Object.freeze({
  OPERATIONAL: "operational",
  ADMIN: "admin",
});

const isBranchObject = (branch) =>
  branch !== null && typeof branch === "object";

const resolveBranchType = (branch) =>
  branch.branch_type ?? BRANCH_TYPES.OPERATIONAL;

export const isOperationalBranch = (branch) =>
  isBranchObject(branch) &&
  resolveBranchType(branch) === BRANCH_TYPES.OPERATIONAL;

export const isAdminBranch = (branch) =>
  isBranchObject(branch) && resolveBranchType(branch) === BRANCH_TYPES.ADMIN;
