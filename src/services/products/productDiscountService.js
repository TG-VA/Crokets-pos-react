import { supabase } from "../../lib/supabaseClient";

export const fetchProductDiscount = async (productId) => {
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
};

export const upsertProductDiscount = async (productId, payload) => {
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
};
