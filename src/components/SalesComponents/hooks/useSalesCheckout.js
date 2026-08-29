import { useCallback, useRef } from "react";

import { createSaleTransaction } from "../services/salesTransactionService";
import { processSaleCustomerBenefits } from "../services/salesPostSaleService";
import { printSaleTicket } from "../services/salesTicketService";

import { isValidUuid } from "../utils/salesCartUtils";
import { buildPaymentsPayload, buildProductsPayload } from "../utils/salesPaymentUtils";
import { buildSaleSuccessPayload } from "../utils/salesSuccessUtils";

const useSalesCheckout = ({
  user,
  branch,
  productos = [],
  productosRef,
  subtotal = 0,
  discountTotal = 0,
  total = 0,
  saleToken = null,
  processingSale = false,
  currentSaleClient = null,
  validateShiftNotCut,
  validateCartStockBeforeSale,
  clearSalesDraft,
  resetCurrentSale,
  setProcessingSale,
  setShowPaymentModal,
  setSaleSuccessData,
  showAppWarning,
}) => {
  const processingRef = useRef(false);

  const handleProcessPayment = useCallback(
    async (paymentData) => {
      if (processingSale || processingRef.current) return false;

      processingRef.current = true;
      setProcessingSale(true);

      try {
        const canSell = await validateShiftNotCut();
        if (!canSell) {
          showAppWarning("Ya realizaste el corte de cajero.\nDebes cerrar turno antes de seguir vendiendo.");
          setShowPaymentModal(false);
          return false;
        }

        if (!user?.id) return showAppWarning("No se detectó el usuario."), false;
        if (!branch?.id) return showAppWarning("No se detectó la sucursal."), false;
        if (!Array.isArray(productos) || productos.length === 0) return showAppWarning("No hay productos en la venta."), false;
        if (!saleToken) return showAppWarning("No se generó el token de venta."), false;

        const invalidProduct = productos.find((product) => !isValidUuid(product?.id));
        if (invalidProduct) {
          showAppWarning("Hay productos sin UUID real. No se puede guardar la venta.");
          return false;
        }

        // Validar límite de kits por venta al cobrar
        const kitWithExceededLimit = productos.find((product) => {
          if (!product.is_kit) return false;
          const maxKits = Number(product.max_kits_per_sale ?? 1);
          return Number(product.cantidad || 0) > maxKits;
        });

        if (kitWithExceededLimit) {
          const maxKits = Number(kitWithExceededLimit.max_kits_per_sale ?? 1);
          showAppWarning(`Límite de venta excedido: El kit "${kitWithExceededLimit.nombre}" tiene un límite de ${maxKits} unidades por transacción, pero hay ${kitWithExceededLimit.cantidad} en el carrito.`);
          setShowPaymentModal(false);
          return false;
        }

        const stockIsValid = await validateCartStockBeforeSale();
        if (!stockIsValid) return false;

        const productsPayload = buildProductsPayload(productos);
        const paymentsPayload = buildPaymentsPayload(paymentData);
        const saleDate = new Date().toISOString();
        const cleanNotes = paymentData?.notes?.trim() || null;
        const currentCartItems = Array.isArray(productosRef?.current) ? productosRef.current : productos;

        // 1. TRANSACCIÓN PRINCIPAL EN BD
        let saleId;
        try {
          saleId = await createSaleTransaction({
            branchId: branch.id,
            userId: user.id,
            customerId: currentSaleClient?.id || null,
            subtotal: Number(subtotal),
            tax: 0,
            total: Number(total),
            saleDate,
            productsPayload,
            paymentsPayload,
            saleToken,
            notes: cleanNotes,
          });
        } catch (error) {
          console.error("Error crítico al registrar venta:", error);
          showAppWarning(error?.message || "Error al registrar la venta en la base de datos.");
          return false;
        }

        // 2. BENEFICIOS Y PUNTOS (Protegido para no romper la venta)
        let pointsResult, rewardRedemptionResult, rewardPointsResult;
        try {
          const benefits = await processSaleCustomerBenefits({
            saleId,
            customerId: currentSaleClient?.id || null,
            saleTotal: Number(total),
            saleDate,
            cartItems: currentCartItems,
            branchId: branch.id,
            userId: user.id,
          });
          pointsResult = benefits.pointsResult;
          rewardRedemptionResult = benefits.rewardRedemptionResult;
          rewardPointsResult = benefits.rewardPointsResult;
        } catch (error) {
          console.error("Venta exitosa, pero falló procesar beneficios:", error);
        }

        // 3. IMPRESIÓN DEL TICKET (Protegido para no romper la venta)
        try {
          if (paymentData?.shouldPrint) {
            await printSaleTicket({
              saleId,
              paymentData,
              paymentPayload: paymentsPayload,
              notes: cleanNotes,
              saleDate,
              saleClient: currentSaleClient,
              pointsResult,
              cartItems: currentCartItems,
              branch,
              user,
              subtotal: Number(subtotal),
              discountTotal: Number(discountTotal || 0),
              total: Number(total),
            });
          }
        } catch (error) {
          console.error("Venta exitosa, pero falló la impresión:", error);
          showAppWarning("Venta registrada con éxito, pero hubo un problema al imprimir el ticket.");
        }

        // 4. LIMPIEZA VISUAL SIMULTÁNEA (Elimina el parpadeo)
        const saleSuccessPayload = buildSaleSuccessPayload({
          saleId,
          saleClient: currentSaleClient,
          subtotal,
          discountTotal,
          total,
          paymentData,
          pointsResult,
          rewardRedemptionResult,
          rewardPointsResult,
        });

        clearSalesDraft();
        resetCurrentSale();
        setShowPaymentModal(false);
        setSaleSuccessData(saleSuccessPayload);

        return true;

      } catch (error) {
        console.error("Error general inesperado en flujo de checkout:", error);
        showAppWarning("Ocurrió un error inesperado.");
        return false;
      } finally {
        processingRef.current = false;
        setProcessingSale(false);
      }
    },
    [
      processingSale,
      user,
      branch,
      productos,
      productosRef,
      subtotal,
      discountTotal,
      total,
      saleToken,
      currentSaleClient,
      validateShiftNotCut,
      validateCartStockBeforeSale,
      clearSalesDraft,
      resetCurrentSale,
      setProcessingSale,
      setShowPaymentModal,
      setSaleSuccessData,
      showAppWarning,
    ]
  );

  return {
    handleProcessPayment,
  };
};

export default useSalesCheckout;