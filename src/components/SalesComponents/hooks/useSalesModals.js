import { useState, useCallback } from "react";

const useSalesModals = () => {
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
  const [isDeleteItemModalOpen, setDeleteItemModalOpen] = useState(false);
  const [isSalesHistoryModalOpen, setSalesHistoryModalOpen] = useState(false);
  const [saleSuccessData, setSaleSuccessData] = useState(null);
  
  const [isRewardProductModalOpen, setRewardProductModalOpen] = useState(false);
  const [isProductDiscountRewardModalOpen, setProductDiscountRewardModalOpen] = useState(false);

  const handleCloseExitModal = useCallback(() => {
    setExitModalOpen(false);
  }, []);

  const handleExitAuthorized = useCallback(() => {
    setExitAuthModalOpen(false);
    setExitModalOpen(true);
  }, []);

  const handleCloseExitAuth = useCallback(() => {
    setExitAuthModalOpen(false);
  }, []);

  return {
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
  };
};

export default useSalesModals;