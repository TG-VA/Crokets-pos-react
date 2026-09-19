import React, { useState, useMemo, useEffect } from 'react';
import styles from '../PageProductsReport.module.css';
import { usePagination } from "../../../../../hooks/usePagination";
import PaginationBar from "../../../../../components/PaginationBar/PaginationBar";

const DeadStockTable = ({ data, isLoading }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const itemsPerPage = 50;

  const filteredData = useMemo(() => {
    if (!data) return [];
    return data.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (item.barcode && item.barcode.includes(searchTerm)) ||
      (item.departmentName && item.departmentName.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [data, searchTerm]);

  const {
    currentPage,
    totalPages,
    startIndex,
    endIndex,
    pageItems,
    resetPagination,
    handlePageChange,
  } = usePagination({
    totalItems: filteredData.length,
    defaultPageSize: itemsPerPage,
    pageSizeOptions: [itemsPerPage],
  });

  useEffect(() => {
    resetPagination();
  }, [searchTerm, resetPagination]);

  const paginatedData = pageItems(filteredData);

  if (isLoading) return <div className={styles.placeholderArea}>Cargando inventario...</div>;
  if (!data || data.length === 0) return <div className={styles.placeholderArea}>No hay inventario muerto registrado.</div>;

  return (
    <>
      <div className={styles.searchContainer}>
        <div className={styles.searchInputWrapper}>
          <input 
            type="text" 
            placeholder="Buscar por código, nombre o depto..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className={styles.clearSearchBtn}
              title="Limpiar"
            >
              x
            </button>
          )}
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.reportTable}>
          <thead>
            <tr>
              <th>Código</th>
              <th>Producto</th>
              <th>Departamento</th>
              <th style={{ textAlign: 'right' }}>Stock Actual</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((item, index) => (
              <tr key={item.id || index}>
                <td>{item.barcode || 'N/A'}</td>
                <td><strong>{item.name}</strong></td>
                <td>{item.departmentName || 'Sin departamento'}</td>
                <td style={{ textAlign: 'right', fontWeight: '600', color: '#dc2626' }}>
                  {item.stock || 0}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredData.length > 0 && (
        <PaginationBar
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredData.length}
          startIndex={startIndex}
          endIndex={endIndex}
          itemsNoun="productos"
          onPageChange={handlePageChange}
        />
      )}
    </>
  );
};

export default DeadStockTable;
