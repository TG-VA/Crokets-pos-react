  import React, { useState, useRef, useCallback, useEffect } from "react";
  import styles from "../../pages/Sales/Sales.module.css";
  import { supabase } from "../../lib/supabaseClient";
  import { useAuth } from "../../contexts/AuthContext";
  import { useBranch } from "../../contexts/BranchContext";
  import { v4 as uuidv4 } from "uuid";
  import { buildTicketText } from "../../utils/ticketBuilder";
  import { printTicket } from "../../utils/ticketPrinter";
  import { checkUserIsAdmin } from "../../lib/permissionsService";

  // Importar iconos
  import searchIcon from "../../assets/icons/searchIcon.svg";
  import entryIcon from "../../assets/icons/entryIcon.svg";
  import exitIcon from "../../assets/icons/exitIcon.svg";
  import deleteIcon from "../../assets/icons/deleteIcon.svg";
  import verifyIcon from "../../assets/icons/verifyIcon.svg";
  import changeIcon from "../../assets/icons/changeIcon.svg";
  import assignClientIcon from "../../assets/icons/assignClientIcon.svg";
  import payIcon from "../../assets/icons/payIcon.svg";
  import DiscountIcon from "../../assets/icons/percent-solid-full.svg";
  import SalesHistoryIcon from "../../assets/icons/table-list-solid-full.svg";

  // Importar componentes de modales
  import ExitModal from "../../components/SalesComponents/Modals/ExitModal/ExitModal";
  import EntryModal from "../../components/SalesComponents/Modals/EntryModal/EntryModal";
  import PaymentModal from "../../components/SalesComponents/Modals/PaymentModal/PaymentModal";
  import ClientModal from "../../components/SalesComponents/Modals/ClientModal/ClientModal";
  import VerifierModal from "../../components/SalesComponents/Modals/VerifierModal/VerifierModal";
  import SearchModal from "../../components/SalesComponents/Modals/SearchModal/SearchModal";
  import DiscountModal from "../../components/SalesComponents/Modals/DiscountModal/DiscountModal";
  import PendingTicketModal from "../../components/SalesComponents/Modals/PendingTicketModal/PendingTicketModal";
  import ChangeTicketModal from "../../components/SalesComponents/Modals/ChangeTicketModal/ChangeTicketModal";
  import DeleteTicketModal from "../../components/SalesComponents/Modals/DeleteTicketModal/DeleteTicketModal";
  import DeleteItemModal from "../../components/SalesComponents/Modals/DeleteItemModal/DeleteItemModal";
  import SalesHistoryModal from "../../components/SalesComponents/Modals/SalesHistoryModal/SalesHistoryModal";
  import SaleSuccessModal from "../../components/SalesComponents/Modals/SaleSuccessModal/SaleSuccessModal";
  import RewardProductSelectionModal from "../../components/SalesComponents/Modals/RewardProductSelectionModal/RewardProductSelectionModal";
  import ProductDiscountRewardModal from "../../components/SalesComponents/Modals/ProductDiscountRewardModal/ProductDiscountRewardModal";
  import AdminAuthorizationModal from "../../components/AdminAuthorizationModal/AdminAuthorizationModal";
  import AppModal from "../../components/AppModal/AppModal";

  const POINTS_AMOUNT_SETTING_KEY = "customer_points_amount_per_point";
  const DEFAULT_POINTS_AMOUNT = 50;
  const EMPTY_REWARDS = [];
  const SALES_DRAFT_RESTORE_REQUEST_KEY = "sales_draft_restore_prompt_requested";

  const Sales = () => {
    const { user } = useAuth();
    const { branch } = useBranch();

    const [saleToken, setSaleToken] = useState(null);
    const [saleNotes, setSaleNotes] = useState("");
    const [ticketNumber, setTicketNumber] = useState(1);
    const [pendingTickets, setPendingTickets] = useState([]);
    const [barcode, setBarcode] = useState("");

    const MIN_COLUMN_WIDTH = 80;
    const [columnWidths, setColumnWidths] = useState([400, 150, 80, 150, 150]);
    const [isInitialized, setIsInitialized] = useState(false);

    const resizeRef = useRef({
      isResizing: false,
      columnIndex: -1,
      startX: 0,
      startWidth: 0,
      nextStartWidth: 0,
    });

    const tableRef = useRef(null);

    const [isExitModalOpen, setExitModalOpen] = useState(false);
    const [isExitAuthModalOpen, setExitAuthModalOpen] = useState(false);
    const [isEntryModalOpen, setEntryModalOpen] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [isClientModalOpen, setClientModalOpen] = useState(false);
    const [isVerifierModalOpen, setVerifierModalOpen] = useState(false);
    const [isSearchModalOpen, setSearchModalOpen] = useState(false);
    const [isDiscountModalOpen, setDiscountModalOpen] = useState(false);
    const [isPendingModalOpen, setPendingModalOpen] = useState(false);
    const [isChangeModalOpen, setChangeModalOpen] = useState(false);
    const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [isDeleteItemModalOpen, setDeleteItemModalOpen] = useState(false);
    const [isSalesHistoryModalOpen, setSalesHistoryModalOpen] = useState(false);
    const [saleSuccessData, setSaleSuccessData] = useState(null);
    const [isRewardProductModalOpen, setRewardProductModalOpen] = useState(false);
    const [pendingFreeProductRewards, setPendingFreeProductRewards] = useState(
      [],
    );
    const [isProductDiscountRewardModalOpen, setProductDiscountRewardModalOpen] =
      useState(false);
    const [pendingProductDiscountRewards, setPendingProductDiscountRewards] =
      useState([]);
    const [activeProductDiscountReward, setActiveProductDiscountReward] =
      useState(null);

    const [cashMovements, setCashMovements] = useState([]);
    const [currentSaleClient, setCurrentSaleClient] = useState(null);
    const [currentSaleReward, setCurrentSaleReward] = useState(null);
    const [processingSale, setProcessingSale] = useState(false);
    const [shiftAlreadyCut, setShiftAlreadyCut] = useState(false);

    const [appModal, setAppModal] = useState({
      isOpen: false,
      type: "warning",
      title: "",
      message: "",
      confirmText: "Entendido",
      cancelText: "Cancelar",
      showCancel: false,
      onConfirm: null,
      onCancel: null,
    });

    const closeAppModal = () => {
      setAppModal((prev) => ({
        ...prev,
        isOpen: false,
        showCancel: false,
        onConfirm: null,
        onCancel: null,
      }));
    };

    const showAppModal = ({
      type = "warning",
      title = "Aviso",
      message = "",
      confirmText = "Entendido",
      cancelText = "Cancelar",
      showCancel = false,
      onConfirm = null,
      onCancel = null,
    }) => {
      setAppModal({
        isOpen: true,
        type,
        title,
        message: String(message || ""),
        confirmText,
        cancelText,
        showCancel,
        onConfirm,
        onCancel,
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

    const showAppSuccess = (message, title = "Operación realizada") => {
      showAppModal({
        type: "success",
        title,
        message,
        confirmText: "Entendido",
      });
    };


    const [productos, setProductos] = useState([]);
    const [stockWarningMsg, setStockWarningMsg] = useState("");
    const [draftReady, setDraftReady] = useState(false);
    const [recoveredDraft, setRecoveredDraft] = useState(false);
    const [recoveredDraftSavedAt, setRecoveredDraftSavedAt] = useState(null);

    const draftKeyRef = useRef(null);
    const realtimeTimerRef = useRef(null);
    const productosRef = useRef([]);

    const salesDraftKey =
      branch?.id && user?.id ? `sales_draft_${branch.id}_${user.id}` : null;

    const salesDraftSessionKey = salesDraftKey
      ? `${salesDraftKey}_session_ack`
      : null;

    const salesDraftSessionAliveKey = salesDraftKey
      ? `${salesDraftKey}_session_alive`
      : null;

    const subtotal = productos.reduce(
      (sum, producto) =>
        sum +
        Number(producto.precioOriginal ?? producto.precio ?? 0) *
          Number(producto.cantidad || 0),
      0,
    );

    const discountTotal = productos.reduce(
      (sum, producto) => sum + Number(producto.descuentoMonto || 0),
      0,
    );

    const total = subtotal - discountTotal;

    useEffect(() => {
      if (!salesDraftKey) {
        setDraftReady(false);
        setRecoveredDraft(false);
        setRecoveredDraftSavedAt(null);
        return;
      }

      if (draftKeyRef.current === salesDraftKey) return;

      draftKeyRef.current = salesDraftKey;
      setDraftReady(false);
      setRecoveredDraft(false);
      setRecoveredDraftSavedAt(null);

      try {
        const rawDraft = localStorage.getItem(salesDraftKey);

        if (!rawDraft) {
          if (salesDraftSessionAliveKey) {
            sessionStorage.setItem(salesDraftSessionAliveKey, "true");
          }

          setDraftReady(true);
          return;
        }

        const draft = JSON.parse(rawDraft);

        if (!draft || draft.version !== 1) {
          if (salesDraftSessionAliveKey) {
            sessionStorage.setItem(salesDraftSessionAliveKey, "true");
          }

          setDraftReady(true);
          return;
        }

        const restoredProducts = Array.isArray(draft.productos)
          ? draft.productos
          : [];

        setProductos(restoredProducts);
        setSelectedProduct(null);
        setCurrentSaleClient(draft.currentSaleClient || null);
        setCurrentSaleReward(draft.currentSaleReward || null);
        setTicketNumber(Number(draft.ticketNumber || 1));
        setSaleToken(draft.saleToken || null);
        setSaleNotes(draft.saleNotes || "");
        setBarcode(draft.barcode || "");
        setPendingTickets(
          Array.isArray(draft.pendingTickets) ? draft.pendingTickets : [],
        );

        const hasRecoverableSale =
          restoredProducts.length > 0 ||
          !!draft.currentSaleClient ||
          !!draft.currentSaleReward ||
          !!draft.saleToken ||
          String(draft.saleNotes || "").trim().length > 0 ||
          String(draft.barcode || "").trim().length > 0;

        const restorePromptRequested =
          sessionStorage.getItem(SALES_DRAFT_RESTORE_REQUEST_KEY) === "true";

        const salesSessionAlreadyAlive =
          salesDraftSessionAliveKey &&
          sessionStorage.getItem(salesDraftSessionAliveKey) === "true";

        const alreadyAcknowledgedThisSession =
          salesDraftSessionKey &&
          sessionStorage.getItem(salesDraftSessionKey) === "true";

        const shouldShowRecoveryModal =
          hasRecoverableSale &&
          (restorePromptRequested ||
            (!salesSessionAlreadyAlive && !alreadyAcknowledgedThisSession));

        if (salesDraftSessionAliveKey) {
          sessionStorage.setItem(salesDraftSessionAliveKey, "true");
        }

        if (shouldShowRecoveryModal) {
          setRecoveredDraft(true);
          setRecoveredDraftSavedAt(draft.savedAt || null);

          setAppModal({
            isOpen: true,
            type: "warning",
            title: "Venta pendiente encontrada",
            message: draft.savedAt
              ? `Hay una venta pendiente guardada automáticamente el ${new Date(
                  draft.savedAt,
                )
                  .toLocaleString("es-MX")
                  .replace(/:\d{2}(?=\s*[ap]\.?\s*m\.?)|(?<=\s[ap])\./gi, "")
                  .replace(/\s+/g, " ")}

¿Quieres recuperarla o descartarla?`
              : "Hay una venta pendiente guardada automáticamente.\n\n¿Quieres recuperarla o descartarla?",
            confirmText: "Recuperar venta",
            cancelText: "Descartar",
            showCancel: true,
            onConfirm: () => {
              closeAppModal();
              dismissRecoveredDraft();
            },
            onCancel: () => {
              closeAppModal();
              discardRecoveredDraft();
            },
          });
        } else {
          setRecoveredDraft(false);
          setRecoveredDraftSavedAt(null);
        }

        setDraftReady(true);
      } catch (error) {
        console.error("Error restaurando venta en curso:", error);
        localStorage.removeItem(salesDraftKey);

        if (salesDraftSessionAliveKey) {
          sessionStorage.setItem(salesDraftSessionAliveKey, "true");
        }

        setRecoveredDraft(false);
        setRecoveredDraftSavedAt(null);
        setDraftReady(true);
      }
    }, [salesDraftKey, salesDraftSessionKey, salesDraftSessionAliveKey]);

    useEffect(() => {
      if (!draftReady || !salesDraftKey || draftKeyRef.current !== salesDraftKey)
        return;

      const hasDraftData =
        productos.length > 0 ||
        pendingTickets.length > 0 ||
        !!currentSaleClient ||
        !!currentSaleReward ||
        !!saleToken ||
        saleNotes.trim().length > 0 ||
        barcode.trim().length > 0;

      if (!hasDraftData) {
        localStorage.removeItem(salesDraftKey);
        return;
      }

      const draft = {
        version: 1,
        savedAt: new Date().toISOString(),
        branchId: branch?.id || null,
        userId: user?.id || null,
        productos,
        currentSaleClient,
        currentSaleReward,
        ticketNumber,
        saleToken,
        saleNotes,
        barcode,
        pendingTickets,
        subtotal,
        discountTotal,
        total,
      };

      try {
        localStorage.setItem(salesDraftKey, JSON.stringify(draft));
      } catch (error) {
        console.error("Error guardando venta en curso:", error);
      }
    }, [
      draftReady,
      salesDraftKey,
      productos,
      pendingTickets,
      currentSaleClient,
      currentSaleReward,
      saleToken,
      saleNotes,
      barcode,
      ticketNumber,
      subtotal,
      discountTotal,
      total,
      branch?.id,
      user?.id,
    ]);

    useEffect(() => {
      productosRef.current = productos;

      if (productos.length === 0) {
        setStockWarningMsg("");
      }
    }, [productos]);

    const clearSalesDraft = () => {
      if (salesDraftKey) {
        localStorage.removeItem(salesDraftKey);
      }

      if (salesDraftSessionKey) {
        sessionStorage.removeItem(salesDraftSessionKey);
      }

      if (salesDraftSessionAliveKey) {
        sessionStorage.removeItem(salesDraftSessionAliveKey);
      }

      sessionStorage.removeItem(SALES_DRAFT_RESTORE_REQUEST_KEY);
    };

    const dismissRecoveredDraft = () => {
      if (salesDraftSessionKey) {
        sessionStorage.setItem(salesDraftSessionKey, "true");
      }

      if (salesDraftSessionAliveKey) {
        sessionStorage.setItem(salesDraftSessionAliveKey, "true");
      }

      sessionStorage.removeItem(SALES_DRAFT_RESTORE_REQUEST_KEY);

      setRecoveredDraft(false);
    };

    const discardRecoveredDraft = () => {
      clearSalesDraft();
      setProductos([]);
      setSelectedProduct(null);
      setCurrentSaleClient(null);
      setCurrentSaleReward(null);
      setPendingFreeProductRewards([]);
      setRewardProductModalOpen(false);
      setPendingProductDiscountRewards([]);
      setActiveProductDiscountReward(null);
      setProductDiscountRewardModalOpen(false);
      setBarcode("");
      setSaleToken(null);
      setSaleNotes("");
      setStockWarningMsg("");
      setRecoveredDraft(false);
      setRecoveredDraftSavedAt(null);
    };

    const resetCurrentSale = () => {
      setProductos([]);
      setSelectedProduct(null);
      setCurrentSaleClient(null);
      setCurrentSaleReward(null);
      setPendingFreeProductRewards([]);
      setRewardProductModalOpen(false);
      setPendingProductDiscountRewards([]);
      setActiveProductDiscountReward(null);
      setProductDiscountRewardModalOpen(false);
      setTicketNumber((prev) => prev + 1);
      setBarcode("");
      setSaleToken(null);
      setSaleNotes("");
      setStockWarningMsg("");
      setRecoveredDraft(false);
      setRecoveredDraftSavedAt(null);
    };

    const isValidUuid = (value) => {
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        String(value || ""),
      );
    };

    const getCartItemKey = (item) => {
      return item?.cartLineId || item?.id || "";
    };

    const isSameCartItem = (firstItem, secondItem) => {
      return getCartItemKey(firstItem) === getCartItemKey(secondItem);
    };

    const isRewardCartItem = (item) => {
      return Boolean(item?.is_reward_item || item?.is_reward_discount_item);
    };

    const getSyncedRewardsFromCart = (cartItems = [], rewardsSource = currentSaleReward) => {
      const rewardsMap = new Map();

      normalizeRewardsArray(rewardsSource).forEach((reward) => {
        if (reward?.id) {
          rewardsMap.set(reward.id, reward);
        }
      });

      const rewardSummaryById = new Map();

      (Array.isArray(cartItems) ? cartItems : [])
        .filter(isRewardCartItem)
        .forEach((item) => {
          const rewardId = item?.reward_id;
          if (!rewardId) return;

          const previous = rewardSummaryById.get(rewardId) || {
            rewardId,
            redeemQuantity: 0,
            appliedProductQuantity: 0,
            appliedDiscountAmount: 0,
            hasProductDiscount: false,
            productNames: [],
          };

          const lineRedeemQuantity = Math.max(
            Number(item.reward_redeem_quantity || 0),
            0,
          );
          const fallbackRedeemQuantity = Math.max(Number(item.cantidad || 1), 1);
          const redeemQuantity = lineRedeemQuantity > 0
            ? lineRedeemQuantity
            : fallbackRedeemQuantity;

          const productName = item.nombre || item.codigo || "PRODUCTO";

          rewardSummaryById.set(rewardId, {
            ...previous,
            redeemQuantity: previous.redeemQuantity + redeemQuantity,
            appliedProductQuantity:
              previous.appliedProductQuantity + Math.max(Number(item.cantidad || 0), 0),
            appliedDiscountAmount:
              previous.appliedDiscountAmount +
              Math.max(Number(item.reward_discount_amount ?? item.descuentoMonto ?? 0), 0),
            hasProductDiscount:
              previous.hasProductDiscount || Boolean(item.is_reward_discount_item),
            productNames: previous.productNames.includes(productName)
              ? previous.productNames
              : [...previous.productNames, productName],
          });
        });

      return Array.from(rewardSummaryById.values()).map((summary) => {
        const baseReward = rewardsMap.get(summary.rewardId) || {};

        return {
          ...baseReward,
          id: summary.rewardId,
          name: baseReward.name || "RECOMPENSA",
          redeemQuantity: Math.max(Number(summary.redeemQuantity || 1), 1),
          appliedProductQuantity: Math.max(
            Number(summary.appliedProductQuantity || 1),
            1,
          ),
          appliedProductName: summary.productNames.join(", "),
          appliedDiscountAmount: Number(summary.appliedDiscountAmount || 0),
          reward_application_status: summary.hasProductDiscount
            ? "applied_product_discount"
            : baseReward.reward_application_status,
        };
      });
    };

    const syncCurrentSaleRewardsWithCart = (cartItems) => {
      setCurrentSaleReward((prev) => getSyncedRewardsFromCart(cartItems, prev));
    };

    const removeRewardItemsFromCart = () => {
      const currentProducts = productosRef.current || [];
      const removedRewardProducts = currentProducts.filter((product) =>
        isRewardCartItem(product),
      );

      if (removedRewardProducts.length === 0) {
        return;
      }

      const affectedProductIds = [
        ...new Set(
          removedRewardProducts
            .map((product) => product?.id)
            .filter(Boolean),
        ),
      ];

      let updatedProducts = currentProducts.filter(
        (product) => !isRewardCartItem(product),
      );

      affectedProductIds.forEach((productId) => {
        const stockSource = currentProducts.find(
          (product) =>
            product?.id === productId &&
            product?.tracks_inventory &&
            product?.stockReal !== null &&
            product?.stockReal !== undefined,
        );

        if (stockSource) {
          updatedProducts = updateProductExistenceInCart(
            updatedProducts,
            productId,
            Number(stockSource.stockReal || 0),
          );
        }
      });

      setProductos(updatedProducts);
      productosRef.current = updatedProducts;

      setSelectedProduct((prev) => {
        if (!prev) return null;

        if (isRewardCartItem(prev)) {
          return null;
        }

        const stillExists = updatedProducts.find((product) =>
          isSameCartItem(product, prev),
        );

        return stillExists || null;
      });
    };

    const normalizeRewardsArray = (value) => {
      if (!value) return [];

      const normalizeRewardItem = (item) => {
        if (!item) return null;

        if (item.reward?.id) {
          return {
            ...item.reward,
            redeemQuantity: Math.max(Number(item.redeemQuantity || 1), 1),
          };
        }

        if (item.id) {
          return {
            ...item,
            redeemQuantity: Math.max(Number(item.redeemQuantity || 1), 1),
          };
        }

        return null;
      };

      if (Array.isArray(value)) {
        return value.map(normalizeRewardItem).filter(Boolean);
      }

      const normalized = normalizeRewardItem(value);
      return normalized ? [normalized] : [];
    };

    const getRewardRedeemQuantity = (reward) => {
      return Math.max(Number(reward?.redeemQuantity || 1), 1);
    };

    const getRewardTotalPoints = (reward) => {
      return (
        Number(reward?.points_required || 0) * getRewardRedeemQuantity(reward)
      );
    };

    const getRewardType = (reward) => {
      if (reward?.reward_type === "product_discount") return "product_discount";
      return "free_product";
    };


    const isPendingProductDiscountReward = (reward) => {
      return (
        getRewardType(reward) === "product_discount" &&
        reward?.reward_application_status !== "applied_product_discount"
      );
    };

    const isAppliedProductDiscountReward = (reward) => {
      return (
        getRewardType(reward) === "product_discount" &&
        reward?.reward_application_status === "applied_product_discount"
      );
    };

    const getPendingProductDiscountRewards = (rewardsValue = currentSaleReward) => {
      return normalizeRewardsArray(rewardsValue).filter(isPendingProductDiscountReward);
    };

    const getRewardDiscountUnitAmount = (reward, basePrice) => {
      const price = Number(basePrice || 0);
      const discountType = reward?.discount_type;
      const discountValue = Number(reward?.discount_value || 0);

      if (price <= 0 || discountValue <= 0) return 0;

      if (discountType === "percent") {
        return Math.min(Math.floor(price * (discountValue / 100)), price);
      }

      if (discountType === "fixed") {
        return Math.min(Math.floor(discountValue), price);
      }

      return 0;
    };

    const getRewardDiscountLabel = (reward) => {
      const discountType = reward?.discount_type;
      const discountValue = Number(reward?.discount_value || 0);
      const quantity = Math.max(Number(reward?.reward_quantity || 1), 1);

      if (discountType === "percent") {
        return `${discountValue}% en ${quantity} unidad${quantity !== 1 ? "es" : ""}`;
      }

      if (discountType === "fixed") {
        return `$${discountValue.toFixed(2)} en ${quantity} unidad${quantity !== 1 ? "es" : ""}`;
      }

      return `Descuento en ${quantity} unidad${quantity !== 1 ? "es" : ""}`;
    };

    const getCartQuantityForProduct = (productId, cartItems = productosRef.current) => {
      if (!productId) return 0;

      return (cartItems || []).reduce((sum, item) => {
        if (item?.id !== productId) return sum;
        return sum + Number(item?.cantidad || 0);
      }, 0);
    };

    const updateProductExistenceInCart = (cartItems, productId, stock) => {
      if (!productId || stock === null || stock === undefined) return cartItems;

      const totalInCart = getCartQuantityForProduct(productId, cartItems);
      const nextExistence = Math.max(Number(stock || 0) - totalInCart, 0);

      return cartItems.map((item) => {
        if (item?.id !== productId || item?.tracks_inventory === false) return item;

        return {
          ...item,
          stockReal: Number(stock || 0),
          existencia: nextExistence,
        };
      });
    };

    const getBranchInventoryRow = async (productId) => {
      if (!branch?.id) {
        throw new Error("No se detectó la sucursal.");
      }

      const { data, error } = await supabase
        .from("branch_inventory")
        .select("stock, is_active, has_been_stocked, cost_price, sale_price")
        .eq("branch_id", branch.id)
        .eq("product_id", productId)
        .maybeSingle();

      if (error) throw error;

      return data;
    };

    const getProductWithDiscount = async (product) => {
      if (!product?.id) return product;

      const { data: discountRow, error: discountError } = await supabase
        .from("product_discounts")
        .select("enabled, discount_percent, discount_concept")
        .eq("product_id", product.id)
        .maybeSingle();

      if (discountError) throw discountError;

      const hasDiscount =
        !!discountRow?.enabled && Number(discountRow?.discount_percent || 0) > 0;

      return {
        ...product,
        discount_enabled: hasDiscount,
        discount_percent: hasDiscount
          ? Number(discountRow.discount_percent || 0)
          : 0,
        discount_concept: hasDiscount ? discountRow?.discount_concept || "" : "",
      };
    };

    const getKitAvailableStock = async (kitProductId) => {
      if (!kitProductId || !branch?.id) {
        return {
          availableStock: 0,
          isValid: false,
          message: "No se detectó la sucursal para validar el kit.",
        };
      }

      const { data: kitRow, error: kitError } = await supabase
        .from("product_kits")
        .select("id, is_active")
        .eq("kit_product_id", kitProductId)
        .maybeSingle();

      if (kitError) throw kitError;

      if (!kitRow?.id) {
        return {
          availableStock: 0,
          isValid: false,
          message: "Este kit no tiene configuración registrada.",
        };
      }

      if (kitRow.is_active === false) {
        return {
          availableStock: 0,
          isValid: false,
          message: "Este kit está inactivo.",
        };
      }

      const { data: kitItems, error: itemsError } = await supabase
        .from("product_kit_items")
        .select(
          `
          id,
          component_product_id,
          quantity,
          products:component_product_id (
            id,
            name,
            barcode,
            tracks_inventory
          )
        `,
        )
        .eq("kit_id", kitRow.id);

      if (itemsError) throw itemsError;

      if (!kitItems || kitItems.length === 0) {
        return {
          availableStock: 0,
          isValid: false,
          message: "Este kit no tiene productos agregados.",
        };
      }

      const inventoryComponentIds = kitItems
        .filter((item) => item.products?.tracks_inventory !== false)
        .map((item) => item.component_product_id)
        .filter(Boolean);

      let inventoryRows = [];

      if (inventoryComponentIds.length > 0) {
        const { data, error: inventoryError } = await supabase
          .from("branch_inventory")
          .select("product_id, stock, is_active, has_been_stocked")
          .eq("branch_id", branch.id)
          .in("product_id", inventoryComponentIds);

        if (inventoryError) throw inventoryError;
        inventoryRows = data || [];
      }

      const inventoryMap = {};
      for (const row of inventoryRows) {
        inventoryMap[row.product_id] = row;
      }

      let availableStock = Infinity;
      let invalidMessage = "";

      for (const item of kitItems) {
        const requiredQty = Number(item.quantity || 0);
        const tracksInventory = item.products?.tracks_inventory !== false;

        if (!tracksInventory) continue;

        if (requiredQty <= 0) {
          invalidMessage = `El componente "${item.products?.name || "Producto"}" tiene cantidad inválida.`;
          availableStock = 0;
          break;
        }

        const inventory = inventoryMap[item.component_product_id];

        if (!inventory) {
          invalidMessage = `El componente "${item.products?.name || "Producto"}" no tiene inventario en esta sucursal.`;
          availableStock = 0;
          break;
        }

        if (inventory.is_active === false) {
          invalidMessage = `El componente "${item.products?.name || "Producto"}" está inactivo en esta sucursal.`;
          availableStock = 0;
          break;
        }

        if (inventory.has_been_stocked !== true) {
          invalidMessage = `El componente "${item.products?.name || "Producto"}" aún no tiene inventario inicial.`;
          availableStock = 0;
          break;
        }

        const componentStock = Number(inventory.stock || 0);
        const possibleKits = Math.floor(componentStock / requiredQty);
        availableStock = Math.min(availableStock, possibleKits);
      }

      if (availableStock === Infinity) {
        availableStock = 0;
      }

      return {
        availableStock: Math.max(Number(availableStock || 0), 0),
        isValid: !invalidMessage && Number(availableStock || 0) > 0,
        message: invalidMessage,
      };
    };

    const getOpenCashSession = async () => {
      if (!branch?.id || !user?.id) {
        throw new Error("No se detectó la sucursal o el usuario.");
      }

      const { data, error } = await supabase
        .from("cash_register_sessions")
        .select("id, branch_id, user_id, status, opened_at, opening_amount")
        .eq("branch_id", branch.id)
        .eq("user_id", user.id)
        .eq("status", "open")
        .order("opened_at", { ascending: false })
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        throw new Error("No hay una sesión de caja abierta para este usuario.");
      }

      return data;
    };

    const validateShiftNotCut = async () => {
      try {
        const session = await getOpenCashSession();

        const { data, error } = await supabase
          .from("cash_cuts")
          .select("id")
          .eq("cash_register_session_id", session.id)
          .eq("cut_type", "shift")
          .limit(1);

        if (error) throw error;

        const alreadyCut = (data || []).length > 0;

        setShiftAlreadyCut(alreadyCut);

        if (alreadyCut) {
          localStorage.setItem("shift_cut_done", "true");
        } else {
          localStorage.removeItem("shift_cut_done");
        }

        return !alreadyCut;
      } catch (error) {
        console.error("Error validando corte:", error);
        return false;
      }
    };

    const syncShiftCutStatus = useCallback(async () => {
      const localFlag = localStorage.getItem("shift_cut_done");

      if (localFlag === "true") {
        setShiftAlreadyCut(true);
      }

      if (branch?.id && user?.id) {
        await validateShiftNotCut();
      }
    }, [branch?.id, user?.id]);

    const refreshCartInventoryFromRealtime = useCallback(async () => {
      if (!branch?.id) return;

      const currentProducts = productosRef.current || [];
      const trackedProducts = currentProducts.filter(
        (product) => product?.tracks_inventory,
      );

      if (trackedProducts.length === 0) {
        setStockWarningMsg("");
        return;
      }

      const kitProducts = trackedProducts.filter((product) => product?.is_kit);
      const normalTrackedProducts = trackedProducts.filter(
        (product) => !product?.is_kit,
      );

      const productIds = [
        ...new Set(
          normalTrackedProducts.map((product) => product.id).filter(Boolean),
        ),
      ];

      try {
        let inventoryRows = [];

        if (productIds.length > 0) {
          const { data, error } = await supabase
            .from("branch_inventory")
            .select(
              "product_id, stock, is_active, has_been_stocked, cost_price, sale_price",
            )
            .eq("branch_id", branch.id)
            .in("product_id", productIds);

          if (error) throw error;
          inventoryRows = data || [];
        }

        const inventoryByProduct = {};

        inventoryRows.forEach((row) => {
          inventoryByProduct[row.product_id] = row;
        });

        const kitAvailabilityByProduct = {};

        for (const kitProduct of kitProducts) {
          kitAvailabilityByProduct[kitProduct.id] = await getKitAvailableStock(
            kitProduct.id,
          );
        }

        let warning = "";

        const updateProductInventory = (product) => {
          if (!product?.tracks_inventory) return product;

          if (product.is_kit) {
            const kitAvailability = kitAvailabilityByProduct[product.id];
            const stock = Number(kitAvailability?.availableStock || 0);
            const quantity = Number(product.cantidad || 0);
            const availableAfterCart = Math.max(stock - quantity, 0);

            if (quantity > stock && !warning) {
              warning = `Stock actualizado: el kit "${
                product.nombre || product.codigo
              }" ahora permite vender ${stock} kit(s) y tienes ${quantity} en venta.`;
            } else if (kitAvailability?.message && !warning) {
              warning = kitAvailability.message;
            }

            return {
              ...product,
              stockReal: stock,
              existencia: availableAfterCart,
            };
          }

          const inventoryRow = inventoryByProduct[product.id];

          if (!inventoryRow || inventoryRow.is_active === false) {
            if (!warning) {
              warning = `El producto "${
                product.nombre || product.codigo
              }" ya no está activo en esta sucursal.`;
            }

            return {
              ...product,
              stockReal: 0,
              existencia: 0,
            };
          }

          const stock = Number(inventoryRow.stock || 0);
          const quantity = Number(product.cantidad || 0);
          const availableAfterCart = Math.max(stock - quantity, 0);

          if (quantity > stock && !warning) {
            warning = `Stock actualizado: "${
              product.nombre || product.codigo
            }" ahora tiene ${stock} disponible y tienes ${quantity} en venta.`;
          }

          return {
            ...product,
            stockReal: stock,
            existencia: availableAfterCart,
            costo: Number(inventoryRow.cost_price ?? product.costo ?? 0),
          };
        };

        setProductos((prev) => {
          const updated = prev.map(updateProductInventory);
          productosRef.current = updated;
          return updated;
        });

        setSelectedProduct((prev) =>
          prev ? updateProductInventory(prev) : prev,
        );

        setStockWarningMsg(warning);
      } catch (error) {
        console.error("Error actualizando inventario del carrito:", error);
      }
    }, [branch?.id]);

    useEffect(() => {
      syncShiftCutStatus();

      const handleFocus = () => {
        syncShiftCutStatus();
        refreshCartInventoryFromRealtime();
      };

      const handleStorage = (event) => {
        if (event.key === "shift_cut_done") {
          syncShiftCutStatus();
        }
      };

      const handleCutStatusChanged = () => {
        syncShiftCutStatus();
      };

      window.addEventListener("focus", handleFocus);
      window.addEventListener("storage", handleStorage);
      window.addEventListener("shift-cut-status-changed", handleCutStatusChanged);

      return () => {
        window.removeEventListener("focus", handleFocus);
        window.removeEventListener("storage", handleStorage);
        window.removeEventListener(
          "shift-cut-status-changed",
          handleCutStatusChanged,
        );
      };
    }, [syncShiftCutStatus, refreshCartInventoryFromRealtime]);

    useEffect(() => {
      if (!draftReady || !branch?.id || !user?.id) return;

      const refreshSafely = async () => {
        try {
          await syncShiftCutStatus();
          await refreshCartInventoryFromRealtime();
        } catch (error) {
          console.error("Error actualizando ventas en tiempo real:", error);
        }
      };

      const scheduleRealtimeRefresh = () => {
        if (realtimeTimerRef.current) {
          clearTimeout(realtimeTimerRef.current);
        }

        realtimeTimerRef.current = setTimeout(refreshSafely, 500);
      };

      refreshSafely();

      const intervalId = setInterval(() => {
        const hasTrackedProducts = (productosRef.current || []).some(
          (product) => product?.tracks_inventory,
        );

        if (hasTrackedProducts) {
          refreshCartInventoryFromRealtime();
        }
      }, 2500);

      const channel = supabase
        .channel(`sales-realtime-${branch.id}-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "branch_inventory",
            filter: `branch_id=eq.${branch.id}`,
          },
          scheduleRealtimeRefresh,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "cash_cuts",
            filter: `branch_id=eq.${branch.id}`,
          },
          scheduleRealtimeRefresh,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "cash_register_sessions",
            filter: `branch_id=eq.${branch.id}`,
          },
          scheduleRealtimeRefresh,
        )
        .subscribe();

      return () => {
        clearInterval(intervalId);

        if (realtimeTimerRef.current) {
          clearTimeout(realtimeTimerRef.current);
        }

        supabase.removeChannel(channel);
      };
    }, [
      branch?.id,
      user?.id,
      draftReady,
      refreshCartInventoryFromRealtime,
      syncShiftCutStatus,
    ]);

    const openPaymentFlow = async () => {
      if (productos.length === 0) {
        showAppWarning("No hay productos en la venta.");
        return;
      }

      if (processingSale) return;

      const canSell = await validateShiftNotCut();

      if (!canSell) {
        showAppWarning(
          "Ya realizaste el corte de cajero.\nDebes cerrar turno antes de seguir vendiendo.",
        );
        return;
      }

      if (pendingProductDiscountRewards.length > 0 || activeProductDiscountReward) {
        showAppWarning("Termina de aplicar la recompensa de descuento antes de cobrar.");
        return;
      }

      setSaleToken((prev) => prev || uuidv4());
      setShowPaymentModal(true);
    };

    const getAvailableCash = async (sessionId) => {
      try {
        const { data: session, error: sessionError } = await supabase
          .from("cash_register_sessions")
          .select("id, branch_id, opening_amount, opened_at")
          .eq("id", sessionId)
          .single();

        if (sessionError) throw sessionError;

        const openingAmount = Number(session?.opening_amount || 0);
        const openedAt = session?.opened_at;
        const branchId = session?.branch_id;

        const { data: movements, error: movementsError } = await supabase
          .from("cash_movements")
          .select("movement_type, amount")
          .eq("session_id", sessionId);

        if (movementsError) throw movementsError;

        let entradas = 0;
        let salidas = 0;

        for (const movement of movements || []) {
          if (movement.movement_type === "entrada") {
            entradas += Number(movement.amount || 0);
          } else if (movement.movement_type === "salida") {
            salidas += Number(movement.amount || 0);
          }
        }

        const { data: cashMethods, error: cashMethodsError } = await supabase
          .from("payment_methods")
          .select("id, name")
          .eq("name", "Efectivo");

        if (cashMethodsError) throw cashMethodsError;

        const cashMethodIds = (cashMethods || []).map((pm) => pm.id);

        let ventasEfectivo = 0;

        if (cashMethodIds.length > 0 && openedAt && branchId) {
          const { data: cashPayments, error: cashPaymentsError } = await supabase
            .from("sale_payments")
            .select(
              "amount, currency, exchange_rate, payment_method_id, created_at, branch_id",
            )
            .eq("branch_id", branchId)
            .gte("created_at", openedAt)
            .in("payment_method_id", cashMethodIds);

          if (cashPaymentsError) throw cashPaymentsError;

          ventasEfectivo = (cashPayments || []).reduce((sum, payment) => {
            const amount = Number(payment.amount || 0);
            const currency = String(payment.currency || "MXN").toUpperCase();
            const exchangeRate = Number(payment.exchange_rate || 0);

            if (currency === "MXN") {
              return sum + amount;
            }

            if (currency === "USD" && exchangeRate > 0) {
              return sum + amount * exchangeRate;
            }

            return sum;
          }, 0);
        }

        return openingAmount + entradas + ventasEfectivo - salidas;
      } catch (error) {
        console.error("Error calculando efectivo disponible:", error);
        return 0;
      }
    };

    const buildPaymentsPayload = (paymentData) => {
      if (!paymentData?.method) {
        throw new Error("No se detectó el método de pago.");
      }

      if (paymentData.method === "Mixto") {
        const rows = [
          {
            payment_method_name: "Efectivo",
            amount: Number(paymentData?.details?.efectivo || 0),
            currency: "MXN",
            exchange_rate: null,
          },
          {
            payment_method_name: "Terminal",
            amount: Number(paymentData?.details?.tarjeta || 0),
            currency: "MXN",
            exchange_rate: null,
          },
          {
            payment_method_name: "Dólares",
            amount: Number(paymentData?.details?.dolares || 0),
            currency: "USD",
            exchange_rate:
              Number(paymentData?.details?.exchangeRate || 0) || null,
          },
        ].filter((row) => row.amount > 0);

        if (rows.length === 0) {
          throw new Error("El pago mixto no contiene montos válidos.");
        }

        return rows;
      }

      const paymentMethodNameMap = {
        Efectivo: "Efectivo",
        Dolares: "Dólares",
        Terminal: "Terminal",
        Transferencia: "Transferencia",
      };

      const paymentMethodName = paymentMethodNameMap[paymentData.method];

      if (!paymentMethodName) {
        throw new Error("Método de pago no válido.");
      }

      return [
        {
          payment_method_name: paymentMethodName,
          amount:
            paymentData.method === "Dolares"
              ? Number(paymentData?.details?.dollarAmount || 0)
              : Number(paymentData.total || 0),
          currency: paymentData.method === "Dolares" ? "USD" : "MXN",
          exchange_rate:
            paymentData.method === "Dolares"
              ? Number(paymentData?.details?.exchangeRate || 0) || null
              : null,
          reference:
            paymentData.method === "Transferencia"
              ? paymentData?.details?.trackingCode?.trim() || null
              : null,
        },
      ];
    };

    const buildProductsPayload = () => {
      return productos.map((p) => {
        const hasDiscount = Number(p.descuentoMonto || 0) > 0;
        const cleanDiscountType =
          p.descuentoTipo === "percent" ? "percent" : hasDiscount ? "amount" : null;

        return {
          product_id: p.id,
          quantity: Number(p.cantidad),
          unit_price: Number(p.precio),
          total_price: Number(p.importe),
          original_unit_price: Number(p.precioOriginal ?? p.precio),
          final_unit_price: Number(p.precio),
          discount_type: cleanDiscountType,
          discount_value: Number(p.descuentoValor || 0),
          discount_amount: Number(p.descuentoMonto || 0),
        };
      });
    };

    const buildRewardRowsFromCartItems = (rewardItems = []) => {
      return (rewardItems || [])
        .filter((item) => {
          return (
            (item?.is_reward_item || item?.is_reward_discount_item) &&
            item?.reward_id &&
            Number(item?.cantidad || 0) > 0
          );
        })
        .map((item) => {
          const quantity = Number(item.cantidad || 0);
          const totalPoints = getRewardItemTotalPoints(item);
          const pointsPerUnit = getRewardItemPointsPerUnit(item);
          const unitPrice = Number(item.precioOriginal ?? item.precio ?? 0);
          const discountAmount = Number(
            item.reward_discount_amount ?? item.descuentoMonto ?? unitPrice * quantity ?? 0,
          );

          return {
            id: item.sale_reward_redemption_id || `local_${item.reward_id}_${item.id}`,
            sale_id: null,
            sale_detail_id: item.sale_detail_id || null,
            customer_id: currentSaleClient?.id || null,
            reward_id: item.reward_id,
            product_id: item.id,
            quantity,
            points_per_unit: pointsPerUnit,
            total_points: Math.max(totalPoints, pointsPerUnit),
            unit_price: unitPrice,
            discount_amount: discountAmount,
            reward_name: item.reward_name || item.discountConcept || "RECOMPENSA",
            product_name: item.nombre || item.codigo || "PRODUCTO",
            reward_type: item.is_reward_discount_item ? "product_discount" : "free_product",
            created_at: new Date().toISOString(),
          };
        });
    };

    const loadRewardRedemptionsForPrintedSale = async (saleId, fallbackRewardItems = []) => {
      const fallbackRows = buildRewardRowsFromCartItems(fallbackRewardItems);

      if (!saleId) return fallbackRows;

      try {
        const { data, error } = await supabase
          .from("sale_reward_redemptions")
          .select(
            `
            id,
            sale_id,
            sale_detail_id,
            customer_id,
            reward_id,
            product_id,
            quantity,
            points_per_unit,
            total_points,
            unit_price,
            discount_amount,
            reward_name,
            product_name,
            created_at
          `,
          )
          .eq("sale_id", saleId)
          .order("created_at", { ascending: true });

        if (error) throw error;

        if ((data || []).length > 0) {
          return data || [];
        }

        return fallbackRows;
      } catch (error) {
        console.error("Error cargando canjes para ticket:", error);
        return fallbackRows;
      }
    };

    const printSaleTicket = async ({
      saleId,
      paymentData,
      paymentPayload,
      notes,
      saleDate,
      saleClient = null,
      pointsResult = null,
    }) => {
      try {
        const rewardItemsForPrint = getRewardCartItems();
        const rewardRedemptions = await loadRewardRedemptionsForPrintedSale(
          saleId,
          pointsResult?.rewardRedemptions?.length
            ? []
            : rewardItemsForPrint,
        );

        const rewardRowsForPrint =
          pointsResult?.rewardRedemptions?.length > 0
            ? pointsResult.rewardRedemptions
            : rewardRedemptions;

        const rewardBySaleDetailId = {};
        const rewardByProductId = {};

        for (const reward of rewardRowsForPrint || []) {
          if (reward?.sale_detail_id) {
            rewardBySaleDetailId[reward.sale_detail_id] = reward;
          }

          if (reward?.product_id && !rewardByProductId[reward.product_id]) {
            rewardByProductId[reward.product_id] = reward;
          }
        }

        const [detailsRes, kitItemsRes] = await Promise.all([
          supabase
            .from("sale_details")
            .select(
              `
              id,
              quantity,
              unit_price,
              total_price,
              product_id,
              original_unit_price,
              final_unit_price,
              discount_type,
              discount_value,
              discount_amount
            `,
            )
            .eq("sale_id", saleId),

          supabase
            .from("sale_kit_items")
            .select(
              `
              id,
              sale_id,
              sale_detail_id,
              kit_product_id,
              component_product_id,
              quantity
            `,
            )
            .eq("sale_id", saleId),
        ]);

        if (detailsRes.error) throw detailsRes.error;
        if (kitItemsRes.error) throw kitItemsRes.error;

        const detailsRows = detailsRes.data || [];
        const kitItemRows = kitItemsRes.data || [];

        const productIds = [
          ...new Set(
            [
              ...detailsRows.map((d) => d.product_id),
              ...kitItemRows.map((k) => k.component_product_id),
              ...(rewardRowsForPrint || []).map((reward) => reward.product_id),
            ].filter(Boolean),
          ),
        ];

        const { data: productsRows, error: productsError } = productIds.length
          ? await supabase
              .from("products")
              .select("id, name, barcode, is_kit")
              .in("id", productIds)
          : { data: [], error: null };

        if (productsError) throw productsError;

        const productMap = {};
        const productIsKitMap = {};

        for (const product of productsRows || []) {
          productMap[product.id] = product.name || product.barcode || "PRODUCTO";
          productIsKitMap[product.id] = !!product.is_kit;
        }

        const kitItemsByDetail = {};

        for (const row of kitItemRows) {
          if (!kitItemsByDetail[row.sale_detail_id]) {
            kitItemsByDetail[row.sale_detail_id] = [];
          }

          kitItemsByDetail[row.sale_detail_id].push({
            id: row.id,
            productId: row.component_product_id,
            quantity: Number(row.quantity || 0),
            description: productMap[row.component_product_id] || "PRODUCTO",
          });
        }

        let itemsForPrint = detailsRows.map((item) => {
          const components = kitItemsByDetail[item.id] || [];
          const rewardInfo =
            rewardBySaleDetailId[item.id] ||
            (Number(item.total_price || 0) === 0
              ? rewardByProductId[item.product_id]
              : null);

          const isRewardLine = Boolean(rewardInfo) && Number(item.total_price || 0) === 0;
          const originalUnitPrice = Number(
            item.original_unit_price ||
              rewardInfo?.unit_price ||
              item.unit_price ||
              0,
          );

          return {
            quantity: Number(item.quantity || 0),
            description: productMap[item.product_id] || rewardInfo?.product_name || "PRODUCTO",
            unit_price: isRewardLine
              ? 0
              : Number(item.final_unit_price || item.unit_price || 0),
            original_unit_price: originalUnitPrice,
            discount_amount: isRewardLine ? 0 : Number(item.discount_amount || 0),
            line_total: Number(item.total_price || 0),
            is_kit: productIsKitMap[item.product_id] || components.length > 0,
            components: components.map((component) => ({
              quantity: component.quantity,
              description: component.description,
            })),
            is_reward_item: isRewardLine,
            isRewardItem: isRewardLine,
            reward_id: rewardInfo?.reward_id || null,
            rewardId: rewardInfo?.reward_id || null,
            reward_name: rewardInfo?.reward_name || "",
            rewardName: rewardInfo?.reward_name || "",
            reward_points: Number(rewardInfo?.points_per_unit || 0),
            rewardPoints: Number(rewardInfo?.points_per_unit || 0),
            total_points: Number(rewardInfo?.total_points || 0),
            totalPoints: Number(rewardInfo?.total_points || 0),
            sale_reward_redemption_id: rewardInfo?.id || null,
            saleRewardRedemptionId: rewardInfo?.id || null,
          };
        });

        if (itemsForPrint.length === 0 && (rewardRowsForPrint || []).length > 0) {
          itemsForPrint = (rewardRowsForPrint || []).map((reward) => ({
            quantity: Number(reward.quantity || 0),
            description:
              productMap[reward.product_id] ||
              reward.product_name ||
              "PRODUCTO",
            unit_price: 0,
            original_unit_price: Number(reward.unit_price || 0),
            discount_amount: 0,
            line_total: 0,
            is_kit: false,
            components: [],
            is_reward_item: true,
            isRewardItem: true,
            reward_id: reward.reward_id || null,
            rewardId: reward.reward_id || null,
            reward_name: reward.reward_name || "RECOMPENSA",
            rewardName: reward.reward_name || "RECOMPENSA",
            reward_points: Number(reward.points_per_unit || 0),
            rewardPoints: Number(reward.points_per_unit || 0),
            total_points: Number(reward.total_points || 0),
            totalPoints: Number(reward.total_points || 0),
            sale_reward_redemption_id: reward.id || null,
            saleRewardRedemptionId: reward.id || null,
          }));
        }

        const rewardPointsUsed =
          Number(pointsResult?.pointsUsed || 0) ||
          (rewardRowsForPrint || []).reduce((acc, reward) => {
            return acc + Number(reward.total_points || 0);
          }, 0);

        const rewardsCount = (rewardRowsForPrint || []).reduce((acc, reward) => {
          return acc + Number(reward.quantity || 0);
        }, 0);

        const hasRewardRedemptions =
          rewardRowsForPrint.length > 0 || rewardPointsUsed > 0 || rewardsCount > 0;

        const isRewardOnlySale = hasRewardRedemptions && Number(total || 0) <= 0;

        const paymentsForTicket = isRewardOnlySale
          ? []
          : (paymentPayload || []).filter((payment) => {
              return Number(payment.amount || 0) > 0;
            });

        const totalPaid = paymentsForTicket.reduce((acc, payment) => {
          const amount = Number(payment.amount || 0);
          const currency = String(payment.currency || "MXN").toUpperCase();
          const exchangeRate = Number(payment.exchange_rate || 0);

          if (currency === "USD") {
            return acc + (exchangeRate > 0 ? amount * exchangeRate : 0);
          }

          return acc + amount;
        }, 0);

        const ticketText = buildTicketText({
          branch: {
            name: branch?.name || "SUCURSAL",
            phone: branch?.phone || "",
            address: branch?.address || "",
            city: branch?.city || "",
            state: branch?.state || "",
            postal_code: branch?.postal_code || branch?.zip_code || "",
          },
          sale: {
            folio: String(saleId).slice(0, 8).toUpperCase(),
            created_at: saleDate,
            subtotal: Number(subtotal),
            tax: 0,
            discount_total: Number(discountTotal || 0),
            total: Number(total),
            amount_received: isRewardOnlySale ? 0 : totalPaid || Number(total),
            change_amount: isRewardOnlySale
              ? 0
              : Math.max(Number(paymentData?.change || 0), 0),
            payment_method: isRewardOnlySale ? "SIN PAGO" : paymentData?.method || "",
            payments: paymentsForTicket,
            status: "completed",
            notes: notes || paymentData?.notes || "",
            cashier_name: (
              user?.username ||
              user?.email ||
              "CAJERO"
            ).toUpperCase(),
            customer_name: saleClient?.name || "",
            customer_phone: saleClient?.phone || saleClient?.id || "",
            customer_email: saleClient?.email || "",
            points_earned: Number(pointsResult?.points || 0),
            reward_points_used: rewardPointsUsed,
            rewards_count: rewardsCount,
            has_reward_redemptions: hasRewardRedemptions,
            reward_redemptions: rewardRowsForPrint,
            customer_points_balance:
              pointsResult?.newBalance !== undefined &&
              pointsResult?.newBalance !== null
                ? Number(pointsResult.newBalance)
                : null,
          },
          items: itemsForPrint,
          cashierName: (user?.username || user?.email || "CAJERO").toUpperCase(),
          footer: {
            line1: "Gracias por su compra",
            line2: "Agenda tu cita de baño",
            phone: "998 117 5387",
            returnPolicy:
              "Para cambios o devoluciones presentar ticket de compra",
          },
          isReprint: false,
        });

        const printResult = await printTicket(ticketText);

        if (!printResult?.success) {
          console.error("No se pudo imprimir el ticket automáticamente.");
        }
      } catch (error) {
        console.error("Error al generar/imprimir ticket automático:", error);
      }
    };

    const increaseSelectedProductQuantity = () => {
      if (!selectedProduct) return;

      if (isRewardCartItem(selectedProduct)) {
        showAppWarning(
          "No puedes modificar la cantidad de un producto aplicado como recompensa.",
        );
        return;
      }

      let inventoryExceeded = false;

      setProductos((prev) =>
        prev.map((p) => {
          if (!isSameCartItem(p, selectedProduct)) return p;

          if (p.tracks_inventory && p.cantidad >= p.stockReal) {
            inventoryExceeded = true;
            return p;
          }

          const nuevaCantidad = p.cantidad + 1;
          const precioOriginal = Number(p.precioOriginal ?? p.precio ?? 0);
          const precioFinal = Number(p.precio ?? 0);
          const descuentoUnitario = Math.max(precioOriginal - precioFinal, 0);

          return {
            ...p,
            cantidad: nuevaCantidad,
            importe: nuevaCantidad * precioFinal,
            descuentoMonto: descuentoUnitario * nuevaCantidad,
            existencia: p.tracks_inventory ? p.stockReal - nuevaCantidad : "∞",
          };
        }),
      );

      if (inventoryExceeded) {
        showAppWarning("No hay suficiente inventario.");
        return;
      }

      setSelectedProduct((prev) => {
        if (!prev) return prev;
        if (prev.tracks_inventory && prev.cantidad >= prev.stockReal) return prev;

        const nuevaCantidad = prev.cantidad + 1;
        const precioOriginal = Number(prev.precioOriginal ?? prev.precio ?? 0);
        const precioFinal = Number(prev.precio ?? 0);
        const descuentoUnitario = Math.max(precioOriginal - precioFinal, 0);

        return {
          ...prev,
          cantidad: nuevaCantidad,
          importe: nuevaCantidad * precioFinal,
          descuentoMonto: descuentoUnitario * nuevaCantidad,
          existencia: prev.tracks_inventory
            ? prev.stockReal - nuevaCantidad
            : "∞",
        };
      });
    };

    const decreaseSelectedProductQuantity = () => {
      if (!selectedProduct) return;

      if (isRewardCartItem(selectedProduct)) {
        showAppWarning(
          "No puedes modificar la cantidad de un producto aplicado como recompensa.",
        );
        return;
      }

      const productoActual = productos.find((p) =>
        isSameCartItem(p, selectedProduct),
      );
      if (!productoActual) return;

      if (productoActual.cantidad === 1) {
        const updatedProductos = productos.filter(
          (p) => !isSameCartItem(p, selectedProduct),
        );

        setProductos(updatedProductos);
        productosRef.current = updatedProductos;
        syncCurrentSaleRewardsWithCart(updatedProductos);
        setSelectedProduct(null);
        return;
      }

      setProductos((prev) =>
        prev.map((p) => {
          if (!isSameCartItem(p, selectedProduct)) return p;

          const nuevaCantidad = p.cantidad - 1;
          const precioOriginal = Number(p.precioOriginal ?? p.precio ?? 0);
          const precioFinal = Number(p.precio ?? 0);
          const descuentoUnitario = Math.max(precioOriginal - precioFinal, 0);

          return {
            ...p,
            cantidad: nuevaCantidad,
            importe: nuevaCantidad * precioFinal,
            descuentoMonto: descuentoUnitario * nuevaCantidad,
            existencia: p.tracks_inventory ? p.stockReal - nuevaCantidad : "∞",
          };
        }),
      );

      setSelectedProduct((prev) => {
        if (!prev) return prev;

        const nuevaCantidad = prev.cantidad - 1;
        const precioOriginal = Number(prev.precioOriginal ?? prev.precio ?? 0);
        const precioFinal = Number(prev.precio ?? 0);
        const descuentoUnitario = Math.max(precioOriginal - precioFinal, 0);

        return {
          ...prev,
          cantidad: nuevaCantidad,
          importe: nuevaCantidad * precioFinal,
          descuentoMonto: descuentoUnitario * nuevaCantidad,
          existencia: prev.tracks_inventory
            ? prev.stockReal - nuevaCantidad
            : "∞",
        };
      });
    };

    const calculateDiscountedProduct = (basePrice, product) => {
      const originalPrice = Number(basePrice || 0);
      const discountEnabled =
        !!product.discount_enabled && Number(product.discount_percent || 0) > 0;

      if (!discountEnabled) {
        return {
          precioOriginal: originalPrice,
          precioFinal: originalPrice,
          descuentoTipo: null,
          descuentoValor: 0,
          descuentoMontoUnitario: 0,
          discountPercent: 0,
          discountConcept: "",
        };
      }

      const discountPercent = Number(product.discount_percent || 0);
      const descuentoMontoUnitario = originalPrice * (discountPercent / 100);
      const precioFinal = Math.max(originalPrice - descuentoMontoUnitario, 0);

      return {
        precioOriginal: originalPrice,
        precioFinal,
        descuentoTipo: "percent",
        descuentoValor: discountPercent,
        descuentoMontoUnitario,
        discountPercent,
        discountConcept: product.discount_concept || "",
      };
    };

    const addProductToCart = async (product) => {
      if (!product?.id) return;

      const currentCartProducts = productosRef.current || [];

      if (product.is_kit) {
        const kitAvailability = await getKitAvailableStock(product.id);
        const stock = Number(kitAvailability.availableStock || 0);

        if (!kitAvailability.isValid || stock <= 0) {
          showAppWarning(
            kitAvailability.message ||
              "Este kit no tiene inventario suficiente en sus componentes.",
          );
          return;
        }

        const existingProduct = currentCartProducts.find(
          (p) => p.id === product.id && !isRewardCartItem(p),
        );

        if (existingProduct) {
          if (existingProduct.cantidad + 1 > stock) {
            showAppWarning("No hay suficiente inventario para vender otro kit.");
            return;
          }

          const updatedProducts = currentCartProducts.map((p) => {
            if (p.id !== product.id) return p;

            const nuevaCantidad = p.cantidad + 1;
            const precioOriginal = Number(p.precioOriginal ?? p.precio ?? 0);
            const precioFinal = Number(p.precio ?? 0);
            const descuentoUnitario = Math.max(precioOriginal - precioFinal, 0);

            return {
              ...p,
              cantidad: nuevaCantidad,
              importe: nuevaCantidad * precioFinal,
              descuentoMonto: descuentoUnitario * nuevaCantidad,
              stockReal: stock,
              existencia: Math.max(stock - nuevaCantidad, 0),
            };
          });

          setProductos(updatedProducts);
          productosRef.current = updatedProducts;

          if (selectedProduct?.id === product.id) {
            const updatedSelected = updatedProducts.find(
              (p) => p.id === product.id,
            );
            setSelectedProduct(updatedSelected || null);
          }

          return;
        }

        const salePrice = Number(product.sale_price ?? 0);
        const costPrice = Number(product.cost_price ?? 0);
        const discountData = calculateDiscountedProduct(salePrice, product);

        const newProduct = {
          id: product.id,
          codigo: product.barcode,
          nombre: product.name,
          precioOriginal: discountData.precioOriginal,
          precio: discountData.precioFinal,
          costo: costPrice,
          cantidad: 1,
          importe: discountData.precioFinal,
          descuentoTipo: discountData.descuentoTipo,
          descuentoValor: discountData.descuentoValor,
          descuentoMonto: discountData.descuentoMontoUnitario,
          discountPercent: discountData.discountPercent,
          discountConcept: discountData.discountConcept,
          stockReal: stock,
          existencia: Math.max(stock - 1, 0),
          is_kit: true,
          tracks_inventory: true,
        };

        setProductos((prev) => {
          const currentProducts = productosRef.current || prev;
          const nextProducts = [...currentProducts, newProduct];
          productosRef.current = nextProducts;
          return nextProducts;
        });
        return;
      }

      const tracksInventory = !!product.tracks_inventory;

      if (tracksInventory) {
        const inventoryRow = await getBranchInventoryRow(product.id);

        if (!inventoryRow || inventoryRow.is_active === false) {
          showAppWarning(
            "Este producto no está activo en el inventario de esta sucursal.",
          );
          return;
        }

        const stock = Number(inventoryRow.stock || 0);
        const hasBeenStocked = !!inventoryRow.has_been_stocked;

        if (!hasBeenStocked && stock <= 0) {
          showAppWarning("Este producto aún no tiene inventario inicial registrado.");
          return;
        }

        if (stock <= 0) {
          showAppWarning("No hay existencia disponible.");
          return;
        }

        const existingProduct = currentCartProducts.find(
          (p) => p.id === product.id && !isRewardCartItem(p),
        );

        if (existingProduct) {
          if (existingProduct.cantidad + 1 > stock) {
            showAppWarning("No hay suficiente inventario.");
            return;
          }

          const updatedProducts = currentCartProducts.map((p) => {
            if (p.id !== product.id) return p;

            const nuevaCantidad = p.cantidad + 1;
            const precioOriginal = Number(p.precioOriginal ?? p.precio ?? 0);
            const precioFinal = Number(p.precio ?? 0);
            const descuentoUnitario = Math.max(precioOriginal - precioFinal, 0);

            return {
              ...p,
              cantidad: nuevaCantidad,
              importe: nuevaCantidad * precioFinal,
              descuentoMonto: descuentoUnitario * nuevaCantidad,
              stockReal: stock,
              existencia: Math.max(stock - nuevaCantidad, 0),
            };
          });

          setProductos(updatedProducts);
          productosRef.current = updatedProducts;

          if (selectedProduct?.id === product.id) {
            const updatedSelected = updatedProducts.find(
              (p) => p.id === product.id,
            );
            setSelectedProduct(updatedSelected || null);
          }

          return;
        }

        const salePrice = Number(
          inventoryRow.sale_price ?? product.sale_price ?? 0,
        );
        const costPrice = Number(
          inventoryRow.cost_price ?? product.cost_price ?? 0,
        );
        const discountData = calculateDiscountedProduct(salePrice, product);

        const newProduct = {
          id: product.id,
          codigo: product.barcode,
          nombre: product.name,
          precioOriginal: discountData.precioOriginal,
          precio: discountData.precioFinal,
          costo: costPrice,
          cantidad: 1,
          importe: discountData.precioFinal,
          descuentoTipo: discountData.descuentoTipo,
          descuentoValor: discountData.descuentoValor,
          descuentoMonto: discountData.descuentoMontoUnitario,
          discountPercent: discountData.discountPercent,
          discountConcept: discountData.discountConcept,
          stockReal: stock,
          existencia: stock - 1,
          is_kit: !!product.is_kit,
          tracks_inventory: true,
        };

        setProductos((prev) => {
          const currentProducts = productosRef.current || prev;
          const nextProducts = [...currentProducts, newProduct];
          productosRef.current = nextProducts;
          return nextProducts;
        });
        return;
      }

      const existingProduct = currentCartProducts.find(
          (p) => p.id === product.id && !isRewardCartItem(p),
        );

      if (existingProduct) {
        const updatedProducts = currentCartProducts.map((p) => {
          if (p.id !== product.id) return p;

          const nuevaCantidad = p.cantidad + 1;
          const precioOriginal = Number(p.precioOriginal ?? p.precio ?? 0);
          const precioFinal = Number(p.precio ?? 0);
          const descuentoUnitario = Math.max(precioOriginal - precioFinal, 0);

          return {
            ...p,
            cantidad: nuevaCantidad,
            importe: nuevaCantidad * precioFinal,
            descuentoMonto: descuentoUnitario * nuevaCantidad,
            existencia: "∞",
          };
        });

        setProductos(updatedProducts);

        if (selectedProduct?.id === product.id) {
          const updatedSelected = updatedProducts.find(
            (p) => p.id === product.id,
          );
          setSelectedProduct(updatedSelected || null);
        }

        return;
      }

      const salePrice = Number(product.sale_price ?? 0);
      const costPrice = Number(product.cost_price ?? 0);
      const discountData = calculateDiscountedProduct(salePrice, product);

      const newProduct = {
        id: product.id,
        codigo: product.barcode,
        nombre: product.name,
        precioOriginal: discountData.precioOriginal,
        precio: discountData.precioFinal,
        costo: costPrice,
        cantidad: 1,
        importe: discountData.precioFinal,
        descuentoTipo: discountData.descuentoTipo,
        descuentoValor: discountData.descuentoValor,
        descuentoMonto: discountData.descuentoMontoUnitario,
        discountPercent: discountData.discountPercent,
        discountConcept: discountData.discountConcept,
        stockReal: null,
        existencia: "∞",
        is_kit: !!product.is_kit,
        tracks_inventory: false,
      };

      setProductos((prev) => {
        const currentProducts = productosRef.current || prev;
        const nextProducts = [...currentProducts, newProduct];
        productosRef.current = nextProducts;
        return nextProducts;
      });
    };

    const handleBarcodeSearch = async () => {
      if (shiftAlreadyCut) {
        showAppWarning(
          "Ya realizaste el corte de cajero.\nDebes cerrar turno antes de seguir vendiendo.",
        );
        return;
      }

      if (!branch?.id) {
        showAppWarning("La sucursal aún no está cargada.");
        return;
      }

      const cleanBarcode = barcode.trim();
      if (!cleanBarcode) return;

      try {
        const { data: product, error: productError } = await supabase
          .from("products")
          .select(
            "id, barcode, name, cost_price, sale_price, is_kit, status, is_global, tracks_inventory",
          )
          .eq("barcode", cleanBarcode)
          .eq("status", true)
          .maybeSingle();

        if (productError) throw productError;

        if (!product) {
          showAppWarning("Producto no encontrado.");
          setBarcode("");
          return;
        }

        if (product.is_kit) {
          const productWithDiscount = await getProductWithDiscount(product);
          await addProductToCart(productWithDiscount);
          setBarcode("");
          return;
        }

        if (!product.tracks_inventory) {
          if (!product.is_global) {
            showAppWarning("Este producto no está disponible para esta sucursal.");
            setBarcode("");
            return;
          }

          const productWithDiscount = await getProductWithDiscount(product);
          await addProductToCart(productWithDiscount);
          setBarcode("");
          return;
        }

        const { data: inventoryRow, error: inventoryError } = await supabase
          .from("branch_inventory")
          .select("stock, is_active, has_been_stocked, cost_price, sale_price")
          .eq("branch_id", branch.id)
          .eq("product_id", product.id)
          .maybeSingle();

        if (inventoryError) throw inventoryError;

        if (!inventoryRow) {
          showAppWarning("Este producto no existe en el inventario de esta sucursal.");
          setBarcode("");
          return;
        }

        if (inventoryRow.is_active === false) {
          showAppWarning("Este producto está inactivo en esta sucursal.");
          setBarcode("");
          return;
        }

        const currentStock = Number(inventoryRow.stock || 0);
        const hasBeenStocked = !!inventoryRow.has_been_stocked;

        if (!hasBeenStocked && currentStock <= 0) {
          showAppWarning(
            "Este producto aún no tiene inventario inicial registrado en esta sucursal.",
          );
          setBarcode("");
          return;
        }

        if (currentStock <= 0) {
          showAppWarning("No hay existencia disponible en esta sucursal.");
          setBarcode("");
          return;
        }

        const productWithDiscount = await getProductWithDiscount(product);
        await addProductToCart(productWithDiscount);
        setBarcode("");
      } catch (err) {
        console.error("Error buscando producto:", err);
        showAppWarning(err.message || "Error buscando producto.");
      }
    };

    const handleAddProductFromVerifier = async (product) => {
      if (shiftAlreadyCut) {
        showAppWarning(
          "Ya realizaste el corte de cajero.\nDebes cerrar turno antes de seguir vendiendo.",
        );
        return;
      }

      if (!product) return;

      try {
        await addProductToCart(product);
        console.log("Producto agregado desde verificador:", product);
      } catch (err) {
        console.error("Error agregando producto desde verificador:", err);
        showAppWarning("No se pudo agregar el producto.");
      }
    };

    const handleProductSelect = (producto) => {
      if (selectedProduct && isSameCartItem(selectedProduct, producto)) {
        setSelectedProduct(null);
      } else {
        setSelectedProduct(producto);
      }
    };

    const handleDeleteSelectedProduct = () => {
      if (!selectedProduct) return;

      const updatedProductos = productos.filter(
        (p) => !isSameCartItem(p, selectedProduct),
      );

      setProductos(updatedProductos);
      productosRef.current = updatedProductos;
      syncCurrentSaleRewardsWithCart(updatedProductos);
      setSelectedProduct(null);
    };

    const handleApplyDiscount = (discountData) => {
      if (!selectedProduct) return;

      if (isRewardCartItem(selectedProduct)) {
        showAppWarning(
          "No puedes aplicar descuento manual a un producto aplicado como recompensa.",
        );
        return;
      }

      const newPrice = Number.parseFloat(discountData.newPrice);

      if (Number.isNaN(newPrice) || newPrice < 0) {
        showAppWarning("Precio de descuento inválido.");
        return;
      }

      const updatedProductos = productos.map((producto) => {
        if (!isSameCartItem(producto, selectedProduct)) return producto;

        const precioOriginal = Number(
          producto.precioOriginal ??
            discountData.originalPrice ??
            producto.precio ??
            0,
        );

        const cantidad = Number(producto.cantidad || 0);
        const precioFinal = newPrice;
        const descuentoUnitario = Math.max(precioOriginal - precioFinal, 0);
        const descuentoTotalProducto = descuentoUnitario * cantidad;
        const descuentoPorcentaje =
          precioOriginal > 0 ? (descuentoUnitario / precioOriginal) * 100 : 0;

        return {
          ...producto,
          precioOriginal,
          precio: precioFinal,
          importe: precioFinal * cantidad,
          descuentoTipo: descuentoTotalProducto > 0 ? "amount" : null,
          descuentoValor: descuentoUnitario,
          descuentoMonto: descuentoTotalProducto,
          discountPercent:
            descuentoTotalProducto > 0 ? Number(descuentoPorcentaje.toFixed(2)) : 0,
        };
      });

      setProductos(updatedProductos);
      productosRef.current = updatedProductos;

      const updatedSelected = updatedProductos.find((producto) =>
        isSameCartItem(producto, selectedProduct),
      );

      setSelectedProduct(updatedSelected || null);
    };

    const handleOpenDiscountModal = () => {
      if (!selectedProduct) {
        showAppWarning("Por favor, selecciona un producto primero");
        return;
      }

      if (selectedProduct.is_reward_item) {
        showAppWarning(
          "No puedes aplicar descuento manual a un producto aplicado como recompensa.",
        );
        return;
      }

      if (selectedProduct.is_reward_discount_item) {
        showAppWarning(
          "Este producto ya tiene un descuento aplicado por recompensa. No se puede aplicar otro descuento manual.",
        );
        return;
      }

      setDiscountModalOpen(true);
    };

    const validateCartStockBeforeSale = async () => {
      await refreshCartInventoryFromRealtime();

      for (const item of productosRef.current) {
        if (!item.tracks_inventory) continue;

        if (item.is_kit) {
          const kitAvailability = await getKitAvailableStock(item.id);
          const currentStock = Number(kitAvailability.availableStock || 0);

          if (!kitAvailability.isValid || currentStock <= 0) {
            showAppWarning(
              kitAvailability.message ||
                `El kit "${item.nombre || item.codigo}" ya no tiene inventario suficiente.`,
            );
            return false;
          }

          if (item.cantidad > currentStock) {
            showAppWarning(
              `La cantidad del kit "${
                item.nombre || item.codigo
              }" excede el inventario disponible. Disponible: ${currentStock}.`,
            );
            return false;
          }

          continue;
        }

        const inventoryRow = await getBranchInventoryRow(item.id);
        const currentStock = Number(inventoryRow?.stock || 0);
        const hasBeenStocked = !!inventoryRow?.has_been_stocked;

        if (!hasBeenStocked && currentStock <= 0) {
          showAppWarning(
            `El producto "${
              item.nombre || item.codigo
            }" aún no tiene inventario inicial registrado.`,
          );
          return false;
        }

        if (currentStock <= 0) {
          showAppWarning(
            `El producto "${item.nombre || item.codigo}" ya no tiene existencia.`,
          );
          return false;
        }

        if (item.cantidad > currentStock) {
          showAppWarning(
            `La cantidad de "${
              item.nombre || item.codigo
            }" excede el inventario disponible.`,
          );
          return false;
        }
      }

      return true;
    };

    const handleMouseMove = useCallback((e) => {
      const { isResizing, columnIndex, startX, startWidth, nextStartWidth } =
        resizeRef.current;

      if (!isResizing || columnIndex === -1) return;

      const deltaX = e.clientX - startX;

      let newWidth = startWidth + deltaX;
      let newNextWidth = nextStartWidth - deltaX;

      if (newWidth < MIN_COLUMN_WIDTH) {
        newWidth = MIN_COLUMN_WIDTH;
        newNextWidth = startWidth + nextStartWidth - MIN_COLUMN_WIDTH;
      }

      if (newNextWidth < MIN_COLUMN_WIDTH) {
        newNextWidth = MIN_COLUMN_WIDTH;
        newWidth = startWidth + nextStartWidth - MIN_COLUMN_WIDTH;
      }

      setColumnWidths((prev) => {
        const newWidths = [...prev];
        newWidths[columnIndex] = newWidth;
        newWidths[columnIndex + 1] = newNextWidth;
        return newWidths;
      });
    }, []);

    const handleMouseUp = useCallback(() => {
      resizeRef.current.isResizing = false;
      resizeRef.current.columnIndex = -1;

      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);

      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }, [handleMouseMove]);

    const handleMouseDown = useCallback(
      (e, index) => {
        e.preventDefault();
        e.stopPropagation();

        if (index >= columnWidths.length - 1) return;

        resizeRef.current = {
          isResizing: true,
          columnIndex: index,
          startX: e.clientX,
          startWidth: columnWidths[index],
          nextStartWidth: columnWidths[index + 1],
        };

        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);

        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
      },
      [columnWidths, handleMouseMove, handleMouseUp],
    );

    useEffect(() => {
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }, [handleMouseMove, handleMouseUp]);

    useEffect(() => {
      if (tableRef.current && !isInitialized) {
        const tableWidth = tableRef.current.offsetWidth;
        const availableWidth = tableWidth - 22;
        const proportions = [0.4, 0.15, 0.1, 0.15];

        const calculatedWidths = proportions.map((prop) =>
          Math.max(MIN_COLUMN_WIDTH, Math.floor(availableWidth * prop)),
        );

        const usedWidth = calculatedWidths.reduce((sum, width) => sum + width, 0);
        const lastColumnWidth = Math.max(
          MIN_COLUMN_WIDTH,
          availableWidth - usedWidth,
        );

        setColumnWidths([...calculatedWidths, lastColumnWidth]);
        setIsInitialized(true);
      }
    }, [isInitialized]);

    const handleSaveEntry = async (newMovement) => {
      if (shiftAlreadyCut) {
        showAppWarning(
          "El turno ya fue cortado. Debes cerrar turno antes de hacer movimientos.",
        );
        return false;
      }

      try {
        if (!user?.id) {
          showAppWarning("No se detectó el usuario.");
          return false;
        }

        if (!branch?.id) {
          showAppWarning("No se detectó la sucursal.");
          return false;
        }

        const openSession = await getOpenCashSession();

        const { data, error } = await supabase
          .from("cash_movements")
          .insert([
            {
              session_id: openSession.id,
              user_id: user.id,
              movement_type: newMovement.type,
              amount: Number(newMovement.amount),
              description: newMovement.description?.trim() || null,
              branch_id: branch.id,
            },
          ])
          .select()
          .single();

        if (error) throw error;

        setCashMovements((prev) => [...prev, data]);
        showAppSuccess("Entrada de efectivo registrada correctamente.", "Entrada registrada");
        return true;
      } catch (error) {
        console.error("Error al guardar entrada de efectivo:", error);
        showAppWarning(error.message || "No se pudo guardar la entrada de efectivo.");
        return false;
      }
    };

    const handleSaveExit = async (newMovement) => {
      if (shiftAlreadyCut) {
        showAppWarning(
          "El turno ya fue cortado. Debes cerrar turno antes de hacer movimientos.",
        );
        return false;
      }

      try {
        if (!user?.id) {
          showAppWarning("No se detectó el usuario.");
          return false;
        }

        if (!branch?.id) {
          showAppWarning("No se detectó la sucursal.");
          return false;
        }

        const openSession = await getOpenCashSession();

        if (!openSession) {
          showAppWarning("No hay sesión de caja abierta.");
          return false;
        }

        const rawAvailableCash = await getAvailableCash(openSession.id);
        const availableCash = Math.max(rawAvailableCash, 0);
        const exitAmount = Number(newMovement.amount);

        if (exitAmount > availableCash) {
          showAppWarning(
            `No puedes retirar $${exitAmount.toFixed(
              2,
            )}. Disponible en caja: $${availableCash.toFixed(2)}`,
          );
          return false;
        }

        const payload = {
          session_id: openSession.id,
          user_id: user.id,
          movement_type: newMovement.type,
          amount: exitAmount,
          description: newMovement.description?.trim() || null,
          branch_id: branch.id,
        };

        const { data, error } = await supabase
          .from("cash_movements")
          .insert([payload])
          .select()
          .single();

        if (error) throw error;

        setCashMovements((prev) => [...prev, data]);
        showAppModal({
          type: "danger",
          title: "Salida registrada",
          message: "Salida de efectivo registrada correctamente.",
          confirmText: "Entendido",
        });
        return true;
      } catch (error) {
        console.error("Error al guardar salida de efectivo:", error);
        showAppWarning(error.message || "No se pudo guardar la salida de efectivo.");
        return false;
      }
    };

    const openClientModal = () => {
      setPendingFreeProductRewards([]);
      setRewardProductModalOpen(false);
      setPendingProductDiscountRewards([]);
      setActiveProductDiscountReward(null);
      setProductDiscountRewardModalOpen(false);
      setClientModalOpen(true);
    };

    const addRewardProductToCart = async ({ reward, product, quantity }) => {
      if (!reward?.id || !product?.id) return false;

      const redeemQuantity = getRewardRedeemQuantity(reward);
      const rewardQuantity = Math.max(
        Number(quantity || Number(reward.reward_quantity || 1) * redeemQuantity),
        1,
      );
      const tracksInventory = product.tracks_inventory !== false;

      let stock = null;
      let salePrice = Number(product.sale_price || 0);
      let costPrice = Number(product.cost_price || 0);

      if (tracksInventory) {
        const inventoryRow = await getBranchInventoryRow(product.id);

        if (!inventoryRow || inventoryRow.is_active === false) {
          showAppWarning(
            `El producto "${product.name || product.barcode || "PRODUCTO"}" no está activo en esta sucursal.`,
          );
          return false;
        }

        stock = Number(inventoryRow.stock || 0);
        salePrice = Number(inventoryRow.sale_price ?? product.sale_price ?? 0);
        costPrice = Number(inventoryRow.cost_price ?? product.cost_price ?? 0);

        const currentCartQuantity = getCartQuantityForProduct(product.id);
        const availableToAdd = Math.max(stock - currentCartQuantity, 0);

        if (rewardQuantity > availableToAdd) {
          showAppWarning(
            `No hay inventario suficiente para aplicar "${
              reward.name || "RECOMPENSA"
            }". Disponible para agregar: ${availableToAdd}.`,
          );
          return false;
        }
      }

      const discountAmount = salePrice * rewardQuantity;
      const cartQuantityBeforeAdd = getCartQuantityForProduct(product.id);
      const cartQuantityAfterAdd = cartQuantityBeforeAdd + rewardQuantity;

      const rewardItem = {
        cartLineId: `reward_${reward.id}_${product.id}_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        id: product.id,
        codigo: product.barcode,
        nombre: product.name,
        precioOriginal: salePrice,
        precio: 0,
        costo: costPrice,
        cantidad: rewardQuantity,
        importe: 0,
        descuentoTipo: "reward",
        descuentoValor: salePrice,
        descuentoMonto: discountAmount,
        discountPercent: 100,
        discountConcept: reward.name || "RECOMPENSA",
        stockReal: stock,
        existencia:
          tracksInventory && stock !== null
            ? Math.max(stock - cartQuantityAfterAdd, 0)
            : "∞",
        is_kit: !!product.is_kit,
        tracks_inventory: tracksInventory,
        is_reward_item: true,
        reward_id: reward.id,
        reward_name: reward.name || "RECOMPENSA",
        reward_points_required: getRewardTotalPoints(reward),
        reward_line_points_required:
          Number(reward.points_required || 0) *
          (rewardQuantity / Math.max(Number(reward.reward_quantity || 1), 1)),
        reward_redeem_quantity: redeemQuantity,
        reward_product_quantity: rewardQuantity,
      };

      setProductos((prev) => {
        const existingIndex = prev.findIndex(
          (item) =>
            item?.is_reward_item &&
            item?.reward_id === reward.id &&
            item?.id === product.id,
        );

        let updatedProducts;

        if (existingIndex === -1) {
          updatedProducts = [...prev, rewardItem];
        } else {
          updatedProducts = prev.map((item, index) => {
            if (index !== existingIndex) return item;

            const nextQuantity = Number(item.cantidad || 0) + rewardQuantity;
            const nextDiscountAmount = salePrice * nextQuantity;

            return {
              ...item,
              cantidad: nextQuantity,
              importe: 0,
              descuentoMonto: nextDiscountAmount,
              existencia:
                tracksInventory && stock !== null
                  ? Math.max(stock - cartQuantityAfterAdd, 0)
                  : "∞",
              reward_points_required:
                Number(item.reward_points_required || 0) + getRewardTotalPoints(reward),
              reward_line_points_required:
                Number(item.reward_line_points_required || 0) +
                Number(reward.points_required || 0) *
                  (rewardQuantity / Math.max(Number(reward.reward_quantity || 1), 1)),
              reward_redeem_quantity:
                Number(item.reward_redeem_quantity || 0) + redeemQuantity,
              reward_product_quantity:
                Number(item.reward_product_quantity || 0) + rewardQuantity,
            };
          });
        }

        if (tracksInventory && stock !== null) {
          updatedProducts = updateProductExistenceInCart(
            updatedProducts,
            product.id,
            stock,
          );
        }

        productosRef.current = updatedProducts;
        return updatedProducts;
      });

      setSelectedProduct((prev) => {
        if (!prev || prev?.id !== product.id) return prev;

        const sameRewardLine =
          prev?.is_reward_item && prev?.reward_id === reward.id && prev?.id === product.id;

        if (!sameRewardLine) {
          if (tracksInventory && stock !== null) {
            return {
              ...prev,
              stockReal: stock,
              existencia: Math.max(stock - cartQuantityAfterAdd, 0),
            };
          }

          return prev;
        }

        const nextQuantity = Number(prev.cantidad || 0) + rewardQuantity;

        return {
          ...prev,
          cantidad: nextQuantity,
          importe: 0,
          descuentoMonto: salePrice * nextQuantity,
          existencia:
            tracksInventory && stock !== null
              ? Math.max(stock - cartQuantityAfterAdd, 0)
              : "∞",
          reward_points_required:
            Number(prev.reward_points_required || 0) + getRewardTotalPoints(reward),
          reward_line_points_required:
            Number(prev.reward_line_points_required || 0) +
            Number(reward.points_required || 0) *
              (rewardQuantity / Math.max(Number(reward.reward_quantity || 1), 1)),
          reward_redeem_quantity:
            Number(prev.reward_redeem_quantity || 0) + redeemQuantity,
          reward_product_quantity:
            Number(prev.reward_product_quantity || 0) + rewardQuantity,
        };
      });

      return true;
    };

    const handleCloseRewardProductModal = () => {
      setRewardProductModalOpen(false);
      setPendingFreeProductRewards([]);
    };

    const mergeAppliedRewards = (previousRewards, rewardsToAdd) => {
      const normalizedPrevious = normalizeRewardsArray(previousRewards);
      const normalizedToAdd = normalizeRewardsArray(rewardsToAdd);
      const mergedRewards = [...normalizedPrevious];

      normalizedToAdd.forEach((reward) => {
        const rewardRedeemQuantity = getRewardRedeemQuantity(reward);
        const existingIndex = mergedRewards.findIndex(
          (item) => item?.id === reward?.id,
        );

        if (existingIndex >= 0) {
          const existingReward = mergedRewards[existingIndex];

          mergedRewards[existingIndex] = {
            ...existingReward,
            redeemQuantity:
              getRewardRedeemQuantity(existingReward) + rewardRedeemQuantity,
          };

          return;
        }

        mergedRewards.push({
          ...reward,
          redeemQuantity: rewardRedeemQuantity,
        });
      });

      return mergedRewards;
    };

    const validateRewardSelectionsInventory = async (rewardSelections = []) => {
      const quantityByProduct = {};

      for (const selection of rewardSelections || []) {
        const product = selection?.product;
        const quantity = Number(selection?.quantity || 0);

        if (!product?.id || quantity <= 0 || product.tracks_inventory === false) {
          continue;
        }

        quantityByProduct[product.id] =
          Number(quantityByProduct[product.id] || 0) + quantity;
      }

      for (const [productId, quantityToAdd] of Object.entries(quantityByProduct)) {
        const inventoryRow = await getBranchInventoryRow(productId);
        const stock = Number(inventoryRow?.stock || 0);
        const currentCartQuantity = getCartQuantityForProduct(productId);
        const availableToAdd = Math.max(stock - currentCartQuantity, 0);

        if (!inventoryRow || inventoryRow.is_active === false) {
          showAppWarning("Uno de los productos de recompensa ya no está activo en esta sucursal.");
          return false;
        }

        if (inventoryRow.has_been_stocked !== true && stock <= 0) {
          showAppWarning("Uno de los productos de recompensa aún no tiene inventario inicial.");
          return false;
        }

        if (quantityToAdd > availableToAdd) {
          showAppWarning(
            `No hay inventario suficiente para aplicar las recompensas. Disponible para agregar: ${availableToAdd}.`,
          );
          return false;
        }
      }

      return true;
    };

    const handleConfirmRewardProducts = async (rewardSelections = []) => {
      try {
        const inventoryIsValid = await validateRewardSelectionsInventory(
          rewardSelections,
        );

        if (!inventoryIsValid) return;
        const appliedRewards = [];

        for (const selection of rewardSelections) {
          const wasApplied = await addRewardProductToCart(selection);

          if (wasApplied && selection?.reward?.id) {
            const rewardToApply = {
              ...selection.reward,
              redeemQuantity: getRewardRedeemQuantity(selection.reward),
              appliedProductQuantity: Math.max(
                Number(selection.quantity || 1),
                1,
              ),
            };

            const alreadyAdded = appliedRewards.some(
              (reward) => reward.id === rewardToApply.id,
            );

            if (!alreadyAdded) {
              appliedRewards.push(rewardToApply);
            }
          }
        }

        if (appliedRewards.length === 0) {
          showAppWarning(
            "No se aplicó ninguna recompensa. Revisa que el producto tenga inventario disponible.",
          );
          return;
        }

        setCurrentSaleReward((prev) => mergeAppliedRewards(prev, appliedRewards));
        setRewardProductModalOpen(false);
        setPendingFreeProductRewards([]);

        if (pendingProductDiscountRewards.length > 0) {
          openNextProductDiscountReward(pendingProductDiscountRewards);
        }
      } catch (error) {
        console.error("Error aplicando productos de recompensa:", error);
        showAppWarning(error.message || "No se pudieron aplicar las recompensas.");
      }
    };

    const openNextProductDiscountReward = (queue = pendingProductDiscountRewards) => {
      const cleanQueue = normalizeRewardsArray(queue).filter(
        (reward) => getRewardType(reward) === "product_discount",
      );

      if (cleanQueue.length === 0) {
        setPendingProductDiscountRewards([]);
        setActiveProductDiscountReward(null);
        setProductDiscountRewardModalOpen(false);
        return;
      }

      setPendingProductDiscountRewards(cleanQueue);
      setActiveProductDiscountReward(cleanQueue[0]);
      setProductDiscountRewardModalOpen(true);
    };

    const handleCloseProductDiscountRewardModal = () => {
      setProductDiscountRewardModalOpen(false);
      setActiveProductDiscountReward(null);
      setPendingProductDiscountRewards([]);
    };

    const handleAssignClient = (client, rewards = []) => {
      const normalizedRewards = normalizeRewardsArray(rewards);

      if (!client) {
        removeRewardItemsFromCart();
        setCurrentSaleClient(null);
        setCurrentSaleReward([]);
        setPendingFreeProductRewards([]);
        setRewardProductModalOpen(false);
        setPendingProductDiscountRewards([]);
        setActiveProductDiscountReward(null);
        setProductDiscountRewardModalOpen(false);
        return;
      }

      setCurrentSaleClient(client);

      if (normalizedRewards.length === 0) {
        setCurrentSaleReward([]);
        setPendingFreeProductRewards([]);
        setRewardProductModalOpen(false);
        setPendingProductDiscountRewards([]);
        setActiveProductDiscountReward(null);
        setProductDiscountRewardModalOpen(false);
        return;
      }

      const freeProductRewards = normalizedRewards.filter(
        (reward) => getRewardType(reward) === "free_product",
      );

      const productDiscountRewards = normalizedRewards
        .filter((reward) => getRewardType(reward) === "product_discount")
        .map((reward) => ({
          ...reward,
          reward_application_status: "pending_product_discount",
        }));

      setPendingProductDiscountRewards(productDiscountRewards);

      if (freeProductRewards.length > 0) {
        setPendingFreeProductRewards(freeProductRewards);
        setRewardProductModalOpen(true);
        setProductDiscountRewardModalOpen(false);
        setActiveProductDiscountReward(null);
        return;
      }

      setPendingFreeProductRewards([]);
      setRewardProductModalOpen(false);

      if (productDiscountRewards.length > 0) {
        openNextProductDiscountReward(productDiscountRewards);
        return;
      }
    };

    const addRewardDiscountProductToCart = async ({
      reward,
      product,
      quantity,
      originalUnitPrice,
      discountAmount,
      finalUnitPrice,
      discountType,
      discountValue,
      totalPoints,
    }) => {
      if (!reward?.id || !product?.id) return false;

      const cleanQuantity = Math.max(Number(quantity || 1), 1);
      const tracksInventory =
        product.tracks_inventory !== false && product.use_inventory !== false;

      let stock = null;
      let salePrice = Number(originalUnitPrice ?? product.sale_price ?? 0);
      let costPrice = Number(product.cost_price || 0);

      if (tracksInventory) {
        const inventoryRow = await getBranchInventoryRow(product.id);

        if (!inventoryRow || inventoryRow.is_active === false) {
          showAppWarning(
            `El producto "${product.name || product.barcode || "PRODUCTO"}" no está activo en esta sucursal.`,
          );
          return false;
        }

        stock = Number(inventoryRow.stock || 0);
        salePrice = Number(
          originalUnitPrice ?? inventoryRow.sale_price ?? product.sale_price ?? 0,
        );
        costPrice = Number(inventoryRow.cost_price ?? product.cost_price ?? 0);

        const currentCartQuantity = getCartQuantityForProduct(product.id);
        const availableToAdd = Math.max(stock - currentCartQuantity, 0);

        if (cleanQuantity > availableToAdd) {
          showAppWarning(
            `No hay inventario suficiente para aplicar "${
              reward.name || "RECOMPENSA"
            }". Disponible para agregar: ${availableToAdd}.`,
          );
          return false;
        }
      }

      const cleanDiscountAmount = Math.max(Math.floor(Number(discountAmount || 0)), 0);
      const cleanFinalUnitPrice = Math.max(
        Number(finalUnitPrice ?? salePrice - cleanDiscountAmount),
        0,
      );
      const discountTotal = cleanDiscountAmount * cleanQuantity;
      const cartQuantityBeforeAdd = getCartQuantityForProduct(product.id);
      const cartQuantityAfterAdd = cartQuantityBeforeAdd + cleanQuantity;

      const rewardDiscountItem = {
        cartLineId: `reward_discount_${reward.id}_${product.id}_${Date.now()}_${Math.random()
          .toString(16)
          .slice(2)}`,
        id: product.id,
        codigo: product.barcode,
        nombre: product.name,
        precioOriginal: salePrice,
        precio: cleanFinalUnitPrice,
        costo: costPrice,
        cantidad: cleanQuantity,
        importe: cleanFinalUnitPrice * cleanQuantity,
        descuentoTipo: "amount",
        descuentoValor: cleanDiscountAmount,
        descuentoMonto: discountTotal,
        discountPercent:
          discountType === "percent" ? Number(discountValue || 0) : 0,
        discountConcept: reward.name || "RECOMPENSA",
        stockReal: stock,
        existencia:
          tracksInventory && stock !== null
            ? Math.max(stock - cartQuantityAfterAdd, 0)
            : "∞",
        is_kit: !!product.is_kit,
        tracks_inventory: tracksInventory,
        is_reward_discount_item: true,
        reward_id: reward.id,
        reward_name: reward.name || "RECOMPENSA",
        reward_points_required: Number(totalPoints || getRewardTotalPoints(reward)),
        reward_line_points_required: Number(totalPoints || getRewardTotalPoints(reward)),
        reward_redeem_quantity:
          cleanQuantity / Math.max(Number(reward.reward_quantity || 1), 1),
        reward_product_quantity: cleanQuantity,
        reward_discount_type: discountType || reward.discount_type || null,
        reward_discount_value: Number(discountValue ?? reward.discount_value ?? 0),
        reward_discount_amount: discountTotal,
      };

      setProductos((prev) => {
        let updatedProducts = [...prev, rewardDiscountItem];

        if (tracksInventory && stock !== null) {
          updatedProducts = updateProductExistenceInCart(
            updatedProducts,
            product.id,
            stock,
          );
        }

        productosRef.current = updatedProducts;
        return updatedProducts;
      });

      setSelectedProduct(rewardDiscountItem);
      return true;
    };

    const handleConfirmProductDiscountReward = async (payload) => {
      if (!payload?.reward?.id) return;

      const selections = Array.isArray(payload?.selections)
        ? payload.selections
        : payload?.product?.id
          ? [payload]
          : [];

      if (selections.length === 0) return;

      try {
        const appliedSelections = [];

        for (const selection of selections) {
          const selectionPayload = {
            ...selection,
            reward: selection.reward || payload.reward,
          };

          const wasApplied = await addRewardDiscountProductToCart(selectionPayload);

          if (wasApplied) {
            appliedSelections.push(selectionPayload);
          }
        }

        if (appliedSelections.length === 0) return;

        const appliedProductQuantity = appliedSelections.reduce((sum, selection) => {
          return sum + Math.max(Number(selection.quantity || 1), 1);
        }, 0);

        const appliedDiscountAmount = appliedSelections.reduce((sum, selection) => {
          return (
            sum +
            Math.max(Math.floor(Number(selection.discountAmount || 0)), 0) *
              Math.max(Number(selection.quantity || 1), 1)
          );
        }, 0);

        const appliedProductNames = appliedSelections
          .map(
            (selection) =>
              selection.product?.name ||
              selection.product?.barcode ||
              "PRODUCTO",
          )
          .join(", ");

        const appliedReward = {
          ...payload.reward,
          redeemQuantity: getRewardRedeemQuantity(payload.reward),
          reward_application_status: "applied_product_discount",
          appliedProductId: appliedSelections[0]?.product?.id || null,
          appliedProductName: appliedProductNames,
          appliedProductQuantity,
          appliedDiscountAmount,
        };

        setCurrentSaleReward((prev) => mergeAppliedRewards(prev, [appliedReward]));

        const remainingQueue = pendingProductDiscountRewards.filter(
          (reward) => reward.id !== payload.reward.id,
        );

        if (remainingQueue.length > 0) {
          setPendingProductDiscountRewards(remainingQueue);
          setActiveProductDiscountReward(remainingQueue[0]);
          setProductDiscountRewardModalOpen(true);
          return;
        }

        setPendingProductDiscountRewards([]);
        setActiveProductDiscountReward(null);
        setProductDiscountRewardModalOpen(false);
      } catch (error) {
        console.error("Error aplicando descuento de recompensa:", error);
        showAppWarning(error.message || "No se pudo aplicar el descuento de recompensa.");
      }
    };

    const getCustomerPointsAmountPerPoint = async () => {
      try {
        const { data, error } = await supabase
          .from("system_settings")
          .select("setting_value, is_active")
          .eq("setting_key", POINTS_AMOUNT_SETTING_KEY)
          .is("branch_id", null)
          .maybeSingle();

        if (error) throw error;

        const configuredAmount = Number(data?.setting_value || 0);

        if (
          data?.is_active === false ||
          !configuredAmount ||
          configuredAmount <= 0
        ) {
          return DEFAULT_POINTS_AMOUNT;
        }

        return configuredAmount;
      } catch (error) {
        console.error("Error cargando regla de puntos:", error);
        return DEFAULT_POINTS_AMOUNT;
      }
    };

    const calculateEarnedCustomerPoints = (saleTotal, amountPerPoint) => {
      const numericTotal = Number(saleTotal || 0);
      const numericAmountPerPoint = Number(amountPerPoint || 0);

      if (!numericTotal || numericTotal <= 0) return 0;
      if (!numericAmountPerPoint || numericAmountPerPoint <= 0) return 0;

      return Math.floor(numericTotal / numericAmountPerPoint);
    };

    const getCustomerCurrentPointsBalance = async (customerId) => {
      if (!customerId) return 0;

      const { data, error } = await supabase
        .from("customer_points")
        .select("points")
        .eq("customer_id", customerId);

      if (error) throw error;

      return (data || []).reduce((sum, movement) => {
        return sum + Number(movement.points || 0);
      }, 0);
    };

    const registerCustomerPointsForSale = async ({
      saleId,
      customerId,
      saleTotal,
      saleDate,
    }) => {
      if (!saleId || !customerId) {
        return {
          points: 0,
          amountPerPoint: DEFAULT_POINTS_AMOUNT,
          registered: false,
          newBalance: null,
        };
      }

      const amountPerPoint = await getCustomerPointsAmountPerPoint();
      const earnedPoints = calculateEarnedCustomerPoints(
        saleTotal,
        amountPerPoint,
      );

      if (earnedPoints <= 0) {
        const currentBalance = await getCustomerCurrentPointsBalance(customerId);

        return {
          points: 0,
          amountPerPoint,
          registered: false,
          newBalance: currentBalance,
        };
      }

      const { data: existingMovement, error: existingError } = await supabase
        .from("customer_points")
        .select("id")
        .eq("customer_id", customerId)
        .eq("related_sale_id", saleId)
        .eq("source", "sale")
        .limit(1)
        .maybeSingle();

      if (existingError) throw existingError;

      if (existingMovement?.id) {
        const currentBalance = await getCustomerCurrentPointsBalance(customerId);

        return {
          points: earnedPoints,
          amountPerPoint,
          registered: false,
          newBalance: currentBalance,
        };
      }

      const { error: pointsInsertError } = await supabase
        .from("customer_points")
        .insert([
          {
            id: crypto.randomUUID(),
            customer_id: customerId,
            points: earnedPoints,
            movement_type: "earn",
            source: "sale",
            related_sale_id: saleId,
            reward_id: null,
            user_id: user?.id || null,
            branch_id: branch?.id || null,
            notes: `PUNTOS GENERADOS POR VENTA. TOTAL DE VENTA: $${Number(
              saleTotal || 0,
            ).toFixed(2)} MXN.`,
            created_at: saleDate || new Date().toISOString(),
          },
        ]);

      if (pointsInsertError) throw pointsInsertError;

      const newBalance = await getCustomerCurrentPointsBalance(customerId);

      return {
        points: earnedPoints,
        amountPerPoint,
        registered: true,
        newBalance,
      };
    };


    const getRewardCartItems = () => {
      return (productosRef.current || []).filter((item) => {
        return (
          (item?.is_reward_item || item?.is_reward_discount_item) &&
          item?.reward_id &&
          Number(item?.cantidad || 0) > 0
        );
      });
    };

    const getRewardItemTotalPoints = (item) => {
      const linePoints = Number(item?.reward_line_points_required || 0);

      if (linePoints > 0) return Math.round(linePoints);

      const rewardPoints = Number(item?.reward_points_required || 0);

      if (rewardPoints > 0) return Math.round(rewardPoints);

      const pointsPerReward = Number(item?.points_required || 0);
      const rewardQuantity = Math.max(Number(item?.reward_quantity || 1), 1);
      const itemQuantity = Math.max(Number(item?.cantidad || 0), 0);

      if (pointsPerReward > 0 && itemQuantity > 0) {
        return Math.round(pointsPerReward * (itemQuantity / rewardQuantity));
      }

      return 0;
    };

    const getRewardItemPointsPerUnit = (item) => {
      const quantity = Math.max(Number(item?.cantidad || 0), 1);
      const totalPoints = getRewardItemTotalPoints(item);

      if (totalPoints <= 0) return 1;

      return Math.max(Math.round(totalPoints / quantity), 1);
    };

    const getRewardItemsSummary = (rewardItems = []) => {
      return (rewardItems || []).reduce(
        (summary, item) => {
          const totalPoints = getRewardItemTotalPoints(item);
          const quantity = Number(item?.cantidad || 0);
          const discountAmount = Number(
            item?.reward_discount_amount ?? item?.descuentoMonto ?? 0,
          );

          summary.totalPoints += totalPoints;
          summary.totalQuantity += quantity;
          summary.totalDiscountAmount += discountAmount;

          return summary;
        },
        {
          totalPoints: 0,
          totalQuantity: 0,
          totalDiscountAmount: 0,
        },
      );
    };

    const findSaleDetailForRewardItem = (rewardItem, saleDetails = [], usedDetailIds = new Set()) => {
      if (!rewardItem?.id) return null;

      const itemQuantity = Number(rewardItem.cantidad || 0);
      const itemDiscount = Number(rewardItem.descuentoMonto || 0);

      const candidates = (saleDetails || []).filter((detail) => {
        if (usedDetailIds.has(detail.id)) return false;
        if (detail.product_id !== rewardItem.id) return false;

        if (rewardItem?.is_reward_discount_item) {
          return Number(detail.quantity || 0) === itemQuantity;
        }

        const finalUnitPrice = Number(
          detail.final_unit_price ?? detail.unit_price ?? 0,
        );

        return finalUnitPrice === 0;
      });

      if (candidates.length === 0) return null;

      const exactMatch = candidates.find((detail) => {
        return (
          Number(detail.quantity || 0) === itemQuantity &&
          Number(detail.discount_amount || 0) === itemDiscount
        );
      });

      if (exactMatch) return exactMatch;

      const quantityMatch = candidates.find((detail) => {
        return Number(detail.quantity || 0) === itemQuantity;
      });

      return quantityMatch || candidates[0] || null;
    };

    const loadSaleDetailsForRewardRedemptions = async (saleId) => {
      if (!saleId) return [];

      const { data, error } = await supabase
        .from("sale_details")
        .select(
          `
          id,
          sale_id,
          product_id,
          quantity,
          unit_price,
          total_price,
          original_unit_price,
          final_unit_price,
          discount_amount
        `,
        )
        .eq("sale_id", saleId);

      if (error) throw error;

      return data || [];
    };

    const registerSaleRewardRedemptions = async ({
      saleId,
      customerId,
      saleDate,
      rewardItems = [],
    }) => {
      if (!saleId || !customerId || !branch?.id || !user?.id) {
        return {
          registered: false,
          rows: [],
          totalPoints: 0,
          totalQuantity: 0,
          totalDiscountAmount: 0,
        };
      }

      const validRewardItems = (rewardItems || []).filter((item) => {
        return (
          (item?.is_reward_item || item?.is_reward_discount_item) &&
          item?.reward_id &&
          Number(item?.cantidad || 0) > 0
        );
      });

      if (validRewardItems.length === 0) {
        return {
          registered: false,
          rows: [],
          totalPoints: 0,
          totalQuantity: 0,
          totalDiscountAmount: 0,
        };
      }

      const { data: existingRows, error: existingRowsError } = await supabase
        .from("sale_reward_redemptions")
        .select("id")
        .eq("sale_id", saleId)
        .limit(1);

      if (existingRowsError) throw existingRowsError;

      const summary = getRewardItemsSummary(validRewardItems);

      if ((existingRows || []).length > 0) {
        return {
          registered: false,
          rows: [],
          ...summary,
        };
      }

      const saleDetails = await loadSaleDetailsForRewardRedemptions(saleId);
      const usedDetailIds = new Set();

      const redemptionRows = validRewardItems.map((item) => {
        const quantity = Number(item.cantidad || 0);
        const totalPoints = getRewardItemTotalPoints(item);
        const pointsPerUnit = getRewardItemPointsPerUnit(item);
        const unitPrice = Number(item.precioOriginal ?? item.precio ?? 0);
        const discountAmount = Number(
          item.reward_discount_amount ?? item.descuentoMonto ?? unitPrice * quantity ?? 0,
        );
        const detailRow = findSaleDetailForRewardItem(item, saleDetails, usedDetailIds);

        if (detailRow?.id) {
          usedDetailIds.add(detailRow.id);
        }

        return {
          id: crypto.randomUUID(),
          sale_id: saleId,
          sale_detail_id: detailRow?.id || null,
          customer_id: customerId,
          reward_id: item.reward_id,
          product_id: item.id,
          branch_id: branch.id,
          user_id: user.id,
          quantity,
          points_per_unit: pointsPerUnit,
          total_points: Math.max(totalPoints, pointsPerUnit),
          unit_price: unitPrice,
          discount_amount: discountAmount,
          reward_name: item.reward_name || item.discountConcept || "RECOMPENSA",
          product_name: item.nombre || item.codigo || "PRODUCTO",
          status: "applied",
          created_at: saleDate || new Date().toISOString(),
        };
      });

      const { error: insertError } = await supabase
        .from("sale_reward_redemptions")
        .insert(redemptionRows);

      if (insertError) throw insertError;

      const returnedRows = redemptionRows.map((row) => {
        const sourceItem = validRewardItems.find((item) => {
          return item.reward_id === row.reward_id && item.id === row.product_id;
        });

        return {
          ...row,
          reward_type: sourceItem?.is_reward_discount_item
            ? "product_discount"
            : "free_product",
        };
      });

      return {
        registered: true,
        rows: returnedRows,
        ...summary,
      };
    };

    const registerCustomerRewardPointsRedemption = async ({
      saleId,
      customerId,
      saleDate,
      rewardItems = [],
    }) => {
      if (!saleId || !customerId || !branch?.id || !user?.id) {
        const currentBalance = customerId
          ? await getCustomerCurrentPointsBalance(customerId)
          : null;

        return {
          pointsUsed: 0,
          registered: false,
          newBalance: currentBalance,
        };
      }

      const validRewardItems = (rewardItems || []).filter((item) => {
        return (
          (item?.is_reward_item || item?.is_reward_discount_item) &&
          item?.reward_id &&
          Number(item?.cantidad || 0) > 0
        );
      });

      if (validRewardItems.length === 0) {
        const currentBalance = await getCustomerCurrentPointsBalance(customerId);

        return {
          pointsUsed: 0,
          registered: false,
          newBalance: currentBalance,
        };
      }

      const { data: existingMovement, error: existingError } = await supabase
        .from("customer_points")
        .select("id")
        .eq("customer_id", customerId)
        .eq("related_sale_id", saleId)
        .eq("source", "reward")
        .limit(1)
        .maybeSingle();

      if (existingError) throw existingError;

      const pointsByReward = {};
      const quantityByReward = {};
      const nameByReward = {};

      validRewardItems.forEach((item) => {
        const rewardId = item.reward_id;

        pointsByReward[rewardId] =
          Number(pointsByReward[rewardId] || 0) + getRewardItemTotalPoints(item);

        quantityByReward[rewardId] =
          Number(quantityByReward[rewardId] || 0) + Number(item.cantidad || 0);

        nameByReward[rewardId] = item.reward_name || item.discountConcept || "RECOMPENSA";
      });

      const totalPointsUsed = Object.values(pointsByReward).reduce((sum, value) => {
        return sum + Number(value || 0);
      }, 0);

      if (totalPointsUsed <= 0) {
        const currentBalance = await getCustomerCurrentPointsBalance(customerId);

        return {
          pointsUsed: 0,
          registered: false,
          newBalance: currentBalance,
        };
      }

      if (existingMovement?.id) {
        const currentBalance = await getCustomerCurrentPointsBalance(customerId);

        return {
          pointsUsed: totalPointsUsed,
          registered: false,
          newBalance: currentBalance,
        };
      }

      const movementRows = Object.entries(pointsByReward)
        .filter(([, points]) => Number(points || 0) > 0)
        .map(([rewardId, points]) => {
          const quantity = Number(quantityByReward[rewardId] || 0);
          const rewardName = nameByReward[rewardId] || "RECOMPENSA";

          return {
            id: crypto.randomUUID(),
            customer_id: customerId,
            points: Math.abs(Math.round(Number(points || 0))) * -1,
            movement_type: "redeem",
            source: "reward",
            related_sale_id: saleId,
            reward_id: rewardId,
            user_id: user.id,
            branch_id: branch.id,
            notes: `CANJE DE RECOMPENSA EN VENTA. RECOMPENSA: ${rewardName}. CANTIDAD ENTREGADA: ${quantity}.`,
            created_at: saleDate || new Date().toISOString(),
          };
        });

      if (movementRows.length > 0) {
        const { error: insertError } = await supabase
          .from("customer_points")
          .insert(movementRows);

        if (insertError) throw insertError;
      }

      const newBalance = await getCustomerCurrentPointsBalance(customerId);

      return {
        pointsUsed: totalPointsUsed,
        registered: movementRows.length > 0,
        newBalance,
      };
    };

    const handleProcessPayment = async (paymentData) => {
      if (processingSale) return false;

      try {
        setProcessingSale(true);

        const canSell = await validateShiftNotCut();

        if (!canSell) {
          showAppWarning(
            "Ya realizaste el corte de cajero.\nDebes cerrar turno antes de seguir vendiendo.",
          );
          setShowPaymentModal(false);
          return false;
        }

        if (!user?.id) {
          showAppWarning("No se detectó el usuario.");
          return false;
        }

        if (!branch?.id) {
          showAppWarning("No se detectó la sucursal.");
          return false;
        }

        if (productos.length === 0) {
          showAppWarning("No hay productos en la venta.");
          return false;
        }

        if (!saleToken) {
          showAppWarning("No se generó el token de venta.");
          return false;
        }

        const invalidProduct = productos.find((p) => !isValidUuid(p.id));
        if (invalidProduct) {
          showAppWarning("Hay productos sin UUID real. No se puede guardar la venta.");
          return false;
        }

        const stockIsValid = await validateCartStockBeforeSale();
        if (!stockIsValid) {
          return false;
        }

        const productsPayload = buildProductsPayload();
        const paymentsPayload = buildPaymentsPayload(paymentData);
        const saleDate = new Date().toISOString();

        const { data: saleId, error } = await supabase.rpc(
          "create_sale_transaction",
          {
            p_branch_id: branch.id,
            p_user_id: user.id,
            p_customer_id: currentSaleClient?.id || null,
            p_subtotal: Number(subtotal),
            p_tax: 0,
            p_total: Number(total),
            p_sale_date: saleDate,
            p_products: productsPayload,
            p_payments: paymentsPayload,
            p_client_sale_token: saleToken,
            p_notes: paymentData?.notes?.trim() || null,
          },
        );

        if (error) throw error;

        const rewardItemsForSale = getRewardCartItems();

        let rewardRedemptionResult = {
          registered: false,
          rows: [],
          totalPoints: 0,
          totalQuantity: 0,
          totalDiscountAmount: 0,
          error: null,
        };

        let rewardPointsResult = {
          pointsUsed: 0,
          registered: false,
          newBalance: null,
          error: null,
        };

        let pointsResult = {
          points: 0,
          amountPerPoint: DEFAULT_POINTS_AMOUNT,
          registered: false,
          newBalance: null,
          pointsUsed: 0,
          rewardRedemptions: [],
          error: null,
        };

        if (currentSaleClient?.id && rewardItemsForSale.length > 0) {
          try {
            rewardRedemptionResult = await registerSaleRewardRedemptions({
              saleId,
              customerId: currentSaleClient.id,
              saleDate,
              rewardItems: rewardItemsForSale,
            });

            rewardPointsResult = await registerCustomerRewardPointsRedemption({
              saleId,
              customerId: currentSaleClient.id,
              saleDate,
              rewardItems: rewardItemsForSale,
            });
          } catch (rewardError) {
            console.error("Error registrando canje de recompensas:", rewardError);

            rewardRedemptionResult = {
              registered: false,
              rows: [],
              totalPoints: 0,
              totalQuantity: 0,
              totalDiscountAmount: 0,
              error: rewardError,
            };

            rewardPointsResult = {
              pointsUsed: 0,
              registered: false,
              newBalance: null,
              error: rewardError,
            };
          }
        }

        if (currentSaleClient?.id) {
          try {
            const earnedPointsResult = await registerCustomerPointsForSale({
              saleId,
              customerId: currentSaleClient.id,
              saleTotal: Number(total),
              saleDate,
            });

            const currentBalance = await getCustomerCurrentPointsBalance(
              currentSaleClient.id,
            );

            pointsResult = {
              ...earnedPointsResult,
              newBalance: currentBalance,
              pointsUsed: Number(rewardPointsResult?.pointsUsed || 0),
              rewardRedemptions: rewardRedemptionResult?.rows || [],
              rewardError:
                rewardRedemptionResult?.error || rewardPointsResult?.error || null,
            };
          } catch (pointsError) {
            console.error("Error registrando puntos de cliente:", pointsError);

            pointsResult = {
              points: 0,
              amountPerPoint: DEFAULT_POINTS_AMOUNT,
              registered: false,
              newBalance:
                rewardPointsResult?.newBalance !== undefined
                  ? rewardPointsResult.newBalance
                  : null,
              pointsUsed: Number(rewardPointsResult?.pointsUsed || 0),
              rewardRedemptions: rewardRedemptionResult?.rows || [],
              error: pointsError,
              rewardError:
                rewardRedemptionResult?.error || rewardPointsResult?.error || null,
            };
          }
        }

        if (paymentData?.shouldPrint) {
          await printSaleTicket({
            saleId,
            paymentData,
            paymentPayload: paymentsPayload,
            notes: paymentData?.notes?.trim() || null,
            saleDate,
            saleClient: currentSaleClient,
            pointsResult,
          });
        }

        const saleSuccessPayload = {
          saleId,
          folio: String(saleId).slice(0, 8).toUpperCase(),
          customerId: currentSaleClient?.id || null,
          customerName: currentSaleClient?.name || "PÚBLICO EN GENERAL",
          customerPhone: currentSaleClient?.phone || "",
          total: Number(total),
          subtotal: Number(subtotal),
          discountTotal: Number(discountTotal || 0),
          paymentMethod: paymentData?.method || "",
          printed: !!paymentData?.shouldPrint,
          pointsEarned: Number(pointsResult?.points || 0),
          pointsUsed: Number(pointsResult?.pointsUsed || 0),
          pointsBalance:
            pointsResult?.newBalance !== undefined &&
            pointsResult?.newBalance !== null
              ? Number(pointsResult.newBalance)
              : null,
          pointsError: pointsResult?.error || null,
          rewardPointsError: pointsResult?.rewardError || null,
          rewardRedemptions: pointsResult?.rewardRedemptions || [],
          rewardRedemptionsRegistered: !!rewardRedemptionResult?.registered,
          rewardPointsRegistered: !!rewardPointsResult?.registered,
          noPointsReason:
            currentSaleClient?.id &&
            Number(pointsResult?.points || 0) <= 0 &&
            Number(pointsResult?.pointsUsed || 0) <= 0
              ? "La venta no generó puntos porque el total no alcanzó el monto mínimo configurado."
              : "",
        };

        clearSalesDraft();
        resetCurrentSale();
        setShowPaymentModal(false);
        setSaleSuccessData(saleSuccessPayload);

        return true;
      } catch (error) {
        console.error("Error al registrar venta:", error);
        showAppWarning(error.message || "Error al registrar la venta.");
        return false;
      } finally {
        setProcessingSale(false);
      }
    };

    const handleSavePendingTicket = (ticketName) => {
      const pendingTicket = {
        number: ticketNumber,
        name: ticketName,
        products: productos,
        client: currentSaleClient,
        reward: currentSaleReward,
        subtotal,
        discountTotal,
        total,
        date: new Date().toISOString(),
      };

      setPendingTickets((prev) => [...prev, pendingTicket]);

      setProductos([]);
      setCurrentSaleClient(null);
      setCurrentSaleReward(null);
      setPendingFreeProductRewards([]);
      setPendingProductDiscountRewards([]);
      setActiveProductDiscountReward(null);
      setRewardProductModalOpen(false);
      setProductDiscountRewardModalOpen(false);
      setSelectedProduct(null);
      setTicketNumber((prev) => prev + 1);
      setBarcode("");
      setSaleToken(null);
      setRecoveredDraft(false);
      setRecoveredDraftSavedAt(null);
    };

    const handleChangeToTicket = (ticket) => {
      if (productos.length > 0) {
        const currentTicket = {
          number: ticketNumber,
          name: `Ticket ${ticketNumber}`,
          products: productos,
          client: currentSaleClient,
          reward: currentSaleReward,
          subtotal,
          discountTotal,
          total,
          date: new Date().toISOString(),
        };

        const updatedPendingTickets = pendingTickets.filter((t) => t !== ticket);
        setPendingTickets([...updatedPendingTickets, currentTicket]);
      } else {
        const updatedPendingTickets = pendingTickets.filter((t) => t !== ticket);
        setPendingTickets(updatedPendingTickets);
      }

      const restoredProducts = Array.isArray(ticket.products) ? ticket.products : [];

      setProductos(restoredProducts);
      productosRef.current = restoredProducts;
      setCurrentSaleClient(ticket.client);
      setCurrentSaleReward(getSyncedRewardsFromCart(restoredProducts, ticket.reward || null));
      setPendingFreeProductRewards([]);
      setPendingProductDiscountRewards([]);
      setActiveProductDiscountReward(null);
      setRewardProductModalOpen(false);
      setProductDiscountRewardModalOpen(false);
      setTicketNumber(ticket.number);
      setSelectedProduct(null);
      setBarcode("");
      setSaleToken(null);
    };

    const handleDeleteTicket = (index) => {
      const updatedPendingTickets = pendingTickets.filter((_, i) => i !== index);
      setPendingTickets(updatedPendingTickets);
    };

    const handleOpenChangeModal = () => {
      if (pendingTickets.length === 0) {
        showAppWarning("No hay tickets pendientes");
      } else {
        setChangeModalOpen(true);
      }
    };

    const handleOpenDeleteModal = () => {
      if (pendingTickets.length === 0) {
        showAppWarning("No hay tickets pendientes por eliminar");
      } else {
        setDeleteModalOpen(true);
      }
    };

    const openExitFlow = useCallback(async () => {
      if (shiftAlreadyCut) {
        showAppWarning(
          "El turno ya fue cortado. Debes cerrar turno antes de hacer movimientos.",
        );
        return;
      }

      const isAdmin = await checkUserIsAdmin(user?.id);

      if (isAdmin) {
        setExitModalOpen(true);
        return;
      }

      setExitAuthModalOpen(true);
    }, [shiftAlreadyCut, user?.id]);

    const handleExitAuthorized = () => {
      setExitAuthModalOpen(false);
      setExitModalOpen(true);
    };

    const handleCloseExitAuth = () => {
      setExitAuthModalOpen(false);
    };

    useEffect(() => {
      const handleKeyDown = (e) => {
        const isAnyModalOpen =
          showPaymentModal ||
          isEntryModalOpen ||
          isExitModalOpen ||
          isExitAuthModalOpen ||
          isClientModalOpen ||
          isRewardProductModalOpen ||
          isProductDiscountRewardModalOpen ||
          isVerifierModalOpen ||
          isSearchModalOpen ||
          isDiscountModalOpen ||
          isPendingModalOpen ||
          isChangeModalOpen ||
          isDeleteModalOpen ||
          isDeleteItemModalOpen ||
          isSalesHistoryModalOpen ||
          !!saleSuccessData;

        const target = e.target;
        const isInputElement =
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable;

        if ((e.key === "ArrowDown" || e.key === "ArrowUp") && !isAnyModalOpen) {
          e.preventDefault();

          if (productos.length === 0) return;

          if (!selectedProduct) {
            setSelectedProduct(productos[0]);
          } else {
            const currentIndex = productos.findIndex((p) =>
              isSameCartItem(p, selectedProduct),
            );

            if (e.key === "ArrowDown") {
              const nextIndex = (currentIndex + 1) % productos.length;
              setSelectedProduct(productos[nextIndex]);
            } else if (e.key === "ArrowUp") {
              const prevIndex =
                currentIndex === 0 ? productos.length - 1 : currentIndex - 1;
              setSelectedProduct(productos[prevIndex]);
            }
          }

          return;
        }

        if (e.ctrlKey && e.key.toLowerCase() === "d") {
          e.preventDefault();
          handleOpenDiscountModal();
          return;
        }

        if (!isAnyModalOpen && selectedProduct && !isInputElement) {
          if (e.key === "+" || e.key === "=" || e.key === "Add") {
            e.preventDefault();
            increaseSelectedProductQuantity();
            return;
          }

          if (e.key === "-" || e.key === "Subtract") {
            e.preventDefault();
            decreaseSelectedProductQuantity();
            return;
          }
        }

        switch (e.key) {
          case "F12":
            e.preventDefault();
            openPaymentFlow();
            break;
          case "F5":
            e.preventDefault();
            handleOpenChangeModal();
            break;
          case "F6":
            e.preventDefault();
            setPendingModalOpen(true);
            break;
          case "F7":
            e.preventDefault();
            if (shiftAlreadyCut) {
              showAppWarning(
                "El turno ya fue cortado. Debes cerrar turno antes de hacer movimientos.",
              );
            } else {
              setEntryModalOpen(true);
            }
            break;
          case "F8":
            e.preventDefault();
            openExitFlow();
            break;
          case "F9":
            e.preventDefault();
            setVerifierModalOpen(true);
            break;
          case "F10":
            e.preventDefault();
            setSearchModalOpen(true);
            break;
          case "Backspace":
            if (isInputElement) return;

            if (!isAnyModalOpen) {
              e.preventDefault();

              if (selectedProduct) {
                setDeleteItemModalOpen(true);
              } else {
                showAppWarning("Por favor, selecciona un producto primero");
              }
            }
            break;
          case "Delete":
            e.preventDefault();
            handleOpenDeleteModal();
            break;
          case "Escape":
            if (processingSale) return;

            if (showPaymentModal) setShowPaymentModal(false);
            else if (isEntryModalOpen) setEntryModalOpen(false);
            else if (isExitModalOpen) setExitModalOpen(false);
            else if (isExitAuthModalOpen) setExitAuthModalOpen(false);
            else if (isClientModalOpen) setClientModalOpen(false);
            else if (isRewardProductModalOpen) handleCloseRewardProductModal();
            else if (isProductDiscountRewardModalOpen) handleCloseProductDiscountRewardModal();
            else if (isVerifierModalOpen) setVerifierModalOpen(false);
            else if (isSearchModalOpen) setSearchModalOpen(false);
            else if (isDiscountModalOpen) setDiscountModalOpen(false);
            else if (isPendingModalOpen) setPendingModalOpen(false);
            else if (isChangeModalOpen) setChangeModalOpen(false);
            else if (isDeleteModalOpen) setDeleteModalOpen(false);
            else if (isDeleteItemModalOpen) setDeleteItemModalOpen(false);
            else if (saleSuccessData) setSaleSuccessData(null);
            else if (isSalesHistoryModalOpen) setSalesHistoryModalOpen(false);
            break;
          default:
            break;
        }
      };

      document.addEventListener("keydown", handleKeyDown);

      return () => {
        document.removeEventListener("keydown", handleKeyDown);
      };
    }, [
      showPaymentModal,
      isEntryModalOpen,
      isExitModalOpen,
      isExitAuthModalOpen,
      isClientModalOpen,
      isRewardProductModalOpen,
      isProductDiscountRewardModalOpen,
      isVerifierModalOpen,
      isSearchModalOpen,
      isDiscountModalOpen,
      isPendingModalOpen,
      isChangeModalOpen,
      isDeleteModalOpen,
      isDeleteItemModalOpen,
      isSalesHistoryModalOpen,
      saleSuccessData,
      selectedProduct,
      productos,
      pendingTickets,
      processingSale,
      shiftAlreadyCut,
      openExitFlow,
    ]);

    const currentSaleRewards = getSyncedRewardsFromCart(productos, currentSaleReward);
    const pendingProductDiscountRewardItems = normalizeRewardsArray(currentSaleReward).filter(
      isPendingProductDiscountReward,
    );
    const appliedRewards = currentSaleRewards.filter(
      (reward) => !isPendingProductDiscountReward(reward),
    );

    const currentSaleRewardsTotalQuantity = currentSaleRewards.reduce(
      (sum, reward) => sum + getRewardRedeemQuantity(reward),
      0,
    );

    const appliedRewardsQuantity = appliedRewards.reduce(
      (sum, reward) => sum + getRewardRedeemQuantity(reward),
      0,
    );

    const pendingRewardsQuantity = pendingProductDiscountRewardItems.reduce(
      (sum, reward) => sum + getRewardRedeemQuantity(reward),
      0,
    );

    const currentSaleRewardsLabel = (() => {
      if (currentSaleRewardsTotalQuantity === 0) return "";

      if (pendingRewardsQuantity > 0 && appliedRewardsQuantity > 0) {
        return `Canjes aplicados: ${appliedRewardsQuantity} · Pendientes: ${pendingRewardsQuantity}`;
      }

      if (pendingRewardsQuantity > 0) {
        return `Canjes pendientes: ${pendingRewardsQuantity}`;
      }

      return `Canjes aplicados: ${appliedRewardsQuantity}`;
    })();

    const getProductDiscountPercent = (producto) => {
      if (!producto) return 0;

      const directPercent = Number(producto.discountPercent || 0);
      if (directPercent > 0) return directPercent;

      const discountValue = Number(producto.descuentoValor || 0);
      if (producto.descuentoTipo === "percent" && discountValue > 0) {
        return discountValue;
      }

      const originalPrice = Number(producto.precioOriginal ?? producto.precio ?? 0);
      const finalPrice = Number(producto.precio ?? 0);

      if (originalPrice <= 0 || finalPrice >= originalPrice) return 0;

      return ((originalPrice - finalPrice) / originalPrice) * 100;
    };

    const getProductHasDiscount = (producto) => {
      if (!producto) return false;

      return (
        Number(producto.descuentoMonto || 0) > 0 ||
        getProductDiscountPercent(producto) > 0
      );
    };

    const getProductDiscountConcept = (producto) => {
      const concept = String(producto?.discountConcept || "").trim();

      if (concept) return concept;

      if (producto?.is_reward_discount_item) {
        return "DESCUENTO POR RECOMPENSA";
      }

      return "";
    };

    const gridTemplate = columnWidths.map((width) => `${width}px`).join(" ");

    return (
      <div className={styles.ventasContainer}>
        <div className={styles.saleHeader}>
          <div className={styles.saleHeaderMain}>
            <h2>VENTA - Ticket {ticketNumber}</h2>
          </div>

          <div className={styles.saleClientBadge}>
            <span>{currentSaleClient ? "Cliente asignado:" : "Cliente:"}</span>
            <strong>{currentSaleClient?.name || "PÚBLICO EN GENERAL"}</strong>
            {currentSaleRewards.length > 0 && (
              <small>{currentSaleRewardsLabel}</small>
            )}
          </div>
        </div>

        {shiftAlreadyCut && (
          <div className={styles.shiftCutWarning}>
            <span>
              Corte de cajero realizado. Debes cerrar turno antes de seguir
              vendiendo.
            </span>

            <span>PENDIENTE CERRAR TURNO</span>
          </div>
        )}

        {!shiftAlreadyCut && stockWarningMsg && (
          <div className={styles.shiftCutWarning}>
            <span>{stockWarningMsg}</span>
            <span>REVISAR STOCK</span>
          </div>
        )}

        <div className={styles.topActionBar}>
          <div
            className={styles.horizontalActionButton}
            onClick={() => setSearchModalOpen(true)}
          >
            <span className={styles.actionKey}>F10</span>
            <img src={searchIcon} alt="Buscar" className={styles.buttonIcon} />
            <span className={styles.actionText}>Buscar</span>
          </div>

          <div
            className={`${styles.horizontalActionButton} ${
              shiftAlreadyCut ? styles.actionButtonDisabled : ""
            }`}
            onClick={() => {
              if (shiftAlreadyCut) {
                showAppWarning(
                  "El turno ya fue cortado. Debes cerrar turno antes de hacer movimientos.",
                );
                return;
              }
              setEntryModalOpen(true);
            }}
          >
            <span className={styles.actionKey}>F7</span>
            <img src={entryIcon} alt="Entradas" className={styles.buttonIcon} />
            <span className={styles.actionText}>Entradas</span>
          </div>

          <div
            className={`${styles.horizontalActionButton} ${
              shiftAlreadyCut ? styles.actionButtonDisabled : ""
            }`}
            onClick={openExitFlow}
          >
            <span className={styles.actionKey}>F8</span>
            <img src={exitIcon} alt="Salidas" className={styles.buttonIcon} />
            <span className={styles.actionText}>Salidas</span>
          </div>

          <div
            className={styles.horizontalActionButton}
            onClick={() => {
              if (selectedProduct) {
                setDeleteItemModalOpen(true);
              } else {
                showAppWarning("Por favor, selecciona un producto primero");
              }
            }}
          >
            <span className={styles.actionKey}>DEL</span>
            <img src={deleteIcon} alt="Borrar" className={styles.buttonIcon} />
            <span className={styles.actionText}>Borrar Art.</span>
          </div>

          <div
            className={styles.horizontalActionButton}
            onClick={() => setVerifierModalOpen(true)}
          >
            <span className={styles.actionKey}>F9</span>
            <img
              src={verifyIcon}
              alt="Verificador"
              className={styles.buttonIcon}
            />
            <span className={styles.actionText}>Verificador</span>
          </div>
        </div>

        <div className={styles.productInputBar}>
          <div className={styles.inputSection}>
            <label>Código de Barras:</label>

            <input
              type="text"
              className={styles.barcodeInput}
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleBarcodeSearch();
                }
              }}
              placeholder="Escanea o escribe código"
              disabled={shiftAlreadyCut}
            />
          </div>

          <div
            className={`${styles.addProductBtn} ${
              shiftAlreadyCut ? styles.actionButtonDisabled : ""
            }`}
            onClick={handleBarcodeSearch}
          >
            <span className={styles.actionKey2}>ENTER</span>
            <span className={styles.actionText2}>Agregar Producto</span>
          </div>
        </div>

        <div className={styles.productsTable} ref={tableRef}>
          <div
            className={styles.tableHeader}
            style={{ gridTemplateColumns: gridTemplate }}
          >
            <span>
              Producto
              <div
                className={styles.resizeHandle}
                onMouseDown={(e) => handleMouseDown(e, 0)}
              />
            </span>

            <span>
              Precio Venta
              <div
                className={styles.resizeHandle}
                onMouseDown={(e) => handleMouseDown(e, 1)}
              />
            </span>

            <span>
              Cant.
              <div
                className={styles.resizeHandle}
                onMouseDown={(e) => handleMouseDown(e, 2)}
              />
            </span>

            <span>
              Importe
              <div
                className={styles.resizeHandle}
                onMouseDown={(e) => handleMouseDown(e, 3)}
              />
            </span>

            <span>Existencia</span>
          </div>

          <div className={styles.tableBody}>
            {productos.map((producto) => (
              <div
                key={getCartItemKey(producto)}
                className={`${styles.tableRow} ${
                  producto.is_reward_item ? styles.rewardRow : ""
                } ${
                  producto.is_reward_discount_item ? styles.rewardDiscountRow : ""
                } ${
                  getProductHasDiscount(producto) && !producto.is_reward_item
                    ? styles.discountAppliedRow
                    : ""
                } ${
                  selectedProduct && isSameCartItem(selectedProduct, producto)
                    ? styles.selectedRow
                    : ""
                }`}
                style={{ gridTemplateColumns: gridTemplate }}
                onClick={() => handleProductSelect(producto)}
              >
                <span className={`${styles.tableCell} ${styles.productCell}`}>
                  <span className={styles.productNameText}>
                    {producto.nombre || producto.codigo}
                  </span>

                  {producto.is_reward_item && (
                    <span className={styles.rewardBadge}>Recompensa</span>
                  )}

                  {getProductHasDiscount(producto) && !producto.is_reward_item && (
                    <span className={styles.productDiscountBadge}>
                      DESC. {getProductDiscountPercent(producto).toFixed(2)}%
                    </span>
                  )}

                  {getProductDiscountConcept(producto) && (
                    <span className={styles.productDiscountConcept}>
                      {getProductDiscountConcept(producto)}
                    </span>
                  )}

                  {producto.is_reward_discount_item && (
                    <span className={styles.rewardDiscountBadge}>
                      Descuento recompensa
                    </span>
                  )}
                </span>

                <span className={styles.tableCell}>
                  ${Number(producto.precio || 0).toFixed(2)}
                </span>

                <span className={styles.tableCell}>{producto.cantidad}</span>

                <span className={styles.tableCell}>
                  ${Number(producto.importe || 0).toFixed(2)}
                </span>

                <span className={styles.tableCell}>{producto.existencia}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.footerBar}>
          <div className={styles.leftActions}>
            <div
              className={styles.squareButton}
              onClick={handleOpenChangeModal}
              data-tooltip="F5"
            >
              <img src={changeIcon} alt="Cambiar" className={styles.squareIcon} />
              <span className={styles.squareKey}>F5</span>
              <span className={styles.squareText}>Cambiar</span>
            </div>

            <div
              className={styles.squareButton}
              onClick={() => setPendingModalOpen(true)}
              data-tooltip="F6"
            >
              <span className={styles.squareKey}>F6</span>
              <span className={styles.squareText}>Pendiente</span>
            </div>

            <div className={styles.squareButton} onClick={handleOpenDeleteModal}>
              <img
                src={deleteIcon}
                alt="Eliminar"
                className={styles.squareIcon}
              />
              <span className={styles.squareText}>Eliminar</span>
            </div>

            <div
              className={styles.squareButton}
              onClick={handleOpenDiscountModal}
              data-tooltip="Ctrl + D"
            >
              <img
                src={DiscountIcon}
                alt="Descuento Icono"
                className={styles.squareIcon}
              />
              <span className={styles.squareText}>Descuento</span>
            </div>

            <div className={styles.squareButton} onClick={openClientModal}>
              <img
                src={assignClientIcon}
                alt="Asignar cliente"
                className={styles.squareIcon}
              />
              <span className={styles.squareText}>Asignar cliente</span>
            </div>

            <div
              className={styles.SquareButtonSecondary}
              onClick={() => setSalesHistoryModalOpen(true)}
            >
              <img
                src={SalesHistoryIcon}
                alt="Ventas del día y Devoluciones"
                className={styles.squareIconSecondary}
              />

              <span className={styles.salesHistoryButtonText}>
                <span className={styles.salesHistoryButtonLine}>
                  Ventas del día y
                </span>
                <span className={styles.salesHistoryButtonLine}>
                  Devoluciones
                </span>
              </span>
            </div>
          </div>

          <div className={styles.rightActions}>
            <div className={styles.totalSection}>
              <span className={styles.totalLabel}>Subtotal:</span>
              <span className={styles.totalAmount}>${subtotal.toFixed(2)}</span>
            </div>

            <div className={styles.totalSection}>
              <span className={styles.totalLabel}>Descuento:</span>
              <span className={styles.totalAmount}>
                -${discountTotal.toFixed(2)}
              </span>
            </div>

            <div className={styles.totalSection}>
              <span className={styles.totalLabel}>Total:</span>
              <span className={styles.totalAmount}>${total.toFixed(2)}</span>
            </div>

            <div
              className={`${styles.payButton} ${
                shiftAlreadyCut ? styles.payButtonDisabled : ""
              }`}
              onClick={() => {
                if (!shiftAlreadyCut) {
                  openPaymentFlow();
                }
              }}
            >
              <img src={payIcon} alt="Cobrar" className={styles.payIcon} />
              <span className={styles.payKey}>F12</span>
              <span className={styles.payText}>Cobrar</span>
            </div>
          </div>
        </div>

        <EntryModal
          isOpen={isEntryModalOpen}
          onClose={() => setEntryModalOpen(false)}
          onSaveEntry={handleSaveEntry}
        />

        <ExitModal
          isOpen={isExitModalOpen}
          onClose={() => setExitModalOpen(false)}
          onSave={handleSaveExit}
        />

        <AdminAuthorizationModal
          isOpen={isExitAuthModalOpen}
          onClose={handleCloseExitAuth}
          onAuthorized={handleExitAuthorized}
          action="cash_exit_access"
          title="Acceso restringido"
          message='Para realizar una "Salida" de efectivo, se requiere autorización de un administrador.'
          targetId="sales_cash_exit"
          branchId={branch?.id || null}
        />

        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => {
            if (!processingSale) {
              setShowPaymentModal(false);
            }
          }}
          total={total}
          onProcessPayment={handleProcessPayment}
          processingSale={processingSale}
          saleNotes={saleNotes}
          setSaleNotes={setSaleNotes}
        />

        <ClientModal
          isOpen={isClientModalOpen}
          onClose={() => setClientModalOpen(false)}
          onAssignClient={handleAssignClient}
          currentSaleClient={currentSaleClient}
          currentSaleReward={EMPTY_REWARDS}
        />

        <RewardProductSelectionModal
          isOpen={isRewardProductModalOpen}
          onClose={handleCloseRewardProductModal}
          onConfirm={handleConfirmRewardProducts}
          rewards={pendingFreeProductRewards}
          branchId={branch?.id || null}
          cartProducts={productos}
        />

        <ProductDiscountRewardModal
          isOpen={isProductDiscountRewardModalOpen}
          onClose={handleCloseProductDiscountRewardModal}
          onConfirm={handleConfirmProductDiscountReward}
          reward={activeProductDiscountReward}
          branchId={branch?.id || null}
          cartProducts={productos}
        />

        <VerifierModal
          isOpen={isVerifierModalOpen}
          onClose={() => setVerifierModalOpen(false)}
          onAddToSale={handleAddProductFromVerifier}
        />

        <SearchModal
          isOpen={isSearchModalOpen}
          onClose={() => setSearchModalOpen(false)}
          onAddToSale={handleAddProductFromVerifier}
          productosEnVenta={productos}
        />

        <DiscountModal
          isOpen={isDiscountModalOpen}
          onClose={() => setDiscountModalOpen(false)}
          onApplyDiscount={handleApplyDiscount}
          selectedProduct={selectedProduct}
        />

        <PendingTicketModal
          isOpen={isPendingModalOpen}
          onClose={() => setPendingModalOpen(false)}
          onAccept={handleSavePendingTicket}
          currentTicketNumber={ticketNumber}
          nextTicketNumber={ticketNumber + 1}
        />

        <ChangeTicketModal
          isOpen={isChangeModalOpen}
          onClose={() => setChangeModalOpen(false)}
          onSelectTicket={handleChangeToTicket}
          pendingTickets={pendingTickets}
        />

        <DeleteTicketModal
          isOpen={isDeleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          onDeleteTicket={handleDeleteTicket}
          pendingTickets={pendingTickets}
        />

        <DeleteItemModal
          isOpen={isDeleteItemModalOpen}
          onClose={() => setDeleteItemModalOpen(false)}
          onConfirmDelete={handleDeleteSelectedProduct}
          selectedProduct={selectedProduct}
        />

        <SaleSuccessModal
          isOpen={!!saleSuccessData}
          saleData={saleSuccessData}
          onClose={() => setSaleSuccessData(null)}
        />

        <SalesHistoryModal
          isOpen={isSalesHistoryModalOpen}
          onClose={() => setSalesHistoryModalOpen(false)}
        />

        <AppModal
          isOpen={appModal.isOpen}
          type={appModal.type}
          title={appModal.title}
          message={appModal.message}
          confirmText={appModal.confirmText}
          cancelText={appModal.cancelText}
          showCancel={appModal.showCancel}
          onClose={closeAppModal}
          onConfirm={appModal.onConfirm || closeAppModal}
          onCancel={appModal.onCancel || closeAppModal}
        />
      </div>
    );
  };
  
  export default Sales;
