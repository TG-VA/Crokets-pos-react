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

export const buildMissingBranchesMessage = (productName, missingBranches) => {
  const names = (missingBranches || [])
    .map((branch) => branch.name)
    .filter(Boolean)
    .join(", ");

  return `El producto "${productName}" es local y no está disponible en: ${names}. Podrás agregarlo al kit, pero esas sucursales no podrán surtirlo.`;
};
