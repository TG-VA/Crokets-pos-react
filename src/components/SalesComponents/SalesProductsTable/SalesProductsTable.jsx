import React from "react";

import styles from "../../../pages/Sales/Sales.module.css";

import {
  getCartItemKey,
  isSameCartItem,
} from "../utils/salesCartUtils";

const getProductDiscountPercent = (producto) => {
  if (!producto) {
    return 0;
  }

  const directPercent = Number(
    producto.discountPercent || 0,
  );

  if (directPercent > 0) {
    return directPercent;
  }

  const discountValue = Number(
    producto.descuentoValor || 0,
  );

  if (
    producto.descuentoTipo === "percent" &&
    discountValue > 0
  ) {
    return discountValue;
  }

  const originalPrice = Number(
    producto.precioOriginal ??
      producto.precio ??
      0,
  );

  const finalPrice = Number(
    producto.precio || 0,
  );

  if (
    originalPrice <= 0 ||
    finalPrice >= originalPrice
  ) {
    return 0;
  }

  return (
    ((originalPrice - finalPrice) /
      originalPrice) *
    100
  );
};

const getProductHasDiscount = (producto) => {
  if (!producto) {
    return false;
  }

  return (
    Number(
      producto.descuentoMonto || 0,
    ) > 0 ||
    getProductDiscountPercent(
      producto,
    ) > 0
  );
};

const getProductDiscountConcept = (
  producto,
) => {
  const concept = String(
    producto?.discountConcept || "",
  ).trim();

  if (concept) {
    return concept;
  }

  if (
    producto?.is_reward_discount_item
  ) {
    return "DESCUENTO POR RECOMPENSA";
  }

  return "";
};

const SalesProductsTable = ({
  productos = [],
  selectedProduct = null,
  onProductSelect,
  tableRef,
  gridTemplate,
  onColumnResizeStart,
}) => {
  const handleProductSelect = (
    producto,
  ) => {
    if (
      typeof onProductSelect ===
      "function"
    ) {
      onProductSelect(producto);
    }
  };

  const handleColumnResizeStart = (
    event,
    columnIndex,
  ) => {
    if (
      typeof onColumnResizeStart ===
      "function"
    ) {
      onColumnResizeStart(
        event,
        columnIndex,
      );
    }
  };

  return (
    <div
      className={styles.productsTable}
      ref={tableRef}
    >
      <div
        className={styles.tableHeader}
        style={{
          gridTemplateColumns:
            gridTemplate,
        }}
      >
        <span>
          Producto

          <div
            className={
              styles.resizeHandle
            }
            onMouseDown={(event) =>
              handleColumnResizeStart(
                event,
                0,
              )
            }
          />
        </span>

        <span>
          Precio Venta

          <div
            className={
              styles.resizeHandle
            }
            onMouseDown={(event) =>
              handleColumnResizeStart(
                event,
                1,
              )
            }
          />
        </span>

        <span>
          Cant.

          <div
            className={
              styles.resizeHandle
            }
            onMouseDown={(event) =>
              handleColumnResizeStart(
                event,
                2,
              )
            }
          />
        </span>

        <span>
          Importe

          <div
            className={
              styles.resizeHandle
            }
            onMouseDown={(event) =>
              handleColumnResizeStart(
                event,
                3,
              )
            }
          />
        </span>

        <span>Existencia</span>
      </div>

      <div
        className={styles.tableBody}
      >
        {productos.map((producto) => {
          const hasDiscount =
            getProductHasDiscount(
              producto,
            );

          const discountPercent =
            getProductDiscountPercent(
              producto,
            );

          const discountConcept =
            getProductDiscountConcept(
              producto,
            );

          const isSelected =
            selectedProduct &&
            isSameCartItem(
              selectedProduct,
              producto,
            );

          return (
            <div
              key={getCartItemKey(
                producto,
              )}
              className={`${
                styles.tableRow
              } ${
                producto.is_reward_item
                  ? styles.rewardRow
                  : ""
              } ${
                producto.is_reward_discount_item
                  ? styles.rewardDiscountRow
                  : ""
              } ${
                hasDiscount &&
                !producto.is_reward_item
                  ? styles.discountAppliedRow
                  : ""
              } ${
                isSelected
                  ? styles.selectedRow
                  : ""
              }`}
              style={{
                gridTemplateColumns:
                  gridTemplate,
              }}
              onClick={() =>
                handleProductSelect(
                  producto,
                )
              }
            >
              <span
                className={`${styles.tableCell} ${styles.productCell}`}
              >
                <span
                  className={
                    styles.productNameText
                  }
                >
                  {producto.nombre ||
                    producto.codigo}
                </span>

                {producto.is_reward_item && (
                  <span
                    className={
                      styles.rewardBadge
                    }
                  >
                    Recompensa
                  </span>
                )}

                {hasDiscount &&
                  !producto.is_reward_item && (
                    <span
                      className={
                        styles.productDiscountBadge
                      }
                    >
                      DESC.{" "}
                      {discountPercent.toFixed(
                        2,
                      )}
                      %
                    </span>
                  )}

                {discountConcept &&
                  !producto.is_reward_discount_item && (
                    <span
                      className={
                        styles.productDiscountConcept
                      }
                    >
                      {discountConcept}
                    </span>
                  )}

                {producto.is_reward_discount_item && (
                  <span
                    className={
                      styles.rewardDiscountBadge
                    }
                  >
                    Descuento recompensa
                  </span>
                )}
              </span>

              <span
                className={
                  styles.tableCell
                }
              >
                $
                {Number(
                  producto.precio || 0,
                ).toFixed(2)}
              </span>

              <span
                className={
                  styles.tableCell
                }
              >
                {producto.cantidad}
              </span>

              <span
                className={
                  styles.tableCell
                }
              >
                $
                {Number(
                  producto.importe || 0,
                ).toFixed(2)}
              </span>

              <span
                className={
                  styles.tableCell
                }
              >
                {producto.existencia}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SalesProductsTable;