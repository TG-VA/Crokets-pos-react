import { describe, it, expect } from "vitest";

import {
  EXAMPLE_SALE_AMOUNT,
  buildRewardStatusConfirmation,
  calculateExamplePoints,
  canSavePointsRule,
  filterAndSortRewards,
  getLinkedProductsLabel,
  getRewardBenefitLabel,
  getRewardTypeLabel,
  hasPointsRuleChanges,
  normalizeRewardType,
  sanitizePointsAmountInput,
  sortRewards,
} from "./rewardsSettingsCalculationService";

const buildReward = (overrides = {}) => ({
  id: "r1",
  name: "RECOMPENSA",
  description: "DESCRIPCION",
  points_required: 100,
  is_active: true,
  reward_type: "free_product",
  reward_quantity: 1,
  ...overrides,
});

describe("rewardsSettingsCalculationService", () => {
  describe("normalizeRewardType", () => {
    it("respeta el descuento en producto", () => {
      expect(normalizeRewardType("product_discount")).toBe("product_discount");
    });

    it("cae a producto gratis para cualquier otro valor", () => {
      expect(normalizeRewardType("free_product")).toBe("free_product");
      expect(normalizeRewardType("otro")).toBe("free_product");
      expect(normalizeRewardType(null)).toBe("free_product");
    });
  });

  describe("getRewardTypeLabel", () => {
    it("etiqueta ambos tipos en mayusculas", () => {
      expect(getRewardTypeLabel("free_product")).toBe("PRODUCTO GRATIS");
      expect(getRewardTypeLabel("product_discount")).toBe(
        "DESCUENTO EN PRODUCTO"
      );
    });
  });

  describe("getRewardBenefitLabel", () => {
    it("pluraliza el producto gratis", () => {
      expect(getRewardBenefitLabel(buildReward({ reward_quantity: 1 }))).toBe(
        "1 producto gratis"
      );
      expect(getRewardBenefitLabel(buildReward({ reward_quantity: 3 }))).toBe(
        "3 productos gratis"
      );
    });

    it("detalla el descuento porcentual", () => {
      expect(
        getRewardBenefitLabel(
          buildReward({
            reward_type: "product_discount",
            reward_quantity: 2,
            discount_type: "percent",
            discount_value: 15,
          })
        )
      ).toBe("15% en 2 unidades");
    });

    it("detalla el descuento fijo con dos decimales", () => {
      expect(
        getRewardBenefitLabel(
          buildReward({
            reward_type: "product_discount",
            reward_quantity: 1,
            discount_type: "fixed",
            discount_value: 50,
          })
        )
      ).toBe("$50.00 en 1 unidad");
    });
  });

  describe("getLinkedProductsLabel", () => {
    it("un descuento aplica a todos los productos", () => {
      expect(
        getLinkedProductsLabel(buildReward({ reward_type: "product_discount" }))
      ).toBe("TODOS");
    });

    it("cuenta los productos de un producto gratis", () => {
      expect(
        getLinkedProductsLabel(buildReward({ reward_products: [{ id: "p1" }] }))
      ).toBe("1 producto");

      expect(
        getLinkedProductsLabel(
          buildReward({
            reward_products: [{ id: "p1" }, { id: "p2" }],
          })
        )
      ).toBe("2 productos");
    });

    it("advierte cuando un producto gratis no tiene productos", () => {
      expect(getLinkedProductsLabel(buildReward({ reward_products: [] }))).toBe(
        "SIN PRODUCTOS"
      );
    });
  });

  describe("sortRewards", () => {
    it("coloca las activas primero, luego por puntos y nombre", () => {
      const sorted = sortRewards([
        buildReward({ id: "1", name: "ZETA", is_active: false }),
        buildReward({ id: "2", name: "B", points_required: 200 }),
        buildReward({ id: "3", name: "A", points_required: 50 }),
        buildReward({ id: "4", name: "A", points_required: 50 }),
      ]);

      expect(sorted.map((reward) => reward.id)).toEqual(["3", "4", "2", "1"]);
    });

    it("respeta el orden original cuando estado, puntos y nombre empatan", () => {
      const sorted = sortRewards([
        buildReward({ id: "primero", name: "IGUAL" }),
        buildReward({ id: "segundo", name: "IGUAL" }),
      ]);

      expect(sorted.map((reward) => reward.id)).toEqual(["primero", "segundo"]);
    });

    it("no muta el arreglo original", () => {
      const rewards = [
        buildReward({ id: "1", name: "B" }),
        buildReward({ id: "2", name: "A" }),
      ];
      const originalOrder = rewards.map((reward) => reward.id);

      sortRewards(rewards);

      expect(rewards.map((reward) => reward.id)).toEqual(originalOrder);
    });
  });

  describe("filterAndSortRewards", () => {
    it("busca en los textos derivados de la recompensa", () => {
      const rewards = [
        buildReward({
          id: "1",
          name: "GRATIS",
          reward_type: "free_product",
        }),
        buildReward({
          id: "2",
          name: "DESCUENTO",
          reward_type: "product_discount",
          discount_type: "percent",
          discount_value: 25,
        }),
      ];

      const result = filterAndSortRewards({
        rewards,
        searchTerm: "25%",
      });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("2");
    });

    it("filtra por estado activo e inactivo", () => {
      const rewards = [
        buildReward({ id: "1", is_active: true }),
        buildReward({ id: "2", is_active: false }),
      ];

      expect(
        filterAndSortRewards({ rewards, statusFilter: "active" })
      ).toHaveLength(1);
      expect(
        filterAndSortRewards({ rewards, statusFilter: "inactive" })[0].id
      ).toBe("2");
    });
  });

  describe("calculateExamplePoints", () => {
    it("redondea hacia abajo porque no hay puntos fraccionarios", () => {
      expect(calculateExamplePoints(50)).toBe(
        Math.floor(EXAMPLE_SALE_AMOUNT / 50)
      );
      expect(calculateExamplePoints(30)).toBe(14);
    });

    it("devuelve 0 sin regla valida", () => {
      expect(calculateExamplePoints(0)).toBe(0);
      expect(calculateExamplePoints(null)).toBe(0);
      expect(calculateExamplePoints(-10)).toBe(0);
    });
  });

  describe("hasPointsRuleChanges", () => {
    it("detecta el cambio real de la regla", () => {
      expect(
        hasPointsRuleChanges({
          pointsAmountPerPoint: "60",
          originalPointsAmountPerPoint: "50",
        })
      ).toBe(true);
      expect(
        hasPointsRuleChanges({
          pointsAmountPerPoint: " 50 ",
          originalPointsAmountPerPoint: "50",
        })
      ).toBe(false);
    });
  });

  describe("canSavePointsRule", () => {
    it("exige monto positivo y cambios pendientes", () => {
      expect(
        canSavePointsRule({
          numericPointsAmountPerPoint: 60,
          hasChanges: true,
        })
      ).toBe(true);

      expect(
        canSavePointsRule({
          numericPointsAmountPerPoint: 60,
          hasChanges: false,
        })
      ).toBe(false);

      expect(
        canSavePointsRule({
          numericPointsAmountPerPoint: 0,
          hasChanges: true,
        })
      ).toBe(false);
    });

    it("se bloquea mientras guarda o carga", () => {
      expect(
        canSavePointsRule({
          numericPointsAmountPerPoint: 60,
          hasChanges: true,
          savingPointsRule: true,
        })
      ).toBe(false);

      expect(
        canSavePointsRule({
          numericPointsAmountPerPoint: 60,
          hasChanges: true,
          loadingPointsRule: true,
        })
      ).toBe(false);
    });
  });

  describe("sanitizePointsAmountInput", () => {
    it("deja solo digitos y un punto", () => {
      expect(sanitizePointsAmountInput("50.50")).toBe("50.50");
      expect(sanitizePointsAmountInput("a1b2c3")).toBe("123");
    });

    it("recorta a dos decimales", () => {
      expect(sanitizePointsAmountInput("50.555")).toBe("50.55");
    });

    it("quita ceros a la izquierda", () => {
      expect(sanitizePointsAmountInput("050")).toBe("50");
    });
  });

  describe("buildRewardStatusConfirmation", () => {
    it("confirma la activacion de una recompensa inactiva", () => {
      const confirmation = buildRewardStatusConfirmation(
        buildReward({ is_active: false })
      );

      expect(confirmation.nextStatus).toBe(true);
      expect(confirmation.title).toBe("Activar recompensa");
      expect(confirmation.confirmText).toBe("Activar");
      expect(confirmation.message).toContain("activar");
    });

    it("confirma la desactivacion de una recompensa activa", () => {
      const confirmation = buildRewardStatusConfirmation(buildReward());

      expect(confirmation.nextStatus).toBe(false);
      expect(confirmation.title).toBe("Desactivar recompensa");
      expect(confirmation.confirmText).toBe("Desactivar");
    });
  });
});
