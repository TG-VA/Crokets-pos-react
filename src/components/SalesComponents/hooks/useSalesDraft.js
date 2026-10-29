import { useCallback, useEffect, useRef, useState } from "react";

import { afterCommit } from "../../../utils/asyncUtils";

const SALES_DRAFT_VERSION = 1;
const SALES_DRAFT_RESTORE_REQUEST_KEY = "sales_draft_restore_prompt_requested";

const getSalesDraftKeys = ({ branchId, userId }) => {
  if (!branchId || !userId) {
    return {
      draftKey: null,
      sessionAcknowledgedKey: null,
      sessionAliveKey: null,
    };
  }
  const draftKey = `sales_draft_${branchId}_${userId}`;
  return {
    draftKey,
    sessionAcknowledgedKey: `${draftKey}_session_ack`,
    sessionAliveKey: `${draftKey}_session_alive`,
  };
};

const formatDraftSavedAt = (savedAt) => {
  if (!savedAt) return "";
  const savedDate = new Date(savedAt);
  if (Number.isNaN(savedDate.getTime())) return "";

  return savedDate
    .toLocaleString("es-MX")
    .replace(/:\d{2}(?=\s*[ap]\.?\s*m\.?)|(?<=\s[ap])\./gi, "")
    .replace(/\s+/g, " ");
};

