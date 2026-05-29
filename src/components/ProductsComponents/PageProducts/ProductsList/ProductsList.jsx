import React, { useState, useMemo, useEffect, useRef } from "react";
import { useProducts } from "../../../../contexts/ProductsContext";
import styles from "./ProductsList.module.css";

const ProductsList = () => {
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
      products
        .map((product) => normalizeDept(product.departamento))
        .filter(Boolean)
    );
    return Array.from(uniqueDepartments).sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    return products.filter((product) => {
      const matchesSearch =
        !search ||
        (product.descripcion || "").toLowerCase().includes(search) ||
        (product.codigo || "").toLowerCase().includes(search);
      const matchesDepartment =
        !selectedDepartment ||
        normalizeDept(product.departamento) === selectedDepartment.toLowerCase();
      return matchesSearch && matchesDepartment;
    });
  }, [products, searchTerm, selectedDepartment]);

  useEffect(() => {
    setSelectedRowIndex(0);
    document.body.scrollTop = 0;
  }, [searchTerm, selectedDepartment, products.length]);

  useEffect(() => {
    const row = selectedRowRef.current;
    if (!row) return;

    const body = document.body;
    const rowRect = row.getBoundingClientRect();

    // Altura del navbar fijo + navbarProducts encima
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

  if (loadingProducts) {
    return (
      <div className={styles.content}>
        <div className={styles.toolbar}>
          <h1>LISTA DE PRODUCTOS</h1>
        </div>
        <div className={styles.resultsInfo}>
          <span className={styles.resultsCount}>Cargando productos...</span>
        </div>
      </div>
    );
  }

  if (productsError) {
    return (
      <div className={styles.content}>
        <div className={styles.toolbar}>
          <h1>LISTA DE PRODUCTOS</h1>
        </div>
        <div className={styles.noResults}>
          Error al cargar productos: {productsError}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.content}>
      <div className={styles.toolbar}>
        <h1>LISTA DE PRODUCTOS</h1>

        <div className={styles.toolbarActions}>
          <div className={styles.searchContainer}>
            <input
              type="text"
              placeholder="Buscar por nombre o código..."
              className={styles.searchInput}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => setShowDepartmentFilter(false)}
            />
            {searchTerm && (
              <button
                className={styles.clearSearchButton}
                onClick={() => setSearchTerm("")}
                title="Limpiar búsqueda"
                type="button"
              >
                ✕
              </button>
            )}
          </div>

          <div className={styles.filterContainer} ref={filterRef}>
            <button
              className={`${styles.filterButton} ${
                selectedDepartment ? styles.filterButtonActive : ""
              } ${showDepartmentFilter ? styles.filterButtonOpen : ""}`}
              onClick={() => setShowDepartmentFilter((prev) => !prev)}
              type="button"
            >
              <span className={styles.filterButtonLabel}>
                {selectedDepartment
                  ? formatDept(selectedDepartment)
                  : "Departamentos"}
              </span>
              <span className={styles.filterArrow}>▾</span>
            </button>

            {showDepartmentFilter && (
              <div className={styles.filterDropdown}>
                <div
                  className={`${styles.filterOption} ${
                    !selectedDepartment ? styles.filterOptionSelected : ""
                  }`}
                  onClick={() => handleDepartmentSelect("")}
                >
                  Todo
                </div>
                {departments.map((dept) => (
                  <div
                    key={dept}
                    className={`${styles.filterOption} ${
                      selectedDepartment === dept
                        ? styles.filterOptionSelected
                        : ""
                    }`}
                    onClick={() => handleDepartmentSelect(dept)}
                  >
                    {formatDept(dept)}
                  </div>
                ))}
              </div>
            )}
          </div>

          {(searchTerm || selectedDepartment) && (
            <button
              className={styles.clearFiltersButton}
              onClick={clearFilters}
              type="button"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      <div className={styles.resultsInfo}>
        {filteredProducts.length === 0 ? (
          <span className={styles.noResultsText}>
            No se encontraron productos
          </span>
        ) : (
          <span className={styles.resultsCount}>
            Mostrando {filteredProducts.length} de {products.length} productos
            {selectedDepartment &&
              ` en ${formatDept(selectedDepartment).toUpperCase()}`}
          </span>
        )}
      </div>

      <div className={styles.productsContainer} ref={tableContainerRef}>
        <table className={styles.productsTable}>
          <thead>
            <tr>
              <th>Código</th>
              <th>Descripción producto</th>
              <th>Departamento</th>
              <th>Costo</th>
              <th>Precio</th>
            </tr>
          </thead>

          <tbody>
            {filteredProducts.map((product, index) => (
              <tr
                key={`${product.product_id || product.id || product.codigo}-${index}`}
                ref={index === selectedRowIndex ? selectedRowRef : null}
                className={`${styles.productRow} ${
                  index === selectedRowIndex ? styles.selectedRow : ""
                }`}
                onClick={() => handleRowClick(index)}
              >
                <td>{product.codigo}</td>
                <td className={styles.descriptionCell}>
                  <span className={styles.scrollText}>
                    {product.descripcion}
                  </span>
                </td>
                <td className={styles.departmentCell}>
                  {product.departamento}
                </td>
                <td className={styles.priceCell}>
                  {formatMoney(product.costo)}
                </td>
                <td className={styles.priceCell}>
                  {formatMoney(product.precio)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredProducts.length === 0 && (
          <div className={styles.noResults}>
            No se encontraron productos que coincidan con los criterios de
            búsqueda.
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductsList;