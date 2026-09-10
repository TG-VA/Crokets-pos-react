import { useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabaseClient";

const REALTIME_SUPPRESS_MS = 1500;
const REALTIME_DEBOUNCE_MS = 500;

/**
 * Sincroniza el catálogo de productos con los cambios en tiempo real de
 * Supabase (products, branch_inventory y product_discounts).
 *
 * Las mutaciones locales marcadas con markLocalMutation suprimen la recarga
 * inmediata del canal, evitando recargas dobles causadas por el propio CRUD.
 */
export const useProductsRealtime = (branchId, onInvalidate) => {
  const productsChannelRef = useRef(null);
  const reloadTimeoutRef = useRef(null);
  const suppressReloadUntilRef = useRef(0);
  const onInvalidateRef = useRef(onInvalidate);

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

  const scheduleProductsReload = useCallback(() => {
    if (Date.now() < suppressReloadUntilRef.current) return;

    if (reloadTimeoutRef.current) {
      clearTimeout(reloadTimeoutRef.current);
    }

    reloadTimeoutRef.current = setTimeout(() => {
      onInvalidateRef.current?.();
    }, REALTIME_DEBOUNCE_MS);
  }, []);

  useEffect(() => {
    if (!branchId) return;

    if (productsChannelRef.current) {
      supabase.removeChannel(productsChannelRef.current);
      productsChannelRef.current = null;
    }

    const channel = supabase
      .channel(`products-realtime-${branchId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "products",
        },
        scheduleProductsReload
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "branch_inventory",
          filter: `branch_id=eq.${branchId}`,
        },
        scheduleProductsReload
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "product_discounts",
        },
        scheduleProductsReload
      )
      .subscribe();

    productsChannelRef.current = channel;

    return () => {
      if (reloadTimeoutRef.current) {
        clearTimeout(reloadTimeoutRef.current);
        reloadTimeoutRef.current = null;
      }

      if (productsChannelRef.current) {
        supabase.removeChannel(productsChannelRef.current);
        productsChannelRef.current = null;
      }
    };
  }, [branchId, scheduleProductsReload]);

  return { markLocalMutation };
};
