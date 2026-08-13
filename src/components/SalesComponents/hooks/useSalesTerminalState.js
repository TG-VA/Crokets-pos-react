import { useState } from "react";

export const useSalesTerminalState = () => {
  const [barcode, setBarcode] = useState("");
  const [cashMovements, setCashMovements] = useState([]);

  return {
    barcode, setBarcode,
    cashMovements, setCashMovements,
  };
};