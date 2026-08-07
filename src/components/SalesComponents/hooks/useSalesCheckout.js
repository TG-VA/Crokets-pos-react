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
        // --- 1. VALIDACIONES PREVIAS (Early Returns) ---
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

        const stockIsValid = await validateCartStockBeforeSale();
        if (!stockIsValid) return false;

        // --- 2. PREPARACIÓN DE DATOS ---
        const productsPayload = buildProductsPayload(productos);
        const paymentsPayload = buildPaymentsPayload(paymentData);
        const saleDate = new Date().toISOString();
        const cleanNotes = paymentData?.notes?.trim() || null;
        const currentCartItems = Array.isArray(productosRef?.current) ? productosRef.current : productos;

        // --- 3. TRANSACCIÓN PRINCIPAL (PUNTO DE NO RETORNO) ---
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
          // Si falla aquí, la venta NO se guardó. Podemos abortar seguro.
          console.error("Error crítico al registrar venta:", error);
          showAppWarning(error?.message || "Error al registrar la venta en la base de datos.");
          return false;
        }

        // ====================================================================
        // A PARTIR DE AQUÍ, LA VENTA ES EXITOSA. EL CARRITO DEBE LIMPIARSE SÍ O SÍ.
        // ====================================================================

        // --- 4. POST-VENTA (Beneficios / Puntos) ---
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
          // Opcional: Notificar, pero NO lanzar error general.
        }

        // --- 5. IMPRESIÓN DEL TICKET ---
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
          showAppWarning("Venta registrada con éxito, pero hubo un problema de conexión con la impresora.");
        }

        // --- 6. FINALIZACIÓN Y LIMPIEZA GARANTIZADA ---
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
        // Este catch externo ahora solo atrapará errores catastróficos inesperados del framework (RAM, variables nulas no capturadas)
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