import React, { useEffect, useMemo, useState } from "react";
import styles from "./RewardProductSelectionModal.module.css";
import { supabase } from "../../../../lib/supabaseClient";

const INITIAL_VISIBLE_PRODUCTS = 3;

const RewardProductSelectionModal = ({
  isOpen,
  onClose,
  onConfirm,
  rewards = [],
  branchId = null,
  cartProducts = [],
}) => {
  const [rewardProducts, setRewardProducts] = useState([]);
  const [inventoryByProduct, setInventoryByProduct] = useState({});
  const [selectedProductsByReward, setSelectedProductsByReward] = useState({});
  const [searchByReward, setSearchByReward] = useState({});
  const [expandedRewards, setExpandedRewards] = useState({});
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const freeProductRewards = useMemo(() => {
    return (Array.isArray(rewards) ? rewards : [])
      .filter(Boolean)
      .filter((reward) => reward.reward_type !== "product_discount");
  }, [rewards]);

  const getRewardRedeemQuantity = (reward) => {
    return Math.max(Number(reward?.redeemQuantity || 1), 1);
  };

  const getRewardProductsPerRedemption = (reward) => {
    return Math.max(Number(reward?.reward_quantity || 1), 1);
  };

  const getRewardQuantity = (reward) => {
    return (
      getRewardProductsPerRedemption(reward) * getRewardRedeemQuantity(reward)
    );
  };

  const getCartQuantityForProduct = (productId) => {
    if (!productId) return 0;

    return (Array.isArray(cartProducts) ? cartProducts : []).reduce(
      (sum, item) => {
        if (item?.id !== productId) return sum;
        return sum + Number(item?.cantidad || 0);
      },
      0
    );
  };

  const getRewardProductOptions = (rewardId) => {
    return rewardProducts.filter((row) => row.reward_id === rewardId);
  };

  const getSelectedProductsMap = (rewardId) => {
    return selectedProductsByReward[rewardId] || {};
  };

  const getSelectedQuantityForReward = (rewardId) => {
    const selectedMap = getSelectedProductsMap(rewardId);

    return Object.values(selectedMap).reduce((sum, quantity) => {
      return sum + Number(quantity || 0);
    }, 0);
  };

  const getSelectedQuantityForProduct = (rewardId, productId) => {
    const selectedMap = getSelectedProductsMap(rewardId);
    return Number(selectedMap[productId] || 0);
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

    if (product.tracks_inventory === false) {
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
        rawStock: Number(inventoryRow.stock || 0),
        usedInCart,
        label: "Inactivo en sucursal",
      };
    }

    const rawStock = Number(inventoryRow.stock || 0);
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
        label: usedInCart > 0
          ? "Sin disponible por carrito"
          : "Sin existencia",
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

  const getFilteredOptionsForReward = (rewardId) => {
    const options = getRewardProductOptions(rewardId);
    const search = String(searchByReward[rewardId] || "").trim().toLowerCase();

    if (!search) return options;

    return options.filter((row) => {
      const product = row.product || {};
      const values = [product.name, product.barcode, product.sale_price];

      return values.some((value) =>
        String(value || "").toLowerCase().includes(search)
      );
    });
  };

  const getVisibleOptionsForReward = (rewardId) => {
    const filteredOptions = getFilteredOptionsForReward(rewardId);
    const search = String(searchByReward[rewardId] || "").trim();

    if (search || expandedRewards[rewardId]) {
      return filteredOptions;
    }

    return filteredOptions.slice(0, INITIAL_VISIBLE_PRODUCTS);
  };

  const loadRewardProducts = async () => {
    const rewardIds = freeProductRewards
      .map((reward) => reward.id)
      .filter(Boolean);

    if (!rewardIds.length) {
      setRewardProducts([]);
      setInventoryByProduct({});
      return;
    }

    try {
      setLoadingProducts(true);
      setError("");

      const { data, error: rewardProductsError } = await supabase
        .from("reward_products")
        .select(`
          id,
          reward_id,
          product_id,
          products:product_id (
            id,
            barcode,
            name,
            cost_price,
            sale_price,
            is_kit,
            status,
            tracks_inventory
          )
        `)
        .in("reward_id", rewardIds);

      if (rewardProductsError) throw rewardProductsError;

      const rows = (data || [])
        .map((row) => ({
          ...row,
          product: row.products || null,
        }))
        .filter((row) => row.product?.id);

      setRewardProducts(rows);

      const productIds = [
        ...new Set(
          rows
            .filter((row) => row.product?.tracks_inventory !== false)
            .map((row) => row.product_id)
            .filter(Boolean)
        ),
      ];

      if (!branchId || productIds.length === 0) {
        setInventoryByProduct({});
        return;
      }

      const { data: inventoryRows, error: inventoryError } = await supabase
        .from("branch_inventory")
        .select(
          "product_id, stock, is_active, has_been_stocked, cost_price, sale_price"
        )
        .eq("branch_id", branchId)
        .in("product_id", productIds);

      if (inventoryError) throw inventoryError;

      const inventoryMap = {};

      for (const row of inventoryRows || []) {
        inventoryMap[row.product_id] = row;
      }

      setInventoryByProduct(inventoryMap);
    } catch (err) {
      console.error("Error cargando productos de recompensa:", err);
      setRewardProducts([]);
      setInventoryByProduct({});
      setError("No se pudieron cargar los productos de las recompensas.");
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    setSelectedProductsByReward({});
    setSearchByReward({});
    setExpandedRewards({});
    setSaving(false);
    setError("");
    loadRewardProducts();
  }, [isOpen, freeProductRewards, branchId]);

  useEffect(() => {
    if (!isOpen || loadingProducts) return;

    setSelectedProductsByReward((prev) => {
      const next = { ...prev };

      for (const reward of freeProductRewards) {
        if (next[reward.id]) continue;

        const requiredQty = getRewardQuantity(reward);
        const options = getRewardProductOptions(reward.id).filter((row) => {
          const status = getInventoryStatus(row.product);
          return (
            status.available &&
            (status.stock === null || status.stock >= requiredQty)
          );
        });

        if (options.length === 1) {
          next[reward.id] = {
            [options[0].product.id]: requiredQty,
          };
        }
      }

      return next;
    });
  }, [
    isOpen,
    loadingProducts,
    rewardProducts,
    inventoryByProduct,
    freeProductRewards,
    cartProducts,
  ]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (!saving) onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, saving, onClose]);

  const totalRequiredProducts = useMemo(() => {
    return freeProductRewards.reduce((sum, reward) => {
      return sum + getRewardQuantity(reward);
    }, 0);
  }, [freeProductRewards]);

  const completedProducts = useMemo(() => {
    return freeProductRewards.reduce((sum, reward) => {
      return sum + getSelectedQuantityForReward(reward.id);
    }, 0);
  }, [freeProductRewards, selectedProductsByReward]);

  const canConfirm =
    freeProductRewards.length > 0 &&
    totalRequiredProducts > 0 &&
    completedProducts === totalRequiredProducts &&
    !loadingProducts &&
    !saving;

  const handleSearchChange = (rewardId, value) => {
    setSearchByReward((prev) => ({
      ...prev,
      [rewardId]: value,
    }));

    setExpandedRewards((prev) => ({
      ...prev,
      [rewardId]: false,
    }));
  };

  const handleToggleExpandedReward = (rewardId) => {
    setExpandedRewards((prev) => ({
      ...prev,
      [rewardId]: !prev[rewardId],
    }));
  };

  const handleAddProduct = (reward, product) => {
    if (!reward?.id || !product?.id || saving) return;

    const status = getInventoryStatus(product);

    if (!status.available) return;

    const requiredQty = getRewardQuantity(reward);
    const selectedQtyForReward = getSelectedQuantityForReward(reward.id);
    const selectedQtyForProduct = getSelectedQuantityForProduct(
      reward.id,
      product.id
    );

    if (selectedQtyForReward >= requiredQty) return;

    if (status.stock !== null && selectedQtyForProduct >= status.stock) return;

    setSelectedProductsByReward((prev) => {
      const currentRewardMap = prev[reward.id] || {};

      return {
        ...prev,
        [reward.id]: {
          ...currentRewardMap,
          [product.id]: Number(currentRewardMap[product.id] || 0) + 1,
        },
      };
    });
  };

  const handleSubtractProduct = (reward, product) => {
    if (!reward?.id || !product?.id || saving) return;

    setSelectedProductsByReward((prev) => {
      const currentRewardMap = prev[reward.id] || {};
      const currentQty = Number(currentRewardMap[product.id] || 0);

      if (currentQty <= 0) return prev;

      const nextRewardMap = {
        ...currentRewardMap,
        [product.id]: currentQty - 1,
      };

      if (nextRewardMap[product.id] <= 0) {
        delete nextRewardMap[product.id];
      }

      return {
        ...prev,
        [reward.id]: nextRewardMap,
      };
    });
  };

  const handleConfirm = async () => {
    if (!canConfirm) return;

    const selections = [];

    for (const reward of freeProductRewards) {
      const selectedMap = getSelectedProductsMap(reward.id);
      const options = getRewardProductOptions(reward.id);

      Object.entries(selectedMap).forEach(([productId, quantity]) => {
        const cleanQuantity = Number(quantity || 0);

        if (cleanQuantity <= 0) return;

        const option = options.find((row) => row.product?.id === productId);

        if (!option?.product) return;

        selections.push({
          reward,
          product: option.product,
          quantity: cleanQuantity,
        });
      });
    }

    try {
      setSaving(true);
      await onConfirm(selections);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={saving ? undefined : onClose}>
      <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
        <div className={styles.header}>
          <div>
            <h2>Aplicar recompensas</h2>
            <p>Selecciona cómo se repartirán los productos gratis.</p>
          </div>

          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            disabled={saving}
          >
            ×
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.summaryBox}>
            <div>
              <span>Productos a entregar</span>
              <strong>{totalRequiredProducts}</strong>
            </div>

            <div>
              <span>Seleccionados</span>
              <strong>{completedProducts}</strong>
            </div>
          </div>

          {error && <div className={styles.errorMessage}>{error}</div>}

          {loadingProducts ? (
            <div className={styles.emptyMessage}>
              Cargando productos aplicables...
            </div>
          ) : freeProductRewards.length === 0 ? (
            <div className={styles.emptyMessage}>
              No hay recompensas de producto gratis para aplicar.
            </div>
          ) : (
            <div className={styles.rewardBlocks}>
              {freeProductRewards.map((reward) => {
                const options = getRewardProductOptions(reward.id);
                const filteredOptions = getFilteredOptionsForReward(reward.id);
                const visibleOptions = getVisibleOptionsForReward(reward.id);
                const searchValue = searchByReward[reward.id] || "";
                const isExpanded = Boolean(expandedRewards[reward.id]);
                const hasManyProducts = options.length > INITIAL_VISIBLE_PRODUCTS;
                const requiredQty = getRewardQuantity(reward);
                const selectedQty = getSelectedQuantityForReward(reward.id);
                const remainingQty = Math.max(requiredQty - selectedQty, 0);
                const redeemQuantity = getRewardRedeemQuantity(reward);
                const productsPerRedemption =
                  getRewardProductsPerRedemption(reward);
                const totalPoints =
                  Number(reward.points_required || 0) * redeemQuantity;

                return (
                  <section key={reward.id} className={styles.rewardBlock}>
                    <div className={styles.rewardHeader}>
                      <div>
                        <h3>{reward.name || "RECOMPENSA"}</h3>
                        <p>
                          Selecciona {requiredQty} producto
                          {requiredQty !== 1 ? "s" : ""} gratis.
                          {redeemQuantity > 1 &&
                            ` ${redeemQuantity} canjes de ${productsPerRedemption} producto${
                              productsPerRedemption !== 1 ? "s" : ""
                            }.`}
                        </p>

                        <div className={styles.rewardProgress}>
                          <span>
                            {selectedQty} de {requiredQty} seleccionados
                          </span>
                          <strong>
                            {remainingQty} pendiente
                            {remainingQty !== 1 ? "s" : ""}
                          </strong>
                        </div>
                      </div>

                      <span>{totalPoints} pts</span>
                    </div>

                    {options.length === 0 ? (
                      <div className={styles.emptyRewardProducts}>
                        Esta recompensa no tiene productos vinculados.
                      </div>
                    ) : (
                      <>
                        {hasManyProducts && (
                          <div className={styles.rewardSearchBox}>
                            <input
                              type="text"
                              value={searchValue}
                              onChange={(event) =>
                                handleSearchChange(
                                  reward.id,
                                  event.target.value
                                )
                              }
                              disabled={saving}
                              placeholder="Buscar producto dentro de esta recompensa..."
                            />

                            {searchValue.trim() && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleSearchChange(reward.id, "")
                                }
                                disabled={saving}
                              >
                                Limpiar
                              </button>
                            )}
                          </div>
                        )}

                        {filteredOptions.length === 0 ? (
                          <div className={styles.emptyRewardProducts}>
                            No hay productos con esa búsqueda.
                          </div>
                        ) : (
                          <div className={styles.productList}>
                            {visibleOptions.map((row) => {
                              const product = row.product;
                              const status = getInventoryStatus(product);
                              const selectedProductQty =
                                getSelectedQuantityForProduct(
                                  reward.id,
                                  product.id
                                );
                              const selectedQtyForReward =
                                getSelectedQuantityForReward(reward.id);
                              const rewardIsComplete =
                                selectedQtyForReward >= requiredQty;
                              const stockLimitReached =
                                status.stock !== null &&
                                selectedProductQty >= status.stock;
                              const canAdd =
                                status.available &&
                                !saving &&
                                !rewardIsComplete &&
                                !stockLimitReached;
                              const isSelected = selectedProductQty > 0;

                              return (
                                <div
                                  key={`${reward.id}-${product.id}`}
                                  className={`${styles.productOption} ${
                                    isSelected
                                      ? styles.productOptionSelected
                                      : ""
                                  } ${
                                    !status.available
                                      ? styles.productOptionDisabled
                                      : ""
                                  }`}
                                  onClick={() => {
                                    if (canAdd) {
                                      handleAddProduct(reward, product);
                                    }
                                  }}
                                >
                                  <div className={styles.productInfo}>
                                    <strong>
                                      {product.name || "SIN NOMBRE"}
                                    </strong>
                                    <span>
                                      {product.barcode || "SIN CÓDIGO"}
                                    </span>
                                    <small>{status.label}</small>
                                  </div>

                                  <div className={styles.productSide}>
                                    <div className={styles.productPrice}>
                                      <strong>
                                        $
                                        {Number(
                                          product.sale_price || 0
                                        ).toFixed(2)}
                                      </strong>

                                      {isSelected && (
                                        <span>
                                          {selectedProductQty} seleccionado
                                          {selectedProductQty !== 1 ? "s" : ""}
                                        </span>
                                      )}

                                      {!status.available && (
                                        <span>No disponible</span>
                                      )}

                                      {stockLimitReached &&
                                        status.available && (
                                          <span>Máximo stock</span>
                                        )}
                                    </div>

                                    <div className={styles.quantityControls}>
                                      <button
                                        type="button"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          handleSubtractProduct(
                                            reward,
                                            product
                                          );
                                        }}
                                        disabled={!isSelected || saving}
                                      >
                                        -
                                      </button>

                                      <strong>{selectedProductQty}</strong>

                                      <button
                                        type="button"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          handleAddProduct(reward, product);
                                        }}
                                        disabled={!canAdd}
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {hasManyProducts && !searchValue.trim() && (
                          <button
                            type="button"
                            className={styles.showMoreButton}
                            onClick={() =>
                              handleToggleExpandedReward(reward.id)
                            }
                            disabled={saving}
                          >
                            {isExpanded
                              ? "Ver menos productos"
                              : `Ver ${options.length - INITIAL_VISIBLE_PRODUCTS} producto${
                                  options.length - INITIAL_VISIBLE_PRODUCTS !== 1
                                    ? "s"
                                    : ""
                                } más`}
                          </button>
                        )}
                      </>
                    )}
                  </section>
                );
              })}
            </div>
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
            disabled={!canConfirm}
          >
            {saving ? "Aplicando..." : "Aplicar recompensas"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RewardProductSelectionModal;