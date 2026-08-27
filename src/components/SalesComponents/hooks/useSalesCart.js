import { useCallback } from "react";
import { isRewardCartItem, isSameCartItem } from "../utils/salesCartUtils";
import { validateProductForCart } from "../services/salesCartValidationService"; // <-- NUEVO SERVICIO

// --- FUNCIONES PURAS (SIN ESTADO) ---
const calculateDiscountedProduct = (basePrice, product) => {
  const originalPrice = Number(basePrice || 0);
  const discountEnabled = Boolean(product?.discount_enabled) && Number(product?.discount_percent || 0) > 0;

  if (!discountEnabled) {
    return {
      precioOriginal: originalPrice, precioFinal: originalPrice, descuentoTipo: null,
      descuentoValor: 0, descuentoMontoUnitario: 0, discountPercent: 0, discountConcept: "",
    };
  }

  const discountPercent = Number(product.discount_percent || 0);
  const descuentoMontoUnitario = originalPrice * (discountPercent / 100);

  return {
    precioOriginal: originalPrice,
    precioFinal: Math.max(originalPrice - descuentoMontoUnitario, 0),
    descuentoTipo: "percent", descuentoValor: discountPercent,
    descuentoMontoUnitario, discountPercent, discountConcept: product.discount_concept || "",
  };
};

const updateCartItemQuantity = ({ item, quantity, stock }) => {
  const precioOriginal = Number(item.precioOriginal ?? item.precio ?? 0);
  const precioFinal = Number(item.precio ?? 0);
  const descuentoUnitario = Math.max(precioOriginal - precioFinal, 0);
  const tracksInventory = Boolean(item.tracks_inventory);
  const resolvedStock = stock !== undefined ? Number(stock || 0) : Number(item.stockReal || 0);

  return {
    ...item,
    cantidad: quantity,
    importe: quantity * precioFinal,
    descuentoMonto: descuentoUnitario * quantity,
    stockReal: tracksInventory ? resolvedStock : item.stockReal,
    existencia: tracksInventory ? Math.max(resolvedStock - quantity, 0) : "∞",
  };
};