const hasRecoverableDraftData = (draft) => {
  const restoredProducts = Array.isArray(draft?.productos)
    ? draft.productos
    : [];
  return Boolean(
    restoredProducts.length > 0 ||
    draft?.currentSaleClient ||
    draft?.currentSaleReward ||
    draft?.saleToken ||
    String(draft?.saleNotes || "").trim().length > 0 ||
    String(draft?.barcode || "").trim().length > 0
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

/** Plan vacio: no hay borrador que restaurar todavia. */
const EMPTY_RESTORE_PLAN = {
  ready: false,
  stale: false,
  draft: null,
  showModal: false,
  message: null,
  savedAt: null,
  error: null,
};

/**
 * Lee el borrador persistido y decide que hay que hacer con el. Solo consulta
 * el almacenamiento: no escribe estado ni modifica localStorage/sessionStorage,
 * de modo que puede invocarse durante el render.
 *
 * La aplicacion del plan (avisar al padre, marcar la sesion como viva, abrir el
 * modal de recuperacion) queda en un efecto aparte, evitando un setState
 * sincrono dentro de un efecto.
 */
const readDraftRestorePlan = ({
  draftKey,
  sessionAcknowledgedKey,
  sessionAliveKey,
  cashSessionOpen,
}) => {
  if (!draftKey) {
    return EMPTY_RESTORE_PLAN;
  }

  try {
    const rawDraft = localStorage.getItem(draftKey);

    if (!rawDraft) {
      return { ...EMPTY_RESTORE_PLAN, ready: true };
    }

    const draft = JSON.parse(rawDraft);

    if (!draft || draft.version !== SALES_DRAFT_VERSION) {
      return { ...EMPTY_RESTORE_PLAN, ready: true };
    }

    // Un borrador guardado con otro estado de caja (abierta/cerrada) ya no
    // pertenece a la sesion actual: se descarta en vez de reponer el carrito.
    // Los borradores antiguos sin marca se conservan por compatibilidad.
    if (
      typeof draft.cashSessionOpen === "boolean" &&
      draft.cashSessionOpen !== Boolean(cashSessionOpen)
    ) {
      return { ...EMPTY_RESTORE_PLAN, ready: true, stale: true };
    }

    const recoverable = hasRecoverableDraftData(draft);
    const restorePromptRequested =
      sessionStorage.getItem(SALES_DRAFT_RESTORE_REQUEST_KEY) === "true";
    const sessionAlreadyAlive = Boolean(
      sessionAliveKey && sessionStorage.getItem(sessionAliveKey) === "true"
    );
    const alreadyAcknowledged = Boolean(
      sessionAcknowledgedKey &&
      sessionStorage.getItem(sessionAcknowledgedKey) === "true"
    );

    const showModal =
      recoverable &&
      (restorePromptRequested ||
        (!sessionAlreadyAlive && !alreadyAcknowledged));

    if (!showModal) {
      return { ...EMPTY_RESTORE_PLAN, ready: true, draft };
    }

    const formattedSavedAt = formatDraftSavedAt(draft.savedAt);
    const message = formattedSavedAt
      ? `Hay una venta pendiente guardada automáticamente el ${formattedSavedAt}.\n\n¿Quieres recuperarla o descartarla?`
      : "Hay una venta pendiente guardada automáticamente.\n\n¿Quieres recuperarla o descartarla?";

    return {
      ready: true,
      draft,
      showModal: true,
      message,
      savedAt: draft.savedAt || null,
      error: null,
    };
  } catch (error) {
    return { ...EMPTY_RESTORE_PLAN, ready: true, error };
  }
};

const useSalesDraft = ({
  branchId,
  userId,
  cashSessionOpen = false,
  productos = [],
  pendingTickets = [],
  currentSaleClient = null,
  clientAssignedAt = null,
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
  const [draftReady, setDraftReady] = useState(false);
  const [recoveredDraft, setRecoveredDraft] = useState(false);
  const [recoveredDraftSavedAt, setRecoveredDraftSavedAt] = useState(null);

  // Guarda las funciones más recientes sin provocar re-ejecuciones de efectos
  const callbacksRef = useRef({
    onRestoreDraft,
    onDiscardDraft,
    onOpenRecoveryModal,
  });

  useEffect(() => {
    callbacksRef.current = {
      onRestoreDraft,
      onDiscardDraft,
      onOpenRecoveryModal,
    };
  });

  const { draftKey, sessionAcknowledgedKey, sessionAliveKey } =
    getSalesDraftKeys({ branchId, userId });

  const clearSalesDraft = useCallback(() => {
    if (draftKey) localStorage.removeItem(draftKey);
    if (sessionAcknowledgedKey)
      sessionStorage.removeItem(sessionAcknowledgedKey);
    if (sessionAliveKey) sessionStorage.removeItem(sessionAliveKey);
    sessionStorage.removeItem(SALES_DRAFT_RESTORE_REQUEST_KEY);
  }, [draftKey, sessionAcknowledgedKey, sessionAliveKey]);

  const dismissRecoveredDraft = useCallback(() => {
    if (sessionAcknowledgedKey)
      sessionStorage.setItem(sessionAcknowledgedKey, "true");
    if (sessionAliveKey) sessionStorage.setItem(sessionAliveKey, "true");
    sessionStorage.removeItem(SALES_DRAFT_RESTORE_REQUEST_KEY);
    setRecoveredDraft(false);
  }, [sessionAcknowledgedKey, sessionAliveKey]);

  const discardRecoveredDraft = useCallback(() => {
    clearSalesDraft();
    setRecoveredDraft(false);
    setRecoveredDraftSavedAt(null);
    if (typeof callbacksRef.current.onDiscardDraft === "function") {
      callbacksRef.current.onDiscardDraft();
    }
  }, [clearSalesDraft]);

  // --- Restauración inicial del borrador ---
  // El plan de restauración es estado derivado: se calcula durante el render en
  // el momento en que cambia la clave del borrador. Se compara contra una clave
  // inicializada en `null` para que la primera pasada tambien lo evalue (el
  // borrador existe antes de montar la vista y `useDidChange` no lo detectaba).
  const [restorePlan, setRestorePlan] = useState(EMPTY_RESTORE_PLAN);
  const [restoreAppliedKey, setRestoreAppliedKey] = useState(null);
  const [restoreEvaluatedKey, setRestoreEvaluatedKey] = useState(null);

  // La clave incluye el estado de caja para volver a evaluar el borrador si la
  // sesion cambia sin salir de la vista de Ventas.
  const restoreKey = draftKey
    ? `${draftKey}_${cashSessionOpen ? "open" : "closed"}`
    : null;

  if (restoreEvaluatedKey !== restoreKey) {
    setRestoreEvaluatedKey(restoreKey);

    const plan = readDraftRestorePlan({
      draftKey,
      sessionAcknowledgedKey,
      sessionAliveKey,
      cashSessionOpen,
    });

    setRestorePlan(plan);
    setDraftReady(plan.ready);
    setRecoveredDraft(plan.showModal);
    setRecoveredDraftSavedAt(plan.showModal ? plan.savedAt : null);
  }

  // --- Aplicación del plan de restauración ---
  useEffect(() => {
    if (!draftKey || !restorePlan.ready) {
      return undefined;
    }

    let cancelled = false;

    afterCommit(() => {
      if (cancelled) return;

      if (restorePlan.stale) {
        localStorage.removeItem(draftKey);
      }

      if (restorePlan.error) {
        console.error("Error restaurando venta en curso:", restorePlan.error);
        localStorage.removeItem(draftKey);
      }

      if (
        restorePlan.draft &&
        typeof callbacksRef.current.onRestoreDraft === "function"
      ) {
        callbacksRef.current.onRestoreDraft(restorePlan.draft);
      }

      if (sessionAliveKey) sessionStorage.setItem(sessionAliveKey, "true");

      if (
        restorePlan.showModal &&
        typeof callbacksRef.current.onOpenRecoveryModal === "function"
      ) {
        callbacksRef.current.onOpenRecoveryModal({
          message: restorePlan.message,
          onConfirm: dismissRecoveredDraft,
          onCancel: discardRecoveredDraft,
        });
      }

      // El guardado automatico permanece bloqueado hasta este punto.
      setRestoreAppliedKey(restoreKey);
    });

    return () => {
      cancelled = true;
    };
  }, [
    draftKey,
    restoreKey,
    restorePlan,
    sessionAliveKey,
    dismissRecoveredDraft,
    discardRecoveredDraft,
  ]);

  // --- Guardado automático del borrador ---
  useEffect(() => {
    // El guardado espera a que el plan de restauracion se haya aplicado: si
    // corriera en la misma pasada, escribiria con los datos previos a la
    // restauracion y borraria el borrador recien recuperado.
    if (!draftReady || !draftKey || restoreAppliedKey !== restoreKey) return;

    const shouldSave = hasDraftDataToSave({
      productos,
      pendingTickets,
      currentSaleClient,
      currentSaleReward,
      saleToken,
      saleNotes,
      barcode,
    });

    if (!shouldSave) {
      localStorage.removeItem(draftKey);
      return;
    }

    const draft = {
      version: SALES_DRAFT_VERSION,
      savedAt: new Date().toISOString(),
      branchId: branchId || null,
      userId: userId || null,
      cashSessionOpen: Boolean(cashSessionOpen),
      productos,
      currentSaleClient,
      clientAssignedAt,
      currentSaleReward,
      ticketNumber,
      saleToken,
      saleNotes,
      barcode,
      pendingTickets,
      subtotal: Number(subtotal || 0),
      discountTotal: Number(discountTotal || 0),
      total: Number(total || 0),
    };

    try {
      localStorage.setItem(draftKey, JSON.stringify(draft));
    } catch (error) {
      console.error("Error guardando venta en curso:", error);
    }
  }, [
    draftReady,
    restoreAppliedKey,
    restoreKey,
    draftKey,
    branchId,
    userId,
    cashSessionOpen,
    productos,
    pendingTickets,
    currentSaleClient,
    clientAssignedAt,
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
