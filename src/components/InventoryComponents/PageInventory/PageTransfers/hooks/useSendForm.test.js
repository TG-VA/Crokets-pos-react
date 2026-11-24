import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("../services/transfersService", () => ({
  createTransferOrder: vi.fn(),
}));

let capturedOnProductSelected = null;
vi.mock("./useProductLookup", () => ({
  default: vi.fn((props) => {
    capturedOnProductSelected = props.onProductSelected;
    return {
      productSearch: "",
      setProductSearch: vi.fn(),
      handleLookupProductSearchChange: vi.fn(),
      searchableProducts: [],
      searchModalOpen: false,
      setSearchModalOpen: vi.fn(),
      openSearchModal: vi.fn(),
      closeSearchModal: vi.fn(),
      clearLookupSelection: vi.fn(),
      handleLookupProduct: vi.fn(),
      loadProductForTransfer: (product) => props.onProductSelected(product, 1),
    };
  }),
}));

import { createTransferOrder } from "../services/transfersService";
import useSendForm from "./useSendForm";

const products = [
  {
    id: "p1",
    codigo: "CROC-01",
    descripcion: "Croquetas",
    costo: 10,
    precio: 20,
    existencia: 10,
    tracks_inventory: true,
    is_global: true,
  },
];

const branchOptions = [
  { id: "b1", name: "Origen", code: "ORG" },
  { id: "b2", name: "Destino", code: "DST" },
];

const createProps = (overrides = {}) => ({
  originBranch: { id: "b1", name: "Origen" },
  user: { id: "u1", username: "admin" },
  products,
  activeTab: "send",
  getProductByCodigo: vi.fn(),
  refreshProducts: vi.fn().mockResolvedValue(),
  reloadOrders: vi.fn().mockResolvedValue(),
  setActiveTab: vi.fn(),
  submitting: false,
  setSubmitting: vi.fn(),
  clearFeedback: vi.fn(),
  setError: vi.fn(),
  setSuccess: vi.fn(),
  branchOptions,
  destinationOptions: branchOptions,
  ...overrides,
});

