import { describe, it, expect, vi, afterEach } from "vitest";

import {
  ADJUSTMENT_REASON_OPTIONS,
  ADJUSTMENT_VALIDATION_CONTEXTS,
  ADMIN_AUTH_STORAGE_KEY,
  BLOCKED_GENERIC_NOTES,
  MINIMUM_NOTES_LENGTH,
  buildAdjustmentSuccessMessage,
  buildFinalNotes,
  buildPointsMovementPayload,
  getPreviewNotes,
  calculateNewBalance,
  calculateSignedPoints,
  canSubmitPointsAdjustment,
  findAdjustmentReason,
  getAdjustmentValidationMessage,
  getProfileRoleName,
  getSaveGuardMessage,
  isAdminProfile,
  isGenericNote,
  normalizeNotes,
  sanitizePointsAmountInput,
} from "./pointsAdjustmentCalculationService";

const validAdjustment = {
  adminAccessStatus: "allowed",
  selectedCustomer: { id: "c1", name: "ANA", status: true },
  numericPoints: 50,
  adjustmentType: "add",
  adjustmentReason: "migration",
  normalizedNotes: "MIGRACION DE PUNTOS DESDE SISTEMA ANTERIOR",
  isGenericNote: false,
  saving: false,
  newBalance: 150,
};

