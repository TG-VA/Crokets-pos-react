/**
 * movementsRealtimeService.js
 * Suscripcion Realtime del Reporte de movimientos.
 *
 * El cliente de Supabase queda confinado a este servicio: el hook solo decide
 * cuando recargar y si hace falta el sondeo de respaldo.
 */

import { supabase } from "../../../../../lib/supabaseClient";

import {
  INVENTORY_MOVEMENTS_TABLE,
  REWARD_REDEMPTIONS_TABLE,
} from "./movementServiceConstants";

export const FAILED_REALTIME_STATUSES = new Set(["CHANNEL_ERROR", "TIMED_OUT"]);

/**
 * @param {object} params
 * @param {string} params.branchId Sucursal del reporte.
 * @param {Function} params.onChange Callback ante un cambio de movimientos o canjes.
 * @param {Function} [params.onStatusChange] Recibe cada estado del canal.
 * @returns {() => void} Cierra el canal.
 */
export const subscribeToMovements = ({
  branchId,
  onChange,
  onStatusChange,
}) => {
  const filter = `branch_id=eq.${branchId}`;

  const channel = supabase
    .channel(`movements-report-realtime-${branchId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: INVENTORY_MOVEMENTS_TABLE,
        filter,
      },
      () => onChange()
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: REWARD_REDEMPTIONS_TABLE,
        filter,
      },
      () => onChange()
    );

  channel.subscribe((status) => {
    if (FAILED_REALTIME_STATUSES.has(status)) {
      console.error("Error en realtime del reporte de movimientos:", status);
    }

    onStatusChange?.(status);
  });

  return () => {
    supabase.removeChannel(channel);
  };
};
