import React, { useEffect, useMemo, useRef, useState } from "react";
import { useProducts } from "../../../../contexts/ProductsContext";
import { useBranch } from "../../../../contexts/BranchContext";
import { useAuth } from "../../../../contexts/AuthContext";
import { supabase } from "../../../../lib/supabaseClient";
import {
  getSystemLocalTimestamp,
  logInventoryMovement,
} from "../../../../utils/inventoryMovements";
import InventorySearchModal from "../../Modals/InventorySearchModal/InventorySearchModal";
import AppModal from "../../../AppModal/AppModal";
import styles from "./PageAdd.module.css";

const PageAdd = () => {
  const { products, getProductByCodigo, refreshProducts } = useProducts();
  const { branch } = useBranch();
  const { user } = useAuth();

  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [barcode, setBarcode] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantityToAdd, setQuantityToAdd] = useState("");
  const [submitArmed, setSubmitArmed] = useState(false);
  const [saving, setSaving] = useState(false);

  const [appModal, setAppModal] = useState({
    isOpen: false,
    type: "info",
    title: "",
    message: "",
    confirmText: "Entendido",
    cancelText: "Cancelar",
    showCancel: false,
    loading: false,
    onConfirm: null,
    onCancel: null,
  });

  const quantityInputRef = useRef(null);
  const barcodeInputRef = useRef(null);
  const bodyRef = useRef(null);

  const closeAppModal = () => {
    setAppModal((prev) => ({
      ...prev,
      isOpen: false,
      loading: false,
      onConfirm: null,
      onCancel: null,
    }));
  };

  const showAppAlert = ({
    type = "info",
    title = "Aviso",
    message = "",
    confirmText = "Entendido",
  }) => {
    setAppModal({
      isOpen: true,
      type,
      title,
      message,
      confirmText,
      cancelText: "Cancelar",
      showCancel: false,
      loading: false,
      onConfirm: closeAppModal,
      onCancel: closeAppModal,
    });
  };

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "F10") {
        e.preventDefault();
        setSearchModalOpen(true);
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!submitArmed) return;

    const onKeyDown = (e) => {
      if (e.key !== "Enter") return;

      e.preventDefault();
      e.stopPropagation();

      setSubmitArmed(false);
      handleSubmit();
    };

    document.addEventListener("keydown", onKeyDown, true);

    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [submitArmed]);

  useEffect(() => {
    if (!selectedProduct) return;

    setQuantityToAdd("");
    setSubmitArmed(false);

    const raf = window.requestAnimationFrame(() => {
      quantityInputRef.current?.focus();

      if (typeof quantityInputRef.current?.select === "function") {
        quantityInputRef.current.select();
      }
    });

    return () => window.cancelAnimationFrame(raf);
  }, [selectedProduct?.codigo]);

  const currentInventory = useMemo(() => {
    return Number(selectedProduct?.existencia ?? 0) || 0;
  }, [selectedProduct?.existencia]);

  const parsedQuantityToAdd = useMemo(() => {
    const n = parseInt((quantityToAdd ?? "").toString(), 10);

    if (!Number.isFinite(n)) return 0;

    return Math.max(0, n);
  }, [quantityToAdd]);

  const newInventory = useMemo(() => {
    return currentInventory + parsedQuantityToAdd;
  }, [currentInventory, parsedQuantityToAdd]);

  const salePrice = useMemo(() => {
    const n = Number(selectedProduct?.precio ?? 0);

    return Number.isFinite(n) ? n : 0;
  }, [selectedProduct?.precio]);

  const getFocusableBodyElements = () => {
    if (!bodyRef.current) return [];

    const nodes = Array.from(
      bodyRef.current.querySelectorAll("input, select, textarea")
    );

    return nodes.filter((el) => {
      if (!el) return false;
      if (el.disabled) return false;
      if (el.tagName === "INPUT" && el.type === "hidden") return false;
      if (el.tabIndex === -1) return false;
      if (el.tagName === "INPUT" && el.readOnly) return false;

      return true;
    });
  };

  const handleContentKeyDown = (e) => {
    if (e.key !== "Enter") return;
    if (!selectedProduct) return;
    if (e.shiftKey) return;
    if (!bodyRef.current?.contains(e.target)) return;

    e.preventDefault();

    const focusables = getFocusableBodyElements();
    const active = document.activeElement;
    const index = focusables.indexOf(active);

    if (index === -1) return;

    if (index < focusables.length - 1) {
      setSubmitArmed(false);

      const next = focusables[index + 1];

      next.focus();

      if (typeof next.select === "function") {
        next.select();
      }

      return;
    }

    if (!submitArmed) {
      setSubmitArmed(true);

      if (active && typeof active.blur === "function") {
        active.blur();
      }

      return;
    }

    setSubmitArmed(false);
    handleSubmit();
  };

  const handleLookup = () => {
    const cleanBarcode = String(barcode || "").trim();

    if (!cleanBarcode) {
      showAppAlert({
        type: "warning",
        title: "Código requerido",
        message: "Escanea o escribe el código de barras del producto.",
        confirmText: "Entendido",
      });
      return;
    }

    const found = getProductByCodigo(cleanBarcode);

    if (!found) {
      showAppAlert({
        type: "warning",
        title: "Producto no encontrado",
        message:
          "No se encontró ningún producto con ese código de barras. Verifica el código o presiona F10 para buscarlo.",
        confirmText: "Entendido",
      });
      return;
    }

    setSelectedProduct(found);
  };

  const loadProduct = (product) => {
    if (!product) return;

    setSelectedProduct(product);
    setBarcode(product.codigo ?? "");
    setSearchModalOpen(false);
  };

  const resetAfterSave = () => {
    setSubmitArmed(false);
    setSelectedProduct(null);
    setBarcode("");
    setQuantityToAdd("");

    window.requestAnimationFrame(() => {
      barcodeInputRef.current?.focus();

      if (typeof barcodeInputRef.current?.select === "function") {
        barcodeInputRef.current.select();
      }
    });
  };

  const handleSubmit = async () => {
    if (!selectedProduct || saving) return;

    if (!branch?.id) {
      showAppAlert({
        type: "danger",
        title: "Sucursal no detectada",
        message: "No hay una sucursal activa para registrar el inventario.",
        confirmText: "Entendido",
      });
      return;
    }

    const qty = parsedQuantityToAdd;

    if (qty <= 0) {
      showAppAlert({
        type: "warning",
        title: "Cantidad inválida",
        message: "La cantidad debe ser mayor a 0.",
        confirmText: "Entendido",
      });

      quantityInputRef.current?.focus();
      return;
    }

    const productId = selectedProduct.product_id || selectedProduct.id;

    if (!productId) {
      showAppAlert({
        type: "danger",
        title: "Producto no detectado",
        message: "No se detectó el identificador del producto.",
        confirmText: "Entendido",
      });
      return;
    }

    try {
      setSaving(true);

      const { data: inventoryRow, error: inventoryFetchError } = await supabase
        .from("branch_inventory")
        .select("id, stock, has_been_stocked")
        .eq("branch_id", branch.id)
        .eq("product_id", productId)
        .maybeSingle();

      if (inventoryFetchError) throw inventoryFetchError;

      const now = new Date().toISOString();
      const movementCreatedAt = getSystemLocalTimestamp(new Date());
      const costPrice = Number(selectedProduct.costo || 0);
      const productSalePrice = Number(selectedProduct.precio || 0);

      if (inventoryRow?.id) {
        const previousStock = Number(inventoryRow.stock || 0);
        const nextStock = previousStock + qty;

        const { error: updateError } = await supabase
          .from("branch_inventory")
          .update({
            stock: nextStock,
            is_active: true,
            has_been_stocked: true,
            cost_price: costPrice,
            sale_price: productSalePrice,
            updated_at: now,
          })
          .eq("id", inventoryRow.id);

        if (updateError) throw updateError;

        await logInventoryMovement({
          branchId: branch.id,
          productId,
          movementType: "inventory_add",
          quantity: qty,
          previousStock,
          newStock: nextStock,
          reason: "Alta a inventario (manual)",
          userId: user?.id || null,
          createdAt: movementCreatedAt,
        });
      } else {
        const { error: insertError } = await supabase
          .from("branch_inventory")
          .insert({
            branch_id: branch.id,
            product_id: productId,
            stock: qty,
            min_stock: 0,
            max_stock: 0,
            is_active: true,
            has_been_stocked: true,
            cost_price: costPrice,
            sale_price: productSalePrice,
            created_at: now,
            updated_at: now,
          });

        if (insertError) throw insertError;

        await logInventoryMovement({
          branchId: branch.id,
          productId,
          movementType: "inventory_add",
          quantity: qty,
          previousStock: 0,
          newStock: qty,
          reason: "Alta a inventario (manual)",
          userId: user?.id || null,
          createdAt: movementCreatedAt,
        });
      }

      await refreshProducts();

      const desc = (selectedProduct.descripcion ?? "").toString().trim();
      const descUpper = desc ? desc.toUpperCase() : "PRODUCTO";

      resetAfterSave();

      showAppAlert({
        type: "success",
        title: "Inventario actualizado",
        message: `${descUpper}\nInventario agregado: +${qty} PZ`,
        confirmText: "Aceptar",
      });
    } catch (error) {
      console.error("Error agregando inventario:", error);

      showAppAlert({
        type: "danger",
        title: "No se pudo agregar inventario",
        message: error.message || "No se pudo agregar inventario.",
        confirmText: "Entendido",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.container}>
      <div
        className={styles.content}
        onKeyDown={handleContentKeyDown}
        onFocusCapture={() => setSubmitArmed(false)}
      >
        <div className={styles.header}>
          <h1 className={styles.title}>Agregar inventario</h1>
          <p className={styles.subtitle}>
            Busca un producto y registra una entrada para aumentar el inventario
            de la sucursal actual.
          </p>
        </div>

        {!selectedProduct && (
          <div className={styles.lookup}>
            <div className={styles.formRow}>
              <label className={styles.label}>Código de barras</label>

              <input
                ref={barcodeInputRef}
                className={styles.input}
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleLookup();
                  }
                }}
                autoFocus
                placeholder="Escanea el código o presiona F10 para buscar"
              />
            </div>
          </div>
        )}

        {selectedProduct && (
          <div className={styles.body} ref={bodyRef}>
            <div className={styles.formRow}>
              <label className={styles.label}>Nombre del producto</label>

              <input
                className={styles.input}
                type="text"
                value={selectedProduct.descripcion ?? ""}
                readOnly
                tabIndex={-1}
              />
            </div>

            <div className={styles.formRow}>
              <label className={styles.label}>Inventario actual</label>

              <input
                className={styles.input}
                type="number"
                value={currentInventory}
                readOnly
                tabIndex={-1}
              />
            </div>

            <div className={styles.formRow}>
              <label className={styles.label}>Cantidad</label>

              <input
                ref={quantityInputRef}
                className={styles.input}
                type="number"
                inputMode="numeric"
                step="1"
                min="1"
                value={quantityToAdd}
                onKeyDown={(e) => {
                  if (
                    e.key === "-" ||
                    e.key === "+" ||
                    e.key === "e" ||
                    e.key === "E"
                  ) {
                    e.preventDefault();
                  }
                }}
                onChange={(e) => {
                  const raw = (e.target.value ?? "").toString();

                  if (!raw) {
                    setQuantityToAdd("");
                    return;
                  }

                  const digitsOnly = raw.replace(/[^\d]/g, "");
                  const n = parseInt(digitsOnly, 10);

                  if (!Number.isFinite(n) || n < 1) {
                    setQuantityToAdd("");
                    return;
                  }

                  setQuantityToAdd(String(n));
                }}
                placeholder="1"
              />
            </div>

            <div className={styles.formRow}>
              <label className={styles.label}>Nuevo inventario</label>

              <input
                className={styles.input}
                type="number"
                value={newInventory}
                readOnly
                tabIndex={-1}
              />
            </div>

            <div className={styles.formRow}>
              <label className={styles.label}>Precio venta</label>

              <input
                className={styles.input}
                type="number"
                inputMode="decimal"
                step="0.01"
                value={salePrice.toFixed(2)}
                readOnly
                tabIndex={-1}
              />
            </div>

            <div className={styles.actions}>
              <button
                className={`${styles.primaryButton} ${
                  submitArmed ? styles.confirmButton : ""
                }`}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();

                  if (saving) return;

                  if (!submitArmed) {
                    setSubmitArmed(true);
                    return;
                  }

                  handleSubmit();
                }}
                onDoubleClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();

                  if (saving) return;

                  handleSubmit();
                }}
              >
                {saving
                  ? "Guardando..."
                  : submitArmed
                    ? "Confirmar ingreso"
                    : "Ingresar producto"}
              </button>
            </div>
          </div>
        )}

        <InventorySearchModal
          isOpen={searchModalOpen}
          onClose={() => setSearchModalOpen(false)}
          products={products}
          onSelect={(p) => loadProduct(p)}
        />

        <AppModal
          isOpen={appModal.isOpen}
          type={appModal.type}
          title={appModal.title}
          message={appModal.message}
          confirmText={appModal.confirmText}
          cancelText={appModal.cancelText}
          showCancel={appModal.showCancel}
          loading={appModal.loading}
          onConfirm={appModal.onConfirm || closeAppModal}
          onCancel={appModal.onCancel || closeAppModal}
          onClose={closeAppModal}
        />
      </div>
    </div>
  );
};

export default PageAdd;