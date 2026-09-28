import { useMemo, useState } from "react";

import {
  DEFAULT_POINTS_AMOUNT,
  fetchOrCreatePointsAmountRule,
  savePointsAmountRule,
} from "../services/rewardsSettingsService";
import {
  calculateExamplePoints,
  canSavePointsRule,
  hasPointsRuleChanges,
  sanitizePointsAmountInput,
} from "../services/rewardsSettingsCalculationService";

/**
 * Estado de la regla de acumulacion de puntos: valor vigente, valor original
 * guardado y la logica de calculo del ejemplo.
 *
 * Recibe `showAppAlert` desde el hook padre para compartir una sola instancia
 * del modal de aplicacion.
 */
export const useRewardsPointsRule = ({ showAppAlert }) => {
  const [pointsAmountPerPoint, setPointsAmountPerPoint] = useState("");
  const [originalPointsAmountPerPoint, setOriginalPointsAmountPerPoint] =
    useState("");
  const [loadingPointsRule, setLoadingPointsRule] = useState(false);
  const [savingPointsRule, setSavingPointsRule] = useState(false);

  const numericPointsAmountPerPoint = Number(pointsAmountPerPoint || 0);

  const examplePoints = useMemo(() => {
    return calculateExamplePoints(numericPointsAmountPerPoint);
  }, [numericPointsAmountPerPoint]);

  const hasRuleChanges = useMemo(() => {
    return hasPointsRuleChanges({
      pointsAmountPerPoint,
      originalPointsAmountPerPoint,
    });
  }, [pointsAmountPerPoint, originalPointsAmountPerPoint]);

  const canSavePointsRuleValue = canSavePointsRule({
    numericPointsAmountPerPoint,
    hasChanges: hasRuleChanges,
    savingPointsRule,
    loadingPointsRule,
  });

  const loadPointsRule = async () => {
    try {
      setLoadingPointsRule(true);

      const settingValue = await fetchOrCreatePointsAmountRule();

      setPointsAmountPerPoint(settingValue);
      setOriginalPointsAmountPerPoint(settingValue);
    } catch (err) {
      console.error("Error cargando regla de puntos:", err);

      const defaultValue = String(DEFAULT_POINTS_AMOUNT);
      setPointsAmountPerPoint(defaultValue);
      setOriginalPointsAmountPerPoint(defaultValue);

      showAppAlert({
        type: "danger",
        title: "No se pudo cargar la regla",
        message:
          "No se pudo cargar la regla de acumulación de puntos. Se usará el valor predeterminado temporalmente.",
        confirmText: "Entendido",
      });
    } finally {
      setLoadingPointsRule(false);
    }
  };

  const handlePointsAmountChange = (value) => {
    setPointsAmountPerPoint(sanitizePointsAmountInput(value));
  };

  const handleSavePointsRule = async () => {
    try {
      setSavingPointsRule(true);

      const amount = Number(pointsAmountPerPoint || 0);

      if (!amount || amount <= 0) {
        showAppAlert({
          type: "warning",
          title: "Monto inválido",
          message: "El monto para generar 1 punto debe ser mayor a 0.",
          confirmText: "Entendido",
        });
        return;
      }

      await savePointsAmountRule(String(amount));

      setPointsAmountPerPoint(String(amount));
      setOriginalPointsAmountPerPoint(String(amount));

      showAppAlert({
        type: "success",
        title: "Regla guardada",
        message: "La regla de acumulación de puntos se guardó correctamente.",
        confirmText: "Aceptar",
      });
    } catch (err) {
      console.error("Error guardando regla de puntos:", err);

      showAppAlert({
        type: "danger",
        title: "No se pudo guardar",
        message: "No se pudo guardar la regla de acumulación.",
        confirmText: "Entendido",
      });
    } finally {
      setSavingPointsRule(false);
    }
  };

  return {
    canSavePointsRule: canSavePointsRuleValue,
    examplePoints,
    handlePointsAmountChange,
    handleSavePointsRule,
    hasPointsRuleChanges: hasRuleChanges,
    loadPointsRule,
    loadingPointsRule,
    pointsAmountPerPoint,
    savingPointsRule,
  };
};
