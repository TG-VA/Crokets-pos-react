const normalizeValue = (value) =>
  typeof value === "string" ? value.trim() : value;

const hasFormChanges = (initialForm = {}, form = {}) => {
  const keys = new Set([...Object.keys(initialForm), ...Object.keys(form)]);
  return [...keys].some(
    (key) => normalizeValue(initialForm[key]) !== normalizeValue(form[key])
  );
};

const toQuantityById = (products = []) =>
  new Map(products.map((product) => [product.id, Number(product.quantity)]));

const hasProductChanges = (initialProducts, products) => {
  const initialById = toQuantityById(initialProducts);
  const currentById = toQuantityById(products);
  if (initialById.size !== currentById.size) return true;
  return [...currentById].some(
    ([id, quantity]) => initialById.get(id) !== quantity
  );
};

/**
 * Indica si el formulario difiere del estado inicial (kit cargado al editar
 * o formulario vacio al crear). Funcion pura: no depende del orden de productos.
 */
export const hasUnsavedKitChanges = (initial, form, selectedProducts) =>
  hasFormChanges(initial?.form, form) ||
  hasProductChanges(initial?.selectedProducts, selectedProducts);
