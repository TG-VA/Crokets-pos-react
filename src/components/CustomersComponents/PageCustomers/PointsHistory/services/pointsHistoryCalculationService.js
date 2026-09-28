/**
 * pointsHistoryCalculationService.js
 * Calculos puros del historial de puntos: etiquetas de movimiento, clase de
 * insignia, filtros y resumen. Sin I/O, sin React y sin Supabase.
 */

import { normalizeText } from "../../utils/customerFormatters";

/**
 * Numero de puntos del movimiento, tolerando valores textuales o nulos.
 */
export const getMovementPoints = (movement) => Number(movement?.points || 0);

/**
 * Etiqueta legible del movimiento. El `source` manda sobre el `movement_type`
 * porque distingue el motivo (ajuste, cancelacion, devolucion) dentro de un
 * mismo tipo de movimiento.
 */
export const getMovementLabel = (movement) => {
  const points = getMovementPoints(movement);

  if (movement.source === "cancellation") {
    return points >= 0 ? "PUNTOS DEVUELTOS" : "PUNTOS DESCONTADOS";
  }

  if (movement.source === "partial_return") return "DEVOLUCIÓN";
  if (movement.source === "reward") return "CANJE";

  if (movement.source === "manual") {
    return points >= 0 ? "AJUSTE +" : "AJUSTE -";
  }

  if (movement.movement_type === "earn") return "GANADO";
  if (movement.movement_type === "redeem") return "DESCONTADO";

  return "OTRO";
};

/**
 * Nombre de la clase CSS Modules de la insignia segun origen y signo.
 */
export const getMovementBadgeClassName = ({
  movement,
  movementReturn,
  movementRedeem,
  movementEarn,
}) => {
  const points = getMovementPoints(movement);

  if (movement.source === "cancellation" && points > 0) {
    return movementReturn;
  }

  if (movement.source === "cancellation" && points < 0) {
    return movementRedeem;
  }

  if (movement.source === "manual" && points > 0) {
    return movementEarn;
  }

  if (movement.source === "manual" && points < 0) {
    return movementRedeem;
  }

  if (movement.movement_type === "earn") {
    return movementEarn;
  }

  return movementRedeem;
};

/**
 * Etiqueta del origen del movimiento.
 */
export const getSourceLabel = (source) => {
  if (source === "sale") return "VENTA";
  if (source === "manual") return "MANUAL";
  if (source === "reward") return "RECOMPENSA";
  if (source === "cancellation") return "CANCELACIÓN";
  if (source === "partial_return") return "DEVOLUCIÓN PARCIAL";

  return "SIN ORIGEN";
};

/**
 * Folio corto de la venta relacionada.
 */
export const formatSaleFolio = (saleId) => {
  if (!saleId) return "SIN FOLIO";

  return String(saleId).trim().slice(0, 8).toUpperCase();
};

/**
 * Monto en pesos embebido en las notas de una devolucion parcial.
 */
export const getReturnedAmountFromNotes = (notes) => {
  const match = String(notes || "").match(/\$[\d,]+(\.\d{2})?/);
  return match ? match[0] : "";
};

/**
 * Motivo registrado en las notas tras el prefijo `MOTIVO:`.
 */
/**
 * Notas del movimiento ya normalizadas para mostrar.
 */
export const getMovementNotes = (movement) => normalizeText(movement?.notes);

export const getMotiveFromNotes = (notes) => {
  const cleanNotes = String(notes || "").trim();

  if (!cleanNotes) return "";

  const motiveMatch = cleanNotes.match(/MOTIVO:\s*(.*?)(\.|$)/i);

  if (motiveMatch?.[1]) {
    return normalizeText(motiveMatch[1]);
  }

  return normalizeText(cleanNotes);
};

/**
 * Coincidencia del movimiento con la busqueda por cliente (nombre, telefono o
 * correo). Sin termino de busqueda, todo coincide.
 */
