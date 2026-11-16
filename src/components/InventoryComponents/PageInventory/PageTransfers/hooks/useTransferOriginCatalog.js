import { useCallback, useEffect, useState } from "react";

import { fetchBranchCatalog } from "../../../../../services/products/productCatalogService";
import { findProductByCodigo } from "../../../../../services/products/productLookupCalculationService";
import { isAdminBranch } from "../../../../../services/branchScopeCalculationService";

const EMPTY_PRODUCTS = [];
const LOAD_ERROR_MESSAGE = "Error al cargar productos de la sucursal origen";

const loadOriginCatalog = async (branchId) => {
  try {
    const result = await fetchBranchCatalog(branchId);
    if (result.success) {
      return { branchId, products: result.data.products, error: null };
    }
    console.error(
      "Error cargando productos de la sucursal origen:",
      result.error
    );
    return { branchId, products: EMPTY_PRODUCTS, error: LOAD_ERROR_MESSAGE };
  } catch (error) {
    console.error("Error cargando productos de la sucursal origen:", error);
    return { branchId, products: EMPTY_PRODUCTS, error: LOAD_ERROR_MESSAGE };
  }
};

/**
 * Catalogo con stock de la sucursal origen de un traspaso. Una terminal operativa usa el
 * catalogo de su sucursal (contexto); una terminal admin no tiene stock y carga el de la
 * sucursal operativa elegida como origen.
 */
const useTransferOriginCatalog = ({
  branch,
  originBranchId,
  contextCatalog,
}) => {
  const targetBranchId = isAdminBranch(branch) ? originBranchId : "";
  const [catalog, setCatalog] = useState({
    branchId: null,
    products: EMPTY_PRODUCTS,
    error: null,
  });

  useEffect(() => {
    if (!targetBranchId) return undefined;

    let cancelled = false;
    loadOriginCatalog(targetBranchId).then((nextCatalog) => {
      if (!cancelled) setCatalog(nextCatalog);
    });

    return () => {
      cancelled = true;
    };
  }, [targetBranchId]);

  const isCurrent =
    Boolean(targetBranchId) && catalog.branchId === targetBranchId;
  const products = isCurrent ? catalog.products : EMPTY_PRODUCTS;

  const getProductByCodigo = useCallback(
    (codigo) => findProductByCodigo(products, codigo),
    [products]
  );

  const refreshProducts = useCallback(async () => {
    if (!targetBranchId) return;
    setCatalog(await loadOriginCatalog(targetBranchId));
  }, [targetBranchId]);

  if (!isAdminBranch(branch)) return contextCatalog;

  return {
    products,
    getProductByCodigo,
    refreshProducts,
    loadingProducts: Boolean(targetBranchId) && !isCurrent,
    productsError: isCurrent ? catalog.error : null,
  };
};

export default useTransferOriginCatalog;
