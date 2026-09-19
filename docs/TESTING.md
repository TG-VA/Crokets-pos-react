# TESTING.md — Cómo correr y escribir tests

## Runner

- **Vitest 5** con entorno `jsdom` y `globals` habilitado (`vitest.config.js`).
- Comando: **`npm test`** (equivale a `vitest run`, ejecución única sin watch).
- Para modo watch durante el desarrollo: `npx vitest`.

## Ubicación de los tests

Los tests se colocan **junto al archivo que prueban**, con sufijo `.test.js` (o `.test.jsx` para
componentes). No hay carpeta central de tests.

## Cobertura actual (17 sep 2026)

41 archivos de test (**524 casos**) concentrados en utilidades puras, contratos de servicios, hooks
y el proceso principal de Electron:

| Área | Archivo |
|---|---|
| Formatters de producto | `src/services/products/productFormatters.test.js` |
| CRUD de productos | `src/services/products/productCrudService.test.js` |
| Importación de productos | `.../ProductsImport/services/productsImportService.test.js` |
| Utilidades de importación | `.../ProductsImport/utils/importUtils.test.js` |
| Kits / promociones | `.../ProductsPromotions/services/productKitsService.test.js` |
| Reporte de caja | `.../PageCashReport/services/cashReportService.test.js` |
| Reporte de comisiones | `.../PageCommissionsReport/services/commissionsReportService.test.js` |
| Reporte de rentabilidad | `.../PageProfitabilityReport/services/profitabilityReportService.test.js` |
| Reporte de inventario (datos) | `.../PageInventoryReport/services/inventoryReportService.test.js` |
| Reporte de inventario (cálculos) | `.../PageInventoryReport/services/inventoryReportCalculationService.test.js` |
| Corte de cajero (cálculos) | `src/pages/CashCut/services/cashCutCalculationService.test.js` |
| Corte de cajero (servicios de datos) | `src/pages/CashCut/services/cashCutReportService.test.js` |
| Corte de cajero (detalle histórico) | `src/pages/CashCut/services/cashCutDetailService.test.js` |
| Corte de cajero (hook principal) | `src/pages/CashCut/hooks/useCashCutReport.test.js` |
| Corte de cajero (hook de modales) | `src/pages/CashCut/hooks/useCashCutDetail.test.js` |
| Corte de cajero (formateadores) | `src/pages/CashCut/utils/cashCutFormatters.test.js` |
| Corte impreso (builder de ancho fijo) | `src/utils/cashCutBuilder.test.js` |
| Impresión de ticket (fallback) | `src/utils/ticketPrinter.test.js` |
| Modal de recompensas (cálculos) | `.../RewardModal/rewardModalCalculationService.test.js` |
| Modal de recompensas (hook) | `.../RewardModal/useRewardModal.test.js` |
| Totales de venta | `.../SalesComponents/hooks/test/useSalesTotals.test.js` |
| Venta transaccional (RPC) | `.../SalesComponents/services/salesTransactionService.test.js` |
| Contrato SQL de RPCs transaccionales | `supabase/migrations/transactionalRpcsContract.test.js` |
| Proceso principal de Electron | `electron/mainProcess.test.js` |
| Utilidades async | `src/utils/asyncUtils.test.js` |
| Paginación global | `src/hooks/usePagination.test.js` |
| Navegación protegida | `src/hooks/useProtectedNavigation.test.js` |
| Secciones protegidas | `src/config/adminProtectedSections.test.js` |
| Guard de rutas | `src/components/ProtectedRoute/ProtectedRoute.test.jsx` |
| Criptografía de contraseñas locales | `src/backend/password.test.js` |
| Sucursal por dispositivo (RPC) | `src/services/deviceBranchService.test.js` |
| Caja: sesión y apertura (RPC) | `src/services/cashRegisterService.test.js` |
| Ticket: golden de salida | `src/utils/ticket/ticketBuilder.test.js` |
| Ticket: primitivas de layout | `src/utils/ticket/ticketLayoutFormatters.test.js` |
| Ticket: formateadores de fecha | `src/utils/ticket/ticketDateFormatters.test.js` |
| Ticket: extracción de items | `src/utils/ticket/ticketItemFormatters.test.js` |
| Ticket: servicios de recompensas | `src/utils/ticket/ticketRewardService.test.js` |
| Ticket: servicios de pagos | `src/utils/ticket/ticketPaymentService.test.js` |
| Ticket: formateadores de sucursal | `src/utils/ticket/ticketBranchFormatters.test.js` |
| Ticket: servicios de puntos | `src/utils/ticket/ticketPointsService.test.js` |
| Ticket: secciones | `src/utils/ticket/ticketSections.test.js` |

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

