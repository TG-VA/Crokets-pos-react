import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

const SALES_DRAFT_VERSION = 1;

const SALES_DRAFT_RESTORE_REQUEST_KEY =
  "sales_draft_restore_prompt_requested";

const getSalesDraftKeys = ({
  branchId,
  userId,
}) => {
  if (!branchId || !userId) {
    return {
      draftKey: null,
      sessionAcknowledgedKey: null,
      sessionAliveKey: null,
    };
  }

  const draftKey =
    `sales_draft_${branchId}_${userId}`;

  return {
    draftKey,

    sessionAcknowledgedKey:
      `${draftKey}_session_ack`,

    sessionAliveKey:
      `${draftKey}_session_alive`,
  };
};

const formatDraftSavedAt = (savedAt) => {
  if (!savedAt) return "";

  const savedDate = new Date(savedAt);

  if (Number.isNaN(savedDate.getTime())) {
    return "";
  }

  return savedDate
    .toLocaleString("es-MX")
    .replace(
      /:\d{2}(?=\s*[ap]\.?\s*m\.?)|(?<=\s[ap])\./gi,
      ""
    )
    .replace(/\s+/g, " ");
};

const hasRecoverableDraftData = (
  draft
) => {
  const restoredProducts =
    Array.isArray(draft?.productos)
      ? draft.productos
      : [];

  return Boolean(
    restoredProducts.length > 0 ||
      draft?.currentSaleClient ||
      draft?.currentSaleReward ||
      draft?.saleToken ||
      String(
        draft?.saleNotes || ""
      ).trim().length > 0 ||
      String(
        draft?.barcode || ""
      ).trim().length > 0
  );
};

const hasDraftDataToSave = ({
  productos,
  pendingTickets,
  currentSaleClient,
  currentSaleReward,
  saleToken,
  saleNotes,
  barcode,
}) => {
  return Boolean(
    productos.length > 0 ||
      pendingTickets.length > 0 ||
      currentSaleClient ||
      currentSaleReward ||
      saleToken ||
      saleNotes.trim().length > 0 ||
      barcode.trim().length > 0
  );
};

