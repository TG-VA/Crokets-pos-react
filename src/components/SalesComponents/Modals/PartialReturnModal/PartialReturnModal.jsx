import React, { useEffect, useMemo, useState } from "react";
import styles from "./PartialReturnModal.module.css";
import { supabase } from "../../../../lib/supabaseClient";
import { useAuth } from "../../../../contexts/AuthContext";
import { useBranch } from "../../../../contexts/BranchContext";

const formatCurrency = (value) => `$${Number(value || 0).toFixed(2)}`;

const POINTS_AMOUNT_SETTING_KEY = "customer_points_amount_per_point";
const DEFAULT_POINTS_AMOUNT = 50;

const isRewardLine = (item = {}) => {
  return Boolean(
    item.isRewardItem ||
      item.is_reward_item ||
      item.rewardItem ||
      item.reward_item ||
      item.isRewardDiscountItem ||
      item.is_reward_discount_item ||
      item.rewardDiscountItem ||
      item.reward_discount_item ||
      item.saleRewardRedemptionId ||
      item.sale_reward_redemption_id ||
      item.rewardId ||
      item.reward_id
  );
};

const isRewardDiscountLine = (item = {}) => {
  return Boolean(
    item.isRewardDiscountItem ||
      item.is_reward_discount_item ||
      item.rewardDiscountItem ||
      item.reward_discount_item
  );
};

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
      const isKit = !!(item.isKit || item.is_kit);
      const rewardItem = isRewardLine(item);
      const rewardDiscountItem = isRewardDiscountLine(item);

      return {
        saleDetailId: item.id,
        productId: item.productId || null,
        description: item.description,
        soldQty: Number(item.cant || 0),
        returnedQty,
        availableQty,
        unitPrice: Number(item.finalUnitPrice || item.unitPrice || 0),
        isKit,
        isRewardItem: rewardItem,
        isRewardDiscountItem: rewardDiscountItem,
        rewardReversedAt: item.rewardReversedAt || item.reward_reversed_at || null,
        rewardReversalReason:
          item.rewardReversalReason || item.reward_reversal_reason || "",
        components: item.components || [],
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
      const isBlockedByReward = Boolean(item.isRewardItem);

      const maxReturnAllowed = isBlockedByReward
        ? 0
        : Math.max(
            Math.min(Number(item.availableQty || 0), maxUnitsAllowedInOperation),
            0
          );

      return {
        ...item,
        maxReturnAllowed,
        isBlockedByReward,
        isFullyReturned: Number(item.availableQty || 0) === 0,
        isBlockedByRule:
          !isBlockedByReward &&
          Number(item.availableQty || 0) > 0 &&
          maxReturnAllowed === 0,
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
    const refundMethodName =
      paymentMethods.find((method) => method.id === refundMethodId)?.name || "";

    return {
      selectedProducts,
      totalUnitsToReturn,
      totalUnitsAfterReturn,
      totalRefund,
      refundMethodName,
    };
  }, [
    itemsWithLimits,
    quantities,
    totalUnitsStillInSale,
    paymentMethods,
    refundMethodId,
  ]);

  if (!isOpen) return null;

  const setQty = (saleDetailId, nextValue, max) => {
    const numericValue = Math.max(Math.min(Number(nextValue || 0), max), 0);

    setQuantities((prev) => ({
      ...prev,
      [saleDetailId]: numericValue > 0 ? String(numericValue) : "",
    }));
  };

  const handleQtyChange = (saleDetailId, rawValue, max) => {
    const value = rawValue.replace(/[^\d]/g, "");

    if (value === "") {
      setQuantities((prev) => ({
        ...prev,
        [saleDetailId]: "",
      }));
      return;
    }

    setQty(saleDetailId, Number(value), max);
  };

  const handleDecreaseQty = (saleDetailId, max) => {
    const current = Number(quantities[saleDetailId] || 0);
    setQty(saleDetailId, current - 1, max);
  };

  const handleIncreaseQty = (saleDetailId, max) => {
    const current = Number(quantities[saleDetailId] || 0);
    setQty(saleDetailId, current + 1, max);
  };

  const getCustomerPointsAmountPerPoint = async () => {
    try {
      const { data, error } = await supabase
        .from("system_settings")
        .select("setting_value, is_active")
        .eq("setting_key", POINTS_AMOUNT_SETTING_KEY)
        .is("branch_id", null)
        .maybeSingle();

      if (error) throw error;

      const configuredAmount = Number(data?.setting_value || 0);

      if (
        data?.is_active === false ||
        !configuredAmount ||
        configuredAmount <= 0
      ) {
        return DEFAULT_POINTS_AMOUNT;
      }

      return configuredAmount;
    } catch (error) {
      console.error("Error cargando regla de puntos:", error);
      return DEFAULT_POINTS_AMOUNT;
    }
  };

  const reverseCustomerPointsByPartialReturn = async ({ totalRefund }) => {
    if (!selectedTicket?.id) {
      return { registered: false, points: 0, reason: "NO_SALE" };
    }

    const amountPerPoint = await getCustomerPointsAmountPerPoint();

    if (!amountPerPoint || amountPerPoint <= 0) {
      return { registered: false, points: 0, reason: "INVALID_RULE" };
    }

    const { data: salePointRows, error: salePointsError } = await supabase
      .from("customer_points")
      .select("customer_id, points")
      .eq("related_sale_id", selectedTicket.id)
      .eq("source", "sale");

    if (salePointsError) throw salePointsError;

    const earnedPoints = (salePointRows || []).reduce((acc, row) => {
      const points = Number(row.points || 0);
      return points > 0 ? acc + points : acc;
    }, 0);

    const customerId = (salePointRows || []).find((row) => row.customer_id)
      ?.customer_id;

    if (!customerId || earnedPoints <= 0) {
      return { registered: false, points: 0, reason: "NO_EARNED_POINTS" };
    }

    const [partialPointsRes, balanceRes, returnsRes] = await Promise.all([
      supabase
        .from("customer_points")
        .select("points")
        .eq("customer_id", customerId)
        .eq("related_sale_id", selectedTicket.id)
        .eq("source", "partial_return"),

      supabase
        .from("customer_points")
        .select("points")
        .eq("customer_id", customerId),

      supabase
        .from("sale_returns")
        .select("total_refund")
        .eq("sale_id", selectedTicket.id),
    ]);

    if (partialPointsRes.error) throw partialPointsRes.error;
    if (balanceRes.error) throw balanceRes.error;
    if (returnsRes.error) throw returnsRes.error;

    const alreadyReversedByReturns = (partialPointsRes.data || []).reduce(
      (acc, row) => acc + Math.abs(Math.min(Number(row.points || 0), 0)),
      0
    );

    const currentBalance = (balanceRes.data || []).reduce(
      (acc, row) => acc + Number(row.points || 0),
      0
    );

    const dbReturnedTotal = (returnsRes.data || []).reduce(
      (acc, row) => acc + Number(row.total_refund || 0),
      0
    );

    const fallbackReturnedTotal =
      Number(selectedTicket.totalReturned || 0) + Number(totalRefund || 0);

    const totalReturnedForPoints = Math.max(
      dbReturnedTotal,
      fallbackReturnedTotal
    );

    /*
      Corrección importante:
      Antes se calculaba así:
      floor(totalReturnedForPoints / amountPerPoint)

      Eso fallaba cuando la devolución era menor a la regla de puntos,
      pero dejaba la venta neta por debajo del mínimo para conservar puntos.

      Ahora se calcula por neto actual:
      puntos originales ganados - puntos que debe conservar con el neto restante.
    */
    const originalSaleTotal = Number(selectedTicket.total || 0);
    const netTotalAfterReturns = Math.max(
      originalSaleTotal - totalReturnedForPoints,
      0
    );

    const pointsCustomerShouldKeep = Math.min(
      earnedPoints,
      Math.floor(netTotalAfterReturns / amountPerPoint)
    );

    const expectedReversedPoints = Math.max(
      earnedPoints - pointsCustomerShouldKeep,
      0
    );

    const pointsToReverse = expectedReversedPoints - alreadyReversedByReturns;

    if (pointsToReverse <= 0) {
      return {
        registered: false,
        points: 0,
        reason: "NO_POINTS_TO_REVERSE",
        earnedPoints,
        pointsCustomerShouldKeep,
        alreadyReversedByReturns,
        netTotalAfterReturns,
      };
    }

    const safePointsToReverse = Math.min(
      pointsToReverse,
      Math.max(Number(currentBalance || 0), 0)
    );

    if (safePointsToReverse <= 0) {
      return { registered: false, points: 0, reason: "NO_AVAILABLE_BALANCE" };
    }

    const limitedByBalance = safePointsToReverse < pointsToReverse;
    const notes = [
      `PUNTOS DESCONTADOS POR DEVOLUCIÓN PARCIAL. MONTO DEVUELTO: ${formatCurrency(
        totalRefund
      )} MXN.`,
      `TOTAL DEVUELTO ACUMULADO: ${formatCurrency(
        totalReturnedForPoints
      )} MXN.`,
      `NETO ACTUAL DE LA VENTA: ${formatCurrency(netTotalAfterReturns)} MXN.`,
      `PUNTOS ORIGINALES: ${earnedPoints}.`,
      `PUNTOS A CONSERVAR: ${pointsCustomerShouldKeep}.`,
      returnReason.trim() ? `MOTIVO: ${returnReason.trim()}.` : "",
      limitedByBalance
        ? "DESCUENTO LIMITADO POR SALDO DISPONIBLE DEL CLIENTE."
        : "",
    ]
      .filter(Boolean)
      .join(" ");

    const { error: insertError } = await supabase.from("customer_points").insert([
      {
        id: crypto.randomUUID(),
        customer_id: customerId,
        points: -safePointsToReverse,
        movement_type: "redeem",
        source: "partial_return",
        related_sale_id: selectedTicket.id,
        reward_id: null,
        user_id: user?.id || null,
        branch_id: branch?.id || null,
        notes,
        created_at: new Date().toISOString(),
      },
    ]);

    if (insertError) throw insertError;

    return {
      registered: true,
      points: safePointsToReverse,
      limitedByBalance,
      amountPerPoint,
      earnedPoints,
      pointsCustomerShouldKeep,
      netTotalAfterReturns,
    };
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
          isKit: item.isKit,
          isRewardItem: item.isRewardItem,
          description: item.description,
        }))
        .filter((item) => item.quantity > 0);

      if (selectedItems.some((item) => item.isRewardItem)) {
        alert(
          "No se puede devolver parcialmente un producto de recompensa. Para revertir un canje, cancela la venta completa."
        );
        return;
      }

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
        p_items: selectedItems.map((item) => ({
          sale_detail_id: item.sale_detail_id,
          quantity: item.quantity,
        })),
      });

      if (error) throw error;

      let pointsReverseResult = { registered: false, points: 0 };

      try {
        pointsReverseResult = await reverseCustomerPointsByPartialReturn({
          totalRefund: summary.totalRefund,
        });
      } catch (pointsError) {
        console.error(
          "Error descontando puntos por devolución parcial:",
          pointsError
        );
      }

      if (pointsReverseResult.registered) {
        alert(
          `Devolución parcial registrada correctamente.\n\nSe descontaron ${
            pointsReverseResult.points
          } punto${pointsReverseResult.points !== 1 ? "s" : ""} del cliente.`
        );
      } else {
        alert("Devolución parcial registrada correctamente.");
      }

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
          <div>
            <h2 className={styles.title}>↩ DEVOLUCIÓN PARCIAL</h2>
            <div className={styles.headerMeta}>
              Folio: <strong>{selectedTicket?.folio || "—"}</strong>
            </div>
          </div>

          <button className={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.saleInfo}>
            <div>
              <span>Cliente</span>
              <strong>{selectedTicket?.client || "PÚBLICO EN GENERAL"}</strong>
            </div>

            <div>
              <span>Total original</span>
              <strong>{formatCurrency(selectedTicket?.total || 0)}</strong>
            </div>

            <div>
              <span>Devuelto acumulado</span>
              <strong>{formatCurrency(selectedTicket?.totalReturned || 0)}</strong>
            </div>

            <div>
              <span>Neto actual</span>
              <strong>
                {formatCurrency(
                  selectedTicket?.netTotal ?? selectedTicket?.total ?? 0
                )}
              </strong>
            </div>
          </div>

          <div className={styles.ruleBox}>
            <strong>Regla de devolución:</strong> puedes devolver productos o
            kits completos, pero debe quedar al menos 1 unidad en el ticket. Si
            deseas devolver todo, corresponde cancelar la venta completa. Los
            productos de recompensa no se devuelven por parcial.
          </div>

          {itemsWithLimits.some((item) => item.isKit) && (
            <div className={styles.warningBox}>
              Esta venta contiene kits. Si devuelves un kit, se regresará el
              inventario de todos sus productos internos.
            </div>
          )}

          {itemsWithLimits.some((item) => item.isRewardItem) && (
            <div className={styles.warningBox}>
              Esta venta contiene productos de recompensa. Para revertir un
              canje, cancela la venta completa.
            </div>
          )}

          <div className={styles.section}>
            <div className={styles.sectionTitle}>
              PRODUCTOS DISPONIBLES PARA DEVOLUCIÓN
            </div>

            <div className={styles.productCards}>
              {itemsWithLimits.length === 0 ? (
                <div className={styles.emptyCell}>No hay productos disponibles</div>
              ) : (
                itemsWithLimits.map((item) => {
                  const qty = Number(quantities[item.saleDetailId] || 0);
                  const disabled =
                    processing ||
                    item.isFullyReturned ||
                    item.isBlockedByRule ||
                    item.isBlockedByReward;

                  return (
                    <div
                      key={item.saleDetailId}
                      className={`${styles.productCard} ${
                        disabled ? styles.productCardDisabled : ""
                      }`}
                    >
                      <div className={styles.productCardHeader}>
                        <div>
                          <div className={styles.productName}>
                            {item.description}
                            {item.isKit ? " (KIT)" : ""}
                          </div>

                          <div className={styles.productMeta}>
                            P.U. {formatCurrency(item.unitPrice)}
                          </div>
                        </div>

                        <div className={styles.productAmount}>
                          {formatCurrency(qty * item.unitPrice)}
                        </div>
                      </div>

                      <div className={styles.productStats}>
                        <div>
                          <span>Vendida</span>
                          <strong>{item.soldQty}</strong>
                        </div>
                        <div>
                          <span>Ya devuelta</span>
                          <strong>{item.returnedQty}</strong>
                        </div>
                        <div>
                          <span>Aún en venta</span>
                          <strong>{item.availableQty}</strong>
                        </div>
                        <div>
                          <span>Máximo ahora</span>
                          <strong>{item.maxReturnAllowed}</strong>
                        </div>
                      </div>

                      {item.components?.length > 0 && (
                        <div className={styles.kitComponents}>
                          <strong>Incluye:</strong>
                          {item.components.map((component) => (
                            <span key={component.productId || component.description}>
                              {component.description || component.name} x
                              {component.quantity}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className={styles.productCardFooter}>
                        <div className={styles.itemStatusRow}>
                          {item.isRewardItem ? (
                            <span className={styles.fullyReturnedBadge}>
                              NO SE PUEDE DEVOLVER POR PARCIAL
                            </span>
                          ) : item.isFullyReturned ? (
                            <span className={styles.fullyReturnedBadge}>
                              DEVOLUCIÓN COMPLETA
                            </span>
                          ) : item.isBlockedByRule ? (
                            <span className={styles.fullyReturnedBadge}>
                              DEVOLUCIÓN BLOQUEADA
                            </span>
                          ) : item.isKit ? (
                            <span className={styles.availableBadge}>
                              Kit completo: puedes devolver hasta{" "}
                              {item.maxReturnAllowed}
                            </span>
                          ) : (
                            <span className={styles.availableBadge}>
                              Puedes devolver hasta {item.maxReturnAllowed} pieza
                              {item.maxReturnAllowed !== 1 ? "s" : ""}
                            </span>
                          )}

                          {item.isRewardItem && (
                            <span className={styles.availableBadge}>
                              Cancela la venta completa para revertir el canje.
                            </span>
                          )}
                        </div>

                        <div className={styles.qtyStepper}>
                          <button
                            type="button"
                            className={styles.qtyButton}
                            onClick={() =>
                              handleDecreaseQty(
                                item.saleDetailId,
                                item.maxReturnAllowed
                              )
                            }
                            disabled={disabled || qty <= 0}
                          >
                            −
                          </button>

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

                          <button
                            type="button"
                            className={styles.qtyButton}
                            onClick={() =>
                              handleIncreaseQty(
                                item.saleDetailId,
                                item.maxReturnAllowed
                              )
                            }
                            disabled={disabled || qty >= item.maxReturnAllowed}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className={styles.formGrid}>
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

          {summary.totalUnitsAfterReturn < 1 && (
            <div className={styles.warningBox}>
              Debe quedar al menos 1 unidad en la venta. Si deseas devolver todo,
              corresponde cancelar la venta.
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <div className={styles.footerSummary}>
            <div>
              <span>Total a devolver</span>
              <strong>{formatCurrency(summary.totalRefund)}</strong>
            </div>

            <div>
              <span>Método</span>
              <strong>{summary.refundMethodName || "SIN SELECCIONAR"}</strong>
            </div>

            <div>
              <span>Unidades después</span>
              <strong>{summary.totalUnitsAfterReturn}</strong>
            </div>
          </div>

          <div className={styles.footerActions}>
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
    </div>
  );
};

export default PartialReturnModal;