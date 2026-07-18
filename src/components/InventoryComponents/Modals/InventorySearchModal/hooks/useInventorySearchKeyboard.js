import {
  useEffect,
} from "react";

const useInventorySearchKeyboard = ({
  isOpen = false,
  searchResults = [],
  selectedIndex = -1,
  setSelectedIndex,
  resultsListRef,
  isAlreadySelected,
  onClose,
  onSelect,
} = {}) => {
  useEffect(() => {
    if (
      selectedIndex < 0 ||
      !resultsListRef?.current
    ) {
      return;
    }

    const items =
      resultsListRef.current
        .querySelectorAll(
          "[data-search-result]"
        );

    items[
      selectedIndex
    ]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
  }, [
    resultsListRef,
    selectedIndex,
  ]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown = (
      event
    ) => {
      if (
        event.key === "Escape"
      ) {
        event.preventDefault();
        event.stopPropagation();

        onClose?.();
        return;
      }

      if (
        event.key ===
        "ArrowDown"
      ) {
        event.preventDefault();

        setSelectedIndex?.(
          (currentIndex) => {
            if (
              searchResults.length ===
              0
            ) {
              return -1;
            }

            if (
              currentIndex <
              searchResults.length -
                1
            ) {
              return (
                currentIndex + 1
              );
            }

            return currentIndex;
          }
        );

        return;
      }

      if (
        event.key === "ArrowUp"
      ) {
        event.preventDefault();

        setSelectedIndex?.(
          (currentIndex) => {
            if (
              searchResults.length ===
              0
            ) {
              return -1;
            }

            return currentIndex > 0
              ? currentIndex - 1
              : 0;
          }
        );

        return;
      }

      if (
        event.key !== "Enter"
      ) {
        return;
      }

      event.preventDefault();

      const product =
        searchResults[
          selectedIndex
        ];

      if (!product) {
        return;
      }

      if (
        isAlreadySelected?.(
          product
        )
      ) {
        return;
      }

      onSelect?.(product);
    };

    document.addEventListener(
      "keydown",
      handleKeyDown,
      true
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown,
        true
      );
    };
  }, [
    isAlreadySelected,
    isOpen,
    onClose,
    onSelect,
    searchResults,
    selectedIndex,
    setSelectedIndex,
  ]);
};

export default useInventorySearchKeyboard;