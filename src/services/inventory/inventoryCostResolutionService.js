/**
 * inventoryCostResolutionService.js
 * Resolucion pura de los dos costos que gobiernan un alta de inventario:
 * el costo promedio vigente y el costo de adquisicion del lote entrante.
 *
 * Vive aparte de `inventoryAddService` y sin I/O por dos motivos:
 *
 * 1. El servicio de alta es el unico que persiste; la proyeccion que muestra el
 *    CPP resultante antes de guardar necesita exactamente las mismas reglas y no
 *    debe arrastrar Supabase para usarlas.
 * 2. Duplicar estas reglas en la interfaz abriria la puerta a que el CPP que se
 *    anuncia antes de guardar difiera del que realmente se persiste. Compartiendo
 *    el modulo, la divergencia no es representable.
 */

import { roundCost } from "./inventoryCostCalculationService";

/**
 * Costo unitario con el que se valoriza la mercancia entrante.
 *
 * Sin costo de compra explicito, la entrada se valoriza al **costo promedio
 * vigente** de la sucursal: el bien entra al mismo costo del lote existente y
 * por lo tanto el CPP no se altera
 * (`((stock*c) + (qtd*c)) / (stock+qtd) === c`).
 *
 * Esto distingue una entrada por compra de una entrada que no es compra (correccion
 * de conteo fisico, resguardo, devolucion de proveedor). Valorar toda alta manual
 * al precio de catalogo contaminaria la base de costo con una operacion que no
 * adquiere valor, y de forma silenciosa: el CPP se moveria hacia el catalogo sin
 * que exista una compra detras.
 *
 * Solo un `incomingCostPrice` explicito y finito (el flujo de compras) dispara la
 * re-ponderacion real del promedio.
 *
 * El costo de adquisicion se redondea a 2 decimales aqui, una sola vez, para que
 * sea el valor canonico de toda la operacion: el que entra al CPP, el que se
 * persiste como `unit_cost` y la base del `total_cost`. Asi se mantiene la
 * invariante contable `total_cost === round(unit_cost * cantidad)` en lugar de
 * promediar un importe redondeado contra otro sin redondear.
 *
 * @param {unknown} incomingCostPrice Costo de compra informado por el flujo.
 * @param {number} currentCost Costo promedio vigente.
 * @returns {number}
 */
export const resolveIncomingCostPrice = (incomingCostPrice, currentCost) => {
  const isProvided =
    incomingCostPrice !== null && incomingCostPrice !== undefined;

  if (!isProvided) return roundCost(currentCost);

  const parsed = Number(incomingCostPrice);

  return Number.isFinite(parsed) ? roundCost(parsed) : roundCost(currentCost);
};

/**
 * Costo promedio vigente de la sucursal. `branch_inventory.cost_price` manda:
 * el `??` (y no `||`) es deliberado para que un costo ya calculado en 0 no se
 * reemplace por el del catalogo. Sin fila de inventario, o con costo nulo, se
 * hereda el catalogo: es el unico promedio de referencia disponible.
 *
 * Se normaliza a un numero finito y no negativo porque este valor tambien
 * alimenta `resolveIncomingCostPrice`; un `NaN` que llegara aqui terminaria
 * colapsando el CPP a 0.
 *
 * La interfaz puede pasar `inventoryRow = null`: `selectedProduct.costo` ya fue
 * construido desde `branch_inventory.cost_price` con fallback al catalogo, asi
 * que la proyeccion resuelve la misma cadena sin volver a consultar.
 *
 * @param {object} product Producto del contexto (ya mapeado para la sucursal).
 * @param {object|null} inventoryRow Fila de `branch_inventory`, si se consulto.
 * @returns {number}
 */
export const resolveCurrentCost = (product, inventoryRow) => {
  const raw = inventoryRow?.cost_price ?? product?.costo ?? product?.cost_price;
  const parsed = Number(raw);

  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
};
