import { useState, useEffect, useMemo, useRef } from "react";
import styles from "../ProductsSearchModal/ProductsSearchModal.module.css";
import { useDidChange } from "../../../../hooks/useDidChange";

export const useProductSearchModal = ({ isOpen, onClose, products, onSelect }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const resultsListRef = useRef(null);

  const getProductName = (product) => {
    return String(
      product?.descripcion ||
      product?.nombre ||
      product?.name ||
      ""
    ).trim();
  };

  const searchResults = useMemo(() => {
    const term = (searchTerm || "").trim().toLowerCase();

    if (!term) return [];

    return (products || [])
      .filter((p) => {
        const code = (p?.codigo ?? "").toString().toLowerCase();
        const desc = (p?.descripcion ?? "").toString().toLowerCase();
        const dept = (p?.departamento ?? "").toString().toLowerCase();

        return (
          code.includes(term) ||
          desc.includes(term) ||
          dept.includes(term)
        );
      })
      .sort((a, b) => {
        const nameA = getProductName(a);
        const nameB = getProductName(b);

        return nameA.localeCompare(nameB, "es", {
          sensitivity: "base",
          numeric: true,
        });
      });
  }, [products, searchTerm]);

  // La seleccion se recalcula cuando cambia el termino o el numero de
  // resultados, igual que antes, pero durante el render en lugar de desde un
  // efecto. Dos observadores preservan exactamente las dependencias anteriores
  // ([searchTerm, searchResults.length]).
  const searchTermChanged = useDidChange(searchTerm);
  const resultsCountChanged = useDidChange(searchResults.length);
  if (searchTermChanged || resultsCountChanged) {
    if (!searchTerm.trim() || searchResults.length === 0) {
      setSelectedIndex(-1);
    } else {
      setSelectedIndex(0);
    }
  }

  useEffect(() => {
    if (selectedIndex >= 0 && resultsListRef.current) {
      const container = resultsListRef.current;
      const items = container.querySelectorAll(`.${styles.resultItem}`);

      if (items[selectedIndex]) {
        items[selectedIndex].scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "nearest",
        });
      }
    }
  }, [selectedIndex]);

  const handleClose = () => {
    setSearchTerm("");
    setSelectedIndex(-1);
    onClose?.();
  };

  const handleSelectProduct = (product) => {
    onSelect?.(product);
    handleClose();
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        handleClose();
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < searchResults.length - 1 ? prev + 1 : prev
        );
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();

        if (selectedIndex >= 0 && searchResults[selectedIndex]) {
          handleSelectProduct(searchResults[selectedIndex]);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [isOpen, searchResults, selectedIndex]);

  if (useDidChange(isOpen) && isOpen) {
    setSearchTerm("");
    setSelectedIndex(-1);
  }

  return {
    searchTerm,
    setSearchTerm,
    selectedIndex,
    searchResults,
    resultsListRef,
    handleClose,
    handleSelectProduct,
  };
};
