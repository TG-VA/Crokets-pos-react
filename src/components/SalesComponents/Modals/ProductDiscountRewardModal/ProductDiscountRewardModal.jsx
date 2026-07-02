import React, { useEffect, useMemo, useRef, useState } from "react";
import styles from "./ProductDiscountRewardModal.module.css";
import { supabase } from "../../../../lib/supabaseClient";
import AppModal from "../../../AppModal/AppModal";

const MIN_SEARCH_LENGTH = 2;

const toNumber = (value) => {
  const numberValue = Number(value || 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

const formatCurrency = (value) => {
  return `$${toNumber(value).toFixed(2)}`;
};

const getRewardDiscountLabel = (reward) => {
  const discountType = reward?.discount_type;
  const discountValue = toNumber(reward?.discount_value);

  if (discountType === "percent") {
    return `${discountValue}% de descuento`;
  }

  if (discountType === "fixed") {
    return `${formatCurrency(discountValue)} de descuento`;
  }

  return "Descuento de recompensa";
};

const productUsesInventory = (product) => {
  if (product?.tracks_inventory === false) return false;
  return true;
};

const getProductSalePrice = (product, inventoryByProduct = {}) => {
  const inventoryRow = inventoryByProduct[product?.id];

  if (
    inventoryRow &&
    inventoryRow.sale_price !== null &&
    inventoryRow.sale_price !== undefined
  ) {
    return toNumber(inventoryRow.sale_price);
  }

  return toNumber(product?.sale_price);
};

const calculateRewardDiscount = (product, reward, inventoryByProduct = {}) => {
  const price = getProductSalePrice(product, inventoryByProduct);
  const discountType = reward?.discount_type;
  const discountValue = toNumber(reward?.discount_value);

  let rawDiscount = 0;

  if (discountType === "percent") {
    rawDiscount = price * (discountValue / 100);
  }

  if (discountType === "fixed") {
    rawDiscount = discountValue;
  }

  const closedDiscount = Math.floor(rawDiscount);
  const discountAmount = Math.min(closedDiscount, price);
  const finalPrice = Math.max(price - discountAmount, 0);

  return {
    price,
    discountAmount,
    finalPrice,
  };
};

const ProductDiscountRewardModal = ({
  isOpen,
  reward = null,
  branchId = null,
  cartProducts = [],
  onClose,
  onConfirm,
}) => {
  const searchInputRef = useRef(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [products, setProducts] = useState([]);
  const [inventoryByProduct, setInventoryByProduct] = useState({});
  const [selectedProductsById, setSelectedProductsById] = useState({});
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [appModal, setAppModal] = useState({
    isOpen: false,
    type: "warning",
    title: "Aviso",
    message: "",
    confirmText: "Entendido",
  });

  const rewardQuantity = Math.max(toNumber(reward?.reward_quantity || 1), 1);
  const rewardRedeemQuantity = Math.max(
    toNumber(reward?.redeemQuantity || 1),
    1
  );
  const totalUnitsToApply = rewardQuantity * rewardRedeemQuantity;

  const closeAppModal = () => {
    setAppModal((prev) => ({
      ...prev,
      isOpen: false,
    }));
  };

  const showAppModal = ({
    type = "warning",
    title = "Aviso",
    message = "",
    confirmText = "Entendido",
  }) => {
    setAppModal({
      isOpen: true,
      type,
      title,
      message: String(message || ""),
      confirmText,
    });
  };

  const showAppWarning = (message, title = "Aviso") => {
    showAppModal({
      type: "warning",
      title,
      message,
      confirmText: "Entendido",
    });
  };

  const showAppDanger = (message, title = "Error") => {
    showAppModal({
      type: "danger",
      title,
      message,
      confirmText: "Entendido",
    });
  };

  const getCartQuantityForProduct = (productId) => {
    if (!productId) return 0;

    return (Array.isArray(cartProducts) ? cartProducts : []).reduce(
      (sum, item) => {
        if (item?.id !== productId) return sum;
        return sum + toNumber(item?.cantidad || item?.quantity || 0);
      },
      0
    );
  };

  const getInventoryStatus = (product) => {
    if (!product?.id) {
      return {
        available: false,
        stock: 0,
        rawStock: 0,
        usedInCart: 0,
        label: "Producto inválido",
      };
    }

    if (product.status === false) {
      return {
        available: false,
        stock: 0,
        rawStock: 0,
        usedInCart: 0,
        label: "Producto inactivo",
      };
    }

    if (!productUsesInventory(product)) {
      return {
        available: true,
        stock: null,
        rawStock: null,
        usedInCart: 0,
        label: "No controla inventario",
      };
    }

    const inventoryRow = inventoryByProduct[product.id];
    const usedInCart = getCartQuantityForProduct(product.id);

    if (!inventoryRow) {
      return {
        available: false,
        stock: 0,
        rawStock: 0,
        usedInCart,
        label: "Sin inventario en sucursal",
      };
    }

    if (inventoryRow.is_active === false) {
      return {
        available: false,
        stock: 0,
        rawStock: toNumber(inventoryRow.stock),
        usedInCart,
        label: "Inactivo en sucursal",
      };
    }

    const rawStock = toNumber(inventoryRow.stock);
    const availableStock = Math.max(rawStock - usedInCart, 0);

    if (inventoryRow.has_been_stocked !== true && rawStock <= 0) {
      return {
        available: false,
        stock: availableStock,
        rawStock,
        usedInCart,
        label: "Sin inventario inicial",
      };
    }

    if (rawStock <= 0) {
      return {
        available: false,
        stock: availableStock,
        rawStock,
        usedInCart,
        label: "Sin existencia",
      };
    }

    if (availableStock <= 0) {
      return {
        available: false,
        stock: availableStock,
        rawStock,
        usedInCart,
        label:
          usedInCart > 0 ? "Sin disponible por carrito" : "Sin existencia",
      };
    }

    return {
      available: true,
      stock: availableStock,
      rawStock,
      usedInCart,
      label:
        usedInCart > 0
          ? `${availableStock} disponible${
              availableStock !== 1 ? "s" : ""
            } (${usedInCart} en carrito)`
          : `${availableStock} disponible${availableStock !== 1 ? "s" : ""}`,
    };
  };

  const loadProducts = async () => {
    try {
      setLoadingProducts(true);
      setError("");

      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select(`
          id,
          barcode,
          name,
          sale_price,
          cost_price,
          status,
          tracks_inventory,
          is_kit
        `)
        .order("name", { ascending: true });

      if (productsError) throw productsError;

      const cleanProducts = (productsData || []).filter((product) => {
        return product?.id && product?.status !== false;
      });

      setProducts(cleanProducts);

      const productIds = cleanProducts
        .filter((product) => productUsesInventory(product))
        .map((product) => product.id)
        .filter(Boolean);

      if (!branchId || productIds.length === 0) {
        setInventoryByProduct({});
        return;
      }

      const { data: inventoryData, error: inventoryError } = await supabase
        .from("branch_inventory")
        .select(`
          product_id,
          stock,
          is_active,
          has_been_stocked,
          sale_price,
          cost_price
        `)
        .eq("branch_id", branchId)
        .in("product_id", productIds);

      if (inventoryError) throw inventoryError;

      const inventoryMap = {};

      for (const row of inventoryData || []) {
        inventoryMap[row.product_id] = row;
      }

      setInventoryByProduct(inventoryMap);
    } catch (err) {
      console.error("Error cargando productos para descuento:", err);
      setProducts([]);
      setInventoryByProduct({});
      const errorMessage =
        err?.message || "No se pudieron cargar los productos de la sucursal.";

      setError(errorMessage);
      showAppDanger(errorMessage, "Error cargando productos");
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    setSearchTerm("");
    setSelectedProductsById({});
    setSaving(false);
    setError("");
    closeAppModal();
    loadProducts();

    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 80);
  }, [isOpen, branchId, reward?.id]);

  const selectedProductsCount = useMemo(() => {
    return Object.values(selectedProductsById).reduce((sum, quantity) => {
      return sum + toNumber(quantity);
    }, 0);
  }, [selectedProductsById]);

  const selectedProducts = useMemo(() => {
    return Object.entries(selectedProductsById)
      .map(([productId, quantity]) => {
        const product = products.find((item) => item.id === productId);

        if (!product || toNumber(quantity) <= 0) return null;

        return {
          product,
          quantity: toNumber(quantity),
          discount: calculateRewardDiscount(product, reward, inventoryByProduct),
        };
      })
      .filter(Boolean);
  }, [products, selectedProductsById, reward, inventoryByProduct]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event) => {
      if (appModal.isOpen) return;

      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();

        if (!saving) {
          onClose?.();
        }
      }

      if (event.key === "Enter") {
        event.preventDefault();
        event.stopPropagation();

        if (selectedProductsCount === totalUnitsToApply && !saving) {
          handleConfirm();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [
    isOpen,
    saving,
    selectedProductsCount,
    totalUnitsToApply,
    products,
    inventoryByProduct,
    appModal.isOpen,
  ]);

  const filteredProducts = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    if (search.length < MIN_SEARCH_LENGTH) return [];

    return products.filter((product) => {
      const price = getProductSalePrice(product, inventoryByProduct);
      const values = [product.name, product.barcode, price];

      const matchesSearch = values.some((value) =>
        String(value || "").toLowerCase().includes(search)
      );

      if (!matchesSearch) return false;

      const inventoryStatus = getInventoryStatus(product);

      if (!inventoryStatus.available) return false;

      const discount = calculateRewardDiscount(
        product,
        reward,
        inventoryByProduct
      );

      return discount.discountAmount > 0;
    });
  }, [products, inventoryByProduct, searchTerm, cartProducts, reward]);

  const canConfirm =
    selectedProductsCount === totalUnitsToApply &&
    selectedProducts.length > 0 &&
    selectedProducts.every((item) => item.discount.discountAmount > 0) &&
    !saving &&
    !loadingProducts;

  const handleAddProduct = (product) => {
    if (!product?.id || saving) return;

    const status = getInventoryStatus(product);

    if (!status.available) return;

    const discount = calculateRewardDiscount(
      product,
      reward,
      inventoryByProduct
    );

    if (discount.discountAmount <= 0) {
      const errorMessage =
        "La recompensa no genera un descuento válido para este producto.";

      setError(errorMessage);
      showAppWarning(errorMessage, "Descuento no aplicable");
      return;
    }

    if (selectedProductsCount >= totalUnitsToApply) return;

    const currentProductQty = toNumber(selectedProductsById[product.id]);

    if (status.stock !== null && currentProductQty >= status.stock) return;

    setSelectedProductsById((prev) => ({
      ...prev,
      [product.id]: toNumber(prev[product.id]) + 1,
    }));

    setError("");
  };

  const handleSubtractProduct = (product) => {
    if (!product?.id || saving) return;

    setSelectedProductsById((prev) => {
      const currentQty = toNumber(prev[product.id]);

      if (currentQty <= 0) return prev;

      const next = {
        ...prev,
        [product.id]: currentQty - 1,
      };

      if (next[product.id] <= 0) {
        delete next[product.id];
      }

      return next;
    });

    setError("");
  };

  const handleConfirm = async () => {
    if (!canConfirm) return;

    const selections = [];

    for (const selectedItem of selectedProducts) {
      const product = selectedItem.product;
      const quantity = toNumber(selectedItem.quantity);
      const status = getInventoryStatus(product);

      if (!status.available) {
        const errorMessage = "Uno de los productos seleccionados ya no está disponible.";

        setError(errorMessage);
        showAppWarning(errorMessage, "Producto no disponible");
        return;
      }

      const discount = calculateRewardDiscount(
        product,
        reward,
        inventoryByProduct
      );

      if (discount.discountAmount <= 0) {
        const errorMessage = "La recompensa no genera un descuento válido.";

        setError(errorMessage);
        showAppWarning(errorMessage, "Descuento no aplicable");
        return;
      }

      const inventoryRow = inventoryByProduct[product.id];

      selections.push({
        reward,
        product: {
          ...product,
          sale_price: discount.price,
          cost_price:
            inventoryRow?.cost_price !== null && inventoryRow?.cost_price !== undefined
              ? toNumber(inventoryRow.cost_price)
              : toNumber(product.cost_price),
          tracks_inventory: productUsesInventory(product),
        },
        quantity,
        originalUnitPrice: discount.price,
        discountAmount: discount.discountAmount,
        finalUnitPrice: discount.finalPrice,
        discountType: reward?.discount_type || null,
        discountValue: toNumber(reward?.discount_value),
        totalPoints:
          toNumber(reward?.points_required) *
          Math.max(quantity / Math.max(rewardQuantity, 1), 1),
      });
    }

    const payload = {
      reward,
      selections,
      quantity: totalUnitsToApply,
      totalPoints:
        toNumber(reward?.points_required) * Math.max(rewardRedeemQuantity, 1),
    };

    try {
      setSaving(true);
      await onConfirm?.(payload);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !reward) return null;

  return (
    <div
      className={styles.overlay}
      onClick={saving || appModal.isOpen ? undefined : onClose}
    >
      <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
        <div className={styles.header}>
          <div>
            <h2>Aplicar descuento</h2>
            <p>Selecciona los productos a los que se les aplicará la recompensa.</p>
          </div>

          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            disabled={saving || appModal.isOpen}
          >
            ×
          </button>
        </div>

        <div className={styles.body}>
          <section className={styles.rewardBox}>
            <div>
              <span>Recompensa seleccionada</span>
              <strong>{reward.name || "RECOMPENSA"}</strong>
              <p>
                {getRewardDiscountLabel(reward)} en {totalUnitsToApply} producto
                {totalUnitsToApply !== 1 ? "s" : ""}. Seleccionados:{" "}
                {selectedProductsCount} de {totalUnitsToApply}.
              </p>
            </div>

            <div className={styles.pointsBox}>
              <strong>
                {toNumber(reward.points_required) * rewardRedeemQuantity}
              </strong>
              <span>PTS</span>
            </div>
          </section>

          <section className={styles.searchBox}>
            <label>Buscar producto</label>

            <div className={styles.searchRow}>
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setError("");
                }}
                disabled={saving || appModal.isOpen}
                placeholder="Buscar por nombre, código o precio..."
              />

              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    setError("");
                    searchInputRef.current?.focus();
                  }}
                  disabled={saving || appModal.isOpen}
                >
                  Limpiar
                </button>
              )}
            </div>

            <p>
              Escribe mínimo {MIN_SEARCH_LENGTH} caracteres para buscar productos
              disponibles en la sucursal.
            </p>
          </section>

          {error && <div className={styles.errorMessage}>{error}</div>}

          {loadingProducts ? (
            <div className={styles.emptyMessage}>Cargando productos...</div>
          ) : searchTerm.trim().length > 0 &&
            searchTerm.trim().length < MIN_SEARCH_LENGTH ? (
            <div className={styles.emptyMessage}>
              Escribe al menos {MIN_SEARCH_LENGTH} caracteres para buscar.
            </div>
          ) : searchTerm.trim().length >= MIN_SEARCH_LENGTH &&
            filteredProducts.length === 0 ? (
            <div className={styles.emptyMessage}>
              No hay productos disponibles con esa búsqueda.
            </div>
          ) : (
            filteredProducts.length > 0 && (
              <div className={styles.productList}>
                {filteredProducts.map((product) => {
                  const status = getInventoryStatus(product);
                  const discount = calculateRewardDiscount(
                    product,
                    reward,
                    inventoryByProduct
                  );
                  const selectedQty = toNumber(selectedProductsById[product.id]);
                  const isSelected = selectedQty > 0;
                  const rewardIsComplete = selectedProductsCount >= totalUnitsToApply;
                  const stockLimitReached =
                    status.stock !== null && selectedQty >= status.stock;
                  const canAdd =
                    status.available &&
                    !saving &&
                    !rewardIsComplete &&
                    !stockLimitReached;

                  return (
                    <div
                      key={product.id}
                      className={`${styles.productOption} ${
                        isSelected ? styles.productOptionSelected : ""
                      }`}
                      onClick={() => {
                        if (canAdd) {
                          handleAddProduct(product);
                        }
                      }}
                    >
                      <div className={styles.productInfo}>
                        <strong>{product.name || "SIN NOMBRE"}</strong>
                        <span>{product.barcode || "SIN CÓDIGO"}</span>
                        <small>{status.label}</small>
                      </div>

                      <div className={styles.productAmounts}>
                        <div>
                          <span>Precio</span>
                          <strong>{formatCurrency(discount.price)}</strong>
                        </div>

                        <div className={styles.discountAmount}>
                          <span>Desc.</span>
                          <strong>
                            -{formatCurrency(discount.discountAmount)}
                          </strong>
                        </div>

                        <div className={styles.finalAmount}>
                          <span>Final</span>
                          <strong>{formatCurrency(discount.finalPrice)}</strong>
                        </div>

                        <div className={styles.quantityControls}>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleSubtractProduct(product);
                            }}
                            disabled={!isSelected || saving || appModal.isOpen}
                          >
                            -
                          </button>

                          <strong>{selectedQty}</strong>

                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleAddProduct(product);
                            }}
                            disabled={!canAdd || appModal.isOpen}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {selectedProducts.length > 0 && (
            <section className={styles.selectedBox}>
              <div>
                <span>Productos seleccionados</span>
                <strong>
                  {selectedProductsCount} de {totalUnitsToApply}
                </strong>
              </div>

              <div className={styles.selectedTotals}>
                {selectedProducts.map(({ product, quantity, discount }) => (
                  <div key={product.id}>
                    <span>
                      {product.name || "SIN NOMBRE"} x{quantity}
                    </span>
                    <strong>
                      {formatCurrency(discount.finalPrice)}
                    </strong>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={onClose}
            disabled={saving}
          >
            Cancelar
          </button>

          <button
            type="button"
            className={styles.confirmButton}
            onClick={handleConfirm}
            disabled={!canConfirm || appModal.isOpen}
          >
            {saving ? "Aplicando..." : "Agregar descuentos"}
          </button>
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

export default ProductDiscountRewardModal;