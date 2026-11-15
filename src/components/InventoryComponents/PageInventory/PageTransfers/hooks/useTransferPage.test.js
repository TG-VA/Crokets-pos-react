import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";

vi.mock("../../../../../contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u1", username: "admin" } }),
}));

vi.mock("../../../../../contexts/BranchContext", () => ({
  useBranch: () => ({ branch: { id: "b1", name: "Origen" } }),
}));

const mockProducts = [
  { id: "p1", codigo: "CROC-01", descripcion: "Croquetas" },
];

vi.mock("../../../../../contexts/ProductsContext", () => ({
  useProducts: () => ({
    getProductByCodigo: vi.fn(),
    products: mockProducts,
    loadingProducts: false,
    productsError: "Error al cargar",
    refreshProducts: vi.fn().mockResolvedValue(),
  }),
}));

vi.mock("./useTransferFeedback", () => ({
  default: () => ({
    error: "",
    success: "",
    setError: vi.fn(),
    setSuccess: vi.fn(),
    clearFeedback: vi.fn(),
  }),
}));

vi.mock("./useTransferDataLoad", () => ({
  default: () => ({
    activeTab: "send",
    setActiveTab: vi.fn(),
    branchOptions: [],
    destinationOptions: [],
    loadingBranches: false,
    pendingReceiptOrders: [],
    pendingReceiptsCount: 0,
    transferHistory: [],
    transferMetrics: {},
    cancellableTransferIds: new Set(),
    submitting: false,
    setSubmitting: vi.fn(),
    handleTabChange: vi.fn(),
    handleCancelTransfer: vi.fn(),
    reloadOrders: vi.fn(),
  }),
}));

vi.mock("./useSendForm", () => ({
  default: () => ({
    destinationBranchId: "",
    setDestinationBranchId: vi.fn(),
    productSearch: "",
    handleLookupProductSearchChange: vi.fn(),
    handleLookupProduct: vi.fn(),
    searchableProducts: [],
    searchModalOpen: false,
    openSearchModal: vi.fn(),
    closeSearchModal: vi.fn(),
    loadProductForTransfer: vi.fn(),
    draftItems: [],
    draftTotals: { lines: 0, units: 0 },
    handleDraftQuantityChange: vi.fn(),
    handleRemoveDraftItem: vi.fn(),
    transferNotes: "",
    setTransferNotes: vi.fn(),
    handleSubmitTransfer: vi.fn(),
  }),
}));

vi.mock("./useReceiveForm", () => ({
  default: () => ({
    selectedReceiptOrder: null,
    receiptQuantities: {},
    handleSelectReceiptOrder: vi.fn(),
    handleReceiptQuantityChange: vi.fn(),
    handleConfirmReceipt: vi.fn(),
  }),
}));

import useTransfersPage from "./useTransfersPage";

describe("useTransfersPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("expone el estado de la pagina", () => {
    const { result } = renderHook(() => useTransfersPage());
    expect(result.current.activeTab).toBe("send");
    expect(result.current.branch).toEqual({ id: "b1", name: "Origen" });
    expect(result.current.draftItems).toEqual([]);
    expect(result.current.submitting).toBe(false);
  });

  it("retorna funciones de los formularios", () => {
    const { result } = renderHook(() => useTransfersPage());
    expect(typeof result.current.handleSubmitTransfer).toBe("function");
    expect(typeof result.current.handleConfirmReceipt).toBe("function");
    expect(typeof result.current.handleTabChange).toBe("function");
    expect(typeof result.current.handleCancelTransfer).toBe("function");
  });

  it("retorna estados de feedback", () => {
    const { result } = renderHook(() => useTransfersPage());
    expect(result.current.error).toBe("");
    expect(result.current.success).toBe("");
  });

  it("retorna datos de productos y sucursales", () => {
    const { result } = renderHook(() => useTransfersPage());
    expect(result.current.products).toHaveLength(1);
    expect(result.current.products[0].id).toBe("p1");
    expect(Array.isArray(result.current.destinationOptions)).toBe(true);
    expect(result.current.loadingProducts).toBe(false);
  });

  it("expone el error de productos para el buscador", () => {
    const { result } = renderHook(() => useTransfersPage());
    expect(result.current.productsError).toBe("Error al cargar");
  });
});
