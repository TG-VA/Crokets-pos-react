import { useEffect } from "react";

import {
  isSameCartItem,
} from "../utils/salesCartUtils";

const useSalesKeyboardShortcuts = ({
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
}) => {
  useEffect(() => {
    const handleKeyDown = (event) => {
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
        Boolean(saleSuccessData);

      const target = event.target;

      const isInputElement =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if (
        isInputElement &&
        event.key !== "Escape"
      ) {
        return;
      }

      if (
        (event.key === "ArrowDown" ||
          event.key === "ArrowUp") &&
        !isAnyModalOpen
      ) {
        event.preventDefault();

        if (productos.length === 0) {
          return;
        }

        if (!selectedProduct) {
          setSelectedProduct(
            productos[0],
          );

          return;
        }

        const currentIndex =
          productos.findIndex(
            (product) =>
              isSameCartItem(
                product,
                selectedProduct,
              ),
          );

        if (event.key === "ArrowDown") {
          const nextIndex =
            (currentIndex + 1) %
            productos.length;

          setSelectedProduct(
            productos[nextIndex],
          );
        } else {
          const previousIndex =
            currentIndex === 0
              ? productos.length - 1
              : currentIndex - 1;

          setSelectedProduct(
            productos[previousIndex],
          );
        }

        return;
      }

      if (
        event.ctrlKey &&
        event.key.toLowerCase() === "d"
      ) {
        event.preventDefault();
        handleOpenDiscountModal();
        return;
      }

      if (
        !isAnyModalOpen &&
        selectedProduct &&
        !isInputElement
      ) {
        if (
          event.key === "+" ||
          event.key === "=" ||
          event.key === "Add"
        ) {
          event.preventDefault();
          increaseSelectedProductQuantity();
          return;
        }

        if (
          event.key === "-" ||
          event.key === "Subtract"
        ) {
          event.preventDefault();
          decreaseSelectedProductQuantity();
          return;
        }
      }

      switch (event.key) {
        case "F12":
          event.preventDefault();
          openPaymentFlow();
          break;

        case "F5":
          event.preventDefault();
          handleOpenChangeModal();
          break;

        case "F6":
          event.preventDefault();
          setPendingModalOpen(true);
          break;

        case "F7":
          event.preventDefault();

          if (shiftAlreadyCut) {
            showAppWarning(
              "El turno ya fue cortado. Debes cerrar turno antes de hacer movimientos.",
            );
          } else {
            setEntryModalOpen(true);
          }

          break;

        case "F8":
          event.preventDefault();
          openExitFlow();
          break;

        case "F9":
          event.preventDefault();
          setVerifierModalOpen(true);
          break;

        case "F10":
          event.preventDefault();
          setSearchModalOpen(true);
          break;

        case "Backspace":
          if (isInputElement) {
            return;
          }

          if (!isAnyModalOpen) {
            event.preventDefault();

            if (selectedProduct) {
              setDeleteItemModalOpen(
                true,
              );
            } else {
              showAppWarning(
                "Por favor, selecciona un producto primero",
              );
            }
          }

          break;

        case "Delete":
          event.preventDefault();
          handleOpenDeleteModal();
          break;

        case "Escape":
          if (processingSale) {
            return;
          }

          if (showPaymentModal) {
            setShowPaymentModal(false);
          } else if (isEntryModalOpen) {
            setEntryModalOpen(false);
          } else if (isExitModalOpen) {
            setExitModalOpen(false);
          } else if (isExitAuthModalOpen) {
            setExitAuthModalOpen(false);
          } else if (isClientModalOpen) {
            setClientModalOpen(false);
          } else if (
            isRewardProductModalOpen
          ) {
            handleCloseRewardProductModal();
          } else if (
            isProductDiscountRewardModalOpen
          ) {
            handleCloseProductDiscountRewardModal();
          } else if (isVerifierModalOpen) {
            setVerifierModalOpen(false);
          } else if (isSearchModalOpen) {
            setSearchModalOpen(false);
          } else if (isDiscountModalOpen) {
            setDiscountModalOpen(false);
          } else if (isPendingModalOpen) {
            setPendingModalOpen(false);
          } else if (isChangeModalOpen) {
            setChangeModalOpen(false);
          } else if (isDeleteModalOpen) {
            setDeleteModalOpen(false);
          } else if (
            isDeleteItemModalOpen
          ) {
            setDeleteItemModalOpen(false);
          } else if (saleSuccessData) {
            setSaleSuccessData(null);
          } else if (
            isSalesHistoryModalOpen
          ) {
            setSalesHistoryModalOpen(
              false,
            );
          }

          break;

        default:
          break;
      }
    };

    document.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [
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
  ]);
};

export default useSalesKeyboardShortcuts;