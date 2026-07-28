import React, { useState, useRef, useCallback, useEffect } from "react";
  import styles from "../../pages/Sales/Sales.module.css";
  import { supabase } from "../../lib/supabaseClient";
  import { useAuth } from "../../contexts/AuthContext";
  import { useBranch } from "../../contexts/BranchContext";
  import { checkUserIsAdmin } from "../../lib/permissionsService";

  // Importar iconos

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
  import useSalesProductSearch from "../../components/SalesComponents/hooks/useSalesProductSearch";
  import useSalesKeyboardShortcuts from "../../components/SalesComponents/hooks/useSalesKeyboardShortcuts";
  import SalesProductsTable from "../../components/SalesComponents/SalesProductsTable/SalesProductsTable";
  import SalesTopActions from "../../components/SalesComponents/SalesTopActions/SalesTopActions";
  import SalesFooterActions from "../../components/SalesComponents/SalesFooterActions/SalesFooterActions";

  import {
    getBranchInventoryRow as getBranchInventoryRowFromService,
  } from "../../components/SalesComponents/services/salesInventoryService";

  import {
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

    const {
      handleBarcodeSearch,
      handleAddProductFromVerifier,
    } = useSalesProductSearch({
      barcode,
      setBarcode,
      branchId: branch?.id,
      shiftAlreadyCut,
      addProductToCart,
      showAppWarning,
    });

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

    useSalesKeyboardShortcuts({
      productos,
      selectedProduct,
      setSelectedProduct,

      processingSale,
      shiftAlreadyCut,

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

      setShowPaymentModal,
      setEntryModalOpen,
      setExitModalOpen,
      setExitAuthModalOpen,
      setClientModalOpen,
      setVerifierModalOpen,
      setSearchModalOpen,
      setDiscountModalOpen,
      setPendingModalOpen,
      setChangeModalOpen,
      setDeleteModalOpen,
      setDeleteItemModalOpen,
      setSalesHistoryModalOpen,
      setSaleSuccessData,

      openPaymentFlow,
      handleOpenChangeModal,
      handleOpenDeleteModal,
      handleOpenDiscountModal,
      handleCloseRewardProductModal,
      handleCloseProductDiscountRewardModal,
      increaseSelectedProductQuantity,
      decreaseSelectedProductQuantity,
      openExitFlow,
      showAppWarning,
    });

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

        <SalesTopActions
          shiftAlreadyCut={shiftAlreadyCut}
          selectedProduct={selectedProduct}
          onOpenSearch={() => setSearchModalOpen(true)}
          onOpenEntry={() => setEntryModalOpen(true)}
          onOpenExit={openExitFlow}
          onOpenDeleteItem={() => setDeleteItemModalOpen(true)}
          onOpenVerifier={() => setVerifierModalOpen(true)}
          showAppWarning={showAppWarning}
        />

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

        <SalesProductsTable
          productos={productos}
          selectedProduct={selectedProduct}
          onProductSelect={handleProductSelect}
          tableRef={tableRef}
          gridTemplate={gridTemplate}
          onColumnResizeStart={handleMouseDown}
        />

        <SalesFooterActions
          subtotal={subtotal}
          discountTotal={discountTotal}
          total={total}
          shiftAlreadyCut={shiftAlreadyCut}
          onOpenChange={handleOpenChangeModal}
          onOpenPending={() => setPendingModalOpen(true)}
          onOpenDelete={handleOpenDeleteModal}
          onOpenDiscount={handleOpenDiscountModal}
          onOpenClient={openClientModal}
          onOpenHistory={() => setSalesHistoryModalOpen(true)}
          onPay={openPaymentFlow}
        />

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