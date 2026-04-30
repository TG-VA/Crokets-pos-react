import React, { useState, useEffect, useRef } from "react";
import styles from "./SearchModal.module.css";
import { supabase } from "../../../../lib/supabaseClient";
import { useBranch } from "../../../../contexts/BranchContext";

const SearchModal = ({ isOpen, onClose, onAddToSale }) => {
  const { branch } = useBranch();

  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [selectedProductStocks, setSelectedProductStocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingStocks, setLoadingStocks] = useState(false);
  const [error, setError] = useState("");

  const resultsListRef = useRef(null);
  const searchInputRef = useRef(null);

  const searchRequestIdRef = useRef(0);
  const stockRequestIdRef = useRef(0);

  useEffect(() => {
    if (!isOpen) return;

    setSearchTerm("");
    setSearchResults([]);
    setSelectedIndex(-1);
    setSelectedProductStocks([]);
    setLoading(false);
    setLoadingStocks(false);
    setError("");

    searchRequestIdRef.current += 1;
    stockRequestIdRef.current += 1;

    const timer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 80);

    return () => clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        handleClose();
        return;
      }

      if (e.key === "ArrowDown") {
        if (searchResults.length === 0) return;
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < searchResults.length - 1 ? prev + 1 : prev
        );
        return;
      }

      if (e.key === "ArrowUp") {
        if (searchResults.length === 0) return;
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        return;
      }

      if (e.key === "Enter") {
        if (searchResults.length === 0) return;
        e.preventDefault();

        if (selectedIndex >= 0 && searchResults[selectedIndex]) {
          handleSelectProduct(searchResults[selectedIndex]);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [isOpen, searchResults, selectedIndex]);

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
    const selectedProduct =
      selectedIndex >= 0 ? searchResults[selectedIndex] : null;

    if (selectedProduct?.id && selectedProduct.tracks_inventory) {
      fetchProductStocks(selectedProduct.id);
    } else {
      stockRequestIdRef.current += 1;
      setSelectedProductStocks([]);
    }
  }, [selectedIndex, searchResults]);

  const handleClose = () => {
    searchRequestIdRef.current += 1;
    stockRequestIdRef.current += 1;

    setSearchTerm("");
    setSearchResults([]);
    setSelectedIndex(-1);
    setSelectedProductStocks([]);
    setLoading(false);
    setLoadingStocks(false);
    setError("");
    onClose();
  };

  const normalizeText = (text) =>
    String(text || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

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

  const performSearch = async (term) => {
    const cleanTerm = String(term || "").trim();
    const currentRequestId = ++searchRequestIdRef.current;

    if (!cleanTerm) {
      setSearchResults([]);
      setSelectedIndex(-1);
      setSelectedProductStocks([]);
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
      return;
    }

    try {
      setLoading(true);
      setError("");

      const normalizedTerm = normalizeText(cleanTerm);

      const { data: inventoryRows, error: inventoryError } = await supabase
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
        .order("updated_at", { ascending: false });

      if (currentRequestId !== searchRequestIdRef.current) return;
      if (inventoryError) throw inventoryError;

      const productIds = [
        ...new Set(
          (inventoryRows || []).map((row) => row.product_id).filter(Boolean)
        ),
      ];

      let inventoryProductsRows = [];

      if (productIds.length > 0) {
        const { data, error: productsError } = await supabase
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
          .in("id", productIds)
          .eq("status", true);

        if (currentRequestId !== searchRequestIdRef.current) return;
        if (productsError) throw productsError;

        inventoryProductsRows = data || [];
      }

      const { data: nonInventoryProductsRows, error: nonInventoryError } =
        await supabase
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
          .eq("is_global", true)
          .eq("tracks_inventory", false);

      if (currentRequestId !== searchRequestIdRef.current) return;
      if (nonInventoryError) throw nonInventoryError;

      const allProductIds = [
        ...new Set([
          ...(inventoryProductsRows || []).map((product) => product.id),
          ...(nonInventoryProductsRows || []).map((product) => product.id),
        ]),
      ].filter(Boolean);

      const discountsMap = await fetchDiscountsMap(allProductIds);

      if (currentRequestId !== searchRequestIdRef.current) return;

      const productMap = {};

      for (const product of inventoryProductsRows || []) {
        productMap[product.id] = product;
      }

      const inventoryResults = (inventoryRows || [])
        .map((inventory) => {
          const product = productMap[inventory.product_id];
          if (!product) return null;

          const baseProduct = {
            ...product,
            inventory_id: inventory.id,
            branch_id: inventory.branch_id,
            stock: Number(inventory.stock || 0),
            is_active_in_branch: inventory.is_active !== false,
            has_been_stocked: !!inventory.has_been_stocked,
            branch_sale_price: Number(
              inventory.sale_price ?? product.sale_price ?? 0
            ),
            branch_cost_price: Number(
              inventory.cost_price ?? product.cost_price ?? 0
            ),
            tracks_inventory: true,
          };

          return applyDiscountToProduct(baseProduct, discountsMap);
        })
        .filter(Boolean);

      const inventoryProductIdSet = new Set(inventoryResults.map((p) => p.id));

      const nonInventoryResults = (nonInventoryProductsRows || [])
        .filter((product) => !inventoryProductIdSet.has(product.id))
        .map((product) => {
          const baseProduct = {
            ...product,
            inventory_id: null,
            branch_id: branch.id,
            stock: null,
            is_active_in_branch: true,
            has_been_stocked: true,
            branch_sale_price: Number(product.sale_price ?? 0),
            branch_cost_price: Number(product.cost_price ?? 0),
            tracks_inventory: false,
          };

          return applyDiscountToProduct(baseProduct, discountsMap);
        });

      const mergedResults = [...inventoryResults, ...nonInventoryResults]
        .filter((product) => {
          if (product.tracks_inventory) {
            if (!product.is_active_in_branch) return false;
            if (!product.has_been_stocked) return false;
          }

          const searchable = normalizeText(
            `${product.name} ${product.barcode || ""}`
          );

          return searchable.includes(normalizedTerm);
        })
        .sort((a, b) => {
          const aTracks = a.tracks_inventory ? 1 : 0;
          const bTracks = b.tracks_inventory ? 1 : 0;

          if (aTracks !== bTracks) return bTracks - aTracks;

          const aActive = a.is_active_in_branch ? 1 : 0;
          const bActive = b.is_active_in_branch ? 1 : 0;

          if (aActive !== bActive) return bActive - aActive;

          const aStock = Number(a.stock ?? -1);
          const bStock = Number(b.stock ?? -1);

          if (aStock !== bStock) return bStock - aStock;

          return String(a.name || "").localeCompare(
            String(b.name || ""),
            "es",
            { sensitivity: "base" }
          );
        });

      if (currentRequestId !== searchRequestIdRef.current) return;

      setSearchResults(mergedResults);
      setSelectedIndex(mergedResults.length > 0 ? 0 : -1);
      setSelectedProductStocks([]);
    } catch (err) {
      if (currentRequestId !== searchRequestIdRef.current) return;

      console.error("Error buscando productos:", err);
      setError("No se pudieron cargar los productos.");
      setSearchResults([]);
      setSelectedIndex(-1);
      setSelectedProductStocks([]);
    } finally {
      if (currentRequestId === searchRequestIdRef.current) {
        setLoading(false);
      }
    }
  };

  const fetchProductStocks = async (productId) => {
    if (!productId) {
      setSelectedProductStocks([]);
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

          return {
            branch_id: row.branch_id,
            branch_code: branchData?.code || "",
            branch_name: branchData?.name || "Sucursal",
            stock: Number(row.stock || 0),
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

  const handleInputChange = async (e) => {
    const value = e.target.value;
    setSearchTerm(value);

    if (!value.trim()) {
      searchRequestIdRef.current += 1;
      stockRequestIdRef.current += 1;

      setSearchResults([]);
      setSelectedIndex(-1);
      setSelectedProductStocks([]);
      setError("");
      setLoading(false);
      setLoadingStocks(false);
      return;
    }

    await performSearch(value);
  };

  const handleSelectRow = (index) => {
    setSelectedIndex(index);
  };

  const handleSelectProduct = async (product) => {
    if (!product) return;

    if (product.tracks_inventory) {
      if (!product.is_active_in_branch) {
        alert("Este producto está inactivo en la sucursal actual.");
        return;
      }

      if (!product.has_been_stocked) {
        alert("Este producto aún no tiene inventario inicial registrado.");
        return;
      }

      if (Number(product.stock || 0) <= 0) {
        alert(
          "Este producto no tiene existencia disponible en la sucursal actual."
        );
        return;
      }
    }

    if (onAddToSale) {
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
    }

    handleClose();
  };

  const selectedProduct =
    selectedIndex >= 0 ? searchResults[selectedIndex] : null;

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
          <h2>Búsqueda de Productos</h2>
          <button className={styles.closeButton} onClick={handleClose}>
            ✕
          </button>
        </div>

        <div className={styles.searchModalBody}>
          <div className={styles.searchSection}>
            <label htmlFor="searchInput">Nombre o código del producto:</label>

            <div className={styles.inputContainer}>
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
                    {searchTerm.trim()
                      ? "No se encontraron productos vendibles para esta sucursal"
                      : "Ingresa el nombre o código de un producto para buscar"}
                  </div>
                ) : (
                  <div className={styles.resultsList}>
                    {searchResults.map((product, index) => {
                      const displayPrice = getDisplayPrice(product);

                      return (
                        <div
                          key={`${product.id}-${index}`}
                          className={`${styles.resultItem} ${
                            index === selectedIndex ? styles.selectedResult : ""
                          }`}
                          onClick={() => handleSelectRow(index)}
                          onDoubleClick={() => handleSelectProduct(product)}
                        >
                          <div className={styles.productTopRow}>
                            <div className={styles.productName}>
                              {product.name}
                            </div>

                            <span
                              className={`${styles.statusBadge} ${
                                product.is_active_in_branch
                                  ? styles.statusActive
                                  : styles.statusInactive
                              }`}
                            >
                              {product.tracks_inventory
                                ? product.is_active_in_branch
                                  ? "Activo"
                                  : "Inactivo"
                                : "Activo"}
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
                                !product.tracks_inventory
                                  ? styles.inStock
                                  : Number(product.stock || 0) > 0
                                  ? styles.inStock
                                  : styles.outOfStock
                              }`}
                            >
                              {product.tracks_inventory
                                ? `Stock actual: ${Number(product.stock || 0)}`
                                : "Sin control de inventario"}
                            </span>
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

                    {selectedProduct.tracks_inventory ? (
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
                                      ? "Sucursal actual"
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

                    {selectedProduct.discount_enabled && (
                      <div className={styles.infoNotice}>
                        Este producto tiene descuento automático aplicado.
                        {selectedProduct.discount_concept
                          ? ` Motivo: ${selectedProduct.discount_concept}.`
                          : ""}
                      </div>
                    )}

                    <div className={styles.infoNotice}>
                      {selectedProduct.tracks_inventory
                        ? "Solo puedes agregar a la venta productos con inventario de la sucursal actual."
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
              className={`${styles.actionButton} ${styles.addButton}`}
              onClick={() => {
                if (selectedProduct) {
                  handleSelectProduct(selectedProduct);
                }
              }}
              disabled={
                !selectedProduct ||
                (selectedProduct.tracks_inventory &&
                  (!selectedProduct.is_active_in_branch ||
                    !selectedProduct.has_been_stocked ||
                    Number(selectedProduct.stock || 0) <= 0))
              }
            >
              Agregar a la venta
            </button>

            <button
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
    </div>
  );
};

export default SearchModal;