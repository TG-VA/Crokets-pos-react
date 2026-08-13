import React, { memo } from "react";
import styles from "../../../pages/Sales/Sales.module.css";
import { getCartItemKey, isSameCartItem } from "../utils/salesCartUtils";

const getProductDiscountPercent = (producto) => {
  if (!producto) return 0;
  
  if (Number(producto.discountPercent || 0) > 0) return Number(producto.discountPercent);
  if (producto.descuentoTipo === "percent" && Number(producto.descuentoValor || 0) > 0) return Number(producto.descuentoValor);

  const originalPrice = Number(producto.precioOriginal ?? producto.precio ?? 0);
  const finalPrice = Number(producto.precio || 0);

  if (originalPrice <= 0 || finalPrice >= originalPrice) return 0;
  return ((originalPrice - finalPrice) / originalPrice) * 100;
};

const getProductHasDiscount = (producto) => {
  if (!producto) return false;
  return Number(producto.descuentoMonto || 0) > 0 || getProductDiscountPercent(producto) > 0;
};

const getProductDiscountConcept = (producto) => {
  const concept = String(producto?.discountConcept || "").trim();
  if (concept) return concept;
  if (producto?.is_reward_discount_item) return "DESCUENTO POR RECOMPENSA";
  return "";
};

// React.memo evita que la tabla parpadee o se recargue innecesariamente
const SalesProductsTable = memo(({
  productos = [], selectedProduct = null, onProductSelect, tableRef, gridTemplate, onColumnResizeStart
}) => {
  
  return (
    <div className={styles.productsTable} ref={tableRef}>
      <div className={styles.tableHeader} style={{ gridTemplateColumns: gridTemplate }}>
        <span>Producto<div className={styles.resizeHandle} onMouseDown={(e) => onColumnResizeStart?.(e, 0)} /></span>
        <span>Precio Venta<div className={styles.resizeHandle} onMouseDown={(e) => onColumnResizeStart?.(e, 1)} /></span>
        <span>Cant.<div className={styles.resizeHandle} onMouseDown={(e) => onColumnResizeStart?.(e, 2)} /></span>
        <span>Importe<div className={styles.resizeHandle} onMouseDown={(e) => onColumnResizeStart?.(e, 3)} /></span>
        <span>Existencia</span>
      </div>

      <div className={styles.tableBody}>
        {productos.map((producto) => {
          const hasDiscount = getProductHasDiscount(producto);
          const discountPercent = getProductDiscountPercent(producto);
          const discountConcept = getProductDiscountConcept(producto);
          const isSelected = selectedProduct && isSameCartItem(selectedProduct, producto);

          // Lógica inteligente de Stock para la UI
          const tracksInventory = Boolean(producto.tracks_inventory);
          const existencia = Number(producto.existencia || 0);
          const stockReal = Number(producto.stockReal || 0);
          
          const isLimitReached = tracksInventory && existencia <= 0 && stockReal > 0;
          const isCompletelyEmpty = tracksInventory && existencia <= 0 && stockReal <= 0;

          // Lógica de clases CSS aplanada y limpia
          const rowClasses = [
            styles.tableRow,
            producto.is_reward_item ? styles.rewardRow : "",
            producto.is_reward_discount_item ? styles.rewardDiscountRow : "",
            hasDiscount && !producto.is_reward_item ? styles.discountAppliedRow : "",
            isSelected ? styles.selectedRow : ""
          ].filter(Boolean).join(" ");

          return (
            <div
              key={getCartItemKey(producto)}
              className={rowClasses}
              style={{ gridTemplateColumns: gridTemplate }}
              onClick={() => onProductSelect?.(producto)}
            >
              <span className={`${styles.tableCell} ${styles.productCell}`}>
                <span className={styles.productNameText}>{producto.nombre || producto.codigo}</span>
                
                {/* 🟠 CASO 1: HAY STOCK PERO YA METISTE TODO AL CARRITO */}
                {isLimitReached && (
                  <span style={{ 
                    backgroundColor: '#fffbeb', 
                    color: '#d97706', 
                    border: '1px solid #d97706', 
                    padding: '2px 6px', 
                    borderRadius: '4px', 
                    fontSize: '0.70rem', 
                    fontWeight: 'bold', 
                    marginLeft: '8px',
                    whiteSpace: 'nowrap'
                  }}>
                    Límite en carrito
                  </span>
                )}

                {/* 🔴 CASO 2: EL INVENTARIO ESTÁ EN CERO ABSOLUTO */}
                {isCompletelyEmpty && (
                  <span style={{ 
                    backgroundColor: '#fee2e2', 
                    color: '#ef4444', 
                    border: '1px solid #ef4444', 
                    padding: '2px 6px', 
                    borderRadius: '4px', 
                    fontSize: '0.70rem', 
                    fontWeight: 'bold', 
                    marginLeft: '8px',
                    whiteSpace: 'nowrap'
                  }}>
                    Agotado
                  </span>
                )}
                
                {producto.is_reward_item && <span className={styles.rewardBadge}>Recompensa</span>}
                
                {hasDiscount && !producto.is_reward_item && (
                  <span className={styles.productDiscountBadge}>DESC. {discountPercent.toFixed(2)}%</span>
                )}
                
                {discountConcept && !producto.is_reward_discount_item && (
                  <span className={styles.productDiscountConcept}>{discountConcept}</span>
                )}
                
                {producto.is_reward_discount_item && (
                  <span className={styles.rewardDiscountBadge}>Descuento recompensa</span>
                )}
              </span>

              <span className={styles.tableCell}>${Number(producto.precio || 0).toFixed(2)}</span>
              <span className={styles.tableCell}>{producto.cantidad}</span>
              <span className={styles.tableCell}>${Number(producto.importe || 0).toFixed(2)}</span>
              <span className={styles.tableCell}>{producto.existencia}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default SalesProductsTable;