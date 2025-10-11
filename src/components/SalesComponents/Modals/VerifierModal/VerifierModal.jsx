import React, { useState, useEffect } from "react";
import styles from "./VerifierModal.module.css";

const VerifierModal = ({ isOpen, onClose, onAddToSale }) => {
  const [barcode, setBarcode] = useState("");
  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Productos de ejemplo (esto en lo que conectamos la bd para meter bien los productos)
  const sampleProducts = {
    "1234567890": {
      codigo: "1234567890",
      nombre: "Royal canin urinary so small dog 4kg",
      precio: 1299,
      existencia: 10,
    },
    "0987654321": {
      codigo: "   ", 
      nombre: "Nupec adulto razas pequeñas 8kg",
      precio: 1135,
      existencia: 15,
    },
    "1111222233": {
      codigo: "1111222233",
      nombre: "Six barrilito",
      precio: 120,
      existencia: 5,
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        handleClose();
      } else if (e.key === "F1" && product) {
        e.preventDefault();
        e.stopPropagation();
        handleAddToSale();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown, true);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [isOpen, product]);

  const handleClose = () => {
    setBarcode("");
    setProduct(null);
    setError("");
    onClose();
  };

  const handleSearchProduct = async () => {
    if (!barcode.trim()) {
      setError("Por favor ingrese un código de barras");
      return;
    }

    setIsLoading(true);
    setError("");

    // Simular búsqueda en base de datos
    setTimeout(() => {
      const foundProduct = sampleProducts[barcode.trim()];
      
      if (foundProduct) {
        setProduct(foundProduct);
        setError("");
      } else {
        setProduct(null);
        setError("Producto no encontrado");
      }
      
      setIsLoading(false);
    }, 500);
  };

  const handleAddToSale = () => {
    if (product && onAddToSale) {
      onAddToSale({
        ...product,
        cantidad: 1,
        importe: product.precio
      });
      console.log("Producto agregado a la venta:", product);
    }
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div
        className={styles.verifierModal}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h2>Verificador de Precios</h2>
          <button
            className={styles.closeButton}
            onClick={handleClose}
          >
            ✕
          </button>
        </div>

        <div className={styles.verifierModalBody}>
          {/* Input para código de barras */}
          <div className={styles.barcodeSection}>
            <label htmlFor="barcodeInput">Código de Barras:</label>
            <div className={styles.inputContainer}>
              <input
                id="barcodeInput"
                type="text"
                className={styles.barcodeInput}
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Escanee o ingrese el código..."
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSearchProduct();
                  }
                }}
              />
              <button 
                className={styles.searchButton}
                onClick={handleSearchProduct}
                disabled={isLoading}
              >
                {isLoading ? "Buscando..." : "Buscar"}
              </button>
            </div>
          </div>

          {/* Mensaje de error */}
          {error && (
            <div className={styles.errorMessage}>
              {error}
            </div>
          )}

          {/* Información del producto */}
          {product && (
            <div className={styles.productInfo}>
              <h3>Producto Encontrado</h3>
              <div className={styles.productDetails}>
                <div className={styles.productRow}>
                  <span className={styles.label}>Código:</span>
                  <span className={styles.value}>{product.codigo}</span>
                </div>
                <div className={styles.productRow}>
                  <span className={styles.label}>Nombre:</span>
                  <span className={styles.value}>{product.nombre}</span>
                </div>
                <div className={styles.productRow}>
                  <span className={styles.label}>Descripción:</span>
                  <span className={styles.value}>{product.descripcion}</span>
                </div>
                <div className={styles.productRow}>
                  <span className={styles.label}>Precio:</span>
                  <span className={`${styles.value} ${styles.price}`}>
                    ${product.precio.toFixed(2)}
                  </span>
                </div>
                <div className={styles.productRow}>
                  <span className={styles.label}>Existencia:</span>
                  <span className={`${styles.value} ${product.existencia > 0 ? styles.inStock : styles.outOfStock}`}>
                    {product.existencia} unidades
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className={styles.modalActions}>
          <button
            className={styles.cancelButton}
            onClick={handleClose}
          >
            ESC - Cerrar
          </button>
          {product && (
            <button
              className={styles.addButton}
              onClick={handleAddToSale}
              disabled={product.existencia <= 0}
            >
              F1 - Agregar a la venta
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifierModal;