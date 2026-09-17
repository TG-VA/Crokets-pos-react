import { describe, it, expect } from "vitest";

import {
  getRewardTypeFromValue,
  isRewardDiscountItem,
  isFreeRewardItem,
  isRewardItem,
  getRewardItemsFromSale,
  detectRewardType,
  normalizeRewardRedemptions,
  getRewardPointsUsed,
  getRewardCount,
  hasRewardActivity,
  findRewardForItem,
  getRewardVisualTypeForItem,
} from "./ticketRewardService";

const discountItem = {
  description: "SNACK",
  quantity: 1,
  total: 60,
  original_unit_price: 80,
  unit_price: 80,
  reward_discount_amount: 20,
  reward_id: "rw-1",
  reward_name: "DESCUENTO SNACK",
};

const freeItem = {
  description: "PREMIO",
  quantity: 1,
  total: 0,
  original_unit_price: 80,
  unit_price: 80,
  reward_id: "rw-2",
  reward_name: "REGALO PREMIO",
};

describe("ticketRewardService", () => {
  describe("getRewardTypeFromValue", () => {
    it("resuelve el tipo explicito", () => {
      expect(getRewardTypeFromValue({ reward_type: "product_discount" })).toBe(
        "product_discount"
      );
      expect(getRewardTypeFromValue({ rewardType: "free_product" })).toBe(
        "free_product"
      );
      expect(getRewardTypeFromValue({ type: "FREE_PRODUCT" })).toBe(
        "free_product"
      );
      expect(getRewardTypeFromValue({})).toBe("");
    });
  });

  describe("isRewardDiscountItem", () => {
    it("detecta articulos de descuento por recompensa", () => {
      expect(isRewardDiscountItem(discountItem)).toBe(true);
      expect(isRewardDiscountItem({ reward_type: "product_discount" })).toBe(true);
      expect(isRewardDiscountItem({ discount_concept: "10% de descuento" })).toBe(true);
      expect(isRewardDiscountItem({ isRewardDiscountItem: true })).toBe(true);
    });

    it("descarta articulos sin senales de descuento", () => {
      expect(isRewardDiscountItem({ description: "BOLSA" })).toBe(false);
      expect(isRewardDiscountItem({})).toBe(false);
    });
  });

  describe("isFreeRewardItem", () => {
    it("detecta articulos gratis por recompensa", () => {
      expect(isFreeRewardItem(freeItem)).toBe(true);
      expect(isFreeRewardItem({ is_reward_item: true })).toBe(true);
      expect(isFreeRewardItem({ reward_type: "free_product" })).toBe(true);
    });

    it("un descuento no es articulo gratis", () => {
      expect(isFreeRewardItem(discountItem)).toBe(false);
    });
  });

  describe("isRewardItem", () => {
    it("unifica recompensas gratis y de descuento", () => {
      expect(isRewardItem(freeItem)).toBe(true);
      expect(isRewardItem(discountItem)).toBe(true);
      expect(isRewardItem({ description: "BOLSA" })).toBe(false);
    });
  });

  describe("getRewardItemsFromSale", () => {
    it("encuentra la lista de canjes en varios alias", () => {
      expect(getRewardItemsFromSale({ reward_redemptions: [] })).toEqual([]);
      expect(getRewardItemsFromSale({ rewardRedemptions: ["a"] })).toEqual(["a"]);
      expect(getRewardItemsFromSale({ rewards_redeemed: ["b"] })).toEqual(["b"]);
      expect(getRewardItemsFromSale({})).toEqual([]);
    });
  });

  describe("detectRewardType", () => {
    it("inferencia el tipo por nombre, monto o flags", () => {
      expect(detectRewardType({ name: "20% OFF" })).toBe("product_discount");
      expect(detectRewardType({ discountAmount: 30 })).toBe("product_discount");
      expect(
        detectRewardType({ reward_type: "free_product", name: "REGALO" })
      ).toBe("free_product");
      expect(
        detectRewardType({ reward_type: "free_product", name: "DESCUENTO" })
      ).toBe("product_discount");
      expect(detectRewardType({})).toBe("free_product");
    });
  });

  describe("normalizeRewardRedemptions", () => {
    it("mapea filas de canjes normalizadas", () => {
      const rows = normalizeRewardRedemptions(
        {
          reward_redemptions: [
            {
              reward_name: "10% OFF",
              product_name: "snack",
              quantity: 2,
              points_per_unit: 50,
              reward_type: "product_discount",
            },
          ],
        },
        []
      );

      expect(rows).toEqual([
        {
          rewardName: "10% OFF",
          productName: "SNACK",
          quantity: 2,
          pointsPerUnit: 50,
          totalPoints: 100,
          rewardType: "product_discount",
          unitPrice: 0,
          discountAmount: 0,
          reversedAt: null,
          reversedBy: null,
          reversalReason: "",
        },
      ]);
    });

    it("deriva las filas desde los items del ticket", () => {
      const rows = normalizeRewardRedemptions({}, [discountItem]);

      expect(rows[0].rewardName).toBe("DESCUENTO SNACK");
      expect(rows[0].productName).toBe("SNACK");
      expect(rows[0].totalPoints).toBe(0);
      expect(rows[0].rewardType).toBe("product_discount");
    });

    it("filtra items que no son recompensas", () => {
      expect(normalizeRewardRedemptions({}, [{ description: "BOLSA" }])).toEqual([]);
    });
  });

  describe("getRewardPointsUsed", () => {
    it("lee el valor directo o suma las canjes", () => {
      expect(getRewardPointsUsed({ points_used: 250 })).toBe(250);
      expect(
        getRewardPointsUsed({}, [{ is_reward_item: true, points: 100 }])
      ).toBe(100);
      expect(getRewardPointsUsed({})).toBe(0);
    });
  });

  describe("getRewardCount", () => {
    it("lee el conteo directo o lo deriva de las filas", () => {
      expect(getRewardCount({ rewards_count: 2 })).toBe(2);
      expect(getRewardCount({}, [discountItem])).toBe(1);
      expect(getRewardCount({})).toBe(0);
    });
  });

  describe("hasRewardActivity", () => {
    it("detecta actividad de recompensas", () => {
      expect(hasRewardActivity({ points_used: 10 }, [])).toBe(true);
      expect(hasRewardActivity({ isRewardRedemptionOnly: true }, [])).toBe(true);
      expect(hasRewardActivity({}, [discountItem])).toBe(true);
      expect(hasRewardActivity({}, [])).toBe(false);
    });
  });

  describe("findRewardForItem", () => {
    it("empareja por reward_id y luego por nombre de producto", () => {
      const redemptions = [
        { reward_id: "rw-9", productName: "SNACK", rewardName: "10% OFF" },
      ];

      expect(findRewardForItem({ reward_id: "rw-9" }, redemptions)).toBe(
        redemptions[0]
      );
      expect(findRewardForItem({ description: "snack" }, redemptions)).toBe(
        redemptions[0]
      );
      expect(findRewardForItem({ description: "OTRO" }, redemptions)).toBeNull();
      expect(findRewardForItem({}, [])).toBeNull();
    });
  });

  describe("getRewardVisualTypeForItem", () => {
    it("clasifica el tipo visual para imprimir", () => {
      expect(getRewardVisualTypeForItem(discountItem, [])).toBe(
        "product_discount"
      );
      expect(getRewardVisualTypeForItem(freeItem, [])).toBe("free_product");
      expect(
        getRewardVisualTypeForItem(
          { description: "SNACK", total: 80 },
          [{ productName: "SNACK", rewardType: "free_product" }]
        )
      ).toBe("free_product");
      expect(getRewardVisualTypeForItem({}, [])).toBe("");
    });
  });
});
