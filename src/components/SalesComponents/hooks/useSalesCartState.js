import { useSalesCartContext } from "../../../contexts/SalesCartContext";

/**
 * El carrito vive en `SalesCartProvider` para sobrevivir a la navegacion entre
 * modulos. Este hook conserva el contrato que ya consumia la vista de Ventas.
 */
export const useSalesCartState = () => {
  const {
    productos,
    setProductos,
    selectedProduct,
    setSelectedProduct,
    stockWarningMsg,
    setStockWarningMsg,
    productosRef,
  } = useSalesCartContext();

  return {
    productos,
    setProductos,
    selectedProduct,
    setSelectedProduct,
    stockWarningMsg,
    setStockWarningMsg,
    productosRef,
  };
};
