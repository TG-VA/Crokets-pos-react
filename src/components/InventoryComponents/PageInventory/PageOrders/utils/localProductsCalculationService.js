// Agrupa los productos locales (no globales) con las sucursales que los
// manejan. Funciones puras: no consultan la base ni dependen de React.

const getRelation = (value) => (Array.isArray(value) ? value[0] : value);

/**
 * Un producto local no tiene sucursal dueña propia: pertenece a las sucursales
 * donde tiene inventario. Devuelve una fila de catalogo por producto con los
 * nombres de esas sucursales, ordenados y sin repetir.
 */
export const groupLocalProductsByBranch = (rows = []) => {
  const productsById = new Map();

  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const product = getRelation(row?.products);
    const branch = getRelation(row?.branches);

    if (!product?.id || product.is_global === true) return;

    if (!productsById.has(product.id)) {
      productsById.set(product.id, {
        id: product.id,
        product_id: product.id,
        codigo: product.barcode || "",
        descripcion: String(product.name || "").toUpperCase(),
        departamento:
          getRelation(product.department)?.name || "Sin departamento",
        is_global: false,
        localBranchNames: [],
      });
    }

    const entry = productsById.get(product.id);

    if (branch?.name && !entry.localBranchNames.includes(branch.name)) {
      entry.localBranchNames.push(branch.name);
    }
  });

  return [...productsById.values()].map((entry) => ({
    ...entry,
    localBranchNames: [...entry.localBranchNames].sort((left, right) =>
      left.localeCompare(right, "es", { sensitivity: "base" })
    ),
  }));
};
