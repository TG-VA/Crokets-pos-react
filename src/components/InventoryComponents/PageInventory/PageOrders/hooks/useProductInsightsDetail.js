import { useCallback, useEffect, useMemo, useState } from "react";

import { fetchProductBranchInsights } from "../services/productInsightsDetailService";
import { getPresetRange } from "../utils/ordersDateRange";
import {
  getInsightTotals,
  normalizeInsightRows,
} from "../utils/productInsightsCalculationService";

const DEFAULT_PRESET = "week";

const buildRangeKey = (productId, dateFrom, dateTo) =>
  `${productId}|${dateFrom?.getTime() ?? ""}|${dateTo?.getTime() ?? ""}`;

export const useProductInsightsDetail = ({ productId }) => {
  const [preset, setPreset] = useState(DEFAULT_PRESET);
  const [range, setRange] = useState(() => getPresetRange(DEFAULT_PRESET));
  const [result, setResult] = useState({ key: "", rows: [], error: "" });

  const { dateFrom, dateTo } = range;
  const isRangeValid = Boolean(dateFrom && dateTo && dateFrom <= dateTo);
  const requestKey = isRangeValid
    ? buildRangeKey(productId, dateFrom, dateTo)
    : "";

  useEffect(() => {
    if (!productId || !requestKey) return undefined;

    let cancelled = false;

    fetchProductBranchInsights({ productId, dateFrom, dateTo })
      .then((rows) => {
        if (!cancelled) setResult({ key: requestKey, rows, error: "" });
      })
      .catch((error) => {
        console.error("Error consultando detalle del producto:", error);

        if (!cancelled) {
          setResult({
            key: requestKey,
            rows: [],
            error: "No se pudo cargar el detalle del producto.",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [productId, requestKey, dateFrom, dateTo]);

  const selectPreset = useCallback((nextPreset) => {
    setPreset(nextPreset);
    setRange(getPresetRange(nextPreset));
  }, []);

  const changeDate = useCallback((field, date) => {
    setPreset("custom");
    setRange((previous) => {
      if (!date) return { ...previous, [field]: null };

      const adjusted = new Date(date);

      if (field === "dateFrom") adjusted.setHours(0, 0, 0, 0);
      else adjusted.setHours(23, 59, 59, 999);

      return { ...previous, [field]: adjusted };
    });
  }, []);

  const rows = useMemo(() => normalizeInsightRows(result.rows), [result.rows]);
  const totals = useMemo(() => getInsightTotals(rows), [rows]);

  const isLoading = isRangeValid && result.key !== requestKey;

  return {
    preset,
    dateFrom,
    dateTo,
    rows,
    totals,
    isLoading,
    isRangeValid,
    error: isRangeValid && result.key === requestKey ? result.error : "",
    selectPreset,
    changeDate,
  };
};
