import { describe, it, expect } from "vitest";

import {
  ALL_FISCAL_FIELDS_TOUCHED,
  EMPTY_FISCAL_FORM,
  buildFiscalConfirmMessage,
  buildFiscalCustomerPayload,
  buildFiscalFormFromCustomer,
  buildNormalizedFiscalValues,
} from "./fiscalCustomerCalculationService";

const customer = {
  id: "c1",
  name: "CLIENTE SA DE CV",
  phone: "55-1234-5678",
  email: "contacto@correo.com",
  fiscal_email: "Fiscal@Correo.com",
  rfc: "gode561231gr8",
  razon_social: "  centro   canino ",
  postal_code: "77500",
  tax_regime: "601",
  cfdi_use: "G03",
  address: "  AV. NOMBRE 123 ",
};

describe("fiscalCustomerCalculationService", () => {
  describe("buildFiscalFormFromCustomer", () => {
    it("normaliza el cliente al formulario con los limites de captura", () => {
      const form = buildFiscalFormFromCustomer(customer);

      expect(form.customerId).toBe("c1");
      expect(form.phone).toBe("5512345678");
      expect(form.fiscal_email).toBe("fiscal@correo.com");
      expect(form.rfc).toBe("GODE561231GR8");
      expect(form.postal_code).toBe("77500");
    });

    it("colapsa los espacios de la razon social", () => {
      expect(buildFiscalFormFromCustomer(customer).razon_social).toBe(
        " CENTRO CANINO "
      );
    });

    it("trunca los campos que tienen longitud maxima en la vista", () => {
      const form = buildFiscalFormFromCustomer({
        ...customer,
        phone: "551234567899999",
        rfc: "GODE561231GR8EXTRA",
        postal_code: "775001234",
      });

      expect(form.phone).toHaveLength(10);
      expect(form.rfc).toHaveLength(13);
      expect(form.postal_code).toHaveLength(5);
    });

    it("usa el correo comercial como respaldo cuando no hay correo fiscal", () => {
      const form = buildFiscalFormFromCustomer(
        { ...customer, fiscal_email: "" },
        { fallbackEmail: customer.email }
      );

      expect(form.fiscal_email).toBe("contacto@correo.com");
    });

    it("deja el correo vacio cuando no hay fiscal ni comercial", () => {
      const form = buildFiscalFormFromCustomer({
        ...customer,
        fiscal_email: "",
        email: "",
      });

      expect(form.fiscal_email).toBe("");
    });

    it("tolera un cliente sin datos fiscales", () => {
      const form = buildFiscalFormFromCustomer({ id: "c2" });

      expect(form.customerId).toBe("c2");
      expect(form.rfc).toBe("");
      expect(form.postal_code).toBe("");
      expect(form.razon_social).toBe("");
    });

    it("deja el id vacio para un alta, que es lo que decide el insert", () => {
      expect(buildFiscalFormFromCustomer({}).customerId).toBe("");
    });
  });

  describe("buildNormalizedFiscalValues", () => {
    it("devuelve los cinco valores ya normalizados para confirmar y guardar", () => {
      const values = buildNormalizedFiscalValues({
        razon_social: " centro  canino ",
        fiscal_email: " Fiscal@Correo.com ",
        phone: "55-1234-5678",
        postal_code: "77500",
        rfc: "gode561231gr8",
      });

      expect(values).toEqual({
        razonSocial: "CENTRO CANINO",
        fiscalEmail: "fiscal@correo.com",
        phone: "5512345678",
        postalCode: "77500",
        rfc: "GODE561231GR8",
      });
    });
  });

  describe("buildFiscalCustomerPayload", () => {
    const values = buildNormalizedFiscalValues({
      razon_social: "centro canino",
      fiscal_email: "fiscal@correo.com",
      phone: "5512345678",
      postal_code: "77500",
      rfc: "GODE561231GR8",
    });

    it("marca al cliente como fiscal y activo", () => {
      const payload = buildFiscalCustomerPayload(values, {
        tax_regime: "601",
        cfdi_use: "G03",
        address: "AV. NOMBRE 123",
      });

      expect(payload.is_billing_customer).toBe(true);
      expect(payload.status).toBe(true);
    });

    it("anula el nombre comercial porque en el CFDI manda la razon social", () => {
      const payload = buildFiscalCustomerPayload(values, {
        tax_regime: "601",
        cfdi_use: "G03",
        address: "AV. NOMBRE 123",
      });

      expect(payload.name).toBeNull();
      expect(payload.razon_social).toBe("CENTRO CANINO");
    });

    it("duplica el correo fiscal en el correo comercial", () => {
      const payload = buildFiscalCustomerPayload(values, {
        tax_regime: "601",
        cfdi_use: "G03",
        address: "AV. NOMBRE 123",
      });

      expect(payload.email).toBe("fiscal@correo.com");
      expect(payload.fiscal_email).toBe("fiscal@correo.com");
    });

    it("guarda la direccion vacia como null y no como cadena en blanco", () => {
      const payload = buildFiscalCustomerPayload(values, {
        tax_regime: "601",
        cfdi_use: "G03",
        address: "   ",
      });

      expect(payload.address).toBeNull();
    });

    it("sella la fila con la hora de actualizacion", () => {
      const payload = buildFiscalCustomerPayload(values, {
        tax_regime: "601",
        cfdi_use: "G03",
        address: "AV. NOMBRE 123",
      });

      expect(Number.isNaN(Date.parse(payload.updated_at))).toBe(false);
    });

    it("arrastra el regimen y el uso de CFDI del formulario", () => {
      const payload = buildFiscalCustomerPayload(values, {
        tax_regime: "612",
        cfdi_use: "S01",
        address: "AV. NOMBRE 123",
      });

      expect(payload.tax_regime).toBe("612");
      expect(payload.cfdi_use).toBe("S01");
    });
  });

  describe("buildFiscalConfirmMessage", () => {
    it("incluye RFC, razon social y la localidad del C.P.", () => {
      const values = buildNormalizedFiscalValues({
        razon_social: "centro canino",
        fiscal_email: "fiscal@correo.com",
        phone: "5512345678",
        postal_code: "77500",
        rfc: "GODE561231GR8",
      });

      const message = buildFiscalConfirmMessage(values, {
        municipality: "Benito Juarez",
        state: "Quintana Roo",
      });

      expect(message).toContain("GODE561231GR8");
      expect(message).toContain("CENTRO CANINO");
      expect(message).toContain("77500 - Benito Juarez, Quintana Roo");
    });

    it("no rompe cuando la ficha del C.P. todavia no llego", () => {
      const values = buildNormalizedFiscalValues({
        razon_social: "centro canino",
        fiscal_email: "fiscal@correo.com",
        phone: "5512345678",
        postal_code: "77500",
        rfc: "GODE561231GR8",
      });

      expect(() => buildFiscalConfirmMessage(values, null)).not.toThrow();
    });
  });

  describe("constantes del formulario", () => {
    it("expone el formulario vacio con los nueve campos del modal", () => {
      expect(EMPTY_FISCAL_FORM).toEqual({
        customerId: "",
        phone: "",
        fiscal_email: "",
        rfc: "",
        razon_social: "",
        postal_code: "",
        tax_regime: "",
        cfdi_use: "",
        address: "",
      });
    });

    it("expone los siete campos que se marcan al fallar la validacion", () => {
      expect(Object.keys(ALL_FISCAL_FIELDS_TOUCHED)).toHaveLength(7);
      expect(Object.values(ALL_FISCAL_FIELDS_TOUCHED).every(Boolean)).toBe(
        true
      );
    });
  });
});
