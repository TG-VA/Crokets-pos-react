import { useState } from "react";

export const useSalesTransactionState = () => {
  const [saleToken, setSaleToken] = useState(null);
  const [saleNotes, setSaleNotes] = useState("");
  const [processingSale, setProcessingSale] = useState(false);

  return {
    saleToken, setSaleToken,
    saleNotes, setSaleNotes,
    processingSale, setProcessingSale,
  };
};