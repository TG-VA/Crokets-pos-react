const isFilled = (value) => String(value ?? "").trim() !== "";

const isPositiveNumber = (value) =>
  isFilled(value) && Number.isFinite(Number(value)) && Number(value) > 0;

export const getMissingKitFields = (form, selectedProducts) => {
  if (!form) return ["formulario"];
  const missing = [];
  if (!isFilled(form.barcode)) missing.push("codigo");
  if (!isFilled(form.description)) missing.push("descripcion");
  if (!isPositiveNumber(form.price)) missing.push("precio");
  if (!isPositiveNumber(form.max_kits_per_sale))
    missing.push("limite por venta");
  // Una fecha vacia solo cuenta como "sin limite" si se marco la casilla.
  if (!isFilled(form.starts_on) && !form.no_starts_on)
    missing.push("vigente desde");
  if (!isFilled(form.ends_on) && !form.no_ends_on)
    missing.push("vigente hasta");
  if (!Array.isArray(selectedProducts) || selectedProducts.length === 0) {
    missing.push("productos");
  } else if (!selectedProducts.every((p) => isPositiveNumber(p.quantity))) {
    missing.push("cantidades");
  }
  return missing;
};

export const isKitFormComplete = (form, selectedProducts) =>
  getMissingKitFields(form, selectedProducts).length === 0;
