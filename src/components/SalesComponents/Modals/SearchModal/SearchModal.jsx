import React, { useEffect, useMemo, useRef, useState } from "react";
import styles from "./SearchModal.module.css";
import { supabase } from "../../../../lib/supabaseClient";
import { useBranch } from "../../../../contexts/BranchContext";
import AppModal from "../../../AppModal/AppModal";

import SearchIcon from "../../../../assets/icons/searchIcon.svg";
import XmarkIcon from "../../../../assets/icons/xmark-solid-full.svg";

const SearchModal = ({
  isOpen,
  onClose,
  onAddToSale,
  productosEnVenta = [],
}) => {
  const { branch } = useBranch();

  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [selectedProductStocks, setSelectedProductStocks] = useState([]);
  const [kitValidation, setKitValidation] = useState({
    isValid: true,
    message: "",
    items: [],
  });

  const [loading, setLoading] = useState(false);
  const [loadingStocks, setLoadingStocks] = useState(false);
  const [addingProduct, setAddingProduct] = useState(false);
  const [error, setError] = useState("");
  const [appModal, setAppModal] = useState({
    isOpen: false,
    type: "warning",
    title: "Aviso",
    message: "",
    confirmText: "Entendido",
  });

  const resultsListRef = useRef(null);
  const searchInputRef = useRef(null);

  const searchRequestIdRef = useRef(0);
  const stockRequestIdRef = useRef(0);
  const kitRequestIdRef = useRef(0);
  const searchTimeoutRef = useRef(null);
  const lastStockProductKeyRef = useRef("");
  const lastKitProductKeyRef = useRef("");

  const selectedProduct =
    selectedIndex >= 0 ? searchResults[selectedIndex] : null;

  const selectedProductKey = selectedProduct?.id
    ? `${selectedProduct.id}-${selectedProduct.is_kit ? "kit" : "product"}`
    : "";

  const cartQuantitiesMap = useMemo(() => {
    const map = {};

    const addQuantityToKey = (key, quantity) => {
      const cleanKey = String(key || "").trim();

      if (!cleanKey) return;

      map[cleanKey] = Number(map[cleanKey] || 0) + quantity;
    };

    for (const item of productosEnVenta || []) {
      const quantity = Number(item?.cantidad || item?.quantity || 0);

      if (quantity <= 0) continue;

      [
        item?.id,
        item?.product_id,
        item?.producto_id,
        item?.productId,
        item?.barcode,
        item?.codigo,
        item?.code,
        item?.name,
        item?.nombre,
      ].forEach((key) => addQuantityToKey(key, quantity));
    }

    return map;
  }, [productosEnVenta]);

  useEffect(() => {
    if (!isOpen) return;

    setSearchTerm("");
    setSearchResults([]);
    setSelectedIndex(-1);
    setSelectedProductStocks([]);
    setKitValidation({ isValid: true, message: "", items: [] });
    setLoading(false);
    setLoadingStocks(false);
    setAddingProduct(false);
    setError("");
    closeAppModal();

    searchRequestIdRef.current += 1;
    stockRequestIdRef.current += 1;
    kitRequestIdRef.current += 1;
    lastStockProductKeyRef.current = "";
    lastKitProductKeyRef.current = "";

    const timer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 80);

    return () => {
      clearTimeout(timer);

      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();

        if (event.nativeEvent?.stopImmediatePropagation) {
          event.nativeEvent.stopImmediatePropagation();
        }

        if (event.stopImmediatePropagation) {
          event.stopImmediatePropagation();
        }

        handleClose();
        return;
      }

      if (event.key === "ArrowDown") {
        if (searchResults.length === 0) return;

        event.preventDefault();

        setSelectedIndex((prev) =>
          prev < searchResults.length - 1 ? prev + 1 : prev
        );
        return;
      }

      if (event.key === "ArrowUp") {
        if (searchResults.length === 0) return;

        event.preventDefault();

        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        return;
      }

      if (event.key === "Enter") {
        if (searchResults.length === 0) return;

        event.preventDefault();
        event.stopPropagation();

        if (selectedIndex >= 0 && searchResults[selectedIndex]) {
          handleSelectProduct(searchResults[selectedIndex]);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [isOpen, searchResults, selectedIndex, addingProduct]);

  useEffect(() => {
    if (selectedIndex >= 0 && resultsListRef.current) {
      const container = resultsListRef.current;
      const items = container.querySelectorAll(`.${styles.resultItem}`);

      if (items[selectedIndex]) {
        items[selectedIndex].scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "nearest",
        });
      }
    }
  }, [selectedIndex]);

  useEffect(() => {
    if (!isOpen) return;

    stockRequestIdRef.current += 1;
    kitRequestIdRef.current += 1;

    if (!selectedProduct?.id) {
      lastStockProductKeyRef.current = "";
      lastKitProductKeyRef.current = "";
      setSelectedProductStocks([]);
      setKitValidation({ isValid: true, message: "", items: [] });
      setLoadingStocks(false);
      return;
    }

    if (selectedProduct.is_kit) {
      setSelectedProductStocks([]);

      if (lastKitProductKeyRef.current === selectedProductKey) {
        return;
      }

      lastKitProductKeyRef.current = selectedProductKey;
      lastStockProductKeyRef.current = "";

      validateKitStock(selectedProduct.id);
      return;
    }

    setKitValidation({ isValid: true, message: "", items: [] });
    lastKitProductKeyRef.current = "";

    if (selectedProduct.tracks_inventory) {
      if (lastStockProductKeyRef.current === selectedProductKey) {
        return;
      }

      lastStockProductKeyRef.current = selectedProductKey;
      fetchProductStocks(selectedProduct.id);
      return;
    }

    lastStockProductKeyRef.current = "";
    setSelectedProductStocks([]);
    setLoadingStocks(false);
  }, [isOpen, selectedProductKey]);

  const closeAppModal = () => {
    setAppModal((prev) => ({
      ...prev,
      isOpen: false,
    }));
  };

  const showAppWarning = (message, title = "Aviso") => {
    setAppModal({
      isOpen: true,
      type: "warning",
      title,
      message: String(message || ""),
      confirmText: "Entendido",
    });
  };

  const handleClose = () => {
    searchRequestIdRef.current += 1;
    stockRequestIdRef.current += 1;
    kitRequestIdRef.current += 1;

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    lastStockProductKeyRef.current = "";
    lastKitProductKeyRef.current = "";

    setSearchTerm("");
    setSearchResults([]);
    setSelectedIndex(-1);
    setSelectedProductStocks([]);
    setKitValidation({ isValid: true, message: "", items: [] });
    setLoading(false);
    setLoadingStocks(false);
    setAddingProduct(false);
    setError("");
    closeAppModal();
    onClose();
  };

  const normalizeText = (text) =>
    String(text || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

  const escapeSearchTerm = (term) => {
    return String(term || "")
      .trim()
      .replace(/[%_]/g, "")
      .replace(/,/g, " ");
  };

  const getProductName = (product) => {
    return String(product?.name || "").trim();
  };

  const getProductSortableName = (product) => {
    return normalizeText(getProductName(product)).replace(/\s+/g, " ");
  };

  const getProductWeightInKg = (product) => {
    const name = getProductName(product);

    const match = name.match(
      /(\d+(?:[.,]\d+)?)\s*(kg|kgs|kilo|kilos|g|gr|gramo|gramos)\b/i
    );

    if (!match) return Number.POSITIVE_INFINITY;

    const value = Number(String(match[1]).replace(",", "."));
    const unit = String(match[2] || "").toLowerCase();

    if (Number.isNaN(value)) return Number.POSITIVE_INFINITY;

    if (["g", "gr", "gramo", "gramos"].includes(unit)) {
      return value / 1000;
    }

    return value;
  };

  const getProductBaseName = (product) => {
    return getProductSortableName(product)
      .replace(
        /\b\d+(?:[.,]\d+)?\s*(kg|kgs|kilo|kilos|g|gr|gramo|gramos)\b/gi,
        ""
      )
      .replace(/\bkit\b/gi, "")
      .replace(/[()+\-_/]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  };

  const sortProductsByNameAndWeight = (productsList = []) => {
    return [...productsList].sort((a, b) => {
      const baseNameA = getProductBaseName(a);
      const baseNameB = getProductBaseName(b);

      const baseNameCompare = baseNameA.localeCompare(baseNameB, "es", {
        sensitivity: "base",
        numeric: true,
      });

      if (baseNameCompare !== 0) return baseNameCompare;

      const weightA = getProductWeightInKg(a);
      const weightB = getProductWeightInKg(b);

      if (weightA !== weightB) return weightA - weightB;

      const fullNameCompare = getProductSortableName(a).localeCompare(
        getProductSortableName(b),
        "es",
        {
          sensitivity: "base",
          numeric: true,
        }
      );

      if (fullNameCompare !== 0) return fullNameCompare;

      const barcodeA = String(a?.barcode || "");
      const barcodeB = String(b?.barcode || "");

      return barcodeA.localeCompare(barcodeB, "es", {
        sensitivity: "base",
        numeric: true,
      });
    });
  };

  const getProductCartQuantity = (productId, barcode = "", productName = "") => {
    const possibleKeys = [
      productId,
      barcode,
      productName,
    ]
      .map((key) => String(key || "").trim())
      .filter(Boolean);

    for (const key of possibleKeys) {
      const quantity = Number(cartQuantitiesMap[key] || 0);

      if (quantity > 0) {
        return quantity;
      }
    }

    return 0;
  };

  const getProductAvailableStock = (product) => {
    if (!product) return 0;

    if (!product.tracks_inventory || product.is_kit) {
      return Number(product.stock || 0);
    }

    const realStock = Number(product.real_stock ?? product.stock ?? 0);
    const quantityInSale = getProductCartQuantity(product.id, product.barcode, product.name);

    return Math.max(realStock - quantityInSale, 0);
  };

  const getBranchAvailableStock = (productId, branchId, stock) => {
    const realStock = Number(stock || 0);

    if (!productId || String(branchId) !== String(branch?.id)) {
      return realStock;
    }

    return Math.max(realStock - getProductCartQuantity(productId), 0);
  };

  const fetchDiscountsMap = async (productIds = []) => {
    if (!productIds.length) return {};

    const { data, error } = await supabase
      .from("product_discounts")
      .select(`
        product_id,
        enabled,
        discount_percent,
        discount_concept
      `)
      .in("product_id", productIds);

    if (error) throw error;

    const discountsMap = {};

    for (const row of data || []) {
      discountsMap[row.product_id] = {
        discount_enabled: !!row.enabled,
        discount_percent: Number(row.discount_percent || 0),
        discount_concept: row.discount_concept || "",
      };
    }

    return discountsMap;
  };

  const applyDiscountToProduct = (product, discountsMap) => {
    const discount = discountsMap[product.id];

    const discountEnabled =
      !!discount?.discount_enabled &&
      Number(discount?.discount_percent || 0) > 0;

    return {
      ...product,
      discount_enabled: discountEnabled,
      discount_percent: discountEnabled
        ? Number(discount.discount_percent || 0)
        : 0,
      discount_concept: discountEnabled ? discount.discount_concept || "" : "",
    };
  };

  const validateKitStock = async (kitProductId) => {
    if (!kitProductId || !branch?.id) return;

    const currentKitRequestId = ++kitRequestIdRef.current;

    try {
      setKitValidation({
        isValid: false,
        message: "Validando inventario del kit...",
        items: [],
      });

      const { data: kitRow, error: kitError } = await supabase
        .from("product_kits")
        .select("id, is_active")
        .eq("kit_product_id", kitProductId)
        .maybeSingle();

      if (currentKitRequestId !== kitRequestIdRef.current) return;
      if (kitError) throw kitError;

      if (!kitRow?.id) {
        setKitValidation({
          isValid: false,
          message: "Este kit no tiene configuración registrada.",
          items: [],
        });
        return;
      }

      if (kitRow.is_active === false) {
        setKitValidation({
          isValid: false,
          message: "Este kit está inactivo.",
          items: [],
        });
        return;
      }

      const { data: kitItems, error: itemsError } = await supabase
        .from("product_kit_items")
        .select(`
          id,
          component_product_id,
          quantity,
          products:component_product_id (
            id,
            barcode,
            name,
            tracks_inventory
          )
        `)
        .eq("kit_id", kitRow.id)
        .order("created_at", { ascending: true });

      if (currentKitRequestId !== kitRequestIdRef.current) return;
      if (itemsError) throw itemsError;

      if (!kitItems || kitItems.length === 0) {
        setKitValidation({
          isValid: false,
          message: "Este kit no tiene productos agregados.",
          items: [],
        });
        return;
      }

      const componentIds = kitItems
        .map((item) => item.component_product_id)
        .filter(Boolean);

      const { data: inventoryRows, error: inventoryError } = await supabase
        .from("branch_inventory")
        .select("product_id, stock, is_active, has_been_stocked")
        .eq("branch_id", branch.id)
        .in("product_id", componentIds);

      if (currentKitRequestId !== kitRequestIdRef.current) return;
      if (inventoryError) throw inventoryError;

      const inventoryMap = {};

      for (const row of inventoryRows || []) {
        inventoryMap[row.product_id] = row;
      }

      const validationItems = kitItems.map((item) => {
        const inventory = inventoryMap[item.component_product_id];
        const requiredQty = Number(item.quantity || 0);
        const realStock = Number(inventory?.stock || 0);
        const stock = getBranchAvailableStock(
          item.component_product_id,
          branch.id,
          realStock
        );
        const tracksInventory = item.products?.tracks_inventory !== false;

        let ok = true;
        let reason = "";

        if (tracksInventory) {
          if (!inventory) {
            ok = false;
            reason = "Sin inventario en esta sucursal";
          } else if (inventory.is_active === false) {
            ok = false;
            reason = "Inventario inactivo";
          } else if (inventory.has_been_stocked !== true) {
            ok = false;
            reason = "Sin inventario inicial";
          } else if (stock < requiredQty) {
            ok = false;
            reason = `Stock insuficiente (${stock}/${requiredQty})`;
          }
        }

        return {
          product_id: item.component_product_id,
          name: item.products?.name || "Producto",
          barcode: item.products?.barcode || "",
          requiredQty,
          stock,
          realStock,
          quantityInSale: getProductCartQuantity(item.component_product_id),
          ok,
          reason,
        };
      });

      const invalidItems = validationItems.filter((item) => !item.ok);

      setKitValidation({
        isValid: invalidItems.length === 0,
        message:
          invalidItems.length === 0
            ? "Kit disponible para venta."
            : "Este kit no puede venderse porque uno o más productos no tienen inventario suficiente.",
        items: validationItems,
      });
    } catch (err) {
      if (currentKitRequestId !== kitRequestIdRef.current) return;

      console.error("Error validando inventario del kit:", err);
      setKitValidation({
        isValid: false,
        message: "No se pudo validar el inventario del kit.",
        items: [],
      });
    }
  };

  const performSearch = async (term) => {
    const cleanTerm = String(term || "").trim();
    const currentRequestId = ++searchRequestIdRef.current;

    if (!cleanTerm || cleanTerm.length < 2) {
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

    if (!branch?.id) {
      if (currentRequestId !== searchRequestIdRef.current) return;

      setError("La sucursal actual no está cargada.");
      setSearchResults([]);
      setSelectedIndex(-1);
      setSelectedProductStocks([]);
      setKitValidation({ isValid: true, message: "", items: [] });
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const safeTerm = escapeSearchTerm(cleanTerm);
      const likeTerm = `%${safeTerm}%`;

      const { data: productRows, error: productsError } = await supabase
        .from("products")
        .select(`
          id,
          barcode,
          name,
          sale_price,
          cost_price,
          status,
          is_kit,
          is_global,
          tracks_inventory
        `)
        .eq("status", true)
        .or(`name.ilike.${likeTerm},barcode.ilike.${likeTerm}`)
        .limit(80);

      if (currentRequestId !== searchRequestIdRef.current) return;
      if (productsError) throw productsError;

      const matchedProducts = productRows || [];
      const matchedProductIds = matchedProducts
        .map((product) => product.id)
        .filter(Boolean);

      if (matchedProductIds.length === 0) {
        lastStockProductKeyRef.current = "";
        lastKitProductKeyRef.current = "";

        setSearchResults([]);
        setSelectedIndex(-1);
        setSelectedProductStocks([]);
        setKitValidation({ isValid: true, message: "", items: [] });
        return;
      }

      const [
        inventoryResponse,
        discountsMap,
      ] = await Promise.all([
        supabase
          .from("branch_inventory")
          .select(`
            id,
            branch_id,
            product_id,
            stock,
            is_active,
            has_been_stocked,
            cost_price,
            sale_price,
            updated_at
          `)
          .eq("branch_id", branch.id)
          .in("product_id", matchedProductIds),

        fetchDiscountsMap(matchedProductIds),
      ]);

      if (currentRequestId !== searchRequestIdRef.current) return;

      if (inventoryResponse.error) {
        throw inventoryResponse.error;
      }

      const inventoryRows = inventoryResponse.data || [];
      const inventoryMap = {};

      for (const row of inventoryRows) {
        inventoryMap[row.product_id] = row;
      }

      const normalizedTerm = normalizeText(cleanTerm);

      const mergedResults = sortProductsByNameAndWeight(
        matchedProducts
          .map((product) => {
            const inventory = inventoryMap[product.id];
            const isKit = product.is_kit === true;
            const tracksInventory =
              product.tracks_inventory !== false || isKit === true;

            if (!isKit && tracksInventory) {
              if (!inventory) return null;
              if (inventory.is_active === false) return null;
              if (inventory.has_been_stocked !== true) return null;
            }

            const realStock = Number(inventory?.stock || 0);

            const baseProduct = {
              ...product,
              inventory_id: inventory?.id || null,
              branch_id: inventory?.branch_id || branch.id,
              stock: isKit || !tracksInventory ? null : realStock,
              real_stock: isKit || !tracksInventory ? null : realStock,
              quantity_in_sale: getProductCartQuantity(product.id, product.barcode, product.name),
              is_active_in_branch: isKit
                ? true
                : tracksInventory
                ? inventory?.is_active !== false
                : true,
              has_been_stocked: isKit
                ? true
                : tracksInventory
                ? inventory?.has_been_stocked === true
                : true,
              branch_sale_price: Number(
                inventory?.sale_price ?? product.sale_price ?? 0
              ),
              branch_cost_price: Number(
                inventory?.cost_price ?? product.cost_price ?? 0
              ),
              tracks_inventory: tracksInventory,
            };

            return applyDiscountToProduct(baseProduct, discountsMap);
          })
          .filter(Boolean)
          .filter((product) => {
            const searchable = normalizeText(
              `${product.name} ${product.barcode || ""}`
            );

            return searchable.includes(normalizedTerm);
          })
      );

      if (currentRequestId !== searchRequestIdRef.current) return;

      lastStockProductKeyRef.current = "";
      lastKitProductKeyRef.current = "";

      setSearchResults(mergedResults);
      setSelectedIndex(mergedResults.length > 0 ? 0 : -1);
      setSelectedProductStocks([]);
      setKitValidation({ isValid: true, message: "", items: [] });
    } catch (err) {
      if (currentRequestId !== searchRequestIdRef.current) return;

      console.error("Error buscando productos:", err);
      setError("No se pudieron cargar los productos.");
      setSearchResults([]);
      setSelectedIndex(-1);
      setSelectedProductStocks([]);
      setKitValidation({ isValid: true, message: "", items: [] });
    } finally {
      if (currentRequestId === searchRequestIdRef.current) {
        setLoading(false);
      }
    }
  };

  const fetchProductStocks = async (productId) => {
    if (!productId) {
      setSelectedProductStocks([]);
      setLoadingStocks(false);
      return;
    }

    const currentStockRequestId = ++stockRequestIdRef.current;

    try {
      setLoadingStocks(true);

      const { data: stockRows, error: stockError } = await supabase
        .from("branch_inventory")
        .select(`
          branch_id,
          stock,
          is_active,
          has_been_stocked,
          sale_price
        `)
        .eq("product_id", productId);

      if (currentStockRequestId !== stockRequestIdRef.current) return;
      if (stockError) throw stockError;

      const validStockRows = (stockRows || []).filter(
        (row) => row.is_active !== false && row.has_been_stocked === true
      );

      const branchIds = [
        ...new Set(validStockRows.map((row) => row.branch_id).filter(Boolean)),
      ];

      if (!branchIds.length) {
        setSelectedProductStocks([]);
        return;
      }

      const { data: branchRows, error: branchError } = await supabase
        .from("branches")
        .select("id, code, name")
        .in("id", branchIds);

      if (currentStockRequestId !== stockRequestIdRef.current) return;
      if (branchError) throw branchError;

      const branchMap = {};

      for (const branchRow of branchRows || []) {
        branchMap[branchRow.id] = branchRow;
      }

      const mergedStocks = validStockRows
        .map((row) => {
          const branchData = branchMap[row.branch_id];
          const realStock = Number(row.stock || 0);
          const availableStock = getBranchAvailableStock(
            productId,
            row.branch_id,
            realStock
          );

          return {
            branch_id: row.branch_id,
            branch_code: branchData?.code || "",
            branch_name: branchData?.name || "Sucursal",
            stock: availableStock,
            real_stock: realStock,
            quantity_in_sale:
              row.branch_id === branch?.id
                ? getProductCartQuantity(productId)
                : 0,
            is_active: row.is_active !== false,
            has_been_stocked: !!row.has_been_stocked,
            sale_price: Number(row.sale_price || 0),
            is_current_branch: row.branch_id === branch?.id,
          };
        })
        .sort((a, b) => {
          if (a.is_current_branch && !b.is_current_branch) return -1;
          if (!a.is_current_branch && b.is_current_branch) return 1;

          return a.branch_name.localeCompare(b.branch_name, "es", {
            sensitivity: "base",
          });
        });

      if (currentStockRequestId !== stockRequestIdRef.current) return;

      setSelectedProductStocks(mergedStocks);
    } catch (err) {
      if (currentStockRequestId !== stockRequestIdRef.current) return;

      console.error("Error cargando existencias por sucursal:", err);
      setSelectedProductStocks([]);
    } finally {
      if (currentStockRequestId === stockRequestIdRef.current) {
        setLoadingStocks(false);
      }
    }
  };

  const handleInputChange = (event) => {
    const value = event.target.value;

    setSearchTerm(value);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!value.trim() || value.trim().length < 2) {
      searchRequestIdRef.current += 1;
      stockRequestIdRef.current += 1;
      kitRequestIdRef.current += 1;

      lastStockProductKeyRef.current = "";
      lastKitProductKeyRef.current = "";

      setSearchResults([]);
      setSelectedIndex(-1);
      setSelectedProductStocks([]);
      setKitValidation({ isValid: true, message: "", items: [] });
      setError("");
      setLoading(false);
      setLoadingStocks(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(() => {
      performSearch(value);
    }, 350);
  };

  const handleSelectRow = (index) => {
    if (index === selectedIndex) return;
    setSelectedIndex(index);
  };

  const canAddSelectedProduct = (product) => {
    if (!product) return false;

    if (product.is_kit) {
      return kitValidation.isValid;
    }

    if (product.tracks_inventory) {
      return (
        product.is_active_in_branch &&
        product.has_been_stocked &&
        getProductAvailableStock(product) > 0
      );
    }

    return true;
  };

  const handleSelectProduct = async (product) => {
    if (!product || addingProduct) return;

    if (product.is_kit && !kitValidation.isValid) {
      showAppWarning(
        kitValidation.message ||
          "Este kit no tiene suficiente inventario en sus productos."
      );
      return;
    }

    if (!product.is_kit && product.tracks_inventory) {
      const availableStock = getProductAvailableStock(product);

      if (!product.is_active_in_branch) {
        showAppWarning("Este producto está inactivo en la sucursal actual.");
        return;
      }

      if (!product.has_been_stocked) {
        showAppWarning(
          "Este producto aún no tiene inventario inicial registrado."
        );
        return;
      }

      if (availableStock <= 0) {
        showAppWarning(
          "Este producto no tiene existencia disponible en la venta actual."
        );
        return;
      }
    }

    if (onAddToSale) {
      try {
        setAddingProduct(true);

        await onAddToSale({
          id: product.id,
          barcode: product.barcode,
          name: product.name,
          sale_price: product.branch_sale_price,
          cost_price: product.branch_cost_price,
          is_kit: !!product.is_kit,
          tracks_inventory: !!product.tracks_inventory,
          discount_enabled: !!product.discount_enabled,
          discount_percent: Number(product.discount_percent || 0),
          discount_concept: product.discount_concept || "",
        });

        handleClose();
      } catch (err) {
        console.error("Error agregando producto a la venta:", err);
        showAppWarning(
          err?.message || "No se pudo agregar el producto a la venta."
        );
      } finally {
        setAddingProduct(false);
      }

      return;
    }

    handleClose();
  };

  const getDisplayPrice = (product) => {
    const price = Number(product?.branch_sale_price || 0);
    const discountPercent = Number(product?.discount_percent || 0);

    if (!product?.discount_enabled || discountPercent <= 0) {
      return {
        originalPrice: price,
        finalPrice: price,
        discountAmount: 0,
      };
    }

    const discountAmount = price * (discountPercent / 100);
    const finalPrice = Math.max(price - discountAmount, 0);

    return {
      originalPrice: price,
      finalPrice,
      discountAmount,
    };
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div className={styles.searchModal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>
            <span className={styles.titleContent}>
              <img
                src={SearchIcon}
                alt=""
                className={styles.titleIcon}
                aria-hidden="true"
              />
              Búsqueda de productos
            </span>
          </h2>

          <button
            type="button"
            className={styles.closeButton}
            onClick={handleClose}
            aria-label="Cerrar modal"
          >
            <img
              src={XmarkIcon}
              alt=""
              className={styles.closeIcon}
              aria-hidden="true"
            />
          </button>
        </div>

        <div className={styles.searchModalBody}>
          <div className={styles.searchSection}>
            <label htmlFor="searchInput">Nombre o código del producto:</label>

            <div className={styles.inputContainer}>
              <img
                src={SearchIcon}
                alt=""
                className={styles.inputIcon}
                aria-hidden="true"
              />

              <input
                ref={searchInputRef}
                id="searchInput"
                type="text"
                className={styles.searchInput}
                value={searchTerm}
                onChange={handleInputChange}
                placeholder="Escribe nombre o código de barras..."
                autoComplete="off"
              />
            </div>

            <div className={styles.searchHelp}>
              Busca dentro de los productos vendibles para la sucursal actual:{" "}
              <strong>
                {branch?.code ? `${branch.code} - ` : ""}
                {branch?.name || "Sucursal actual"}
              </strong>
            </div>
          </div>

          <div className={styles.contentGrid}>
            <div className={styles.resultsSection}>
              <div className={styles.resultsHeader}>
                <span>Resultados de búsqueda</span>

                {loading ? (
                  <span className={styles.resultsCount}>Buscando...</span>
                ) : searchResults.length > 0 ? (
                  <span className={styles.resultsCount}>
                    {searchResults.length} producto(s)
                  </span>
                ) : null}
              </div>

              <div className={styles.resultsContainer} ref={resultsListRef}>
                {error ? (
                  <div className={styles.emptyMessage}>{error}</div>
                ) : loading ? (
                  <div className={styles.emptyMessage}>
                    Cargando productos...
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className={styles.emptyMessage}>
                    {searchTerm.trim().length >= 2
                      ? "No se encontraron productos vendibles para esta sucursal"
                      : "Ingresa al menos 2 caracteres para buscar"}
                  </div>
                ) : (
                  <div className={styles.resultsList}>
                    {searchResults.map((product, index) => {
                      const displayPrice = getDisplayPrice(product);
                      const canSell = canAddSelectedProduct(product);
                      const availableStock = getProductAvailableStock(product);
                      const quantityInSale = getProductCartQuantity(product.id, product.barcode, product.name);

                      return (
                        <div
                          key={`${product.id}-${index}`}
                          className={`${styles.resultItem} ${
                            index === selectedIndex ? styles.selectedResult : ""
                          } ${
                            product.tracks_inventory &&
                            !product.is_kit &&
                            availableStock <= 0
                              ? styles.unavailableResult
                              : ""
                          }`}
                          onClick={() => handleSelectRow(index)}
                          onDoubleClick={() => handleSelectProduct(product)}
                        >
                          <div className={styles.productTopRow}>
                            <div className={styles.productName}>
                              {product.name}
                              {product.is_kit ? " (KIT)" : ""}
                            </div>

                            <span
                              className={`${styles.statusBadge} ${
                                canSell
                                  ? styles.statusActive
                                  : styles.statusInactive
                              }`}
                            >
                              {canSell ? "Activo" : "Sin existencia"}
                            </span>
                          </div>

                          <div className={styles.productDetails}>
                            <span className={styles.productCode}>
                              Código: {product.barcode || "Sin código"}
                            </span>

                            <span className={styles.productPrice}>
                              ${Number(displayPrice.finalPrice || 0).toFixed(2)}
                            </span>

                            {product.discount_enabled && (
                              <span className={styles.productStock}>
                                Desc. {Number(product.discount_percent || 0)}%
                              </span>
                            )}

                            <span
                              className={`${styles.productStock} ${
                                product.is_kit
                                  ? canSell
                                    ? styles.inStock
                                    : styles.outOfStock
                                  : !product.tracks_inventory
                                  ? styles.inStock
                                  : availableStock > 0
                                  ? styles.inStock
                                  : styles.outOfStock
                              }`}
                            >
                              {product.is_kit
                                ? canSell
                                  ? "Kit disponible"
                                  : "Kit sin inventario completo"
                                : product.tracks_inventory
                                ? `Stock disponible: ${availableStock}`
                                : "Sin control de inventario"}
                            </span>

                            {product.tracks_inventory &&
                              !product.is_kit &&
                              quantityInSale > 0 && (
                                <span className={styles.reservedStock}>
                                  En venta: {quantityInSale}
                                </span>
                              )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className={styles.detailSection}>
              <div className={styles.detailCard}>
                <div className={styles.detailTitle}>Detalle del producto</div>

                {!selectedProduct ? (
                  <div className={styles.detailEmpty}>
                    Selecciona un producto para ver más detalles
                  </div>
                ) : (
                  <>
                    <div className={styles.selectedProductSummary}>
                      <div className={styles.selectedProductName}>
                        {selectedProduct.name}
                        {selectedProduct.is_kit ? " (KIT)" : ""}
                      </div>

                      <div className={styles.selectedProductMeta}>
                        <span>
                          Código: {selectedProduct.barcode || "Sin código"}
                        </span>

                        {(() => {
                          const displayPrice = getDisplayPrice(selectedProduct);

                          return (
                            <>
                              <span>
                                Precio actual: $
                                {Number(displayPrice.finalPrice || 0).toFixed(
                                  2
                                )}
                              </span>

                              {selectedProduct.discount_enabled && (
                                <span>
                                  Descuento:{" "}
                                  {Number(
                                    selectedProduct.discount_percent || 0
                                  ).toFixed(2)}
                                  %
                                </span>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    {selectedProduct.is_kit ? (
                      <div className={styles.stockBlock}>
                        <div className={styles.stockBlockTitle}>
                          Componentes del kit
                        </div>

                        {kitValidation.items.length === 0 ? (
                          <div className={styles.stockLoading}>
                            {kitValidation.message ||
                              "Validando componentes del kit..."}
                          </div>
                        ) : (
                          <div className={styles.branchStockList}>
                            {kitValidation.items.map((item) => (
                              <div
                                key={item.product_id}
                                className={`${styles.branchStockItem} ${
                                  item.ok
                                    ? styles.otherBranchItem
                                    : styles.currentBranchItem
                                }`}
                              >
                                <div className={styles.branchStockInfo}>
                                  <div className={styles.branchStockName}>
                                    {item.name}
                                  </div>

                                  <div className={styles.branchStockMeta}>
                                    Código: {item.barcode || "Sin código"}
                                    {item.quantityInSale > 0
                                      ? ` · En venta: ${item.quantityInSale}`
                                      : ""}
                                  </div>
                                </div>

                                <div className={styles.branchStockRight}>
                                  <span
                                    className={`${styles.branchStockQty} ${
                                      item.ok
                                        ? styles.branchStockPositive
                                        : styles.branchStockZero
                                    }`}
                                  >
                                    {item.stock}/{item.requiredQty}
                                  </span>

                                  <span
                                    className={`${styles.miniStatusBadge} ${
                                      item.ok
                                        ? styles.miniStatusActive
                                        : styles.miniStatusInactive
                                    }`}
                                  >
                                    {item.ok ? "OK" : item.reason}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : selectedProduct.tracks_inventory ? (
                      <div className={styles.stockBlock}>
                        <div className={styles.stockBlockTitle}>
                          Existencia por sucursal
                        </div>

                        {loadingStocks ? (
                          <div className={styles.stockLoading}>
                            Cargando existencias...
                          </div>
                        ) : selectedProductStocks.length === 0 ? (
                          <div className={styles.stockLoading}>
                            No hay existencias activas registradas para este
                            producto.
                          </div>
                        ) : (
                          <div className={styles.branchStockList}>
                            {selectedProductStocks.map((stockRow) => (
                              <div
                                key={stockRow.branch_id}
                                className={`${styles.branchStockItem} ${
                                  stockRow.is_current_branch
                                    ? styles.currentBranchItem
                                    : styles.otherBranchItem
                                }`}
                              >
                                <div className={styles.branchStockInfo}>
                                  <div className={styles.branchStockName}>
                                    {stockRow.branch_code
                                      ? `${stockRow.branch_code} - `
                                      : ""}
                                    {stockRow.branch_name}
                                  </div>

                                  <div className={styles.branchStockMeta}>
                                    {stockRow.is_current_branch
                                      ? stockRow.quantity_in_sale > 0
                                        ? `Sucursal actual · En venta: ${stockRow.quantity_in_sale}`
                                        : "Sucursal actual"
                                      : "Solo consulta"}
                                  </div>
                                </div>

                                <div className={styles.branchStockRight}>
                                  <span
                                    className={`${styles.branchStockQty} ${
                                      stockRow.stock > 0
                                        ? styles.branchStockPositive
                                        : styles.branchStockZero
                                    }`}
                                  >
                                    {stockRow.stock}
                                  </span>

                                  <span
                                    className={`${styles.miniStatusBadge} ${
                                      stockRow.is_active
                                        ? styles.miniStatusActive
                                        : styles.miniStatusInactive
                                    }`}
                                  >
                                    {stockRow.is_active ? "Activa" : "Inactiva"}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className={styles.infoNotice}>
                        Este producto no utiliza inventario. Puede venderse sin
                        control de existencias.
                      </div>
                    )}

                    {selectedProduct.is_kit && (
                      <div
                        className={
                          kitValidation.isValid
                            ? styles.infoNotice
                            : styles.errorNotice || styles.infoNotice
                        }
                      >
                        {kitValidation.message ||
                          "Validando inventario de componentes del kit."}
                      </div>
                    )}

{selectedProduct.discount_enabled && (
  <div className={styles.infoNotice}>
    <p className={styles.discountNoticeTitle}>
      Este producto tiene descuento automático aplicado.
    </p>

    {selectedProduct.discount_concept && (
      <p className={styles.discountNoticeReason}>
        <strong>Motivo:</strong> {selectedProduct.discount_concept}.
      </p>
    )}
  </div>
)}

                    <div className={styles.infoNotice}>
                      {selectedProduct.is_kit
                        ? "El kit no maneja inventario propio. Se valida el inventario disponible de sus componentes, restando lo que ya está en la venta actual."
                        : selectedProduct.tracks_inventory
                        ? "La existencia mostrada para la sucursal actual ya descuenta las piezas agregadas en esta venta."
                        : "Producto disponible para venta sin control de inventario."}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className={styles.modalActions}>
          <div className={styles.actionButtons}>
            <button
              type="button"
              className={`${styles.actionButton} ${styles.addButton}`}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();

                if (selectedProduct) {
                  handleSelectProduct(selectedProduct);
                }
              }}
              disabled={addingProduct || !canAddSelectedProduct(selectedProduct)}
            >
              {addingProduct ? "Agregando..." : "Agregar a la venta"}
            </button>

            <button
              type="button"
              className={`${styles.actionButton} ${styles.cancelButton}`}
              onClick={handleClose}
            >
              ESC - Cerrar
            </button>
          </div>

          <div className={styles.actionHints}>
            <span>↑↓ Navegar • Enter o doble clic para agregar</span>
          </div>
        </div>
      </div>

      <AppModal
        isOpen={appModal.isOpen}
        type={appModal.type}
        title={appModal.title}
        message={appModal.message}
        confirmText={appModal.confirmText}
        onClose={closeAppModal}
        onConfirm={closeAppModal}
      />
    </div>
  );
};

export default SearchModal;