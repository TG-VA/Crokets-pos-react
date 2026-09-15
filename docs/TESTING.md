# TESTING.md — Cómo correr y escribir tests

## Runner

- **Vitest 5** con entorno `jsdom` y `globals` habilitado (`vitest.config.js`).
- Comando: **`npm test`** (equivale a `vitest run`, ejecución única sin watch).
- Para modo watch durante el desarrollo: `npx vitest`.

## Ubicación de los tests

Los tests se colocan **junto al archivo que prueban**, con sufijo `.test.js` (o `.test.jsx` para
componentes). No hay carpeta central de tests.

## Cobertura actual (15 sep 2026)

22 archivos de test (~243 casos) concentrados en utilidades puras, contratos de servicios y hooks:

| Área | Archivo |
|---|---|
| Formatters de producto | `src/services/products/productFormatters.test.js` |
| CRUD de productos | `src/services/products/productCrudService.test.js` |
| Importación de productos | `.../ProductsImport/services/productsImportService.test.js` |
| Utilidades de importación | `.../ProductsImport/utils/importUtils.test.js` |
| Kits / promociones | `.../ProductsPromotions/services/productKitsService.test.js` |
| Reporte de caja | `.../PageCashReport/services/cashReportService.test.js` |
| Corte de cajero (cálculos) | `src/pages/CashCut/services/cashCutCalculationService.test.js` |
| Corte de cajero (servicios de datos) | `src/pages/CashCut/services/cashCutReportService.test.js` |
| Corte de cajero (detalle histórico) | `src/pages/CashCut/services/cashCutDetailService.test.js` |
| Corte de cajero (hook principal) | `src/pages/CashCut/hooks/useCashCutReport.test.js` |
| Corte de cajero (hook de modales) | `src/pages/CashCut/hooks/useCashCutDetail.test.js` |
| Corte de cajero (formateadores) | `src/pages/CashCut/utils/cashCutFormatters.test.js` |
| Reporte de comisiones | `.../PageCommissionsReport/services/commissionsReportService.test.js` |
| Reporte de inventario | `.../PageInventoryReport/services/inventoryReportService.test.js` |
| Totales de venta | `.../SalesComponents/hooks/test/useSalesTotals.test.js` |
| Paginación global | `src/hooks/usePagination.test.js` |
| Navegación protegida | `src/hooks/useProtectedNavigation.test.js` |
| Secciones protegidas | `src/config/adminProtectedSections.test.js` |
| Guard de rutas | `src/components/ProtectedRoute/ProtectedRoute.test.jsx` |
| Criptografía de contraseñas locales | `src/backend/password.test.js` |
| Sucursal por dispositivo (RPC) | `src/services/deviceBranchService.test.js` |
| Caja: sesión y apertura (RPC) | `src/services/cashRegisterService.test.js` |

## Patrones y convenciones

- **Contrato de servicios:** los servicios de datos devuelven `{ success, data, error, partial }`.
  Los tests verifican ese contrato, incluyendo el caso `partial: true` (operación principal OK pero
  paso secundario fallido, ej. producto creado pero inventario no).
- **Mock de Supabase:** se mockea `supabase` con `vi.mock` y se usan dos helpers locales:
  - `thenableQuery({ data, error })` — simula una query encadenable (`.select().eq()...`) que además
    es `thenable`.
  - `rpcBuilder({ data, error })` — simula `supabase.rpc(...)`.
  Estos helpers están duplicados por archivo (candidatos a extraerse a un helper compartido).
- **Hooks:** se prueban con `renderHook`/`act` de `@testing-library/react`.
- **Estilo:** seguir el patrón existente; no introducir un framework de mocking distinto.

## Huecos de cobertura

No hay todavía:

- Tests de componentes/UI ni de flujos de integración. Las vistas presentacionales del corte
  (`src/pages/CashCut/components/`) son puramente de render y no están cubiertas.
- Tests del proceso principal de Electron (`electron/main.js`).
- Tests del backend Express/SQLite (`src/backend/`).
- Tests a nivel SQL de los RPC (se prueban los contratos del service, no la función SQL).
- Tests E2E.
- El callback de refresh realtime con debounce de `useCashCutReport` (se prueba el registro y la
  limpieza del canal, no la recarga de datos que dispara).
- Los mapeos de pagos por método, departamentos y dólares en `useCashCutReport`: los fetches
  secundarios se mockean vacíos y no se asertan sus resultados agrupados.

**Siguiente capa de valor recomendada:** los RPC de ventas (`create_sale_transaction`,
`create_transfer_order`), la lógica de `cashCutBuilder.js` / `ticketBuilder.js` y el proceso
principal de Electron. Ver `KNOWN_ISSUES.md` #8 y #9.
