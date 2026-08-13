import { useCallback, useMemo } from "react";
import { isRewardCartItem, isSameCartItem, updateProductExistenceInCart } from "../utils/salesCartUtils";
import { getRewardRedeemQuantity, getRewardType, getSyncedRewardsFromCart, isPendingProductDiscountReward, normalizeRewardsArray } from "../utils/salesRewardUtils";
import { validateRewardSelectionsInventory, processFreeRewardProduct, processDiscountRewardProduct } from "../services/salesRewardValidationService";

const useSalesRewards = ({
  productos = [], productosRef, currentSaleReward = null, setCurrentSaleReward,
  setCurrentSaleClient, pendingProductDiscountRewards = [], setPendingProductDiscountRewards,
  setPendingFreeProductRewards, setActiveProductDiscountReward, setRewardProductModalOpen,
  setProductDiscountRewardModalOpen, setProductos, selectedProduct, setSelectedProduct,
  getBranchInventoryRow, showAppWarning,
}) => {
  
  const syncCurrentSaleRewardsWithCart = useCallback((cartItems) => {
    setCurrentSaleReward((prev) => getSyncedRewardsFromCart(cartItems, prev));
  }, [setCurrentSaleReward]);

  const removeRewardItemsFromCart = useCallback(() => {
    const currentProducts = Array.isArray(productosRef?.current) ? productosRef.current : [];
    const removedRewardProducts = currentProducts.filter(isRewardCartItem);

    if (removedRewardProducts.length === 0) return;

    const affectedProductIds = [...new Set(removedRewardProducts.map((p) => p?.id).filter(Boolean))];
    let updatedProducts = currentProducts.filter((p) => !isRewardCartItem(p));

    affectedProductIds.forEach((productId) => {
      const stockSource = currentProducts.find((p) => p?.id === productId && p?.tracks_inventory && p?.stockReal !== null && p?.stockReal !== undefined);
      if (!stockSource) return;
      updatedProducts = updateProductExistenceInCart(updatedProducts, productId, Number(stockSource.stockReal || 0));
    });

    setProductos(updatedProducts);
    productosRef.current = updatedProducts;
    setSelectedProduct((prevSelected) => {
      if (!prevSelected || isRewardCartItem(prevSelected)) return null;
      return updatedProducts.find((p) => isSameCartItem(p, prevSelected)) || null;
    });
  }, [productosRef, setProductos, setSelectedProduct]);

  const mergeAppliedRewards = useCallback((previousRewards, rewardsToAdd) => {
    const mergedRewards = [...normalizeRewardsArray(previousRewards)];
    normalizeRewardsArray(rewardsToAdd).forEach((reward) => {
      const rewardRedeemQuantity = getRewardRedeemQuantity(reward);
      const existingIndex = mergedRewards.findIndex((item) => item?.id === reward?.id);
      if (existingIndex >= 0) {
        mergedRewards[existingIndex] = { ...mergedRewards[existingIndex], redeemQuantity: getRewardRedeemQuantity(mergedRewards[existingIndex]) + rewardRedeemQuantity };
      } else {
        mergedRewards.push({ ...reward, redeemQuantity: rewardRedeemQuantity });
      }
    });
    return mergedRewards;
  }, []);

  const openNextProductDiscountReward = useCallback((queue = pendingProductDiscountRewards) => {
    const cleanQueue = normalizeRewardsArray(queue).filter((r) => getRewardType(r) === "product_discount");
    if (cleanQueue.length === 0) {
      setPendingProductDiscountRewards([]);
      setActiveProductDiscountReward(null);
      setProductDiscountRewardModalOpen(false);
      return;
    }
    setPendingProductDiscountRewards(cleanQueue);
    setActiveProductDiscountReward(cleanQueue[0]);
    setProductDiscountRewardModalOpen(true);
  }, [pendingProductDiscountRewards, setPendingProductDiscountRewards, setActiveProductDiscountReward, setProductDiscountRewardModalOpen]);

  const handleCloseRewardProductModal = useCallback(() => {
    setRewardProductModalOpen(false);
    setPendingFreeProductRewards([]);
  }, [setRewardProductModalOpen, setPendingFreeProductRewards]);

  const handleCloseProductDiscountRewardModal = useCallback(() => {
    setProductDiscountRewardModalOpen(false);
    setActiveProductDiscountReward(null);
    setPendingProductDiscountRewards([]);
  }, [setProductDiscountRewardModalOpen, setActiveProductDiscountReward, setPendingProductDiscountRewards]);

  // ==========================================
  // ORQUESTACIÓN: AÑADIR PRODUCTOS GRATIS
  // ==========================================
  const addRewardProductToCart = useCallback(async (selection) => {
    const result = await processFreeRewardProduct({ ...selection, currentCart: productosRef.current, getBranchInventoryRow });
    
    if (!result.success) {
      showAppWarning(result.message);
      return false;
    }

    setProductos(result.nextCart);
    productosRef.current = result.nextCart;
    
    // Auto-actualizar el producto seleccionado si es afectado
    setSelectedProduct((prev) => {
      if (!prev) return prev;
      return result.nextCart.find(p => p.cartLineId === prev.cartLineId || isSameCartItem(p, prev)) || prev;
    });

    return true;
  }, [getBranchInventoryRow, productosRef, setProductos, setSelectedProduct, showAppWarning]);

  const handleConfirmRewardProducts = useCallback(async (rewardSelections = []) => {
    try {
      const { success, message } = await validateRewardSelectionsInventory(rewardSelections, productosRef.current, getBranchInventoryRow);
      if (!success) return showAppWarning(message);

      const appliedRewards = [];
      for (const selection of rewardSelections) {
        const wasApplied = await addRewardProductToCart(selection);
        if (!wasApplied || !selection?.reward?.id) continue;

        const rewardToApply = { ...selection.reward, redeemQuantity: getRewardRedeemQuantity(selection.reward), appliedProductQuantity: Math.max(Number(selection.quantity || 1), 1) };
        if (!appliedRewards.some((r) => r.id === rewardToApply.id)) appliedRewards.push(rewardToApply);
      }

      if (appliedRewards.length === 0) return showAppWarning("No se aplicó ninguna recompensa. Revisa inventario disponible.");

      setCurrentSaleReward((prev) => mergeAppliedRewards(prev, appliedRewards));
      setRewardProductModalOpen(false);
      setPendingFreeProductRewards([]);

      if (pendingProductDiscountRewards.length > 0) openNextProductDiscountReward(pendingProductDiscountRewards);

    } catch (error) {
      console.error("Error aplicando productos de recompensa:", error);
      showAppWarning(error?.message || "No se pudieron aplicar las recompensas.");
    }
  }, [addRewardProductToCart, setCurrentSaleReward, mergeAppliedRewards, setRewardProductModalOpen, setPendingFreeProductRewards, pendingProductDiscountRewards, openNextProductDiscountReward, showAppWarning, getBranchInventoryRow, productosRef]);


  const handleConfirmProductDiscountReward = useCallback(async (payload) => {
    if (!payload?.reward?.id) return;
    const selections = Array.isArray(payload?.selections) ? payload.selections : payload?.product?.id ? [payload] : [];
    if (selections.length === 0) return;

    try {
      const appliedSelections = [];
      for (const selection of selections) {
        const selectionPayload = { ...selection, reward: selection.reward || payload.reward };
        
        // Delegar cálculo al servicio puro
        const result = await processDiscountRewardProduct({ ...selectionPayload, currentCart: productosRef.current, getBranchInventoryRow });
        
        if (result.success) {
          setProductos(result.nextCart);
          productosRef.current = result.nextCart;
          setSelectedProduct(result.rewardDiscountItem);
          appliedSelections.push(selectionPayload);
        } else {
          showAppWarning(result.message);
        }
      }

      if (appliedSelections.length === 0) return;

      const appliedProductQuantity = appliedSelections.reduce((sum, s) => sum + Math.max(Number(s.quantity || 1), 1), 0);
      const appliedDiscountAmount = appliedSelections.reduce((sum, s) => sum + Math.max(Math.floor(Number(s.discountAmount || 0)), 0) * Math.max(Number(s.quantity || 1), 1), 0);
      
      const appliedReward = {
        ...payload.reward, redeemQuantity: getRewardRedeemQuantity(payload.reward), reward_application_status: "applied_product_discount",
        appliedProductId: appliedSelections[0]?.product?.id || null, appliedProductName: appliedSelections.map((s) => s.product?.name || s.product?.barcode || "PRODUCTO").join(", "),
        appliedProductQuantity, appliedDiscountAmount,
      };

      setCurrentSaleReward((prev) => mergeAppliedRewards(prev, [appliedReward]));

      const remainingQueue = pendingProductDiscountRewards.filter((r) => r.id !== payload.reward.id);
      if (remainingQueue.length > 0) {
        setPendingProductDiscountRewards(remainingQueue);
        setActiveProductDiscountReward(remainingQueue[0]);
        setProductDiscountRewardModalOpen(true);
        return;
      }

      setPendingProductDiscountRewards([]);
      setActiveProductDiscountReward(null);
      setProductDiscountRewardModalOpen(false);

    } catch (error) {
      console.error("Error aplicando descuento de recompensa:", error);
      showAppWarning(error?.message || "No se pudo aplicar el descuento de recompensa.");
    }
  }, [setCurrentSaleReward, mergeAppliedRewards, pendingProductDiscountRewards, setPendingProductDiscountRewards, setActiveProductDiscountReward, setProductDiscountRewardModalOpen, showAppWarning, productosRef, getBranchInventoryRow, setProductos, setSelectedProduct]);

  // Manejador de asignación de cliente (intacto, lógica puramente de enrutamiento)
  const handleAssignClient = useCallback((client, rewards = []) => {
    const normalizedRewards = normalizeRewardsArray(rewards);
    if (!client || normalizedRewards.length === 0) {
      if (!client) removeRewardItemsFromCart();
      setCurrentSaleClient(client || null);
      setCurrentSaleReward([]);
      setPendingFreeProductRewards([]);
      setRewardProductModalOpen(false);
      setPendingProductDiscountRewards([]);
      setActiveProductDiscountReward(null);
      setProductDiscountRewardModalOpen(false);
      return;
    }

    setCurrentSaleClient(client);
    const freeProductRewards = normalizedRewards.filter((r) => getRewardType(r) === "free_product");
    const productDiscountRewards = normalizedRewards.filter((r) => getRewardType(r) === "product_discount").map((r) => ({ ...r, reward_application_status: "pending_product_discount" }));

    setPendingProductDiscountRewards(productDiscountRewards);

    if (freeProductRewards.length > 0) {
      setPendingFreeProductRewards(freeProductRewards);
      setRewardProductModalOpen(true);
      setProductDiscountRewardModalOpen(false);
      setActiveProductDiscountReward(null);
      return;
    }

    setPendingFreeProductRewards([]);
    setRewardProductModalOpen(false);
    if (productDiscountRewards.length > 0) openNextProductDiscountReward(productDiscountRewards);
  }, [removeRewardItemsFromCart, setCurrentSaleClient, setCurrentSaleReward, setPendingFreeProductRewards, setRewardProductModalOpen, setPendingProductDiscountRewards, setActiveProductDiscountReward, setProductDiscountRewardModalOpen, openNextProductDiscountReward]);

  const currentSaleRewards = useMemo(() => getSyncedRewardsFromCart(productos, currentSaleReward), [productos, currentSaleReward]);

  const currentSaleRewardsLabel = useMemo(() => {
    const pendingRewardItems = normalizeRewardsArray(currentSaleReward).filter(isPendingProductDiscountReward);
    const appliedRewards = currentSaleRewards.filter((r) => !isPendingProductDiscountReward(r));

    const totalQuantity = currentSaleRewards.reduce((sum, r) => sum + getRewardRedeemQuantity(r), 0);
    const appliedQuantity = appliedRewards.reduce((sum, r) => sum + getRewardRedeemQuantity(r), 0);
    const pendingQuantity = pendingRewardItems.reduce((sum, r) => sum + getRewardRedeemQuantity(r), 0);

    if (totalQuantity === 0) return "";
    if (pendingQuantity > 0 && appliedQuantity > 0) return `Canjes aplicados: ${appliedQuantity} · Pendientes: ${pendingQuantity}`;
    if (pendingQuantity > 0) return `Canjes pendientes: ${pendingQuantity}`;
    return `Canjes aplicados: ${appliedQuantity}`;
  }, [currentSaleReward, currentSaleRewards]);

  return {
    currentSaleRewards, currentSaleRewardsLabel, syncCurrentSaleRewardsWithCart, handleAssignClient,
    handleConfirmRewardProducts, handleCloseRewardProductModal, handleConfirmProductDiscountReward, handleCloseProductDiscountRewardModal,
  };
};

export default useSalesRewards;