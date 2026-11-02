import { useEffect, useMemo, useState } from "react";
import { fetchBranchNamesByProduct } from "../services/kitBranchCoverageService";

// Sucursales donde esta disponible cada producto local del kit, indexadas por id.
export const useKitProductBranches = (selectedProducts) => {
  const [branchesByProduct, setBranchesByProduct] = useState({});

  const localIdsKey = useMemo(
    () =>
      selectedProducts
        .filter((product) => product.is_global === false)
        .map((product) => product.id)
        .sort()
        .join(","),
    [selectedProducts]
  );

  useEffect(() => {
    if (!localIdsKey) return undefined;
    let cancelled = false;

    fetchBranchNamesByProduct(localIdsKey.split(","))
      .then((result) => {
        if (!cancelled) setBranchesByProduct(result);
      })
      .catch((error) => {
        console.error(
          "Error al cargar sucursales de productos locales:",
          error
        );
      });

    return () => {
      cancelled = true;
    };
  }, [localIdsKey]);

  return branchesByProduct;
};
