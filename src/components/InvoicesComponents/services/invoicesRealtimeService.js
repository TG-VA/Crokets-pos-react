/**
 * invoicesRealtimeService.js
 * Suscripciones realtime de las tablas del modulo de Facturacion.
 *
 * El cliente de Supabase queda confinado a este servicio para que ningun
 * componente ni hook de presentacion lo importe directamente (DIP, AGENTS.md).
 * Las pantallas solo describen que tabla observar, con que filtro y que
 * recargar.
 *
 * Contrato (leccion de la auditoria de #54): el binding debe viajar con
 * `table` resuelto dentro de `postgres_changes`. Varias tablas pueden
 * compartir un mismo canal: cada una se registra como un binding
 * `postgres_changes` independiente y el canal se suscribe una sola vez, que es
 * lo que espera el servidor Realtime.
 */

import { supabase } from "../../../lib/supabaseClient";

/**
 * Suscribe un callback a los cambios de una o mas tablas y devuelve la funcion
 * de limpieza del canal.
 *
 * @param {object} params
 * @param {string} params.channelName Nombre unico del canal.
 * @param {string[]|string} params.tables Tabla(s) a observar en `public`.
 * @param {string} [params.rowFilter] Filtro opcional de Postgres (ej. `branch_id=eq.1`).
 * @param {Function} params.onChange Callback invocado con el payload de cada
 *   evento. La pantalla decide si el evento le interesa: la tabla `customers`,
 *   por ejemplo, tambien recibe altas de ventas que no cambian esta vista.
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

    channel = channel.on("postgres_changes", changeFilter, (payload) => {
      onChange(payload);
    });
  }

  channel.subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

/**
 * Suscribe a `sales` e `invoices` de una sucursal con dos bindings sobre un
 * unico canal, replicando el comportamiento que tenian ambas pantallas antes
 * del refactor.
 */
export const subscribeToBranchInvoiceChanges = ({
  branchId,
  channelName,
  onChange,
}) => {
  if (!branchId) {
    return () => {};
  }

  return subscribeToTableChanges({
    channelName,
    tables: ["sales", "invoices"],
    rowFilter: `branch_id=eq.${branchId}`,
    onChange,
  });
};
