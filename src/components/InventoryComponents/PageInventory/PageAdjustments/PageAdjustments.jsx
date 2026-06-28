import React, { useEffect, useMemo, useRef, useState } from "react";
import { useProducts } from "../../../../contexts/ProductsContext";
import { useBranch } from "../../../../contexts/BranchContext";
import { useAuth } from "../../../../contexts/AuthContext";
import { supabase } from "../../../../lib/supabaseClient";
import { logInventoryMovement } from "../../../../utils/inventoryMovements";
import InventorySearchModal from "../../Modals/InventorySearchModal/InventorySearchModal";
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
  const [successMessage, setSuccessMessage] = useState("");
  const [submitArmed, setSubmitArmed] = useState(false);
  const [saving, setSaving] = useState(false);

  const barcodeInputRef = useRef(null);
  const quantityInputRef = useRef(null);
  const bodyRef = useRef(null);

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
    if (!successMessage) return;
    const t = window.setTimeout(() => setSuccessMessage(""), 2500);
    return () => window.clearTimeout(t);
  }, [successMessage]);

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
    const raw = (quantityToAdjust ?? "").toString().replace(",", ".").trim();
    const n = raw ? Number.parseFloat(raw) : 0;
    return Number.isFinite(n) ? n : 0;
  }, [quantityToAdjust]);

  const newStock = useMemo(() => {
    return currentStock + parsedQuantity;
  }, [currentStock, parsedQuantity]);

  const difference = useMemo(() => {
    return newStock - currentStock;
  }, [newStock, currentStock]);

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
      if (typeof next.select === "function") next.select();
      return;
    }

    if (!submitArmed) {
      setSubmitArmed(true);
      if (active && typeof active.blur === "function") active.blur();
      return;
    }

    setSubmitArmed(false);
    handleSubmitAdjustment();
  };

  const handleLookup = (code) => {
    const found = getProductByCodigo((code ?? "").trim());
    if (!found) {
      alert("Producto no encontrado");
      return;
    }
    setSelectedProduct(found);
    setBarcode(found.codigo ?? "");
  };

  const handleSelectFromModal = (product) => {
    if (!product) return;
    setSelectedProduct(product);
    setBarcode(product.codigo ?? "");
  };

  const handleSubmitAdjustment = async () => {
    if (!selectedProduct || saving) return;

    if (!branch?.id) {
      alert("No hay sucursal activa.");
      return;
    }

    const reason = (adjustmentReason ?? "").toString().trim();
    if (!reason) {
      alert("Captura el motivo del ajuste.");
      return;
    }

    const qty = parsedQuantity;
    if (!Number.isFinite(qty) || qty === 0) {
      alert("La diferencia debe ser distinta de 0.");
      return;
    }

    const productId = selectedProduct.product_id || selectedProduct.id;
    if (!productId) {
      alert("No se detectó el producto.");
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
        alert(
          `No puedes dejar el stock en negativo.\n\nStock actual: ${currentDbStock}\nAjuste: ${qty}\nResultado: ${nextStock}`
        );
        return;
      }

      const now = new Date().toISOString();
      const costPrice = Number(selectedProduct.costo || 0);
      const salePrice = Number(selectedProduct.precio || 0);

      if (inventoryRow?.id) {
        const { error: updateError } = await supabase
          .from("branch_inventory")
          .update({
            stock: nextStock,
            is_active: true,
            has_been_stocked: true,
            cost_price: costPrice,
            sale_price: salePrice,
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
        });
      } else {
        if (qty < 0) {
          alert(
            "Este producto aún no existe en el inventario de la sucursal. Primero agrégalo con una entrada positiva."
          );
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
            sale_price: salePrice,
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
        });
      }

      await refreshProducts();

      const desc = (selectedProduct.descripcion ?? "").toString().trim();
      const descUpper = desc ? desc.toUpperCase() : "PRODUCTO";
      setSuccessMessage(`AJUSTE EXITOSO DE ${qty} ${descUpper}`);
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
    } catch (error) {
      console.error("Error aplicando ajuste:", error);
      alert(error.message || "No se pudo aplicar el ajuste.");
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
        </div>

        {!!successMessage && (
          <div
            className={styles.successOverlay}
            onClick={() => setSuccessMessage("")}
          >
            <div className={styles.successToast} role="status">
              {successMessage}
            </div>
          </div>
        )}

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
                type="number"
                inputMode="decimal"
                step="0.001"
                value={quantityToAdjust}
                onChange={(e) => setQuantityToAdjust(e.target.value)}
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

            <button
              className={styles.primaryButton}
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
        )}

        <InventorySearchModal
          isOpen={searchModalOpen}
          onClose={() => setSearchModalOpen(false)}
          products={products}
          onSelect={(p) => handleSelectFromModal(p)}
        />
      </div>
    </div>
  );
};

export default PageAdjustments;
