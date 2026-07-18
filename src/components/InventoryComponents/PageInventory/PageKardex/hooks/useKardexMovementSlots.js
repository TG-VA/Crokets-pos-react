import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  loadKardexMovements,
} from "../services/kardexService";

import {
  getKardexProductId,
} from "../utils/kardexMovementUtils";

const createEmptyMovementState =
  () => ({
    movements: [],
    loading: false,
    error: "",
  });

const createInitialMovementState =
  () => [
    createEmptyMovementState(),
    createEmptyMovementState(),
  ];

const useKardexMovementSlots = ({
  branchId = null,
  selectedProducts = [],
  appliedDateFrom = "",
  appliedDateTo = "",
} = {}) => {
  const [
    movementsState,
    setMovementsState,
  ] = useState(
    createInitialMovementState
  );

  const requestIdsRef =
    useRef([0, 0]);

  const selectedProductsRef =
    useRef(selectedProducts);

  const appliedRangeRef =
    useRef({
      dateFrom:
        appliedDateFrom,
      dateTo:
        appliedDateTo,
    });

  const branchIdRef =
    useRef(branchId);

  useEffect(() => {
    selectedProductsRef.current =
      selectedProducts;
  }, [selectedProducts]);

  useEffect(() => {
    appliedRangeRef.current = {
      dateFrom:
        appliedDateFrom,
      dateTo:
        appliedDateTo,
    };
  }, [
    appliedDateFrom,
    appliedDateTo,
  ]);

  useEffect(() => {
    branchIdRef.current =
      branchId;
  }, [branchId]);

  const updateMovementState =
    useCallback(
      (
        slot,
        updater
      ) => {
        setMovementsState(
          (currentState) => {
            const nextState = [
              ...currentState,
            ];

            const currentSlotState =
              nextState[slot] ??
              createEmptyMovementState();

            nextState[slot] =
              typeof updater ===
              "function"
                ? updater(
                    currentSlotState
                  )
                : updater;

            return nextState;
          }
        );
      },
      []
    );

  const clearMovementSlot =
    useCallback(
      (slot) => {
        requestIdsRef.current[
          slot
        ] += 1;

        updateMovementState(
          slot,
          createEmptyMovementState()
        );
      },
      [updateMovementState]
    );

  const loadSlotMovements =
    useCallback(
      async (
        slot,
        product,
        {
          dateFrom =
            appliedRangeRef
              .current.dateFrom,

          dateTo =
            appliedRangeRef
              .current.dateTo,

          silent = false,
        } = {}
      ) => {
        const productId =
          getKardexProductId(
            product
          );

        const currentBranchId =
          branchIdRef.current;

        if (
          !productId ||
          !currentBranchId
        ) {
          clearMovementSlot(
            slot
          );

          return [];
        }

        const requestId =
          requestIdsRef.current[
            slot
          ] + 1;

        requestIdsRef.current[
          slot
        ] = requestId;

        if (!silent) {
          updateMovementState(
            slot,
            {
              movements: [],
              loading: true,
              error: "",
            }
          );
        }

        try {
          const movements =
            await loadKardexMovements({
              productId,
              branchId:
                currentBranchId,
              dateFrom,
              dateTo,
            });

          if (
            requestIdsRef.current[
              slot
            ] !== requestId
          ) {
            return movements;
          }

          updateMovementState(
            slot,
            (currentState) => ({
              ...currentState,
              movements,
              loading: false,
              error: "",
            })
          );

          return movements;
        } catch (error) {
          console.error(
            "Error cargando movimientos del kardex:",
            error
          );

          if (
            requestIdsRef.current[
              slot
            ] !== requestId
          ) {
            return [];
          }

          updateMovementState(
            slot,
            (currentState) => ({
              ...currentState,

              movements:
                silent
                  ? currentState.movements
                  : [],

              loading: false,

              error:
                silent
                  ? currentState.error
                  : error?.message ||
                    "No se pudieron cargar los movimientos del kardex.",
            })
          );

          return [];
        }
      },
      [
        clearMovementSlot,
        updateMovementState,
      ]
    );

  const refreshSlotSilently =
    useCallback(
      (slot) => {
        const product =
          selectedProductsRef.current[
            slot
          ];

        if (!product) {
          return Promise.resolve(
            []
          );
        }

        return loadSlotMovements(
          slot,
          product,
          {
            dateFrom:
              appliedRangeRef
                .current.dateFrom,

            dateTo:
              appliedRangeRef
                .current.dateTo,

            silent: true,
          }
        );
      },
      [loadSlotMovements]
    );

  return {
    movementsState,

    loadSlotMovements,
    refreshSlotSilently,
    clearMovementSlot,
  };
};

export default useKardexMovementSlots;