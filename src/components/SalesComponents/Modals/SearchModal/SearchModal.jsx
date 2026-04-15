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

  // 🔥 Control para invalidar búsquedas viejas
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

    if (selectedProduct?.id) {
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

  const performSearch = async (term) => {
    const cleanTerm = String(term || "").trim();

    // 🔥 id único para esta búsqueda
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
          cost_price,
          sale_price,
          updated_at
        `)
        .eq("branch_id", branch.id)
        .order("updated_at", { ascending: false });

      // 🔥 si ya hay una búsqueda más nueva, ignoramos esta
      if (currentRequestId !== searchRequestIdRef.current) return;

      if (inventoryError) throw inventoryError;

      if (!inventoryRows?.length) {
        setSearchResults([]);
        setSelectedIndex(-1);
        setSelectedProductStocks([]);
        return;
      }

      const productIds = [
        ...new Set(inventoryRows.map((row) => row.product_id).filter(Boolean)),
      ];

      if (!productIds.length) {
        setSearchResults([]);
        setSelectedIndex(-1);
        setSelectedProductStocks([]);
        return;
      }

      const { data: productsRows, error: productsError } = await supabase
        .from("products")
        .select(`
          id,
          barcode,
          name,
          sale_price,
          cost_price,
          status,
          is_kit
        `)
        .in("id", productIds)
        .eq("status", true);

      // 🔥 otra validación después del await
      if (currentRequestId !== searchRequestIdRef.current) return;

      if (productsError) throw productsError;

      const productMap = {};
      for (const product of productsRows || []) {
        productMap[product.id] = product;
      }

      const mergedResults = (inventoryRows || [])
        .map((inventory) => {
          const product = productMap[inventory.product_id];
          if (!product) return null;

          return {
            ...product,
            inventory_id: inventory.id,
            branch_id: inventory.branch_id,
            stock: Number(inventory.stock || 0),
            is_active_in_branch: inventory.is_active !== false,
            branch_sale_price: Number(
              inventory.sale_price ?? product.sale_price ?? 0
            ),
            branch_cost_price: Number(
              inventory.cost_price ?? product.cost_price ?? 0
            ),
          };
        })
        .filter(Boolean)
        .filter((product) => {
          const searchable = normalizeText(
            `${product.name} ${product.barcode || ""}`
          );
          return searchable.includes(normalizedTerm);
        })
        .sort((a, b) => {
          const aActive = a.is_active_in_branch ? 1 : 0;
          const bActive = b.is_active_in_branch ? 1 : 0;

          if (aActive !== bActive) return bActive - aActive;
          if (a.stock !== b.stock) return b.stock - a.stock;

          return String(a.name || "").localeCompare(String(b.name || ""), "es", {
            sensitivity: "base",
          });
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
          sale_price
        `)
        .eq("product_id", productId);

      if (currentStockRequestId !== stockRequestIdRef.current) return;

      if (stockError) throw stockError;

      const branchIds = [
        ...new Set((stockRows || []).map((row) => row.branch_id).filter(Boolean)),
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

      const mergedStocks = (stockRows || [])
        .map((row) => {
          const branchData = branchMap[row.branch_id];

          return {
            branch_id: row.branch_id,
            branch_code: branchData?.code || "",
            branch_name: branchData?.name || "Sucursal",
            stock: Number(row.stock || 0),
            is_active: row.is_active !== false,
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
      // 🔥 invalidamos cualquier búsqueda pendiente
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

    if (!product.is_active_in_branch) {
      alert("Este producto está inactivo en la sucursal actual.");
      return;
    }

    if (Number(product.stock || 0) <= 0) {
      alert("Este producto no tiene existencia disponible en la sucursal actual.");
      return;
    }

    if (onAddToSale) {
      await onAddToSale({
        id: product.id,
        barcode: product.barcode,
        name: product.name,
        sale_price: product.branch_sale_price,
        cost_price: product.branch_cost_price,
        is_kit: !!product.is_kit,
      });
    }

    handleClose();
  };

  const selectedProduct =
    selectedIndex >= 0 ? searchResults[selectedIndex] : null;

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
              Busca solo dentro del inventario de la sucursal actual:{" "}
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
                  <div className={styles.emptyMessage}>Cargando productos...</div>
                ) : searchResults.length === 0 ? (
                  <div className={styles.emptyMessage}>
                    {searchTerm.trim()
                      ? "No se encontraron productos en esta sucursal"
                      : "Ingresa el nombre o código de un producto para buscar"}
                  </div>
                ) : (
                  <div className={styles.resultsList}>
                    {searchResults.map((product, index) => (
                      <div
                        key={`${product.id}-${index}`}
                        className={`${styles.resultItem} ${
                          index === selectedIndex ? styles.selectedResult : ""
                        }`}
                        onClick={() => handleSelectRow(index)}
                        onDoubleClick={() => handleSelectProduct(product)}
                      >
                        <div className={styles.productTopRow}>
                          <div className={styles.productName}>{product.name}</div>

                          <span
                            className={`${styles.statusBadge} ${
                              product.is_active_in_branch
                                ? styles.statusActive
                                : styles.statusInactive
                            }`}
                          >
                            {product.is_active_in_branch ? "Activo" : "Inactivo"}
                          </span>
                        </div>

                        <div className={styles.productDetails}>
                          <span className={styles.productCode}>
                            Código: {product.barcode || "Sin código"}
                          </span>

                          <span className={styles.productPrice}>
                            ${Number(product.branch_sale_price || 0).toFixed(2)}
                          </span>

                          <span
                            className={`${styles.productStock} ${
                              Number(product.stock || 0) > 0
                                ? styles.inStock
                                : styles.outOfStock
                            }`}
                          >
                            Stock actual: {Number(product.stock || 0)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className={styles.detailSection}>
              <div className={styles.detailCard}>
                <div className={styles.detailTitle}>Detalle del producto</div>

                {!selectedProduct ? (
                  <div className={styles.detailEmpty}>
                    Selecciona un producto para ver sus existencias por sucursal
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
                        <span>
                          Precio actual: $
                          {Number(selectedProduct.branch_sale_price || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>

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
                          No hay existencias registradas para este producto.
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

                    <div className={styles.infoNotice}>
                      Solo puedes agregar a la venta productos del inventario de
                      la sucursal actual.
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
                !selectedProduct.is_active_in_branch ||
                Number(selectedProduct.stock || 0) <= 0
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