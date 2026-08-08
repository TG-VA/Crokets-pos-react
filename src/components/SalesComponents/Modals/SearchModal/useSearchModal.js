import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { 
  normalizeText, sortProductsByNameAndWeight, fetchProductSearch, 
  fetchKitData, fetchProductStocksAcrossBranches 
} from "../../services/searchModalService";

export const useSearchModal = ({ isOpen, onClose, onAddToSale, productosEnVenta, branch }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [selectedProductStocks, setSelectedProductStocks] = useState([]);
  const [kitValidation, setKitValidation] = useState({ isValid: true, message: "", items: [] });
  const [loading, setLoading] = useState(false);
  const [loadingStocks, setLoadingStocks] = useState(false);
  const [addingProduct, setAddingProduct] = useState(false);
  const [error, setError] = useState("");
  const [appModal, setAppModal] = useState({ isOpen: false, type: "warning", title: "Aviso", message: "", confirmText: "Entendido" });

  const resultsListRef = useRef(null);
  const searchInputRef = useRef(null);
  const searchRequestIdRef = useRef(0);
  const stockRequestIdRef = useRef(0);
  const kitRequestIdRef = useRef(0);
  const searchTimeoutRef = useRef(null);
  const lastStockProductKeyRef = useRef("");
  const lastKitProductKeyRef = useRef("");

  const selectedProduct = selectedIndex >= 0 ? searchResults[selectedIndex] : null;
  const selectedProductKey = selectedProduct?.id ? `${selectedProduct.id}-${selectedProduct.is_kit ? "kit" : "product"}` : "";

  const closeAppModal = useCallback(() => setAppModal(p => ({ ...p, isOpen: false })), []);
  const showAppWarning = useCallback((message, title = "Aviso") => setAppModal({ isOpen: true, type: "warning", title, message: String(message || ""), confirmText: "Entendido" }), []);

  const cartQuantitiesMap = useMemo(() => {
    const map = {};
    for (const item of productosEnVenta || []) {
      const q = Number(item?.cantidad || item?.quantity || 0);
      if (q > 0) [item?.id, item?.product_id, item?.barcode, item?.name].forEach(k => { if (k) map[String(k).trim()] = (map[String(k).trim()] || 0) + q; });
    }
    return map;
  }, [productosEnVenta]);

  const getProductCartQuantity = useCallback((id, barcode = "", name = "") => {
    for (const k of [id, barcode, name].map(k => String(k || "").trim()).filter(Boolean)) {
      if (cartQuantitiesMap[k] > 0) return cartQuantitiesMap[k];
    }
    return 0;
  }, [cartQuantitiesMap]);

  const getProductAvailableStock = useCallback((product) => {
    if (!product) return 0;
    if (!product.tracks_inventory || product.is_kit) return Number(product.stock || 0);
    return Math.max(Number(product.real_stock ?? product.stock ?? 0) - getProductCartQuantity(product.id, product.barcode, product.name), 0);
  }, [getProductCartQuantity]);

  const getBranchAvailableStock = useCallback((productId, branchId, stock) => {
    return (!productId || String(branchId) !== String(branch?.id)) ? Number(stock || 0) : Math.max(Number(stock || 0) - getProductCartQuantity(productId), 0);
  }, [branch?.id, getProductCartQuantity]);

  const handleClose = useCallback(() => {
    searchRequestIdRef.current++; stockRequestIdRef.current++; kitRequestIdRef.current++;
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    lastStockProductKeyRef.current = ""; lastKitProductKeyRef.current = "";
    setSearchTerm(""); setSearchResults([]); setSelectedIndex(-1); setSelectedProductStocks([]); setKitValidation({ isValid: true, message: "", items: [] });
    setLoading(false); setLoadingStocks(false); setAddingProduct(false); setError(""); closeAppModal(); onClose();
  }, [closeAppModal, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    setSearchTerm(""); setSearchResults([]); setSelectedIndex(-1); setSelectedProductStocks([]); setKitValidation({ isValid: true, message: "", items: [] });
    setLoading(false); setLoadingStocks(false); setAddingProduct(false); setError(""); closeAppModal();
    searchRequestIdRef.current++; stockRequestIdRef.current++; kitRequestIdRef.current++;
    lastStockProductKeyRef.current = ""; lastKitProductKeyRef.current = "";
    const timer = setTimeout(() => searchInputRef.current?.focus(), 80);
    return () => { clearTimeout(timer); if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
  }, [isOpen, closeAppModal]);

  const validateKitStock = useCallback(async (kitProductId) => {
    if (!kitProductId || !branch?.id) return;
    const currentId = ++kitRequestIdRef.current;
    try {
      setKitValidation({ isValid: false, message: "Validando inventario...", items: [] });
      const { kitRow, kitItems, inventoryMap } = await fetchKitData(kitProductId, branch.id);
      if (currentId !== kitRequestIdRef.current) return;
      if (!kitRow?.id) return setKitValidation({ isValid: false, message: "Kit sin configuración.", items: [] });
      if (kitRow.is_active === false) return setKitValidation({ isValid: false, message: "Kit inactivo.", items: [] });
      if (!kitItems?.length) return setKitValidation({ isValid: false, message: "Kit vacío.", items: [] });

      const items = kitItems.map(item => {
        const inv = inventoryMap[item.component_product_id];
        const req = Number(item.quantity || 0);
        const real = Number(inv?.stock || 0);
        const stock = getBranchAvailableStock(item.component_product_id, branch.id, real);
        const tracks = item.products?.tracks_inventory !== false;
        
        let ok = true, reason = "";
        if (tracks) {
          if (!inv) { ok = false; reason = "Sin inventario"; }
          else if (inv.is_active === false) { ok = false; reason = "Inactivo"; }
          else if (!inv.has_been_stocked) { ok = false; reason = "Sin stock inicial"; }
          else if (stock < req) { ok = false; reason = `Falta stock (${stock}/${req})`; }
        }
        return { product_id: item.component_product_id, name: item.products?.name, barcode: item.products?.barcode, requiredQty: req, stock, realStock: real, quantityInSale: getProductCartQuantity(item.component_product_id), ok, reason };
      });
      const invalid = items.filter(i => !i.ok);
      setKitValidation({ isValid: invalid.length === 0, message: invalid.length === 0 ? "Kit disponible." : "Inventario insuficiente.", items });
    } catch (e) {
      if (currentId === kitRequestIdRef.current) setKitValidation({ isValid: false, message: "Error validando kit.", items: [] });
    }
  }, [branch?.id, getBranchAvailableStock, getProductCartQuantity]);

  const fetchProductStocks = useCallback(async (productId) => {
    if (!productId) { setSelectedProductStocks([]); setLoadingStocks(false); return; }
    const currentId = ++stockRequestIdRef.current;
    try {
      setLoadingStocks(true);
      const { validRows, branchMap } = await fetchProductStocksAcrossBranches(productId);
      if (currentId !== stockRequestIdRef.current) return;

      const merged = validRows.map(row => {
        const b = branchMap[row.branch_id];
        return {
          branch_id: row.branch_id, branch_code: b?.code || "", branch_name: b?.name || "Sucursal",
          stock: getBranchAvailableStock(productId, row.branch_id, Number(row.stock || 0)), real_stock: Number(row.stock || 0),
          quantity_in_sale: row.branch_id === branch?.id ? getProductCartQuantity(productId) : 0,
          is_active: row.is_active !== false, has_been_stocked: !!row.has_been_stocked, sale_price: Number(row.sale_price || 0), is_current_branch: row.branch_id === branch?.id
        };
      }).sort((a, b) => a.is_current_branch === b.is_current_branch ? a.branch_name.localeCompare(b.branch_name) : a.is_current_branch ? -1 : 1);
      
      setSelectedProductStocks(merged);
    } catch (e) { if (currentId === stockRequestIdRef.current) setSelectedProductStocks([]); } 
    finally { if (currentId === stockRequestIdRef.current) setLoadingStocks(false); }
  }, [branch?.id, getBranchAvailableStock, getProductCartQuantity]);

  useEffect(() => {
    if (!isOpen || !selectedProduct?.id) { lastStockProductKeyRef.current = ""; lastKitProductKeyRef.current = ""; setSelectedProductStocks([]); setKitValidation({ isValid: true, message: "", items: [] }); setLoadingStocks(false); return; }
    stockRequestIdRef.current++; kitRequestIdRef.current++;
    
    if (selectedProduct.is_kit) {
      setSelectedProductStocks([]);
      if (lastKitProductKeyRef.current !== selectedProductKey) { lastKitProductKeyRef.current = selectedProductKey; lastStockProductKeyRef.current = ""; validateKitStock(selectedProduct.id); }
      return;
    }
    
    setKitValidation({ isValid: true, message: "", items: [] }); lastKitProductKeyRef.current = "";
    if (selectedProduct.tracks_inventory && lastStockProductKeyRef.current !== selectedProductKey) { lastStockProductKeyRef.current = selectedProductKey; fetchProductStocks(selectedProduct.id); return; }
    if (!selectedProduct.tracks_inventory) { lastStockProductKeyRef.current = ""; setSelectedProductStocks([]); setLoadingStocks(false); }
  }, [isOpen, selectedProduct, selectedProductKey, validateKitStock, fetchProductStocks]);

  const performSearch = useCallback(async (term) => {
    const cleanTerm = String(term || "").trim();
    const currentId = ++searchRequestIdRef.current;
    if (cleanTerm.length < 2) { setSearchResults([]); setSelectedIndex(-1); setLoading(false); return; }
    if (!branch?.id) { if (currentId === searchRequestIdRef.current) { setError("Sucursal no cargada."); setLoading(false); } return; }

    try {
      setLoading(true); setError("");
      const { matchedProducts, inventoryMap, discountsMap } = await fetchProductSearch(cleanTerm, branch.id);
      if (currentId !== searchRequestIdRef.current) return;
      if (!matchedProducts.length) { setSearchResults([]); setSelectedIndex(-1); return; }

      const norm = normalizeText(cleanTerm);
      const merged = sortProductsByNameAndWeight(matchedProducts.map(p => {
        const inv = inventoryMap[p.id];
        const isKit = p.is_kit === true;
        const tracks = p.tracks_inventory !== false || isKit;
        if (!isKit && tracks && (!inv || inv.is_active === false || inv.has_been_stocked !== true)) return null;

        const realStock = Number(inv?.stock || 0);
        const base = {
          ...p, inventory_id: inv?.id || null, branch_id: inv?.branch_id || branch.id, stock: isKit || !tracks ? null : realStock, real_stock: isKit || !tracks ? null : realStock,
          quantity_in_sale: getProductCartQuantity(p.id, p.barcode, p.name), is_active_in_branch: isKit || !tracks || inv?.is_active !== false,
          has_been_stocked: isKit || !tracks || inv?.has_been_stocked === true, branch_sale_price: Number(inv?.sale_price ?? p.sale_price ?? 0), branch_cost_price: Number(inv?.cost_price ?? p.cost_price ?? 0), tracks_inventory: tracks
        };
        const d = discountsMap[p.id];
        const dOn = !!d?.discount_enabled && Number(d.discount_percent || 0) > 0;
        return { ...base, discount_enabled: dOn, discount_percent: dOn ? Number(d.discount_percent) : 0, discount_concept: dOn ? d.discount_concept : "" };
      }).filter(Boolean).filter(p => normalizeText(`${p.name} ${p.barcode || ""}`).includes(norm)));

      lastStockProductKeyRef.current = ""; lastKitProductKeyRef.current = "";
      setSearchResults(merged); setSelectedIndex(merged.length > 0 ? 0 : -1);
    } catch (e) { if (currentId === searchRequestIdRef.current) { setError("Error cargando productos."); setSearchResults([]); setSelectedIndex(-1); } } 
    finally { if (currentId === searchRequestIdRef.current) setLoading(false); }
  }, [branch?.id, getProductCartQuantity]);

  const handleInputChange = (e) => {
    const val = e.target.value; 
    setSearchTerm(val);
    
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    
    if (val.trim().length < 2) { 
      // FIX: Solo limpiamos los resultados visuales de la tabla, NO cerramos el modal.
      searchRequestIdRef.current++; 
      stockRequestIdRef.current++; 
      kitRequestIdRef.current++;
      lastStockProductKeyRef.current = ""; 
      lastKitProductKeyRef.current = "";
      setSearchResults([]); 
      setSelectedIndex(-1); 
      setSelectedProductStocks([]); 
      setKitValidation({ isValid: true, message: "", items: [] });
      setLoading(false); 
      setLoadingStocks(false); 
      setError("");
      return; 
    }
    
    searchTimeoutRef.current = setTimeout(() => performSearch(val), 350);
  };

  const handleSelectProduct = async (product) => {
    if (!product || addingProduct) return;
    if (product.is_kit && !kitValidation.isValid) return showAppWarning(kitValidation.message || "Kit sin inventario.");
    if (!product.is_kit && product.tracks_inventory) {
      if (!product.is_active_in_branch) return showAppWarning("Producto inactivo.");
      if (!product.has_been_stocked) return showAppWarning("Sin inventario inicial.");
      if (getProductAvailableStock(product) <= 0) return showAppWarning("Sin existencia.");
    }

    if (onAddToSale) {
      try {
        setAddingProduct(true);
        await onAddToSale({ id: product.id, barcode: product.barcode, name: product.name, sale_price: product.branch_sale_price, cost_price: product.branch_cost_price, is_kit: !!product.is_kit, tracks_inventory: !!product.tracks_inventory, discount_enabled: !!product.discount_enabled, discount_percent: Number(product.discount_percent || 0), discount_concept: product.discount_concept || "" });
        handleClose();
      } catch (e) { showAppWarning(e?.message || "Error al agregar."); } 
      finally { setAddingProduct(false); }
    } else handleClose();
  };

  const canAddSelectedProduct = useCallback((p) => !p ? false : p.is_kit ? kitValidation.isValid : p.tracks_inventory ? p.is_active_in_branch && p.has_been_stocked && getProductAvailableStock(p) > 0 : true, [kitValidation.isValid, getProductAvailableStock]);
  
  const getDisplayPrice = useCallback((p) => {
    const price = Number(p?.branch_sale_price || 0), dPct = Number(p?.discount_percent || 0);
    if (!p?.discount_enabled || dPct <= 0) return { originalPrice: price, finalPrice: price, discountAmount: 0 };
    const amt = price * (dPct / 100); return { originalPrice: price, finalPrice: Math.max(price - amt, 0), discountAmount: amt };
  }, []);

  return {
    searchTerm, searchResults, selectedIndex, setSelectedIndex, selectedProduct, selectedProductStocks, kitValidation, loading, loadingStocks, addingProduct, error, appModal,
    resultsListRef, searchInputRef, closeAppModal, handleClose, handleInputChange, handleSelectRow: setSelectedIndex, handleSelectProduct, canAddSelectedProduct, getProductAvailableStock, getProductCartQuantity, getDisplayPrice
  };
};