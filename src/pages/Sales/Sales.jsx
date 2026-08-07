import React, { useState, useRef, useCallback, useEffect } from "react";
import styles from "../../pages/Sales/Sales.module.css";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../contexts/AuthContext";
import { useBranch } from "../../contexts/BranchContext";
import { checkUserIsAdmin } from "../../lib/permissionsService";

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

// Importar Hooks
import useSalesAppModal from "../../components/SalesComponents/hooks/useSalesAppModal";
import useSalesModals from "../../components/SalesComponents/hooks/useSalesModals";
import useSalesStateActions from "../../components/SalesComponents/hooks/useSalesStateActions";
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

// Importar Componentes de UI extraídos
import SalesHeader from "../../components/SalesComponents/SalesHeader/SalesHeader";
import SalesProductsTable from "../../components/SalesComponents/SalesProductsTable/SalesProductsTable";
import SalesTopActions from "../../components/SalesComponents/SalesTopActions/SalesTopActions";
import SalesFooterActions from "../../components/SalesComponents/SalesFooterActions/SalesFooterActions";
import SalesProductInput from "../../components/SalesComponents/SalesProductInput/SalesProductInput";

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

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [pendingFreeProductRewards, setPendingFreeProductRewards] = useState([]);
  const [pendingProductDiscountRewards, setPendingProductDiscountRewards] = useState([]);
  const [activeProductDiscountReward, setActiveProductDiscountReward] = useState(null);

  const [cashMovements, setCashMovements] = useState([]);
  const [currentSaleClient, setCurrentSaleClient] = useState(null);
  const [currentSaleReward, setCurrentSaleReward] = useState(null);
  const [processingSale, setProcessingSale] = useState(false);

  // --- HOOKS DE ESTADO DE UI ---
  const {
    appModal,
    closeAppModal,
    showAppModal,
    showAppWarning,
    showAppSuccess,
  } = useSalesAppModal();

  const {
    isExitModalOpen, setExitModalOpen, handleCloseExitModal,
    isExitAuthModalOpen, setExitAuthModalOpen, handleExitAuthorized, handleCloseExitAuth,
    isEntryModalOpen, setEntryModalOpen,
    showPaymentModal, setShowPaymentModal,
    isClientModalOpen, setClientModalOpen,
    isVerifierModalOpen, setVerifierModalOpen,
    isSearchModalOpen, setSearchModalOpen,
    isDiscountModalOpen, setDiscountModalOpen,
    isPendingModalOpen, setPendingModalOpen,
    isChangeModalOpen, setChangeModalOpen,
    isDeleteModalOpen, setDeleteModalOpen,
    isDeleteItemModalOpen, setDeleteItemModalOpen,
    isSalesHistoryModalOpen, setSalesHistoryModalOpen,
    saleSuccessData, setSaleSuccessData,
    isRewardProductModalOpen, setRewardProductModalOpen,
    isProductDiscountRewardModalOpen, setProductDiscountRewardModalOpen,
  } = useSalesModals();

  const [productos, setProductos] = useState([]);
  const [stockWarningMsg, setStockWarningMsg] = useState("");
  const productosRef = useRef([]);

  const {
    tableRef,
    gridTemplate,
    handleMouseDown,
  } = useSalesTableColumns();

  // --- HOOK DE ACCIONES Y TOTALES ---
  const {
    subtotal,
    discountTotal,
    total,
    restoreSalesDraft,
    discardSalesDraftState,
    openSalesDraftRecoveryModal,
    resetCurrentSale,
  } = useSalesStateActions({
    productos,
    setProductos,
    productosRef,
    setSelectedProduct,
    setCurrentSaleClient,
    setCurrentSaleReward,
    setTicketNumber,
    setSaleToken,
    setSaleNotes,
    setBarcode,
    setPendingTickets,
    setPendingFreeProductRewards,
    setRewardProductModalOpen,
    setPendingProductDiscountRewards,
    setActiveProductDiscountReward,
    setProductDiscountRewardModalOpen,
    setStockWarningMsg,
    showAppModal,
    closeAppModal,
  });

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
  }, [shiftAlreadyCut, user?.id, showAppWarning, setExitModalOpen, setExitAuthModalOpen]);

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
      <SalesHeader
        ticketNumber={ticketNumber}
        currentSaleClient={currentSaleClient}
        currentSaleRewards={currentSaleRewards}
        currentSaleRewardsLabel={currentSaleRewardsLabel}
        shiftAlreadyCut={shiftAlreadyCut}
        stockWarningMsg={stockWarningMsg}
      />

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

      <SalesProductInput
        barcode={barcode}
        setBarcode={setBarcode}
        shiftAlreadyCut={shiftAlreadyCut}
        onAddProduct={handleBarcodeSearch}
      />

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