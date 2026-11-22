import { sortByDateDesc } from "../../../../../utils/sortByDateDesc";
import { getStockLevel } from "../../../../../utils/stockStatus";

const toFiniteNumber = (value, fallback = null) => {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : fallback;
};

/**
 * Ordena los movimientos del mas reciente al mas antiguo. Las fechas nulas o
 * invalidas van al final y el id desempata para que el orden sea estable.
 */
export const sortKardexMovementsByDateDesc = (movements) =>
  sortByDateDesc(movements);

/*
 * Tipos cuyo sentido es fijo. `quantity` ya se guarda como delta con signo
 * (CHECK new_stock = previous_stock + quantity), pero los registros historicos
 * del fallback de logInventoryMovement pueden traerlo sin signo; en estos tipos
 * se fuerza el sentido. Ajustes, traspasos y tipos desconocidos respetan el
 * signo guardado.
 */
const EXIT_MOVEMENT_TYPES = new Set([
  "sale",
  "transfer_out",
  "inventory_deactivate",
  "product_delete",
]);

const ENTRY_MOVEMENT_TYPES = new Set([
  "return",
  "canceled",
  "cancelled",
  "entry",
  "purchase",
  "transfer_in",
  "inventory_add",
  "inventory_activate",
]);

const getQuantityDifference = (movement) => {
  const quantity = toFiniteNumber(movement?.quantity, 0);

  const movementType = String(movement?.movement_type ?? "")
    .trim()
    .toLowerCase();

  if (quantity === 0) {
    return 0;
  }

  if (EXIT_MOVEMENT_TYPES.has(movementType)) {
    return -Math.abs(quantity);
  }

  if (ENTRY_MOVEMENT_TYPES.has(movementType)) {
    return Math.abs(quantity);
  }

  return quantity;
};

/**
 * Entradas y salidas de un movimiento. Sale de `new_stock - previous_stock`; si
 * falta alguno de los dos stocks, se usa `quantity` como respaldo.
 */
export const getKardexStockChange = (movement) => {
  const previousStock = toFiniteNumber(movement?.previous_stock);

  const newStock = toFiniteNumber(movement?.new_stock);

  const difference =
    previousStock === null || newStock === null
      ? getQuantityDifference(movement)
      : newStock - previousStock;

  return {
    previousStock,
    newStock,
    difference,

    entryQty: difference > 0 ? difference : 0,

    exitQty: difference < 0 ? Math.abs(difference) : 0,
  };
};

export const buildKardexRow = (movement, { tracksInventory = true } = {}) => {
  const stockChange = getKardexStockChange(movement);

  return {
    ...movement,

    entryQty: tracksInventory ? stockChange.entryQty : 0,

    exitQty: tracksInventory ? stockChange.exitQty : 0,

    previousStock: tracksInventory ? stockChange.previousStock : null,

    runningStock: tracksInventory ? stockChange.newStock : null,

    stockDifference: tracksInventory ? stockChange.difference : 0,
  };
};

export const buildKardexRows = (movements, options = {}) => {
  const normalizedMovements = Array.isArray(movements) ? movements : [];

  return normalizedMovements.map((movement) =>
    buildKardexRow(movement, options)
  );
};

const KARDEX_STOCK_LEVEL_STATUS = {
  outOfStock: {
    key: "outOfStock",
    label: "AGOTADO",
  },
  lowStock: {
    key: "lowStock",
    label: "STOCK BAJO",
  },
  available: {
    key: "available",
    label: "DISPONIBLE",
  },
};

/**
 * Estado de stock del kardex: aplica la regla comun del POS y solo agrega encima
 * los casos propios de esta vista (sin inventario y sobrestock con maximo).
 */
export const getKardexStockStatus = ({
  currentStock,
  minimumStock,
  maximumStock,
  tracksInventory = true,
}) => {
  if (!tracksInventory) {
    return {
      key: "noInventory",
      label: "SIN INVENTARIO",
    };
  }

  const stock = toFiniteNumber(currentStock, 0);

  const minimum = toFiniteNumber(minimumStock, 0);

  const maximum = toFiniteNumber(maximumStock, 0);

  if (maximum > 0 && stock > maximum) {
    return {
      key: "overstock",
      label: "SOBRESTOCK",
    };
  }

  return KARDEX_STOCK_LEVEL_STATUS[getStockLevel({ stock, minimum })];
};

export const getKardexProductId = (product) => {
  return product?.id ?? product?.product_id ?? null;
};

export const getKardexProductStock = (product) => {
  return toFiniteNumber(
    product?.existencia ?? product?.stock ?? product?.current_stock,
    0
  );
};

export const getKardexMinimumStock = (product) => {
  return toFiniteNumber(
    product?.minimo ?? product?.minimum_stock ?? product?.min_stock,
    0
  );
};

export const getKardexMaximumStock = (product) => {
  return toFiniteNumber(
    product?.maximo ?? product?.maximum_stock ?? product?.max_stock,
    0
  );
};

export const productTracksInventory = (product) => {
  const value = product?.tracks_inventory ?? product?.use_inventory ?? true;

  return Boolean(value);
};
