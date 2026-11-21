const toNumberOrZero = (value) => {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : 0;
};

/**
 * Regla comun del POS para el nivel de stock: agotado con stock <= 0, stock bajo
 * cuando hay minimo configurado y el stock no lo supera, disponible en otro caso.
 */
export const getStockLevel = ({ stock, minimum } = {}) => {
  const normalizedStock = toNumberOrZero(stock);

  const normalizedMinimum = toNumberOrZero(minimum);

  if (normalizedStock <= 0) {
    return "outOfStock";
  }

  if (normalizedMinimum > 0 && normalizedStock <= normalizedMinimum) {
    return "lowStock";
  }

  return "available";
};

const STOCK_LEVEL_LABELS = {
  outOfStock: "Agotado",
  lowStock: "Stock bajo",
  available: "Disponible",
};

export const getStockStatus = (row) => {
  if (row?.noBranchRecord === true) {
    return {
      type: "noBranchRecord",
      label: "Sin registro en sucursal",
    };
  }

  if (
    row?.tracksInventory === false ||
    row?.existencia === null ||
    row?.existencia === undefined
  ) {
    return {
      type: "notApplicable",
      label: "No aplica",
    };
  }

  const type = getStockLevel({ stock: row.existencia, minimum: row.min });

  return {
    type,
    label: STOCK_LEVEL_LABELS[type],
  };
};
