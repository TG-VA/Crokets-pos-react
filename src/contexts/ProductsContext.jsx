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
          has_been_stocked,
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
            created_at,
            updated_at
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
          created_at,
          updated_at
        `)
        .eq("is_global", true)
        .eq("status", true)
        .order("created_at", { ascending: true });

      if (globalProductsError) throw globalProductsError;

      const inventoryProductIds = new Set(
        (inventoryRows || [])
          .filter((row) => row.products?.status === true)
          .map((row) => row.product_id)
      );

      const formattedInventoryProducts = (inventoryRows || [])
        .filter((row) => row.products)
        .filter((row) => row.products.status === true)
        .map((row) => ({
          id: row.products.id,
          inventory_id: row.id,
          product_id: row.product_id,
          branch_id: row.branch_id,
          codigo: row.products.barcode || "",
          descripcion: (row.products.name || "").toUpperCase(),
          departamento:
            departmentsMap.get(row.products.department_id) ||
            "Sin departamento",
          costo: Number(row.cost_price ?? row.products.cost_price ?? 0),
          precio: Number(row.sale_price ?? row.products.sale_price ?? 0),
          ganancia: Number(row.products.profit ?? 0),
          existencia: Number(row.stock || 0),
          minimo: Number(row.min_stock || 0),
          maximo: Number(row.max_stock || 0),
          status: !!row.products.status,
          is_active: row.is_active ?? true,
          has_been_stocked: !!row.has_been_stocked,
          is_global: !!row.products.is_global,
          sale_type: row.products.sale_type || "unidad",
          unit: row.products.unit || "pieza",
          tax: Number(row.products.tax ?? 0),
          commission_enable: !!row.products.commission_enabled,
          commission_percent: Number(row.products.commission_percent ?? 0),
          cfdi: row.products.clave_sat || "",
          tracks_inventory: !!row.products.tracks_inventory,
          created_at: row.created_at || row.products.created_at,
          updated_at: row.updated_at || row.products.updated_at || null,
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
          departamento:
            departmentsMap.get(product.department_id) || "Sin departamento",
          costo: Number(product.cost_price ?? 0),
          precio: Number(product.sale_price ?? 0),
          ganancia: Number(product.profit ?? 0),
          existencia: 0,
          minimo: 0,
          maximo: 0,
          status: !!product.status,
          is_active: false,
          has_been_stocked: false,
          is_global: !!product.is_global,
          sale_type: product.sale_type || "unidad",
          unit: product.unit || "pieza",
          tax: Number(product.tax ?? 0),
          commission_enable: !!product.commission_enabled,
          commission_percent: Number(product.commission_percent ?? 0),
          cfdi: product.clave_sat || "",
          tracks_inventory: !!product.tracks_inventory,
          created_at: product.created_at || null,
          updated_at: product.updated_at || null,
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
        products.find((p) => (p?.codigo ?? "").toString().trim() === key) ||
        null
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
          .update({
            status: false,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id);

        if (error) throw error;

        await loadDepartments();
        await loadProducts();

        return true;
      } catch (error) {
        console.error("Error desactivando departamento:", error);
        return false;
      }
    },
    [loadDepartments, loadProducts]
  );

  const addProduct = useCallback(
    async (payload) => {
      if (!branch?.id) {
        return {
          success: false,
          error: "No hay sucursal activa.",
          partial: false,
        };
      }

      try {
        const cleanCodigo = (payload.codigo || "").trim();
        const cleanDescripcion = (payload.descripcion || "").trim();
        const cleanDepartamento = (payload.departamento || "").trim();

        if (!cleanCodigo || !cleanDescripcion) {
          return {
            success: false,
            error: "Código y descripción son obligatorios.",
            partial: false,
          };
        }

        const department = departments.find(
          (d) =>
            d.name.trim().toLowerCase() === cleanDepartamento.toLowerCase()
        );

        const departmentId = department?.id || null;
        const initialStock = Number(payload.existencia || 0);

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
            updated_at: new Date().toISOString(),
            is_kit: false,
          })
          .select("id")
          .single();

        if (productError) {
          const isDuplicateBarcode =
            productError.code === "23505" ||
            String(productError.message || "").includes(
              "products_barcode_key"
            );

          if (isDuplicateBarcode) {
            return {
              success: false,
              error:
                "Ya existe un producto registrado con ese código de barras. Puede estar activo o eliminado del catálogo.",
              partial: false,
            };
          }

          throw productError;
        }

        if (payload.use_inventory) {
          const { error: inventoryError } = await supabase
            .from("branch_inventory")
            .insert({
              branch_id: branch.id,
              product_id: productInserted.id,
              stock: initialStock,
              min_stock: Number(payload.minimo || 0),
              max_stock: Number(payload.maximo || 0),
              is_active: payload.status === "activo",
              has_been_stocked: initialStock > 0,
              cost_price: Number(payload.costo || 0),
              sale_price: Number(payload.precio || 0),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });

          if (inventoryError) {
            console.error(
              "Error creando inventario de sucursal:",
              inventoryError
            );

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
          error: error.message || "Error al crear producto.",
          partial: false,
        };
      }
    },
    [branch?.id, departments, loadProducts]
  );

  const updateProductByCodigo = useCallback(
    async (codigoOriginal, payload) => {
      if (!branch?.id) {
        return {
          success: false,
          error: "No hay sucursal activa.",
        };
      }

      try {
        const cleanCodigoOriginal = (codigoOriginal || "").trim();
        const cleanCodigo = (payload.codigo || "").trim();
        const cleanDescripcion = (payload.descripcion || "").trim();
        const cleanDepartamento = (payload.departamento || "").trim();

        if (!cleanCodigoOriginal) {
          return {
            success: false,
            error: "No se recibió el código original del producto.",
          };
        }

        if (!cleanCodigo || !cleanDescripcion) {
          return {
            success: false,
            error: "Código y descripción son obligatorios.",
          };
        }

        const { data: currentProduct, error: currentProductError } =
          await supabase
            .from("products")
            .select("id, barcode")
            .eq("barcode", cleanCodigoOriginal)
            .maybeSingle();

        if (currentProductError) throw currentProductError;

        if (!currentProduct) {
          return {
            success: false,
            error: "Producto no encontrado.",
          };
        }

        if (cleanCodigo !== cleanCodigoOriginal) {
          const { data: duplicatedProduct, error: duplicatedError } =
            await supabase
              .from("products")
              .select("id")
              .eq("barcode", cleanCodigo)
              .neq("id", currentProduct.id)
              .maybeSingle();

          if (duplicatedError) throw duplicatedError;

          if (duplicatedProduct) {
            return {
              success: false,
              error: "Ya existe otro producto con ese código de barras.",
            };
          }
        }

        const department = departments.find(
          (d) =>
            d.name.trim().toLowerCase() === cleanDepartamento.toLowerCase()
        );

        const departmentId = department?.id || null;

        const costPrice = Number(payload.costo || 0);
        const salePrice = Number(payload.precio || 0);
        const tracksInventory = !!payload.use_inventory;

        const { error: productUpdateError } = await supabase
          .from("products")
          .update({
            barcode: cleanCodigo,
            name: cleanDescripcion,
            department_id: departmentId,
            sale_type: payload.sale_type || "unidad",
            unit: payload.unit || "pieza",
            tax: Number(payload.tax || 0),
            cost_price: costPrice,
            sale_price: salePrice,
            commission_enabled: !!payload.commission_enable,
            commission_percent: Number(payload.commission_percent || 0),
            clave_sat: payload.cfdi ? payload.cfdi.trim() : null,
            status: payload.status === "activo",
            is_global: !!payload.isGlobal,
            tracks_inventory: tracksInventory,
            updated_at: new Date().toISOString(),
          })
          .eq("id", currentProduct.id);

        if (productUpdateError) throw productUpdateError;

        const { data: inventoryRow, error: inventoryFetchError } =
          await supabase
            .from("branch_inventory")
            .select("id, stock, has_been_stocked")
            .eq("branch_id", branch.id)
            .eq("product_id", currentProduct.id)
            .maybeSingle();

        if (inventoryFetchError) throw inventoryFetchError;

        if (tracksInventory) {
          const currentStock = Number(inventoryRow?.stock || 0);

          const inventoryPayload = {
            branch_id: branch.id,
            product_id: currentProduct.id,
            min_stock: Number(payload.minimo || 0),
            max_stock: Number(payload.maximo || 0),
            is_active: payload.status === "activo",
            has_been_stocked:
              !!inventoryRow?.has_been_stocked || currentStock > 0,
            cost_price: costPrice,
            sale_price: salePrice,
            updated_at: new Date().toISOString(),
          };

          if (inventoryRow?.id) {
            const { error: inventoryUpdateError } = await supabase
              .from("branch_inventory")
              .update(inventoryPayload)
              .eq("id", inventoryRow.id);

            if (inventoryUpdateError) throw inventoryUpdateError;
          } else {
            const { error: inventoryInsertError } = await supabase
              .from("branch_inventory")
              .insert({
                ...inventoryPayload,
                stock: 0,
                has_been_stocked: false,
                created_at: new Date().toISOString(),
              });

            if (inventoryInsertError) throw inventoryInsertError;
          }
        } else if (inventoryRow?.id) {
          const { error: inventoryDisableError } = await supabase
            .from("branch_inventory")
            .update({
              is_active: false,
              min_stock: 0,
              max_stock: 0,
              updated_at: new Date().toISOString(),
            })
            .eq("id", inventoryRow.id);

          if (inventoryDisableError) throw inventoryDisableError;
        }

        await loadProducts();

        return {
          success: true,
          error: null,
        };
      } catch (error) {
        console.error("Error actualizando producto:", error);

        return {
          success: false,
          error: error.message || "Error al actualizar producto.",
        };
      }
    },
    [branch?.id, departments, loadProducts]
  );

  const getProductDiscountByProductId = useCallback(async (productId) => {
    if (!productId) {
      return {
        success: false,
        data: null,
        error: "No se recibió el producto.",
      };
    }

    try {
      const { data, error } = await supabase
        .from("product_discounts")
        .select(`
          id,
          product_id,
          enabled,
          discount_percent,
          discount_concept,
          created_at,
          updated_at
        `)
        .eq("product_id", productId)
        .maybeSingle();

      if (error) throw error;

      return {
        success: true,
        data: data || null,
        error: null,
      };
    } catch (error) {
      console.error("Error cargando descuento del producto:", error);

      return {
        success: false,
        data: null,
        error: error.message || "Error al cargar descuento del producto.",
      };
    }
  }, []);

  const upsertProductDiscount = useCallback(
    async (productId, payload) => {
      if (!productId) {
        return {
          success: false,
          error: "No se recibió el producto.",
        };
      }

      try {
        const enabled = !!payload.enabled;
        const discountPercent = enabled
          ? Number(payload.discount_percent || 0)
          : 0;
        const discountConcept = enabled
          ? (payload.discount_concept || "").trim()
          : "";

        const { error } = await supabase.from("product_discounts").upsert(
          {
            product_id: productId,
            enabled,
            discount_percent: discountPercent,
            discount_concept: discountConcept || null,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "product_id",
          }
        );

        if (error) throw error;

        await loadProducts();

        return {
          success: true,
          error: null,
        };
      } catch (error) {
        console.error("Error guardando descuento del producto:", error);

        return {
          success: false,
          error: error.message || "Error al guardar descuento del producto.",
        };
      }
    },
    [loadProducts]
  );

  const deleteProductByCodigo = useCallback(
    async (codigo) => {
      if (!codigo) {
        return {
          success: false,
          error: "No se recibió el código del producto.",
        };
      }

      try {
        const cleanCodigo = codigo.toString().trim();

        const { data: product, error: productFetchError } = await supabase
          .from("products")
          .select("id, barcode, name, status")
          .eq("barcode", cleanCodigo)
          .maybeSingle();

        if (productFetchError) throw productFetchError;

        if (!product) {
          return {
            success: false,
            error: "Producto no encontrado.",
          };
        }

        const now = new Date().toISOString();

        const { error: productUpdateError } = await supabase
          .from("products")
          .update({
            status: false,
            updated_at: now,
          })
          .eq("id", product.id);

        if (productUpdateError) throw productUpdateError;

        const { error: inventoryUpdateError } = await supabase
          .from("branch_inventory")
          .update({
            is_active: false,
            updated_at: now,
          })
          .eq("product_id", product.id);

        if (inventoryUpdateError) throw inventoryUpdateError;

        const { error: discountUpdateError } = await supabase
          .from("product_discounts")
          .update({
            enabled: false,
            updated_at: now,
          })
          .eq("product_id", product.id);

        if (discountUpdateError) throw discountUpdateError;

        await loadProducts();

        return {
          success: true,
          error: null,
        };
      } catch (error) {
        console.error("Error eliminando producto:", error);

        return {
          success: false,
          error: error.message || "Error al eliminar producto.",
        };
      }
    },
    [loadProducts]
  );

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
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "product_discounts",
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
      getProductDiscountByProductId,
      upsertProductDiscount,
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
      getProductDiscountByProductId,
      upsertProductDiscount,
    ]
  );

  return (
    <ProductsContext.Provider value={value}>
      {children}
    </ProductsContext.Provider>
  );
};