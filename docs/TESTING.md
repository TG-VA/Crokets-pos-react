# TESTING.md — Cómo correr y escribir tests

## Runner

- **Vitest 5** con entorno `jsdom` y `globals` habilitado (`vitest.config.js`).
- Comando: **`npm test`** (equivale a `vitest run`, ejecución única sin watch).
- Para modo watch durante el desarrollo: `npx vitest`.

## Ubicación de los tests

Los tests se colocan **junto al archivo que prueban**, con sufijo `.test.js` (o `.test.jsx` para
componentes). No hay carpeta central de tests.

## Cobertura actual (2 oct 2026)

93 archivos de test (**1450 casos**) concentrados en utilidades puras, contratos de servicios, hooks
y el proceso principal de Electron:

| Área                                                | Archivo                                                                            |
| --------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Formatters de producto                              | `src/services/products/productFormatters.test.js`                                  |
| CRUD de productos                                   | `src/services/products/productCrudService.test.js`                                 |
| Importación de productos                            | `.../ProductsImport/services/productsImportService.test.js`                        |
| Utilidades de importación                           | `.../ProductsImport/utils/importUtils.test.js`                                     |
| Kits / promociones                                  | `.../ProductsPromotions/services/productKitsService.test.js`                       |
| Reporte de caja                                     | `.../PageCashReport/services/cashReportService.test.js`                            |
| Reporte de comisiones                               | `.../PageCommissionsReport/services/commissionsReportService.test.js`              |
| Reporte de rentabilidad                             | `.../PageProfitabilityReport/services/profitabilityReportService.test.js`          |
| Reporte de inventario (datos)                       | `.../PageInventoryReport/services/inventoryReportService.test.js`                  |
| Reporte de inventario (cálculos)                    | `.../PageInventoryReport/services/inventoryReportCalculationService.test.js`       |
| Inventario: alta con CPP                            | `.../PageAdd/services/inventoryAddService.test.js`                                 |
| Inventario: cálculo del CPP móvil                   | `src/services/inventory/inventoryCostCalculationService.test.js`                   |
| Inventario: proyección de CPP en interfaz           | `.../PageAdd/services/inventoryAddProjectionService.test.js`                       |
| Inventario: hook de captura de costo                | `.../PageAdd/hooks/useInventoryAddCost.test.js`                                    |
| Inventario: componente de captura de costo          | `.../PageAdd/components/InventoryAddCostEntry.test.jsx`                            |
| Inventario: movimientos (payload de costo)          | `src/utils/inventoryMovements.test.js`                                             |
| Corte de cajero (cálculos)                          | `src/pages/CashCut/services/cashCutCalculationService.test.js`                     |
| Corte de cajero (servicios de datos)                | `src/pages/CashCut/services/cashCutReportService.test.js`                          |
| Corte de cajero (detalle histórico)                 | `src/pages/CashCut/services/cashCutDetailService.test.js`                          |
| Corte de cajero (hook principal)                    | `src/pages/CashCut/hooks/useCashCutReport.test.js`                                 |
| Corte de cajero (hook de modales)                   | `src/pages/CashCut/hooks/useCashCutDetail.test.js`                                 |
| Corte de cajero (formateadores)                     | `src/pages/CashCut/utils/cashCutFormatters.test.js`                                |
| Corte impreso (builder de ancho fijo)               | `src/utils/cashCutBuilder.test.js`                                                 |
| Ticket: generación e impresión                      | `src/utils/ticketPrinter.test.js`                                                  |
| Modal de recompensas (cálculos)                     | `.../RewardModal/rewardModalCalculationService.test.js`                            |
| Modal de recompensas (hook)                         | `.../RewardModal/useRewardModal.test.js`                                           |
| Totales de venta                                    | `.../SalesComponents/hooks/test/useSalesTotals.test.js`                            |
| Venta transaccional (RPC)                           | `.../SalesComponents/services/salesTransactionService.test.js`                     |
| Contrato SQL de RPCs transaccionales                | `supabase/migrations/transactionalRpcsContract.test.js`                            |
| Contrato SQL del snapshot de costo de venta         | `supabase/migrations/costSnapshotContract.test.js`                                 |
| Proceso principal de Electron                       | `electron/mainProcess.test.js`                                                     |
| Impresión de tickets (proceso principal)            | `electron/ticketPrintService.test.js`                                              |
| Utilidades async                                    | `src/utils/asyncUtils.test.js`                                                     |
| Paginación global                                   | `src/hooks/usePagination.test.js`                                                  |
| Navegación protegida                                | `src/hooks/useProtectedNavigation.test.js`                                         |
| Secciones protegidas                                | `src/config/adminProtectedSections.test.js`                                        |
| Guard de rutas                                      | `src/components/ProtectedRoute/ProtectedRoute.test.jsx`                            |
| Sucursal por dispositivo (RPC)                      | `src/services/deviceBranchService.test.js`                                         |
| Caja: sesión y apertura (RPC)                       | `src/services/cashRegisterService.test.js`                                         |
| Ticket: golden de salida                            | `src/utils/ticket/ticketBuilder.test.js`                                           |
| Ticket: primitivas de layout                        | `src/utils/ticket/ticketLayoutFormatters.test.js`                                  |
| Ticket: formateadores de fecha                      | `src/utils/ticket/ticketDateFormatters.test.js`                                    |
| Ticket: extracción de items                         | `src/utils/ticket/ticketItemFormatters.test.js`                                    |
| Ticket: servicios de recompensas                    | `src/utils/ticket/ticketRewardService.test.js`                                     |
| Ticket: servicios de pagos                          | `src/utils/ticket/ticketPaymentService.test.js`                                    |
| Ticket: formateadores de sucursal                   | `src/utils/ticket/ticketBranchFormatters.test.js`                                  |
| Ticket: servicios de puntos                         | `src/utils/ticket/ticketPointsService.test.js`                                     |
| Ticket: secciones                                   | `src/utils/ticket/ticketSections.test.js`                                          |
| Reportes: ciclo de vida del dashboard               | `.../PageReportsHome/hooks/useReportsDashboard.test.js`                            |
| Ventas: sincronización de columnas                  | `.../SalesComponents/hooks/useSalesTableColumns.test.js`                           |
| Ventas: atajos de teclado                           | `.../SalesComponents/hooks/useSalesKeyboardShortcuts.test.js`                      |
| Facturación: validación fiscal                      | `.../InvoicesComponents/services/fiscalValidationService.test.js`                  |
| Facturación: catálogos (usos CFDI, regímenes, C.P.) | `.../InvoicesComponents/services/invoicesCatalogService.test.js`                   |
| Facturación: suscripciones realtime                 | `.../InvoicesComponents/services/invoicesRealtimeService.test.js`                  |
| Facturación: formateadores compartidos              | `.../InvoicesComponents/utils/invoiceFormatters.test.js`                           |
| Facturación: cliente fiscal (cálculos)              | `.../Modals/FiscalCustomerModal/services/fiscalCustomerCalculationService.test.js` |
| Facturación: cliente fiscal (datos)                 | `.../Modals/FiscalCustomerModal/services/fiscalCustomerService.test.js`            |
| Facturación: factura de venta (cálculos)            | `.../Modals/InvoiceSaleModal/services/invoiceSaleCalculationService.test.js`       |
| Facturación: factura de venta (datos)               | `.../Modals/InvoiceSaleModal/services/invoiceSaleService.test.js`                  |
| Facturación: clientes fiscales (cálculos)           | `.../InvoiceCustomers/services/invoiceCustomersCalculationService.test.js`         |
| Facturación: clientes fiscales (datos)              | `.../InvoiceCustomers/services/invoiceCustomersService.test.js`                    |
| Facturación: ajustes del emisor (cálculos)          | `.../InvoiceSettings/services/invoiceSettingsCalculationService.test.js`           |
| Facturación: ajustes del emisor (datos)             | `.../InvoiceSettings/services/invoiceSettingsService.test.js`                      |
| Facturación: historial (cálculos)                   | `.../InvoicesHistory/services/invoicesHistoryCalculationService.test.js`           |
| Facturación: historial (datos del reporte)          | `.../InvoicesHistory/services/invoicesHistoryReportService.test.js`                |
| Facturación: historial (detalle 360)                | `.../InvoicesHistory/services/invoicesHistoryDetailService.test.js`                |
| Facturación: ventas por facturar (cálculos)         | `.../InvoicesPending/services/invoicesPendingCalculationService.test.js`           |
| Facturación: ventas por facturar (datos)            | `.../InvoicesPending/services/invoicesPendingService.test.js`                      |
| Smoke de render del renderer y guardas de ruta      | `src/App.test.jsx`                                                                 |

