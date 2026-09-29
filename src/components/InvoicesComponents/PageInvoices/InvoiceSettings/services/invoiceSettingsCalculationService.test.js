import { describe, it, expect } from "vitest";

import {
  EMPTY_SETTINGS_FORM,
  PRODUCTION_CONFIRM_MESSAGE,
  buildSettingsConfirmMessage,
  buildSettingsFormFromRow,
  buildSettingsPayload,
  getConnectionState,
  getNormalizedIssuerName,
  getSettingsFieldValidity,
  isSettingsFormValid,
  normalizeSettingsField,
} from "./invoiceSettingsCalculationService";

const validForm = {
  ...EMPTY_SETTINGS_FORM,
  issuer_rfc: "GODE561231GR8",
  issuer_name: "Crokets SA DE CV",
  issuer_tax_regime: "601",
  issuer_postal_code: "77500",
  invoice_series: "A",
  next_folio: "5",
};

const styles = {
  statusConnected: "statusConnected",
  statusError: "statusError",
  statusPending: "statusPending",
};

describe("invoiceSettingsCalculationService", () => {
  describe("normalizeSettingsField", () => {
    it("deja el RFC solo con alfanumericos y el ampersand, en mayusculas", () => {
      expect(normalizeSettingsField("issuer_rfc", "gode-561231 gr8")).toBe(
        "GODE561231GR8"
      );
    });

    it("conserva el ampersand de la persona fisica", () => {
      expect(normalizeSettingsField("issuer_rfc", "aaaa010101&x")).toBe(
        "AAAA010101&X"
      );
    });

    it("trunca el RFC a trece caracteres", () => {
      expect(normalizeSettingsField("issuer_rfc", "GODE561231GR8EXTRA")).toBe(
        "GODE561231GR8"
      );
    });

    it("pasa la razon social a mayusculas y colapsa espacios", () => {
      expect(
        normalizeSettingsField("issuer_name", "  crokets   SA  de cv ")
      ).toBe(" CROKETS SA DE CV ");
    });

    it("deja el C.P. en cinco digitos", () => {
      expect(normalizeSettingsField("issuer_postal_code", "77-500-12")).toBe(
        "77500"
      );
    });

    it("deja la serie en alfanumericos y hasta diez caracteres", () => {
      expect(normalizeSettingsField("invoice_series", "a-1-b")).toBe("A1B");
      expect(normalizeSettingsField("invoice_series", "abcdefghijklm")).toBe(
        "ABCDEFGHIJ"
      );
    });

    it("deja el siguiente folio solo con digitos, sin truncar", () => {
      expect(normalizeSettingsField("next_folio", "1a2b3")).toBe("123");
    });

    it("deja pasar los campos sin regla propia", () => {
      expect(normalizeSettingsField("provider", "facturama")).toBe("facturama");
      expect(normalizeSettingsField("api_token", "  abc  ")).toBe("  abc  ");
    });
  });

  describe("getNormalizedIssuerName", () => {
    it("colapsa espacios y recorta los extremos", () => {
      expect(getNormalizedIssuerName("  crokets   SA de cv  ")).toBe(
        "crokets SA de cv"
      );
    });

    it("devuelve cadena vacia cuando no hay nombre", () => {
      expect(getNormalizedIssuerName(null)).toBe("");
      expect(getNormalizedIssuerName(undefined)).toBe("");
    });
  });

  describe("getSettingsFieldValidity", () => {
    it("marca los cinco campos cuando el formulario esta completo", () => {
      const postalInfo = {
        municipality: "Benito Juarez",
        state: "Quintana Roo",
      };

      expect(getSettingsFieldValidity(validForm, postalInfo, null)).toEqual({
        issuerRfc: true,
        issuerName: true,
        postalCode: true,
        series: true,
        folio: true,
      });
    });

    it("rechaza el C.P. cuando SEPOMEX no ha resuelto la localidad", () => {
      expect(getSettingsFieldValidity(validForm, null, null).postalCode).toBe(
        false
      );
    });

    it("rechaza el C.P. mientras la consulta de SEPOMEX siga en vuelo", () => {
      const validity = getSettingsFieldValidity(validForm, null, "");

      expect(validity.postalCode).toBe(false);
    });

    it("rechaza el C.P. cuando la consulta de SEPOMEX fallo", () => {
      const validity = getSettingsFieldValidity(
        validForm,
        null,
        "No se encontro"
      );

      expect(validity.postalCode).toBe(false);
    });

    it("rechaza un RFC de longitud invalida", () => {
      const postalInfo = { municipality: "Benito Juarez" };

      expect(
        getSettingsFieldValidity(
          { ...validForm, issuer_rfc: "ABC" },
          postalInfo,
          null
        ).issuerRfc
      ).toBe(false);
    });

    it("rechaza un folio que ya existe segun el PAC", () => {
      const postalInfo = { municipality: "Benito Juarez" };

      expect(
        getSettingsFieldValidity(
          { ...validForm, next_folio: "0" },
          postalInfo,
          null
        ).folio
      ).toBe(false);
    });
  });

  describe("isSettingsFormValid", () => {
    it("acepta la configuracion completa y resuelta", () => {
      expect(isSettingsFormValid(validForm, { municipality: "BJ" }, null)).toBe(
        true
      );
    });

    it("exige proveedor", () => {
      expect(
        isSettingsFormValid({ ...validForm, provider: "" }, null, null)
      ).toBe(false);
    });

    it("exige ambiente", () => {
      expect(
        isSettingsFormValid({ ...validForm, environment: "" }, null, null)
      ).toBe(false);
    });

    it("exige el regimen fiscal del emisor", () => {
      expect(
        isSettingsFormValid({ ...validForm, issuer_tax_regime: "" }, null, null)
      ).toBe(false);
    });
  });

  describe("buildSettingsFormFromRow", () => {
    it("traduce la fila completa al formulario", () => {
      const row = {
        provider: "facturama",
        environment: "production",
        issuer_rfc: "GODE561231GR8",
        issuer_name: "Crokets SA DE CV",
        issuer_tax_regime: "601",
        issuer_postal_code: "77500",
        invoice_series: "A",
        next_folio: 42,
        api_username: "user",
        api_password: "pass",
        api_token: "token",
        status: true,
        connection_status: "connected",
        timbres_available: 10,
      };

      expect(buildSettingsFormFromRow(row)).toMatchObject(row);
    });

    it("aplica los valores por defecto cuando la tabla viene vacia", () => {
      const form = buildSettingsFormFromRow({});

      expect(form.provider).toBe("facturama");
      expect(form.environment).toBe("sandbox");
      expect(form.invoice_series).toBe("A");
      expect(form.next_folio).toBe(1);
      expect(form.connection_status).toBe("not_configured");
    });

    it("trata status null como alta activa y status false como baja", () => {
      expect(buildSettingsFormFromRow({ status: null }).status).toBe(true);
      expect(buildSettingsFormFromRow({ status: false }).status).toBe(false);
    });
  });

  describe("buildSettingsPayload", () => {
    it("normaliza la razon social y el folio antes de persistir", () => {
      const payload = buildSettingsPayload({
        ...validForm,
        issuer_name: "  crokets   SA de cv  ",
        next_folio: " 42 ",
      });

      expect(payload.issuer_name).toBe("crokets SA de cv");
      expect(payload.next_folio).toBe(42);
    });

    it("guarda las credenciales vacias como null, no como cadena en blanco", () => {
      const payload = buildSettingsPayload({
        ...validForm,
        api_username: "  ",
        api_password: "",
        api_token: "   ",
      });

      expect(payload.api_username).toBeNull();
      expect(payload.api_password).toBeNull();
      expect(payload.api_token).toBeNull();
    });

    it("conserva las credenciales tal cual cuando si existen", () => {
      const payload = buildSettingsPayload({
        ...validForm,
        api_username: " user ",
        api_password: " pass ",
        api_token: " token ",
      });

      expect(payload.api_username).toBe("user");
      expect(payload.api_password).toBe("pass");
      expect(payload.api_token).toBe("token");
    });

    it("normaliza los timbres disponibles a numero", () => {
      expect(
        buildSettingsPayload({ ...validForm, timbres_available: "7" })
          .timbres_available
      ).toBe(7);
      expect(
        buildSettingsPayload({ ...validForm, timbres_available: "" })
          .timbres_available
      ).toBe(0);
    });

    it("sella la hora de actualizacion", () => {
      expect(
        Number.isNaN(Date.parse(buildSettingsPayload(validForm).updated_at))
      ).toBe(false);
    });

    it("no arrastra al payload los campos que son solo de la vista", () => {
      expect(buildSettingsPayload(validForm)).not.toHaveProperty(
        "last_connection_test_x"
      );
    });
  });

  describe("buildSettingsConfirmMessage", () => {
    it("incluye RFC, razon social y localidad del C.P.", () => {
      const message = buildSettingsConfirmMessage(validForm, {
        municipality: "Benito Juarez",
        state: "Quintana Roo",
      });

      expect(message).toContain("GODE561231GR8");
      expect(message).toContain("Crokets SA DE CV");
      expect(message).toContain("77500 - Benito Juarez, Quintana Roo");
    });
  });

  describe("PRODUCTION_CONFIRM_MESSAGE", () => {
    it("advierte que las facturas emitidas tendran validez fiscal", () => {
      expect(PRODUCTION_CONFIRM_MESSAGE).toContain("PRODUCCIÓN");
      expect(PRODUCTION_CONFIRM_MESSAGE).toContain("validez fiscal");
    });
  });

  describe("getConnectionState", () => {
    it("traduce los tres estados de la tarjeta con su clase CSS", () => {
      expect(getConnectionState("connected", styles)).toEqual({
        label: "Conectado correctamente",
        className: "statusConnected",
      });
      expect(getConnectionState("error", styles)).toEqual({
        label: "Error de conexión",
        className: "statusError",
      });
      expect(getConnectionState("not_configured", styles)).toEqual({
        label: "No configurado",
        className: "statusPending",
      });
    });

    it("cae al estado pendiente ante cualquier valor desconocido", () => {
      expect(getConnectionState("raro", styles).className).toBe(
        "statusPending"
      );
      expect(getConnectionState(null, styles).className).toBe("statusPending");
    });
  });
});
