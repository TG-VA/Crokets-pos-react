import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useBranch } from "./BranchContext";
import { useProductsRealtime } from "../hooks/useProductsRealtime";
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

  const loadDepartments = useCallback(async () => {
    const result = await fetchDepartments();

    if (result.success) {
      setDepartments(result.data);
      return;
    }

    console.error("Error cargando departamentos:", result.error);
    setDepartments([]);
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

      const result = await fetchBranchCatalog(branch.id);

      if (result.success) {
        setKardexProducts(result.data.kardexProducts);
        setProducts(result.data.products);
        return;
      }

      console.error("Error cargando productos:", result.error);
      setProducts([]);
      setKardexProducts([]);
      setProductsError(result.error || "Error al cargar productos");
    } catch (error) {
      console.error("Error cargando productos:", error);
      setProducts([]);
      setKardexProducts([]);
      setProductsError(error.message || "Error al cargar productos");
    } finally {
      setLoadingProducts(false);
    }
  }, [branch?.id]);

  const { markLocalMutation } = useProductsRealtime(branch?.id, loadProducts);

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
      const result = await createDepartmentService(name, commissionData);

      if (result.success) {
        await loadDepartments();
      }

      return result;
    },
    [loadDepartments]
  );

  const updateDepartment = useCallback(
    async (id, data) => {
      const result = await updateDepartmentService(id, data);

      if (result.success) {
        if (data?.propagateToProducts) {
          markLocalMutation();
        }

        await loadDepartments();
        await loadProducts();
      }

      return result;
    },
    [loadDepartments, loadProducts, markLocalMutation]
  );

  const addProduct = useCallback(
    async (payload) => {
      const result = await createProduct(branch?.id, departments, payload);

      if (result.success) {
        markLocalMutation();
        await loadProducts();
      }

      return result;
    },
    [branch?.id, departments, loadProducts, markLocalMutation]
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
        markLocalMutation();
        await loadProducts();
      }

      return result;
    },
    [branch?.id, departments, loadProducts, markLocalMutation]
  );

  const deleteProductByCodigo = useCallback(
    async (codigo) => {
      const result = await deleteProductByCodigoService(codigo);

      if (result.success) {
        markLocalMutation();
        await loadProducts();
      }

      return result;
    },
    [loadProducts, markLocalMutation]
  );

  const upsertProductDiscount = useCallback(
    async (productId, payload) => {
      const result = await upsertProductDiscountService(productId, payload);

      if (result.success) {
        markLocalMutation();
        await loadProducts();
      }

      return result;
    },
    [loadProducts, markLocalMutation]
  );

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
