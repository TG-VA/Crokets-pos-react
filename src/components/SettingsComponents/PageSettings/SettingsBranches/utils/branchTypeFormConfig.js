import { BRANCH_TYPES } from "../../../../../services/branchScopeCalculationService";

export const BRANCH_TYPE_OPTIONS = Object.freeze([
  {
    value: BRANCH_TYPES.OPERATIONAL,
    label: "Operativa",
    hint: "Vende, cobra y maneja inventario.",
  },
  {
    value: BRANCH_TYPES.ADMIN,
    label: "Administrativa",
    hint: "Sin ventas ni stock: reportes, pedidos, traspasos y alta de productos.",
  },
]);

const CONTACT_FIELDS = Object.freeze(["phone", "email", "address"]);

// Campos del formulario que cada tipo oculta. Un campo oculto no se valida y se guarda vacio.
const HIDDEN_FIELDS_BY_TYPE = Object.freeze({
  [BRANCH_TYPES.OPERATIONAL]: Object.freeze([]),
  [BRANCH_TYPES.ADMIN]: CONTACT_FIELDS,
});

export const isValidBranchType = (branchType) =>
  Object.hasOwn(HIDDEN_FIELDS_BY_TYPE, branchType);

export const isBranchFieldVisible = (branchType, field) =>
  !(HIDDEN_FIELDS_BY_TYPE[branchType] ?? []).includes(field);
