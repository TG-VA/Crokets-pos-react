import React from "react";

import styles from "../InventorySearchModal.module.css";

const InventorySearchResults = ({
  products = [],
  selectedIndex = -1,
  searchTerm = "",
  loading = false,
  error = null,
  resultsListRef,
  isAlreadySelected,
  onProductClick,
}) => {
  if (loading) {
    return (
      <div
        className={
          styles.emptyMessage
        }
      >
        Cargando inventario...
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={
          styles.emptyMessage
        }
      >
        {error}
      </div>
    );
  }

  if (
    !Array.isArray(products) ||
    products.length === 0
  ) {
    return (
      <div
        className={
          styles.emptyMessage
        }
      >
        {searchTerm.trim()
          ? "No se encontraron productos"
          : "No hay productos para mostrar"}
      </div>
    );
  }

  return (
    <div
      className={
        styles.resultsList
      }
      ref={resultsListRef}
    >
      {products.map(
        (
          product,
          index
        ) => {
          const alreadySelected =
            isAlreadySelected?.(
              product
            ) === true;

          const itemClassName = [
            styles.resultItem,
            index ===
            selectedIndex
              ? styles.selectedResult
              : "",
            alreadySelected
              ? styles.alreadySelectedResult
              : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <div
              key={
                product?.product_id ??
                product?.id ??
                product?.codigo ??
                index
              }
              data-search-result
              className={
                itemClassName
              }
              onClick={() =>
                onProductClick?.(
                  product,
                  index
                )
              }
              role="button"
              aria-disabled={
                alreadySelected
              }
            >
              <div
                className={
                  styles.productInfo
                }
              >
                <div
                  className={
                    styles.productNameRow
                  }
                >
                  <div
                    className={
                      styles.productName
                    }
                  >
                    {product?.descripcion ??
                      product?.name ??
                      "Producto sin nombre"}
                  </div>

                  {alreadySelected && (
                    <span
                      className={
                        styles.alreadySelectedBadge
                      }
                    >
                      YA SELECCIONADO
                    </span>
                  )}
                </div>

                <div
                  className={
                    styles.productDetails
                  }
                >
                  <span
                    className={
                      styles.productCode
                    }
                  >
                    Código:{" "}
                    {product?.codigo ??
                      product?.barcode ??
                      "—"}
                  </span>

                  <span
                    className={
                      styles.productPrice
                    }
                  >
                    $
                    {Number(
                      product?.precio ??
                        product?.sale_price ??
                        0
                    ).toFixed(2)}
                  </span>

                  <span
                    className={`${styles.productStock} ${
                      Number(
                        product?.existencia ??
                          product?.stock ??
                          0
                      ) > 0
                        ? styles.inStock
                        : styles.outOfStock
                    }`}
                  >
                    Stock:{" "}
                    {product?.existencia ??
                      product?.stock ??
                      0}
                  </span>

                  <span
                    className={
                      styles.productCode
                    }
                  >
                    Dept:{" "}
                    {product?.departamento ??
                      product?.department_name ??
                      "Sin departamento"}
                  </span>
                </div>
              </div>
            </div>
          );
        }
      )}
    </div>
  );
};

export default InventorySearchResults;