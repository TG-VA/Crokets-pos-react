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
 * @param {string[]} [params.filters] Filtros de fila de Realtime (por ejemplo
 *   `to_branch_id=eq.<id>`). Cada filtro abre una suscripcion; sin filtros se
 *   observa toda la tabla.
 * @returns {() => void} Cierra el canal.
 */
export const subscribeToStoreOrderChanges = ({
  channelName,
  onChange,
  filters = [],
}) => {
  const bindings = filters.length > 0 ? filters : [undefined];
  let channel = supabase.channel(channelName);

  bindings.forEach((filter) => {
    channel = channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "store_orders",
        ...(filter ? { filter } : {}),
      },
      () => {
        onChange();
      }
    );
  });

  channel.subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};
