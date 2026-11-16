import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { loadCashOperationSettings } from "../services/cashOperationSettingsService";
import { fetchBranchType } from "../services/branchScopeService";

const BranchContext = createContext(null);
const BRANCH_STORAGE_KEY = "currentBranch";

const persistBranch = (nextBranch) => {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    if (nextBranch) {
      window.localStorage.setItem(
        BRANCH_STORAGE_KEY,
        JSON.stringify(nextBranch)
      );
    } else {
      window.localStorage.removeItem(BRANCH_STORAGE_KEY);
    }
  } catch (err) {
    console.error("Error guardando sucursal en localStorage:", err);
  }
};

const readCachedBranch = () => {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    const cached = window.localStorage.getItem(BRANCH_STORAGE_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
};

export function BranchProvider({ children }) {
  const [branch, setBranchState] = useState(readCachedBranch);
  const branchRef = useRef(branch);
  const branchId = branch?.id ?? null;

  // Hidrata en segundo plano la configuracion operativa de caja de la sucursal
  // activa para que las vistas de cobro usen los valores remotos sin depender
  // de entrar a /settings/caja. Es no bloqueante: si Supabase falla, la cache
  // local sigue operando y el renderizado no se interrumpe.
  useEffect(() => {
    if (!branchId) return;

    loadCashOperationSettings({ branchId }).catch((err) => {
      console.error(
        "Error hidratando la configuración de caja de la sucursal:",
        err
      );
    });
  }, [branchId]);

  const setBranch = useCallback((nextBranch) => {
    branchRef.current = nextBranch;
    setBranchState(nextBranch);
    persistBranch(nextBranch);
  }, []);

  // La sucursal en cache puede no traer branch_type (sesiones previas o un dispositivo recien
  // vinculado) o tener un tipo viejo. Se refresca en segundo plano; si falla, se conserva.
  useEffect(() => {
    if (!branchId) return undefined;

    let cancelled = false;
    fetchBranchType(branchId).then(({ data: branchType, error }) => {
      if (cancelled) return;
      if (error) {
        console.error("Error refrescando el tipo de la sucursal:", error);
        return;
      }
      const current = branchRef.current;
      if (!branchType || current?.id !== branchId) return;
      if (current.branch_type === branchType) return;
      setBranch({ ...current, branch_type: branchType });
    });

    return () => {
      cancelled = true;
    };
  }, [branchId, setBranch]);

  const value = useMemo(() => ({ branch, setBranch }), [branch, setBranch]);

  return (
    <BranchContext.Provider value={value}>{children}</BranchContext.Provider>
  );
}

export function useBranch() {
  const ctx = useContext(BranchContext);
  if (!ctx)
    throw new Error("useBranch debe usarse dentro de <BranchProvider />");
  return ctx;
}
