import { useState, useRef, useEffect } from "react";

const useSalesCoreState = () => {
  const [saleToken, setSaleToken] = useState(null);
  const [saleNotes, setSaleNotes] = useState("");
  const [ticketNumber, setTicketNumber] = useState(1);
  const [pendingTickets, setPendingTickets] = useState([]);
  const [barcode, setBarcode] = useState("");

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [pendingFreeProductRewards, setPendingFreeProductRewards] = useState([]);
  const [pendingProductDiscountRewards, setPendingProductDiscountRewards] = useState([]);
  const [activeProductDiscountReward, setActiveProductDiscountReward] = useState(null);

  const [cashMovements, setCashMovements] = useState([]);
  const [currentSaleClient, setCurrentSaleClient] = useState(null);
  const [currentSaleReward, setCurrentSaleReward] = useState(null);
  const [processingSale, setProcessingSale] = useState(false);

  const [productos, setProductos] = useState([]);
  const [stockWarningMsg, setStockWarningMsg] = useState("");
  const productosRef = useRef([]);

  // Sincronizar productos con la referencia y limpiar mensaje de stock si se vacía la tabla
  useEffect(() => {
    productosRef.current = productos;

    if (productos.length === 0) {
      setStockWarningMsg("");
    }
  }, [productos]);

  return {
    saleToken, setSaleToken,
    saleNotes, setSaleNotes,
    ticketNumber, setTicketNumber,
    pendingTickets, setPendingTickets,
    barcode, setBarcode,
    selectedProduct, setSelectedProduct,
    pendingFreeProductRewards, setPendingFreeProductRewards,
    pendingProductDiscountRewards, setPendingProductDiscountRewards,
    activeProductDiscountReward, setActiveProductDiscountReward,
    cashMovements, setCashMovements,
    currentSaleClient, setCurrentSaleClient,
    currentSaleReward, setCurrentSaleReward,
    processingSale, setProcessingSale,
    productos, setProductos,
    stockWarningMsg, setStockWarningMsg,
    productosRef,
  };
};

export default useSalesCoreState;