### Cobertura transitiva del resolver de costo

`src/services/inventory/inventoryCostResolutionService.js` no tiene un archivo de test propio. Se
prueba **a través de sus dos consumidores**, que es donde importa el comportamiento:

- `.../PageAdd/services/inventoryAddService.test.js` (20 casos) lo ejerce por el camino de persistencia.
- `.../PageAdd/services/inventoryAddProjectionService.test.js` (18 casos) lo ejerce por el camino de la interfaz.

Es intencional: el módulo no tiene comportamiento propio más allá de `resolveCurrentCost`,
`resolveIncomingCostPrice` y `toNonNegativeNumber`, y probarlo por separado duplicaría los mismos
escenarios con nombres distintos. Una mutación que hace que el resolver compartido ignore el
`cost_price` de `branch_inventory` y herede el de catálogo rompe **5 casos, todos en
`inventoryAddService.test.js` y ninguno en la suite de proyección**: `getCurrentUnitCost` siempre
resuelve con `inventoryRow = null` (el producto ya trae el costo resuelto para la sucursal), de modo
que esa rama es inalcanzable desde la interfaz y no puede detectarse por ese camino. La detección
está donde el servidor sí lee la fila: la suite de persistencia.

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
  Para cambiar las props en un caso de prueba, `renderHook` necesita `initialProps` y el callback
  debe recibir ese objeto como parámetro: `renderHook((props) => useX(props), { initialProps })`.
  Si el callback cierra sobre variables externas, `rerender(...)` no cambia nada y el test pasa sin
  estar probando lo que cree.
