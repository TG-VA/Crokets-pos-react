import React, { useState, useMemo, useEffect, useRef } from 'react';
import styles from './ProductsList.module.css';

const ProductsList = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [showDepartmentFilter, setShowDepartmentFilter] = useState(false);
  const [selectedRowIndex, setSelectedRowIndex] = useState(0);
  const tableContainerRef = useRef(null);

  // Productos de muestra 
  const sampleProducts = [
    {
      codigo: "1234567890",
      descripcion: "Royal canin urinary so small dog 4kg",
      departamento: "royal canin",
      costo: 1100,
      precio: 1299,
      existencia: 10,
      minimo: 5,
      maximo: 25,
    },
    {
      codigo: "0987654321",
      descripcion: "Nupec adulto razas pequeñas 8kg",
      departamento: "nupec",
      costo: 950,
      precio: 1135,
      existencia: 15,
      minimo: 8,
      maximo: 30,
    },
    {
      codigo: "1111222233",
      descripcion: "Six barrilito",
      departamento: "sr.mascota",
      costo: 100,
      precio: 120,
      existencia: 5,
      minimo: 10,
      maximo: 50,
    },
    {
      codigo: "2222333344",
      descripcion: "Royal canin mini adult 2kg",
      departamento: "royal canin",
      costo: 550,
      precio: 665,
      existencia: 8,
      minimo: 6,
      maximo: 20,
    },
    {
      codigo: "3333444455",
      descripcion: "Pro plan puppy small breed 3kg",
      departamento: "pro plan",
      costo: 750,
      precio: 899,
      existencia: 12,
      minimo: 5,
      maximo: 18,
    },
    {
      codigo: "4444555566",
      descripcion: "Hills science diet adult large breed 15kg",
      departamento: "hills",
      costo: 1950,
      precio: 2299,
      existencia: 4,
      minimo: 3,
      maximo: 12,
    },
    {
      codigo: "5555666677",
      descripcion: "Whiskas adult chicken 1.5kg",
      departamento: "whiskas",
      costo: 155,
      precio: 189,
      existencia: 20,
      minimo: 15,
      maximo: 40,
    },
    {
      codigo: "6666777788",
      descripcion: "Royal canin mature large dog 13kg",
      departamento: "royal canin",
      costo: 2400,
      precio: 2899,
      existencia: 3,
      minimo: 2,
      maximo: 8,
    },
    {
      codigo: "7777888899",
      descripcion: "Nupec senior dog 15kg",
      departamento: "nupec",
      costo: 1200,
      precio: 1450,
      existencia: 6,
      minimo: 4,
      maximo: 15,
    },
    {
      codigo: "8888999900",
      descripcion: "Sr.mascota premium adult 20kg",
      departamento: "sr.mascota",
      costo: 800,
      precio: 950,
      existencia: 8,
      minimo: 5,
      maximo: 22,
    },
  ];

  // Obtener departamentos únicos
  const departments = [...new Set(sampleProducts.map(product => product.departamento))].sort();

  // Filtrar productos basado en búsqueda y departamento
  const filteredProducts = useMemo(() => {
    return sampleProducts.filter(product => {
      const s = searchTerm.trim().toLowerCase();

      const matchesSearch =
        !s ||
        product.descripcion.toLowerCase().includes(s) ||
        product.codigo.includes(s);

      const matchesDepartment =
        !selectedDepartment ||
        product.departamento === selectedDepartment;

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

  // Reset selectedRowIndex cuando cambian los filtros
  useEffect(() => {
    setSelectedRowIndex(0);
  }, [searchTerm, selectedDepartment]);

  const handleDepartmentSelect = (department) => {
    setSelectedDepartment(department);
    setShowDepartmentFilter(false);
  };

  const handleRowClick = (index) => {
    setSelectedRowIndex(index);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Lista de Productos</h1>
      </div>

      <div className={styles.content}>
        {/* Barra de búsqueda y filtros */}
        <div className={styles.toolbar}>
          <input
            type="text"
            placeholder="Buscar por nombre o código..."
            className={styles.searchInput}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <div className={styles.filterContainer}>
            <button
              className={styles.filterButton}
              onClick={() => setShowDepartmentFilter(!showDepartmentFilter)}
            >
              {selectedDepartment || 'Filtrar por Departamento'} ▼
            </button>

            {showDepartmentFilter && (
              <div className={styles.filterDropdown}>
                <div
                  className={styles.filterOption}
                  onClick={() => handleDepartmentSelect('')}
                >
                  Todos los departamentos
                </div>
                {departments.map(dept => (
                  <div
                    key={dept}
                    className={styles.filterOption}
                    onClick={() => handleDepartmentSelect(dept)}
                  >
                    {dept}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tabla de productos (scroll interno) */}
        <div
          className={styles.productsContainer}
          ref={tableContainerRef}
        >
          <table className={styles.productsTable}>
            <thead>
              <tr>
                <th>Código</th>
                <th>Descripción Producto</th>
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
                  <td className={styles.descriptionCell}>{product.descripcion}</td>
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

      {/* Indicador de navegación */}
      <div className={styles.navigationHint}>
        ↑↓ Navegar • Click para seleccionar
      </div>
    </div>
  );
};

export default ProductsList;