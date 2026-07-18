const toFiniteNumber = (
  value,
  fallback = null
) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return fallback;
  }

  const numberValue = Number(value);

  return Number.isFinite(numberValue)
    ? numberValue
    : fallback;
};

export const getKardexStockChange = (
  movement
) => {
  const previousStock =
    toFiniteNumber(
      movement?.previous_stock
    );

  const newStock =
    toFiniteNumber(
      movement?.new_stock
    );

  if (
    previousStock === null ||
    newStock === null
  ) {
    return {
      previousStock,
      newStock,
      difference: 0,
      entryQty: 0,
      exitQty: 0,
    };
  }

  const difference =
    newStock - previousStock;

  return {
    previousStock,
    newStock,
    difference,

    entryQty:
      difference > 0
        ? difference
        : 0,

    exitQty:
      difference < 0
        ? Math.abs(difference)
        : 0,
  };
};

export const buildKardexRow = (
  movement,
  {
    tracksInventory = true,
  } = {}
) => {
  const stockChange =
    getKardexStockChange(
      movement
    );

  return {
    ...movement,

    entryQty:
      tracksInventory
        ? stockChange.entryQty
        : 0,

    exitQty:
      tracksInventory
        ? stockChange.exitQty
        : 0,

    previousStock:
      tracksInventory
        ? stockChange.previousStock
        : null,

    runningStock:
      tracksInventory
        ? stockChange.newStock
        : null,

    stockDifference:
      tracksInventory
        ? stockChange.difference
        : 0,
  };
};

export const buildKardexRows = (
  movements,
  options = {}
) => {
  const normalizedMovements =
    Array.isArray(movements)
      ? movements
      : [];

  return normalizedMovements.map(
    (movement) =>
      buildKardexRow(
        movement,
        options
      )
  );
};

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

  const stock =
    toFiniteNumber(
      currentStock,
      0
    );

  const minimum =
    toFiniteNumber(
      minimumStock,
      0
    );

  const maximum =
    toFiniteNumber(
      maximumStock,
      0
    );

  if (
    maximum > 0 &&
    stock > maximum
  ) {
    return {
      key: "overstock",
      label: "SOBRESTOCK",
    };
  }

  if (stock <= minimum) {
    return {
      key: "outOfStock",
      label: "AGOTADO",
    };
  }

  if (
    minimum > 0 &&
    stock <= minimum * 1.5
  ) {
    return {
      key: "lowStock",
      label: "POR AGOTARSE",
    };
  }

  return {
    key: "available",
    label: "DISPONIBLE",
  };
};

export const getKardexProductId = (
  product
) => {
  return (
    product?.id ??
    product?.product_id ??
    null
  );
};

export const getKardexProductStock = (
  product
) => {
  return toFiniteNumber(
    product?.existencia ??
      product?.stock ??
      product?.current_stock,
    0
  );
};

export const getKardexMinimumStock = (
  product
) => {
  return toFiniteNumber(
    product?.minimo ??
      product?.minimum_stock ??
      product?.min_stock,
    0
  );
};

export const getKardexMaximumStock = (
  product
) => {
  return toFiniteNumber(
    product?.maximo ??
      product?.maximum_stock ??
      product?.max_stock,
    0
  );
};

export const productTracksInventory = (
  product
) => {
  const value =
    product?.tracks_inventory ??
    product?.use_inventory ??
    true;

  return Boolean(value);
};