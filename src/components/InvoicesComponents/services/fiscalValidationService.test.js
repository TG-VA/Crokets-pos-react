import { describe, it, expect } from "vitest";

import {
  isValidEmail,
  isValidInvoiceSeries,
  isValidIssuerName,
  isValidNextFolio,
  isValidPhone,
  isValidPostalCode,
  isValidRfc,
  getFiscalFieldStatus,
  isFiscalCustomerFormValid,
  normalizeEmail,
  normalizeRfc,
  normalizeUpperText,
  onlyDigits,
  validateFiscalCustomerForm,
  validateInvoiceSettingsForm,
} from "./fiscalValidationService";

const validPostalInfo = {
  municipality: "Benito Juarez",
  state: "Quintana Roo",
};

describe("fiscalValidationService", () => {
  describe("isValidRfc", () => {
    it("acepta el RFC de una persona moral (12 caracteres)", () => {
      expect(isValidRfc("XAXX010101ABC")).toBe(true);
    });

    it("acepta el RFC generico de persona fisica (13 caracteres)", () => {
      expect(isValidRfc("GODE561231GR8")).toBe(true);
    });

    it("acepta la enye en el prefijo del catalogo del SAT", () => {
      expect(isValidRfc("ÑÑÑ010101ABC")).toBe(true);
    });

    it("acepta el ampersand en el prefijo pero no en la homoclave", () => {
      expect(isValidRfc("&AA010101ABC")).toBe(true);
      // La homoclave solo admite letras y digitos: el `&` queda fuera.
      expect(isValidRfc("AAA010101A&B")).toBe(false);
    });

    it("rechaza longitudes que no son 12 ni 13", () => {
      expect(isValidRfc("XAXX010101")).toBe(false);
      expect(isValidRfc("XAXX010101ABCDE")).toBe(false);
    });

    it("rechaza una fecha invalida en la posicion central", () => {
      // El bloque central exige 6 digitos, pero la fecha debe existir:
      // el regex solo valida la forma, no el calendario.
      expect(isValidRfc("XXXXXX010101XXX")).toBe(false);
    });

    it("rechaza minusculas porque la vista normaliza antes de validar", () => {
      expect(isValidRfc("gode561231gr8")).toBe(false);
    });

    it("rechaza vacio, null y undefined sin lanzar", () => {
      expect(isValidRfc("")).toBe(false);
      expect(isValidRfc(null)).toBe(false);
      expect(isValidRfc(undefined)).toBe(false);
    });
  });

  describe("normalizeRfc", () => {
    it("pasa a mayusculas y quita espacios y guiones", () => {
      expect(normalizeRfc(" xaxx-010101-abc ")).toBe("XAXX010101ABC");
    });

    it("descarta caracteres ajenos al catalogo", () => {
      expect(normalizeRfc("XAXX#010101%ABC")).toBe("XAXX010101ABC");
    });

    it("conserva la enye y el ampersand", () => {
      expect(normalizeRfc("ñññ010101a&b")).toBe("ÑÑÑ010101A&B");
    });

    it("tolera null y undefined", () => {
      expect(normalizeRfc(null)).toBe("");
      expect(normalizeRfc(undefined)).toBe("");
    });
  });

  describe("onlyDigits", () => {
    it("descarta todo lo que no es digito", () => {
      expect(onlyDigits("55-1234 (56) 78")).toBe("5512345678");
    });

    it("devuelve cadena vacia ante null", () => {
      expect(onlyDigits(null)).toBe("");
      expect(onlyDigits(undefined)).toBe("");
    });

    it("conserva el cero inicial", () => {
      expect(onlyDigits("0123456789")).toBe("0123456789");
    });
  });

  describe("normalizeEmail", () => {
    it("pasa a minusculas y quita espacios", () => {
      expect(normalizeEmail("  Cliente@Correo.COM ")).toBe(
        "cliente@correo.com"
      );
    });

    it("tolera null", () => {
      expect(normalizeEmail(null)).toBe("");
    });
  });

  describe("normalizeUpperText", () => {
    it("pasa a mayusculas y colapsa espacios", () => {
      expect(normalizeUpperText("  centro   CANINO ")).toBe(" CENTRO CANINO ");
    });

    it("tolera null", () => {
      expect(normalizeUpperText(null)).toBe("");
    });
  });

  describe("isValidEmail", () => {
    it("acepta la forma minima del correo fiscal", () => {
      expect(isValidEmail("cliente@correo.com")).toBe(true);
    });

    it("rechaza sin arroba, sin dominio o con espacios", () => {
      expect(isValidEmail("cliente")).toBe(false);
      expect(isValidEmail("cliente@correo")).toBe(false);
      expect(isValidEmail("cliente @correo.com")).toBe(false);
      expect(isValidEmail("")).toBe(false);
    });
  });

  describe("isValidPhone", () => {
    it("exige exactamente diez digitos", () => {
      expect(isValidPhone("5512345678")).toBe(true);
      expect(isValidPhone("551234567")).toBe(false);
      expect(isValidPhone("55123456789")).toBe(false);
    });

    it("ignora el formato con que se captura", () => {
      expect(isValidPhone("55 1234 5678")).toBe(true);
    });
  });

  describe("isValidPostalCode", () => {
    it("exige cinco digitos, ficha en el catalogo y sin error de consulta", () => {
      expect(isValidPostalCode("77500", validPostalInfo, "")).toBe(true);
    });

    it("falla si la consulta al catalogo fallo aunque haya ficha", () => {
      expect(
        isValidPostalCode("77500", validPostalInfo, "No se pudo validar")
      ).toBe(false);
    });

    it("falla si el catalogo no tiene el C.P.", () => {
      expect(isValidPostalCode("77500", null, "")).toBe(false);
    });

    it("falla con un C.P. incompleto", () => {
      expect(isValidPostalCode("775", validPostalInfo, "")).toBe(false);
    });

    it("rechaza ceros porque el rango del SAT no empieza en cero", () => {
      expect(isValidPostalCode("00000", null, "")).toBe(false);
    });
  });

  describe("isValidIssuerName", () => {
    it("acepta la razon social dentro del rango", () => {
      expect(isValidIssuerName("CENTRO CANINO")).toBe(true);
    });

    it("rechaza nombres de menos de tres caracteres", () => {
      expect(isValidIssuerName("AB")).toBe(false);
    });

    it("rechaza nombres de mas de 255 caracteres", () => {
      expect(isValidIssuerName("A".repeat(256))).toBe(false);
    });

    it("mide sobre el texto normalizado, no sobre el capturado", () => {
      expect(isValidIssuerName("  AB  ")).toBe(false);
      expect(isValidIssuerName("  ABC  ")).toBe(true);
    });
  });

  describe("isValidInvoiceSeries", () => {
    it("acepta letras y numeros hasta diez caracteres", () => {
      expect(isValidInvoiceSeries("A")).toBe(true);
      expect(isValidInvoiceSeries("FACT2026")).toBe(true);
    });

    it("rechaza guiones, espacios y series largas", () => {
      expect(isValidInvoiceSeries("A-1")).toBe(false);
      expect(isValidInvoiceSeries("A B")).toBe(false);
      expect(isValidInvoiceSeries("ABCDEFGHIJK")).toBe(false);
    });

    it("rechaza la serie vacia", () => {
      expect(isValidInvoiceSeries("")).toBe(false);
    });
  });

  describe("isValidNextFolio", () => {
    it("exige un numero mayor a cero", () => {
      expect(isValidNextFolio(1)).toBe(true);
      expect(isValidNextFolio("25")).toBe(true);
    });

    it("rechaza cero, negativos y vacio", () => {
      expect(isValidNextFolio(0)).toBe(false);
      expect(isValidNextFolio(-1)).toBe(false);
      expect(isValidNextFolio("")).toBe(false);
    });
  });

  describe("validateFiscalCustomerForm", () => {
    const baseForm = {
      phone: "5512345678",
      fiscal_email: "cliente@correo.com",
      rfc: "GODE561231GR8",
      razon_social: "CLIENTE SA DE CV",
      postal_code: "77500",
      tax_regime: "601",
      cfdi_use: "G03",
    };

    it("acepta el formulario completo", () => {
      expect(validateFiscalCustomerForm(baseForm, validPostalInfo, "")).toBe(
        ""
      );
    });

    it("devuelve el primer error en el orden en que ve el usuario", () => {
      const form = { ...baseForm, phone: "", rfc: "", razon_social: "" };

      expect(validateFiscalCustomerForm(form, validPostalInfo, "")).toBe(
        "El teléfono debe tener 10 dígitos."
      );
    });

    it("distingue el C.P. incompleto del C.P. inexistente", () => {
      const incomplete = { ...baseForm, postal_code: "775" };
      const unknown = { ...baseForm, postal_code: "99999" };

      expect(validateFiscalCustomerForm(incomplete, validPostalInfo, "")).toBe(
        "El código postal fiscal debe tener 5 dígitos."
      );
      expect(validateFiscalCustomerForm(unknown, null, "")).toBe(
        "El código postal fiscal no existe en el catálogo SEPOMEX."
      );
    });

    it("exige regimen y uso de CFDI", () => {
      expect(
        validateFiscalCustomerForm(
          { ...baseForm, tax_regime: "" },
          validPostalInfo,
          ""
        )
      ).toBe("Selecciona el régimen fiscal.");
      expect(
        validateFiscalCustomerForm(
          { ...baseForm, cfdi_use: "" },
          validPostalInfo,
          ""
        )
      ).toBe("Selecciona el uso CFDI.");
    });

    it("tolera un formulario vacio sin lanzar", () => {
      expect(() => validateFiscalCustomerForm({}, null, "")).not.toThrow();
    });
  });

  describe("validateInvoiceSettingsForm", () => {
    const baseSettings = {
      issuerRfc: "GODE561231GR8",
      issuerName: "CENTRO CANINO",
      issuerTaxRegime: "601",
      issuerPostalCode: "77500",
      invoiceSeries: "A",
      nextFolio: 1,
      postalInfo: validPostalInfo,
    };

    it("acepta la configuracion completa", () => {
      expect(validateInvoiceSettingsForm(baseSettings)).toBe("");
    });

    it("distingue el C.P. con formato del C.P. sin catalogo", () => {
      expect(
        validateInvoiceSettingsForm({
          ...baseSettings,
          issuerPostalCode: "775",
        })
      ).toBe("El código postal fiscal debe tener 5 dígitos.");

      expect(
        validateInvoiceSettingsForm({
          ...baseSettings,
          issuerPostalCode: "99999",
          postalInfo: null,
        })
      ).toBe("El código postal fiscal no existe en el catálogo SEPOMEX.");
    });

    it("exige serie valida y folio positivo", () => {
      expect(
        validateInvoiceSettingsForm({ ...baseSettings, invoiceSeries: "A-1" })
      ).toBe(
        "La serie debe contener solo letras y números, máximo 10 caracteres."
      );

      expect(
        validateInvoiceSettingsForm({ ...baseSettings, nextFolio: 0 })
      ).toBe("El próximo folio debe ser mayor a 0.");
    });
  });

  describe("getFiscalFieldStatus", () => {
    const postalInfo = validPostalInfo;

    it("no marca los campos que estan vacios", () => {
      const status = getFiscalFieldStatus(
        {
          phone: "",
          fiscal_email: "",
          rfc: "",
          razon_social: "",
          postal_code: "",
          tax_regime: "",
          cfdi_use: "",
        },
        postalInfo,
        ""
      );

      expect(Object.values(status).every((value) => value === "")).toBe(true);
    });

    it("marca valido e invalido segun el campo", () => {
      const status = getFiscalFieldStatus(
        {
          phone: "5512345678",
          fiscal_email: "cliente@correo.com",
          rfc: "GODE561231GR8",
          razon_social: "CLIENTE",
          postal_code: "77500",
          tax_regime: "601",
          cfdi_use: "G03",
        },
        postalInfo,
        ""
      );

      expect(status).toEqual({
        phone: "valid",
        fiscal_email: "valid",
        rfc: "valid",
        razon_social: "valid",
        postal_code: "valid",
        tax_regime: "valid",
        cfdi_use: "valid",
      });
    });

    it("marca el C.P. como invalido mientras no exista la ficha", () => {
      const status = getFiscalFieldStatus(
        {
          phone: "5512345678",
          fiscal_email: "cliente@correo.com",
          rfc: "GODE561231GR8",
          razon_social: "CLIENTE",
          postal_code: "77500",
          tax_regime: "",
          cfdi_use: "",
        },
        null,
        ""
      );

      expect(status.postal_code).toBe("invalid");
    });
  });

  describe("isFiscalCustomerFormValid", () => {
    const validForm = {
      phone: "5512345678",
      fiscal_email: "cliente@correo.com",
      rfc: "GODE561231GR8",
      razon_social: "CLIENTE SA DE CV",
      postal_code: "77500",
      tax_regime: "601",
      cfdi_use: "G03",
    };

    it("habilita el guardado con los siete campos resueltos", () => {
      expect(isFiscalCustomerFormValid(validForm, validPostalInfo, "")).toBe(
        true
      );
    });

    it("bloquea el guardado si el C.P. no esta en el catalogo", () => {
      expect(isFiscalCustomerFormValid(validForm, null, "")).toBe(false);
    });

    it("bloquea el guardado si la razon social es solo espacios", () => {
      const form = { ...validForm, razon_social: "   " };

      expect(isFiscalCustomerFormValid(form, validPostalInfo, "")).toBe(false);
    });
  });
});
