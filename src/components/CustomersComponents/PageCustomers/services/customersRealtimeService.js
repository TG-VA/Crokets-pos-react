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
 * Suscribe un callback a los cambios de una tabla y devuelve la funcion de
 * limpieza del canal.
 *
 * @param {object} params
 * @param {string} params.channelName Nombre unico del canal.
 * @param {string} params.table Tabla a observar en `public`.
 * @param {string} [params.filter] Filtro opcional de Postgres (ej. `customer_id=eq.1`).
 * @param {Function} params.onChange Callback invocado en cada evento.
 * @returns {() => void} Limpia el canal; seguro de llamar aunque no haya canal.
 */
export const subscribeToTableChanges = ({
  channelName,
  table,
  filter,
  onChange,
}) => {
  const changeFilter = {
    event: "*",
    schema: "public",
    table,
  };

  if (filter) {
    changeFilter.filter = filter;
  }

  const channel = supabase
    .channel(channelName)
    .on("postgres_changes", changeFilter, () => {
      onChange();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};
