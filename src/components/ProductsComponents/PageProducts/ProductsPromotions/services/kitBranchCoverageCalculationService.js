// Devuelve las sucursales activas donde el producto no esta disponible.
// Una fila de branch_inventory con is_active=false cuenta como "no lo tiene".
export const computeMissingBranches = (activeBranches, inventoryRows) => {
  const coveredBranchIds = new Set(
    (inventoryRows || [])
      .filter((row) => row && row.is_active !== false)
      .map((row) => row.branch_id)
  );

  return (activeBranches || []).filter(
    (branch) => branch && !coveredBranchIds.has(branch.id)
  );
};

export const buildMissingBranchesMessage = (productName) =>
  `El producto "${productName}" es local y no está disponible en las sucursales listadas abajo. Podrás agregarlo al kit, pero esas sucursales no podrán surtirlo.`;

// Agrupa por producto los nombres de las sucursales activas donde esta disponible.
export const groupBranchNamesByProduct = (inventoryRows) => {
  const byProduct = {};
  (inventoryRows || []).forEach((row) => {
    if (!row || row.is_active === false) return;
    if (!row.branches || row.branches.is_active === false) return;
    if (!byProduct[row.product_id]) byProduct[row.product_id] = [];
    byProduct[row.product_id].push(row.branches.name);
  });
  Object.values(byProduct).forEach((names) => names.sort());
  return byProduct;
};