const useSalesDraft = ({
  branchId,
  userId,

  productos = [],
  pendingTickets = [],
  currentSaleClient = null,
  currentSaleReward = null,
  ticketNumber = 1,
  saleToken = null,
  saleNotes = "",
  barcode = "",

  subtotal = 0,
  discountTotal = 0,
  total = 0,

  onRestoreDraft,
  onDiscardDraft,
  onOpenRecoveryModal,
}) => {
  const [draftReady, setDraftReady] =
    useState(false);

  const [
    recoveredDraft,
    setRecoveredDraft,
  ] = useState(false);

  const [
    recoveredDraftSavedAt,
    setRecoveredDraftSavedAt,
  ] = useState(null);

  const draftKeyRef = useRef(null);

  /*
   * Guarda las funciones más recientes sin provocar que
   * el efecto de restauración se ejecute nuevamente cada
   * vez que Sales.jsx vuelve a renderizar.
   */
  const callbacksRef = useRef({
    onRestoreDraft,
    onDiscardDraft,
    onOpenRecoveryModal,
  });

  callbacksRef.current = {
    onRestoreDraft,
    onDiscardDraft,
    onOpenRecoveryModal,
  };

  const {
    draftKey,
    sessionAcknowledgedKey,
    sessionAliveKey,
  } = getSalesDraftKeys({
    branchId,
    userId,
  });

  const clearSalesDraft =
    useCallback(() => {
      if (draftKey) {
        localStorage.removeItem(
          draftKey
        );
      }

      if (sessionAcknowledgedKey) {
        sessionStorage.removeItem(
          sessionAcknowledgedKey
        );
      }

      if (sessionAliveKey) {
        sessionStorage.removeItem(
          sessionAliveKey
        );
      }

      sessionStorage.removeItem(
        SALES_DRAFT_RESTORE_REQUEST_KEY
      );
    }, [
      draftKey,
      sessionAcknowledgedKey,
      sessionAliveKey,
    ]);

  const dismissRecoveredDraft =
    useCallback(() => {
      if (sessionAcknowledgedKey) {
        sessionStorage.setItem(
          sessionAcknowledgedKey,
          "true"
        );
      }

      if (sessionAliveKey) {
        sessionStorage.setItem(
          sessionAliveKey,
          "true"
        );
      }

      sessionStorage.removeItem(
        SALES_DRAFT_RESTORE_REQUEST_KEY
      );

      setRecoveredDraft(false);
    }, [
      sessionAcknowledgedKey,
      sessionAliveKey,
    ]);

  const discardRecoveredDraft =
    useCallback(() => {
      clearSalesDraft();

      setRecoveredDraft(false);
      setRecoveredDraftSavedAt(null);

      const {
        onDiscardDraft:
          currentOnDiscardDraft,
      } = callbacksRef.current;

      if (
        typeof currentOnDiscardDraft ===
        "function"
      ) {
        currentOnDiscardDraft();
      }
    }, [clearSalesDraft]);

  /*
   * Restauración inicial del borrador.
   *
   * Solo se ejecuta una vez por combinación
   * de sucursal y usuario.
   */
  useEffect(() => {
    if (!draftKey) {
      draftKeyRef.current = null;

      setDraftReady(false);
      setRecoveredDraft(false);
      setRecoveredDraftSavedAt(null);

      return;
    }

    if (
      draftKeyRef.current === draftKey
    ) {
      return;
    }

    draftKeyRef.current = draftKey;

    setDraftReady(false);
    setRecoveredDraft(false);
    setRecoveredDraftSavedAt(null);

    try {
      const rawDraft =
        localStorage.getItem(draftKey);

      if (!rawDraft) {
        if (sessionAliveKey) {
          sessionStorage.setItem(
            sessionAliveKey,
            "true"
          );
        }

        setDraftReady(true);
        return;
      }

      const draft =
        JSON.parse(rawDraft);

      if (
        !draft ||
        draft.version !==
          SALES_DRAFT_VERSION
      ) {
        if (sessionAliveKey) {
          sessionStorage.setItem(
            sessionAliveKey,
            "true"
          );
        }

        setDraftReady(true);
        return;
      }

      const {
        onRestoreDraft:
          currentOnRestoreDraft,
      } = callbacksRef.current;

      if (
        typeof currentOnRestoreDraft ===
        "function"
      ) {
        currentOnRestoreDraft(draft);
      }

      const recoverable =
        hasRecoverableDraftData(draft);

      const restorePromptRequested =
        sessionStorage.getItem(
          SALES_DRAFT_RESTORE_REQUEST_KEY
        ) === "true";

      const sessionAlreadyAlive =
        Boolean(
          sessionAliveKey &&
            sessionStorage.getItem(
              sessionAliveKey
            ) === "true"
        );

      const alreadyAcknowledged =
        Boolean(
          sessionAcknowledgedKey &&
            sessionStorage.getItem(
              sessionAcknowledgedKey
            ) === "true"
        );

      const shouldShowRecoveryModal =
        recoverable &&
        (
          restorePromptRequested ||
          (
            !sessionAlreadyAlive &&
            !alreadyAcknowledged
          )
        );

      if (sessionAliveKey) {
        sessionStorage.setItem(
          sessionAliveKey,
          "true"
        );
      }

      if (shouldShowRecoveryModal) {
        setRecoveredDraft(true);

        setRecoveredDraftSavedAt(
          draft.savedAt || null
        );

        const formattedSavedAt =
          formatDraftSavedAt(
            draft.savedAt
          );

        const message =
          formattedSavedAt
            ? `Hay una venta pendiente guardada automáticamente el ${formattedSavedAt}.\n\n¿Quieres recuperarla o descartarla?`
            : "Hay una venta pendiente guardada automáticamente.\n\n¿Quieres recuperarla o descartarla?";

        const {
          onOpenRecoveryModal:
            currentOnOpenRecoveryModal,
        } = callbacksRef.current;

        if (
          typeof
            currentOnOpenRecoveryModal ===
          "function"
        ) {
          currentOnOpenRecoveryModal({
            message,
            onConfirm:
              dismissRecoveredDraft,
            onCancel:
              discardRecoveredDraft,
          });
        }
      } else {
        setRecoveredDraft(false);
        setRecoveredDraftSavedAt(null);
      }

      setDraftReady(true);
    } catch (error) {
      console.error(
        "Error restaurando venta en curso:",
        error
      );

      localStorage.removeItem(
        draftKey
      );

      if (sessionAliveKey) {
        sessionStorage.setItem(
          sessionAliveKey,
          "true"
        );
      }

      setRecoveredDraft(false);
      setRecoveredDraftSavedAt(null);
      setDraftReady(true);
    }
  }, [
    draftKey,
    sessionAcknowledgedKey,
    sessionAliveKey,
    dismissRecoveredDraft,
    discardRecoveredDraft,
  ]);

  /*
   * Guardado automático del borrador.
   */
  useEffect(() => {
    if (
      !draftReady ||
      !draftKey ||
      draftKeyRef.current !== draftKey
    ) {
      return;
    }

    const shouldSave =
      hasDraftDataToSave({
        productos,
        pendingTickets,
        currentSaleClient,
        currentSaleReward,
        saleToken,
        saleNotes,
        barcode,
      });

    if (!shouldSave) {
      localStorage.removeItem(
        draftKey
      );

      return;
    }

    const draft = {
      version:
        SALES_DRAFT_VERSION,

      savedAt:
        new Date().toISOString(),

      branchId:
        branchId || null,

      userId:
        userId || null,

      productos,
      currentSaleClient,
      currentSaleReward,
      ticketNumber,
      saleToken,
      saleNotes,
      barcode,
      pendingTickets,

      subtotal:
        Number(subtotal || 0),

      discountTotal:
        Number(discountTotal || 0),

      total:
        Number(total || 0),
    };

    try {
      localStorage.setItem(
        draftKey,
        JSON.stringify(draft)
      );
    } catch (error) {
      console.error(
        "Error guardando venta en curso:",
        error
      );
    }
  }, [
    draftReady,
    draftKey,
    branchId,
    userId,
    productos,
    pendingTickets,
    currentSaleClient,
    currentSaleReward,
    ticketNumber,
    saleToken,
    saleNotes,
    barcode,
    subtotal,
    discountTotal,
    total,
  ]);

  return {
    draftReady,
    recoveredDraft,
    recoveredDraftSavedAt,

    clearSalesDraft,
    dismissRecoveredDraft,
    discardRecoveredDraft,
  };
};

export default useSalesDraft;