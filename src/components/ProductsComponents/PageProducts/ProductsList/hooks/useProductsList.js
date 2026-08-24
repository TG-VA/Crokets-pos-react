import { useState, useMemo, useEffect, useRef } from "react";
import { useProducts } from "../../../../../contexts/ProductsContext";

export const useProductsList = () => {
  const { products, loadingProducts, productsError } = useProducts();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [showDepartmentFilter, setShowDepartmentFilter] = useState(false);
  const [selectedRowIndex, setSelectedRowIndex] = useState(0);

  const tableContainerRef = useRef(null);
  const filterRef = useRef(null);
  const selectedRowRef = useRef(null);

  const normalizeDept = (dept) => (dept || "").trim().toLowerCase();

  const formatDept = (dept) =>
    (dept || "")
      .split(" ")
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

  const departments = useMemo(() => {
    const uniqueDepartments = new Set(
      (products || [])
        .map((product) => normalizeDept(product.departamento))
        .filter(Boolean)
    );
    return Array.from(uniqueDepartments).sort();
  }, [products]);

  const productUsesInventory = (product) => {
    return product.use_inventory === true || product.tracks_inventory === true;
  };

  const filteredProducts = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return [...(products || [])]
      .filter((product) => {
        const matchesSearch =
          !search ||
          (product.descripcion || "").toLowerCase().includes(search) ||
          (product.codigo || "").toLowerCase().includes(search);

        const matchesDepartment =
          !selectedDepartment ||
          normalizeDept(product.departamento) ===
            selectedDepartment.toLowerCase();

        return matchesSearch && matchesDepartment;
      })
      .sort((a, b) => {
        const aUsesInventory = productUsesInventory(a);
        const bUsesInventory = productUsesInventory(b);

        if (aUsesInventory !== bUsesInventory) {
          return aUsesInventory ? -1 : 1;
        }

        const descriptionA = String(a.descripcion || "");
        const descriptionB = String(b.descripcion || "");

        return descriptionA.localeCompare(descriptionB, "es", {
          sensitivity: "base",
          numeric: true,
        });
      });
  }, [products, searchTerm, selectedDepartment]);

  useEffect(() => {
    setSelectedRowIndex(0);
    document.body.scrollTop = 0;
  }, [searchTerm, selectedDepartment, products?.length]);

  useEffect(() => {
    const row = selectedRowRef.current;
    if (!row) return;

    const body = document.body;
    const rowRect = row.getBoundingClientRect();

    const topOffset = 450;

    if (rowRect.top < topOffset) {
      body.scrollTop = body.scrollTop + rowRect.top - topOffset;
    } else if (rowRect.bottom > window.innerHeight) {
      body.scrollTop = body.scrollTop + rowRect.bottom - window.innerHeight + 30;
    }
  }, [selectedRowIndex]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!filteredProducts.length) return;

      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        if (e.key === "Escape") setShowDepartmentFilter(false);
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedRowIndex((prev) =>
          prev < filteredProducts.length - 1 ? prev + 1 : prev
        );
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedRowIndex((prev) => (prev > 0 ? prev - 1 : 0));
      }

      if (e.key === "Escape") {
        setShowDepartmentFilter(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [filteredProducts.length]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!showDepartmentFilter) return;
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setShowDepartmentFilter(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showDepartmentFilter]);

  const handleDepartmentSelect = (department) => {
    setSelectedDepartment(department);
    setShowDepartmentFilter(false);
    setSelectedRowIndex(0);
  };

  const handleRowClick = (index) => {
    setSelectedRowIndex(index);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedDepartment("");
    setSelectedRowIndex(0);
    setShowDepartmentFilter(false);
  };

  const formatMoney = (value) => {
    const amount = Number(value || 0);
    return `$${amount.toFixed(2)}`;
  };

  return {
    products,
    loadingProducts,
    productsError,
    searchTerm,
    setSearchTerm,
    selectedDepartment,
    showDepartmentFilter,
    setShowDepartmentFilter,
    selectedRowIndex,
    tableContainerRef,
    filterRef,
    selectedRowRef,
    departments,
    filteredProducts,
    formatDept,
    handleDepartmentSelect,
    handleRowClick,
    clearFilters,
    formatMoney,
  };
};