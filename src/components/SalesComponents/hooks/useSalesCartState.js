import { useState, useRef, useEffect } from "react";

export const useSalesCartState = () => {
  const [productos, setProductos] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [stockWarningMsg, setStockWarningMsg] = useState("");
  const productosRef = useRef([]);

  useEffect(() => {
    productosRef.current = productos;
    if (productos.length === 0) {
      setStockWarningMsg("");
    }
  }, [productos]);

  return {
    productos, setProductos,
    selectedProduct, setSelectedProduct,
    stockWarningMsg, setStockWarningMsg,
    productosRef,
  };
};