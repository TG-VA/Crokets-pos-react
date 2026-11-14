// Reglas puras de disponibilidad y orden para la busqueda de productos.
// No consultan la base ni dependen de React.

const toFiniteNumber = (value, fallback = 0) => {
  const numeric = Number(value);

  return Number.isFinite(numeric) ? numeric : fallback;
};

export const getProductStock = (product) =>
  toFiniteNumber(product?.existencia ?? product?.stock, 0);

export const getProductMinStock = (product) =>
  toFiniteNumber(
    product?.minimo ?? product?.min_stock ?? product?.minimum_stock,
    0
  );

/**
 * Un producto es global solo cuando el catalogo lo marca explicitamente.
 * Cualquier otro valor (false o ausente) se trata como local para no enviar
 * productos de una sucursal a otra por un dato incompleto.
 */
export const isGlobalProduct = (product) => product?.is_global === true;

/**
 * Un kit no maneja inventario propio: su disponibilidad depende de los
 * productos que lo componen, por lo que no se puede mover ni pedir.
 */
export const isKitProduct = (product) => product?.is_kit === true;

/**
 * Un producto marcado sin inventario (servicios, kits) no tiene existencias
 * que agregar, ajustar, traspasar ni pedir. Sin la marca se asume que si
 * maneja inventario.
 */
export const isInventoryTrackedProduct = (product) =>
  Boolean(product) && product.tracks_inventory !== false;

/**
 * Misma regla que el reporte de inventario: hay bajo minimo cuando existe un
 * minimo configurado y la existencia es igual o menor a el. Los productos sin
 * inventario inicial no cuentan como bajo minimo porque aun no tienen una
 * base contra la cual comparar.
 */
export const isProductBelowMinimum = (product) => {
  if (!product || product?.tracks_inventory === false) return false;
  if (product?.has_been_stocked === false) return false;

  const minStock = getProductMinStock(product);

  if (minStock <= 0) return false;

  return getProductStock(product) <= minStock;
};

const getProductName = (product) =>
  String(product?.descripcion ?? product?.name ?? "");

const getProductCode = (product) =>
  String(product?.codigo ?? product?.barcode ?? "");

const compareByName = (left, right) =>
  getProductName(left).localeCompare(getProductName(right), "es", {
    sensitivity: "base",
    numeric: true,
  });

const compareByStock = (left, right) =>
  getProductStock(left) - getProductStock(right);

const compareByCode = (left, right) =>
  getProductCode(left).localeCompare(getProductCode(right), "es", {
    sensitivity: "base",
    numeric: true,
  });

/**
 * Orden principal alfabetico por nombre; la cantidad ascendente solo desempata
 * cuando dos productos comparten nombre. El codigo cierra el orden para que el
 * resultado sea determinista.
 */
export const sortProductsByNameAndStock = (products = []) =>
  [...(Array.isArray(products) ? products : [])].sort(
    (left, right) =>
      compareByName(left, right) ||
      compareByStock(left, right) ||
      compareByCode(left, right)
  );

const normalizeSearchValue = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const matchesSearchTerm = (product, term) => {
  if (!term) return true;

  const haystack = normalizeSearchValue(
    `${getProductCode(product)} ${getProductName(product)} ${String(
      product?.departamento ?? product?.department_name ?? ""
    )}`
  );

  return haystack.includes(term);
};

export const filterInventorySearchProducts = (
  products = [],
  { searchTerm = "" } = {}
) => {
  const term = normalizeSearchValue(searchTerm);

  return sortProductsByNameAndStock(products).filter((product) => {
    return matchesSearchTerm(product, term);
  });
};
