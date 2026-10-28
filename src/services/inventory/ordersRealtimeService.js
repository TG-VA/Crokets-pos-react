/**
 * ordersRealtimeService.js
 * Suscripcion realtime a los pedidos de abastecimiento.
 *
 * El cliente de Supabase queda confinado a este servicio: hooks y contextos
 * solo indican que recargar cuando algo cambia. Las politicas RLS de
 * `store_orders` determinan que eventos llegan al cliente.
 */

import { supabase } from "../../lib/supabaseClient";

/**
 * @param {object} params
 * @param {string} params.channelName Nombre unico del canal.
 * @param {Function} params.onChange Callback invocado en cada cambio de `store_orders`.
 * @returns {() => void} Cierra el canal.
 */
export const subscribeToStoreOrderChanges = ({ channelName, onChange }) => {
  const channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "store_orders" },
      () => {
        onChange();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};
