import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import { useAuth } from "./AuthContext";
import { useBranch } from "./BranchContext";

const OrderDraftContext = createContext(null);

const EMPTY_DRAFT = {
  orderName: "",
  destinationBranchId: "",
  notes: "",
  items: [],
};

const resolve = (nextValue, previous) =>
  typeof nextValue === "function" ? nextValue(previous) : nextValue;

/**
 * Conserva el borrador de "Crear pedido" fuera de la vista de Pedidos.
 * La vista se desmonta al navegar a otro modulo, por lo que el borrador debe
 * vivir por encima de las rutas. Se descarta al cambiar de usuario o sucursal.
 */
export const OrderDraftProvider = ({ children }) => {
  const { user } = useAuth();
  const { branch } = useBranch();

  const identityKey = `${user?.id || ""}|${branch?.id || ""}`;

  const [state, setState] = useState({ identityKey, draft: EMPTY_DRAFT });

  // Reinicio durante el render al cambiar la identidad, sin efecto intermedio.
  const draft = state.identityKey === identityKey ? state.draft : EMPTY_DRAFT;

  if (state.identityKey !== identityKey) {
    setState({ identityKey, draft: EMPTY_DRAFT });
  }

  const patch = useCallback(
    (field, nextValue) => {
      setState((previous) => {
        const base =
          previous.identityKey === identityKey ? previous.draft : EMPTY_DRAFT;
        return {
          identityKey,
          draft: { ...base, [field]: resolve(nextValue, base[field]) },
        };
      });
    },
    [identityKey]
  );

  const setOrderName = useCallback((v) => patch("orderName", v), [patch]);
  const setDestinationBranchId = useCallback(
    (v) => patch("destinationBranchId", v),
    [patch]
  );
  const setNotes = useCallback((v) => patch("notes", v), [patch]);
  const setItems = useCallback((v) => patch("items", v), [patch]);
  const clearDraft = useCallback(
    () => setState({ identityKey, draft: EMPTY_DRAFT }),
    [identityKey]
  );

  const value = useMemo(
    () => ({
      ...draft,
      setOrderName,
      setDestinationBranchId,
      setNotes,
      setItems,
      clearDraft,
    }),
    [
      clearDraft,
      draft,
      setDestinationBranchId,
      setItems,
      setNotes,
      setOrderName,
    ]
  );

  return (
    <OrderDraftContext.Provider value={value}>
      {children}
    </OrderDraftContext.Provider>
  );
};

export const useOrderDraft = () => {
  const context = useContext(OrderDraftContext);

  if (!context) {
    throw new Error(
      "useOrderDraft debe usarse dentro de <OrderDraftProvider />"
    );
  }

  return context;
};
