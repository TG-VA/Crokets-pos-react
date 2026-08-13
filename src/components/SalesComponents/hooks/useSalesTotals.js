import { useMemo } from "react";

const useSalesTotals = (productos = []) => {
  return useMemo(() => {
    const subtotal = productos.reduce(
      (sum, p) => sum + Number(p.precioOriginal ?? p.precio ?? 0) * Number(p.cantidad || 0), 0
    );
    const discountTotal = productos.reduce(
      (sum, p) => sum + Number(p.descuentoMonto || 0), 0
    );
    
    return {
      subtotal,
      discountTotal,
      total: Math.max(subtotal - discountTotal, 0), // Evita totales negativos
    };
  }, [productos]);
};

export default useSalesTotals;