// --- HOOK PRINCIPAL ---
const useSalesCart = ({
  productosRef,
  selectedProduct,
  setProductos,
  setSelectedProduct,
  getBranchInventoryRow,
  getKitAvailableStock,
  showAppWarning,
  syncCurrentSaleRewardsWithCart,
}) => {
  
  const commitCart = useCallback((nextProducts, nextSelectedProduct) => {
    productosRef.current = nextProducts;
    setProductos(nextProducts);
    if (nextSelectedProduct !== undefined) {
      setSelectedProduct(nextSelectedProduct);
    }
  }, [productosRef, setProductos, setSelectedProduct]);

  const createCartProduct = useCallback(({ product, salePrice, costPrice, stock, tracksInventory, isKit }) => {
    const discountData = calculateDiscountedProduct(salePrice, product);
    return {
      id: product.id, codigo: product.barcode, nombre: product.name,
      precioOriginal: discountData.precioOriginal, precio: discountData.precioFinal, costo: costPrice,
      cantidad: 1, importe: discountData.precioFinal, descuentoTipo: discountData.descuentoTipo,
      descuentoValor: discountData.descuentoValor, descuentoMonto: discountData.descuentoMontoUnitario,
      discountPercent: discountData.discountPercent, discountConcept: discountData.discountConcept,
      stockReal: tracksInventory ? Number(stock || 0) : null,
      existencia: tracksInventory ? Math.max(Number(stock || 0) - 1, 0) : "∞",
      is_kit: Boolean(isKit), tracks_inventory: Boolean(tracksInventory),
      max_kits_per_sale: product.max_kits_per_sale,
    };
  }, []);

  const applyProductToCart = useCallback((product, stock, salePrice, costPrice, tracksInventory) => {
    const currentProducts = productosRef.current || [];
    const existingProduct = currentProducts.find((item) => item.id === product.id && !isRewardCartItem(item));

    if (existingProduct) {
      const nextQuantity = Number(existingProduct.cantidad || 0) + 1;
      
      if (product.is_kit) {
        const maxKits = Number(product.max_kits_per_sale ?? 1);
        if (nextQuantity > maxKits) {
          showAppWarning(`Límite de venta: Solo se permite vender un máximo de ${maxKits} unidades de este kit por transacción.`);
          return false;
        }
      }

      if (tracksInventory && nextQuantity > stock) {
        showAppWarning(product.is_kit ? "No hay suficiente inventario para vender otro kit." : "No hay suficiente inventario.");
        return false;
      }

      const nextProducts = currentProducts.map((item) => {
        if (item.id !== product.id || isRewardCartItem(item)) return item;
        return updateCartItemQuantity({ item, quantity: nextQuantity, stock });
      });

      const nextSelected = nextProducts.find((item) => item.id === product.id && !isRewardCartItem(item)) || null;
      commitCart(nextProducts, selectedProduct?.id === product.id ? nextSelected : undefined);
      return true;
    }

    const newProduct = createCartProduct({
      product, salePrice: Number(salePrice ?? 0), costPrice: Number(costPrice ?? 0),
      stock, tracksInventory, isKit: product.is_kit,
    });

    commitCart([...currentProducts, newProduct]);
    return true;
  }, [commitCart, createCartProduct, productosRef, selectedProduct, showAppWarning]);

  // =======================================================================
  // ORQUESTADOR PRINCIPAL (Ahora limpio de reglas de negocio)
  // =======================================================================
  const addProductToCart = useCallback(async (product) => {
    // 1. Delegamos la validación dura al servicio
    const validation = await validateProductForCart({ 
      product, 
      getKitAvailableStock, 
      getBranchInventoryRow 
    });

    // 2. Si el dominio dice que NO, le avisamos al usuario y abortamos
    if (!validation.isValid) {
      showAppWarning(validation.message);
      return false;
    }

    // 3. Si el dominio dice que SÍ, modificamos el estado de React
    return applyProductToCart(
      product, 
      validation.stock, 
      validation.salePrice, 
      validation.costPrice, 
      validation.tracksInventory
    );
  }, [applyProductToCart, getBranchInventoryRow, getKitAvailableStock, showAppWarning]);
  // =======================================================================

  const increaseSelectedProductQuantity = useCallback(() => {
    if (!selectedProduct) return;
    if (isRewardCartItem(selectedProduct)) {
      showAppWarning("No puedes modificar la cantidad de un producto aplicado como recompensa.");
      return;
    }
    const currentProducts = productosRef.current || [];
    const currentProduct = currentProducts.find((item) => isSameCartItem(item, selectedProduct));
    if (!currentProduct) return;

    const currentQuantity = Number(currentProduct.cantidad || 0);
    const stock = Number(currentProduct.stockReal || 0);

    if (currentProduct.is_kit) {
      const maxKits = Number(currentProduct.max_kits_per_sale ?? 1);
      if (currentQuantity >= maxKits) {
        showAppWarning(`Límite de venta: Solo se permite vender un máximo de ${maxKits} unidades de este kit por transacción.`);
        return;
      }
    }

    if (currentProduct.tracks_inventory && currentQuantity >= stock) {
      showAppWarning("No hay suficiente inventario.");
      return;
    }

    const nextQuantity = currentQuantity + 1;
    const nextProducts = currentProducts.map((item) => {
      if (!isSameCartItem(item, selectedProduct)) return item;
      return updateCartItemQuantity({ item, quantity: nextQuantity });
    });
    const nextSelected = nextProducts.find((item) => isSameCartItem(item, selectedProduct)) || null;
    commitCart(nextProducts, nextSelected);
  }, [commitCart, productosRef, selectedProduct, showAppWarning]);

  const decreaseSelectedProductQuantity = useCallback(() => {
    if (!selectedProduct) return;
    if (isRewardCartItem(selectedProduct)) {
      showAppWarning("No puedes modificar la cantidad de un producto aplicado como recompensa.");
      return;
    }
    const currentProducts = productosRef.current || [];
    const currentProduct = currentProducts.find((item) => isSameCartItem(item, selectedProduct));
    if (!currentProduct) return;

    const currentQuantity = Number(currentProduct.cantidad || 0);

    if (currentQuantity <= 1) {
      const nextProducts = currentProducts.filter((item) => !isSameCartItem(item, selectedProduct));
      commitCart(nextProducts, null);
      syncCurrentSaleRewardsWithCart?.(nextProducts);
      return;
    }

    const nextQuantity = currentQuantity - 1;
    const nextProducts = currentProducts.map((item) => {
      if (!isSameCartItem(item, selectedProduct)) return item;
      return updateCartItemQuantity({ item, quantity: nextQuantity });
    });
    const nextSelected = nextProducts.find((item) => isSameCartItem(item, selectedProduct)) || null;
    commitCart(nextProducts, nextSelected);
  }, [commitCart, productosRef, selectedProduct, showAppWarning, syncCurrentSaleRewardsWithCart]);

  const handleDeleteSelectedProduct = useCallback(() => {
    if (!selectedProduct) return;
    const currentProducts = productosRef.current || [];
    const nextProducts = currentProducts.filter((item) => !isSameCartItem(item, selectedProduct));
    commitCart(nextProducts, null);
    syncCurrentSaleRewardsWithCart?.(nextProducts);
  }, [commitCart, productosRef, selectedProduct, syncCurrentSaleRewardsWithCart]);

  return {
    addProductToCart,
    increaseSelectedProductQuantity,
    decreaseSelectedProductQuantity,
    handleDeleteSelectedProduct,
  };
};

export default useSalesCart;