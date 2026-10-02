/**
 * inventoryCostCalculationService.js
 * Funciones puras del Costo Promedio Ponderado Movil (CPP).
 * Sin I/O ni acceso a Supabase: reciben los valores ya consultados y devuelven
 * el costo promedio resultante, listo para persistir en branch_inventory.cost_price.
 */

const COST_DECIMALS = 2;
const COST_FACTOR = 10 ** COST_DECIMALS;

/**
 * Coercion defensiva a un numero finito no negativo.
 *
 * Decision R2 de auditoria: un costo o un stock negativo nunca debe entrar a la
 * formula ni salir de ella. `NaN`, `Infinity`, `null`, `undefined`, `""` y los
 * strings no numericos colapsan a 0, de modo que un dato sucio en la base no
 * pueda dejar un costo promedio negativo o un NaN guardado en PostgreSQL.
 *
 * @param {unknown} value
 * @returns {number} finito y mayor o igual a 0
 */
const toNonNegativeNumber = (value) => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) return 0;

  return Math.max(0, parsed);
};

/**
 * Redondeo financiero a 2 decimales conservando el tipo Number.
 * @param {number} value
 * @returns {number}
 */
const roundCost = (value) => {
  const rounded = Math.round(value * COST_FACTOR) / COST_FACTOR;

  return Number.isFinite(rounded) ? Math.max(0, rounded) : 0;
};

/**
 * Costo Promedio Ponderado Movil (CPP) de una entrada de inventario.
 *
 * Formula: ((currentStock * currentCost) + (incomingQty * incomingCost))
 *          / (currentStock + incomingQty)
 *
 * Reglas de negocio:
 * - Si `incomingQty <= 0` no hay entrada que ponderar: el costo vigente se
 *   conserva intacto (devuelve el costo actual normalizado, nunca null).
 * - Si `currentStock <= 0` no hay base ponderable: el costo promedio es
 *   exactamente el costo del lote entrante.
 * - En cualquier otro caso se aplica la formula y se redondea a 2 decimales,
 *   igual que el `round(coalesce(v_cost_price, 0), 2)` de la migracion
 *   20261002124615 que congela el costo en sale_details.
 *
 * @param {object} params
 * @param {unknown} params.currentStock Stock vigente antes de la entrada.
 * @param {unknown} params.currentCost  Costo promedio vigente antes de la entrada.
 * @param {unknown} params.incomingQty  Cantidad del lote entrante.
 * @param {unknown} params.incomingCost Costo unitario de compra del lote entrante.
 * @returns {number} Costo promedio ponderado, finito y no negativo.
 */
export const calculateWeightedAverageCost = ({
  currentStock,
  currentCost,
  incomingQty,
  incomingCost,
} = {}) => {
  const safeCurrentStock = toNonNegativeNumber(currentStock);
  const safeCurrentCost = toNonNegativeNumber(currentCost);
  const safeIncomingQty = toNonNegativeNumber(incomingQty);
  const safeIncomingCost = toNonNegativeNumber(incomingCost);

  if (safeIncomingQty <= 0) {
    return roundCost(safeCurrentCost);
  }

  if (safeCurrentStock <= 0) {
    return roundCost(safeIncomingCost);
  }

  const totalValue =
    safeCurrentStock * safeCurrentCost + safeIncomingQty * safeIncomingCost;
  const totalQuantity = safeCurrentStock + safeIncomingQty;

  return roundCost(totalValue / totalQuantity);
};
