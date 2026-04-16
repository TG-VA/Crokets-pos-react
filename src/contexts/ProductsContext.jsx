import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "../lib/supabaseClient";
import { useBranch } from "./BranchContext";

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
  const [departments, setDepartments] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [productsError, setProductsError] = useState(null);
  const [departmentsError, setDepartmentsError] = useState(null);

  const loadDepartments = useCallback(async () => {
    try {
      setLoadingDepartments(true);
      setDepartmentsError(null);

      const { data, error } = await supabase
        .from("departments")
        .select("id, name, status, created_at, updated_at")
        .order("name", { ascending: true });

      if (error) throw error;

      setDepartments(data || []);
    } catch (error) {
      console.error("Error cargando departamentos:", error);
      setDepartments([]);
      setDepartmentsError(error.message || "Error al cargar departamentos");
    } finally {
      setLoadingDepartments(false);
    }
  }, []);

  const loadProducts = useCallback(async () => {
    if (!branch?.id) {
      setProducts([]);
      return;
    }

    try {
      setLoadingProducts(true);
      setProductsError(null);

      const { data: inventoryRows, error: inventoryError } = await supabase
        .from("branch_inventory")
        .select(`
          id,
          branch_id,
          product_id,
          stock,
          min_stock,
          max_stock,
          is_active,
          cost_price,
          sale_price,
          created_at,
          updated_at,
          products (
            id,
            barcode,
            name,
            department_id,
            status
          )
        `)
        .eq("branch_id", branch.id)
        .eq("is_active", true)
        .order("created_at", { ascending: true });

      if (inventoryError) throw inventoryError;

      const { data: departmentsData, error: departmentsFetchError } = await supabase
        .from("departments")
        .select("id, name");

      if (departmentsFetchError) throw departmentsFetchError;

      const departmentsMap = new Map(
        (departmentsData || []).map((dept) => [dept.id, dept.name])
      );

      const formattedProducts = (inventoryRows || [])
        .filter((row) => row.products)
        .map((row) => ({
          id: row.products.id,
          inventory_id: row.id,
          product_id: row.product_id,
          branch_id: row.branch_id,
          codigo: row.products.barcode || "",
          descripcion: (row.products.name || "").toUpperCase(),
          departamento: departmentsMap.get(row.products.department_id) || "",
          costo: Number(row.cost_price || 0),
          precio: Number(row.sale_price || 0),
          existencia: Number(row.stock || 0),
          minimo: Number(row.min_stock || 0),
          maximo: Number(row.max_stock || 0),
          status: row.products.status,
          is_active: row.is_active,
          created_at: row.created_at,
          updated_at: row.updated_at,
        }));

      setProducts(formattedProducts);
    } catch (error) {
      console.error("Error cargando productos:", error);
      setProducts([]);
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
        products.find((p) => (p?.codigo ?? "").toString().trim() === key) || null
      );
    },
    [products]
  );

  // ==========================================
  // FUNCIONES DE DEPARTAMENTOS
  // ==========================================
  const addDepartment = useCallback(
    async (name) => {
      const cleanName = (name || "").trim();
      if (!cleanName) return false;

      try {
        const { error } = await supabase.from("departments").insert({
          name: cleanName,
          status: true,
        });

        if (error) throw error;

        await loadDepartments();
        return true;
      } catch (error) {
        console.error("Error agregando departamento:", error);
        return false;
      }
    },
    [loadDepartments]
  );

  const updateDepartment = useCallback(
    async (id, data) => {
      if (!id || !data) return false;

      try {
        const payload = {};

        if (typeof data.name === "string") {
          payload.name = data.name.trim();
        }

        if (typeof data.status === "boolean") {
          payload.status = data.status;
        }

        payload.updated_at = new Date().toISOString();

        const { error } = await supabase
          .from("departments")
          .update(payload)
          .eq("id", id);

        if (error) throw error;

        await loadDepartments();
        await loadProducts();
        return true;
      } catch (error) {
        console.error("Error actualizando departamento:", error);
        return false;
      }
    },
    [loadDepartments, loadProducts]
  );

  const deleteDepartment = useCallback(
    async (id) => {
      if (!id) return false;

      try {
        const { error } = await supabase
          .from("departments")
          .delete()
          .eq("id", id);

        if (error) throw error;

        await loadDepartments();
        await loadProducts();
        return true;
      } catch (error) {
        console.error("Error eliminando departamento:", error);
        return false;
      }
    },
    [loadDepartments, loadProducts]
  );

  // ==========================================
  // PLACEHOLDERS DE PRODUCTOS
  // ==========================================
  // Se dejan para no romper componentes viejos.
  // La lista ya funciona desde BD.
  // Si luego quieres, te conecto alta/modificación/eliminación reales.
  const addProduct = useCallback(async () => {
    console.warn(
      "addProduct aún no está conectado a Supabase desde este contexto."
    );
    return false;
  }, []);

  const updateProductByCodigo = useCallback(async () => {
    console.warn(
      "updateProductByCodigo aún no está conectado a Supabase desde este contexto."
    );
    return false;
  }, []);

  const deleteProductByCodigo = useCallback(async () => {
    console.warn(
      "deleteProductByCodigo aún no está conectado a Supabase desde este contexto."
    );
    return false;
  }, []);

  const value = useMemo(
    () => ({
      products,
      departments,
      loadingProducts,
      loadingDepartments,
      productsError,
      departmentsError,
      refreshProducts,
      refreshDepartments,
      getProductByCodigo,

      addProduct,
      updateProductByCodigo,
      deleteProductByCodigo,

      addDepartment,
      updateDepartment,
      deleteDepartment,
    }),
    [
      products,
      departments,
      loadingProducts,
      loadingDepartments,
      productsError,
      departmentsError,
      refreshProducts,
      refreshDepartments,
      getProductByCodigo,
      addProduct,
      updateProductByCodigo,
      deleteProductByCodigo,
      addDepartment,
      updateDepartment,
      deleteDepartment,
    ]
  );

  return (
    <ProductsContext.Provider value={value}>
      {children}
    </ProductsContext.Provider>
  );
};