/**
 * Resuelve el precio de venta efectivo de un producto en una sucursal.
 * Un sale_price de sucursal en 0 (o ausente/invalido) no es un override valido:
 * se usa el precio del catalogo (products.sale_price).
 * Retorna siempre un numero finito.
 */
export const resolveBranchSalePrice = (inventoryRow, product) => {
  const branchPrice = Number(inventoryRow?.sale_price);
  if (Number.isFinite(branchPrice) && branchPrice > 0) return branchPrice;

  const catalogPrice = Number(product?.sale_price);
  return Number.isFinite(catalogPrice) ? catalogPrice : 0;
};