Cubierto en la Fase 4 (rama `test/coverage-gaps`):

- **RPC de ventas:** contrato mock de `create_sale_transaction`
  (`salesTransactionService.test.js`) y contrato SQL de `create_sale_transaction` /
  `create_transfer_order` contra la migración `20260917200000`
  (`transactionalRpcsContract.test.js`), incluido el cross-check cliente↔BD de nombres de
  parámetros. `create_transfer_order` aún no tiene caller JS (la vista de traspasos es el stub de
  #12), por eso se fija su interfaz SQL.
- **Lógica de impresión y corte:** `cashCutBuilder.js` (secciones, totales, wrapping e invariante de
  32 columnas) y `ticketPrinter.js` (contrato de éxito/fallo).
- **Proceso principal de Electron:** `mainProcess.test.js` cubre los seis canales IPC, el zoom por
  `webContents` y el ciclo de vida de la ventana. `electron/main.js` se redujo a wiring y la lógica
  se movió a `electron/mainProcess.js` (inyección de dependencias, sin `require('electron')`).

No hay todavía:

- Tests de componentes/UI ni de flujos de integración. Las vistas presentacionales del corte
  (`src/pages/CashCut/components/`) son puramente de render y no están cubiertas.
- Tests del backend Express/SQLite (`src/backend/server.js` y `bd.js`): `app.listen()` y la apertura
  de SQLite ocurren al importar el módulo, por lo que requieren un desacople previo. La
  inicialización de Express/SQLite **no** vive en `electron/main.js`.
- Tests a nivel de ejecución de los RPC: se fija la firma SQL (parámetros, retorno, grants), no se
  ejecuta la función en Postgres.
- Tests E2E.
- Los mapeos de pagos por método, departamentos y dólares en `useCashCutReport`: los fetches
  secundarios se mockean vacíos y no se asertan sus resultados agrupados.

**Siguiente capa de valor recomendada:** desacoplar `src/backend/server.js` (factory de Express) y
`bd.js` (inyección de la conexión SQLite) para poder cubrir el backend local, y agregar un smoke test
de render del renderer. Ver `KNOWN_ISSUES.md` #8 y #9.

## Linter y formateo (ESLint 9 + Prettier, incremental)

Configurado en la rama `chore/tech-debt-foundations` (Fase 0, `KNOWN_ISSUES.md` #8):

- **ESLint 9 flat config** en `eslint.config.mjs` (package.json es CommonJS, por eso `.mjs`):
  reglas `recommended` (`@eslint/js`) + `eslint-plugin-react` (jsx-runtime) +
  `eslint-plugin-react-hooks` (recommended). `no-console` con `allow: ["error"]` para preservar los
  `console.error` obligatorios en bloques `catch`. `no-unused-vars` en modo `warn`.
- **Prettier 3** con `.prettierrc.json` (2 espacios, comillas dobles —estilo dominante del repo—,
  `trailingComma: es5`, `lf`) y `.prettierignore` (`dist/`, `node_modules/`, `supabase/.temp/`,
  `supabase/functions/`).
- Scripts en `package.json`:
  - `npm run lint` — corre ESLint sobre el repo completo (la base de violaciones legacy es
    conocida y **no** se corrige en esta fase; solo archivos nuevos/modificados).
  - `npm run format` — `prettier --write .` (normalización opt-in).
  - `npm run format:check` — `prettier --check .`.
- **CI incremental:** el workflow `.github/workflows/ci.yml` corre ESLint y Prettier **únicamente
  sobre los archivos del diff** (`git diff --diff-filter=ACM` contra la base del PR/push). Así los
  archivos legacy sin formatear no rompen el pipeline; cualquier archivo nuevo o modificado queda
  obligado a cumplir el estándar. No hay husky ni lint-staged (decisión Fase 0).
- **Node requerido: `>=22.22.2`** (declarado en `engines` de `package.json` y usado por el CI).
  `jsdom@30`/`undici@8` exigen Node 22.22.2+ y `vitest@5` 22.12+; **Node 20 no funciona** (el
  worker de Vitest falla al cargar jsdom con `webidl.util.markAsUncloneable is not a function`).
  Alinear la versión local con el CI evita discrepancias.
