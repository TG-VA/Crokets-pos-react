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
import styles from "./PageAdjustments.module.css";

const PageAdjustments = () => {
  const { products, getProductByCodigo, refreshProducts } = useProducts();
  const { branch } = useBranch();
  const { user } = useAuth();

  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [barcode, setBarcode] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantityToAdjust, setQuantityToAdjust] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [adjustmentNotes, setAdjustmentNotes] = useState("");
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

  const barcodeInputRef = useRef(null);
  const quantityInputRef = useRef(null);
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
      handleSubmitAdjustment();
    };

    document.addEventListener("keydown", onKeyDown, true);

    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [submitArmed]);

  useEffect(() => {
    if (!selectedProduct) return;

    setQuantityToAdjust("");
    setAdjustmentReason("");
    setAdjustmentNotes("");
    setSubmitArmed(false);

    const raf = window.requestAnimationFrame(() => {
      quantityInputRef.current?.focus();

      if (typeof quantityInputRef.current?.select === "function") {
        quantityInputRef.current.select();
      }
    });

    return () => window.cancelAnimationFrame(raf);
  }, [selectedProduct?.codigo]);

  const currentStock = useMemo(() => {
    return Number(selectedProduct?.existencia ?? 0) || 0;
  }, [selectedProduct?.existencia]);

  const parsedQuantity = useMemo(() => {
    const raw = (quantityToAdjust ?? "").toString().trim();

    if (!raw || raw === "-") return 0;

    const n = Number.parseInt(raw, 10);

    return Number.isFinite(n) ? n : 0;
  }, [quantityToAdjust]);

  const newStock = useMemo(() => {
    return currentStock + parsedQuantity;
  }, [currentStock, parsedQuantity]);

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
    handleSubmitAdjustment();
  };

  const handleLookup = (code) => {
    const cleanCode = (code ?? "").trim();

    if (!cleanCode) {
      showAppAlert({
        type: "warning",
        title: "Código requerido",
        message: "Escanea o escribe el código de barras.",
        confirmText: "Entendido",
      });
      return;
    }

    const found = getProductByCodigo(cleanCode);

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
    setBarcode(found.codigo ?? "");
  };

  const handleSelectFromModal = (product) => {
    if (!product) return;

    setSelectedProduct(product);
    setBarcode(product.codigo ?? "");
    setSearchModalOpen(false);
  };

  const handleQuantityChange = (e) => {
    const raw = (e.target.value ?? "").toString();

    if (raw === "") {
      setQuantityToAdjust("");
      return;
    }

    const normalized = raw.replace(/[^\d-]/g, "");
    const hasNegativeSign = normalized.startsWith("-");
    const digitsOnly = normalized.replace(/-/g, "");

    if (!digitsOnly) {
      setQuantityToAdjust(hasNegativeSign ? "-" : "");
      return;
    }

    setQuantityToAdjust(`${hasNegativeSign ? "-" : ""}${digitsOnly}`);
  };

  const resetAfterSave = () => {
    setSubmitArmed(false);
    setSelectedProduct(null);
    setBarcode("");
    setQuantityToAdjust("");
    setAdjustmentReason("");
    setAdjustmentNotes("");

    window.requestAnimationFrame(() => {
      barcodeInputRef.current?.focus();

      if (typeof barcodeInputRef.current?.select === "function") {
        barcodeInputRef.current.select();
      }
    });
  };

  const handleSubmitAdjustment = async () => {
    if (!selectedProduct || saving) return;

    if (!branch?.id) {
      showAppAlert({
        type: "danger",
        title: "Sucursal no detectada",
        message: "No hay una sucursal activa para aplicar el ajuste.",
        confirmText: "Entendido",
      });
      return;
    }

    const reason = (adjustmentReason ?? "").toString().trim();

    if (!reason) {
      showAppAlert({
        type: "warning",
        title: "Motivo requerido",
        message: "Captura el motivo del ajuste.",
        confirmText: "Entendido",
      });
      return;
    }

    const qty = parsedQuantity;

    if (!Number.isFinite(qty) || qty === 0) {
      showAppAlert({
        type: "warning",
        title: "Diferencia inválida",
        message: "La diferencia debe ser distinta de 0.",
        confirmText: "Entendido",
      });
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
        .select("id, stock, has_been_stocked, is_active")
        .eq("branch_id", branch.id)
        .eq("product_id", productId)
        .maybeSingle();

      if (inventoryFetchError) throw inventoryFetchError;

      const currentDbStock = Number(inventoryRow?.stock || 0);
      const nextStock = currentDbStock + qty;

      if (nextStock < 0) {
        showAppAlert({
          type: "warning",
          title: "Stock insuficiente",
          message: `No puedes dejar el stock en negativo.\n\nStock actual: ${currentDbStock}\nAjuste: ${qty}\nResultado: ${nextStock}`,
          confirmText: "Entendido",
        });
        return;
      }

      const now = new Date().toISOString();
      const movementCreatedAt = getSystemLocalTimestamp(new Date());
      const costPrice = Number(selectedProduct.costo || 0);
      const productSalePrice = Number(selectedProduct.precio || 0);

      if (inventoryRow?.id) {
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
          movementType: "adjustment",
          quantity: qty,
          previousStock: currentDbStock,
          newStock: nextStock,
          reason: adjustmentNotes.trim()
            ? `${reason} - ${adjustmentNotes.trim()}`
            : reason,
          userId: user?.id || null,
          createdAt: movementCreatedAt,
        });
      } else {
        if (qty < 0) {
          showAppAlert({
            type: "warning",
            title: "Inventario no registrado",
            message:
              "Este producto aún no existe en el inventario de la sucursal. Primero agrégalo con una entrada positiva.",
            confirmText: "Entendido",
          });
          return;
        }

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
          movementType: "adjustment",
          quantity: qty,
          previousStock: 0,
          newStock: qty,
          reason: adjustmentNotes.trim()
            ? `${reason} - ${adjustmentNotes.trim()}`
            : reason,
          userId: user?.id || null,
          createdAt: movementCreatedAt,
        });
      }

      await refreshProducts();

      const desc = (selectedProduct.descripcion ?? "").toString().trim();
      const descUpper = desc ? desc.toUpperCase() : "PRODUCTO";
      const qtyLabel = qty > 0 ? `+${qty}` : `${qty}`;

      resetAfterSave();

      showAppAlert({
        type: "success",
        title: "Inventario ajustado",
        message: `${descUpper}\nAjuste aplicado: ${qtyLabel} PZ`,
        confirmText: "Aceptar",
      });
    } catch (error) {
      console.error("Error aplicando ajuste:", error);

      showAppAlert({
        type: "danger",
        title: "No se pudo aplicar el ajuste",
        message: error.message || "No se pudo aplicar el ajuste.",
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
          <h1 className={styles.title}>Ajustes de inventario</h1>
          <p className={styles.subtitle}>
            Busca un producto y registra una diferencia positiva o negativa para
            corregir el inventario de la sucursal actual.
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
                    handleLookup(barcode);
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
            <section className={styles.sectionCard}>
              <h2 className={styles.sectionTitle}>Datos del producto</h2>
              <p className={styles.sectionDescription}>
                Información del producto seleccionado para el ajuste.
              </p>

              <div className={styles.formRow}>
                <label className={styles.label}>Código de barras</label>

                <input
                  className={styles.input}
                  type="text"
                  value={barcode}
                  readOnly
                  tabIndex={-1}
                />
              </div>

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
                <label className={styles.label}>Precio de venta</label>

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
            </section>

            <section className={styles.sectionCard}>
              <h2 className={styles.sectionTitle}>Ajuste de inventario</h2>
              <p className={styles.sectionDescription}>
                Captura la diferencia y el motivo del ajuste.
              </p>

              <div className={styles.stockGrid}>
                <div className={styles.formRow}>
                  <label className={styles.label}>Stock actual</label>

                  <input
                    className={styles.input}
                    type="number"
                    value={currentStock}
                    readOnly
                    tabIndex={-1}
                  />
                </div>

                <div className={styles.formRow}>
                  <label className={styles.label}>Diferencia</label>

                  <input
                    ref={quantityInputRef}
                    className={styles.input}
                    type="text"
                    inputMode="numeric"
                    value={quantityToAdjust}
                    onChange={handleQuantityChange}
                    placeholder="0"
                  />
                </div>

                <div className={styles.formRow}>
                  <label className={styles.label}>Nuevo stock</label>

                  <input
                    className={styles.input}
                    type="number"
                    value={newStock}
                    readOnly
                    tabIndex={-1}
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <label className={styles.label}>Motivo del ajuste</label>

                <input
                  className={styles.input}
                  type="text"
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  placeholder="Ej. Merma / Inventario físico / Corrección"
                  maxLength={50}
                />
              </div>

              <div className={styles.formRow}>
                <label className={styles.label}>Notas</label>

                <textarea
                  className={styles.textarea}
                  value={adjustmentNotes}
                  onChange={(e) => setAdjustmentNotes(e.target.value)}
                  placeholder="Comentarios adicionales (opcional)"
                  rows={3}
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

                    handleSubmitAdjustment();
                  }}
                  onDoubleClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    if (saving) return;

                    handleSubmitAdjustment();
                  }}
                >
                  {saving
                    ? "Guardando..."
                    : submitArmed
                      ? "Confirmar ajuste"
                      : "Aplicar ajuste"}
                </button>
              </div>
            </section>
          </div>
        )}

        <InventorySearchModal
          isOpen={searchModalOpen}
          onClose={() => setSearchModalOpen(false)}
          products={products}
          onSelect={(p) => handleSelectFromModal(p)}
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

export default PageAdjustments;