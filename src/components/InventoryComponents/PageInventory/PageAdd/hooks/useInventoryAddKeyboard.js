import { useEffect } from "react";

const useInventoryAddKeyboard = ({
  selectedProduct,
  submitArmed,
  bodyRef,
  quantityInputRef,
  setQuantityToAdd,
  setSubmitArmed,
  openSearchModal,
  handleSubmit,
}) => {
  const getFocusableBodyElements = () => {
    if (!bodyRef.current) return [];

    const nodes = Array.from(
      bodyRef.current.querySelectorAll(
        "input, select, textarea"
      )
    );

    return nodes.filter((element) => {
      if (!element) return false;
      if (element.disabled) return false;

      if (
        element.tagName === "INPUT" &&
        element.type === "hidden"
      ) {
        return false;
      }

      if (element.tabIndex === -1) return false;

      if (
        element.tagName === "INPUT" &&
        element.readOnly
      ) {
        return false;
      }

      return true;
    });
  };

  const handleContentKeyDown = (event) => {
    if (event.key !== "Enter") return;
    if (!selectedProduct) return;
    if (event.shiftKey) return;
    if (!bodyRef.current?.contains(event.target)) return;

    event.preventDefault();

    const focusableElements =
      getFocusableBodyElements();

    const activeElement = document.activeElement;

    const activeIndex =
      focusableElements.indexOf(activeElement);

    if (activeIndex === -1) return;

    if (activeIndex < focusableElements.length - 1) {
      setSubmitArmed(false);

      const nextElement =
        focusableElements[activeIndex + 1];

      nextElement.focus();

      if (typeof nextElement.select === "function") {
        nextElement.select();
      }

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
    handleSubmit();
  };

  useEffect(() => {
    const handleGlobalKeyDown = (event) => {
      if (event.key !== "F10") return;

      event.preventDefault();
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
  }, [openSearchModal]);

  useEffect(() => {
    if (!submitArmed) return undefined;

    const handleConfirmKeyDown = (event) => {
      if (event.key !== "Enter") return;

      event.preventDefault();
      event.stopPropagation();

      setSubmitArmed(false);
      handleSubmit();
    };

    document.addEventListener(
      "keydown",
      handleConfirmKeyDown,
      true
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleConfirmKeyDown,
        true
      );
    };
  }, [
    submitArmed,
    setSubmitArmed,
    handleSubmit,
  ]);

  useEffect(() => {
    if (!selectedProduct) return undefined;

    setQuantityToAdd("");
    setSubmitArmed(false);

    const animationFrameId =
      window.requestAnimationFrame(() => {
        quantityInputRef.current?.focus();

        if (
          typeof quantityInputRef.current?.select ===
          "function"
        ) {
          quantityInputRef.current.select();
        }
      });

    return () => {
      window.cancelAnimationFrame(
        animationFrameId
      );
    };
  }, [
    selectedProduct?.codigo,
    quantityInputRef,
    setQuantityToAdd,
    setSubmitArmed,
  ]);

  return {
    handleContentKeyDown,
  };
};

export default useInventoryAddKeyboard;