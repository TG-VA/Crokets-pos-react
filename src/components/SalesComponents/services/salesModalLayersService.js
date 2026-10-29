/**
 * Descriptor de las capas modales de Ventas: cada entrada asocia una bandera
 * de apertura con el identificador de su capa en la pila de modales.
 */
const SALES_MODAL_LAYERS = [
  ["isExitModalOpen", "sales-exit"],
  ["isExitAuthModalOpen", "sales-exit-auth"],
  ["isEntryModalOpen", "sales-entry"],
  ["showPaymentModal", "sales-payment"],
  ["isClientModalOpen", "sales-client"],
  ["isVerifierModalOpen", "sales-verifier"],
  ["isSearchModalOpen", "sales-search"],
  ["isDiscountModalOpen", "sales-discount"],
  ["isPendingModalOpen", "sales-pending-ticket"],
  ["isChangeModalOpen", "sales-change-ticket"],
  ["isDeleteModalOpen", "sales-delete-ticket"],
  ["isDeleteItemModalOpen", "sales-delete-item"],
  ["isSalesHistoryModalOpen", "sales-history"],
  ["saleSuccessData", "sales-success"],
  ["isRewardProductModalOpen", "sales-reward-product"],
  ["isProductDiscountRewardModalOpen", "sales-product-discount"],
];

export const getSalesModalLayerIds = (flags = {}) =>
  SALES_MODAL_LAYERS.filter(([flag]) => Boolean(flags[flag])).map(
    ([, layerId]) => layerId
  );
