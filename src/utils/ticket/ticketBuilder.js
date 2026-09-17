import { toNumber } from "./ticketItemFormatters";
import {
  hasRewardActivity,
  normalizeRewardRedemptions,
  getRewardPointsUsed,
  getRewardCount,
} from "./ticketRewardService";
import {
  getPaymentLabel,
  getTotalPaidInMxn,
  shouldShowReceivedAndChange,
} from "./ticketPaymentService";
import {
  getCustomerName,
  getCustomerPhone,
  getEarnedPoints,
  getReturnedPoints,
  getCustomerPointsBalance,
} from "./ticketPointsService";
import {
  buildHeaderSection,
  buildSaleInfoSection,
  buildItemsSection,
  buildTotalsSection,
  buildPaymentsSection,
  buildCustomerPointsSection,
  buildRewardsSection,
  buildCancellationSection,
  buildPartialReturnsSection,
  buildReprintSection,
  buildNotesSection,
  buildFooterSection,
} from "./ticketSections";

export const buildTicketText = ({
  branch = {},
  sale = {},
  items = [],
  cashierName = "",
  footer = {},
  isReprint = false,
  reprintedAt = null,
}) => {
  const saleDate = sale.created_at || sale.date || new Date();
  const cancelledAt = sale.cancelled_at || null;
  const isCancelled =
    sale.status === "cancelled" || sale.status === "cancelada";

  const payments = sale.payments || [];
  const partialReturns = sale.returns || [];
  const hasPartialReturns = partialReturns.length > 0;

  const rewardRedemptions = normalizeRewardRedemptions(sale, items);
  const hasRewards = hasRewardActivity(sale, items);
  const rewardPointsUsed = getRewardPointsUsed(sale, items);
  const rewardCount = getRewardCount(sale, items);
  const isRewardOnlySale = hasRewards && toNumber(sale.total) <= 0;

  const paymentLabel = getPaymentLabel(
    payments,
    sale.payment_method,
    sale,
    items
  );

  const totalPaidInMxn = getTotalPaidInMxn(
    payments,
    sale.amount_received ?? sale.paid_amount
  );

  const showReceivedAndChange = shouldShowReceivedAndChange(
    payments,
    sale.payment_method
  );

  const customerName = getCustomerName(sale);
  const customerPhone = getCustomerPhone(sale);

  const earnedPoints = getEarnedPoints(sale);
  const returnedPoints = getReturnedPoints(sale);
  const netPoints = Math.max(earnedPoints - returnedPoints, 0);
  const customerPointsBalance = getCustomerPointsBalance(sale);

  const lines = [
    ...buildHeaderSection(branch),
    ...buildSaleInfoSection({
      sale,
      saleDate,
      cashierName,
      customerName,
      customerPhone,
      isRewardOnlySale,
      hasRewards,
      isCancelled,
    }),
    ...buildItemsSection(items, { isCancelled, rewardRedemptions }),
    ...buildTotalsSection(items, sale),
    ...buildPaymentsSection(payments, {
      sale,
      paymentLabel,
      totalPaidInMxn,
      showReceivedAndChange,
    }),
    ...buildCustomerPointsSection({
      customerName,
      earnedPoints,
      returnedPoints,
      rewardPointsUsed,
      customerPointsBalance,
      hasPartialReturns,
      isCancelled,
      netPoints,
    }),
    ...buildRewardsSection(rewardRedemptions, {
      isCancelled,
      rewardCount,
      rewardPointsUsed,
    }),
    ...buildCancellationSection(sale, { isCancelled, cancelledAt }),
    ...buildPartialReturnsSection(partialReturns, { sale, returnedPoints }),
    ...buildReprintSection(isReprint, reprintedAt),
    ...buildNotesSection(sale),
    ...buildFooterSection(footer),
  ];

  return lines.join("\n");
};
