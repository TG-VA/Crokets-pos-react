import { useEffect, useState } from "react";

import { fetchLocalProductsCatalog } from "../services/localProductsCatalogService";

export const useLocalProductsCatalog = () => {
  const [localProducts, setLocalProducts] = useState([]);

  useEffect(() => {
    let cancelled = false;

    fetchLocalProductsCatalog()
      .then((rows) => {
        if (!cancelled) setLocalProducts(rows);
      })
      .catch((error) => {
        console.error("Error consultando productos locales:", error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return localProducts;
};
