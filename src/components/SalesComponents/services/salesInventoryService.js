import { supabase } from "../../../lib/supabaseClient";

const getProductDisplayName = (product) => product?.name || product?.barcode || "Producto";

export const getBranchInventoryRow = async ({ branchId, productId }) => {
  if (!branchId) throw new Error("No se detectó la sucursal.");
  if (!productId) throw new Error("No se detectó el producto.");

  const { data, error } = await supabase
    .from("branch_inventory")
    .select("stock, is_active, has_been_stocked, cost_price, sale_price")
    .eq("branch_id", branchId)
    .eq("product_id", productId)
    .maybeSingle();

  if (error) throw error;
  return data || null;
};

export const getBranchInventoryRows = async ({ branchId, productIds = [] }) => {
  if (!branchId) throw new Error("No se detectó la sucursal.");

  const normalizedProductIds = [...new Set(productIds.filter(Boolean))];
  if (!normalizedProductIds.length) return [];

  const { data, error } = await supabase
    .from("branch_inventory")
    .select("product_id, stock, is_active, has_been_stocked, cost_price, sale_price")
    .eq("branch_id", branchId)
    .in("product_id", normalizedProductIds);

  if (error) throw error;
  return data || [];
};

export const getProductWithDiscount = async (product) => {
  if (!product?.id) return product;

  const { data: discountRow, error: discountError } = await supabase
    .from("product_discounts")
    .select("enabled, discount_percent, discount_concept")
    .eq("product_id", product.id)
    .maybeSingle();

  if (discountError) throw discountError;

  const discountPercent = Number(discountRow?.discount_percent || 0);
  const hasDiscount = discountRow?.enabled === true && discountPercent > 0;

  return {
    ...product,
    discount_enabled: hasDiscount,
    discount_percent: hasDiscount ? discountPercent : 0,
    discount_concept: hasDiscount ? (discountRow?.discount_concept || "") : "",
  };
};

const buildInventoryMap = (inventoryRows = []) => {
  return inventoryRows.reduce((result, row) => {
    if (row?.product_id) result[row.product_id] = row;
    return result;
  }, {});
};

const calculateKitAvailability = ({ kitItems = [], inventoryRows = [] }) => {
  const inventoryMap = buildInventoryMap(inventoryRows);
  let availableStock = Infinity;
  let invalidMessage = "";

  for (const item of kitItems) {
    const component = item?.products || null;
    const componentName = getProductDisplayName(component);
    const tracksInventory = component?.tracks_inventory !== false;

    if (!tracksInventory) continue;

    const requiredQuantity = Number(item?.quantity || 0);

    if (requiredQuantity <= 0) {
      invalidMessage = `El componente "${componentName}" tiene cantidad inválida.`;
      availableStock = 0; break;
    }

    const inventory = inventoryMap[item.component_product_id];

    if (!inventory) {
      invalidMessage = `El componente "${componentName}" no tiene inventario en esta sucursal.`;
      availableStock = 0; break;
    }

    if (inventory.is_active === false) {
      invalidMessage = `El componente "${componentName}" está inactivo en esta sucursal.`;
      availableStock = 0; break;
    }

    if (inventory.has_been_stocked !== true) {
      invalidMessage = `El componente "${componentName}" aún no tiene inventario inicial.`;
      availableStock = 0; break;
    }

    const componentStock = Number(inventory.stock || 0);
    const possibleKits = Math.floor(componentStock / requiredQuantity);

    availableStock = Math.min(availableStock, possibleKits);
  }

  if (availableStock === Infinity) availableStock = 0;

  const normalizedAvailableStock = Math.max(Number(availableStock || 0), 0);

  return {
    availableStock: normalizedAvailableStock,
    isValid: !invalidMessage && normalizedAvailableStock > 0,
    message: invalidMessage,
  };
};

export const getKitAvailableStock = async ({ kitProductId, branchId }) => {
  if (!kitProductId || !branchId) {
    return { availableStock: 0, isValid: false, message: "No se detectó la sucursal para validar el kit." };
  }

  // OPTIMIZACIÓN: Traer el Kit y sus items en una sola consulta relacional
  const { data: kitData, error: kitError } = await supabase
    .from("product_kits")
    .select(`
      id,
      is_active,
      product_kit_items (
        id,
        component_product_id,
        quantity,
        products:component_product_id ( id, name, barcode, tracks_inventory )
      )
    `)
    .eq("kit_product_id", kitProductId)
    .maybeSingle();

  if (kitError || !kitData?.id) {
    return { availableStock: 0, isValid: false, message: "Este kit no tiene configuración registrada." };
  }

  if (kitData.is_active === false) {
    return { availableStock: 0, isValid: false, message: "Este kit está inactivo." };
  }

  const kitItems = kitData.product_kit_items || [];

  if (!kitItems.length) {
    return { availableStock: 0, isValid: false, message: "Este kit no tiene productos agregados." };
  }

  const inventoryComponentIds = [...new Set(
    kitItems
      .filter((item) => item?.products?.tracks_inventory !== false)
      .map((item) => item.component_product_id)
      .filter(Boolean)
  )];

  const inventoryRows = await getBranchInventoryRows({ branchId, productIds: inventoryComponentIds });

  return calculateKitAvailability({ kitItems, inventoryRows });
};