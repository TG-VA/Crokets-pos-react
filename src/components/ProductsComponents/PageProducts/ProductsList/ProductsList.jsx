import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useProducts } from '../../../../context/ProductsContext';
import styles from './ProductsList.module.css';

const ProductsList = () => {
  const { products } = useProducts();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [showDepartmentFilter, setShowDepartmentFilter] = useState(false);
  const [selectedRowIndex, setSelectedRowIndex] = useState(0);
  const tableContainerRef = useRef(null);

  const normalizeDept = (d) => (d || '').trim().toLowerCase();
  const formatDept = (d) => d.split(' ').filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const departments = useMemo(() => {
    const set = new Set(products.map(p => normalizeDept(p.departamento)).filter(Boolean));
    return Array.from(set).sort();
  }, [products]);

  // Filtrar productos basado en búsqueda y departamento
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const s = searchTerm.trim().toLowerCase();
      const matchesSearch = !s || (
        product.descripcion.toLowerCase().includes(s)
      );
      const matchesDepartment = !selectedDepartment || (
        normalizeDept(product.departamento) === selectedDepartment.toLowerCase()
      );
      return matchesSearch && matchesDepartment;
    });
  }, [searchTerm, selectedDepartment]);

  // Efecto para hacer scroll automático cuando cambia selectedRowIndex
  useEffect(() => {
    if (!tableContainerRef.current) return;
    const rows = tableContainerRef.current.querySelectorAll('tbody tr');

    if (rows[selectedRowIndex]) {
      rows[selectedRowIndex].scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest',
      });
    }
  }, [selectedRowIndex]);

  // Efectos para navegación por teclado
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedRowIndex(prev =>
          prev < filteredProducts.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedRowIndex(prev => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === 'Escape') {
        setShowDepartmentFilter(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [filteredProducts.length]);

  const filterRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!showDepartmentFilter) return;
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setShowDepartmentFilter(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDepartmentFilter]);

  // Reset selectedRowIndex cuando cambian los filtros
  useEffect(() => {
    setSelectedRowIndex(0);
  }, [searchTerm, selectedDepartment]);

  const handleDepartmentSelect = (department) => {
    setSelectedDepartment(department);
    setShowDepartmentFilter(false);
    setSelectedRowIndex(0);
  };

  const handleRowClick = (index) => {
    setSelectedRowIndex(index);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedDepartment('');
    setSelectedRowIndex(0);
  };

  return (
      <div className={styles.content}>
        {/* Barra de búsqueda y filtros */}
        <div className={styles.toolbar}>
          <h1> LISTA DE PRODUCTOS</h1>
          <div className={styles.toolbarActions}>
            <div className={styles.searchContainer}>
              <input
                type="text"
                placeholder="Buscar por nombre..."
                className={styles.searchInput}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setShowDepartmentFilter(false)}
              />
              {searchTerm && (
                <button 
                  className={styles.clearSearchButton}
                  onClick={() => setSearchTerm('')}
                  title="Limpiar búsqueda"
                >
                  ✕
                </button>
              )}
            </div>

            <div className={styles.filterContainer} ref={filterRef}>
              <button
                className={styles.filterButton}
                onClick={() => setShowDepartmentFilter(!showDepartmentFilter)}
              >
                {selectedDepartment ? formatDept(selectedDepartment) : 'Departamentos'} ▼
              </button>

              {showDepartmentFilter && (
                <div className={styles.filterDropdown}>
                  <div
                    className={styles.filterOption}
                    onClick={() => handleDepartmentSelect('')}
                  >
                    Todo
                  </div>
                  {departments.map(dept => (
                    <div
                      key={dept}
                      className={styles.filterOption}
                      onClick={() => handleDepartmentSelect(dept)}
                    >
                      {formatDept(dept)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Contador de resultados */}
        <div className={styles.resultsInfo}>
          {filteredProducts.length === 0 ? (
            <span className={styles.noResultsText}>No se encontraron productos</span>
          ) : (
            <span className={styles.resultsCount}>
              Mostrando {filteredProducts.length} de {products.length} productos
              {selectedDepartment && ` en ${selectedDepartment}`}
            </span>
          )}
        </div>

        {/* Tabla de productos */}
        <div
          className={styles.productsContainer}
          ref={tableContainerRef}
        >
          <table className={styles.productsTable}>
            <thead>
              <tr>
                <th>Código</th>
                <th>Descripción producto</th>
                <th>Departamento</th>
                <th>Costo</th>
                <th>Precio</th>
                <th>Existencia</th>
                <th>Mínimo</th>
                <th>Máximo</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product, index) => (
                <tr
                  key={product.codigo}
                  className={`${styles.productRow} ${index === selectedRowIndex ? styles.selectedRow : ''}`}
                  onClick={() => handleRowClick(index)}
                >
                  <td>{product.codigo}</td>
                  <td
                    className={styles.descriptionCell}
                    onMouseEnter={(e) => {
                      const container = e.currentTarget;
                      const content = container.querySelector(`.${styles.scrollText}`);
                      if (!content) return;
                      const distance = content.scrollWidth - container.clientWidth;
                      if (distance > 2) {
                        content.style.setProperty('--scroll-distance', `${distance + 12}px`);
                        content.classList.add(styles.marquee);
                      }
                    }}
                    onMouseLeave={(e) => {
                      const content = e.currentTarget.querySelector(`.${styles.scrollText}`);
                      if (content) {
                        content.classList.remove(styles.marquee);
                        content.style.removeProperty('--scroll-distance');
                        content.style.transform = '';
                      }
                    }}
                  >
                    <span className={styles.scrollText}>{product.descripcion}</span>
                  </td>
                  <td className={styles.departmentCell}>{product.departamento}</td>
                  <td className={styles.priceCell}>${product.costo.toFixed(2)}</td>
                  <td className={styles.priceCell}>${product.precio.toFixed(2)}</td>
                  <td className={`${styles.stockCell} ${product.existencia <= product.minimo ? styles.lowStock : styles.normalStock}`}>
                    {product.existencia}
                  </td>
                  <td>{product.minimo}</td>
                  <td>{product.maximo}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredProducts.length === 0 && (
            <div className={styles.noResults}>
              No se encontraron productos que coincidan con los criterios de búsqueda.
            </div>
          )}
        </div>
      </div>
  );
};
export default ProductsList;
