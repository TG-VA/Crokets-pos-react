export const isValidUuid = (value) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));

export const getCartItemKey = (item) => item?.cartLineId || item?.id || "";

export const isSameCartItem = (firstItem, secondItem) =>
  getCartItemKey(firstItem) === getCartItemKey(secondItem);

export const isRewardCartItem = (item) =>
  Boolean(item?.is_reward_item || item?.is_reward_discount_item);

export const getCartQuantityForProduct = (productId, cartItems = []) => {
  if (!productId) return 0;
  return cartItems.reduce((sum, item) => (item?.id === productId ? sum + Number(item?.cantidad || 0) : sum), 0);
};

export const updateProductExistenceInCart = (cartItems = [], productId, stock) => {
  if (!productId || stock === null || stock === undefined) return cartItems;

  const normalizedStock = Number(stock || 0);
  const totalInCart = getCartQuantityForProduct(productId, cartItems);
  const nextExistence = Math.max(normalizedStock - totalInCart, 0);

  return cartItems.map((item) => {
    if (item?.id !== productId || item?.tracks_inventory === false) return item;
    return { ...item, stockReal: normalizedStock, existencia: nextExistence };
  });
};