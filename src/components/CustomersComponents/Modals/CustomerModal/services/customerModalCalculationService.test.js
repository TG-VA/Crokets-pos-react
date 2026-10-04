import { describe, it, expect } from "vitest";

import {
  CUSTOMER_TOUCHED_FIELDS,
  EMPTY_CUSTOMER_FORM,
  MINIMUM_NAME_LENGTH,
  PHONE_LENGTH,
  buildCustomerFormValues,
  buildDuplicatePhoneMessage,
  buildDuplicatePointsCustomerMessage,
  buildNormalizedCustomerData,
  buildPhoneChangeConfirmation,
  canSubmitCustomerForm,
  getCustomerModalTitle,
  getCustomerSaveSuccessMessage,
  getCustomerSaveSuccessTitle,
  hasPhoneChanged,
  isEditingCustomer,
  normalizeCustomerEmail,
  normalizeCustomerFieldValue,
  normalizeCustomerName,
  normalizeCustomerPhone,
  validateCustomerValues,
} from "./customerModalCalculationService";

const validForm = {
  name: "ANA",
  phone: "5512345678",
  phoneConfirm: "5512345678",
  email: "ana@correo.com",
  status: true,
};

describe("customerModalCalculationService", () => {
  describe("constantes", () => {
    it("expone el formulario vacio y los campos marcados al tocar", () => {
      expect(EMPTY_CUSTOMER_FORM).toEqual({
        name: "",
        phone: "",
        phoneConfirm: "",
        email: "",
        status: true,
      });

      expect(CUSTOMER_TOUCHED_FIELDS).toEqual({
        name: true,
        phone: true,
        phoneConfirm: true,
        email: true,
      });
    });

    it("expone los limites de longitud", () => {
      expect(MINIMUM_NAME_LENGTH).toBe(3);
      expect(PHONE_LENGTH).toBe(10);
    });
  });

  describe("normalizaciones", () => {
    it("normaliza el nombre a mayusculas sin espacios redundantes", () => {
      // No recorta: el campo conserva lo que escribe el usuario mientras se
      // edita y el recorte final ocurre en buildNormalizedCustomerData.
      expect(normalizeCustomerName("  ana   lopez ")).toBe(" ANA LOPEZ ");
      expect(normalizeCustomerName("ana")).toBe("ANA");
      expect(normalizeCustomerName(null)).toBe("");
    });

    it("normaliza el telefono a 10 digitos", () => {
      expect(normalizeCustomerPhone("55 (1234) 5678")).toBe("5512345678");
      expect(normalizeCustomerPhone("551234567890")).toBe("5512345678");
      expect(normalizeCustomerPhone(undefined)).toBe("");
    });

    it("normaliza el correo a minusculas recortado", () => {
      expect(normalizeCustomerEmail("  ANA@Correo.COM ")).toBe(
        "ana@correo.com"
      );
      expect(normalizeCustomerEmail(null)).toBe("");
    });

    it("normaliza el campo segun su tipo", () => {
      expect(normalizeCustomerFieldValue("name", "ana")).toBe("ANA");
      expect(normalizeCustomerFieldValue("phone", "55-1234-5678")).toBe(
        "5512345678"
      );
      expect(normalizeCustomerFieldValue("phoneConfirm", "55-1234-5678")).toBe(
        "5512345678"
      );
      expect(normalizeCustomerFieldValue("email", " ANA@C.COM ")).toBe(
        "ana@c.com"
      );
    });

    it("deja intacto un campo sin normalizacion propia", () => {
      expect(normalizeCustomerFieldValue("status", false)).toBe(false);
    });
  });

  describe("validateCustomerValues", () => {
    it("no reporta errores con un formulario valido", () => {
      expect(validateCustomerValues(validForm)).toEqual({});
    });

    it("exige nombre de al menos 3 caracteres", () => {
      expect(validateCustomerValues({ ...validForm, name: "" }).name).toBe(
        "Ingresa el nombre del cliente."
      );

      expect(validateCustomerValues({ ...validForm, name: "AB" }).name).toBe(
        "El nombre debe tener al menos 3 caracteres."
      );
    });

    it("exige telefono de 10 digitos", () => {
      expect(validateCustomerValues({ ...validForm, phone: "" }).phone).toBe(
        "Ingresa el teléfono del cliente."
      );

      expect(
        validateCustomerValues({ ...validForm, phone: "5512" }).phone
      ).toBe("El teléfono debe tener 10 dígitos.");
    });

    it("exige confirmacion coincidente y de 10 digitos", () => {
      expect(
        validateCustomerValues({ ...validForm, phoneConfirm: "" }).phoneConfirm
      ).toBe("Confirma el teléfono del cliente.");

      expect(
        validateCustomerValues({ ...validForm, phoneConfirm: "5512" })
          .phoneConfirm
      ).toBe("La confirmación debe tener 10 dígitos.");

      expect(
        validateCustomerValues({ ...validForm, phoneConfirm: "5599999999" })
          .phoneConfirm
      ).toBe("Los teléfonos no coinciden.");
    });

    it("valida el correo solo cuando se informo algo", () => {
      expect(validateCustomerValues({ ...validForm, email: "" }).email).toBe(
        undefined
      );

      expect(
        validateCustomerValues({ ...validForm, email: "correo" }).email
      ).toBe("Ingresa un correo válido.");

      expect(validateCustomerValues({ ...validForm, email: "a@b" }).email).toBe(
        "Ingresa un correo válido."
      );
    });

    it("acumula los errores de todos los campos", () => {
      const errors = validateCustomerValues({
        name: "",
        phone: "1",
        phoneConfirm: "2",
        email: "x",
      });

      expect(Object.keys(errors).sort()).toEqual([
        "email",
        "name",
        "phone",
        "phoneConfirm",
      ]);
    });
  });

  describe("buildNormalizedCustomerData", () => {
    it("normaliza todos los campos antes de persistir", () => {
      expect(
        buildNormalizedCustomerData({
          name: "  ana  maria ",
          phone: "55-1234-5678",
          phoneConfirm: "55-1234-5678",
          email: " ANA@Correo.COM ",
          status: false,
        })
      ).toEqual({
        name: "ANA MARIA",
        phone: "5512345678",
        phoneConfirm: "5512345678",
        email: "ana@correo.com",
        status: false,
      });
    });

    it("tolera un formulario ausente", () => {
      expect(buildNormalizedCustomerData(null)).toEqual({
        name: "",
        phone: "",
        phoneConfirm: "",
        email: "",
        status: undefined,
      });
    });
  });

  describe("buildCustomerFormValues", () => {
    it("devuelve el formulario vacio sin cliente", () => {
      expect(buildCustomerFormValues(null)).toEqual(EMPTY_CUSTOMER_FORM);
      expect(buildCustomerFormValues(null)).not.toBe(EMPTY_CUSTOMER_FORM);
    });

    it("repite el telefono en la confirmacion", () => {
      expect(
        buildCustomerFormValues({
          id: "c1",
          name: "ANA",
          phone: "55-1234-5678",
          email: "ana@correo.com",
          status: true,
        })
      ).toEqual(validForm);
    });

    it("trata cualquier estado distinto de false como activo", () => {
      expect(buildCustomerFormValues({ id: "c1" }).status).toBe(true);
      expect(buildCustomerFormValues({ id: "c1", status: null }).status).toBe(
        true
      );
      expect(buildCustomerFormValues({ id: "c1", status: false }).status).toBe(
        false
      );
    });
  });

  describe("canSubmitCustomerForm", () => {
    it("habilita un formulario valido", () => {
      expect(
        canSubmitCustomerForm({
          formData: validForm,
          errors: {},
          saving: false,
        })
      ).toBe(true);
    });

    it("bloquea si queda algun error", () => {
      expect(
        canSubmitCustomerForm({
          formData: validForm,
          errors: { name: "Ingresa el nombre del cliente." },
          saving: false,
        })
      ).toBe(false);
    });

    it("bloquea si el nombre es muy corto o el telefono no coincide", () => {
      expect(
        canSubmitCustomerForm({
          formData: { ...validForm, name: "AB" },
          errors: {},
        })
      ).toBe(false);

      expect(
        canSubmitCustomerForm({
          formData: { ...validForm, phoneConfirm: "5599999999" },
          errors: {},
        })
      ).toBe(false);
    });

    it("se bloquea mientras guarda", () => {
      expect(
        canSubmitCustomerForm({
          formData: validForm,
          errors: {},
          saving: true,
        })
      ).toBe(false);
    });
  });

  describe("isEditingCustomer", () => {
    it("exige un cliente con id", () => {
      expect(isEditingCustomer({ id: "c1" })).toBe(true);
      expect(isEditingCustomer({ id: "" })).toBe(false);
      expect(isEditingCustomer({ name: "SIN ID" })).toBe(false);
      expect(isEditingCustomer(null)).toBe(false);
    });
  });

  describe("hasPhoneChanged", () => {
    it("solo aplica al editar", () => {
      expect(
        hasPhoneChanged({
          customerToEdit: { id: "c1", phone: "5512345678" },
          isEditing: false,
          newPhone: "5599999999",
        })
      ).toBe(false);
    });

    it("detecta el cambio real de telefono", () => {
      expect(
        hasPhoneChanged({
          customerToEdit: { id: "c1", phone: "5512345678" },
          isEditing: true,
          newPhone: "5599999999",
        })
      ).toBe(true);
    });

    it("no reporta cambio cuando el telefono se reedito igual", () => {
      expect(
        hasPhoneChanged({
          customerToEdit: { id: "c1", phone: "55-1234-5678" },
          isEditing: true,
          newPhone: "5512345678",
        })
      ).toBe(false);
    });
  });

  describe("mensajes de duplicados", () => {
    it("usa el nombre del cliente existente", () => {
      expect(buildDuplicatePhoneMessage({ name: "BRUNO" })).toBe(
        "Ya existe otro cliente registrado con ese teléfono: BRUNO."
      );
    });

    it("cae a la razon social y luego a SIN NOMBRE", () => {
      expect(
        buildDuplicatePhoneMessage({ razon_social: "EMPRESA SA" })
      ).toContain("EMPRESA SA");
      expect(buildDuplicatePhoneMessage(null)).toContain("SIN NOMBRE");
    });

    it("distingue el duplicado de cliente de puntos", () => {
      expect(buildDuplicatePointsCustomerMessage({ name: "BRUNO" })).toBe(
        "Ya existe un cliente de puntos registrado con ese teléfono: BRUNO."
      );
    });
  });

  describe("buildPhoneChangeConfirmation", () => {
    it("advierte del enlace con los datos fiscales", () => {
      const confirmation = buildPhoneChangeConfirmation({
        originalPhone: "5512345678",
        newPhone: "5599999999",
        hasFiscalData: true,
      });

      expect(confirmation.type).toBe("warning");
      expect(confirmation.title).toBe("Confirmar cambio de teléfono");
      expect(confirmation.confirmText).toBe("Continuar");
      expect(confirmation.cancelText).toBe("Cancelar");
      expect(confirmation.message).toContain("5512345678");
      expect(confirmation.message).toContain("5599999999");
      expect(confirmation.message).toContain("datos fiscales");
    });

    it("omite la advertencia cuando no hay datos fiscales", () => {
      const confirmation = buildPhoneChangeConfirmation({
        originalPhone: "5512345678",
        newPhone: "5599999999",
        hasFiscalData: false,
      });

      expect(confirmation.message).not.toContain(
        "también tiene datos fiscales"
      );
    });

    it("tolera el telefono original ausente", () => {
      expect(
        buildPhoneChangeConfirmation({
          newPhone: "5599999999",
        }).message
      ).toContain("SIN TELÉFONO");
    });
  });

  describe("textos del modal", () => {
    it("distingue alta de edicion", () => {
      expect(getCustomerModalTitle(false)).toBe("Nuevo cliente");
      expect(getCustomerModalTitle(true)).toBe("Editar cliente");

      expect(getCustomerSaveSuccessTitle(false)).toBe("Cliente creado");
      expect(getCustomerSaveSuccessTitle(true)).toBe("Cliente actualizado");

      expect(getCustomerSaveSuccessMessage(false)).toBe(
        "El cliente fue registrado correctamente."
      );
      expect(getCustomerSaveSuccessMessage(true)).toBe(
        "Los datos del cliente fueron actualizados correctamente."
      );
    });
  });
});
