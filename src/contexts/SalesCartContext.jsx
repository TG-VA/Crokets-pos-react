import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useAuth } from "./AuthContext";
import { useBranch } from "./BranchContext";
import { useDidChange } from "../hooks/useDidChange";
import { useModalStack } from "./ModalStackContext";
import { getClientExpiryRemainingMs } from "../components/SalesComponents/services/salesClientExpiryService";

const SalesCartContext = createContext(null);

const getClientAssignmentStorageKey = ({ branchId, userId }) => {
  if (!branchId || !userId) return null;
  return `sales_client_assignment_${branchId}_${userId}`;
};

const readStoredAssignment = (storageKey) => {
  if (!storageKey) return null;

  try {
    const raw = sessionStorage.getItem(storageKey);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed?.clientId || !parsed?.assignedAt) return null;

    return parsed;
  } catch (error) {
    console.error("Error leyendo la asignacion de cliente:", error);
    return null;
  }
};

/**
 * Conserva el carrito y el cliente asignado fuera de la vista de Ventas.
 * La vista se desmonta al navegar a otro modulo, por lo que este estado debe
 * vivir por encima de las rutas para no perder la venta en curso.
 */
export const SalesCartProvider = ({ children }) => {
  const { user, cashRegistered } = useAuth();
  const { branch } = useBranch();
  const { hasOpenModals } = useModalStack();

  const [productos, setProductosState] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [stockWarningMsg, setStockWarningMsg] = useState("");
  const productosRef = useRef([]);

  const [currentSaleClient, setCurrentSaleClientState] = useState(null);
  const [currentSaleReward, setCurrentSaleReward] = useState(null);
  const [pendingFreeProductRewards, setPendingFreeProductRewards] = useState(
    []
  );
  const [pendingProductDiscountRewards, setPendingProductDiscountRewards] =
    useState([]);
  const [activeProductDiscountReward, setActiveProductDiscountReward] =
    useState(null);

  const clientAssignmentRef = useRef(null);
  const [clientAssignedAt, setClientAssignedAt] = useState(null);

  const assignmentStorageKey = useMemo(
    () =>
      getClientAssignmentStorageKey({
        branchId: branch?.id,
        userId: user?.id,
      }),
    [branch?.id, user?.id]
  );

  const setProductos = useCallback((nextValue) => {
    setProductosState((previous) => {
      const resolved =
        typeof nextValue === "function" ? nextValue(previous) : nextValue;
      productosRef.current = Array.isArray(resolved) ? resolved : [];
      return Array.isArray(resolved) ? resolved : [];
    });
  }, []);

  const persistClientAssignment = useCallback(
    (client, assignedAt) => {
      if (!assignmentStorageKey) return;

      try {
        if (!client?.id || !assignedAt) {
          sessionStorage.removeItem(assignmentStorageKey);
          return;
        }

        sessionStorage.setItem(
          assignmentStorageKey,
          JSON.stringify({ clientId: client.id, assignedAt })
        );
      } catch (error) {
        console.error("Error guardando la asignacion de cliente:", error);
      }
    },
    [assignmentStorageKey]
  );

  const setCurrentSaleClient = useCallback(
    (nextValue) => {
      const previousClient = clientAssignmentRef.current;
      const resolved =
        typeof nextValue === "function" ? nextValue(previousClient) : nextValue;

      clientAssignmentRef.current = resolved || null;
      setCurrentSaleClientState(resolved || null);

      if (!resolved?.id) {
        setClientAssignedAt(null);
        persistClientAssignment(null, null);
        return;
      }

      if (
        previousClient?.id &&
        previousClient.id === resolved.id &&
        clientAssignedAt
      ) {
        return;
      }

      const storedAssignment = readStoredAssignment(assignmentStorageKey);
      const assignedAt =
        storedAssignment?.clientId === resolved.id
          ? Number(storedAssignment.assignedAt)
          : Date.now();

      setClientAssignedAt(assignedAt);
      persistClientAssignment(resolved, assignedAt);
    },
    [assignmentStorageKey, clientAssignedAt, persistClientAssignment]
  );

  const resetSalesState = useCallback(() => {
    setProductosState([]);
    productosRef.current = [];
    setSelectedProduct(null);
    setStockWarningMsg("");
    setCurrentSaleClientState(null);
    clientAssignmentRef.current = null;
    setClientAssignedAt(null);
    setCurrentSaleReward(null);
    setPendingFreeProductRewards([]);
    setPendingProductDiscountRewards([]);
    setActiveProductDiscountReward(null);

    if (assignmentStorageKey) {
      try {
        sessionStorage.removeItem(assignmentStorageKey);
      } catch (error) {
        console.error("Error limpiando la asignacion de cliente:", error);
      }
    }
  }, [assignmentStorageKey]);

  // El carrito de una venta no debe sobrevivir a un cambio de usuario,
  // sucursal o sesion de caja.
  const identityKey = `${user?.id || ""}|${branch?.id || ""}|${cashRegistered ? "open" : "closed"}`;
  const previousIdentityKeyRef = useRef(identityKey);

  useEffect(() => {
    if (previousIdentityKeyRef.current === identityKey) return;
    previousIdentityKeyRef.current = identityKey;
    resetSalesState();
  }, [identityKey, resetSalesState]);

  // La asignacion del cliente expira a los 5 minutos si la venta no se cobra.
  // El plazo se pausa mientras haya un modal abierto (por ejemplo el cobro) para
  // no quitar el cliente en pleno pago; al cerrarse se evalua de nuevo.
  const expireClientAssignment = useCallback(() => {
    setCurrentSaleClient(null);
    setCurrentSaleReward(null);
    setPendingFreeProductRewards([]);
    setPendingProductDiscountRewards([]);
    setActiveProductDiscountReward(null);
  }, [setCurrentSaleClient]);

  useEffect(() => {
    if (!currentSaleClient?.id || !clientAssignedAt || hasOpenModals) {
      return undefined;
    }

    const remaining = getClientExpiryRemainingMs(clientAssignedAt);
    const timeoutId = setTimeout(expireClientAssignment, remaining);

    return () => clearTimeout(timeoutId);
  }, [
    clientAssignedAt,
    currentSaleClient?.id,
    expireClientAssignment,
    hasOpenModals,
  ]);

  const cartIsEmpty = productos.length === 0;
  if (useDidChange(cartIsEmpty) && cartIsEmpty) {
    setStockWarningMsg("");
  }

  const value = useMemo(
    () => ({
      productos,
      setProductos,
      selectedProduct,
      setSelectedProduct,
      stockWarningMsg,
      setStockWarningMsg,
      productosRef,
      currentSaleClient,
      setCurrentSaleClient,
      currentSaleReward,
      setCurrentSaleReward,
      pendingFreeProductRewards,
      setPendingFreeProductRewards,
      pendingProductDiscountRewards,
      setPendingProductDiscountRewards,
      activeProductDiscountReward,
      setActiveProductDiscountReward,
    }),
    [
      productos,
      setProductos,
      selectedProduct,
      stockWarningMsg,
      productosRef,
      currentSaleClient,
      setCurrentSaleClient,
      currentSaleReward,
      pendingFreeProductRewards,
      pendingProductDiscountRewards,
      activeProductDiscountReward,
    ]
  );

  return (
    <SalesCartContext.Provider value={value}>
      {children}
    </SalesCartContext.Provider>
  );
};

export const useSalesCartContext = () => {
  const context = useContext(SalesCartContext);

  if (!context) {
    throw new Error(
      "useSalesCartContext debe usarse dentro de <SalesCartProvider />"
    );
  }

  return context;
};
