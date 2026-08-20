import React from 'react';
import styles from '../PageProductsReport.module.css'; 
import { formatCurrency } from "../../../../../utils/formatters";

const DepartmentPerformance = ({ data, isLoading }) => {
  if (isLoading) return <div className={styles.placeholderArea}>Cargando departamentos...</div>;
  if (!data || data.length === 0) return <div className={styles.placeholderArea}>No hay registros.</div>;

  return (
    <>
      <div className={styles.tableContainer}>
        <table className={styles.reportTable}>
          <thead>
            <tr>
              <th>Departamento</th>
              <th style={{ textAlign: 'right' }}>Unidades Vendidas</th>
              <th style={{ textAlign: 'right' }}>Ingreso Generado</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr key={item.name || index}>
                <td><strong>{item.name || 'Sin departamento'}</strong></td>
                <td style={{ textAlign: 'right' }}>{item.quantity || 0}</td>
                <td style={{ textAlign: 'right' }}>{formatCurrency(item.revenue || 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ textAlign: 'right', marginTop: '8px', fontSize: '0.8rem', color: '#64748b' }}>
        Mostrando {data.length} departamento(s)
      </div>
    </>
  );
};

export default DepartmentPerformance;