describe("useSendForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedOnProductSelected = null;
  });

  it("inicializa destinationBranchId con la primera opcion", () => {
    const { result } = renderHook(() => useSendForm(createProps()));
    expect(result.current.destinationBranchId).toBe("b1");
  });

  it("agrega un producto al draft via onProductSelected (handleAddDraftItem)", () => {
    const { result } = renderHook(() => useSendForm(createProps()));
    act(() => {
      capturedOnProductSelected(products[0], 3);
    });
    expect(result.current.draftItems).toHaveLength(1);
    expect(result.current.draftItems[0].quantity).toBe(3);
    expect(result.current.draftTotals).toEqual({ lines: 1, units: 3 });
  });

  it("no agrega un producto local aunque venga del escaner o la busqueda", () => {
    const setError = vi.fn();
    const { result } = renderHook(() => useSendForm(createProps({ setError })));

    act(() => {
      capturedOnProductSelected(
        { ...products[0], id: "local", is_global: false },
        1
      );
    });

    expect(result.current.draftItems).toHaveLength(0);
    expect(setError).toHaveBeenCalledWith(
      "Producto local: vuelvelo global desde la busqueda (F10) para poder traspasarlo."
    );
  });

  it("no agrega un producto agotado y avisa que no hay stock", () => {
    const setError = vi.fn();
    const { result } = renderHook(() => useSendForm(createProps({ setError })));

    act(() => {
      capturedOnProductSelected({ ...products[0], existencia: 0 }, 1);
    });

    expect(result.current.draftItems).toHaveLength(0);
    expect(setError).toHaveBeenCalledWith("Sin stock en la sucursal origen.");
  });

  it("error si la cantidad supera el stock", () => {
    const setError = vi.fn();
    const { result } = renderHook(() => useSendForm(createProps({ setError })));
    act(() => {
      capturedOnProductSelected(products[0], 999);
    });
    expect(setError).toHaveBeenCalledWith(
      "No puedes enviar más de 10 piezas de Croquetas."
    );
    expect(result.current.draftItems).toHaveLength(0);
  });

  it("error si cantidad <= 0", () => {
    const setError = vi.fn();
    renderHook(() => useSendForm(createProps({ setError })));
    act(() => {
      capturedOnProductSelected(products[0], -1);
    });
    expect(setError).toHaveBeenCalledWith(
      "La cantidad a enviar debe ser mayor a 0."
    );
  });

  it("handleRemoveDraftItem elimina un producto del draft", () => {
    const { result } = renderHook(() => useSendForm(createProps()));
    act(() => {
      capturedOnProductSelected(products[0], 3);
    });
    expect(result.current.draftItems).toHaveLength(1);
    act(() => {
      result.current.handleRemoveDraftItem("p1");
    });
    expect(result.current.draftItems).toHaveLength(0);
  });

  it("handleDraftQuantityChange ajusta cantidad al stock maximo", () => {
    const setError = vi.fn();
    const { result } = renderHook(() => useSendForm(createProps({ setError })));
    act(() => {
      capturedOnProductSelected(products[0], 3);
    });
    act(() => {
      result.current.handleDraftQuantityChange("p1", 999);
    });
    expect(result.current.draftItems[0].quantity).toBe(10);
    expect(setError).toHaveBeenCalledWith(
      "No puedes enviar más de 10 piezas de Croquetas. Cantidad ajustada a 10."
    );
  });

  it("handleSubmitTransfer: error si no hay sucursal destino", async () => {
    const setError = vi.fn();
    const { result } = renderHook(() =>
      useSendForm(createProps({ setError, destinationOptions: [] }))
    );
    await act(async () => {
      await result.current.handleSubmitTransfer();
    });
    expect(setError).toHaveBeenCalledWith("Selecciona la sucursal destino.");
  });

  it("handleSubmitTransfer: error si un item no tiene cantidad valida", async () => {
    const setError = vi.fn();
    const { result } = renderHook(() => useSendForm(createProps({ setError })));
    act(() => {
      capturedOnProductSelected(products[0], 3);
    });
    act(() => {
      result.current.handleDraftQuantityChange("p1", "");
    });
    await act(async () => {
      await result.current.handleSubmitTransfer();
    });
    expect(setError).toHaveBeenCalledWith(
      'Escribe una cantidad válida para "Croquetas" (debe ser mayor a 0).'
    );
  });

  it("handleSubmitTransfer: crea la orden y limpia el form", async () => {
    createTransferOrder.mockResolvedValueOnce({
      folio: "TR-010126-000000",
      destinationBranchName: "Destino",
    });
    const setSuccess = vi.fn();
    const { result } = renderHook(() =>
      useSendForm(createProps({ setSuccess }))
    );
    act(() => {
      capturedOnProductSelected(products[0], 3);
    });
    act(() => {
      result.current.setTransferNotes("Urgente");
    });
    await act(async () => {
      await result.current.handleSubmitTransfer();
    });
    expect(createTransferOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        originBranch: { id: "b1", name: "Origen" },
        notes: "Urgente",
      })
    );
    expect(result.current.draftItems).toHaveLength(0);
    expect(result.current.transferNotes).toBe("");
    expect(setSuccess).toHaveBeenCalled();
  });

  it("handleSubmitTransfer: error si el RPC falla", async () => {
    createTransferOrder.mockRejectedValueOnce(new Error("Stock insuficiente"));
    const setError = vi.fn();
    const { result } = renderHook(() => useSendForm(createProps({ setError })));
    act(() => {
      capturedOnProductSelected(products[0], 3);
    });
    await act(async () => {
      await result.current.handleSubmitTransfer();
    });
    expect(setError).toHaveBeenCalledWith("Stock insuficiente");
  });
});

describe("useSendForm origen de stock", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedOnProductSelected = null;
  });

  it("pide la sucursal origen si no hay una elegida", async () => {
    const setError = vi.fn();
    const { result } = renderHook(() =>
      useSendForm(createProps({ originBranch: null, setError }))
    );

    await act(async () => {
      await result.current.handleSubmitTransfer();
    });

    expect(setError).toHaveBeenCalledWith(
      "Selecciona la sucursal origen del traspaso."
    );
    expect(createTransferOrder).not.toHaveBeenCalled();
  });

  it("descarta el borrador al cambiar la sucursal origen", () => {
    const { result, rerender } = renderHook((props) => useSendForm(props), {
      initialProps: createProps(),
    });
    act(() => {
      capturedOnProductSelected(products[0], 3);
    });
    expect(result.current.draftItems).toHaveLength(1);

    rerender(createProps({ originBranch: { id: "b2", name: "Destino" } }));

    expect(result.current.draftItems).toHaveLength(0);
  });

  it("envia el traspaso desde la sucursal origen recibida", async () => {
    createTransferOrder.mockResolvedValue({
      folio: "TR-1",
      destinationBranchName: "Destino",
    });
    const originBranch = { id: "b1", name: "Origen" };
    const { result } = renderHook(() =>
      useSendForm(createProps({ originBranch }))
    );
    act(() => {
      capturedOnProductSelected(products[0], 2);
    });

    await act(async () => {
      await result.current.handleSubmitTransfer();
    });

    expect(createTransferOrder).toHaveBeenCalledWith(
      expect.objectContaining({ originBranch })
    );
  });
});
