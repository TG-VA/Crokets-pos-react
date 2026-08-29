import { useState, useEffect, useRef, useCallback } from "react";
import { 
  applyDiscountToPrice, fetchProductDiscount, fetchKitData, 
  fetchProductByBarcode, fetchProductInventory 
} from "../../services/verifierService";
import { getSoldKitsCountInBranch } from "../../services/salesProductService";

export const useVerifier = ({ isOpen, onClose, onAddToSale, branch }) => {
  const [barcode, setBarcode] = useState("");
  const [product, setProduct] = useState(null);
  const [kitItems, setKitItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const inputRef = useRef(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!isOpen) return;
    setBarcode(""); setProduct(null); setKitItems([]); setError(""); setIsLoading(false);
    requestIdRef.current += 1;
    const timer = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(timer);
  }, [isOpen]);

  const handleClose = useCallback(() => {
    requestIdRef.current += 1;
    setBarcode(""); setProduct(null); setKitItems([]); setError(""); setIsLoading(false);
    onClose();
  }, [onClose]);

  const handleSearchProduct = useCallback(async () => {
    const cleanBarcode = barcode.trim();
    if (!cleanBarcode) {
      setProduct(null); setKitItems([]); setError("Por favor ingresa un código de barras."); inputRef.current?.focus(); return;
    }
    if (!branch?.id) {
      setProduct(null); setKitItems([]); setError("La sucursal actual no está cargada."); return;
    }

    const currentReq = ++requestIdRef.current;

    try {
      setIsLoading(true); setError(""); setProduct(null); setKitItems([]);

      const productRow = await fetchProductByBarcode(cleanBarcode);
      if (currentReq !== requestIdRef.current) return;
      if (!productRow) return setError("Producto no encontrado.");

      const tracksInventory = !!productRow.tracks_inventory;
      const discountRow = await fetchProductDiscount(productRow.id);
      if (currentReq !== requestIdRef.current) return;

      let loadedKitItems = [];
      let kitIsActive = true;

      if (productRow.is_kit) {
        const kitInfo = await fetchKitData(productRow.id);
        if (currentReq !== requestIdRef.current) return;
        loadedKitItems = kitInfo.items;
        
        const soldCount = await getSoldKitsCountInBranch(productRow.id, branch.id);
        if (currentReq !== requestIdRef.current) return;
        const maxKits = Number(productRow.max_kits_per_sale ?? 1);
        
        if (soldCount >= maxKits) {
          setError(`Límite excedido: Se han vendido ${soldCount} de ${maxKits} permitidos en esta sucursal.`);
          kitIsActive = false;
        } else {
          kitIsActive = kitInfo.isActive;
          if (!kitIsActive) setError("Este kit está inactivo.");
        }
      }

      if (!tracksInventory) {
        if (!productRow.is_global) return setError("Este producto no está disponible para esta sucursal.");
        const salePrice = Number(productRow.sale_price || 0);
        const dInfo = applyDiscountToPrice(salePrice, discountRow);

        const mappedProduct = {
          id: productRow.id, codigo: productRow.barcode, nombre: productRow.name,
          precioOriginal: salePrice, precio: dInfo.finalPrice, costo: Number(productRow.cost_price || 0),
          existencia: "∞", is_active_in_branch: kitIsActive, has_been_stocked: true, is_kit: !!productRow.is_kit,
          tracks_inventory: false, discount_enabled: dInfo.discountEnabled, discount_percent: dInfo.discountPercent, discount_concept: dInfo.discountConcept,
          max_kits_per_sale: productRow.max_kits_per_sale,
        };

        setProduct(mappedProduct); setKitItems(loadedKitItems);
        if (!kitIsActive) return;
        if (mappedProduct.is_kit && loadedKitItems.length === 0) return setError("Este kit no tiene componentes registrados.");
        return setError("");
      }

      const inventoryRow = await fetchProductInventory(productRow.id, branch.id);
      if (currentReq !== requestIdRef.current) return;
      if (!inventoryRow) return setError("Este producto no tiene inventario registrado en esta sucursal.");

      const salePrice = Number(inventoryRow.sale_price ?? productRow.sale_price ?? 0);
      const dInfo = applyDiscountToPrice(salePrice, discountRow);

      const mappedProduct = {
        id: productRow.id, codigo: productRow.barcode, nombre: productRow.name,
        precioOriginal: salePrice, precio: dInfo.finalPrice, costo: Number(inventoryRow.cost_price ?? productRow.cost_price ?? 0),
        existencia: Number(inventoryRow.stock || 0), is_active_in_branch: inventoryRow.is_active !== false,
        has_been_stocked: !!inventoryRow.has_been_stocked, is_kit: !!productRow.is_kit, tracks_inventory: true,
        discount_enabled: dInfo.discountEnabled, discount_percent: dInfo.discountPercent, discount_concept: dInfo.discountConcept,
        max_kits_per_sale: productRow.max_kits_per_sale,
      };

      setProduct(mappedProduct); setKitItems(loadedKitItems);

      if (mappedProduct.is_active_in_branch === false) return setError("Este producto está inactivo en esta sucursal.");
      if (!mappedProduct.has_been_stocked) return setError("Este producto aún no tiene inventario inicial registrado.");
      if (mappedProduct.existencia <= 0) return setError("Este producto no tiene existencia disponible.");
      if (mappedProduct.is_kit && loadedKitItems.length === 0) return setError("Este kit no tiene componentes registrados.");
      setError("");

    } catch (err) {
      if (currentReq === requestIdRef.current) {
        console.error(err);
        setProduct(null); setKitItems([]); setError("Error buscando producto.");
      }
    } finally {
      if (currentReq === requestIdRef.current) setIsLoading(false);
    }
  }, [barcode, branch?.id]);

  const handleAddToSale = useCallback(async () => {
    if (!product || !onAddToSale) return;
    if (product.is_active_in_branch === false) return setError(product.is_kit ? "Este kit está inactivo." : "Este producto está inactivo en esta sucursal.");
    if (product.tracks_inventory && !product.has_been_stocked) return setError("Este producto aún no tiene inventario inicial registrado.");
    if (product.tracks_inventory && Number(product.existencia || 0) <= 0) return setError("Este producto no tiene existencia disponible.");
    if (product.is_kit && kitItems.length === 0) return setError("Este kit no tiene componentes registrados.");

    await onAddToSale({
      id: product.id, barcode: product.codigo, name: product.nombre, sale_price: product.precioOriginal, cost_price: product.costo,
      is_kit: product.is_kit, tracks_inventory: product.tracks_inventory, discount_enabled: !!product.discount_enabled,
      discount_percent: Number(product.discount_percent || 0), discount_concept: product.discount_concept || "",
      max_kits_per_sale: product.max_kits_per_sale,
    });
    handleClose();
  }, [product, onAddToSale, kitItems.length, handleClose]);

  const canAddToSale = product && product.is_active_in_branch !== false && (!product.tracks_inventory || (product.has_been_stocked && Number(product.existencia || 0) > 0)) && (!product.is_kit || kitItems.length > 0);

  return {
    barcode, setBarcode, product, kitItems, isLoading, error, inputRef,
    handleClose, handleSearchProduct, handleAddToSale, canAddToSale
  };
};