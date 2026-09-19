/**
 * cashCutCalculationService.js
 * Funciones puras de agregacion y calculo del Corte de Cajero.
 * Sin I/O ni acceso a Supabase: reciben filas ya consultadas y devuelven totales.
 */

const toNumber = (value) => Number(value || 0);

/**
 * Totales de venta del turno (bruto, subtotal e impuestos)
 */
export const calculateSalesTotals = (salesData = []) => {
  const ventasTotales = salesData.reduce(
    (acc, sale) => acc + toNumber(sale.total),
    0
  );
  const subtotal = salesData.reduce(
    (acc, sale) => acc + toNumber(sale.subtotal),
    0
  );
  const tax = salesData.reduce((acc, sale) => acc + toNumber(sale.tax), 0);

  return { ventasTotales, subtotal, tax };
};

/**
 * Totales y detalle de cancelaciones, separando las que afectan caja
 */
export const calculateCancellations = (refundRows = []) => {
  const devolucionesTotales = refundRows.reduce(
    (acc, row) => acc + toNumber(row.refund_amount),
    0
  );

  const devolucionesAfectanCaja = refundRows.reduce((acc, row) => {
    const affectsCash = row.payment_methods?.affects_cash ?? false;
    return affectsCash ? acc + toNumber(row.refund_amount) : acc;
  }, 0);

  const cancelaciones = refundRows.map((row) => ({
    id: row.id,
    sale_id: row.sale_id,
    cancel_reason: row.cancel_reason,
    refund_amount: toNumber(row.refund_amount),
    canceled_at: row.canceled_at,
    refund_method_id: row.refund_method_id,
    refund_method_name: row.payment_methods?.name || "Sin método",
    affects_cash: row.payment_methods?.affects_cash ?? false,
  }));

  return {
    devolucionesTotales,
    devolucionesAfectanCaja,
    cancelaciones,
  };
};

/**
 * Totales y detalle de devoluciones parciales, separando las que afectan caja
 */
export const calculatePartialReturns = (partialReturnRows = []) => {
  const devolucionesParcialesTotales = partialReturnRows.reduce(
    (acc, row) => acc + toNumber(row.total_refund),
    0
  );

  const devolucionesParcialesAfectanCaja = partialReturnRows.reduce(
    (acc, row) => {
      const affectsCash = row.payment_methods?.affects_cash ?? false;
      return affectsCash ? acc + toNumber(row.total_refund) : acc;
    },
    0
  );

  const devolucionesParciales = partialReturnRows.map((row) => ({
    id: row.id,
    sale_id: row.sale_id,
    return_reason: row.return_reason,
    total_refund: toNumber(row.total_refund),
    created_at: row.created_at,
    refund_method_id: row.refund_method_id,
    refund_method_name: row.payment_methods?.name || "Sin método",
    affects_cash: row.payment_methods?.affects_cash ?? false,
  }));

  return {
    devolucionesParcialesTotales,
    devolucionesParcialesAfectanCaja,
    devolucionesParciales,
  };
};

/**
 * Resumen de canjes de recompensas: aplicados vs revertidos
 */
export const calculateRewardSummary = (redemptionRows = []) => {
  return redemptionRows.reduce(
    (acc, row) => {
      const quantity = Number(row.quantity || 1);
      const points = Math.abs(toNumber(row.total_points));
      const isReverted = Boolean(row.reversed_at);

      if (isReverted) {
        acc.canjesRevertidos += quantity;
        acc.puntosDevueltos += points;
      } else {
        acc.canjesAplicados += quantity;
        acc.puntosUsados += points;
      }

      return acc;
    },
    {
      canjesAplicados: 0,
      puntosUsados: 0,
      canjesRevertidos: 0,
      puntosDevueltos: 0,
    }
  );
};

/**
 * Agrupa pagos por id de metodo de pago (name solo como fallback para pagos sin
 * metodo), conservando id y affects_cash. Evita fusionar metodos distintos que
 * comparten nombre (p. ej. catalogos por sucursal).
 */
export const groupPaymentsByMethod = (paymentRows = []) => {
  const grouped = new Map();

  paymentRows.forEach((payment) => {
    const id = payment.payment_methods?.id || null;
    const name = payment.payment_methods?.name || "Otro";
    const affectsCash = payment.payment_methods?.affects_cash ?? false;
    const key = id || name;

    if (!grouped.has(key)) {
      grouped.set(key, { id, name, total: 0, affects_cash: affectsCash });
    }

    grouped.get(key).total += toNumber(payment.amount);
  });

  return Array.from(grouped.values());
};

