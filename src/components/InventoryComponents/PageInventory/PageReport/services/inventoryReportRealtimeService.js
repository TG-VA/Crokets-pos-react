/**
 * inventoryReportRealtimeService.js
 * Suscripciones Realtime del Reporte de inventario.
 *
 * El cliente de Supabase queda confinado a este servicio: el hook solo decide
 * cuando recargar. Cada cambio pasa por `isRelevantChange` antes de avisar,
 * para que un cambio ajeno al reporte (precio, costo, comision) no dispare
 * una recarga completa.
 */

import { supabase } from "../../../../../lib/supabaseClient";

const FAILED_STATUSES = new Set(["CHANNEL_ERROR", "TIMED_OUT"]);

const subscribeToTables = ({ channelName, bindings, errorMessage }) => {
  let channel = supabase.channel(channelName);

  bindings.forEach(({ table, filter, isRelevantChange, onChange }) => {
    channel = channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table,
        ...(filter ? { filter } : {}),
      },
      (payload) => {
        if (!isRelevantChange || isRelevantChange(payload)) {
          onChange();
        }
      }
    );
  });

  channel.subscribe((status) => {
    if (FAILED_STATUSES.has(status)) {
      console.error(errorMessage, status);
    }
  });

  return () => {
    supabase.removeChannel(channel);
  };
};

/**
 * @param {object} params
 * @param {Function} params.onChange Callback ante cualquier cambio de `branches`.
 * @returns {() => void} Cierra el canal.
 */
export const subscribeToBranchListChanges = ({ onChange }) =>
  subscribeToTables({
    channelName: "inventory-report-branches",
    errorMessage: "No se pudo conectar Realtime para sucursales:",
    bindings: [{ table: "branches", onChange }],
  });

/**
 * @param {object} params
 * @param {string} params.branchId Sucursal del reporte.
 * @param {Function} params.onChange Callback cuando un cambio afecta al reporte.
 * @param {Function} params.isRelevantProductChange Filtro de cambios de `products`.
 * @param {Function} params.isRelevantDepartmentChange Filtro de cambios de `departments`.
 * @returns {() => void} Cierra el canal.
 */
export const subscribeToInventoryReportChanges = ({
  branchId,
  onChange,
  isRelevantProductChange,
  isRelevantDepartmentChange,
}) =>
  subscribeToTables({
    channelName: `inventory-report-realtime-${branchId}`,
    errorMessage: "No se pudo conectar Realtime al reporte:",
    bindings: [
      {
        table: "branch_inventory",
        filter: `branch_id=eq.${branchId}`,
        onChange,
      },
      {
        table: "products",
        isRelevantChange: isRelevantProductChange,
        onChange,
      },
      {
        table: "departments",
        isRelevantChange: isRelevantDepartmentChange,
        onChange,
      },
    ],
  });
