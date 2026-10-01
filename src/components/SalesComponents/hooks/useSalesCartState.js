import { useState, useRef, useEffect } from "react";
import { useDidChange } from "../../../hooks/useDidChange";

export const useSalesCartState = () => {
  const [productos, setProductos] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [stockWarningMsg, setStockWarningMsg] = useState("");
  const productosRef = useRef([]);

  // El aviso de stock se limpia en la misma pasada en que el carrito queda
  // vacio, en lugar de desde un efecto. El ref sigue sincronizandose en un
  // efecto porque es un valor externo que otros hooks leen.
  const cartIsEmpty = productos.length === 0;
  if (useDidChange(cartIsEmpty) && cartIsEmpty) {
    setStockWarningMsg("");
  }

  useEffect(() => {
    productosRef.current = productos;
  }, [productos]);

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
