import { useEffect } from "react";

const getFocusableElements = (container) => {
  if (!container) return [];

  const elements = Array.from(
    container.querySelectorAll("input, select, textarea")
  );

  return elements.filter((element) => {
    if (!element) return false;
    if (element.disabled) return false;
    if (element.tabIndex === -1) return false;

    if (
      element.tagName === "INPUT" &&
      element.type === "hidden"
    ) {
      return false;
    }

    if (
      element.tagName === "INPUT" &&
      element.readOnly
    ) {
      return false;
    }

    return true;
  });
};

const focusAndSelectElement = (element) => {
  if (!element) return;

  element.focus();

  if (typeof element.select === "function") {
    element.select();
  }
};

const useInventoryAdjustmentKeyboard = ({
  selectedProduct,
  submitArmed,
  saving,
  bodyRef,
  quantityInputRef,
  setQuantityToAdjust,
  setAdjustmentReason,
  setAdjustmentNotes,
  setSubmitArmed,
  openSearchModal,
  handleSubmitAdjustment,
}) => {
  useEffect(() => {
    const handleGlobalKeyDown = (event) => {
      if (event.key !== "F10") return;

      event.preventDefault();

      if (saving) return;

      openSearchModal();
    };

    document.addEventListener(
      "keydown",
      handleGlobalKeyDown
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleGlobalKeyDown
      );
    };
  }, [openSearchModal, saving]);

  useEffect(() => {
    if (!submitArmed || saving) {
      return undefined;
    }

    const handleConfirmationKeyDown = (event) => {
      if (event.key !== "Enter") return;

      event.preventDefault();
      event.stopPropagation();

      setSubmitArmed(false);
      handleSubmitAdjustment();
    };

    document.addEventListener(
      "keydown",
      handleConfirmationKeyDown,
      true
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleConfirmationKeyDown,
        true
      );
    };
  }, [
    submitArmed,
    saving,
    setSubmitArmed,
    handleSubmitAdjustment,
  ]);

  useEffect(() => {
    if (!selectedProduct) {
      return undefined;
    }

    setQuantityToAdjust("");
    setAdjustmentReason("");
    setAdjustmentNotes("");
    setSubmitArmed(false);

    const animationFrameId =
      window.requestAnimationFrame(() => {
        focusAndSelectElement(
          quantityInputRef.current
        );
      });

    return () => {
      window.cancelAnimationFrame(
        animationFrameId
      );
    };
  }, [
    selectedProduct?.codigo,
    quantityInputRef,
    setQuantityToAdjust,
    setAdjustmentReason,
    setAdjustmentNotes,
    setSubmitArmed,
  ]);

  const handleContentKeyDown = (event) => {
    if (event.key !== "Enter") return;
    if (!selectedProduct) return;
    if (saving) return;
    if (event.shiftKey) return;

    if (!bodyRef.current?.contains(event.target)) {
      return;
    }

    event.preventDefault();

    const focusableElements =
      getFocusableElements(bodyRef.current);

    const activeElement = document.activeElement;

    const activeIndex =
      focusableElements.indexOf(activeElement);

    if (activeIndex === -1) return;

    const isLastElement =
      activeIndex === focusableElements.length - 1;

    if (!isLastElement) {
      setSubmitArmed(false);

      const nextElement =
        focusableElements[activeIndex + 1];

      focusAndSelectElement(nextElement);
      return;
    }

    if (!submitArmed) {
      setSubmitArmed(true);

      if (
        activeElement &&
        typeof activeElement.blur === "function"
      ) {
        activeElement.blur();
      }

      return;
    }

    setSubmitArmed(false);
    handleSubmitAdjustment();
  };

  return {
    handleContentKeyDown,
  };
};

export default useInventoryAdjustmentKeyboard;