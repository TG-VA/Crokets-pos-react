import { useCallback, useMemo, useState } from "react";

import { useAuth } from "../../../../../contexts/AuthContext";
import { createStoreOrder } from "../services/ordersService";
import { printStoreOrder } from "../services/ordersExportPdfService";

const sanitizeQuantity = (value) => {
  const raw = String(value ?? "").replace(/[^\d.]/g, "");

  if (!raw) return "";

  const [integerPart, ...rest] = raw.split(".");

  if (rest.length === 0) return integerPart;

  return `${integerPart}.${rest.join("")}`;
};

export const useCreateOrderForm = ({
  currentBranch,
  branches = [],
  products = [],
}) => {
  const { user } = useAuth();

  const [orderName, setOrderName] = useState("");
  const [destinationBranchId, setDestinationBranchId] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

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

      if (items.some((item) => item.productId === productId)) {
        return false;
      }

      setItems((previous) => [
        ...previous,
        {
          productId,
          barcode: product.codigo ?? product.barcode ?? "",
          productName:
            product.descripcion ?? product.name ?? "Producto sin nombre",
          departmentName:
            product.departamento ??
            product.department_name ??
            "Sin departamento",
          costPrice: Number(product.costo ?? product.cost_price ?? 0),
          expectedQty: "1",
        },
      ]);

      setError("");
      return true;
    },
    [items]
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
        setError("No se encontro un producto con ese codigo.");
        return false;
      }

      return addProduct(product);
    },
    [addProduct, products]
  );

  const updateQuantity = useCallback((productId, value) => {
    const sanitized = sanitizeQuantity(value);

    setItems((previous) =>
      previous.map((item) =>
        item.productId === productId
          ? { ...item, expectedQty: sanitized }
          : item
      )
    );
  }, []);

  const removeProduct = useCallback((productId) => {
    setItems((previous) =>
      previous.filter((item) => item.productId !== productId)
    );
  }, []);

  const resetForm = useCallback(() => {
    setOrderName("");
    setDestinationBranchId("");
    setNotes("");
    setItems([]);
    setError("");
    setSearchOpen(false);
  }, []);

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

  const printDraft = useCallback(() => {
    const destination = branches.find(
      (branchOption) => branchOption.id === destinationBranchId
    );

    const opened = printStoreOrder({
      orderNumber: "BORRADOR",
      orderName: orderName.trim() || "Pedido sin nombre",
      status: "pending",
      fromBranchName: currentBranch?.name || "Sucursal origen",
      toBranchName: destination?.name || "Sucursal destino",
      createdByLabel: user?.username || "",
      sentAt: new Date().toISOString(),
      departments: departmentSummary,
      notes,
      discrepancyNotes: "",
      items: items.map((item) => ({
        ...item,
        expectedQty: Number(item.expectedQty),
        receivedQty: null,
        differenceQty: null,
      })),
    });

    if (!opened) {
      setError("No se pudo abrir la vista de impresion.");
    }

    return opened;
  }, [
    branches,
    currentBranch?.name,
    departmentSummary,
    destinationBranchId,
    items,
    notes,
    orderName,
    user?.username,
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
    printDraft,
  };
};
