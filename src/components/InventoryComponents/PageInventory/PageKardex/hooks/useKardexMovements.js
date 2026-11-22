import { useEffect, useMemo } from "react";

import {
  buildKardexRows,
  productTracksInventory,
} from "../utils/kardexMovementUtils";

import useKardexMovementSlots from "./useKardexMovementSlots";
import useKardexBranchNames from "./useKardexBranchNames";
import useKardexRealtime from "./useKardexRealtime";
import useKardexUserNames from "./useKardexUserNames";

const KARDEX_SLOTS = [0, 1];

const useKardexMovements = ({
  branchId = null,
  selectedProducts = [],
  selectedProductIds = [],
  appliedDateFrom = "",
  appliedDateTo = "",
  filterVersion = 0,
} = {}) => {
  const {
    movementsState,
    loadSlotMovements,
    refreshSlotSilently,
    clearMovementSlot,
  } = useKardexMovementSlots({
    branchId,
    selectedProducts,
    appliedDateFrom,
    appliedDateTo,
  });

  useEffect(() => {
    KARDEX_SLOTS.forEach((slot) => {
      const product = selectedProducts[slot];

      if (!product) {
        clearMovementSlot(slot);

        return;
      }

      loadSlotMovements(slot, product, {
        dateFrom: appliedDateFrom,

        dateTo: appliedDateTo,

        silent: false,
      });
    });
  }, [
    selectedProducts,
    appliedDateFrom,
    appliedDateTo,
    branchId,
    filterVersion,
    clearMovementSlot,
    loadSlotMovements,
  ]);

  useKardexRealtime({
    branchId,
    selectedProductIds,
    refreshSlotSilently,

    enabled: selectedProductIds.some(Boolean),
  });

  const userIds = useMemo(
    () =>
      KARDEX_SLOTS.flatMap((slot) =>
        (movementsState[slot]?.movements ?? []).map(
          (movement) => movement?.user_id
        )
      ),
    [movementsState]
  );

  const userNamesById = useKardexUserNames(userIds);

  const branchNamesById = useKardexBranchNames({
    enabled: selectedProductIds.some(Boolean),
  });

  const rowsBySlot = useMemo(() => {
    return KARDEX_SLOTS.map((slot) => {
      const product = selectedProducts[slot];

      const movements = movementsState[slot]?.movements ?? [];

      return buildKardexRows(movements, {
        tracksInventory: productTracksInventory(product),
      }).map((row) => ({
        ...row,
        userName: userNamesById.get(String(row?.user_id ?? "")) ?? "",
        relatedBranchName:
          branchNamesById.get(String(row?.related_branch_id ?? "")) ?? "",
      }));
    });
  }, [selectedProducts, movementsState, userNamesById, branchNamesById]);

  return {
    movementsState,
    rowsBySlot,

    loadSlotMovements,
    refreshSlotSilently,
    clearMovementSlot,
  };
};

export default useKardexMovements;
