import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("./rewardModalService", () => ({
  fetchRewardProductsCatalog: vi.fn(),
  fetchRewardProductIds: vi.fn(),
  findRewardByName: vi.fn(),
  persistReward: vi.fn(),
  syncRewardProducts: vi.fn(),
}));

import {
  fetchRewardProductsCatalog,
  fetchRewardProductIds,
  findRewardByName,
  persistReward,
  syncRewardProducts,
} from "./rewardModalService";
import { useRewardModal } from "./useRewardModal";

const PRODUCT_CATALOG = [
  { id: "p1", name: "Croquetas", barcode: "111", sale_price: 100 },
  { id: "p2", name: "Juguete", barcode: "222", sale_price: 50 },
];

const renderRewardModal = (overrides = {}) => {
  const props = {
    isOpen: true,
    onClose: vi.fn(),
    onSaved: vi.fn(),
    rewardToEdit: null,
    ...overrides,
  };

  const utils = renderHook(() => useRewardModal(props));
  return { ...utils, props };
};

const flush = async () => {
  await act(async () => {});
};

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe("useRewardModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});

    fetchRewardProductsCatalog.mockResolvedValue(PRODUCT_CATALOG);
    fetchRewardProductIds.mockResolvedValue([]);
    findRewardByName.mockResolvedValue(null);
    persistReward.mockResolvedValue("new-id");
    syncRewardProducts.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("inicializacion", () => {
    it("no carga datos si el modal esta cerrado", async () => {
      const { result } = renderRewardModal({ isOpen: false });
      await flush();

      expect(fetchRewardProductsCatalog).not.toHaveBeenCalled();
      expect(result.current.formData.name).toBe("");
    });

    it("inicializa una recompensa nueva y carga el catalogo", async () => {
      const { result } = renderRewardModal();
      await flush();

      expect(result.current.isEditing).toBe(false);
      expect(result.current.requiresProducts).toBe(true);
      expect(result.current.formData).toMatchObject({
        name: "",
        reward_type: "free_product",
        reward_quantity: "1",
        is_active: true,
      });
      expect(result.current.products).toEqual(PRODUCT_CATALOG);
      expect(result.current.loadingProducts).toBe(false);
    });

    it("hidrata una recompensa free_product y sus productos vinculados", async () => {
      fetchRewardProductIds.mockResolvedValue(["p1"]);

      const { result } = renderRewardModal({
        rewardToEdit: {
          id: "r1",
          name: "PREMIO",
          description: "DESC",
          points_required: 100,
          is_active: false,
          reward_type: "free_product",
          reward_quantity: 2,
        },
      });
      await flush();

      expect(result.current.isEditing).toBe(true);
      expect(result.current.formData).toMatchObject({
        name: "PREMIO",
        points_required: "100",
        is_active: false,
        reward_quantity: "2",
      });
      expect(fetchRewardProductIds).toHaveBeenCalledWith("r1");
      expect(result.current.selectedProductIds).toEqual(["p1"]);
    });

    it("hidrata una recompensa product_discount sin cargar catalogo", async () => {
      const { result } = renderRewardModal({
        rewardToEdit: {
          id: "r2",
          name: "DESC",
          reward_type: "product_discount",
          discount_type: "fixed",
          discount_value: 25,
          points_required: 10,
          reward_quantity: 1,
          is_active: true,
        },
      });
      await flush();

      expect(fetchRewardProductsCatalog).not.toHaveBeenCalled();
      expect(result.current.requiresDiscount).toBe(true);
      expect(result.current.formData.discount_type).toBe("fixed");
      expect(result.current.formData.discount_value).toBe("25");
    });
  });

  describe("handleChange", () => {
    it("normaliza el valor del campo y valida en linea", async () => {
      const { result } = renderRewardModal();
      await flush();

      act(() => {
        result.current.handleChange("name", "promo");
      });
      act(() => {
        result.current.handleChange("points_required", "12a3");
      });

      expect(result.current.formData.name).toBe("PROMO");
      expect(result.current.formData.points_required).toBe("123");

      act(() => {
        result.current.handleChange("name", "a");
      });

      expect(result.current.fieldErrors.name).toBe(
        "El nombre debe tener al menos 3 caracteres."
      );
    });
  });

  describe("handleBlur", () => {
    it("marca el campo como tocado y recalcula errores", async () => {
      const { result } = renderRewardModal();
      await flush();

      act(() => {
        result.current.handleBlur("name");
      });

      expect(result.current.touchedFields.name).toBe(true);
      expect(result.current.fieldErrors.name).toBe(
        "Ingresa el nombre de la recompensa."
      );
    });
  });

  describe("handleRewardTypeChange", () => {
    it("al cambiar a descuento limpia productos y define percent", async () => {
      fetchRewardProductIds.mockResolvedValue([]);
      const { result } = renderRewardModal();
      await flush();

      await act(async () => {
        await result.current.handleRewardTypeChange("product_discount");
      });

      expect(result.current.requiresDiscount).toBe(true);
      expect(result.current.formData.discount_type).toBe("percent");
      expect(result.current.selectedProductIds).toEqual([]);
      expect(result.current.products).toEqual([]);
    });

    it("al volver a producto gratis recarga el catalogo", async () => {
      fetchRewardProductIds.mockResolvedValue([]);
      const { result } = renderRewardModal({
        rewardToEdit: {
          id: "r2",
          name: "DESC",
          reward_type: "product_discount",
          discount_type: "fixed",
          discount_value: 25,
          points_required: 10,
          reward_quantity: 1,
          is_active: true,
        },
      });
      await flush();

      await act(async () => {
        await result.current.handleRewardTypeChange("free_product");
      });

      expect(result.current.requiresProducts).toBe(true);
      expect(result.current.formData.discount_type).toBe("");
      expect(fetchRewardProductsCatalog).toHaveBeenCalled();
    });
  });

  describe("handleProductToggle", () => {
    it("agrega y quita productos validando el campo", async () => {
      const { result } = renderRewardModal();
      await flush();

      act(() => {
        result.current.handleProductToggle("p1");
      });

      expect(result.current.selectedProductIds).toEqual(["p1"]);
      expect(result.current.fieldErrors.products).toBeUndefined();

      act(() => {
        result.current.handleProductToggle("p1");
      });

      expect(result.current.selectedProductIds).toEqual([]);
      expect(result.current.fieldErrors.products).toBe(
        "Selecciona al menos un producto aplicable."
      );
    });

    it("expone los productos seleccionados y el filtrado de busqueda", async () => {
      const { result } = renderRewardModal();
      await flush();

      act(() => {
        result.current.handleProductToggle("p1");
      });

      expect(result.current.selectedProducts).toEqual([PRODUCT_CATALOG[0]]);

      act(() => {
        result.current.setProductSearchTerm("jug");
      });

      expect(result.current.filteredProducts).toEqual([PRODUCT_CATALOG[1]]);
    });
  });

  describe("canSave", () => {
    it("permanece deshabilitado con el formulario vacio", async () => {
      const { result } = renderRewardModal();
      await flush();

      expect(result.current.canSave).toBe(false);
    });

    it("se habilita con datos validos", async () => {
      const { result } = renderRewardModal({
        rewardToEdit: {
          id: "r2",
          name: "DESC",
          reward_type: "product_discount",
          discount_type: "fixed",
          discount_value: 25,
          points_required: 10,
          reward_quantity: 1,
          is_active: true,
        },
      });
      await flush();

      expect(result.current.canSave).toBe(true);
    });
  });

  describe("handleSubmit", () => {
    const fillDiscountForm = (result) => {
      act(() => result.current.handleChange("name", "REGALO"));
      act(() => result.current.handleChange("points_required", "50"));
      act(() => result.current.handleChange("discount_type", "percent"));
      act(() => result.current.handleChange("discount_value", "10"));
    };

    it("crea la recompensa y muestra el aviso de exito", async () => {
      const { result, props } = renderRewardModal();
      await flush();

      await act(async () => {
        await result.current.handleRewardTypeChange("product_discount");
      });
      fillDiscountForm(result);

      expect(result.current.canSave).toBe(true);

      const event = { preventDefault: vi.fn() };
      await act(async () => {
        await result.current.handleSubmit(event);
      });

      expect(event.preventDefault).toHaveBeenCalled();
      expect(findRewardByName).toHaveBeenCalledWith("REGALO", null);
      expect(persistReward).toHaveBeenCalledTimes(1);
      expect(syncRewardProducts).toHaveBeenCalledWith({
        rewardId: "new-id",
        rewardType: "product_discount",
        selectedProductIds: [],
      });
      expect(props.onSaved).toHaveBeenCalled();
      expect(result.current.saving).toBe(false);
      expect(result.current.appModal.isOpen).toBe(true);
      expect(result.current.appModal.title).toBe("Recompensa creada");
    });

    it("actualiza la recompensa existente excluyendo su propio id", async () => {
      persistReward.mockResolvedValue("r1");
      const { result } = renderRewardModal({
        rewardToEdit: {
          id: "r1",
          name: "PREMIO",
          reward_type: "free_product",
          points_required: 100,
          reward_quantity: 1,
          is_active: true,
        },
      });
      await flush();

      act(() => {
        result.current.handleProductToggle("p1");
      });

      await act(async () => {
        await result.current.handleSubmit({ preventDefault: vi.fn() });
      });

      expect(findRewardByName).toHaveBeenCalledWith("PREMIO", "r1");
      expect(result.current.appModal.title).toBe("Recompensa editada");
    });

    it("bloquea el guardado ante formulario invalido", async () => {
      const { result } = renderRewardModal();
      await flush();

      await act(async () => {
        await result.current.handleSubmit({ preventDefault: vi.fn() });
      });

      expect(result.current.appModal.isOpen).toBe(true);
      expect(result.current.appModal.title).toBe("Campos incompletos");
      expect(persistReward).not.toHaveBeenCalled();
      expect(result.current.touchedFields.name).toBe(true);
    });

    it("bloquea nombres duplicados", async () => {
      findRewardByName.mockResolvedValue({ id: "dup", name: "REGALO" });
      const { result } = renderRewardModal();
      await flush();

      await act(async () => {
        await result.current.handleRewardTypeChange("product_discount");
      });
      fillDiscountForm(result);

      await act(async () => {
        await result.current.handleSubmit({ preventDefault: vi.fn() });
      });

      expect(result.current.appModal.title).toBe("Recompensa duplicada");
      expect(persistReward).not.toHaveBeenCalled();
    });

    it("muestra el error cuando falla la persistencia", async () => {
      persistReward.mockRejectedValue(new Error("boom"));
      const { result, props } = renderRewardModal();
      await flush();

      await act(async () => {
        await result.current.handleRewardTypeChange("product_discount");
      });
      fillDiscountForm(result);

      await act(async () => {
        await result.current.handleSubmit({ preventDefault: vi.fn() });
      });

      expect(result.current.appModal.title).toBe("No se pudo guardar");
      expect(result.current.appModal.message).toBe("boom");
      expect(props.onSaved).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe("handleRequestClose", () => {
    it("cierra el modal cuando no hay guardado ni aviso activo", async () => {
      const { result, props } = renderRewardModal();
      await flush();

      act(() => {
        result.current.handleRequestClose();
      });

      expect(props.onClose).toHaveBeenCalledTimes(1);
    });

    it("no cierra si hay un aviso abierto", async () => {
      const { result, props } = renderRewardModal();
      await flush();

      act(() => {
        result.current.showAppAlert({ title: "Aviso" });
      });
      act(() => {
        result.current.handleRequestClose();
      });

      expect(props.onClose).not.toHaveBeenCalled();
    });

    it("no cierra mientras se esta guardando", async () => {
      const pending = deferred();
      persistReward.mockReturnValue(pending.promise);

      const { result, props } = renderRewardModal();
      await flush();

      await act(async () => {
        await result.current.handleRewardTypeChange("product_discount");
      });
      act(() => result.current.handleChange("name", "REGALO"));
      act(() => result.current.handleChange("points_required", "50"));
      act(() => result.current.handleChange("discount_type", "percent"));
      act(() => result.current.handleChange("discount_value", "10"));

      let submitPromise;
      act(() => {
        submitPromise = result.current.handleSubmit({
          preventDefault: vi.fn(),
        });
      });
      await flush();

      expect(result.current.saving).toBe(true);

      act(() => {
        result.current.handleRequestClose();
      });

      expect(props.onClose).not.toHaveBeenCalled();

      await act(async () => {
        pending.resolve("new-id");
        await submitPromise;
      });

      expect(result.current.saving).toBe(false);
    });
  });
});
