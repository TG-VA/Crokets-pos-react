import { supabase } from "../../lib/supabaseClient";

export const createProduct = async (branchId, departments, payload) => {
  if (!branchId) {
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

    const department = (departments || []).find(
      (d) => d.name.trim().toLowerCase() === cleanDepartamento.toLowerCase()
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
        commission_enabled: !!payload.commission_enabled,
        commission_percent: Number(payload.commission_percent || 0),
        commission_type: payload.commission_type || "percent",
        commission_value: Number(payload.commission_value || 0),
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
        String(productError.message || "").includes("products_barcode_key");

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
          branch_id: branchId,
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
};

export const updateProductByCodigo = async (
  branchId,
  departments,
  codigoOriginal,
  payload
) => {
  if (!branchId) {
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

    const department = (departments || []).find(
      (d) => d.name.trim().toLowerCase() === cleanDepartamento.toLowerCase()
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
        commission_enabled: !!payload.commission_enabled,
        commission_percent: Number(payload.commission_percent || 0),
        commission_type: payload.commission_type || "percent",
        commission_value: Number(payload.commission_value || 0),
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
        .eq("branch_id", branchId)
        .eq("product_id", currentProduct.id)
        .maybeSingle();

    if (inventoryFetchError) throw inventoryFetchError;

    if (tracksInventory) {
      const currentStock = Number(inventoryRow?.stock || 0);

      const inventoryPayload = {
        branch_id: branchId,
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
};

export const deleteProductByCodigo = async (codigo) => {
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
};