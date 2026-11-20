import { describe, it, expect } from "vitest";

import ADMIN_PROTECTED_SECTIONS, {
  PROTECTED_INVENTORY_SECTIONS,
  PROTECTED_INVOICE_SECTIONS,
  PROTECTED_PRODUCT_SECTIONS,
  PROTECTED_REPORT_SECTIONS,
  PROTECTED_SETTINGS_ENTRY,
  PROTECTED_SETTINGS_SECTIONS,
  createAuthorizedRoutesFromState,
  withProtectedMetadata,
} from "./adminProtectedSections";

describe("withProtectedMetadata", () => {
  it("agrega action/routeLabel/routePath a los items que matchean una sección", () => {
    const options = [
      { id: "ventas", label: "Ventas", path: "/reports/ventas" },
    ];

    const [result] = withProtectedMetadata(options, PROTECTED_REPORT_SECTIONS);

    expect(result.action).toBe("reports_sales_access");
    expect(result.routeLabel).toBe("Ventas");
    expect(result.routePath).toBe("/reports/ventas");
  });

  it("deja intactos los items públicos (sin action)", () => {
    const options = [
      { id: "clientes", label: "Clientes", path: "/reports/clientes" },
    ];

    const [result] = withProtectedMetadata(options, PROTECTED_REPORT_SECTIONS);

    expect(result).toEqual(options[0]);
    expect(result.action).toBeUndefined();
    expect(result.routePath).toBeUndefined();
  });

  it("no muta el arreglo de entrada", () => {
    const options = [
      { id: "ventas", label: "Ventas", path: "/reports/ventas" },
    ];

    withProtectedMetadata(options, PROTECTED_REPORT_SECTIONS);

    expect(options[0].action).toBeUndefined();
  });

  it("la metadata de la sección tiene precedencia sobre el item del navbar", () => {
    const options = [
      {
        id: "ventas",
        label: "Etiqueta vieja",
        path: "/reports/ventas",
        action: "accion_vieja",
      },
    ];

    const [result] = withProtectedMetadata(options, PROTECTED_REPORT_SECTIONS);

    expect(result.action).toBe("reports_sales_access");
    expect(result.routeLabel).toBe("Ventas");
  });

  it("funciona con los catálogos de productos y facturas", () => {
    const [product] = withProtectedMetadata(
      [{ id: "nuevo", label: "Nuevo", path: "/products/nuevo" }],
      PROTECTED_PRODUCT_SECTIONS
    );
    const [invoice] = withProtectedMetadata(
      [
        {
          id: "configuracion",
          label: "Configuración CFDI",
          path: "/invoices/configuracion",
        },
      ],
      PROTECTED_INVOICE_SECTIONS
    );

    expect(product.action).toBe("products_new_access");
    expect(invoice.action).toBe("invoice_settings_access");
  });

  it("protege Agregar y Ajustes de inventario y deja publicas las demas pestañas", () => {
    const [add, adjust, kardex] = withProtectedMetadata(
      [
        { id: "agregar", label: "Agregar", path: "/inventory/agregar" },
        { id: "ajustes", label: "Ajustes", path: "/inventory/ajustes" },
        { id: "kardex", label: "Kardex", path: "/inventory/kardex" },
      ],
      PROTECTED_INVENTORY_SECTIONS
    );

    expect(add.action).toBe("inventory_add_access");
    expect(adjust.action).toBe("inventory_adjust_access");
    expect(kardex.action).toBeUndefined();
  });

  it("protege las pestañas internas de configuración", () => {
    const options = [
      { id: "caja", label: "Caja y Operación", path: "/settings/caja" },
      {
        id: "usuarios",
        label: "Usuarios y Permisos",
        path: "/settings/usuarios",
      },
      {
        id: "impresion",
        label: "Impresión y Tickets",
        path: "/settings/impresion",
      },
      {
        id: "terminal",
        label: "Terminal local",
        path: "/settings/terminal",
      },
      {
        id: "sucursales",
        label: "Sucursales",
        path: "/settings/sucursales",
      },
    ];

    const result = withProtectedMetadata(options, PROTECTED_SETTINGS_SECTIONS);

    expect(result.map((item) => item.action)).toEqual([
      "settings_cash_access",
      "settings_users_access",
      "settings_printers_access",
      "settings_terminal_access",
      "settings_branches_access",
    ]);
  });

  it("protege el acceso rápido fiscal con el catálogo de facturas", () => {
    const [fiscal] = withProtectedMetadata(
      [
        {
          id: "fiscal",
          label: "Acceso rápido fiscal",
          path: "/invoices/configuracion",
        },
      ],
      PROTECTED_INVOICE_SECTIONS
    );

    expect(fiscal.action).toBe("invoice_settings_access");
    expect(fiscal.routeLabel).toBe("Configuración CFDI");
  });
});

describe("createAuthorizedRoutesFromState", () => {
  it("acepta una ruta declarada para el módulo", () => {
    const routes = createAuthorizedRoutesFromState(
      { authorizedRoute: "/settings/caja" },
      PROTECTED_SETTINGS_SECTIONS
    );

    expect(routes).toEqual(new Set(["/settings/caja"]));
  });

  it("ignora rutas ajenas al módulo", () => {
    const routes = createAuthorizedRoutesFromState(
      { authorizedRoute: "/invoices/configuracion" },
      PROTECTED_SETTINGS_SECTIONS
    );

    expect(routes.size).toBe(0);
  });

  it("ignora un estado ausente o una ruta inventada", () => {
    expect(
      createAuthorizedRoutesFromState(null, PROTECTED_SETTINGS_SECTIONS).size
    ).toBe(0);
    expect(
      createAuthorizedRoutesFromState(
        { authorizedRoute: "/settings/inexistente" },
        PROTECTED_SETTINGS_SECTIONS
      ).size
    ).toBe(0);
  });
});

describe("PROTECTED_SETTINGS_SECTIONS", () => {
  it("declara las cinco secciones internas con su ruta y acción", () => {
    expect(
      PROTECTED_SETTINGS_SECTIONS.map(
        ({ id, routePath, routeLabel, action }) => ({
          id,
          routePath,
          routeLabel,
          action,
        })
      )
    ).toEqual([
      {
        id: "caja",
        routePath: "/settings/caja",
        routeLabel: "Caja y Operación",
        action: "settings_cash_access",
      },
      {
        id: "usuarios",
        routePath: "/settings/usuarios",
        routeLabel: "Usuarios y Permisos",
        action: "settings_users_access",
      },
      {
        id: "impresion",
        routePath: "/settings/impresion",
        routeLabel: "Impresión y Tickets",
        action: "settings_printers_access",
      },
      {
        id: "terminal",
        routePath: "/settings/terminal",
        routeLabel: "Terminal local",
        action: "settings_terminal_access",
      },
      {
        id: "sucursales",
        routePath: "/settings/sucursales",
        routeLabel: "Sucursales",
        action: "settings_branches_access",
      },
    ]);
  });

  it("expone la acción de entrada general a configuración", () => {
    expect(PROTECTED_SETTINGS_ENTRY).toEqual({
      id: "settings",
      routePath: "/settings",
      routeLabel: "Configuración",
      action: "settings_entry_access",
    });
  });

  it("registra configuración y su entrada en el catálogo por defecto", () => {
    expect(ADMIN_PROTECTED_SECTIONS.settings).toBe(PROTECTED_SETTINGS_SECTIONS);
    expect(ADMIN_PROTECTED_SECTIONS.settingsEntry).toBe(
      PROTECTED_SETTINGS_ENTRY
    );
  });
});
