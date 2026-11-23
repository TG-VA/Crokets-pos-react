import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";

const formState = vi.hoisted(() => ({ current: {} }));

vi.mock("../../../../../contexts/ProductsContext", () => ({
  useProducts: () => ({
    products: [],
    departments: [],
    getProductByCodigo: vi.fn(),
    updateProductByCodigo: vi.fn(),
    getProductDiscountByProductId: vi.fn(),
    upsertProductDiscount: vi.fn(),
  }),
}));

vi.mock("../../../../../contexts/BranchContext", () => ({
  useBranch: () => ({ branch: { id: "branch-1", branch_type: "store" } }),
}));

vi.mock("../../../../../contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

vi.mock("../../../../../lib/permissionsService", () => ({
  checkUserIsAdmin: vi.fn(),
}));

vi.mock("../../../../../services/satClavesService", () => ({
  fetchSatClaves: vi.fn(() => Promise.resolve([])),
}));

// El formulario y el DOM tienen sus propias pruebas: aqui solo importa el estado
// que llega al guardado.
vi.mock("./useProductModifyForm", () => ({
  useProductModifyForm: () => ({
    form: formState.current,
    setForm: vi.fn(),
    touched: {},
    usesInventory: false,
    activeDepartments: [],
    ganancia: 0,
    errors: {},
    isFormValid: true,
    updateField: vi.fn(),
    markTouched: vi.fn(),
    touchAllRelevantFields: vi.fn(),
    resetForm: vi.fn(),
    resetTouched: vi.fn(),
    showError: vi.fn(),
  }),
}));

vi.mock("./useProductModifyDOM", () => ({
  useProductModifyDOM: () => ({
    bodyRef: { current: null },
    submitArmed: false,
    setSubmitArmed: vi.fn(),
    focusFirstInvalidField: vi.fn(),
    preventNumberScrollChange: vi.fn(),
    preventNumberArrows: vi.fn(),
    handleContentKeyDown: vi.fn(),
  }),
}));

vi.mock("../services/productModifyCalculationService", () => ({
  buildProductPayload: vi.fn((form) => ({ status: form.status })),
  buildDiscountPayload: vi.fn(() => ({})),
}));

vi.mock("../services/productModifyDataService", () => ({
  loadProductDiscountData: vi.fn(() =>
    Promise.resolve({
      success: true,
      discount: {
        enabled: false,
        discount_percent: 0,
        discount_price: "",
        discount_concept: "",
      },
    })
  ),
  saveProductModifications: vi.fn(),
}));

import { checkUserIsAdmin } from "../../../../../lib/permissionsService";
import { saveProductModifications } from "../services/productModifyDataService";
import { useProductsModify } from "./useProductsModify";

const ACTIVE_PRODUCT = { id: "p1", codigo: "750", status: true, precio: 10 };
const INACTIVE_PRODUCT = { ...ACTIVE_PRODUCT, status: false };

const renderWithProduct = async (product, status) => {
  formState.current = { status };
  const hook = renderHook(() => useProductsModify());
  await act(async () => hook.result.current.loadProduct(product));
  return hook;
};

const save = (result) => act(async () => result.current.handleSave());

describe("useProductsModify: desactivar requiere admin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    saveProductModifications.mockResolvedValue({ success: true });
  });

  it("un cajero que desactiva pide autorizacion antes de guardar", async () => {
    checkUserIsAdmin.mockResolvedValue(false);
    const { result } = await renderWithProduct(ACTIVE_PRODUCT, "inactivo");

    await save(result);

    expect(checkUserIsAdmin).toHaveBeenCalledWith("user-1");
    expect(result.current.adminAuthOpen).toBe(true);
    expect(saveProductModifications).not.toHaveBeenCalled();

    await act(async () => result.current.handleAdminAuthorized());

    expect(result.current.adminAuthOpen).toBe(false);
    expect(saveProductModifications).toHaveBeenCalledTimes(1);
  });

  it("cerrar la autorizacion no guarda", async () => {
    checkUserIsAdmin.mockResolvedValue(false);
    const { result } = await renderWithProduct(ACTIVE_PRODUCT, "inactivo");

    await save(result);
    act(() => result.current.handleCloseAdminAuth());

    expect(result.current.adminAuthOpen).toBe(false);
    expect(saveProductModifications).not.toHaveBeenCalled();
  });

  it("un admin desactiva sin pedir autorizacion", async () => {
    checkUserIsAdmin.mockResolvedValue(true);
    const { result } = await renderWithProduct(ACTIVE_PRODUCT, "inactivo");

    await save(result);

    expect(result.current.adminAuthOpen).toBe(false);
    expect(saveProductModifications).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["editar un producto activo", ACTIVE_PRODUCT, "activo"],
    ["activar un producto inactivo", INACTIVE_PRODUCT, "activo"],
    ["editar un producto inactivo", INACTIVE_PRODUCT, "inactivo"],
  ])("%s no consulta el rol", async (_label, product, status) => {
    const { result } = await renderWithProduct(product, status);

    await save(result);

    expect(checkUserIsAdmin).not.toHaveBeenCalled();
    expect(saveProductModifications).toHaveBeenCalledTimes(1);
  });
});
