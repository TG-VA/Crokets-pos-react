import React, { useState, useRef, useCallback, useEffect } from "react";
  import styles from "../../pages/Sales/Sales.module.css";
  import { supabase } from "../../lib/supabaseClient";
  import { useAuth } from "../../contexts/AuthContext";
  import { useBranch } from "../../contexts/BranchContext";
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
  import useSalesDraft from "../../components/SalesComponents/hooks/useSalesDraft";
  import useSalesInventoryRealtime from "../../components/SalesComponents/hooks/useSalesInventoryRealtime";
  import useSalesCashSession from "../../components/SalesComponents/hooks/useSalesCashSession";
  import useSalesCart from "../../components/SalesComponents/hooks/useSalesCart";
  import useSalesDiscount from "../../components/SalesComponents/hooks/useSalesDiscount";
  import useSalesStockValidation from "../../components/SalesComponents/hooks/useSalesStockValidation";
  import useSalesPaymentFlow from "../../components/SalesComponents/hooks/useSalesPaymentFlow";
  import useSalesCheckout from "../../components/SalesComponents/hooks/useSalesCheckout";
  import useSalesPendingTickets from "../../components/SalesComponents/hooks/useSalesPendingTickets";
  import useSalesRewards from "../../components/SalesComponents/hooks/useSalesRewards";
  import useSalesTableColumns from "../../components/SalesComponents/hooks/useSalesTableColumns";
  import useSalesCashMovements from "../../components/SalesComponents/hooks/useSalesCashMovements";

  import {
    getBranchInventoryRow as getBranchInventoryRowFromService,
  } from "../../components/SalesComponents/services/salesInventoryService";

  import {
    getSellableProductByBarcode,
  } from "../../components/SalesComponents/services/salesProductService";

  import {
    getCartItemKey,
    isSameCartItem,
  } from "../../components/SalesComponents/utils/salesCartUtils";

  const EMPTY_REWARDS = [];

  const Sales = () => {
    const { user } = useAuth();
    const { branch } = useBranch();

    const [saleToken, setSaleToken] = useState(null);
    const [saleNotes, setSaleNotes] = useState("");
    const [ticketNumber, setTicketNumber] = useState(1);
    const [pendingTickets, setPendingTickets] = useState([]);
    const [barcode, setBarcode] = useState("");
    const barcodeSearchInProgressRef = useRef(false);

    const handleCloseExitModal = useCallback(() => {
      setExitModalOpen(false);
    }, []);

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
    const productosRef = useRef([]);

    const {
      tableRef,
      gridTemplate,
      handleMouseDown,
    } = useSalesTableColumns();

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

    const restoreSalesDraft = useCallback((draft) => {
      const restoredProducts = Array.isArray(draft?.productos)
        ? draft.productos
        : [];

      setProductos(restoredProducts);
      productosRef.current = restoredProducts;
      setSelectedProduct(null);
      setCurrentSaleClient(draft?.currentSaleClient || null);
      setCurrentSaleReward(draft?.currentSaleReward || null);
      setTicketNumber(Number(draft?.ticketNumber || 1));
      setSaleToken(draft?.saleToken || null);
      setSaleNotes(draft?.saleNotes || "");
      setBarcode(draft?.barcode || "");
      setPendingTickets(
        Array.isArray(draft?.pendingTickets)
          ? draft.pendingTickets
          : [],
      );
    }, []);

    const discardSalesDraftState = useCallback(() => {
      setProductos([]);
      productosRef.current = [];
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
    }, []);

    const openSalesDraftRecoveryModal = useCallback(
      ({ message, onConfirm, onCancel }) => {
        setAppModal({
          isOpen: true,
          type: "warning",
          title: "Venta pendiente encontrada",
          message,
          confirmText: "Recuperar venta",
          cancelText: "Descartar",
          showCancel: true,
          onConfirm: () => {
            closeAppModal();

            if (typeof onConfirm === "function") {
              onConfirm();
            }
          },
          onCancel: () => {
            closeAppModal();

            if (typeof onCancel === "function") {
              onCancel();
            }
          },
        });
      },
      [],
    );

    const {
      draftReady,
      clearSalesDraft,
    } = useSalesDraft({
      branchId: branch?.id,
      userId: user?.id,

      productos,
      pendingTickets,
      currentSaleClient,
      currentSaleReward,
      ticketNumber,
      saleToken,
      saleNotes,
      barcode,

      subtotal,
      discountTotal,
      total,

      onRestoreDraft: restoreSalesDraft,
      onDiscardDraft: discardSalesDraftState,
      onOpenRecoveryModal: openSalesDraftRecoveryModal,
    });

    useEffect(() => {
      productosRef.current = productos;

      if (productos.length === 0) {
        setStockWarningMsg("");
      }
    }, [productos]);

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
    };






    const {
  shiftAlreadyCut,
  getOpenSession: getOpenCashSession,
  validateShiftNotCut,
} = useSalesCashSession({
  branchId: branch?.id,
  userId: user?.id,
  enabled: draftReady,
});

    const {
      handleSaveEntry,
      handleSaveExit,
    } = useSalesCashMovements({
      userId: user?.id,
      branchId: branch?.id,
      shiftAlreadyCut,
      getOpenCashSession,
      setCashMovements,
      showAppModal,
      showAppWarning,
      showAppSuccess,
    });

    const getBranchInventoryRow = useCallback(
      async (productId) => {
        return getBranchInventoryRowFromService({
          branchId: branch?.id,
          productId,
        });
      },
      [branch?.id],
    );

    const {
      refreshCartInventory: refreshCartInventoryFromRealtime,
      getKitAvailableStock,
    } = useSalesInventoryRealtime({
      branchId: branch?.id,
      userId: user?.id,
      enabled: draftReady,
      productosRef,
      setProductos,
      setSelectedProduct,
      setStockWarningMsg,
    });


    const {
      openPaymentFlow,
    } = useSalesPaymentFlow({
      productos,
      processingSale,
      validateShiftNotCut,
      pendingProductDiscountRewards,
      activeProductDiscountReward,
      setSaleToken,
      setShowPaymentModal,
      showAppWarning,
    });

    const {
      currentSaleRewards,
      currentSaleRewardsLabel,
      syncCurrentSaleRewardsWithCart,
      handleAssignClient,
      handleConfirmRewardProducts,
      handleCloseRewardProductModal,
      handleConfirmProductDiscountReward,
      handleCloseProductDiscountRewardModal,
    } = useSalesRewards({
      productos,
      productosRef,
      currentSaleReward,
      setCurrentSaleReward,
      setCurrentSaleClient,
      pendingProductDiscountRewards,
      setPendingProductDiscountRewards,
      setPendingFreeProductRewards,
      setActiveProductDiscountReward,
      setRewardProductModalOpen,
      setProductDiscountRewardModalOpen,
      setProductos,
      selectedProduct,
      setSelectedProduct,
      getBranchInventoryRow,
      showAppWarning,
    });

    const {
      addProductToCart,
      increaseSelectedProductQuantity,
      decreaseSelectedProductQuantity,
      handleDeleteSelectedProduct,
    } = useSalesCart({
      productosRef,
      selectedProduct,
      setProductos,
      setSelectedProduct,
      getBranchInventoryRow,
      getKitAvailableStock,
      showAppWarning,
      syncCurrentSaleRewardsWithCart,
    });

    const handleBarcodeSearch = async () => {
      if (barcodeSearchInProgressRef.current) {
        return;
      }

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

      if (!cleanBarcode) {
        return;
      }

      barcodeSearchInProgressRef.current = true;

      try {
        const product =
          await getSellableProductByBarcode({
            barcode: cleanBarcode,
            branchId: branch.id,
          });

        await addProductToCart(product);
      } catch (error) {
        console.error(
          "Error buscando producto:",
          error,
        );

        showAppWarning(
          error?.message ||
            "Error buscando producto.",
        );
      } finally {
        barcodeSearchInProgressRef.current = false;
        setBarcode("");
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

    const {
      handleApplyDiscount,
      handleOpenDiscountModal,
    } = useSalesDiscount({
      productosRef,
      selectedProduct,
      setProductos,
      setSelectedProduct,
      setDiscountModalOpen,
      showAppWarning,
    });

    const {
      validateCartStockBeforeSale,
    } = useSalesStockValidation({
      productosRef,
      refreshCartInventoryFromRealtime,
      getKitAvailableStock,
      getBranchInventoryRow,
      showAppWarning,
    });

    const {
      handleProcessPayment,
    } = useSalesCheckout({
      user,
      branch,
      productos,
      productosRef,
      subtotal,
      discountTotal,
      total,
      saleToken,
      processingSale,
      currentSaleClient,
      validateShiftNotCut,
      validateCartStockBeforeSale,
      clearSalesDraft,
      resetCurrentSale,
      setProcessingSale,
      setShowPaymentModal,
      setSaleSuccessData,
      showAppWarning,
    });

    const {
      handleSavePendingTicket,
      handleChangeToTicket,
      handleDeleteTicket,
      handleOpenChangeModal,
      handleOpenDeleteModal,
    } = useSalesPendingTickets({
      productos,
      productosRef,
      pendingTickets,
      setPendingTickets,
      ticketNumber,
      setTicketNumber,
      currentSaleClient,
      setCurrentSaleClient,
      currentSaleReward,
      setCurrentSaleReward,
      subtotal,
      discountTotal,
      total,
      setProductos,
      setSelectedProduct,
      setPendingFreeProductRewards,
      setPendingProductDiscountRewards,
      setActiveProductDiscountReward,
      setRewardProductModalOpen,
      setProductDiscountRewardModalOpen,
      setBarcode,
      setSaleToken,
      setChangeModalOpen,
      setDeleteModalOpen,
      showAppWarning,
    });

    const openClientModal = () => {
      setPendingFreeProductRewards([]);
      setRewardProductModalOpen(false);
      setPendingProductDiscountRewards([]);
      setActiveProductDiscountReward(null);
      setProductDiscountRewardModalOpen(false);
      setClientModalOpen(true);
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
          target?.tagName === "INPUT" ||
          target?.tagName === "TEXTAREA" ||
          target?.isContentEditable;

        if (isInputElement && e.key !== "Escape") {
          return;
        }

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
              onChange={(event) => setBarcode(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter") {
                  return;
                }

                event.preventDefault();
                event.stopPropagation();

                if (event.repeat) {
                  return;
                }

                handleBarcodeSearch();
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

                  {getProductDiscountConcept(producto) &&
                    !producto.is_reward_discount_item && (
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
          onClose={handleCloseExitModal}
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