/**
 * Totales de ventas cobradas en dolares (USD y su equivalente en MXN)
 */
export const calculateDollarTotals = (usdPaymentRows = []) => {
  const ventasDolaresUsd = usdPaymentRows.reduce(
    (acc, row) => acc + toNumber(row.amount),
    0
  );

  const ventasDolaresMxn = usdPaymentRows.reduce(
    (acc, row) => acc + toNumber(row.amount) * toNumber(row.exchange_rate),
    0
  );

  return { ventasDolaresUsd, ventasDolaresMxn };
};

/**
 * Agrupa las ventas por departamento y las ordena de mayor a menor
 */
export const groupSalesByDepartment = (saleDetailRows = []) => {
  const grouped = {};

  saleDetailRows.forEach((item) => {
    const departmentName =
      item.products?.departments?.name || "Sin departamento";
    if (!grouped[departmentName]) grouped[departmentName] = 0;
    grouped[departmentName] += toNumber(item.total_price);
  });

  return Object.entries(grouped)
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total);
};

/**
 * Suma total de las ventas por departamento
 */
export const calculateDepartmentsTotal = (departments = []) =>
  departments.reduce((acc, department) => acc + toNumber(department.total), 0);

/**
 * Separa movimientos de caja en entradas y salidas y totaliza cada grupo
 */
export const splitCashMovements = (movementRows = []) => {
  const entradas = movementRows.filter((m) => m.movement_type === "entrada");
  const salidas = movementRows.filter((m) => m.movement_type === "salida");

  const totalEntradas = entradas.reduce(
    (acc, movement) => acc + toNumber(movement.amount),
    0
  );
  const totalSalidas = salidas.reduce(
    (acc, movement) => acc + toNumber(movement.amount),
    0
  );

  return { entradas, salidas, totalEntradas, totalSalidas };
};

/**
 * Monto esperado/contado por metodo de pago para el detalle del corte.
 * Ignora metodos sin id y nunca reporta esperado negativo.
 */
export const buildNetPaymentMethodDetails = ({
  ventasPorMetodo = [],
  cancelaciones = [],
  devolucionesParciales = [],
} = {}) => {
  return ventasPorMetodo
    .filter((method) => !!method.id)
    .map((method) => {
      const cancelacionesMetodo = cancelaciones
        .filter((item) => item.refund_method_id === method.id)
        .reduce((acc, item) => acc + toNumber(item.refund_amount), 0);

      const devolucionesMetodo = devolucionesParciales
        .filter((item) => item.refund_method_id === method.id)
        .reduce((acc, item) => acc + toNumber(item.total_refund), 0);

      const expectedNetAmount =
        toNumber(method.total) - cancelacionesMetodo - devolucionesMetodo;

      return {
        payment_method_id: method.id,
        expected_amount: Math.max(expectedNetAmount, 0),
        counted_amount: Math.max(expectedNetAmount, 0),
        difference: 0,
      };
    });
};

/**
 * Ventas por gran categoria de metodo de pago (efectivo, terminal, transferencia)
 */
export const calculateMethodTotals = (ventasPorMetodo = []) => {
  const sumBy = (matches) =>
    ventasPorMetodo
      .filter((method) => matches(method.name))
      .reduce((acc, method) => acc + toNumber(method.total), 0);

  const ventasEfectivo = sumBy((name) => name?.toLowerCase() === "efectivo");

  const ventasTerminal = sumBy((name) => {
    const normalized = name?.toLowerCase() || "";
    return normalized.includes("terminal") || normalized.includes("tarjeta");
  });

  const ventasTransferencia = sumBy((name) => {
    const normalized = name?.toLowerCase() || "";
    return normalized.includes("transferencia");
  });

  return { ventasEfectivo, ventasTerminal, ventasTransferencia };
};

/**
 * Devoluciones (cancelaciones + parciales) agrupadas por gran categoria de metodo
 */
