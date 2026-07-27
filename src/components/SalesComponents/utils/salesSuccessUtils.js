export const buildSaleSuccessPayload = ({
  saleId,
  saleClient = null,
  subtotal = 0,
  discountTotal = 0,
  total = 0,
  paymentData = null,
  pointsResult = null,
  rewardRedemptionResult = null,
  rewardPointsResult = null,
}) => {
  const hasCustomer =
    Boolean(saleClient?.id);

  const pointsEarned = Number(
    pointsResult?.points || 0,
  );

  const pointsUsed = Number(
    pointsResult?.pointsUsed || 0,
  );

  return {
    saleId,
    folio: String(saleId)
      .slice(0, 8)
      .toUpperCase(),
    customerId:
      saleClient?.id || null,
    customerName:
      saleClient?.name ||
      "PÚBLICO EN GENERAL",
    customerPhone:
      saleClient?.phone || "",
    total: Number(total || 0),
    subtotal: Number(
      subtotal || 0,
    ),
    discountTotal: Number(
      discountTotal || 0,
    ),
    paymentMethod:
      paymentData?.method || "",
    printed:
      Boolean(
        paymentData?.shouldPrint,
      ),
    pointsEarned,
    pointsUsed,
    pointsBalance:
      pointsResult?.newBalance !==
        undefined &&
      pointsResult?.newBalance !==
        null
        ? Number(
            pointsResult.newBalance,
          )
        : null,
    pointsError:
      pointsResult?.error || null,
    rewardPointsError:
      pointsResult?.rewardError ||
      null,
    rewardRedemptions:
      pointsResult
        ?.rewardRedemptions || [],
    rewardRedemptionsRegistered:
      Boolean(
        rewardRedemptionResult
          ?.registered,
      ),
    rewardPointsRegistered:
      Boolean(
        rewardPointsResult
          ?.registered,
      ),
    noPointsReason:
      hasCustomer &&
      pointsEarned <= 0 &&
      pointsUsed <= 0
        ? "La venta no generó puntos porque el total no alcanzó el monto mínimo configurado."
        : "",
  };
};