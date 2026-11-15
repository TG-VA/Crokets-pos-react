import { useCallback, useMemo, useState } from "react";

import { useAuth } from "../../../../../contexts/AuthContext";
import { useOrderDraft } from "../../../../../contexts/OrderDraftContext";
import {
  isGlobalProduct,
  isInventoryTrackedProduct,
  isKitProduct,
} from "../../../../../services/inventory/inventoryProductCalculationService";
import { createStoreOrder } from "../services/ordersService";
import { sanitizeIntegerQuantity } from "../utils/ordersQuantityInput";

export const useCreateOrderForm = ({
  currentBranch,
  branches = [],
  products = [],
}) => {
  const { user } = useAuth();

  // El borrador vive en el contexto para sobrevivir a la navegacion entre modulos.
  const {
    orderName,
    setOrderName: setOrderNameState,
    destinationBranchId,
    setDestinationBranchId,
    notes,
    setNotes,
    items,
    setItems,
    clearDraft,
  } = useOrderDraft();
  const [searchOpen, setSearchOpen] = useState(false);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const setOrderName = useCallback(
    (value) => {
      // Sin trim: el usuario debe poder escribir espacios entre palabras.
      setOrderNameState(String(value ?? "").toLocaleUpperCase("es-MX"));
    },
    [setOrderNameState]
  );

  const destinationOptions = useMemo(
    () =>
      branches.filter((branchOption) => branchOption.id !== currentBranch?.id),
    [branches, currentBranch?.id]
  );

  const departmentSummary = useMemo(() => {
    const departments = items
      .map((item) => item.departmentName)
      .filter(Boolean);

    return Array.from(new Set(departments));
  }, [items]);

  const totalUnits = useMemo(
    () =>
      items.reduce((total, item) => {
        const quantity = Number(item.expectedQty);
        return total + (Number.isFinite(quantity) ? quantity : 0);
      }, 0),
    [items]
  );

  const totalCost = useMemo(
    () =>
      items.reduce((total, item) => {
        const quantity = Number(item.expectedQty);
        const cost = Number(item.costPrice);
        if (!Number.isFinite(quantity) || !Number.isFinite(cost)) return total;
        return total + quantity * cost;
      }, 0),
    [items]
  );

  const isValid = useMemo(() => {
    if (!orderName.trim() || !destinationBranchId) return false;
    if (items.length === 0) return false;

    return items.every((item) => {
      const quantity = Number(item.expectedQty);
      return Number.isFinite(quantity) && quantity > 0;
    });
  }, [destinationBranchId, items, orderName]);

  const addProduct = useCallback(
    (product) => {
      const productId = product?.product_id ?? product?.id;

      if (!productId) return false;

      if (isKitProduct(product)) {
        setError(
          "Los kits no se pueden pedir: su inventario depende de sus componentes."
        );
        return false;
      }

      if (!isInventoryTrackedProduct(product)) {
        setError("El producto no maneja inventario y no se puede pedir.");
        return false;
      }

      if (!isGlobalProduct(product)) {
        setError(
          "El producto es local o no global y no se puede enviar a otra sucursal."
        );
        return false;
      }

      if (items.some((item) => item.productId === productId)) {
        return false;
      }

      setItems((previous) => [
        ...previous,
        {
          productId,
          isGlobal: true,
          barcode: product.codigo ?? product.barcode ?? "",
          productName:
            product.descripcion ?? product.name ?? "Producto sin nombre",
          departmentName:
            product.departamento ??
            product.department_name ??
            "Sin departamento",
          costPrice: Number(product.costo ?? product.cost_price ?? 0),
          expectedQty: "",
        },
      ]);

      setError("");
      return true;
    },
    [items, setItems]
  );

  const handleCodeSubmit = useCallback(
    (code) => {
      const key = String(code ?? "")
        .trim()
        .toLowerCase();

      if (!key) return false;

      const product = products.find((candidate) => {
        const barcode = String(candidate?.codigo ?? candidate?.barcode ?? "")
          .trim()
          .toLowerCase();

        return barcode === key;
      });

      if (!product) {
        setError("No se encontró un producto con ese código.");
        return false;
      }

      return addProduct(product);
    },
    [addProduct, products]
  );

  const updateQuantity = useCallback(
    (productId, value) => {
      const sanitized = sanitizeIntegerQuantity(value);

      setItems((previous) =>
        previous.map((item) =>
          item.productId === productId
            ? { ...item, expectedQty: sanitized }
            : item
        )
      );
    },
    [setItems]
  );

  const removeProduct = useCallback(
    (productId) => {
      setItems((previous) =>
        previous.filter((item) => item.productId !== productId)
      );
    },
    [setItems]
  );

  const resetForm = useCallback(() => {
    clearDraft();
    setError("");
    setSearchOpen(false);
  }, [clearDraft]);

  const originBranchId = currentBranch?.id;

  const saveOrder = useCallback(async () => {
    if (isSaving) return null;

    setError("");
    setIsSaving(true);

    try {
      const createdOrder = await createStoreOrder({
        orderName,
        originBranchId,
        destinationBranchId,
        items: items.map((item) => ({
          ...item,
          expectedQty: Number(item.expectedQty),
        })),
        notes,
        user,
      });

      resetForm();

      return createdOrder;
    } catch (err) {
      setError(err?.message || "No se pudo crear el pedido.");
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [
    destinationBranchId,
    isSaving,
    items,
    notes,
    orderName,
    originBranchId,
    resetForm,
    user,
  ]);

  return {
    orderName,
    setOrderName,
    destinationBranchId,
    setDestinationBranchId,
    destinationOptions,
    notes,
    setNotes,
    items,
    departmentSummary,
    totalUnits,
    totalCost,
    isValid,
    isSaving,
    error,
    searchOpen,
    setSearchOpen,
    selectedProductIds: items.map((item) => item.productId),
    addProduct,
    handleCodeSubmit,
    updateQuantity,
    removeProduct,
    resetForm,
    saveOrder,
  };
};
