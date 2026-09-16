import { normalizeSpaces, normalizeUpper } from "./ticketLayout";
import { toNumber } from "./ticketItemFormatters";

export const getCustomerName = (sale = {}) => {
  return normalizeUpper(
    sale.customer_name ||
      sale.customerName ||
      sale.customer?.name ||
      sale.customer?.full_name ||
      ""
  );
};

export const getCustomerPhone = (sale = {}) => {
  return normalizeSpaces(
    sale.customer_phone ||
      sale.customerPhone ||
      sale.customer?.phone ||
      sale.customer?.phone_number ||
      ""
  );
};

export const getEarnedPoints = (sale = {}) => {
  return Number(
    sale.points_earned ??
      sale.customer_points_earned ??
      sale.earned_points ??
      sale.pointsEarned ??
      0
  );
};

export const getPartialReturnPointsFromMovements = (sale = {}) => {
  const saleId = String(sale.id || sale.sale_id || "").trim();

  const possibleLists = [
    sale.customer_points_movements,
    sale.customerPointsMovements,
    sale.points_movements,
    sale.pointsMovements,
    sale.customer_points,
    sale.customerPoints,
  ];

  const movements = possibleLists.find((list) => Array.isArray(list)) || [];

  return movements.reduce((acc, movement) => {
    const source = String(movement.source || "").toLowerCase();
    const points = Number(movement.points || 0);
    const relatedSaleId = String(
      movement.related_sale_id || movement.relatedSaleId || ""
    ).trim();

    const belongsToSale = !saleId || !relatedSaleId || relatedSaleId === saleId;
    const isPartialReturn = source === "partial_return";

    if (belongsToSale && isPartialReturn && points < 0) {
      return acc + Math.abs(points);
    }

    return acc;
  }, 0);
};

export const getReturnPointsFromReturn = (ret = {}) => {
  return Math.abs(
    toNumber(
      ret.points_returned ??
        ret.pointsReturned ??
        ret.points_deducted ??
        ret.pointsDeducted ??
        ret.returned_points ??
        ret.returnedPoints ??
        ret.partial_return_points ??
        ret.partialReturnPoints ??
        ret.customer_points_returned ??
        ret.customerPointsReturned ??
        0
    )
  );
};

export const getPartialReturnPointsFromReturns = (sale = {}) => {
  const partialReturns = sale.returns || sale.partial_returns || [];

  if (!Array.isArray(partialReturns)) return 0;

  return partialReturns.reduce((acc, ret) => {
    return acc + getReturnPointsFromReturn(ret);
  }, 0);
};

export const getReturnedPoints = (sale = {}) => {
  const directValue = Math.abs(
    Number(
      sale.points_returned ??
        sale.customer_points_returned ??
        sale.partial_return_points ??
        sale.partialReturnPoints ??
        sale.pointsReturned ??
        sale.returned_points ??
        sale.returnedPoints ??
        sale.partial_return_points_returned ??
        sale.partialReturnPointsReturned ??
        sale.partial_return_points_deducted ??
        sale.partialReturnPointsDeducted ??
        sale.points_deducted_by_partial_return ??
        sale.pointsDeductedByPartialReturn ??
        sale.partial_return_points_discounted ??
        sale.partialReturnPointsDiscounted ??
        0
    )
  );

  if (directValue > 0) return directValue;

  const movementPoints = getPartialReturnPointsFromMovements(sale);

  if (movementPoints > 0) return movementPoints;

  const returnPoints = getPartialReturnPointsFromReturns(sale);

  if (returnPoints > 0) return returnPoints;

  return 0;
};

export const getCustomerPointsBalance = (sale = {}) => {
  const value =
    sale.customer_points_balance ??
    sale.points_balance ??
    sale.pointsBalance ??
    sale.final_points_balance ??
    sale.finalPointsBalance ??
    sale.customer?.points ??
    sale.customer?.points_balance ??
    null;

  if (value === null || value === undefined || value === "") return null;

  return Number(value);
};
