import { useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabaseClient";

const REALTIME_SUPPRESS_MS = 1500;
const REALTIME_DEBOUNCE_MS = 500;

/**
 * Registro global de canales realtime de productos por sucursal.
 *
 * Los canales de Supabase no permiten añadir callbacks "postgres_changes"
 * después de llamar a `subscribe()` sobre un mismo cliente. Como este hook es
 * consumido por dos instancias a la vez (ProductsContext y useProductsList)
 * para el mismo branchId, se crea UN canal por sucursal y se comparte.
 *
 * Cada instancia aporta:
 *  - un callback de invalidación (onInvalidate)
 *  - una marca de supresión local (markLocalMutation), para no recargar en
 *    cadena tras las mutaciones propias del CRUD (debounce + 1500 ms).
 *
 * El canal se elimina (supabase.removeChannel) solo cuando la última instancia
 * que lo usaba se desmonta (refcount por entry.channelHooks).
 *
 * @type {Map<string, { channel: object|null, invalidateCbs: Set<Function>, channelHooks: Set<Function> }>}
 */
const realtimeRegistry = new Map();

const dispatchInvalidations = (entry) => {
  entry.invalidateCbs.forEach((cb) => cb());
};

const getOrCreateChannel = (branchId, onInvalidate) => {
  let entry = realtimeRegistry.get(branchId);

  if (!entry) {
    entry = {
      channel: null,
      invalidateCbs: new Set(),
      channelHooks: new Set(),
    };

    entry.channel = supabase
      .channel(`products-realtime-${branchId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        () => dispatchInvalidations(entry)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "branch_inventory",
          filter: `branch_id=eq.${branchId}`,
        },
        () => dispatchInvalidations(entry)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "product_discounts",
        },
        () => dispatchInvalidations(entry)
      )
      .subscribe();

    realtimeRegistry.set(branchId, entry);
  }

  entry.invalidateCbs.add(onInvalidate);

  return entry;
};

/**
 * Sincroniza el catálogo de productos con cambios en tiempo real de Supabase
 * (products, branch_inventory y product_discounts), agrupando eventos con
 * debounce y evitando recargas dobles tras mutaciones locales.
 */
export const useProductsRealtime = (branchId, onInvalidate) => {
  const onInvalidateRef = useRef(onInvalidate);
  const suppressReloadUntilRef = useRef(0);
  const reloadTimeoutRef = useRef(null);

  useEffect(() => {
    onInvalidateRef.current = onInvalidate;
  }, [onInvalidate]);

  const markLocalMutation = useCallback(() => {
    if (reloadTimeoutRef.current) {
      clearTimeout(reloadTimeoutRef.current);
      reloadTimeoutRef.current = null;
    }

    suppressReloadUntilRef.current = Date.now() + REALTIME_SUPPRESS_MS;
  }, []);

  useEffect(() => {
    if (!branchId) return undefined;

    const entry = getOrCreateChannel(branchId, onInvalidateRef.current);

    const handleInvalidate = () => {
      if (Date.now() < suppressReloadUntilRef.current) return;

      if (reloadTimeoutRef.current) {
        clearTimeout(reloadTimeoutRef.current);
      }

      reloadTimeoutRef.current = setTimeout(() => {
        onInvalidateRef.current?.();
      }, REALTIME_DEBOUNCE_MS);
    };

    entry.channelHooks.add(handleInvalidate);

    return () => {
      entry.channelHooks.delete(handleInvalidate);
      entry.invalidateCbs.delete(onInvalidateRef.current);

      if (reloadTimeoutRef.current) {
        clearTimeout(reloadTimeoutRef.current);
        reloadTimeoutRef.current = null;
      }

      if (entry.channelHooks.size === 0) {
        if (entry.channel) {
          supabase.removeChannel(entry.channel);
          entry.channel = null;
        }
        realtimeRegistry.delete(branchId);
      }
    };
  }, [branchId, markLocalMutation]);

  return { markLocalMutation };
};