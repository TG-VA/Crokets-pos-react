import { describe, it, expect } from "vitest";
import { sortKits, KIT_SORT_CRITERIA } from "./kitsSortService";

const NOW = new Date("2026-06-15T18:00:00Z");

const makeKit = (id, name, price, endsOn, extra = {}) => ({
  id,
  is_active: true,
  starts_on: null,
  ends_on: endsOn,
  products: { name, sale_price: price },
  ...extra,
});

const ids = (kits) => kits.map((kit) => kit.id);

describe("sortKits", () => {
  it("ordena por vencimiento y deja al final los kits sin fecha de fin", () => {
    const kits = [
      makeKit(1, "A", 10, null),
      makeKit(2, "B", 10, "2026-07-10"),
      makeKit(3, "C", 10, "2026-06-20"),
    ];

    expect(ids(sortKits(kits, KIT_SORT_CRITERIA.EXPIRY))).toEqual([3, 2, 1]);
  });

  it("ordena por descripcion sin distinguir mayusculas ni acentos", () => {
    const kits = [
      makeKit(1, "zeta", 10, null),
      makeKit(2, "Árbol", 10, null),
      makeKit(3, "beta", 10, null),
    ];

    expect(ids(sortKits(kits, KIT_SORT_CRITERIA.DESCRIPTION))).toEqual([
      2, 3, 1,
    ]);
  });

  it("ordena por precio de menor a mayor", () => {
    const kits = [
      makeKit(1, "A", 300, null),
      makeKit(2, "B", 100, null),
      makeKit(3, "C", 200, null),
    ];

    expect(ids(sortKits(kits, KIT_SORT_CRITERIA.PRICE))).toEqual([2, 3, 1]);
  });

  it("ordena por estado: vigente, programado, vencido, inactivo", () => {
    const kits = [
      makeKit(1, "A", 10, null, { is_active: false }),
      makeKit(2, "B", 10, "2026-01-01"),
      makeKit(3, "C", 10, null, { starts_on: "2026-09-01" }),
      makeKit(4, "D", 10, null),
    ];

    expect(ids(sortKits(kits, KIT_SORT_CRITERIA.STATUS, { now: NOW }))).toEqual(
      [4, 3, 2, 1]
    );
  });

  it("no muta el arreglo original y conserva el orden ante empates", () => {
    const kits = [makeKit(1, "A", 10, null), makeKit(2, "B", 10, null)];
    const snapshot = [...kits];

    const sorted = sortKits(kits, KIT_SORT_CRITERIA.PRICE);

    expect(kits).toEqual(snapshot);
    expect(sorted).not.toBe(kits);
    expect(ids(sorted)).toEqual([1, 2]);
  });

  it("devuelve una copia en el mismo orden ante un criterio desconocido", () => {
    const kits = [makeKit(2, "B", 10, null), makeKit(1, "A", 10, null)];

    expect(ids(sortKits(kits, "otro"))).toEqual([2, 1]);
    expect(sortKits(undefined, KIT_SORT_CRITERIA.PRICE)).toEqual([]);
  });
});
