import { useState, useEffect, useRef } from "react";
import { fetchActiveNonKitProducts } from "../services/productKitsService";

export const useKitProductSearch = ({ isOpen, onClose, onSelectProduct, showAppAlert, appModalIsOpen }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [loading, setLoading] = useState(false);

  const inputRef = useRef(null);
  const resultsListRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    setSearchTerm("");
    setResults([]);
    setSelectedIndex(-1);
    setLoading(false);

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
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
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
        const searchable = normalizeText(`${product.name || ""} ${product.barcode || ""}`);
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

  const handleSelect = (product) => {
    if (!product) return;
    onSelectProduct(product);
    onClose();
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