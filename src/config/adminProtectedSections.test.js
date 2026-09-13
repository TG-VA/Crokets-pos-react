import { describe, it, expect } from "vitest";

import {
  PROTECTED_INVOICE_SECTIONS,
  PROTECTED_PRODUCT_SECTIONS,
  PROTECTED_REPORT_SECTIONS,
  withProtectedMetadata,
} from "./adminProtectedSections";

describe("withProtectedMetadata", () => {
  it("agrega action/routeLabel/routePath a los items que matchean una sección", () => {
    const options = [{ id: "ventas", label: "Ventas", path: "/reports/ventas" }];

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
    const options = [{ id: "ventas", label: "Ventas", path: "/reports/ventas" }];

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
});
