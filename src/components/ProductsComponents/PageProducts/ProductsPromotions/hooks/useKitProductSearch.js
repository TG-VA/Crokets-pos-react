import { createElement, useState, useEffect, useRef } from "react";
import { fetchActiveNonKitProducts } from "../services/productKitsService";
import { useDidChange } from "../../../../../hooks/useDidChange";
import { fetchMissingBranchesForProduct } from "../services/kitBranchCoverageService";
import BranchBadgeList from "../components/BranchBadgeList";
import { buildMissingBranchesMessage } from "../services/kitBranchCoverageCalculationService";

export const useKitProductSearch = ({
  isOpen,
  onClose,
  onSelectProduct,
  showAppAlert,
  appModalIsOpen,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [loading, setLoading] = useState(false);

  const inputRef = useRef(null);
  const resultsListRef = useRef(null);

  // Reinicio del estado al abrir el modal, resuelto durante el render para
  // evitar el re-render en cascada. El foco permanece en el efecto.
  if (useDidChange(isOpen) && isOpen) {
    setSearchTerm("");
    setResults([]);
    setSelectedIndex(-1);
    setLoading(false);
  }

  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 80);

    return () => clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !resultsListRef.current || selectedIndex < 0) return;

    const selectedItem = resultsListRef.current.querySelector(
      `[data-product-index="${selectedIndex}"]`
    );

    if (selectedItem) {
      selectedItem.scrollIntoView({
        block: "nearest",
        behavior: "auto",
      });
    }
  }, [selectedIndex, isOpen]);

  const warnMissingBranches = async (product) => {
    try {
      const missing = await fetchMissingBranchesForProduct(product.id);
      if (missing.length === 0) return;
      showAppAlert({
        type: "warning",
        title: "Producto local",
        message: buildMissingBranchesMessage(product.name),
        children: createElement(BranchBadgeList, { branches: missing }),
      });
    } catch (error) {
      console.error("Error al validar cobertura por sucursal:", error);
    }
  };

  const handleSelect = (product) => {
    if (!product) return;
    onSelectProduct(product);
    onClose();
    if (product.is_global === false) warnMissingBranches(product);
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (appModalIsOpen) return;

      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === "ArrowDown") {
        if (results.length === 0) return;
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < results.length - 1 ? prev + 1 : prev
        );
        return;
      }

      if (e.key === "ArrowUp") {
        if (results.length === 0) return;
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        return;
      }

      if (e.key === "Enter") {
        if (selectedIndex < 0 || !results[selectedIndex]) return;
        e.preventDefault();
        handleSelect(results[selectedIndex]);
      }
    };

    document.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => {
      document.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, [isOpen, results, selectedIndex, appModalIsOpen, onClose]);

  const normalizeText = (text) =>
    String(text || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

  const searchProducts = async (value) => {
    const cleanValue = value.trim();
    setSearchTerm(value);

    if (!cleanValue) {
      setResults([]);
      setSelectedIndex(-1);
      return;
    }

    try {
      setLoading(true);

      const data = await fetchActiveNonKitProducts();
      const normalized = normalizeText(cleanValue);

      const filtered = data.filter((product) => {
        const searchable = normalizeText(
          `${product.name || ""} ${product.barcode || ""}`
        );
        return searchable.includes(normalized);
      });

      setResults(filtered);
      setSelectedIndex(filtered.length > 0 ? 0 : -1);
    } catch (error) {
      console.error("Error buscando productos:", error);
      setResults([]);
      setSelectedIndex(-1);
      showAppAlert?.({
        type: "danger",
        title: "No se pudieron buscar productos",
        message: "Ocurrió un error al buscar los productos en el catálogo.",
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    searchTerm,
    results,
    selectedIndex,
    setSelectedIndex,
    loading,
    inputRef,
    resultsListRef,
    searchProducts,
    handleSelect,
  };
};
