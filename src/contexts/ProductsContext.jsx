import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { supabase } from "../lib/supabaseClient";
import { useBranch } from "./BranchContext";
import {
  fetchDepartments,
  fetchBranchCatalog,
} from "../services/products/productCatalogService";
import {
  createProduct,
  updateProductByCodigo as updateProductByCodigoService,
  deleteProductByCodigo as deleteProductByCodigoService,
} from "../services/products/productCrudService";
import {
  createDepartment as createDepartmentService,
  updateDepartment as updateDepartmentService,
} from "../services/products/departmentService";
import {
  fetchProductDiscount,
  upsertProductDiscount as upsertProductDiscountService,
} from "../services/products/productDiscountService";

const ProductsContext = createContext(null);

export const useProducts = () => {
  const context = useContext(ProductsContext);

  if (!context) {
    throw new Error("useProducts debe usarse dentro de ProductsProvider");
  }

  return context;
};

export const ProductsProvider = ({ children }) => {
  const { branch } = useBranch();

  const [products, setProducts] = useState([]);
  const [kardexProducts, setKardexProducts] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productsError, setProductsError] = useState(null);

  const productsChannelRef = useRef(null);
  const reloadTimeoutRef = useRef(null);

  const loadDepartments = useCallback(async () => {
    try {
      const data = await fetchDepartments();
      setDepartments(data);
    } catch (error) {
      console.error("Error cargando departamentos:", error);
      setDepartments([]);
    }
  }, []);

  const loadProducts = useCallback(async () => {
    if (!branch?.id) {
      setProducts([]);
      setKardexProducts([]);
      return;
    }

    try {
      setLoadingProducts(true);
      setProductsError(null);

      const catalog = await fetchBranchCatalog(branch.id);

      setKardexProducts(catalog.kardexProducts);
      setProducts(catalog.products);
    } catch (error) {
      console.error("Error cargando productos:", error);
      setProducts([]);
      setKardexProducts([]);
      setProductsError(error.message || "Error al cargar productos");
    } finally {
      setLoadingProducts(false);
    }
  }, [branch?.id]);

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const refreshProducts = useCallback(async () => {
    await loadProducts();
  }, [loadProducts]);

  const refreshDepartments = useCallback(async () => {
    await loadDepartments();
  }, [loadDepartments]);

  const getProductByCodigo = useCallback(
    (codigo) => {
      const key = (codigo ?? "").toString().trim();

      if (!key) return null;

      return (
        products.find((p) => (p?.codigo ?? "").toString().trim() === key) ||
        null
      );
    },
    [products]
  );

  const addDepartment = useCallback(
    async (name, commissionData = {}) => {
      const created = await createDepartmentService(name, commissionData);

      if (created) {
        await loadDepartments();
      }

      return created;
    },
    [loadDepartments]
  );

  const updateDepartment = useCallback(
    async (id, data) => {
      const updated = await updateDepartmentService(id, data);

      if (updated) {
        await loadDepartments();
        await loadProducts();
      }

      return updated;
    },
    [loadDepartments, loadProducts]
  );

  const addProduct = useCallback(
    async (payload) => {
      const result = await createProduct(branch?.id, departments, payload);

      if (result.success) {
        await loadProducts();
      }

      return result;
    },
    [branch?.id, departments, loadProducts]
  );

  const updateProductByCodigo = useCallback(
    async (codigoOriginal, payload) => {
      const result = await updateProductByCodigoService(
        branch?.id,
        departments,
        codigoOriginal,
        payload
      );

      if (result.success) {
        await loadProducts();
      }

      return result;
    },
    [branch?.id, departments, loadProducts]
  );

  const deleteProductByCodigo = useCallback(
    async (codigo) => {
      const result = await deleteProductByCodigoService(codigo);

      if (result.success) {
        await loadProducts();
      }

      return result;
    },
    [loadProducts]
  );

  const upsertProductDiscount = useCallback(
    async (productId, payload) => {
      const result = await upsertProductDiscountService(productId, payload);

      if (result.success) {
        await loadProducts();
      }

      return result;
    },
    [loadProducts]
  );

  const scheduleProductsReload = useCallback(() => {
    if (reloadTimeoutRef.current) {
      clearTimeout(reloadTimeoutRef.current);
    }

    reloadTimeoutRef.current = setTimeout(() => {
      loadProducts();
    }, 500);
  }, [loadProducts]);

  useEffect(() => {
    if (!branch?.id) return;

    if (productsChannelRef.current) {
      supabase.removeChannel(productsChannelRef.current);
      productsChannelRef.current = null;
    }

    const channel = supabase
      .channel(`products-realtime-${branch.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "products",
        },
        scheduleProductsReload
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "branch_inventory",
          filter: `branch_id=eq.${branch.id}`,
        },
        scheduleProductsReload
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "product_discounts",
        },
        scheduleProductsReload
      )
      .subscribe();

    productsChannelRef.current = channel;

    return () => {
      if (reloadTimeoutRef.current) {
        clearTimeout(reloadTimeoutRef.current);
        reloadTimeoutRef.current = null;
      }

      if (productsChannelRef.current) {
        supabase.removeChannel(productsChannelRef.current);
        productsChannelRef.current = null;
      }
    };
  }, [branch?.id, scheduleProductsReload]);

  const value = useMemo(
    () => ({
      products,
      kardexProducts,
      departments,
      loadingProducts,
      productsError,
      refreshProducts,
      refreshDepartments,
      getProductByCodigo,
      addProduct,
      updateProductByCodigo,
      deleteProductByCodigo,
      addDepartment,
      updateDepartment,
      getProductDiscountByProductId: fetchProductDiscount,
      upsertProductDiscount,
    }),
    [
      products,
      kardexProducts,
      departments,
      loadingProducts,
      productsError,
      refreshProducts,
      refreshDepartments,
      getProductByCodigo,
      addProduct,
      updateProductByCodigo,
      deleteProductByCodigo,
      addDepartment,
      updateDepartment,
      fetchProductDiscount,
      upsertProductDiscount,
    ]
  );

  return (
    <ProductsContext.Provider value={value}>
      {children}
    </ProductsContext.Provider>
  );
};