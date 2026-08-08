import { useState, useEffect, useMemo, useCallback } from "react";
import { 
  toNumber, formatCurrency, getRewardDiscountLabel, 
  calculateRewardDiscount, productUsesInventory, fetchProductsAndInventory 
} from "../../services/productDiscountService";

export const MIN_SEARCH_LENGTH = 2;
// Re-exportamos para la UI
export { toNumber, formatCurrency, getRewardDiscountLabel, calculateRewardDiscount };

export const useProductDiscountReward = ({ isOpen, reward, branchId, cartProducts }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [products, setProducts] = useState([]);
  const [inventoryByProduct, setInventoryByProduct] = useState({});
  const [selectedProductsById, setSelectedProductsById] = useState({});
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [appModal, setAppModal] = useState({ isOpen: false, type: "warning", title: "Aviso", message: "", confirmText: "Entendido" });

  const rewardQuantity = Math.max(toNumber(reward?.reward_quantity || 1), 1);
  const rewardRedeemQuantity = Math.max(toNumber(reward?.redeemQuantity || 1), 1);
  const totalUnitsToApply = rewardQuantity * rewardRedeemQuantity;

  const closeAppModal = useCallback(() => setAppModal((p) => ({ ...p, isOpen: false })), []);
  const showAppWarning = useCallback((msg, title = "Aviso") => setAppModal({ isOpen: true, type: "warning", title, message: String(msg), confirmText: "Entendido" }), []);
  const showAppDanger = useCallback((msg, title = "Error") => setAppModal({ isOpen: true, type: "danger", title, message: String(msg), confirmText: "Entendido" }), []);

  const getInventoryStatus = useCallback((product) => {
    if (!product?.id) return { available: false, stock: 0, label: "Producto inválido" };
    if (product.status === false) return { available: false, stock: 0, label: "Producto inactivo" };
    if (!productUsesInventory(product)) return { available: true, stock: null, label: "No controla inventario" };

    const row = inventoryByProduct[product.id];
    const usedInCart = (Array.isArray(cartProducts) ? cartProducts : []).reduce((sum, item) => (item?.id === product.id ? sum + toNumber(item?.cantidad || item?.quantity) : sum), 0);

    if (!row) return { available: false, stock: 0, label: "Sin inventario en sucursal" };
    if (row.is_active === false) return { available: false, stock: 0, label: "Inactivo en sucursal" };

    const rawStock = toNumber(row.stock);
    const availableStock = Math.max(rawStock - usedInCart, 0);

    if (row.has_been_stocked !== true && rawStock <= 0) return { available: false, stock: availableStock, label: "Sin inventario inicial" };
    if (rawStock <= 0) return { available: false, stock: availableStock, label: "Sin existencia" };
    if (availableStock <= 0) return { available: false, stock: availableStock, label: usedInCart > 0 ? "Sin disponible por carrito" : "Sin existencia" };

    return { available: true, stock: availableStock, label: usedInCart > 0 ? `${availableStock} disp. (${usedInCart} en carrito)` : `${availableStock} disp.` };
  }, [inventoryByProduct, cartProducts]);

  const loadProducts = useCallback(async () => {
    try {
      setLoadingProducts(true); setError("");
      const { cleanProds, inventoryMap } = await fetchProductsAndInventory(branchId);
      setProducts(cleanProds);
      setInventoryByProduct(inventoryMap);
    } catch (err) {
      setProducts([]); setInventoryByProduct({});
      showAppDanger(err?.message || "Error cargando productos.", "Error");
    } finally {
      setLoadingProducts(false);
    }
  }, [branchId, showAppDanger]);

  useEffect(() => {
    if (!isOpen) return;
    setSearchTerm(""); setSelectedProductsById({}); setSaving(false); setError(""); closeAppModal(); loadProducts();
  }, [isOpen, branchId, reward?.id, loadProducts, closeAppModal]);

  const selectedProductsCount = useMemo(() => Object.values(selectedProductsById).reduce((s, q) => s + toNumber(q), 0), [selectedProductsById]);
  
  const selectedProducts = useMemo(() => Object.entries(selectedProductsById).map(([id, qty]) => {
    const p = products.find(i => i.id === id);
    if (!p || toNumber(qty) <= 0) return null;
    return { product: p, quantity: toNumber(qty), discount: calculateRewardDiscount(p, reward, inventoryByProduct) };
  }).filter(Boolean), [products, selectedProductsById, reward, inventoryByProduct]);

  const filteredProducts = useMemo(() => {
    const s = searchTerm.trim().toLowerCase();
    if (s.length < MIN_SEARCH_LENGTH) return [];
    return products.filter(p => {
      const price = p.sale_price; // Simplificado para rendimiento
      if (![p.name, p.barcode, price].some(v => String(v || "").toLowerCase().includes(s))) return false;
      if (!getInventoryStatus(p).available) return false;
      return calculateRewardDiscount(p, reward, inventoryByProduct).discountAmount > 0;
    });
  }, [products, inventoryByProduct, searchTerm, reward, getInventoryStatus]);

  const handleAddProduct = (product) => {
    if (!product?.id || saving || selectedProductsCount >= totalUnitsToApply) return;
    const status = getInventoryStatus(product);
    if (!status.available) return;
    
    if (calculateRewardDiscount(product, reward, inventoryByProduct).discountAmount <= 0) {
      setError("La recompensa no genera un descuento válido."); return showAppWarning("La recompensa no genera un descuento válido.", "Descuento no aplicable");
    }
    
    const currQty = toNumber(selectedProductsById[product.id]);
    if (status.stock !== null && currQty >= status.stock) return;

    setSelectedProductsById(prev => ({ ...prev, [product.id]: currQty + 1 })); setError("");
  };

  const handleSubtractProduct = (product) => {
    if (!product?.id || saving) return;
    setSelectedProductsById(prev => {
      const currQty = toNumber(prev[product.id]);
      if (currQty <= 0) return prev;
      const next = { ...prev, [product.id]: currQty - 1 };
      if (next[product.id] <= 0) delete next[product.id];
      return next;
    });
    setError("");
  };

  return {
    searchTerm, setSearchTerm, products, inventoryByProduct, loadingProducts, saving, setSaving, error, setError, appModal, closeAppModal, showAppWarning,
    rewardQuantity, rewardRedeemQuantity, totalUnitsToApply, selectedProductsCount, selectedProducts, filteredProducts,
    getInventoryStatus, handleAddProduct, handleSubtractProduct, productUsesInventory,
  };
};