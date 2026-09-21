/**
 * productModifyDataService.js
 * Consultas y mutaciones del formulario de modificacion de producto.
 * DIP: recibe los callbacks de persistencia del contexto, no importa supabase.
 */

import { getDiscountPriceFromPercent } from "./productModifyCalculationService";

/**
 * Aisla la consulta del descuento asociado a un producto y devuelve sus
 * valores normalizados para alimentar el formulario.
 */
export const loadProductDiscountData = async (
  productId,
  salePrice,
  getProductDiscountByProductId
) => {
  if (!productId) {
    return {
      success: false,
      discount: null,
      error: "No se recibió el producto.",
    };
  }

  try {
    const result = await getProductDiscountByProductId(productId);

    if (!result?.success) {
      return {
        success: false,
        discount: null,
        error: result?.error || "No se pudo cargar el descuento.",
      };
    }

    const discount = result.data || {};
    const enabled = !!discount.enabled;
    const discountPercent = Number(discount.discount_percent ?? 0);

    return {
      success: true,
      discount: {
        enabled,
        discount_percent: discountPercent,
        discount_concept: discount.discount_concept || "",
        discount_price: enabled
          ? getDiscountPriceFromPercent(salePrice, discountPercent)
          : "",
      },
      error: null,
    };
  } catch (error) {
    console.error("Error cargando descuento del producto:", error);

    return {
      success: false,
      discount: null,
      error: error.message || "Error al cargar descuento del producto.",
    };
  }
};

/**
 * Orquesta la actualizacion del producto y su descuento devolviendo un
 * resultado normalizado `{ success, error, partial }`.
 */
export const saveProductModifications = async ({
  updateProductByCodigo,
  upsertProductDiscount,
  selectedProduct,
  payload,
  discountPayload,
}) => {
  try {
    const productResult = await updateProductByCodigo(
      selectedProduct.codigo,
      payload
    );

    if (!productResult?.success) {
      return {
        success: false,
        error: productResult?.error || "No se pudo actualizar el producto.",
        partial: false,
      };
    }

    const discountResult = await upsertProductDiscount(
      selectedProduct.id,
      discountPayload
    );

    if (!discountResult?.success) {
      return {
        success: false,
        error:
          discountResult?.error ||
          "El producto se modificó, pero no se pudo guardar el descuento.",
        partial: true,
      };
    }

    return { success: true, error: null, partial: false };
  } catch (error) {
    console.error("Error guardando modificaciones del producto:", error);

    return {
      success: false,
      error: error.message || "No se pudo actualizar el producto.",
      partial: false,
    };
  }
};