describe("pointsAdjustmentCalculationService", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  describe("constantes", () => {
    it("expone la llave de autorizacion administrativa", () => {
      expect(ADMIN_AUTH_STORAGE_KEY).toBe(
        "customers_points_adjustment_admin_authorized"
      );
    });

    it("cataloga los motivos admitidos", () => {
      expect(ADJUSTMENT_REASON_OPTIONS.map((reason) => reason.value)).toEqual([
        "migration",
        "administrative_correction",
        "authorized_compensation",
        "operational_error",
        "customer_clarification",
        "other",
      ]);
    });

    it("rechaza los motivos sin valor de auditoria", () => {
      expect(BLOCKED_GENERIC_NOTES).toContain("PRUEBA");
      expect(BLOCKED_GENERIC_NOTES).toContain("OK");
      expect(BLOCKED_GENERIC_NOTES).toContain("AJUSTE");
      expect(MINIMUM_NOTES_LENGTH).toBe(5);
    });
  });

  describe("findAdjustmentReason", () => {
    it("devuelve la opcion del motivo", () => {
      expect(findAdjustmentReason("migration").label).toBe(
        "MIGRACIÓN DE PUNTOS DESDE SISTEMA ANTERIOR"
      );
    });

    it("devuelve undefined para un motivo desconocido", () => {
      expect(findAdjustmentReason("inventado")).toBeUndefined();
      expect(findAdjustmentReason("")).toBeUndefined();
    });
  });

  describe("buildFinalNotes", () => {
    it("usa la etiqueta del catalogo", () => {
      expect(buildFinalNotes({ adjustmentReason: "migration" })).toBe(
        "MIGRACIÓN DE PUNTOS DESDE SISTEMA ANTERIOR"
      );
    });

    it("usa el texto libre solo en el motivo OTRO", () => {
      expect(
        buildFinalNotes({
          adjustmentReason: "other",
          notes: "  Compensacion autorizada  ",
        })
      ).toBe("Compensacion autorizada");
    });

    it("devuelve cadena vacia sin motivo", () => {
      expect(buildFinalNotes({ adjustmentReason: "", notes: "algo" })).toBe("");
    });
  });

  describe("normalizeNotes", () => {
    it("colapsa espacios, recorta y pasa a mayusculas", () => {
      expect(normalizeNotes("  pago   con  tarjeta ")).toBe("PAGO CON TARJETA");
    });

    it("tolera valores nulos", () => {
      expect(normalizeNotes(null)).toBe("");
    });
  });

  describe("isGenericNote", () => {
    it("rechaza las notas genericas del motivo libre", () => {
      for (const note of BLOCKED_GENERIC_NOTES) {
        expect(
          isGenericNote({
            adjustmentReason: "other",
            normalizedNotes: note,
          })
        ).toBe(true);
      }
    });

    it("acepta un motivo especifico en el motivo libre", () => {
      expect(
        isGenericNote({
          adjustmentReason: "other",
          normalizedNotes: "COMPRA DUPLICADA EN TIENDA 3",
        })
      ).toBe(false);
    });

    it("nunca marca las etiquetas del catalogo", () => {
      expect(
        isGenericNote({
          adjustmentReason: "migration",
          normalizedNotes: "PRUEBA",
        })
      ).toBe(false);
    });
  });

  describe("calculateSignedPoints", () => {
    it("posiciona segun el tipo de ajuste", () => {
      expect(
        calculateSignedPoints({ numericPoints: 50, adjustmentType: "add" })
      ).toBe(50);
      expect(
        calculateSignedPoints({ numericPoints: 50, adjustmentType: "subtract" })
      ).toBe(-50);
    });

    it("devuelve 0 sin cantidad", () => {
      expect(
        calculateSignedPoints({ numericPoints: 0, adjustmentType: "add" })
      ).toBe(0);
      expect(calculateSignedPoints({ adjustmentType: "add" })).toBe(0);
    });
  });

  describe("calculateNewBalance", () => {
    it("suma el ajuste con signo al saldo", () => {
      expect(
        calculateNewBalance({ currentPoints: 100, signedPoints: 50 })
      ).toBe(150);
      expect(
        calculateNewBalance({ currentPoints: 100, signedPoints: -50 })
      ).toBe(50);
    });

    it("tolera saldo ausente", () => {
      expect(calculateNewBalance({ signedPoints: 25 })).toBe(25);
    });
  });

  describe("canSubmitPointsAdjustment", () => {
    it("habilita un ajuste valido", () => {
      expect(canSubmitPointsAdjustment(validAdjustment)).toBe(true);
    });

    it("exige acceso de administrador", () => {
      expect(
        canSubmitPointsAdjustment({
          ...validAdjustment,
          adminAccessStatus: "checking",
        })
      ).toBe(false);
      expect(
        canSubmitPointsAdjustment({
          ...validAdjustment,
          adminAccessStatus: "denied",
        })
      ).toBe(false);
    });

    it("exige cliente seleccionado y activo", () => {
      expect(
        canSubmitPointsAdjustment({
          ...validAdjustment,
          selectedCustomer: null,
        })
      ).toBe(false);

      expect(
        canSubmitPointsAdjustment({
          ...validAdjustment,
          selectedCustomer: { id: "c1", status: false },
        })
      ).toBe(false);
    });

    it("exige una cantidad positiva", () => {
      expect(
        canSubmitPointsAdjustment({ ...validAdjustment, numericPoints: 0 })
      ).toBe(false);
    });

    it("exige motivo y detalle suficiente", () => {
      expect(
        canSubmitPointsAdjustment({
          ...validAdjustment,
          adjustmentReason: "",
        })
      ).toBe(false);

      expect(
        canSubmitPointsAdjustment({
          ...validAdjustment,
          normalizedNotes: "PAGO",
        })
      ).toBe(false);
    });

    it("rechaza el motivo generico", () => {
      expect(
        canSubmitPointsAdjustment({ ...validAdjustment, isGenericNote: true })
      ).toBe(false);
    });

    it("se bloquea mientras guarda", () => {
      expect(
        canSubmitPointsAdjustment({ ...validAdjustment, saving: true })
      ).toBe(false);
    });

    it("impide que un descuento deje el saldo en negativo", () => {
      expect(
        canSubmitPointsAdjustment({
          ...validAdjustment,
          adjustmentType: "subtract",
          newBalance: -1,
        })
      ).toBe(false);

      expect(
        canSubmitPointsAdjustment({
          ...validAdjustment,
          adjustmentType: "subtract",
          newBalance: 0,
        })
      ).toBe(true);
    });

    it("permite un saldo negativo preexistente si el ajuste suma", () => {
      expect(
        canSubmitPointsAdjustment({
          ...validAdjustment,
          adjustmentType: "add",
          newBalance: -5,
        })
      ).toBe(true);
    });
  });

  describe("getAdjustmentValidationMessage", () => {
    it("devuelve null para un ajuste valido", () => {
      expect(getAdjustmentValidationMessage(validAdjustment)).toBeNull();
    });

    it("bloquea primero el acceso restringido", () => {
      expect(
        getAdjustmentValidationMessage({
          ...validAdjustment,
          adminAccessStatus: "denied",
        })
      ).toEqual({
        title: "Acceso restringido",
        message: "Solo un administrador puede realizar ajustes manuales.",
      });
    });

    it("usa el mensaje de cliente faltante del contexto de revision", () => {
      expect(
        getAdjustmentValidationMessage({
          ...validAdjustment,
          selectedCustomer: null,
        })
      ).toEqual({
        title: "Selecciona un cliente",
        message: ADJUSTMENT_VALIDATION_CONTEXTS.review.missingCustomerMessage,
      });
    });

    it("advierte sobre el cliente inactivo", () => {
      expect(
        getAdjustmentValidationMessage({
          ...validAdjustment,
          selectedCustomer: { id: "c1", status: false },
        })
      ).toEqual({
        title: "Cliente inactivo",
        message: ADJUSTMENT_VALIDATION_CONTEXTS.review.inactiveCustomerMessage,
      });
    });

    it("rechaza cantidad no positiva", () => {
      expect(
        getAdjustmentValidationMessage({ ...validAdjustment, numericPoints: 0 })
      ).toEqual({
        title: "Puntos inválidos",
        message: "Ingresa una cantidad de puntos mayor a 0.",
      });
    });

    it("rechaza el descuento mayor al saldo", () => {
      expect(
        getAdjustmentValidationMessage({
          ...validAdjustment,
          adjustmentType: "subtract",
          newBalance: -1,
        })
      ).toEqual({
        title: "Saldo insuficiente",
        message: "No puedes descontar más puntos de los que tiene el cliente.",
      });
    });

    it("rechaza el motivo faltante, incompleto o generico", () => {
      expect(
        getAdjustmentValidationMessage({
          ...validAdjustment,
          adjustmentReason: "",
        })
      ).toEqual({
        title: "Motivo requerido",
        message: "Selecciona el motivo del ajuste.",
      });

      expect(
        getAdjustmentValidationMessage({
          ...validAdjustment,
          normalizedNotes: "PAGO",
        })
      ).toEqual({
        title: "Motivo incompleto",
        message: "Ingresa un motivo del ajuste de al menos 5 caracteres.",
      });

      expect(
        getAdjustmentValidationMessage({
          ...validAdjustment,
          isGenericNote: true,
        })
      ).toEqual({
        title: "Motivo demasiado genérico",
        message:
          "El motivo es demasiado genérico. Escribe un motivo más específico para auditoría.",
      });
    });
  });

  describe("getSaveGuardMessage", () => {
    it("revalida el acceso al guardar con el contexto de confirmacion", () => {
      expect(getSaveGuardMessage({ ...validAdjustment })).toBeNull();

      expect(
        getSaveGuardMessage({ ...validAdjustment, selectedCustomer: null })
      ).toEqual({
        title: "Selecciona un cliente",
        message: ADJUSTMENT_VALIDATION_CONTEXTS.confirm.missingCustomerMessage,
      });
    });

    it("difiere del mensaje de revision", () => {
      expect(
        getSaveGuardMessage({ ...validAdjustment, selectedCustomer: null })
          .message
      ).not.toBe(
        getAdjustmentValidationMessage({
          ...validAdjustment,
          selectedCustomer: null,
        }).message
      );
    });

    it("rechaza el cliente que se desactivo entre la revision y el guardado", () => {
      expect(
        getSaveGuardMessage({
          ...validAdjustment,
          selectedCustomer: { id: "c1", status: false },
        })
      ).toEqual({
        title: "Cliente inactivo",
        message: ADJUSTMENT_VALIDATION_CONTEXTS.confirm.inactiveCustomerMessage,
      });
    });

    it("vuelve al contexto de revision ante un contexto desconocido", () => {
      expect(
        getSaveGuardMessage({
          ...validAdjustment,
          selectedCustomer: null,
          context: "inventado",
        }).message
      ).toBe(ADJUSTMENT_VALIDATION_CONTEXTS.review.missingCustomerMessage);
    });
  });

  describe("getProfileRoleName / isAdminProfile", () => {
    it("lee el rol como objeto o como arreglo", () => {
      expect(getProfileRoleName({ roles: { name: "admin" } })).toBe("admin");
      expect(
        getProfileRoleName({ roles: [{ name: "cajero" }, { name: "admin" }] })
      ).toBe("cajero");
      expect(getProfileRoleName({})).toBe("");
    });

    it("acepta solo un perfil administrador activo", () => {
      expect(isAdminProfile({ roles: { name: "admin" } })).toBe(true);
      expect(isAdminProfile({ roles: { name: "ADMIN" } })).toBe(true);
      expect(isAdminProfile({ roles: [{ name: "admin" }] })).toBe(true);
      expect(isAdminProfile({ roles: { name: "cajero" } })).toBe(false);
      expect(isAdminProfile({ roles: { name: "admin" }, status: false })).toBe(
        false
      );
      expect(isAdminProfile(null)).toBe(false);
    });
  });

  describe("buildPointsMovementPayload", () => {
    it("mapea una suma al tipo earn con sufijo manual", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-03-01T12:00:00.000Z"));
      vi.stubGlobal("crypto", {
        randomUUID: () => "uuid-fijo",
      });

      expect(
        buildPointsMovementPayload({
          customerId: "c1",
          signedPoints: 50,
          adjustmentType: "add",
          userId: "u1",
          branchId: "b1",
          notes: "MIGRACION",
        })
      ).toEqual({
        id: "uuid-fijo",
        customer_id: "c1",
        points: 50,
        movement_type: "earn",
        source: "manual",
        related_sale_id: null,
        reward_id: null,
        user_id: "u1",
        branch_id: "b1",
        notes: "MIGRACION",
        created_at: "2026-03-01T12:00:00.000Z",
      });
    });

    it("mapea un descuento al tipo redeem con puntos negativos", () => {
      vi.stubGlobal("crypto", { randomUUID: () => "uuid-fijo" });

      const payload = buildPointsMovementPayload({
        customerId: "c1",
        signedPoints: -50,
        adjustmentType: "subtract",
        notes: "AJUSTE POR ERROR",
      });

      expect(payload.movement_type).toBe("redeem");
      expect(payload.points).toBe(-50);
    });

    it("deja usuario y sucursal en null cuando no vienen", () => {
      vi.stubGlobal("crypto", { randomUUID: () => "uuid-fijo" });

      const payload = buildPointsMovementPayload({
        customerId: "c1",
        signedPoints: 10,
        adjustmentType: "add",
      });

      expect(payload.user_id).toBeNull();
      expect(payload.branch_id).toBeNull();
    });
  });

  describe("buildAdjustmentSuccessMessage", () => {
    it("redacta el mensaje segun el signo y la cantidad", () => {
      expect(
        buildAdjustmentSuccessMessage({
          customerName: "ANA",
          signedPoints: 50,
        })
      ).toBe("Ajuste realizado correctamente. ANA recibió 50 puntos.");

      expect(
        buildAdjustmentSuccessMessage({ customerName: "ANA", signedPoints: -1 })
      ).toBe("Ajuste realizado correctamente. ANA usó 1 punto.");

      expect(
        buildAdjustmentSuccessMessage({ customerName: "ANA", signedPoints: -3 })
      ).toBe("Ajuste realizado correctamente. ANA usó 3 puntos.");
    });

    it("usa EL CLIENTE cuando no hay nombre", () => {
      expect(buildAdjustmentSuccessMessage({ signedPoints: 10 })).toContain(
        "EL CLIENTE"
      );
    });
  });

  describe("sanitizePointsAmountInput", () => {
    it("deja solo digitos y recorta a 6 caracteres", () => {
      expect(sanitizePointsAmountInput("1a2b3c4d5e6f7")).toBe("123456");
      expect(sanitizePointsAmountInput("50.50")).toBe("5050");
      expect(sanitizePointsAmountInput(null)).toBe("");
    });
  });

  describe("getPreviewNotes", () => {
    it("normaliza el motivo para la vista previa", () => {
      expect(getPreviewNotes({ finalNotes: "  pago   con tarjeta " })).toBe(
        "PAGO CON TARJETA"
      );
      expect(getPreviewNotes({ finalNotes: "" })).toBe("");
    });
  });
});
