import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const POLI_BRANCH_ID = "412f367f-7c86-45ca-9e91-b8fe6274b232";

const mapRowToProduct = (row) => {
  const product = row?.products ?? {};
  const barcode = (product?.barcode ?? "").toString().trim();
  const deptName = (product?.departments?.name ?? "").toString().trim();

  return {
    id: row?.product_id ?? null,
    codigo: barcode,
    descripcion: (product?.name ?? "").toString(),
    departamento: deptName,
    costo: Number(row?.cost_price ?? 0) || 0,
    precio: Number(row?.sale_price ?? 0) || 0,
    existencia: Number(row?.stock ?? 0) || 0,
    minimo: Number(row?.min_stock ?? 0) || 0,
    maximo: Number(row?.max_stock ?? 0) || 0,
    is_active: row?.is_active ?? null,
    branch_id: row?.branch_id ?? null,
    inventory_row_id: row?.id ?? null,
  };
};

export const useBranchInventory = () => {
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productsError, setProductsError] = useState("");
  const [productsErrorDetail, setProductsErrorDetail] = useState("");

  const fetchInventory = useCallback(async () => {
    setLoadingProducts(true);
    setProductsError("");
    setProductsErrorDetail("");

    try {
      const selectCandidates = [
        `
          id,
          branch_id,
          product_id,
          stock,
          min_stock,
          max_stock,
          is_active,
          cost_price,
          sale_price,
          products (
            id,
            barcode,
            name,
            department_id,
            departments (
              name
            ),
            sale_type
          )
        `,
        `
          id,
          branch_id,
          product_id,
          stock,
          min_stock,
          max_stock,
          is_active,
          cost_price,
          sale_price,
          products:product_id (
            id,
            barcode,
            name,
            department_id,
            departments (
              name
            ),
            sale_type
          )
        `,
      ];

      // Para pruebas locales: primero activos; si no hay, intenta todos.
      let rows = [];
      let lastError = null;

      for (const selectClause of selectCandidates) {
        const activeRes = await supabase
          .from("branch_inventory")
          .select(selectClause)
          .eq("branch_id", POLI_BRANCH_ID)
          .eq("is_active", true)
          .order("created_at", { ascending: false });

        if (activeRes.error) {
          lastError = activeRes.error;
          continue;
        }

        rows = activeRes.data ?? [];

        if (rows.length === 0) {
          const allRes = await supabase
            .from("branch_inventory")
            .select(selectClause)
            .eq("branch_id", POLI_BRANCH_ID)
            .order("created_at", { ascending: false });

          if (allRes.error) {
            lastError = allRes.error;
            continue;
          }

          rows = allRes.data ?? [];
        }

        lastError = null;
        break;
      }

      if (lastError) {
        throw lastError;
      }

      const mapped = rows
        .map(mapRowToProduct)
        .filter((p) => {
          const code = (p?.codigo ?? "").toString().trim();
          const name = (p?.descripcion ?? "").toString().trim();
          return code.length > 0 || name.length > 0;
        });

      setProducts(mapped);
    } catch (error) {
      setProducts([]);
      setProductsError("No se pudo cargar el inventario de la sucursal POLI.");
      setProductsErrorDetail(
        (error?.message ?? error?.details ?? error?.hint ?? "").toString()
      );
      console.error("Error cargando branch_inventory:", error);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const getProductByCodigo = useCallback(
    (codigo) => {
      const key = (codigo ?? "").toString().trim();
      if (!key) return null;
      return products.find((p) => (p?.codigo ?? "").toString().trim() === key) || null;
    },
    [products]
  );

  return {
    products,
    loadingProducts,
    productsError,
    productsErrorDetail,
    branchId: POLI_BRANCH_ID,
    reloadInventory: fetchInventory,
    getProductByCodigo,
  };
};
