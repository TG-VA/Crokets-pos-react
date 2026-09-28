/**
 * customersRealtimeService.js
 * Suscripciones realtime de las tablas del modulo de Clientes.
 *
 * El cliente de Supabase queda confinado a este servicio para que ningun
 * componente ni hook de presentacion lo importe directamente (DIP, AGENTS.md).
 * Las pantallas solo describen que tabla observar y que recargar.
 */

import { supabase } from "../../../../lib/supabaseClient";

/**
 * Suscribe un callback a los cambios de una o mas tablas y devuelve la funcion
 * de limpieza del canal.
 *
 * Varias tablas pueden compartir un mismo canal: cada una se registra como un
 * binding `postgres_changes` independiente sobre el canal, que es lo que espera
 * el servidor para resolver `table` y el filtro de fila.
 *
 * @param {object} params
 * @param {string} params.channelName Nombre unico del canal.
 * @param {string[]|string} params.tables Tabla(s) a observar en `public`.
 * @param {string} [params.rowFilter] Filtro opcional de Postgres (ej. `customer_id=eq.1`).
 * @param {Function} params.onChange Callback invocado en cada evento.
 * @returns {() => void} Limpia el canal; seguro de llamar aunque no haya canal.
 */
export const subscribeToTableChanges = ({
  channelName,
  tables,
  rowFilter,
  onChange,
}) => {
  const observedTables = (Array.isArray(tables) ? tables : [tables]).filter(
    Boolean
  );

  if (observedTables.length === 0) {
    return () => {};
  }

  let channel = supabase.channel(channelName);

  for (const table of observedTables) {
    const changeFilter = {
      event: "*",
      schema: "public",
      table,
    };

    if (rowFilter) {
      changeFilter.filter = rowFilter;
    }

    channel = channel.on("postgres_changes", changeFilter, () => {
      onChange();
    });
  }

  channel.subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};
