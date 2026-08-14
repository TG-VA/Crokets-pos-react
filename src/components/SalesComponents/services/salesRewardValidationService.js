import { getCartQuantityForProduct, updateProductExistenceInCart } from "../utils/salesCartUtils";
import { getRewardRedeemQuantity, getRewardTotalPoints } from "../utils/salesRewardUtils";

/**
 * Valida de forma global si hay stock suficiente para todas las recompensas seleccionadas.
 */
export const validateRewardSelectionsInventory = async (rewardSelections = [], currentCart, getBranchInventoryRow) => {
  const quantityByProduct = {};

  for (const selection of rewardSelections || []) {
    const product = selection?.product;
    const quantity = Number(selection?.quantity || 0);
    if (!product?.id || quantity <= 0 || product.tracks_inventory === false) continue;
    quantityByProduct[product.id] = Number(quantityByProduct[product.id] || 0) + quantity;
  }

  // Ejecutamos todas las consultas de inventario en paralelo
  const validationPromises = Object.entries(quantityByProduct).map(async ([productId, quantityToAdd]) => {
    const inventoryRow = await getBranchInventoryRow(productId);
    const stock = Number(inventoryRow?.stock || 0);
    const currentCartQuantity = getCartQuantityForProduct(productId, currentCart);
    const availableToAdd = Math.max(stock - currentCartQuantity, 0);

    if (!inventoryRow || inventoryRow.is_active === false) {
      return { success: false, message: "Uno de los productos de recompensa ya no está activo en esta sucursal." };
    }
    if (inventoryRow.has_been_stocked !== true && stock <= 0) {
      return { success: false, message: "Uno de los productos de recompensa aún no tiene inventario inicial." };
    }
    if (Number(quantityToAdd) > availableToAdd) {
      return { success: false, message: `No hay inventario suficiente. Disponible para agregar: ${availableToAdd}.` };
    }
    return { success: true };
  });

  const results = await Promise.all(validationPromises);
  const failedResult = results.find(r => !r.success);
  
  if (failedResult) return failedResult;

  return { success: true };
};

/**
 * Procesa la lógica de negocio para regalar un producto (Free Product).
 */
export const processFreeRewardProduct = async ({
  reward, product, quantity, currentCart, getBranchInventoryRow
}) => {
  if (!reward?.id || !product?.id) return { success: false, message: "Datos inválidos." };

  const redeemQuantity = getRewardRedeemQuantity(reward);
  const rewardQuantity = Math.max(Number(quantity || Number(reward.reward_quantity || 1) * redeemQuantity), 1);
  const tracksInventory = product.tracks_inventory !== false;

  let stock = null;
  let salePrice = Number(product.sale_price || 0);
  let costPrice = Number(product.cost_price || 0);

  if (tracksInventory) {
    const inventoryRow = await getBranchInventoryRow(product.id);
    if (!inventoryRow || inventoryRow.is_active === false) {
      return { success: false, message: `El producto no está activo en esta sucursal.` };
    }

    stock = Number(inventoryRow.stock || 0);
    salePrice = Number(inventoryRow.sale_price ?? product.sale_price ?? 0);
    costPrice = Number(inventoryRow.cost_price ?? product.cost_price ?? 0);

    const currentCartQuantity = getCartQuantityForProduct(product.id, currentCart);
    const availableToAdd = Math.max(stock - currentCartQuantity, 0);

    if (rewardQuantity > availableToAdd) {
      return { success: false, message: `No hay inventario suficiente para aplicar la recompensa. Disponible: ${availableToAdd}.` };
    }
  }

  const discountAmount = salePrice * rewardQuantity;
  const cartQuantityAfterAdd = getCartQuantityForProduct(product.id, currentCart) + rewardQuantity;
  const baseRewardQty = Math.max(Number(reward.reward_quantity || 1), 1);

  // Uso de crypto.randomUUID() para pureza de IDs
  const rewardItem = {
    cartLineId: `reward_${reward.id}_${product.id}_${crypto.randomUUID()}`,
    id: product.id, codigo: product.barcode, nombre: product.name,
    precioOriginal: salePrice, precio: 0, costo: costPrice, cantidad: rewardQuantity, importe: 0,
    descuentoTipo: "reward", descuentoValor: salePrice, descuentoMonto: discountAmount,
    discountPercent: 100, discountConcept: reward.name || "RECOMPENSA",
    stockReal: stock, existencia: tracksInventory && stock !== null ? Math.max(stock - cartQuantityAfterAdd, 0) : "∞",
    is_kit: Boolean(product.is_kit), tracks_inventory: tracksInventory, is_reward_item: true,
    reward_id: reward.id, reward_name: reward.name || "RECOMPENSA",
    reward_points_required: getRewardTotalPoints(reward),
    reward_line_points_required: Number(reward.points_required || 0) * (rewardQuantity / baseRewardQty),
    reward_redeem_quantity: redeemQuantity, reward_product_quantity: rewardQuantity,
  };

  const existingIndex = currentCart.findIndex((item) => item?.is_reward_item && item?.reward_id === reward.id && item?.id === product.id);
  let nextCart;

  if (existingIndex === -1) {
    nextCart = [...currentCart, rewardItem];
  } else {
    nextCart = currentCart.map((item, index) => {
      if (index !== existingIndex) return item;
      const nextQuantity = Number(item.cantidad || 0) + rewardQuantity;
      return {
        ...item, cantidad: nextQuantity, descuentoMonto: salePrice * nextQuantity,
        existencia: tracksInventory && stock !== null ? Math.max(stock - cartQuantityAfterAdd, 0) : "∞",
        reward_points_required: Number(item.reward_points_required || 0) + getRewardTotalPoints(reward),
        reward_line_points_required: Number(item.reward_line_points_required || 0) + (Number(reward.points_required || 0) * (rewardQuantity / baseRewardQty)),
        reward_redeem_quantity: Number(item.reward_redeem_quantity || 0) + redeemQuantity,
        reward_product_quantity: Number(item.reward_product_quantity || 0) + rewardQuantity,
      };
    });
  }

  if (tracksInventory && stock !== null) nextCart = updateProductExistenceInCart(nextCart, product.id, stock);
  
  return { success: true, nextCart };
};