export const matchesCustomerSearch = (movement, search) => {
  if (!search) return true;

  const customerValues = [
    movement?.customers?.name,
    movement?.customers?.phone,
    movement?.customers?.email,
  ];

  return customerValues.some((value) =>
    String(value || "")
      .toLowerCase()
      .includes(search)
  );
};

/**
 * Movimientos que pasan unicamente el filtro de busqueda por cliente. Alimenta
 * el resumen, que es deliberadamente independiente del tipo y la sucursal.
 */
export const filterMovementsByCustomerSearch = ({
  movements = [],
  searchTerm = "",
} = {}) => {
  const search = searchTerm.trim().toLowerCase();

  return movements.filter((movement) =>
    matchesCustomerSearch(movement, search)
  );
};

/**
 * Movimientos de la tabla: busqueda por cliente, tipo de movimiento y sucursal.
 */
export const filterMovements = ({
  movements = [],
  searchTerm = "",
  movementFilter = "all",
  branchFilter = "all",
} = {}) => {
  const search = searchTerm.trim().toLowerCase();

  return movements.filter((movement) => {
    if (!matchesCustomerSearch(movement, search)) return false;

    if (branchFilter !== "all" && movement.branch_id !== branchFilter) {
      return false;
    }

    if (movementFilter !== "all" && movement.movement_type !== movementFilter) {
      return false;
    }

    return true;
  });
};

/**
 * Totales del resumen: puntos ganados (positivos), descontados (absolutos de los
 * negativos) y saldo.
 */
export const calculateMovementsSummary = (movements = []) => {
  const earned = movements
    .filter((movement) => getMovementPoints(movement) > 0)
    .reduce((sum, movement) => sum + getMovementPoints(movement), 0);

  const redeemed = movements
    .filter((movement) => getMovementPoints(movement) < 0)
    .reduce((sum, movement) => sum + Math.abs(getMovementPoints(movement)), 0);

  const balance = movements.reduce(
    (sum, movement) => sum + getMovementPoints(movement),
    0
  );

  return {
    total: movements.length,
    earned,
    redeemed,
    balance,
  };
};

/**
 * Nombre del cliente resuelto para el encabezado "Mostrando historial de".
 * Si no hay coincidencias, degrada al texto buscado en mayusculas.
 */
export const resolveCustomerSearchLabel = ({
  movements = [],
  searchTerm = "",
} = {}) => {
  const cleanSearch = searchTerm.trim();

  if (!cleanSearch) return "";

  const search = cleanSearch.toLowerCase();

  const firstMatch = movements.find((movement) =>
    matchesCustomerSearch(movement, search)
  );

  return normalizeText(firstMatch?.customers?.name || cleanSearch);
};

/**
 * Formatea una fecha de la base como texto es-MX. Acepta tanto el formato con
 * `Z` como el de Postgres sin zona, al que se anade para no desplazar el reloj.
 */
export const formatMovementDateTime = (dateValue) => {
  if (!dateValue) return "SIN FECHA";

  try {
    const rawDate = String(dateValue);

    const normalizedDate =
      rawDate.includes("T") && (rawDate.endsWith("Z") || rawDate.includes("+"))
        ? rawDate
        : `${rawDate.replace(" ", "T")}Z`;

    return new Intl.DateTimeFormat("es-MX", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
      .format(new Date(normalizedDate))
      .toUpperCase();
  } catch {
    return "SIN FECHA";
  }
};

/**
 * Nombre de la sucursal del movimiento, normalizado para la tabla.
 */
export const getMovementBranchName = (movement) => {
  return normalizeText(
    movement?.branches?.name || movement?.branches?.code || "SIN SUCURSAL"
  );
};

/**
 * Nombre del usuario que genero el movimiento, normalizado para la tabla.
 */
export const getMovementUserName = (movement) => {
  return normalizeText(movement?.users?.username || "SIN USUARIO");
};

/**
 * Nombre del cliente del movimiento, normalizado para la tabla.
 */
export const getMovementCustomerName = (movement) => {
  return normalizeText(movement?.customers?.name || "SIN CLIENTE");
};
