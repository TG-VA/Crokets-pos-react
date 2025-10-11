import React, { useState, useEffect } from "react";
import styles from "./SearchModal.module.css";

const SearchModal = ({ isOpen, onClose, onAddToSale }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // Productos de ejemplo para búsqueda
  const sampleProducts = [
    {
      codigo: "1234567890",
      nombre: "Royal canin urinary so small dog 4kg",
      precio: 1299,
      existencia: 10,
    },
    {
      codigo: "0987654321", 
      nombre: "Nupec adulto razas pequeñas 8kg",
      precio: 1135,
      existencia: 15,
    },
    {
      codigo: "1111222233",
      nombre: "Six barrilito",
      precio: 120,
      existencia: 5,
    },
    {
      codigo: "2222333344",
      nombre: "Royal canin mini adult 2kg",
      precio: 665,
      existencia: 8,
    },
    {
      codigo: "3333444455",
      nombre: "Pro plan puppy small breed 3kg",
      precio: 899,
      existencia: 12,
    },
    {
      codigo: "4444555566",
      nombre: "Hills science diet adult large breed 15kg",
      precio: 2299,
      existencia: 4,
    },
    {
      codigo: "5555666677",
      nombre: "Whiskas adult chicken 1.5kg",
      precio: 189,
      existencia: 20,
    },
    {
      codigo: "6666777788",
      nombre: "Royal canin mature large dog 13kg",
      precio: 2899,
      existencia: 3,
    }
  ];

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        handleClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < searchResults.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : 0);
      } else if (e.key === "Enter" || e.key === "F1") {
        e.preventDefault();
        if (selectedIndex >= 0 && searchResults[selectedIndex]) {
          handleSelectProduct(searchResults[selectedIndex]);
        }
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown, true);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [isOpen, searchResults, selectedIndex]);

  // Reset search when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchTerm("");
      setSearchResults([]);
      setSelectedIndex(-1);
    }
  }, [isOpen]);

  const handleClose = () => {
    setSearchTerm("");
    setSearchResults([]);
    setSelectedIndex(-1);
    onClose();
  };

  const handleSearch = (term) => {
    if (!term.trim()) {
      setSearchResults([]);
      setSelectedIndex(-1);
      return;
    }

    // Búsqueda inmediata sin loading para evitar parpadeos
    const results = performSearch(term.trim());
    setSearchResults(results);
    setSelectedIndex(results.length > 0 ? 0 : -1);
  };

  const performSearch = (term) => {
    const isPartialSearch = term.startsWith("%");
    const searchQuery = isPartialSearch ? term.substring(1) : term;

    if (isPartialSearch) {
      // Búsqueda parcial: busca cada palabra en cualquier parte del nombre
      const searchWords = searchQuery.toLowerCase().split(" ").filter(word => word.length > 0);
      
      return sampleProducts.filter(product => {
        const productName = product.nombre.toLowerCase();
        return searchWords.every(word => productName.includes(word));
      });
    } else {
      // Búsqueda exacta: busca la frase completa
      const searchLower = searchQuery.toLowerCase();
      return sampleProducts.filter(product => 
        product.nombre.toLowerCase().includes(searchLower)
      );
    }
  };

  const handleSelectProduct = (product) => {
    if (product && onAddToSale) {
      onAddToSale({
        ...product,
        cantidad: 1,
        importe: product.precio
      });
      console.log("Producto agregado desde búsqueda:", product);
    }
    handleClose();
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    handleSearch(value);
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div
        className={styles.searchModal}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h2>Búsqueda de Productos</h2>
          <button
            className={styles.closeButton}
            onClick={handleClose}
          >
            ✕
          </button>
        </div>

        <div className={styles.searchModalBody}>
          {/* Input para búsqueda */}
          <div className={styles.searchSection}>
            <label htmlFor="searchInput">Nombre del Producto:</label>
            <div className={styles.inputContainer}>
              <input
                id="searchInput"
                type="text"
                className={styles.searchInput}
                value={searchTerm}
                onChange={handleInputChange}
                placeholder="Escribe el nombre del producto...  "
                autoFocus
              />
            </div>
            <div className={styles.searchHelp}>
              <span>Escribe parte del nombre del producto (ej. “kg”, “adulto”, “pollo”)</span>
            </div>
          </div>

          {/* Resultados de búsqueda */}
          <div className={styles.resultsSection}>
            <div className={styles.resultsHeader}>
              <span>Resultados de Búsqueda:</span>
              {searchResults.length > 0 && (
                <span className={styles.resultsCount}>
                  {searchResults.length} producto(s) encontrado(s)
                </span>
              )}
            </div>

            <div className={styles.resultsContainer}>
              {searchResults.length === 0 ? (
                <div className={styles.emptyMessage}>
                  {searchTerm.trim() ? 
                    "No se encontraron productos" : 
                    "Ingresa el nombre de un producto para buscar"
                  }
                </div>
              ) : (
                <div className={styles.resultsList}>
                  {searchResults.map((product, index) => (
                    <div
                      key={product.codigo}
                      className={`${styles.resultItem} ${
                        index === selectedIndex ? styles.selectedResult : ""
                      }`}
                      onClick={() => handleSelectProduct(product)}
                    >
                      <div className={styles.productInfo}>
                        <div className={styles.productName}>
                          {product.nombre}
                        </div>
                        <div className={styles.productDetails}>
                          <span className={styles.productCode}>
                            Código: {product.codigo}
                          </span>
                          <span className={styles.productPrice}>
                            ${product.precio.toFixed(2)}
                          </span>
                          <span className={`${styles.productStock} ${
                            product.existencia > 0 ? styles.inStock : styles.outOfStock
                          }`}>
                            Stock: {product.existencia}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={styles.modalActions}>
          <div className={styles.actionButtons}>
            <button
              className={`${styles.actionButton} ${styles.addButton}`}
              onClick={() => {
                if (selectedIndex >= 0 && searchResults[selectedIndex]) {
                  handleSelectProduct(searchResults[selectedIndex]);
                }
              }}
              disabled={selectedIndex < 0 || !searchResults[selectedIndex]}
            >
              F1 - Agregar a la venta
            </button>
            <button
              className={styles.actionButton}
              onClick={() => {
                console.log('Modificar producto');
                // Funcionalidad por implementar
              }}
              disabled={selectedIndex < 0 || !searchResults[selectedIndex]}
            >
              Modificar producto
            </button>
            <button
              className={styles.actionButton}
              onClick={() => {
                console.log('Revisar Kardex');
                // Funcionalidad por implementar
              }}
              disabled={selectedIndex < 0 || !searchResults[selectedIndex]}
            >
              Revisar Kardex
            </button>
            <button
              className={`${styles.actionButton} ${styles.cancelButton}`}
              onClick={handleClose}
            >
              ESC - Cerrar
            </button>
          </div>
          <div className={styles.actionHints}>
            <span>↑↓ Navegar • Enter/F1 - Agregar a venta</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchModal;