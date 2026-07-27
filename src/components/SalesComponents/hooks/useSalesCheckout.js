import {
  useCallback,
  useRef,
} from "react";

import {
  createSaleTransaction,
} from "../services/salesTransactionService";

import {
  processSaleCustomerBenefits,
} from "../services/salesPostSaleService";

import {
  printSaleTicket,
} from "../services/salesTicketService";

import {
  isValidUuid,
} from "../utils/salesCartUtils";

import {
  buildPaymentsPayload,
  buildProductsPayload,
} from "../utils/salesPaymentUtils";

import {
  buildSaleSuccessPayload,
} from "../utils/salesSuccessUtils";

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
  const processingRef =
    useRef(false);

  const handleProcessPayment =
    useCallback(
      async (paymentData) => {
        if (
          processingSale ||
          processingRef.current
        ) {
          return false;
        }

        processingRef.current = true;

        try {
          setProcessingSale(true);

          const canSell =
            await validateShiftNotCut();

          if (!canSell) {
            showAppWarning(
              "Ya realizaste el corte de cajero.\nDebes cerrar turno antes de seguir vendiendo.",
            );

            setShowPaymentModal(false);

            return false;
          }

          if (!user?.id) {
            showAppWarning(
              "No se detectó el usuario.",
            );

            return false;
          }

          if (!branch?.id) {
            showAppWarning(
              "No se detectó la sucursal.",
            );

            return false;
          }

          if (
            !Array.isArray(productos) ||
            productos.length === 0
          ) {
            showAppWarning(
              "No hay productos en la venta.",
            );

            return false;
          }

          if (!saleToken) {
            showAppWarning(
              "No se generó el token de venta.",
            );

            return false;
          }

          const invalidProduct =
            productos.find(
              (product) =>
                !isValidUuid(
                  product?.id,
                ),
            );

          if (invalidProduct) {
            showAppWarning(
              "Hay productos sin UUID real. No se puede guardar la venta.",
            );

            return false;
          }

          const stockIsValid =
            await validateCartStockBeforeSale();

          if (!stockIsValid) {
            return false;
          }

          const productsPayload =
            buildProductsPayload(
              productos,
            );

          const paymentsPayload =
            buildPaymentsPayload(
              paymentData,
            );

          const saleDate =
            new Date().toISOString();

          const cleanNotes =
            paymentData?.notes?.trim() ||
            null;

          const saleId =
            await createSaleTransaction({
              branchId:
                branch.id,
              userId:
                user.id,
              customerId:
                currentSaleClient?.id ||
                null,
              subtotal: Number(
                subtotal,
              ),
              tax: 0,
              total: Number(
                total,
              ),
              saleDate,
              productsPayload,
              paymentsPayload,
              saleToken,
              notes:
                cleanNotes,
            });

          const currentCartItems =
            Array.isArray(
              productosRef?.current,
            )
              ? productosRef.current
              : productos;

          const {
            pointsResult,
            rewardRedemptionResult,
            rewardPointsResult,
          } =
            await processSaleCustomerBenefits({
              saleId,
              customerId:
                currentSaleClient?.id ||
                null,
              saleTotal: Number(
                total,
              ),
              saleDate,
              cartItems:
                currentCartItems,
              branchId:
                branch.id,
              userId:
                user.id,
            });

          if (
            paymentData?.shouldPrint
          ) {
            await printSaleTicket({
              saleId,
              paymentData,
              paymentPayload:
                paymentsPayload,
              notes:
                cleanNotes,
              saleDate,
              saleClient:
                currentSaleClient,
              pointsResult,
              cartItems:
                currentCartItems,
              branch,
              user,
              subtotal: Number(
                subtotal,
              ),
              discountTotal:
                Number(
                  discountTotal ||
                    0,
                ),
              total: Number(
                total,
              ),
            });
          }

          const saleSuccessPayload =
            buildSaleSuccessPayload({
              saleId,
              saleClient:
                currentSaleClient,
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
          setShowPaymentModal(
            false,
          );

          setSaleSuccessData(
            saleSuccessPayload,
          );

          return true;
        } catch (error) {
          console.error(
            "Error al registrar venta:",
            error,
          );

          showAppWarning(
            error?.message ||
              "Error al registrar la venta.",
          );

          return false;
        } finally {
          processingRef.current =
            false;

          setProcessingSale(
            false,
          );
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
      ],
    );

  return {
    handleProcessPayment,
  };
};

export default useSalesCheckout;