- **Matchers de DOM:** el proyecto **no** instala `@testing-library/jest-dom`. No existen
  `toBeInTheDocument`, `toHaveTextContent` ni `toHaveClass`: usarlos lanza
  `Invalid Chai property`. Para contenido usa `expect(el.textContent).toContain(...)` y para clases
  `expect(el.className).toContain(...)`.
- **Estilo:** seguir el patrón existente; no introducir un framework de mocking distinto.

## Huecos de cobertura

Cubierto en la Fase 4 (rama `test/coverage-gaps`):

- **RPC de ventas:** contrato mock de `create_sale_transaction`
  (`salesTransactionService.test.js`) y contrato SQL de `create_sale_transaction` /
  `create_transfer_order` contra la migración `20260917200000`
  (`transactionalRpcsContract.test.js`), incluido el cross-check cliente↔BD de nombres de
  parámetros. `create_transfer_order` aún no tiene caller JS (la vista de traspasos es el stub de
  #12), por eso se fija su interfaz SQL.
- **Lógica de impresión y corte** (29 sep 2026, rama `feature/ticket-printer-ipc-setup`):
  `cashCutBuilder.js` (secciones, totales, wrapping e invariante de 32 columnas) y
  `ticketPrinter.js` sobre su contrato completo de `{ success, message, error, simulated }`: invocación
  del canal `print-ticket`, normalización de rechazos y excepciones, y el fallback `simulated` de
  navegador. Del lado del proceso principal, `ticketPrintService.test.js` (27 casos) fija los perfiles
  de papel, el documento HTML, la traducción de `options` a opciones de `webContents.print`, la espera
  de carga, el descarte de `did-fail-load` con código `-3`, la destrucción de la ventana utilitaria y
  el descubrimiento de impresoras; `mainProcess.test.js` fija el canal `print-ticket` de extremo a
  extremo, incluida la respuesta `NO_PRINTER_AVAILABLE` sin abrir ventana. Ver `KNOWN_ISSUES.md` #59.
  `electron/main.js` sigue siendo wiring puro y `electron/preload.js` no tiene test: la lista blanca
  de canales solo se valida contra los `ipcMain.handle` registrados.
- **Ganchos de página de reportes y de ventas** (25 sep 2026, 21 casos, rama
  `fix/code-quality-and-runtime-bugs`): `useReportsDashboard.test.js` fija que el `finally` de la
  petición obsoleta no invierte el resultado (mutación: quitar el guard rompe el caso), que una
  respuesta tardía no pisa el estado y que el intervalo se limpia al desmontar;
  `useSalesTableColumns.test.js` fija que cada listener de `mousedown` se empareja con su `mouseup`
  y que una columna reordenada invalida los cierres previos; `useSalesKeyboardShortcuts.test.js`
  fija que los atajos leen siempre las props vigentes sin re-registrar el listener.
- **Servicios de Facturación** (28 sep 2026, 294 casos en 17 archivos, rama
  `refactor/invoices-modularization-and-dip`): las 14 suites nuevas cubren los 16 servicios de
  cálculo y datos de las cuatro pantallas y los dos modales (payload de factura interna, conceptos y
  pagos derivados de la venta, ensamble del payload fiscal del cliente, normalización de RFC y
  C.P., rangos del día con desfase `-05:00`, filtrado de ventas sin factura, y los contratos de
  consulta de `customers`, `sales`, `invoices`, `invoice_items`, `invoice_payments` y códigos
  postales). `invoicesRealtimeService.test.js` fija el contrato que la auditoría de #54 rompió: un
  binding `postgres_changes` por tabla con `table` resuelto, un solo `.subscribe()` y el payload
  entregado a `onChange`.
- **Costo promedio ponderado (2 oct 2026, 23 casos en 1 archivo, rama
  `feature/costo-promedio-ponderado`):** `costSnapshotContract.test.js` fija el contrato SQL de
  `20261002124615_add_cost_tracking_and_sale_cost_snapshot.sql`: las columnas
  `inventory_movements.unit_cost`/`total_cost` y `sale_details.cost_price` con sus tipos y default,
  la resolución del costo desde `branch_inventory.cost_price` con fallback a `products.cost_price`, el
  `INSERT` del snapshot en las tres sobrecargas de `create_sale_transaction` (comprueba que
  `cost_price` sea la última columna y que la lista de valores esté alineada con la de columnas), que
  la sobrecarga efectiva de 11 parámetros conserve las columnas de comisión, que la migración no haga
  backfill histórico y que cada sobrecarga mantenga `SECURITY DEFINER`, `SET search_path TO 'public'`
  y los grants mínimos. Además `transactionalRpcsContract.test.js` se extendió para fijar que la
  definición vigente (la última migración que la redeclara) no altera la firma de la RPC endurecida
  de `20260917200000`, de modo que una redefinición futura no pueda cambiar los parámetros que el
  cliente envía ni perder el hardening.
- **Costo promedio ponderado, calculo y servicios** (2 oct 2026, 53 casos en 3 archivos, rama
  `feature/cpp-fase-2-servicios-y-calculo`): cierra el hueco de calculo que dejo la fase anterior.
  `inventoryCostCalculationService.test.js` (25 casos) fija la formula
  `((stock * costo) + (cantidad * costoEntrante)) / (stock + cantidad)` con el caso real de negocio
  (10 @ 100 -> +10 @ 400 = 250.00 -> +10 @ 200 = 233.33), los bordes de cantidad (stock 0, entrada 0,
  entrada negativa, fraccionadas, redondeo a 2 decimales) y la proteccion R2: stock negativo tratado
  como 0, costo entrante negativo neutralizado a 0 y resultado nunca negativo. Tambien fija la
  coercion de `NaN`, `Infinity`, `null`, `undefined`, strings numericos y la invocacion sin
  argumentos. `inventoryAddService.test.js` (20 casos) fija que el alta persista el CPP exacto en
  `branch_inventory.cost_price`, que respete un `cost_price` ya calculado en 0 frente al fallback del
  catalogo (el `??` en vez de `||`), que inserte con el costo entrante cuando no hay fila previa, que
  mande `unitCost`/`totalCost` a `logInventoryMovement` redondeados a 2 decimales y que propague
  errores de lectura y escritura sin registrar el movimiento. `inventoryMovements.test.js` (8 casos)
  fija el mapeo de `unit_cost`/`total_cost` con `Math.max(0, ...)` (R2), que los movimientos que no
  informan costo (ajustes, ventas, devoluciones) sigan guardando NULL, que un `null` explicito se
  guarde como NULL y no como 0, y que el fallback por columna ausente omita ambas columnas en lugar
  de fallar.
  El calculo puro vive en `src/services/inventory/` y no importa Supabase (SRP/DIP); el servicio de
  alta es el unico que persiste.

  **Distincion `null` vs `0` en las columnas de costo.** `NULL` significa "el movimiento no mueve
  valor" y `0` significa "se movio valor a costo cero": no es lo mismo y el reporte de rentabilidad
  depende de la distincion para separar costo real de costo desconocido. El guard nullish de
  `toCostColumn` va **antes** de la coercion a proposito, porque `Number(null)` es `0` y sin el guard
  un `unitCost: null` explicito persistiria un `0` falso. Ver el hallazgo H1 en la bitacora de
  auditoria.

  **Altas que no son compras no re-ponderan el CPP.** `resolveIncomingCostPrice` valora la mercancia
  entrante al costo promedio vigente cuando el flujo no informa un costo de compra explicito, de modo
  que `((stock*c) + (qtd*c)) / (stock+qtd) === c` y el promedio queda intacto. Heredar el precio de
  catalogo en ese caso contaminaria la base de costo de la sucursal con una operacion que no
  adquiere valor (correccion de conteo fisico, resguardo), y de forma silenciosa. El catalogo sigue
  sirviendo como promedio de referencia cuando **no existe** costo previo (primera fila de
  `branch_inventory` o `cost_price` nulo), que es el unico caso en que no hay lote al cual entrar al
  mismo costo. Solo un `incomingCostPrice` explicito y finito dispara la re-ponderacion real; un valor
  presente pero no numerico cae al costo vigente en vez de re-ponderar con basura. Ver el hallazgo H2.

  **Costo de adquisicion canonico.** `resolveIncomingCostPrice` redondea a 2 decimales una sola vez, y
  ese valor es el que alimenta el CPP, el `unit_cost` del movimiento y la base del `total_cost`. Asi se
  sostiene la invariante contable `total_cost === round(unit_cost * cantidad)`; redondear solo el
  importe dejaria `unit_cost` con mas decimales que el total que lo deriva (33.333 x 3 = 99.999 contra
  un `total_cost` de 99.99) y el movimiento dejaria de cuadrar consigo mismo.

  **Verificacion por mutacion.** Las tres suites se contrastaron mutando el codigo de produccion:
  quitar el clamp de negativos de `toNonNegativeNumber` rompe 3 casos; quitar el mapeo de columnas de
  costo rompe 5; quitar el guard nullish de `toCostColumn` rompe 2; revertir el fallback del CPP al
  catalogo rompe 5. La rama `if (safeCurrentStock <= 0)` **no** es detectable por mutacion y no se
  cuenta como verificada: con stock 0 la formula ya devuelve `(0*c + qtd*p)/(0+qtd) === p`, que es
  identico al `return roundCost(safeIncomingCost)`, y ninguna combinacion de cantidades fraccionadas
  y costos en centavos produce una diferencia tras el redondeo. Se conserva de todos modos porque
  documenta la regla de negocio ("sin base ponderable, el costo es el del lote entrante") y protege
  contra una reformulacion futura de la formula; lo que no debe afirmarse es que un test lo exija.

- **Smoke de render del renderer** (1 oct 2026, 15 casos en 1 archivo, rama
  `test/renderer-smoke-tests`): `App.test.jsx` monta la jerarquía real de `src/main.jsx`
  (`<BranchProvider><App /></BranchProvider>`) con `supabaseClient` y `productCatalogService`
  simulados y las páginas lazy sustituidas por stubs, de modo que el test mide el montaje y el
  enrutado y no la red de cada vista. Fija el arranque en frío (`LoadingScreen` → `/login`), todas
  las ramas de `AuthGuard` (sin caja, con caja, `requireNoCashRegister`, `isLocked`), la ruta raíz, el
  wildcard y la resiliencia de `useResponsiveScale` con y sin `window.electronAPI`. Para poder usar
  `MemoryRouter` sin anidar dos routers de React Router 7, `AppRoutes` es named export y acepta
  `RouterComponent` (por omisión `HashRouter`), igual que `App`.

No hay todavía:

- Tests de componentes/UI ni de flujos de integración. Las vistas presentacionales del corte
  (`src/pages/CashCut/components/`) son puramente de render y no están cubiertas. Lo mismo aplica a
  los 25 subcomponentes de Facturación (`.../InvoicesComponents/**/components/`): son de render y
  reciben el estado ya resuelto del hook. La única capa de UI cubierta es el smoke del renderer: las
  páginas que monta siguen siendo stubs.
- Tests del backend Express/SQLite (`src/backend/server.js` y `bd.js`): `app.listen()` y la apertura
  de SQLite ocurren al importar el módulo, por lo que requieren un desacople previo. La
  inicialización de Express/SQLite **no** vive en `electron/main.js`.
- Tests a nivel de ejecución de los RPC: se fija la firma SQL (parámetros, retorno, grants), no se
  ejecuta la función en Postgres.
- Tests E2E.
- Los mapeos de pagos por método, departamentos y dólares en `useCashCutReport`: los fetches
  secundarios se mockean vacíos y no se asertan sus resultados agrupados.

**Siguiente capa de valor recomendada:** desacoplar `src/backend/server.js` (factory de Express) y
`bd.js` (inyección de la conexión SQLite) para poder cubrir el backend local, y extender la capa de
UI más allá del smoke (páginas reales, flujos de interacción). Ver `KNOWN_ISSUES.md` #8 y #9.

## Linter y formateo (ESLint 9 + Prettier, incremental)

Configurado en la rama `chore/tech-debt-foundations` (Fase 0, `KNOWN_ISSUES.md` #8):

- **ESLint 9 flat config** en `eslint.config.mjs` (package.json es CommonJS, por eso `.mjs`):
  reglas `recommended` (`@eslint/js`) + `eslint-plugin-react` (jsx-runtime) +
  `eslint-plugin-react-hooks` (recommended). `no-console` con `allow: ["error"]` para preservar los
  `console.error` obligatorios en bloques `catch`. `no-unused-vars` en modo `warn`. `react/jsx-uses-vars`
  en `error` sobre `**/*.{js,jsx,mjs}`: sin ella, todo componente importado para usarse solo como
  etiqueta JSX se reportaba como variable sin usar (564 warnings que no eran deuda real; hoy son 187).
  `languageOptions.globals` declara los constructores DOM que el código y las suites usan
  (`Event`, `CustomEvent`, `KeyboardEvent`, `MouseEvent`, `HTMLElement`, `HTMLButtonElement`) como
  `readonly`, para que crearlos en los tests no dispare `no-undef`; el resto de globals del DOM no
  se declara porque no se usan.
- **Prettier 3** con `.prettierrc.json` (2 espacios, comillas dobles —estilo dominante del repo—,
  `trailingComma: es5`, `lf`) y `.prettierignore` (`dist/`, `node_modules/`, `supabase/.temp/`,
  `supabase/functions/`).
- Scripts en `package.json`:
  - `npm run lint` — corre ESLint sobre el repo completo (la base de violaciones legacy es
    conocida y **no** se corrige en esta fase; solo archivos nuevos/modificados).
  - `npm run format` — `prettier --write .` (normalización opt-in).
  - `npm run format:check` — `prettier --check .`.
- **CI incremental:** el workflow `.github/workflows/ci.yml` corre ESLint y Prettier **únicamente
  sobre los archivos del diff** (`git diff --diff-filter=ACM` contra la base del PR/push, filtrado con
  `grep -E`, que es POSIX y está siempre disponible en el runner; una versión anterior usaba `rg` y no
  evaluaba nada). Así los archivos legacy sin formatear no rompen el pipeline; cualquier archivo nuevo
  o modificado queda obligado a cumplir el estándar. No hay husky ni lint-staged (decisión Fase 0).
- **Node requerido: `>=22.22.2`** (declarado en `engines` de `package.json` y usado por el CI).
  `jsdom@30`/`undici@8` exigen Node 22.22.2+ y `vitest@5` 22.12+; **Node 20 no funciona** (el
  worker de Vitest falla al cargar jsdom con `webidl.util.markAsUncloneable is not a function`).
  Alinear la versión local con el CI evita discrepancias.
