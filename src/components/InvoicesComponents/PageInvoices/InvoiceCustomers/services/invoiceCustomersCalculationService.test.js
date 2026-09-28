import { describe, it, expect, vi } from "vitest";

import {
  buildAdminAuthMessage,
  buildCatalogMap,
  buildPointsCustomerForFiscalModal,
  buildStatusConfirmMessage,
  buildStatusSuccessMessage,
  filterInvoiceCustomers,
  formatCustomerStatus,
  getCustomerDisplayName,
  getCustomerSortName,
  isPhoneAlreadyFiscalCustomer,
  sortCustomersByStatusAndName,
} from "./invoiceCustomersCalculationService";

vi.mock("../../../utils/invoiceFormatters", () => ({
  normalizePhoneDigits: vi.fn((v) =>
    String(v || "")
      .replace(/\D/g, "")
      .slice(0, 10)
  ),
}));

describe("invoiceCustomersCalculationService", () => {
  describe("getCustomerSortName", () => {
    it("prioriza razon social, luego nombre, luego RFC", () => {
      expect(getCustomerSortName({ razon_social: "ABC", name: "ZZZ" })).toBe(
        "ABC"
      );
      expect(getCustomerSortName({ name: "ZZZ", rfc: "RFC" })).toBe("ZZZ");
      expect(getCustomerSortName({ rfc: "RFC" })).toBe("RFC");
    });

    it("devuelve el valor por defecto cuando no hay datos", () => {
      expect(getCustomerSortName({})).toBe("SIN RAZÓN SOCIAL");
    });
  });

  describe("getCustomerDisplayName", () => {
    it("devuelve el nombre para mostrar en confirmaciones", () => {
      expect(getCustomerDisplayName({ razon_social: "ABC" })).toBe("ABC");
      expect(getCustomerDisplayName(null)).toBe("SIN RAZÓN SOCIAL");
    });
  });

  describe("formatCustomerStatus", () => {
    it("formatea el estado para la tabla", () => {
      expect(formatCustomerStatus(true)).toBe("ACTIVO");
      expect(formatCustomerStatus(false)).toBe("INACTIVO");
      expect(formatCustomerStatus(undefined)).toBe("ACTIVO");
    });
  });

  describe("sortCustomersByStatusAndName", () => {
    it("ordena activos antes que inactivos", () => {
      const list = [
        { status: false, razon_social: "ZETA" },
        { status: true, razon_social: "ALFA" },
      ];

      const sorted = sortCustomersByStatusAndName(list);

      expect(sorted[0].razon_social).toBe("ALFA");
      expect(sorted[1].razon_social).toBe("ZETA");
    });

    it("ordena alfabeticamente dentro del mismo estado", () => {
      const list = [
        { status: true, razon_social: "ZETA" },
        { status: true, razon_social: "ALFA" },
      ];

      expect(sortCustomersByStatusAndName(list)[0].razon_social).toBe("ALFA");
    });

    it("no muta la lista de entrada", () => {
      const list = [{ status: true, razon_social: "ALFA" }];
      const copy = [...list];

      sortCustomersByStatusAndName(list);

      expect(list).toEqual(copy);
    });
  });

  describe("filterInvoiceCustomers", () => {
    const customers = [
      {
        id: "c1",
        status: true,
        razon_social: "CLIENTE UNO",
        rfc: "RFC1",
        phone: "5512345678",
        fiscal_email: "uno@correo.com",
      },
      { id: "c2", status: false, razon_social: "CLIENTE DOS" },
    ];

    it("filtra por estado", () => {
      expect(filterInvoiceCustomers(customers, "", "active")).toHaveLength(1);
      expect(filterInvoiceCustomers(customers, "", "inactive")).toHaveLength(1);
    });

    it("filtra por texto en varios campos", () => {
      expect(filterInvoiceCustomers(customers, "551234", "all")).toHaveLength(
        1
      );
      expect(filterInvoiceCustomers(customers, "RFC1", "all")).toHaveLength(1);
    });

    it("devuelve el orden aplicado por estado y nombre", () => {
      const result = filterInvoiceCustomers(customers, "CLIENTE", "all");

      expect(result[0].id).toBe("c1");
      expect(result[1].id).toBe("c2");
    });
  });

  describe("buildCatalogMap", () => {
    it("construye un mapa id->descripcion", () => {
      expect(buildCatalogMap([{ id: "601", description: "General" }])).toEqual({
        601: "General",
      });
    });

    it("acepta catalogo vacio", () => {
      expect(buildCatalogMap()).toEqual({});
    });
  });

  describe("isPhoneAlreadyFiscalCustomer", () => {
    it("encuentra el telefono aunque tenga formato distinto", () => {
      expect(
        isPhoneAlreadyFiscalCustomer([{ phone: "55-1234-5678" }], "5512345678")
      ).toBe(true);
    });

    it("devuelve false cuando el telefono esta vacio", () => {
      expect(isPhoneAlreadyFiscalCustomer([], "")).toBe(false);
    });

    it("devuelve false cuando no coincide", () => {
      expect(
        isPhoneAlreadyFiscalCustomer([{ phone: "5512345678" }], "5598765432")
      ).toBe(false);
    });
  });

  describe("buildPointsCustomerForFiscalModal", () => {
    it("completa los campos que el cliente de puntos puede no tener", () => {
      const customer = buildPointsCustomerForFiscalModal({ name: "X" });

      expect(customer.razon_social).toBe("");
      expect(customer.phone).toBe("");
      expect(customer.fiscal_email).toBe("");
      expect(customer.status).toBe(true);
    });

    it("respeta el status false", () => {
      expect(buildPointsCustomerForFiscalModal({ status: false }).status).toBe(
        false
      );
    });
  });

  describe("buildStatusConfirmMessage", () => {
    it("genera el mensaje correcto para activar/desactivar", () => {
      expect(
        buildStatusConfirmMessage({ razon_social: "ABC" }, true)
      ).toContain("activar");
      expect(
        buildStatusConfirmMessage({ razon_social: "ABC" }, false)
      ).toContain("desactivar");
    });
  });

  describe("buildStatusSuccessMessage", () => {
    it("genera el mensaje de exito", () => {
      expect(
        buildStatusSuccessMessage({ razon_social: "ABC" }, true)
      ).toContain("activado");
      expect(
        buildStatusSuccessMessage({ razon_social: "ABC" }, false)
      ).toContain("desactivado");
    });
  });

  describe("buildAdminAuthMessage", () => {
    it("incluye el nombre cuando hay cliente", () => {
      expect(buildAdminAuthMessage({ razon_social: "ABC" })).toContain("ABC");
    });

    it("usa el mensaje generico cuando no hay cliente", () => {
      expect(buildAdminAuthMessage(null)).toContain("autorización");
    });
  });
});
