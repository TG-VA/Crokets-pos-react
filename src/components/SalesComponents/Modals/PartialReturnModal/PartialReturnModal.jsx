import React, { useEffect, useMemo, useState } from "react";
import styles from "./PartialReturnModal.module.css";
import { supabase } from "../../../../lib/supabaseClient";
import { useAuth } from "../../../../contexts/AuthContext";
import { useBranch } from "../../../../contexts/BranchContext";

const formatCurrency = (value) => `$${Number(value || 0).toFixed(2)}`;

const PartialReturnModal = ({
  isOpen,
  onClose,
  selectedTicket,
  paymentMethods = [],
  onReturnCreated,
}) => {
  const { user } = useAuth();
  const { branch } = useBranch();

  const [items, setItems] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [returnReason, setReturnReason] = useState("");
  const [refundMethodId, setRefundMethodId] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!isOpen || !selectedTicket) {
      setItems([]);
      setQuantities({});
      setReturnReason("");
      setRefundMethodId("");
      setProcessing(false);
      return;
    }

    const mappedItems = (selectedTicket.items || []).map((item) => {
      const returnedQty = (selectedTicket.returns || []).reduce((acc, ret) => {
        const matched = (ret.items || []).filter(
          (ri) => ri.saleDetailId === item.id
        );
        return (
          acc +
          matched.reduce((sum, ri) => sum + Number(ri.quantity || 0), 0)
        );
      }, 0);

      const availableQty = Math.max(Number(item.cant || 0) - returnedQty, 0);

      return {
        saleDetailId: item.id,
        productId: item.productId || null,
        description: item.description,
        soldQty: Number(item.cant || 0),
        returnedQty,
        availableQty,
        unitPrice: Number(item.finalUnitPrice || item.unitPrice || 0),
      };
    });

    setItems(mappedItems);
    setQuantities(
      mappedItems.reduce((acc, item) => {
        acc[item.saleDetailId] = "";
        return acc;
      }, {})
    );
    setReturnReason("");
    setRefundMethodId("");
    setProcessing(false);
  }, [isOpen, selectedTicket]);

  const totalUnitsStillInSale = useMemo(() => {
    return items.reduce((acc, item) => acc + Number(item.availableQty || 0), 0);
  }, [items]);

  const maxUnitsAllowedInOperation = useMemo(() => {
    return Math.max(totalUnitsStillInSale - 1, 0);
  }, [totalUnitsStillInSale]);

  const itemsWithLimits = useMemo(() => {
    return items.map((item) => {
      const maxReturnAllowed = Math.max(
        Math.min(Number(item.availableQty || 0), maxUnitsAllowedInOperation),
        0
      );

      return {
        ...item,
        maxReturnAllowed,
        isFullyReturned: Number(item.availableQty || 0) === 0,
        isBlockedByRule:
          Number(item.availableQty || 0) > 0 && maxReturnAllowed === 0,
      };
    });
  }, [items, maxUnitsAllowedInOperation]);

  const summary = useMemo(() => {
    let selectedProducts = 0;
    let totalUnitsToReturn = 0;
    let totalRefund = 0;

    for (const item of itemsWithLimits) {
      const qty = Number(quantities[item.saleDetailId] || 0);
      if (qty > 0) {
        selectedProducts += 1;
        totalUnitsToReturn += qty;
        totalRefund += qty * Number(item.unitPrice || 0);
      }
    }

    const totalUnitsAfterReturn = totalUnitsStillInSale - totalUnitsToReturn;

    return {
      selectedProducts,
      totalUnitsToReturn,
      totalUnitsAfterReturn,
      totalRefund,
    };
  }, [itemsWithLimits, quantities, totalUnitsStillInSale]);

  if (!isOpen) return null;

  const handleQtyChange = (saleDetailId, rawValue, max) => {
    let value = rawValue.replace(/[^\d]/g, "");

    if (value === "") {
      setQuantities((prev) => ({
        ...prev,
        [saleDetailId]: "",
      }));
      return;
    }

    let numericValue = Number(value);

    if (numericValue < 0) numericValue = 0;
    if (numericValue > max) numericValue = max;

    setQuantities((prev) => ({
      ...prev,
      [saleDetailId]: String(numericValue),
    }));
  };

  const handleSave = async () => {
    try {
      if (!selectedTicket?.id) {
        alert("No se detectó la venta.");
        return;
      }

      if (!user?.id) {
        alert("No se detectó el usuario.");
        return;
      }

      if (!branch?.id) {
        alert("No se detectó la sucursal.");
        return;
      }

      if (!returnReason.trim()) {
        alert("Debes ingresar el motivo de devolución.");
        return;
      }

      if (!refundMethodId) {
        alert("Debes seleccionar el método de devolución.");
        return;
      }

      const selectedItems = itemsWithLimits
        .map((item) => ({
          sale_detail_id: item.saleDetailId,
          quantity: Number(quantities[item.saleDetailId] || 0),
        }))
        .filter((item) => item.quantity > 0);

      if (selectedItems.length === 0) {
        alert("Selecciona al menos un producto para devolución.");
        return;
      }

      if (summary.totalUnitsAfterReturn < 1) {
        alert(
          "Debe quedar al menos 1 unidad en la venta. Si deseas devolver todo, corresponde cancelar la venta."
        );
        return;
      }

      const confirmed = window.confirm(
        `¿Confirmas la devolución parcial por ${formatCurrency(
          summary.totalRefund
        )}?`
      );

      if (!confirmed) return;

      setProcessing(true);

      const { error } = await supabase.rpc("create_partial_return_transaction", {
        p_sale_id: selectedTicket.id,
        p_user_id: user.id,
        p_branch_id: branch.id,
        p_return_reason: returnReason.trim(),
        p_refund_method_id: refundMethodId,
        p_items: selectedItems,
      });

      if (error) throw error;

      alert("Devolución parcial registrada correctamente.");

      if (typeof onReturnCreated === "function") {
        await onReturnCreated();
      }

      onClose();
    } catch (error) {
      console.error("Error registrando devolución parcial:", error);
      alert(error.message || "No se pudo registrar la devolución parcial.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>DEVOLUCIÓN PARCIAL</h2>
          <button className={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.saleInfo}>
            <div>
              <strong>Folio:</strong> {selectedTicket?.folio || "—"}
            </div>
            <div>
              <strong>Cliente:</strong>{" "}
              {selectedTicket?.client || "PÚBLICO EN GENERAL"}
            </div>
            <div>
              <strong>Total original:</strong>{" "}
              {formatCurrency(selectedTicket?.total || 0)}
            </div>
            <div>
              <strong>Devuelto acumulado:</strong>{" "}
              {formatCurrency(selectedTicket?.totalReturned || 0)}
            </div>
            <div>
              <strong>Neto actual:</strong>{" "}
              {formatCurrency(
                selectedTicket?.netTotal || selectedTicket?.total || 0
              )}
            </div>
          </div>

          <div className={styles.summaryBox}>
            <div className={styles.summaryRow}>
              <span>Unidades actualmente en la venta:</span>
              <strong>{totalUnitsStillInSale}</strong>
            </div>
            <div className={styles.summaryRow}>
              <span>Máximo total que puedes devolver ahora:</span>
              <strong>{maxUnitsAllowedInOperation}</strong>
            </div>
            <div className={styles.summaryRow}>
              <span>Debe quedar al menos:</span>
              <strong>1 unidad en el ticket</strong>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>
              PRODUCTOS DISPONIBLES PARA DEVOLUCIÓN
            </div>

            <div className={styles.itemsTableWrapper}>
              <table className={styles.itemsTable}>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th className={styles.centerCell}>Vendida</th>
                    <th className={styles.centerCell}>Ya devuelta</th>
                    <th className={styles.centerCell}>Aún en la venta</th>
                    <th className={styles.centerCell}>Máximo ahora</th>
                    <th className={styles.rightCell}>P.U.</th>
                    <th className={styles.centerCell}>A devolver</th>
                  </tr>
                </thead>
                <tbody>
                  {itemsWithLimits.length === 0 ? (
                    <tr>
                      <td colSpan="7" className={styles.emptyCell}>
                        No hay productos disponibles
                      </td>
                    </tr>
                  ) : (
                    itemsWithLimits.map((item) => {
                      const disabled =
                        processing || item.isFullyReturned || item.isBlockedByRule;

                      return (
                        <tr
                          key={item.saleDetailId}
                          className={
                            item.isFullyReturned || item.isBlockedByRule
                              ? styles.disabledRow
                              : ""
                          }
                        >
                          <td>
                            <div
                              className={
                                item.isFullyReturned || item.isBlockedByRule
                                  ? styles.disabledText
                                  : undefined
                              }
                            >
                              {item.description}
                            </div>

                            <div className={styles.itemStatusRow}>
                              {item.isFullyReturned ? (
                                <span className={styles.fullyReturnedBadge}>
                                  DEVOLUCIÓN COMPLETA
                                </span>
                              ) : item.isBlockedByRule ? (
                                <span className={styles.fullyReturnedBadge}>
                                  YA NO SE PUEDE DEVOLVER
                                </span>
                              ) : (
                                <span className={styles.availableBadge}>
                                  Puedes devolver hasta {item.maxReturnAllowed} pieza
                                  {item.maxReturnAllowed !== 1 ? "s" : ""}
                                </span>
                              )}
                            </div>
                          </td>

                          <td className={styles.centerCell}>{item.soldQty}</td>
                          <td className={styles.centerCell}>{item.returnedQty}</td>
                          <td className={styles.centerCell}>{item.availableQty}</td>
                          <td className={styles.centerCell}>
                            {item.maxReturnAllowed}
                          </td>

                          <td className={styles.rightCell}>
                            {formatCurrency(item.unitPrice)}
                          </td>

                          <td className={styles.centerCell}>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={quantities[item.saleDetailId]}
                              onChange={(e) =>
                                handleQtyChange(
                                  item.saleDetailId,
                                  e.target.value,
                                  item.maxReturnAllowed
                                )
                              }
                              className={styles.qtyInput}
                              disabled={disabled}
                              placeholder={disabled ? "—" : "0"}
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Motivo de devolución</label>
              <input
                type="text"
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                className={styles.input}
                placeholder="Describe el motivo"
                disabled={processing}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Método de devolución</label>
              <select
                value={refundMethodId}
                onChange={(e) => setRefundMethodId(e.target.value)}
                className={styles.select}
                disabled={processing}
              >
                <option value="">Selecciona un método</option>
                {paymentMethods.map((method) => (
                  <option key={method.id} value={method.id}>
                    {method.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.summaryBox}>
            <div className={styles.summaryRow}>
              <span>Productos seleccionados:</span>
              <strong>{summary.selectedProducts}</strong>
            </div>
            <div className={styles.summaryRow}>
              <span>Unidades a devolver:</span>
              <strong>{summary.totalUnitsToReturn}</strong>
            </div>
            <div className={styles.summaryRow}>
              <span>Unidades restantes después:</span>
              <strong>{summary.totalUnitsAfterReturn}</strong>
            </div>
            <div className={`${styles.summaryRow} ${styles.summaryTotal}`}>
              <span>Total a devolver:</span>
              <strong>{formatCurrency(summary.totalRefund)}</strong>
            </div>
          </div>

          {summary.totalUnitsAfterReturn < 1 && (
            <div className={styles.warningBox}>
              Debe quedar al menos 1 unidad en la venta. Si deseas devolver todo,
              corresponde cancelar la venta.
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <button
            className={`${styles.actionButton} ${styles.secondaryButton}`}
            onClick={onClose}
            disabled={processing}
          >
            Cerrar
          </button>

          <button
            className={`${styles.actionButton} ${styles.primaryButton}`}
            onClick={handleSave}
            disabled={processing}
          >
            {processing ? "Procesando..." : "Guardar devolución"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PartialReturnModal;