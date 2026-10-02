import { supabase } from "../../../../../lib/supabaseClient";

import {
  calculateWeightedAverageCost,
  roundCost,
} from "../../../../../services/inventory/inventoryCostCalculationService";

import {
  getSystemLocalTimestamp,
  logInventoryMovement,
} from "../../../../../utils/inventoryMovements";

const getProductId = (product) => {
  return product?.product_id || product?.id || null;
};

const getSalePrice = (product) => {
  return Number(product?.precio || 0);
};

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
const resolveIncomingCostPrice = (incomingCostPrice, currentCost) => {
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
 */
const resolveCurrentCost = (product, inventoryRow) => {
  const raw = inventoryRow?.cost_price ?? product?.costo ?? product?.cost_price;
  const parsed = Number(raw);

  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
};

const findInventoryRow = async ({ branchId, productId }) => {
  const { data, error } = await supabase
    .from("branch_inventory")
    .select("id, stock, has_been_stocked, cost_price")
    .eq("branch_id", branchId)
    .eq("product_id", productId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
};

const updateInventoryRow = async ({
  inventoryRowId,
  nextStock,
  costPrice,
  salePrice,
  updatedAt,
}) => {
  const { error } = await supabase
    .from("branch_inventory")
    .update({
      stock: nextStock,
      is_active: true,
      has_been_stocked: true,
      cost_price: costPrice,
      sale_price: salePrice,
      updated_at: updatedAt,
    })
    .eq("id", inventoryRowId);

  if (error) {
    throw error;
  }
};

const insertInventoryRow = async ({
  branchId,
  productId,
  quantity,
  costPrice,
  salePrice,
  createdAt,
}) => {
  const { error } = await supabase.from("branch_inventory").insert({
    branch_id: branchId,
    product_id: productId,
    stock: quantity,
    min_stock: 0,
    max_stock: 0,
    is_active: true,
    has_been_stocked: true,
    cost_price: costPrice,
    sale_price: salePrice,
    created_at: createdAt,
    updated_at: createdAt,
  });

  if (error) {
    throw error;
  }
};

export const addInventoryToProduct = async ({
  branchId,
  product,
  quantity,
  incomingCostPrice = null,
  userId = null,
}) => {
  if (!branchId) {
    throw new Error("No hay una sucursal activa para registrar el inventario.");
  }

  const productId = getProductId(product);

  if (!productId) {
    throw new Error("No se detectó el identificador del producto.");
  }

  const normalizedQuantity = Number(quantity);

  if (!Number.isFinite(normalizedQuantity) || normalizedQuantity <= 0) {
    throw new Error("La cantidad debe ser mayor a 0.");
  }

  const inventoryRow = await findInventoryRow({
    branchId,
    productId,
  });

  const now = new Date();
  const databaseTimestamp = now.toISOString();
  const movementCreatedAt = getSystemLocalTimestamp(now);

  const salePrice = getSalePrice(product);
  const currentCost = resolveCurrentCost(product, inventoryRow);
  const resolvedIncomingCostPrice = resolveIncomingCostPrice(
    incomingCostPrice,
    currentCost
  );

  const previousStock = Number(inventoryRow?.stock || 0);
  const newStock = previousStock + normalizedQuantity;

  const newCostPrice = calculateWeightedAverageCost({
    currentStock: previousStock,
    currentCost,
    incomingQty: normalizedQuantity,
    incomingCost: resolvedIncomingCostPrice,
  });

  if (inventoryRow?.id) {
    await updateInventoryRow({
      inventoryRowId: inventoryRow.id,
      nextStock: newStock,
      costPrice: newCostPrice,
      salePrice,
      updatedAt: databaseTimestamp,
    });
  } else {
    await insertInventoryRow({
      branchId,
      productId,
      quantity: normalizedQuantity,
      costPrice: newCostPrice,
      salePrice,
      createdAt: databaseTimestamp,
    });
  }

  await logInventoryMovement({
    branchId,
    productId,
    movementType: "inventory_add",
    quantity: normalizedQuantity,
    previousStock,
    newStock,
    unitCost: resolvedIncomingCostPrice,
    totalCost: roundCost(resolvedIncomingCostPrice * normalizedQuantity),
    reason: "Alta a inventario (manual)",
    userId,
    createdAt: movementCreatedAt,
  });

  return {
    productId,
    previousStock,
    newStock,
    quantity: normalizedQuantity,
    costPrice: newCostPrice,
  };
};
