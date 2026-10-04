import { useState, useEffect, useMemo, useCallback } from "react";
import {
  getRewardRedeemQuantity,
  getRewardProductsPerRedemption,
  getRewardQuantity,
  fetchRewardProductsAndInventory,
} from "../../services/rewardProductService";
import { useDidChange } from "../../../../hooks/useDidChange";
import { useRequestStatus } from "../../../../hooks/useRequestStatus";

export const INITIAL_VISIBLE_PRODUCTS = 3;

export const useRewardProductSelection = ({
  isOpen,
  rewards,
  branchId,
  cartProducts,
}) => {
  const [rewardProducts, setRewardProducts] = useState([]);
  const [inventoryByProduct, setInventoryByProduct] = useState({});
  const [selectedProductsByReward, setSelectedProductsByReward] = useState({});
  const [searchByReward, setSearchByReward] = useState({});
  const [expandedRewards, setExpandedRewards] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [appModal, setAppModal] = useState({
    isOpen: false,
    type: "warning",
    title: "Aviso",
    message: "",
    confirmText: "Entendido",
  });

  const closeAppModal = useCallback(
    () => setAppModal((p) => ({ ...p, isOpen: false })),
    []
  );
  const showAppDanger = useCallback(
    (msg, title = "Error") =>
      setAppModal({
        isOpen: true,
        type: "danger",
        title,
        message: String(msg),
        confirmText: "Entendido",
      }),
    []
  );

  const freeProductRewards = useMemo(
    () =>
      (Array.isArray(rewards) ? rewards : [])
        .filter(Boolean)
        .filter((r) => r.reward_type !== "product_discount"),
    [rewards]
  );

  const rewardIds = useMemo(
    () => freeProductRewards.map((r) => r.id).filter(Boolean),
    [freeProductRewards]
  );

  // La carga se deriva de la clave pedida en lugar de marcarse con un
  // setLoadingProducts(true) sincrono, que provocaba un re-render en cascada.
  // Con el modal cerrado, o sin recompensas con producto gratis, la clave es null
  // y no hay nada pendiente que mostrar.
  const rewardsIdKey = rewardIds.join(",");
  const loadKey =
    isOpen && rewardIds.length ? `${branchId}|${rewardsIdKey}` : null;
  const {
    isLoading: loadingProducts,
    isStale,
    markSettled,
  } = useRequestStatus(loadKey);

  // El error de una carga anterior no debe mostrarse mientras corre la nueva.
  const visibleError = isStale ? "" : error;

  const loadRewardProducts = useCallback(async () => {
    if (!rewardIds.length) {
      setRewardProducts([]);
      setInventoryByProduct({});
      return;
    }

    try {
      setError("");
      const { rewardProducts: rows, inventoryMap } =
        await fetchRewardProductsAndInventory(rewardIds, branchId);
      setRewardProducts(rows);
      setInventoryByProduct(inventoryMap);
    } catch (err) {
      setRewardProducts([]);
      setInventoryByProduct({});
      setError("No se pudieron cargar los productos de las recompensas.");
      showAppDanger(
        "No se pudieron cargar los productos de las recompensas.",
        "Error cargando recompensas"
      );
    } finally {
      markSettled();
    }
  }, [rewardIds, branchId, showAppDanger, markSettled]);

  // El reinicio al abrir el modal es estado derivado y se ajusta durante el
  // render. Antes lo hacia un efecto que ademas disparaba la carga, con lo que el
  // modal aparecia un turno con los datos de la apertura anterior.
  const rewardsKey = `${isOpen}|${branchId}|${rewardsIdKey}`;

  if (useDidChange(rewardsKey)) {
    if (isOpen) {
      setSelectedProductsByReward({});
      setSearchByReward({});
      setExpandedRewards({});
      setSaving(false);
      setError("");
      closeAppModal();
    }

    // Sin recompensas con producto gratis no hay nada que listar, y se vacia
    // durante el render en lugar de desde el efecto.
    if (!rewardIds.length) {
      setRewardProducts([]);
      setInventoryByProduct({});
    }
  }

  // El efecto llama directo a la funcion de servicio importada y aplica el estado
  // en la continuacion asincrona; `loadRewardProducts` queda para las recargas
  // imperativas.
  useEffect(() => {
    if (!isOpen || !rewardIds.length) {
      return undefined;
    }

    let cancelled = false;

    fetchRewardProductsAndInventory(rewardIds, branchId)
      .then(({ rewardProducts: rows, inventoryMap }) => {
        if (cancelled) return;
        setRewardProducts(rows);
        setInventoryByProduct(inventoryMap);
        setError("");
      })
      .catch((err) => {
        if (cancelled) return;
        setRewardProducts([]);
        setInventoryByProduct({});
        setError("No se pudieron cargar los productos de las recompensas.");
        showAppDanger(
          "No se pudieron cargar los productos de las recompensas.",
          "Error cargando recompensas"
        );
      })
      .finally(() => {
        if (cancelled) return;
        markSettled();
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, branchId, rewardIds, showAppDanger, markSettled]);

  const getCartQuantityForProduct = useCallback(
    (productId) => {
      if (!productId) return 0;
      return (Array.isArray(cartProducts) ? cartProducts : []).reduce(
        (sum, item) =>
          item?.id === productId ? sum + Number(item?.cantidad || 0) : sum,
        0
      );
    },
    [cartProducts]
  );

  const getInventoryStatus = useCallback(
    (product) => {
      if (!product?.id)
        return { available: false, stock: 0, label: "Producto inválido" };
      if (product.status === false)
        return { available: false, stock: 0, label: "Producto inactivo" };
      if (product.tracks_inventory === false)
        return {
          available: true,
          stock: null,
          label: "No controla inventario",
        };

      const invRow = inventoryByProduct[product.id];
      const usedInCart = getCartQuantityForProduct(product.id);

      if (!invRow)
        return {
          available: false,
          stock: 0,
          label: "Sin inventario en sucursal",
        };
      if (invRow.is_active === false)
        return { available: false, stock: 0, label: "Inactivo en sucursal" };

      const rawStock = Number(invRow.stock || 0);
      const availableStock = Math.max(rawStock - usedInCart, 0);

      if (invRow.has_been_stocked !== true && rawStock <= 0)
        return {
          available: false,
          stock: availableStock,
          label: "Sin inventario inicial",
        };
      if (rawStock <= 0)
        return {
          available: false,
          stock: availableStock,
          label: "Sin existencia",
        };
      if (availableStock <= 0)
        return {
          available: false,
          stock: availableStock,
          label: usedInCart > 0 ? "Sin disp. por carrito" : "Sin existencia",
        };

      return {
        available: true,
        stock: availableStock,
        label:
          usedInCart > 0
            ? `${availableStock} disp. (${usedInCart} en carrito)`
            : `${availableStock} disp.`,
      };
    },
    [inventoryByProduct, getCartQuantityForProduct]
  );

  const getSelectedQuantityForReward = useCallback(
    (rewardId) =>
      Object.values(selectedProductsByReward[rewardId] || {}).reduce(
        (s, q) => s + Number(q || 0),
        0
      ),
    [selectedProductsByReward]
  );
  const getSelectedQuantityForProduct = useCallback(
    (rewardId, productId) =>
      Number((selectedProductsByReward[rewardId] || {})[productId] || 0),
    [selectedProductsByReward]
  );

  const getFilteredOptionsForReward = useCallback(
    (rewardId) => {
      const opts = rewardProducts.filter((r) => r.reward_id === rewardId);
      const search = String(searchByReward[rewardId] || "")
        .trim()
        .toLowerCase();
      if (!search) return opts;
      return opts.filter((row) =>
        [row.product?.name, row.product?.barcode, row.product?.sale_price].some(
          (v) =>
            String(v || "")
              .toLowerCase()
              .includes(search)
        )
      );
    },
    [rewardProducts, searchByReward]
  );

  const handleAddProduct = (reward, product) => {
    if (!reward?.id || !product?.id || saving) return;
    const status = getInventoryStatus(product);
    if (!status.available) return;

    const requiredQty = getRewardQuantity(reward);
    if (getSelectedQuantityForReward(reward.id) >= requiredQty) return;
    if (
      status.stock !== null &&
      getSelectedQuantityForProduct(reward.id, product.id) >= status.stock
    )
      return;

    setSelectedProductsByReward((prev) => ({
      ...prev,
      [reward.id]: {
        ...(prev[reward.id] || {}),
        [product.id]: Number((prev[reward.id] || {})[product.id] || 0) + 1,
      },
    }));
  };

  const handleSubtractProduct = (reward, product) => {
    if (!reward?.id || !product?.id || saving) return;
    setSelectedProductsByReward((prev) => {
      const currMap = prev[reward.id] || {};
      if (Number(currMap[product.id] || 0) <= 0) return prev;
      const nextMap = { ...currMap, [product.id]: currMap[product.id] - 1 };
      if (nextMap[product.id] <= 0) delete nextMap[product.id];
      return { ...prev, [reward.id]: nextMap };
    });
  };

  // Empaquetamos las funciones matemáticas aquí para no romper el JSX visual
  const svc = useMemo(
    () => ({
      getRewardRedeemQuantity,
      getRewardProductsPerRedemption,
      getRewardQuantity,
    }),
    []
  );

  return {
    rewardProducts,
    selectedProductsByReward,
    searchByReward,
    setSearchByReward,
    expandedRewards,
    setExpandedRewards,
    loadingProducts,
    saving,
    setSaving,
    error: visibleError,
    appModal,
    closeAppModal,
    freeProductRewards,
    getInventoryStatus,
    getSelectedQuantityForReward,
    getSelectedQuantityForProduct,
    getFilteredOptionsForReward,
    handleAddProduct,
    handleSubtractProduct,
    svc,
  };
};
