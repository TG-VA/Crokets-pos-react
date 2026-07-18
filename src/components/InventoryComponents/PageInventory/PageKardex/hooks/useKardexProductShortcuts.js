import {
  useEffect,
} from "react";

const useKardexProductShortcuts = ({
  onOpenProductSearch,
  enabled = true,
} = {}) => {
  useEffect(() => {
    if (
      !enabled ||
      typeof onOpenProductSearch !==
        "function"
    ) {
      return undefined;
    }

    const handleKeyDown = (
      event
    ) => {
      if (
        event.key !== "F10"
      ) {
        return;
      }

      event.preventDefault();

      onOpenProductSearch();
    };

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [
    enabled,
    onOpenProductSearch,
  ]);
};

export default useKardexProductShortcuts;