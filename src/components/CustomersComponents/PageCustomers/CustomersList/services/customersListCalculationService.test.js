import { describe, it, expect } from "vitest";

import {
  buildPointsCustomerFromFiscal,
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

    it("encuentra el telefono aunque el termino tenga guiones o espacios", () => {
      const customers = [
        buildCustomer({ id: "a", name: "ANA", phone: "5512345678" }),
        buildCustomer({ id: "b", name: "LUIS", phone: "5599999999" }),
      ];

      const ids = (searchTerm) =>
        filterAndSortCustomers({ customers, searchTerm }).map((c) => c.id);

      expect(ids("55-1234-5678")).toEqual(["a"]);
      expect(ids("55 1234")).toEqual(["a"]);
    });

    it("encuentra el telefono guardado con formato", () => {
      const customers = [
        buildCustomer({ id: "a", name: "ANA", phone: "(55) 1234-5678" }),
      ];

      expect(
        filterAndSortCustomers({ customers, searchTerm: "5512345678" })
      ).toHaveLength(1);
    });

    it("un termino sin digitos no coincide con todos los telefonos", () => {
      const customers = [
        buildCustomer({ id: "a", name: "ANA", email: "", phone: "5512345678" }),
        buildCustomer({
          id: "b",
          name: "LUIS",
          email: "",
          phone: "5599999999",
        }),
      ];

      expect(
        filterAndSortCustomers({ customers, searchTerm: "luis" }).map(
          (c) => c.id
        )
      ).toEqual(["b"]);
      expect(
        filterAndSortCustomers({ customers, searchTerm: "-" })
      ).toHaveLength(0);
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
