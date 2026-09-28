import { describe, it, expect } from "vitest";

import {
  buildPointsCustomerFromFiscal,
  calculatePointsBalanceByCustomer,
  filterAndSortCustomers,
  formatCustomerStatus,
  isCompletePhone,
  isPhoneAvailableInPoints,
} from "./customersListCalculationService";

const buildCustomer = (overrides = {}) => ({
  id: "c1",
  name: "ANA",
  phone: "5512345678",
  email: "ana@correo.com",
  status: true,
  ...overrides,
});

describe("customersListCalculationService", () => {
  describe("calculatePointsBalanceByCustomer", () => {
    it("devuelve un mapa vacio sin movimientos", () => {
      expect(calculatePointsBalanceByCustomer([])).toEqual({});
      expect(calculatePointsBalanceByCustomer()).toEqual({});
    });

    it("acumula por cliente", () => {
      const balance = calculatePointsBalanceByCustomer([
        { customer_id: "c1", points: 100 },
        { customer_id: "c2", points: 40 },
        { customer_id: "c1", points: -25 },
      ]);

      expect(balance).toEqual({ c1: 75, c2: 40 });
    });

    it("resta el valor absoluto de un canje aunque venga positivo", () => {
      const balance = calculatePointsBalanceByCustomer([
        { customer_id: "c1", points: 100, movement_type: "earn" },
        { customer_id: "c1", points: 30, movement_type: "redeem" },
      ]);

      expect(balance.c1).toBe(70);
    });

    it("descuenta solo el canje que la base admite", () => {
      // `chk_customer_points_movement_type` solo admite `earn` y `redeem`, asi
      // que la comparacion es exacta. Se conserva la tolerancia a mayusculas y
      // espacios por si quedaran filas anteriores a la restriccion.
      const balance = calculatePointsBalanceByCustomer([
        { customer_id: "c1", points: 10, movement_type: "REDEEM" },
        { customer_id: "c2", points: 10, movement_type: " redeem " },
        { customer_id: "c3", points: 10, movement_type: "earn" },
        { customer_id: "c4", points: 10, movement_type: "" },
      ]);

      expect(balance).toEqual({ c1: -10, c2: -10, c3: 10, c4: 10 });
    });

    it("ya no confunde otros tipos con un canje", () => {
      // Antes `canje`, `used`, `uso` y `resta` restaban por coincidencia de
      // subcadena. Ninguno puede existir en la base; este caso fija que la
      // clasificacion ya no depende de una lista de marcadores.
      const balance = calculatePointsBalanceByCustomer([
        { customer_id: "c1", points: 10, movement_type: "used" },
        { customer_id: "c2", points: 10, movement_type: "resta_manual" },
        { customer_id: "c3", points: 10, movement_type: "entrada" },
        { customer_id: "c4", points: 10, movement_type: "salida" },
        { customer_id: "c5", points: 10, movement_type: "sale" },
        { customer_id: "c6", points: 10, movement_type: "transfer" },
        { customer_id: "c7", points: 10, movement_type: "adjustment" },
      ]);

      expect(balance).toEqual({
        c1: 10,
        c2: 10,
        c3: 10,
        c4: 10,
        c5: 10,
        c6: 10,
        c7: 10,
      });
    });

    it("suma un canje que ya viene negativo", () => {
      const balance = calculatePointsBalanceByCustomer([
        { customer_id: "c1", points: 100 },
        { customer_id: "c1", points: -30, movement_type: "redeem" },
      ]);

      expect(balance.c1).toBe(70);
    });

    it("ignora movimientos sin customer_id", () => {
      const balance = calculatePointsBalanceByCustomer([
        { points: 999 },
        { customer_id: "c1", points: 10 },
      ]);

      expect(balance).toEqual({ c1: 10 });
    });
  });

  describe("filterAndSortCustomers", () => {
    it("filtra por estado", () => {
      const customers = [
        buildCustomer({ id: "a", name: "ACTIVO", status: true }),
        buildCustomer({ id: "b", name: "INACTIVO", status: false }),
      ];

      expect(
        filterAndSortCustomers({ customers, statusFilter: "inactive" })
      ).toHaveLength(1);
      expect(
        filterAndSortCustomers({ customers, statusFilter: "active" })
      ).toHaveLength(1);
      expect(
        filterAndSortCustomers({ customers, statusFilter: "all" })
      ).toHaveLength(2);
    });

    it("busca en nombre, telefono y correo sin distinguir mayusculas", () => {
      const customers = [
        buildCustomer({ id: "a", name: "ANA", phone: "5511111111" }),
        buildCustomer({ id: "b", name: "BRUNO", phone: "5522222222" }),
      ];

      const result = filterAndSortCustomers({
        customers,
        searchTerm: "bruno",
      });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("b");
    });

    it("coloca los inactivos al final y ordena por nombre", () => {
      const customers = [
        buildCustomer({ id: "1", name: "ZETA", status: false }),
        buildCustomer({ id: "2", name: "CARLOS", status: true }),
        buildCustomer({ id: "3", name: "ANA", status: true }),
      ];

      const result = filterAndSortCustomers({ customers });

      expect(result.map((customer) => customer.name)).toEqual([
        "ANA",
        "CARLOS",
        "ZETA",
      ]);
    });

    it("no muta la lista original", () => {
      const customers = [
        buildCustomer({ id: "1", name: "B" }),
        buildCustomer({ id: "2", name: "A" }),
      ];
      const originalOrder = customers.map((customer) => customer.id);

      filterAndSortCustomers({ customers });

      expect(customers.map((customer) => customer.id)).toEqual(originalOrder);
    });

    it("tolera argumentos vacios", () => {
      expect(filterAndSortCustomers()).toEqual([]);
    });
  });

  describe("formatCustomerStatus", () => {
    it("marca como inactivo solo el false explicito", () => {
      expect(formatCustomerStatus(false)).toBe("INACTIVO");
      expect(formatCustomerStatus(true)).toBe("ACTIVO");
      expect(formatCustomerStatus(undefined)).toBe("ACTIVO");
      expect(formatCustomerStatus(null)).toBe("ACTIVO");
    });
  });

  describe("isCompletePhone", () => {
    it("exige 10 digitos", () => {
      expect(isCompletePhone("5512345678")).toBe(true);
      expect(isCompletePhone("551234567")).toBe(false);
      expect(isCompletePhone("55123456789")).toBe(false);
      expect(isCompletePhone("")).toBe(false);
    });
  });

  describe("isPhoneAvailableInPoints", () => {
    it("devuelve true si ningun cliente de puntos usa ese telefono", () => {
      expect(
        isPhoneAvailableInPoints({
          customers: [buildCustomer({ phone: "5511111111" })],
          phone: "5522222222",
        })
      ).toBe(true);
    });

    it("devuelve false si el telefono ya pertenece a un cliente de puntos", () => {
      expect(
        isPhoneAvailableInPoints({
          customers: [buildCustomer({ phone: "5512345678" })],
          phone: "5512345678",
        })
      ).toBe(false);
    });

    it("tolera clientes sin telefono", () => {
      expect(
        isPhoneAvailableInPoints({
          customers: [{ name: "SIN TELEFONO" }],
          phone: "5512345678",
        })
      ).toBe(true);
    });
  });

  describe("buildPointsCustomerFromFiscal", () => {
    it("usa la razon social cuando no hay nombre", () => {
      const result = buildPointsCustomerFromFiscal({
        id: "f1",
        razon_social: "EMPRESA SA DE CV",
        status: true,
      });

      expect(result.name).toBe("EMPRESA SA DE CV");
    });

    it("conserva el id para que el modal actualice el registro existente", () => {
      const result = buildPointsCustomerFromFiscal({
        id: "f1",
        name: "EMPRESA",
      });

      expect(result.id).toBe("f1");
    });

    it("normaliza el estado a booleano", () => {
      expect(
        buildPointsCustomerFromFiscal({ id: "f1", status: false }).status
      ).toBe(false);
      expect(buildPointsCustomerFromFiscal({ id: "f1" }).status).toBe(true);
    });

    it("devuelve null sin cliente", () => {
      expect(buildPointsCustomerFromFiscal(null)).toBeNull();
    });
  });
});
