/**
 * Configuración compartida de secciones protegidas por autorización de administrador.
 *
 * Es la ÚNICA fuente de verdad del vocabulario de navegación protegida por módulo.
 * Cada entrada define exactamente los mismos campos que ya usa `ProtectedRoute`
 * (`routeLabel`, `routePath`, `action`) y que la página expone como fallback de
 * deep-link (`PROTECTED_REPORT_PAGES`, rutas protegidas de Products e Invoices).
 * Los navbars de módulo la consumen para saber qué items interceptar y qué
 * credenciales pedirle al modal compartido, SIN duplicar strings.
 *
 * Convención: los items que NO están en estos arrays son públicos (navegan
 * directo). La navbar global no aparece aquí a propósito: solo contiene hubs
 * públicos (/reports, /products, /invoices...), ninguna sub-sección protegida.
 *
 * @module adminProtectedSections
 */

export const PROTECTED_REPORT_SECTIONS = [
  {
    id: "ventas",
    routePath: "/reports/ventas",
    routeLabel: "Ventas",
    action: "reports_sales_access",
  },
  {
    id: "productos",
    routePath: "/reports/productos",
    routeLabel: "Productos",
    action: "reports_products_access",
  },
  {
    id: "inventario",
    routePath: "/reports/inventario",
    routeLabel: "Inventario",
    action: "reports_inventory_access",
  },
  {
    id: "caja",
    routePath: "/reports/caja",
    routeLabel: "Caja",
    action: "reports_cash_access",
  },
  {
    id: "facturacion",
    routePath: "/reports/facturacion",
    routeLabel: "Facturación",
    action: "reports_invoicing_access",
  },
  {
    id: "rentabilidad",
    routePath: "/reports/rentabilidad",
    routeLabel: "Rentabilidad",
    action: "reports_profitability_access",
  },
  {
    id: "comisiones",
    routePath: "/reports/comisiones",
    routeLabel: "Comisiones",
    action: "reports_commissions_access",
  },
];

export const PROTECTED_PRODUCT_SECTIONS = [
  {
    id: "nuevo",
    routePath: "/products/nuevo",
    routeLabel: "Nuevo",
    action: "products_new_access",
  },
  {
    id: "eliminar",
    routePath: "/products/eliminar",
    routeLabel: "Eliminar",
    action: "products_delete_access",
  },
  {
    id: "promociones",
    routePath: "/products/promociones",
    routeLabel: "Promociones y Kits",
    action: "products_promotions_access",
  },
  {
    id: "importar",
    routePath: "/products/importar",
    routeLabel: "Importar",
    action: "products_import_access",
  },
  {
    id: "departamentos",
    routePath: "/products/departamentos",
    routeLabel: "Departamentos",
    action: "products_departments_access",
  },
];

export const PROTECTED_INVOICE_SECTIONS = [
  {
    id: "configuracion",
    routePath: "/invoices/configuracion",
    routeLabel: "Configuración CFDI",
    action: "invoice_settings_access",
  },
];

/**
 * Enriquece los items de un navbar de módulo con la metadata de protección,
 * matcheando por `path` del navbar contra el `routePath` de las secciones protegidas.
 *
 * Es un helper PURO (sin efectos): NO añade `action` a los items públicos, de modo
 * que `useProtectedNavigation` los deja navegar directo; solo marca los que
 * corresponden a una sección protegida y les copia exactamente el vocabulario que ya
 * usa `ProtectedRoute` (`action`, `routeLabel`, `routePath`) para que el modal
 * compartido pida las mismas credenciales que pide el fallback de deep-link.
 *
 * @param {Array<{path: string, id?: string}>} options - Items del navbar.
 * @param {Array<{routePath: string, routeLabel: string, action: string}>} sections -
 *   Secciones protegidas del módulo (una de PROTECTED_*_SECTIONS).
 * @returns {Array} Los mismos items del navbar con `action`/`routeLabel`/`routePath`
 *   agregados cuando corresponden a una sección protegida.
 */
export const withProtectedMetadata = (options, sections) => {
  const sectionsByRoutePath = new Map(
    sections.map((section) => [section.routePath, section]),
  );

  return options.map((option) => {
    const section = sectionsByRoutePath.get(option.path);

    return section ? { ...option, ...section } : option;
  });
};

const ADMIN_PROTECTED_SECTIONS = {
  reports: PROTECTED_REPORT_SECTIONS,
  products: PROTECTED_PRODUCT_SECTIONS,
  invoices: PROTECTED_INVOICE_SECTIONS,
};

export default ADMIN_PROTECTED_SECTIONS;
