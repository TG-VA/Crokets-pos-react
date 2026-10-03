/**
 * inventoryAddProjectionService.js
 * Proyeccion pura del Costo Promedio Ponderado resultante de una entrada.
 *
 * No consulta ni escribe nada: recibe el producto ya seleccionado y la captura en
 * curso y devuelve los numeros que la interfaz muestra **antes** de guardar. Al
 * compartir `resolveCurrentCost`, `resolveIncomingCostPrice` y
 * `calculateWeightedAverageCost` con el servicio que persiste, el CPP anunciado y
 * el CPP guardado no pueden divergir.
 */

import { calculateWeightedAverageCost } from "../../../../../services/inventory/inventoryCostCalculationService";
import {
  resolveCurrentCost,
  resolveIncomingCostPrice,
} from "../../../../../services/inventory/inventoryCostResolutionService";

/**
 * Origen de la entrada de inventario.
 *
 * La distincion no es cosmetica: solo una compra trae un costo de adquisicion
 * explicito y por lo tanto es la unica que puede mover el CPP. Una entrada
 * manual (correccion de conteo fisico, resguardo, devolucion de proveedor) se
 * valoriza al promedio vigente y lo deja intacto.
 */
export const ENTRY_MODE = {
  PURCHASE: "purchase",
  MANUAL: "manual",
};

/**
 * Stock vigente del producto seleccionado, ya normalizado.
 *
 * @param {object} product Producto del contexto de productos.
 * @returns {number}
 */
export const getCurrentStock = (product) => {
  const stock = Number(product?.existencia ?? 0);

  return Number.isFinite(stock) ? Math.max(0, stock) : 0;
};

/**
 * Costo promedio vigente del producto seleccionado.
 *
 * Se resuelve con `inventoryRow = null` porque `selectedProduct.costo` ya fue
 * construido desde `branch_inventory.cost_price` con fallback al catalogo: es el
 * mismo promedio que leera el servidor al guardar.
 *
 * @param {object} product Producto del contexto de productos.
 * @returns {number}
 */
export const getCurrentUnitCost = (product) => {
  return resolveCurrentCost(product, null);
};

/**
 * Costo de compra con el que se precarga el campo: el costo promedio vigente.
 *
 * Es una sugerencia de comodidad, no un valor por defecto silencioso. El usuario
 * ve el numero escrito y puede corregirlo; ademas la proyeccion muestra en vivo
 * cuanto CPP resultaria, de modo que el reprecio es una decision visible.
 *
 * @param {number} currentCost
 * @returns {string}
 */
export const suggestIncomingCostInput = (currentCost) => {
  const cost = Number(currentCost);

  if (!Number.isFinite(cost)) return "";

  return cost.toFixed(2);
};

/**
 * Proyecta el resultado de la entrada con la captura en curso.
 *
 * Replica exactamente el camino del servicio de alta: se resuelve el costo de
 * adquisicion segun el modo y se aplica el CPP sobre el stock vigente.
 *
 * @param {object} params
 * @param {object} params.product Producto seleccionado.
 * @param {unknown} params.quantity Cantidad capturada (string o number).
 * @param {string} params.entryMode Uno de `ENTRY_MODE`.
 * @param {unknown} params.incomingCostPrice Costo capturado en el campo de compra.
 * @returns {{
 *   entryMode: string,
 *   isPurchase: boolean,
 *   currentStock: number,
 *   currentCost: number,
 *   incomingQty: number,
 *   resolvedIncomingCost: number,
 *   projectedStock: number,
 *   projectedCost: number,
 *   totalIncomingCost: number,
 *   currentInventoryValue: number,
 *   projectedInventoryValue: number,
 *   costWillChange: boolean
 * }}
 */
export const projectIncomingCost = ({
  product,
  quantity,
  entryMode,
  incomingCostPrice,
} = {}) => {
  const isPurchase = entryMode === ENTRY_MODE.PURCHASE;

  const currentStock = getCurrentStock(product);
  const currentCost = getCurrentUnitCost(product);

  const parsedQty = Number(quantity);
  const incomingQty =
    Number.isFinite(parsedQty) && parsedQty > 0 ? parsedQty : 0;

  // En una entrada manual el costo de compra no viaja: `undefined` es justamente
  // lo que hace que `resolveIncomingCostPrice` valorice la mercancia al costo
  // promedio vigente y deje el CPP donde estaba.
  const resolvedIncomingCost = resolveIncomingCostPrice(
    isPurchase ? incomingCostPrice : undefined,
    currentCost
  );

  const projectedStock = currentStock + incomingQty;

  const projectedCost = calculateWeightedAverageCost({
    currentStock,
    currentCost,
    incomingQty,
    incomingCost: resolvedIncomingCost,
  });

  return {
    entryMode: isPurchase ? ENTRY_MODE.PURCHASE : ENTRY_MODE.MANUAL,
    isPurchase,
    currentStock,
    currentCost,
    incomingQty,
    resolvedIncomingCost,
    projectedStock,
    projectedCost,
    totalIncomingCost:
      Math.round(resolvedIncomingCost * incomingQty * 100) / 100,
    currentInventoryValue: Math.round(currentStock * currentCost * 100) / 100,
    projectedInventoryValue:
      Math.round(projectedStock * projectedCost * 100) / 100,
    costWillChange: projectedCost !== currentCost,
  };
};
