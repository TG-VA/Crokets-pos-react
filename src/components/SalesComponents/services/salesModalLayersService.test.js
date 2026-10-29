import { describe, it, expect } from "vitest";

import { getSalesModalLayerIds } from "./salesModalLayersService";

// Contrato esperado, escrito a mano e independiente del descriptor.
const EXPECTED_LAYERS = {
  isExitModalOpen: "sales-exit",
  isExitAuthModalOpen: "sales-exit-auth",
  isEntryModalOpen: "sales-entry",
  showPaymentModal: "sales-payment",
  isClientModalOpen: "sales-client",
  isVerifierModalOpen: "sales-verifier",
  isSearchModalOpen: "sales-search",
  isDiscountModalOpen: "sales-discount",
  isPendingModalOpen: "sales-pending-ticket",
  isChangeModalOpen: "sales-change-ticket",
  isDeleteModalOpen: "sales-delete-ticket",
  isDeleteItemModalOpen: "sales-delete-item",
  isSalesHistoryModalOpen: "sales-history",
  saleSuccessData: "sales-success",
  isRewardProductModalOpen: "sales-reward-product",
  isProductDiscountRewardModalOpen: "sales-product-discount",
};

describe("getSalesModalLayerIds", () => {
  it("no devuelve capas cuando no hay modales abiertos", () => {
    expect(getSalesModalLayerIds({})).toEqual([]);
  });

  it.each(Object.entries(EXPECTED_LAYERS))(
    "%s registra la capa %s",
    (flag, layerId) => {
      expect(getSalesModalLayerIds({ [flag]: true })).toEqual([layerId]);
    }
  );

  it("devuelve todas las capas cuando todos los modales estan abiertos", () => {
    const all = Object.fromEntries(
      Object.keys(EXPECTED_LAYERS).map((flag) => [flag, true])
    );

    expect(getSalesModalLayerIds(all).sort()).toEqual(
      Object.values(EXPECTED_LAYERS).sort()
    );
  });

  it("trata un objeto de venta exitosa como modal abierto", () => {
    expect(getSalesModalLayerIds({ saleSuccessData: { id: "s1" } })).toEqual([
      "sales-success",
    ]);
  });
});
