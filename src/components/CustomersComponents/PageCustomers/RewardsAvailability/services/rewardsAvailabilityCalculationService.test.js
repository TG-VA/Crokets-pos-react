import { describe, it, expect } from "vitest";

import {
  calculateRewardsStats,
  getRewardStatus,
  getRewardTypeLabel,
  isSearchableCustomerTerm,
} from "./rewardsAvailabilityCalculationService";

const buildReward = (overrides = {}) => ({
  id: "r1",
  name: "RECOMPENSA",
  points_required: 100,
  reward_type: "free_product",
  ...overrides,
});

describe("rewardsAvailabilityCalculationService", () => {
  describe("calculateRewardsStats", () => {
    it("no marca nada como disponible sin cliente seleccionado", () => {
      const stats = calculateRewardsStats({
        rewards: [buildReward(), buildReward({ id: "r2" })],
        customerPoints: 9999,
        hasSelectedCustomer: false,
      });

      expect(stats).toEqual({ available: 0, unavailable: 0, total: 2 });
    });

    it("cuenta las recompensas alcanzables con el saldo", () => {
      const stats = calculateRewardsStats({
        rewards: [
          buildReward({ id: "r1", points_required: 50 }),
          buildReward({ id: "r2", points_required: 150 }),
          buildReward({ id: "r3", points_required: 100 }),
        ],
        customerPoints: 100,
        hasSelectedCustomer: true,
      });

      expect(stats).toEqual({ available: 2, unavailable: 1, total: 3 });
    });

    it("cuenta como disponible la recompensa que iguala el saldo", () => {
      const stats = calculateRewardsStats({
        rewards: [buildReward({ points_required: 100 })],
        customerPoints: 100,
        hasSelectedCustomer: true,
      });

      expect(stats.available).toBe(1);
    });

    it("tolera listas vacias", () => {
      expect(
        calculateRewardsStats({ rewards: [], hasSelectedCustomer: true })
      ).toEqual({ available: 0, unavailable: 0, total: 0 });
    });
  });

  describe("getRewardTypeLabel", () => {
    it("etiqueta producto gratis", () => {
      expect(getRewardTypeLabel({ reward_type: "free_product" })).toBe(
        "Producto gratis"
      );
    });

    it("detalla el descuento segun su tipo", () => {
      expect(
        getRewardTypeLabel({
          reward_type: "product_discount",
          discount_type: "percent",
          discount_value: 15,
        })
      ).toBe("Descuento 15%");

      expect(
        getRewardTypeLabel({
          reward_type: "product_discount",
          discount_type: "fixed",
          discount_value: 50,
        })
      ).toBe("Descuento $50.00");
    });

    it("usa la etiqueta generica para un descuento sin tipo", () => {
      expect(getRewardTypeLabel({ reward_type: "product_discount" })).toBe(
        "Descuento en producto"
      );
    });

    it("cae a Recompensa con un tipo desconocido", () => {
      expect(getRewardTypeLabel({ reward_type: "otro_tipo" })).toBe(
        "Recompensa"
      );
      expect(getRewardTypeLabel(null)).toBe("Recompensa");
    });
  });

  describe("getRewardStatus", () => {
    it("pide un cliente cuando no hay ninguno seleccionado", () => {
      expect(
        getRewardStatus({
          reward: buildReward(),
          customerPoints: 500,
          hasSelectedCustomer: false,
        })
      ).toEqual({ label: "Selecciona un cliente", status: "neutral" });
    });

    it("marca disponible cuando el saldo alcanza", () => {
      expect(
        getRewardStatus({
          reward: buildReward({ points_required: 100 }),
          customerPoints: 150,
          hasSelectedCustomer: true,
        })
      ).toEqual({
        label: "Disponible para canje en ventas",
        status: "available",
      });
    });

    it("indica cuantos puntos faltan", () => {
      expect(
        getRewardStatus({
          reward: buildReward({ points_required: 100 }),
          customerPoints: 40,
          hasSelectedCustomer: true,
        })
      ).toEqual({ label: "Faltan 60 puntos", status: "unavailable" });
    });
  });

  describe("isSearchableCustomerTerm", () => {
    it("exige al menos 2 caracteres", () => {
      expect(isSearchableCustomerTerm("A")).toBe(false);
      expect(isSearchableCustomerTerm("  A  ")).toBe(false);
      expect(isSearchableCustomerTerm("AN")).toBe(true);
      expect(isSearchableCustomerTerm("")).toBe(false);
      expect(isSearchableCustomerTerm(null)).toBe(false);
    });
  });
});