/**
 * Procesa la lógica de negocio para aplicar un descuento por recompensa.
 */
export const processDiscountRewardProduct = async ({
  reward, product, quantity, originalUnitPrice, discountAmount, finalUnitPrice, discountType, discountValue, totalPoints,
  currentCart, getBranchInventoryRow
}) => {
  if (!reward?.id || !product?.id) return { success: false, message: "Datos inválidos." };

  const cleanQuantity = Math.max(Number(quantity || 1), 1);
  const tracksInventory = product.tracks_inventory !== false && product.use_inventory !== false;

  let stock = null;
  let salePrice = Number(originalUnitPrice ?? product.sale_price ?? 0);
  let costPrice = Number(product.cost_price || 0);

  if (tracksInventory) {
    const inventoryRow = await getBranchInventoryRow(product.id);
    if (!inventoryRow || inventoryRow.is_active === false) {
      return { success: false, message: `El producto no está activo en esta sucursal.` };
    }

    stock = Number(inventoryRow.stock || 0);
    salePrice = Number(originalUnitPrice ?? inventoryRow.sale_price ?? product.sale_price ?? 0);
    costPrice = Number(inventoryRow.cost_price ?? product.cost_price ?? 0);

    const availableToAdd = Math.max(stock - getCartQuantityForProduct(product.id, currentCart), 0);
    if (cleanQuantity > availableToAdd) {
      return { success: false, message: `No hay inventario suficiente para aplicar la recompensa. Disponible: ${availableToAdd}.` };
    }
  }

  // CORRECCIÓN: Se eliminó Math.floor() para no mutilar los centavos.
  // CORRECCIÓN: Blindaje estricto de la relación matemática.
  const cleanFinalUnitPrice = Math.max(Number(finalUnitPrice ?? salePrice - Number(discountAmount || 0)), 0);
  const calculatedUnitDiscount = Math.max(salePrice - cleanFinalUnitPrice, 0); // Forzamos: original - final = descuento.
  const calculatedTotalDiscount = calculatedUnitDiscount * cleanQuantity;

  const cartQuantityAfterAdd = getCartQuantityForProduct(product.id, currentCart) + cleanQuantity;

  const rewardDiscountItem = {
    cartLineId: `reward_discount_${reward.id}_${product.id}_${crypto.randomUUID()}`,
    id: product.id, codigo: product.barcode, nombre: product.name,
    precioOriginal: salePrice, precio: cleanFinalUnitPrice, costo: costPrice,
    cantidad: cleanQuantity, importe: cleanFinalUnitPrice * cleanQuantity,
    descuentoTipo: "amount", descuentoValor: calculatedUnitDiscount, descuentoMonto: calculatedTotalDiscount,
    discountPercent: discountType === "percent" ? Number(discountValue || 0) : 0,
    discountConcept: reward.name || "RECOMPENSA",
    stockReal: stock, existencia: tracksInventory && stock !== null ? Math.max(stock - cartQuantityAfterAdd, 0) : "∞",
    is_kit: Boolean(product.is_kit), tracks_inventory: tracksInventory, is_reward_discount_item: true,
    reward_id: reward.id, reward_name: reward.name || "RECOMPENSA",
    reward_points_required: Number(totalPoints || getRewardTotalPoints(reward)),
    reward_line_points_required: Number(totalPoints || getRewardTotalPoints(reward)),
    reward_redeem_quantity: cleanQuantity / Math.max(Number(reward.reward_quantity || 1), 1),
    reward_product_quantity: cleanQuantity,
    reward_discount_type: discountType || reward.discount_type || null,
    reward_discount_value: Number(discountValue ?? reward.discount_value ?? 0),
    reward_discount_amount: calculatedTotalDiscount,
  };

  let nextCart = [...currentCart, rewardDiscountItem];
  if (tracksInventory && stock !== null) nextCart = updateProductExistenceInCart(nextCart, product.id, stock);

  return { success: true, nextCart, rewardDiscountItem };
};
