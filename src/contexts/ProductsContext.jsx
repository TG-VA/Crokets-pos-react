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

  const productsChannelRef = useRef(null);

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

      const { data: departmentsData, error: departmentsFetchError } =
        await supabase.from("departments").select("id, name");

      if (departmentsFetchError) throw departmentsFetchError;

      const departmentsMap = new Map(
        (departmentsData || []).map((dept) => [dept.id, dept.name])
      );

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
            status,
            is_global,
            sale_type,
            unit,
            tax,
            cost_price,
            sale_price,
            profit,
            commission_enabled,
            commission_percent,
            clave_sat,
            tracks_inventory,
            created_at
          )
        `)
        .eq("branch_id", branch.id)
        .order("created_at", { ascending: true });

      if (inventoryError) throw inventoryError;

      const { data: globalProducts, error: globalProductsError } = await supabase
        .from("products")
        .select(`
          id,
          barcode,
          name,
          department_id,
          status,
          is_global,
          sale_type,
          unit,
          tax,
          cost_price,
          sale_price,
          profit,
          commission_enabled,
          commission_percent,
          clave_sat,
          tracks_inventory,
          created_at
        `)
        .eq("is_global", true)
        .order("created_at", { ascending: true });

      if (globalProductsError) throw globalProductsError;

      const inventoryProductIds = new Set(
        (inventoryRows || []).map((row) => row.product_id)
      );

      const formattedInventoryProducts = (inventoryRows || [])
        .filter((row) => row.products)
        .map((row) => ({
          id: row.products.id,
          inventory_id: row.id,
          product_id: row.product_id,
          branch_id: row.branch_id,
          codigo: row.products.barcode || "",
          descripcion: (row.products.name || "").toUpperCase(),
          departamento: departmentsMap.get(row.products.department_id) || "",
          costo: Number(row.cost_price ?? row.products.cost_price ?? 0),
          precio: Number(row.sale_price ?? row.products.sale_price ?? 0),
          ganancia: Number(row.products.profit ?? 0),
          existencia: Number(row.stock || 0),
          minimo: Number(row.min_stock || 0),
          maximo: Number(row.max_stock || 0),
          status: !!row.products.status,
          is_active: row.is_active ?? true,
          is_global: !!row.products.is_global,
          sale_type: row.products.sale_type || "unidad",
          unit: row.products.unit || "pieza",
          tax: Number(row.products.tax ?? 0),
          commission_enable: !!row.products.commission_enabled,
          commission_percent: Number(row.products.commission_percent ?? 0),
          cfdi: row.products.clave_sat || "",
          tracks_inventory: !!row.products.tracks_inventory,
          created_at: row.created_at || row.products.created_at,
          updated_at: row.updated_at || null,
          use_inventory: !!row.products.tracks_inventory,
        }));

      const formattedGlobalProductsWithoutInventory = (globalProducts || [])
        .filter((product) => !inventoryProductIds.has(product.id))
        .map((product) => ({
          id: product.id,
          inventory_id: null,
          product_id: product.id,
          branch_id: branch.id,
          codigo: product.barcode || "",
          descripcion: (product.name || "").toUpperCase(),
          departamento: departmentsMap.get(product.department_id) || "",
          costo: Number(product.cost_price ?? 0),
          precio: Number(product.sale_price ?? 0),
          ganancia: Number(product.profit ?? 0),
          existencia: 0,
          minimo: 0,
          maximo: 0,
          status: !!product.status,
          is_active: false,
          is_global: !!product.is_global,
          sale_type: product.sale_type || "unidad",
          unit: product.unit || "pieza",
          tax: Number(product.tax ?? 0),
          commission_enable: !!product.commission_enabled,
          commission_percent: Number(product.commission_percent ?? 0),
          cfdi: product.clave_sat || "",
          tracks_inventory: !!product.tracks_inventory,
          created_at: product.created_at || null,
          updated_at: null,
          use_inventory: !!product.tracks_inventory,
        }));

      setProducts([
        ...formattedInventoryProducts,
        ...formattedGlobalProductsWithoutInventory,
      ]);
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

  const addProduct = useCallback(
    async (payload) => {
      if (!branch?.id) {
        console.error("No hay sucursal activa");
        return {
          success: false,
          error: "No hay sucursal activa",
        };
      }

      try {
        const cleanCodigo = (payload.codigo || "").trim();
        const cleanDescripcion = (payload.descripcion || "").trim();
        const cleanDepartamento = (payload.departamento || "").trim();

        if (!cleanCodigo || !cleanDescripcion) {
          return {
            success: false,
            error: "Código y descripción son obligatorios",
          };
        }

        const department = departments.find(
          (d) => d.name.trim().toLowerCase() === cleanDepartamento.toLowerCase()
        );

        const departmentId = department?.id || null;

        const { data: productInserted, error: productError } = await supabase
          .from("products")
          .insert({
            barcode: cleanCodigo,
            name: cleanDescripcion,
            sale_type: payload.sale_type || "unidad",
            department_id: departmentId,
            unit: payload.unit || "pieza",
            cost_price: Number(payload.costo || 0),
            sale_price: Number(payload.precio || 0),
            tax: Number(payload.tax || 0),
            commission_enabled: !!payload.commission_enable,
            commission_percent: Number(payload.commission_percent || 0),
            clave_sat: payload.cfdi ? payload.cfdi.trim() : null,
            status: payload.status === "activo",
            is_global: !!payload.isGlobal,
            tracks_inventory: !!payload.use_inventory,
            created_at: payload.created_at
              ? new Date(payload.created_at).toISOString()
              : new Date().toISOString(),
            is_kit: false,
          })
          .select("id")
          .single();

        if (productError) {
          throw productError;
        }

        if (payload.use_inventory) {
          const { error: inventoryError } = await supabase
            .from("branch_inventory")
            .insert({
              branch_id: branch.id,
              product_id: productInserted.id,
              stock: Number(payload.existencia || 0),
              min_stock: Number(payload.minimo || 0),
              max_stock: Number(payload.maximo || 0),
              is_active: payload.status === "activo",
              cost_price: Number(payload.costo || 0),
              sale_price: Number(payload.precio || 0),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });

          if (inventoryError) {
            console.error("Error creando inventario de sucursal:", inventoryError);

            return {
              success: false,
              error:
                inventoryError.message ||
                "El producto se creó, pero no se pudo crear su inventario en la sucursal.",
              partial: true,
            };
          }
        }

        await loadProducts();

        return {
          success: true,
          error: null,
          partial: false,
        };
      } catch (error) {
        console.error("Error creando producto:", error);

        return {
          success: false,
          error: error.message || "Error al crear producto",
          partial: false,
        };
      }
    },
    [branch?.id, departments, loadProducts]
  );

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
        async () => {
          await loadProducts();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "branch_inventory",
        },
        async () => {
          await loadProducts();
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("Realtime de productos activo");
        }
      });

    productsChannelRef.current = channel;

    return () => {
      if (productsChannelRef.current) {
        supabase.removeChannel(productsChannelRef.current);
        productsChannelRef.current = null;
      }
    };
  }, [branch?.id, loadProducts]);

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