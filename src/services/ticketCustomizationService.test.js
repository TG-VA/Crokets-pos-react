import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../lib/supabaseClient", () => {
  const mockSupabase = {
    from: vi.fn(),
  };
  return { supabase: mockSupabase };
});

import {
  getTicketCustomization,
  saveTicketCustomization,
  normalizeTemplate,
  sanitizeTicketPhone,
  sanitizeTicketTemplateField,
  DEFAULT_TICKET_CUSTOMIZATION,
  TICKET_TEMPLATE_LIMITS,
} from "./ticketCustomizationService";
import { supabase } from "../lib/supabaseClient";

const buildQueryChain = (result = {}) => {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    is: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    maybeSingle: vi.fn(async () => result),
    update: vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) })),
    insert: vi.fn(async () => ({ error: null })),
  };
  return query;
};

describe("ticketCustomizationService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it("Obtención de plantilla desde Supabase system_settings.", async () => {
    const stored = { ...DEFAULT_TICKET_CUSTOMIZATION, footerLine1: "Gracias" };
    const query = buildQueryChain({
      data: {
        id: "1",
        setting_key: "ticket_customization",
        setting_value: JSON.stringify(stored),
        value_type: "json",
        branch_id: null,
      },
      error: null,
    });
    supabase.from.mockReturnValue(query);

    const result = await getTicketCustomization({ branchId: null });
    expect(supabase.from).toHaveBeenCalledWith("system_settings");
    expect(result.footerLine1).toBe("Gracias");
  });

  it("Fallback a valores por defecto y a caché local ante error de red.", async () => {
    const query = buildQueryChain({
      data: null,
      error: { message: "network" },
    });
    supabase.from.mockReturnValue(query);
    const result = await getTicketCustomization({ branchId: null });
    expect(result).toEqual(DEFAULT_TICKET_CUSTOMIZATION);
  });

  it("usa la caché local cuando no hay registro guardado en Supabase", async () => {
    const cached = {
      ...DEFAULT_TICKET_CUSTOMIZATION,
      headerSlogan: "Cuidamos a tu mejor amigo",
      footerLine2: "",
    };
    window.localStorage.setItem(
      "settings_ticket_template_cache",
      JSON.stringify(cached)
    );
    const query = buildQueryChain({ data: null, error: null });
    supabase.from.mockReturnValue(query);

    const result = await getTicketCustomization({ branchId: null });

    expect(result.headerSlogan).toBe("Cuidamos a tu mejor amigo");
    expect(result.footerLine2).toBe("");
  });

  it("actualiza el registro existente y refresca la caché local", async () => {
    const query = buildQueryChain({
      data: { id: "setting-9" },
      error: null,
    });
    supabase.from.mockReturnValue(query);

    const saved = await saveTicketCustomization({
      branchId: 2,
      template: {
        headerSlogan: "Nuevo slogan",
        showCustomerPoints: false,
        showBranchPhone: true,
      },
    });

    expect(saved.headerSlogan).toBe("Nuevo slogan");
    expect(saved.showCustomerPoints).toBe(false);
    expect(saved.showBranchPhone).toBe(true);
    expect(supabase.from).toHaveBeenNthCalledWith(2, "system_settings");
    const cached = JSON.parse(
      window.localStorage.getItem("settings_ticket_template_cache")
    );
    expect(cached.headerSlogan).toBe("Nuevo slogan");
  });

  it("inserta un registro nuevo con el branch_id de la sucursal", async () => {
    const query = buildQueryChain({ data: null, error: null });
    supabase.from.mockReturnValue(query);

    const saved = await saveTicketCustomization({
      branchId: 7,
      template: { footerLine1: "Gracias por todo" },
    });

    expect(saved.footerLine1).toBe("Gracias por todo");
    expect(supabase.from).toHaveBeenNthCalledWith(2, "system_settings");
    expect(query.insert).toHaveBeenCalled();
    const insertedRow = query.insert.mock.calls[0][0][0];
    expect(insertedRow.branch_id).toBe(7);
    expect(insertedRow.setting_key).toBe("ticket_customization");
    const cached = JSON.parse(
      window.localStorage.getItem("settings_ticket_template_cache")
    );
    expect(cached.footerLine1).toBe("Gracias por todo");
  });

  it("Guardado correcto de configuración (insert/update).", async () => {
    const query = buildQueryChain({ data: null, error: null });
    supabase.from.mockReturnValue(query);
    const saved = await saveTicketCustomization({
      branchId: null,
      template: { footerLine1: "OK" },
    });
    expect(saved.footerLine1).toBe("OK");
  });

  it("expone los limites de longitud de la plantilla comercial", () => {
    expect(TICKET_TEMPLATE_LIMITS).toEqual({
      headerSlogan: 80,
      fiscalInfo: 100,
      footerLine1: 60,
      footerLine2: 60,
      footerPhone: 20,
      returnPolicy: 250,
    });
    expect(Object.isFrozen(TICKET_TEMPLATE_LIMITS)).toBe(true);
  });

  it("recorta en normalizeTemplate los textos que exceden los limites", () => {
    const normalized = normalizeTemplate({
      headerSlogan: "a".repeat(150),
      fiscalInfo: "b".repeat(200),
      footerLine1: "c".repeat(90),
      footerLine2: "d".repeat(90),
      returnPolicy: "e".repeat(400),
    });

    expect(normalized.headerSlogan).toHaveLength(
      TICKET_TEMPLATE_LIMITS.headerSlogan
    );
    expect(normalized.fiscalInfo).toHaveLength(
      TICKET_TEMPLATE_LIMITS.fiscalInfo
    );
    expect(normalized.footerLine1).toHaveLength(
      TICKET_TEMPLATE_LIMITS.footerLine1
    );
    expect(normalized.footerLine2).toHaveLength(
      TICKET_TEMPLATE_LIMITS.footerLine2
    );
    expect(normalized.returnPolicy).toHaveLength(
      TICKET_TEMPLATE_LIMITS.returnPolicy
    );
  });

  it("completa con los valores por defecto los campos ausentes al normalizar", () => {
    const normalized = normalizeTemplate({ footerLine1: "Gracias" });

    expect(normalized.footerLine1).toBe("Gracias");
    expect(normalized.headerSlogan).toBe(
      DEFAULT_TICKET_CUSTOMIZATION.headerSlogan
    );
    expect(normalized.footerPhone).toBe(
      DEFAULT_TICKET_CUSTOMIZATION.footerPhone
    );
  });

  it("completa con los valores por defecto los toggles ausentes al normalizar", () => {
    const normalized = normalizeTemplate({ footerLine1: "Gracias" });

    expect(normalized.showCustomerPoints).toBe(true);
    expect(normalized.showCashierName).toBe(true);
    expect(normalized.showSaleNotes).toBe(true);
    expect(normalized.showBranchAddress).toBe(true);
    expect(normalized.showBranchPhone).toBe(true);
  });

  it("respeta los toggles apagados de forma explicita al normalizar", () => {
    const normalized = normalizeTemplate({
      showSaleNotes: false,
      showBranchPhone: false,
    });

    expect(normalized.showSaleNotes).toBe(false);
    expect(normalized.showBranchPhone).toBe(false);
    expect(normalized.showCustomerPoints).toBe(true);
    expect(normalized.showCashierName).toBe(true);
    expect(normalized.showBranchAddress).toBe(true);
  });

  it("restaura los toggles por defecto de una plantilla guardada antes de existirlos", async () => {
    const query = buildQueryChain({
      data: {
        id: "1",
        setting_key: "ticket_customization",
        setting_value: JSON.stringify({
          headerSlogan: "Plantilla legacy",
          footerLine1: "Gracias",
        }),
        value_type: "json",
        branch_id: null,
      },
      error: null,
    });
    supabase.from.mockReturnValue(query);

    const result = await getTicketCustomization({ branchId: null });

    expect(result.headerSlogan).toBe("Plantilla legacy");
    expect(result.showCustomerPoints).toBe(true);
    expect(result.showCashierName).toBe(true);
    expect(result.showSaleNotes).toBe(true);
    expect(result.showBranchAddress).toBe(true);
    expect(result.showBranchPhone).toBe(true);
  });

  it("sanea el telefono admitiendo solo digitos, espacios, guiones, parentesis y el prefijo mas", () => {
    expect(sanitizeTicketPhone("998-ABC (117) 5387")).toBe("998- (117) 5387");
    expect(sanitizeTicketPhone("+52 (998) 117-5387")).toBe(
      "+52 (998) 117-5387"
    );
    expect(sanitizeTicketPhone("998#117*5387")).toBe("9981175387");
    expect(sanitizeTicketPhone("")).toBe("");
    expect(sanitizeTicketPhone(null)).toBe("");
  });

  it("recorta y sanea cada campo de la plantilla al escribir", () => {
    expect(
      sanitizeTicketTemplateField("headerSlogan", "x".repeat(200))
    ).toHaveLength(TICKET_TEMPLATE_LIMITS.headerSlogan);
    expect(
      sanitizeTicketTemplateField("footerPhone", "998 117 5387 ext 4")
    ).toBe("998 117 5387  4");
    expect(
      sanitizeTicketTemplateField("footerPhone", "9".repeat(40))
    ).toHaveLength(TICKET_TEMPLATE_LIMITS.footerPhone);
    expect(sanitizeTicketTemplateField("campoDesconocido", "texto")).toBe(
      "texto"
    );
  });

  it("recorta la plantilla almacenada en Supabase al recuperarla", async () => {
    const query = buildQueryChain({
      data: {
        id: "1",
        setting_key: "ticket_customization",
        setting_value: JSON.stringify({
          headerSlogan: "a".repeat(200),
          footerPhone: "998-ABC 117 5387",
          returnPolicy: "b".repeat(400),
        }),
        value_type: "json",
        branch_id: null,
      },
      error: null,
    });
    supabase.from.mockReturnValue(query);

    const result = await getTicketCustomization({ branchId: null });

    expect(result.headerSlogan).toHaveLength(
      TICKET_TEMPLATE_LIMITS.headerSlogan
    );
    expect(result.footerPhone).toBe("998- 117 5387");
    expect(result.returnPolicy).toHaveLength(
      TICKET_TEMPLATE_LIMITS.returnPolicy
    );
  });

  it("recorta la plantilla antes de persistirla en Supabase", async () => {
    const query = buildQueryChain({ data: null, error: null });
    supabase.from.mockReturnValue(query);

    const saved = await saveTicketCustomization({
      branchId: null,
      template: {
        headerSlogan: "a".repeat(200),
        footerPhone: "998-ABC 117 5387",
      },
    });

    expect(saved.headerSlogan).toHaveLength(
      TICKET_TEMPLATE_LIMITS.headerSlogan
    );
    expect(saved.footerPhone).toBe("998- 117 5387");
    const insertedRow = query.insert.mock.calls[0][0][0];
    const persisted = JSON.parse(insertedRow.setting_value);
    expect(persisted.headerSlogan).toHaveLength(
      TICKET_TEMPLATE_LIMITS.headerSlogan
    );
    expect(persisted.footerPhone).toBe("998- 117 5387");
  });

  it("recorta la plantilla cacheada que excede los limites", async () => {
    window.localStorage.setItem(
      "settings_ticket_template_cache",
      JSON.stringify({
        ...DEFAULT_TICKET_CUSTOMIZATION,
        headerSlogan: "a".repeat(200),
        footerPhone: "998-ABC 117 5387",
      })
    );
    const query = buildQueryChain({ data: null, error: null });
    supabase.from.mockReturnValue(query);

    const result = await getTicketCustomization({ branchId: null });

    expect(result.headerSlogan).toHaveLength(
      TICKET_TEMPLATE_LIMITS.headerSlogan
    );
    expect(result.footerPhone).toBe("998- 117 5387");
  });
});
