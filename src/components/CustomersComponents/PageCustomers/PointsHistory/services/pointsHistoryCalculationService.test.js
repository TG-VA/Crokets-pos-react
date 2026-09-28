import { describe, it, expect } from "vitest";

import {
  calculateMovementsSummary,
  filterMovements,
  filterMovementsByCustomerSearch,
  formatMovementDateTime,
  formatSaleFolio,
  getMovementBadgeClassName,
  getMovementBranchName,
  getMovementCustomerName,
  getMovementLabel,
  getMovementNotes,
  getMovementPoints,
  getMovementUserName,
  getMotiveFromNotes,
  getReturnedAmountFromNotes,
  getSourceLabel,
  matchesCustomerSearch,
  resolveCustomerSearchLabel,
} from "./pointsHistoryCalculationService";

const buildMovement = (overrides = {}) => ({
  id: "m1",
  points: 100,
  movement_type: "earn",
  source: "sale",
  created_at: "2026-03-01T12:00:00Z",
  ...overrides,
});

const badgeClasses = {
  movementReturn: "movementReturn",
  movementEarn: "movementEarn",
  movementRedeem: "movementRedeem",
};

describe("pointsHistoryCalculationService", () => {
  describe("getMovementPoints", () => {
    it("normaliza a numero", () => {
      expect(getMovementPoints({ points: "40" })).toBe(40);
      expect(getMovementPoints({ points: null })).toBe(0);
      expect(getMovementPoints({})).toBe(0);
    });
  });

  describe("getMovementLabel", () => {
    it("distingue devolucion de descuento en una cancelacion", () => {
      expect(
        getMovementLabel(buildMovement({ source: "cancellation", points: 50 }))
      ).toBe("PUNTOS DEVUELTOS");

      expect(
        getMovementLabel(buildMovement({ source: "cancellation", points: -50 }))
      ).toBe("PUNTOS DESCONTADOS");
    });

    it("etiqueta los demas origenes", () => {
      expect(
        getMovementLabel(buildMovement({ source: "partial_return" }))
      ).toBe("DEVOLUCIÓN");
      expect(getMovementLabel(buildMovement({ source: "reward" }))).toBe(
        "CANJE"
      );
      expect(getMovementLabel(buildMovement({ source: "sale" }))).toBe(
        "GANADO"
      );
    });

    it("marca el signo de un ajuste manual", () => {
      expect(
        getMovementLabel(buildMovement({ source: "manual", points: 25 }))
      ).toBe("AJUSTE +");

      expect(
        getMovementLabel(buildMovement({ source: "manual", points: -25 }))
      ).toBe("AJUSTE -");
    });

    it("cae a GANADO o DESCONTADO segun el tipo de movimiento", () => {
      expect(getMovementLabel(buildMovement({ movement_type: "earn" }))).toBe(
        "GANADO"
      );
      expect(getMovementLabel(buildMovement({ movement_type: "redeem" }))).toBe(
        "DESCONTADO"
      );
      expect(getMovementLabel(buildMovement({ movement_type: "otro" }))).toBe(
        "OTRO"
      );
    });
  });

  describe("getMovementBadgeClassName", () => {
    it("distingue la devolucion positiva de una cancelacion", () => {
      expect(
        getMovementBadgeClassName({
          movement: buildMovement({
            source: "cancellation",
            points: 50,
          }),
          ...badgeClasses,
        })
      ).toBe("movementReturn");

      expect(
        getMovementBadgeClassName({
          movement: buildMovement({
            source: "cancellation",
            points: -50,
          }),
          ...badgeClasses,
        })
      ).toBe("movementRedeem");
    });

    it("marca el ajuste manual segun su signo", () => {
      expect(
        getMovementBadgeClassName({
          movement: buildMovement({ source: "manual", points: 10 }),
          ...badgeClasses,
        })
      ).toBe("movementEarn");

      expect(
        getMovementBadgeClassName({
          movement: buildMovement({ source: "manual", points: -10 }),
          ...badgeClasses,
        })
      ).toBe("movementRedeem");
    });

    it("trata earn como suma y cualquier otro caso como resta", () => {
      expect(
        getMovementBadgeClassName({
          movement: buildMovement({ movement_type: "earn" }),
          ...badgeClasses,
        })
      ).toBe("movementEarn");

      expect(
        getMovementBadgeClassName({
          movement: buildMovement({ movement_type: "redeem" }),
          ...badgeClasses,
        })
      ).toBe("movementRedeem");
    });
  });

  describe("getSourceLabel", () => {
    it("etiqueta los origenes conocidos", () => {
      expect(getSourceLabel("sale")).toBe("VENTA");
      expect(getSourceLabel("manual")).toBe("MANUAL");
      expect(getSourceLabel("reward")).toBe("RECOMPENSA");
      expect(getSourceLabel("cancellation")).toBe("CANCELACIÓN");
      expect(getSourceLabel("partial_return")).toBe("DEVOLUCIÓN PARCIAL");
    });

    it("cae a SIN ORIGEN", () => {
      expect(getSourceLabel("desconocido")).toBe("SIN ORIGEN");
      expect(getSourceLabel(undefined)).toBe("SIN ORIGEN");
    });
  });

  describe("formatSaleFolio", () => {
    it("recorta el folio a 8 caracteres en mayusculas", () => {
      expect(formatSaleFolio("abc-123-def")).toBe("ABC-123-");
    });

    it("devuelve SIN FOLIO sin valor", () => {
      expect(formatSaleFolio(null)).toBe("SIN FOLIO");
    });
  });

  describe("formatMovementDateTime", () => {
    it("formatea la fecha en espanol", () => {
      const formatted = formatMovementDateTime("2026-03-01T12:00:00Z");

      expect(formatted).toContain("2026");
      expect(formatted).toContain("03");
    });

    it("devuelve SIN FECHA ante un valor ausente o invalido", () => {
      expect(formatMovementDateTime(null)).toBe("SIN FECHA");
      expect(formatMovementDateTime("no-es-una-fecha")).toBe("SIN FECHA");
    });
  });

  describe("getReturnedAmountFromNotes", () => {
    it("extrae el monto de las notas", () => {
      expect(getReturnedAmountFromNotes("DEVOLUCION $1,250.50")).toBe(
        "$1,250.50"
      );
    });

    it("devuelve cadena vacia si no hay monto", () => {
      expect(getReturnedAmountFromNotes("SIN MONTO")).toBe("");
    });
  });

  describe("getMotiveFromNotes", () => {
    it("extrae el motivo tras el prefijo MOTIVO", () => {
      expect(
        getMotiveFromNotes("MOTIVO: Producto devuelto. El cliente...")
      ).toBe("PRODUCTO DEVUELTO");
    });

    it("usa las notas completas cuando no hay prefijo", () => {
      expect(getMotiveFromNotes("ajuste manual")).toBe("AJUSTE MANUAL");
    });

    it("devuelve cadena vacia sin notas", () => {
      expect(getMotiveFromNotes("")).toBe("");
    });
  });

  describe("getMovementNotes / getMovementBranchName", () => {
    it("normaliza las notas", () => {
      expect(getMovementNotes({ notes: "  pago   con tarjeta " })).toBe(
        "PAGO CON TARJETA"
      );
    });

    it("usa el nombre de la sucursal y cae a su codigo", () => {
      expect(
        getMovementBranchName({ branches: { name: "centro", code: "CEN" } })
      ).toBe("CENTRO");

      expect(getMovementBranchName({ branches: { code: "CEN" } })).toBe("CEN");
      expect(getMovementBranchName({})).toBe("SIN SUCURSAL");
    });
  });

  describe("getMovementCustomerName / getMovementUserName", () => {
    it("normaliza el nombre del cliente y cae a SIN CLIENTE", () => {
      expect(getMovementCustomerName({ customers: { name: " ana " } })).toBe(
        "ANA"
      );
      expect(getMovementCustomerName({})).toBe("SIN CLIENTE");
    });

    it("normaliza el usuario y cae a SIN USUARIO", () => {
      expect(getMovementUserName({ users: { username: "admin " } })).toBe(
        "ADMIN"
      );
      expect(getMovementUserName({})).toBe("SIN USUARIO");
    });
  });

  describe("matchesCustomerSearch", () => {
    const movement = buildMovement({
      customers: {
        name: "ANA",
        phone: "5512345678",
        email: "ana@correo.com",
      },
    });

    it("coincide por nombre, telefono o correo", () => {
      expect(matchesCustomerSearch(movement, "ana")).toBe(true);
      expect(matchesCustomerSearch(movement, "5512")).toBe(true);
      expect(matchesCustomerSearch(movement, "ana@")).toBe(true);
      expect(matchesCustomerSearch(movement, "bruno")).toBe(false);
    });

    it("compara en minusculas contra los datos normalizados", () => {
      // El helper es de bajo nivel: espera el termino ya recortado y en
      // minusculas, como lo entrega filterMovementsByCustomerSearch.
      expect(matchesCustomerSearch(movement, "ana")).toBe(true);
      expect(matchesCustomerSearch(movement, "ANA")).toBe(false);
    });

    it("coincide con todo cuando el termino esta vacio", () => {
      expect(matchesCustomerSearch(movement, "")).toBe(true);
      expect(matchesCustomerSearch(movement, undefined)).toBe(true);
    });
  });

  describe("filterMovementsByCustomerSearch", () => {
    const movements = [
      buildMovement({ id: "1", customers: { name: "ANA" } }),
      buildMovement({ id: "2", customers: { name: "BRUNO" } }),
    ];

    it("devuelve todo sin busqueda", () => {
      expect(filterMovementsByCustomerSearch({ movements })).toHaveLength(2);
    });

    it("filtra por nombre, telefono o correo", () => {
      expect(
        filterMovementsByCustomerSearch({ movements, searchTerm: "bruno" })
      ).toHaveLength(1);

      expect(
        filterMovementsByCustomerSearch({
          movements: [
            buildMovement({ id: "1", customers: { phone: "5512345678" } }),
          ],
          searchTerm: "5512",
        })
      ).toHaveLength(1);
    });
  });

  describe("filterMovements", () => {
    const movements = [
      buildMovement({
        id: "1",
        branch_id: "b1",
        movement_type: "earn",
        customers: { name: "ANA" },
      }),
      buildMovement({
        id: "2",
        branch_id: "b2",
        movement_type: "redeem",
        customers: { name: "BRUNO" },
      }),
    ];

    it("filtra por tipo de movimiento", () => {
      expect(
        filterMovements({ movements, movementFilter: "redeem" })
      ).toHaveLength(1);
      expect(filterMovements({ movements })).toHaveLength(2);
    });

    it("filtra por sucursal", () => {
      expect(filterMovements({ movements, branchFilter: "b1" })[0].id).toBe(
        "1"
      );
    });

    it("combina busqueda, sucursal y tipo", () => {
      const result = filterMovements({
        movements,
        searchTerm: "bruno",
        branchFilter: "b2",
        movementFilter: "redeem",
      });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("2");
    });
  });

  describe("calculateMovementsSummary", () => {
    it("separa ganados, canjeados y saldo", () => {
      const summary = calculateMovementsSummary([
        { points: 100 },
        { points: -30 },
        { points: 5 },
      ]);

      expect(summary).toEqual({
        total: 3,
        earned: 105,
        redeemed: 30,
        balance: 75,
      });
    });

    it("devuelve el resumen vacio en cero", () => {
      expect(calculateMovementsSummary([])).toEqual({
        total: 0,
        earned: 0,
        redeemed: 0,
        balance: 0,
      });
    });
  });

  describe("resolveCustomerSearchLabel", () => {
    it("muestra el nombre del primer cliente que coincide", () => {
      const label = resolveCustomerSearchLabel({
        movements: [
          buildMovement({ id: "1", customers: { name: "ANA" } }),
          buildMovement({ id: "2", customers: { name: "ANA LOPEZ" } }),
        ],
        searchTerm: "ana",
      });

      expect(label).toBe("ANA");
    });

    it("devuelve cadena vacia sin busqueda", () => {
      expect(
        resolveCustomerSearchLabel({ movements: [], searchTerm: "  " })
      ).toBe("");
    });

    it("normaliza el termino cuando no hay coincidencias", () => {
      expect(
        resolveCustomerSearchLabel({
          movements: [buildMovement({ customers: { name: "OTRO" } })],
          searchTerm: "zzz",
        })
      ).toBe("ZZZ");
    });
  });
});