export const calculateRefundsByMethod = (
  cancelaciones = [],
  devolucionesParciales = []
) => {
  const getRefundsByMethodName = (matchesMethod) => {
    const totalCancelacionesMetodo = cancelaciones
      .filter((item) => matchesMethod(item.refund_method_name || ""))
      .reduce((acc, item) => acc + toNumber(item.refund_amount), 0);

    const totalDevolucionesMetodo = devolucionesParciales
      .filter((item) => matchesMethod(item.refund_method_name || ""))
      .reduce((acc, item) => acc + toNumber(item.total_refund), 0);

    return totalCancelacionesMetodo + totalDevolucionesMetodo;
  };

  const devolucionesEfectivoMetodo = getRefundsByMethodName((methodName) =>
    String(methodName || "")
      .toLowerCase()
      .includes("efectivo")
  );

  const devolucionesTerminalMetodo = getRefundsByMethodName((methodName) => {
    const normalized = String(methodName || "").toLowerCase();
    return normalized.includes("terminal") || normalized.includes("tarjeta");
  });

  const devolucionesTransferenciaMetodo = getRefundsByMethodName((methodName) =>
    String(methodName || "")
      .toLowerCase()
      .includes("transferencia")
  );

  return {
    devolucionesEfectivoMetodo,
    devolucionesTerminalMetodo,
    devolucionesTransferenciaMetodo,
  };
};

/**
 * Ventas netas por gran categoria de metodo (nunca por debajo de cero)
 */
export const calculateMethodNetTotals = ({
  ventasEfectivo = 0,
  ventasTerminal = 0,
  ventasTransferencia = 0,
  devolucionesEfectivoMetodo = 0,
  devolucionesTerminalMetodo = 0,
  devolucionesTransferenciaMetodo = 0,
} = {}) => {
  const ventasEfectivoNeto = Math.max(
    toNumber(ventasEfectivo) - toNumber(devolucionesEfectivoMetodo),
    0
  );

  const ventasTerminalNeto = Math.max(
    toNumber(ventasTerminal) - toNumber(devolucionesTerminalMetodo),
    0
  );

  const ventasTransferenciaNeto = Math.max(
    toNumber(ventasTransferencia) - toNumber(devolucionesTransferenciaMetodo),
    0
  );

  return {
    ventasEfectivoNeto,
    ventasTerminalNeto,
    ventasTransferenciaNeto,
  };
};

/**
 * Descuento aplicado del turno (subtotal + impuestos - total bruto)
 */
export const calculateDiscountTotal = ({
  subtotal = 0,
  tax = 0,
  ventasTotales = 0,
} = {}) => {
  return subtotal + tax - ventasTotales;
};

/**
 * Ventas netas del turno (bruto menos cancelaciones y devoluciones parciales)
 */
export const calculateNetSales = ({
  ventasTotales = 0,
  devolucionesTotales = 0,
  devolucionesParcialesTotales = 0,
} = {}) => {
  return (
    toNumber(ventasTotales) -
    toNumber(devolucionesTotales) -
    toNumber(devolucionesParcialesTotales)
  );
};

/**
 * Dinero esperado en caja al momento del corte
 */
export const calculateCashInRegister = ({
  openingAmount = 0,
  totalEntradas = 0,
  ventasEfectivo = 0,
  ventasDolaresMxn = 0,
  totalSalidas = 0,
  devolucionesAfectanCaja = 0,
  devolucionesParcialesAfectanCaja = 0,
} = {}) => {
  return (
    openingAmount +
    totalEntradas +
    ventasEfectivo +
    ventasDolaresMxn -
    totalSalidas -
    devolucionesAfectanCaja -
    devolucionesParcialesAfectanCaja
  );
};

/**
 * Resuelve los montos esperado/contado/diferencia segun la vista (actual o historica)
 */
export const resolveCutDisplay = ({
  isHistoricalView = false,
  historicalCut = null,
  currentShiftCut = null,
  dineroCaja = 0,
} = {}) => {
  const expectedDisplay = isHistoricalView
    ? toNumber(historicalCut?.expected_amount)
    : dineroCaja;

  const countedDisplay = isHistoricalView
    ? toNumber(historicalCut?.counted_amount)
    : currentShiftCut
      ? toNumber(currentShiftCut.counted_amount)
      : null;

  const differenceDisplay = isHistoricalView
    ? toNumber(historicalCut?.difference)
    : currentShiftCut
      ? toNumber(currentShiftCut.difference)
      : null;

  return { expectedDisplay, countedDisplay, differenceDisplay };
};
