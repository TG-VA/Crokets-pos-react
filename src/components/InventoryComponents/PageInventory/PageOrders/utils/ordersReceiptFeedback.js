import { getOrderDifferences } from "./ordersCalculationService";

/**
 * Aviso de resultado de una recepcion. Con diferencias solo informa cuantos
 * productos difieren; el detalle vive en el modal del pedido.
 */
export const buildReceiptFeedback = (order) => {
  const differenceCount = getOrderDifferences(order?.items).length;

  if (differenceCount === 0) {
    return {
      tone: "success",
      message: `Pedido ${order?.orderNumber} recibido correctamente. El inventario ya fue actualizado.`,
    };
  }

  return {
    tone: "warning",
    message: `Pedido ${order?.orderNumber} recibido con ${differenceCount} ${
      differenceCount === 1 ? "producto" : "productos"
    } con diferencia.`,
  };
};
