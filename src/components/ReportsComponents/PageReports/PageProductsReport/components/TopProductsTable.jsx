import React, { useState, useMemo, useEffect } from 'react';
import styles from '../PageProductsReport.module.css';
import { formatCurrency } from "../../../../../utils/formatters";

const TopProductsTable = ({ data, isLoading }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const filteredData = useMemo(() => {
    if (!data) return [];
    return data.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (item.barcode && item.barcode.includes(searchTerm))
    );
  }, [data, searchTerm]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (isLoading) return <div className={styles.placeholderArea}>Cargando productos...</div>;
  if (!data || data.length === 0) return <div className={styles.placeholderArea}>No hay registros.</div>;

  return (
    <>
      <div className={styles.searchContainer}>
        <div className={styles.searchInputWrapper}>
          <input 
            type="text" 
            placeholder="Buscar por código o nombre..." 
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
              <th style={{ textAlign: 'right' }}>Unidades</th>
              <th style={{ textAlign: 'right' }}>Ingreso</th>
              <th style={{ textAlign: 'right', color: '#0284c7' }}>Stock Actual</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((item, index) => (
              <tr key={item.id || index}>
                <td>{item.barcode || 'N/A'}</td>
                <td><strong>{item.name}</strong></td>
                <td style={{ textAlign: 'right', fontWeight: '600' }}>{item.quantity || 0}</td>
                <td style={{ textAlign: 'right' }}>{formatCurrency(item.revenue || 0)}</td>
                <td style={{ textAlign: 'right', color: '#0284c7', fontWeight: 'bold' }}>
                  {item.stock || 0}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', fontSize: '0.875rem' }}>
        <span style={{ color: '#64748b' }}>
          Mostrando {paginatedData.length} de {filteredData.length} productos
        </span>
        
        {totalPages > 1 && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{ padding: '4px 12px', borderRadius: '4px', border: '1px solid #cbd5e1', background: currentPage === 1 ? '#f1f5f9' : '#ffffff', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', color: '#334155' }}
            >
              Anterior
            </button>
            <span style={{ color: '#475569', fontWeight: '500' }}>
              Página {currentPage} de {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              style={{ padding: '4px 12px', borderRadius: '4px', border: '1px solid #cbd5e1', background: currentPage === totalPages ? '#f1f5f9' : '#ffffff', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', color: '#334155' }}
            >
              Siguiente
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default TopProductsTable;