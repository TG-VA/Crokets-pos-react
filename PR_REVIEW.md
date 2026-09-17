# PR_REVIEW.md — Guía de revisión de Pull Requests

Lista de verificación completa para la revisión de PRs (humana y mediante agentes de IA como Claude, Gemini, Cursor o Copilot).

## Metodología de Verificación (obligatoria antes de marcar cualquier ítem)

- **Evidencia textual obligatoria:** ningún ítem puede marcarse "CUMPLIDO" sin citar el
  archivo, línea o fragmento exacto del diff que lo demuestra. Una explicación de la
  intención del código ("se agregó el filtro is_active") no es evidencia; el fragmento
  citado sí lo es.
- **Verificación mecánica antes que interpretación:** para ítems verificables por
  búsqueda de texto (estilos inline, emojis, console.log, EOF newline), ejecutar
  la búsqueda literal sobre el diff (`grep`, búsqueda de patrón) y reportar el resultado,
  no inferirlo por lectura.
- **Rastrear el dato, no el nombre de la variable:** para ítems de la sección 2
  (Corrección de Datos), seguir el valor a través de todo su ciclo de vida en el
  código —dónde se asigna, si se reasigna en loops/iteraciones, en qué rama de
  condicionales termina— en vez de asumir que un nombre como `fallback_cost` o
  `weighted_average` hace lo que su nombre sugiere.
- **Buscar el caso que rompe la regla, no el caso feliz:** para cada fórmula o
  agregación nueva, identificar explícitamente el escenario de datos que la
  quebraría (valores distintos entre filas, cero, registros faltantes) y confirmar
  en el código qué pasa en ese escenario — no solo confirmar que existe una regla
  para el caso general.
- **Un "100%" o "sin reservas" requiere que cada ítem tenga su cita.** Si algún
  ítem no se pudo verificar con evidencia concreta, el veredicto no puede ser
  aprobación total — debe marcarse como pendiente de verificar, no como cumplido
  por omisión.

## Checklist de Revisión

### 0. Si este PR responde a bloqueantes de una revisión previa
- [ ] **Diff del bloque señalado:** por cada bloqueante previamente reportado, pegar el fragmento de código **anterior** y el **nuevo** del bloque exacto que fue señalado (no del área general que lo rodea). Si son idénticos, el bloqueante sigue abierto — no puede marcarse resuelto citando otro fragmento cercano que sí cambió.
- [ ] **Todos los bloqueantes atendidos:** listar cada bloqueante de la revisión anterior y su estado individual (resuelto / no resuelto), no solo un veredicto global. Un PR no puede marcarse "sin reservas" si algún bloqueante previo quedó sin mención explícita.

### 1. Funcionalidad y Arquitectura
- [ ] **Pruebas en desarrollo:** ¿El cambio fue probado con `npm run dev` verificando el flujo completo (ventas, caja, sucursal)?
- [ ] **Aislamiento de lógica (SRP):** ¿La lógica de negocio reside en hooks/servicios y no saturando el JSX del componente?
- [ ] **Extensibilidad sin reescritura (OCP):** ¿Las estructuras repetitivas (KPIs, columnas, opciones) se diseñaron basadas en configuración/descriptores en lugar de bloques de código duplicados?
- [ ] **Segregación de interfaces (ISP):** ¿Los subcomponentes reciben únicamente los props que consumen en lugar de objetos contenedores pesados ("fat props")?
- [ ] **Inversión de dependencias (DIP):** ¿Los componentes UI delegan la persistencia a hooks y servicios sin importar directamente clientes de base de datos (`supabase`, `sqlite3`)?
- [ ] **Separación por ciclo de vida en servicios (Escalabilidad):** ¿Se separaron las consultas generales de las consultas de detalle a profundidad (ej. `*ReportService` vs `*DetailService`) y se delegaron las agregaciones y algoritmos a `*CalculationService`?
- [ ] **Validación DRY:** ¿El código introducido hace uso de hooks, contextos o servicios globales existentes en lugar de reescribir su propia implementación?
- [ ] **Validación KISS/YAGNI:** ¿El refactor soluciona el problema actual de la forma más directa posible, sin introducir sobreingeniería o configuraciones para escenarios futuros no confirmados?
- [ ] **Límite de líneas:** ¿Se evitó crear o agrandar 'god components' de más de 300-400 líneas?
- [ ] **Escala del dataset:** si el componente/servicio trae datos sin paginar desde el backend (ej. catálogo completo de productos, inventario de todas las sucursales), ¿se validó el volumen esperado y el impacto en memoria/tiempo de carga del cliente?

### 2. Corrección de Datos y Lógica de Negocio
- [ ] **Fuente de verdad en agregaciones:** si el PR consolida datos de múltiples sucursales/entidades (ej. "todas las sucursales"), ¿se validó qué pasa cuando esos registros tienen valores distintos entre sí (precios, estados, mínimos/máximos)? ¿El resultado es determinístico o depende del orden en que la query devuelve las filas?
- [ ] **Traza numérica del caso límite:** para cada fórmula de agregación entre múltiples fuentes, ejecutar mentalmente y mostrar el resultado con datos de ejemplo donde las fuentes difieren (ej. "Sucursal A: stock=0, costo=$10. Sucursal B: stock=0, costo=$15. ¿Qué costo unitario muestra el consolidado y por qué?"). Identificar el escenario que rompería la regla no es suficiente — hay que ejecutarlo con números concretos y mostrar el resultado real del código. Si la respuesta depende del orden de iteración o de la query, el ítem no puede marcarse CUMPLIDO.
- [ ] **Filtros de query completos:** ¿el `select`/`where` a Supabase excluye explícitamente registros inactivos, dados de baja o soft-deleted (`is_active`, `status`, `deleted_at`, etc.), o los está incluyendo por omisión?
- [ ] **Flags de negocio usados o dead code:** si se trae un campo de la base de datos (`has_been_stocked`, `is_active`, etc.) pero no se usa en ningún cálculo, condición o filtro del código, ¿es intencional o quedó a medias?
- [ ] **Casos borde de cálculo:** para cualquier fórmula nueva (KPIs, sugerencias, totales, porcentajes), ¿qué pasa con cero, valores negativos, nulls, o el registro "primero"/"nunca actualizado" en un merge de datos?
- [ ] **Consistencia con módulos existentes:** si el PR duplica un cálculo que ya existe en otro reporte/servicio (ej. valorización, márgenes), ¿el resultado coincide con la fuente ya validada?

### 3. Estado y Contexto Global
- [ ] **Sincronización con contexto global:** si el componente lee y escribe un contexto compartido (`useBranch`, etc.), ¿las acciones del usuario (incluyendo "resetear" o "ver todo") actualizan ese contexto de forma consistente, o puede quedar desincronizado con el resto de la app?
- [ ] **Efectos secundarios cruzados:** ¿un cambio de estado en esta pantalla puede alterar el comportamiento de otras pantallas que dependen del mismo contexto/hook global, de forma no evidente para el usuario?

### 4. Estilos y UI
- [ ] **CSS Modules:** ¿Se usaron únicamente archivos `*.module.css` sin estilar con CSS global o frameworks externos?
- [ ] **Cero estilos inline:** ¿Se eliminaron los atributos `style={{...}}` innecesarios en JSX?
- [ ] **Sin `!important`:** ¿El CSS Module no utiliza `!important` para forzar estilos?
- [ ] **Clases dinámicas limpias:** ¿Las interpolaciones de `className` no dejan espacios extra en blanco?
- [ ] **Iconos SVG locales:** ¿Se importaron SVGs locales desde `src/assets/icons/` respetando `ICONS.md`?
- [ ] **Existencia de assets:** ¿Se verificó que los iconos/rutas importados realmente existen en el repo?

### 5. Convenciones Estrictas y Logs
- [ ] **Cero Emojis:** ¿El diff está 100% libre de emojis en código, UI, comentarios o mensajes de error?
- [ ] **Limpieza de Debug:** ¿Se eliminaron todos los `console.log` y `console.warn` de rastreo?
- [ ] **Preservación de Errors:** ¿Se mantuvieron los `console.error` en bloques `catch` (sin emojis) para mantener trazabilidad en producción?
- [ ] **EOF Newline:** ¿Todos los archivos modificados finalizan con un salto de línea en blanco?

### 6. Documentación
- [ ] **Checklist de estado:** Si el PR completa una página o resuelve un ítem de `KNOWN_ISSUES.md` o `TEMPLATE_NUEVA_PAGINA.md`, ¿se actualizó la documentación correspondientemente?

### 7. Accesibilidad (a11y) y Calidad
- [ ] **Imágenes decorativas:** ¿Los iconos/imágenes dentro de botones con `title`/texto tienen `alt=""` para evitar redundancia en lectores de pantalla?
- [ ] **Comentarios:** ¿Los comentarios son claros, explican el propósito actual y no contienen historial de refactorizaciones?
- [ ] **Cobertura de casos críticos:** para lógica de cálculo nueva y no trivial (KPIs, valorizaciones, sugerencias de compra), ¿existe al menos una prueba o verificación manual documentada de los casos borde mencionados en la sección 2?

---

## Informe de Auditoría — RAMA `perf/report-optimization` (10 de septiembre de 2026)

**Alcance:** migración de los reportes de Comisiones, Inventario, Caja y Rentabilidad de fetching
cliente→RPC con agregación server-side + eliminación del truncamiento de `MAX_SALES`.
Commits revisados: `1ef4acc`, `612b68a`, `96a622d`, `30328a1`, `8123f72` (estado de canceladas),
`7f8782f` (docs #18-25) y migraciones `20260910120500`/`20260910120600` (correcciones). Base:
`b0c1d621`.

### Veredicto por sección

**§0 Bloqueantes de revisión previa — RESUELTO (con evidencia):**
- Comisiones: se revirtió el doble-fetch completo y se movió todo a un único RPC
  (`get_commissions_report_data`, `commissionsReportService.js:63-73` → `supabase.rpc(...).limit(100000)`).
- Caja: movimientos con `.limit(100000)` (`cashReportService.js`); inventario: export habilitado con
  dataset completo.
- `MAX_SALES = 600` eliminado; la única cota es `.limit(100000)` por query/RPC y `CHUNK_SIZE = 100`
  por chunk de `sale_details` en rentabilidad.

**§1 Funcionalidad y Arquitectura — CUMPLIDO:**
- SRP: RPCs de datos de reporting (SQL) + servicios delgados que solo mapean y encadenan
  `.limit(100000)` + hooks de estado sin lógica de persistencia (DIP respetado: los componentes no
  importan `supabase`). Evidencia: `commissionsReportService.js`, `cashReportService.js`,
  `inventoryReportService.js`, `profitabilityReportService.js` y rama 6 (Escala) — la RPC elimina
  el N+1 de `sales`+`sale_details` en chunks (`20260910120200.sql`).
- OCP/ISP/KISS: sin bloques JSX duplicados; las agregaciones se mueven al servidor en un solo place.

**§2 Corrección de Datos y Lógica de Negocio — CUMPLIDO con 1 hallazgo resuelto y 2 riesgos verificados con datos reales (sin cambio de código):**
- Hallazgo resuelto (F1): filtro de ventas canceladas `!= 'canceled'` no matcheaba el enum canónico
  `'cancelled'`/`'cancelada'` → pagaba comisión por tickets cancelados. Corregido en
  `20260910120500_fix_commissions_status_filter.sql` (`NOT IN ('cancelled','cancelada')`). Ver
  `KNOWN_ISSUES.md` #18.
- Riesgos verificados con datos reales (17 sep 2026, rama `fix/security-hardening`): la RPC y el
  client ya coinciden en la base neta (`unit_price*qty = total_price` en las 239 filas de
  `sale_details`) y los bordes de precedencia `value/percent`, `has_commission` y tipo `percentage`
  no ocurren en los 44 productos (YAGNI, sin migración) — ver `KNOWN_ISSUES.md` #19 y #20.
- `ticket_number`: el RPC devuelve `upper(substring(id::text,1,8))`, idéntico a
  `id.substring(0,8).toUpperCase()` del app — consistente.
- Caso límite de la fuente de verdad (multi-sucursal en inventario): los costos se agregan por
  sucursal y el RPC devuelve la fila de cada sucursal; el consolidado lo deriva el service — sin
  dependencia de orden de filas para el valor unitario de una sucursal concreta.

**§3 Estado y Contexto Global — SIN CAMBIO:** los reportes no mutan contextos compartidos; la
paginación visual sigue sobre `usePagination` (client-side).

**§4 Estilos y UI — SIN CAMBIO de JSX/CSS en el diff.** Nota: `rule_label` cambió de formato vs
legacy (`percent: 10%` vs `10.00%`) — QA visual pendiente, ver `KNOWN_ISSUES.md` #24.

**§5 Convenciones Estrictas y Logs — CUMPLIDO (verificación mecánica):**
- Emojis: búsqueda de rango Unicode sobre el diff sin resultados.
- `console.log`/`console.warn`: sin resultados en archivos nuevos/modificados; `console.error` en
  `catch` preservados sin emojis.

**§6 Documentación — CUMPLIDO:** este informe (incl. micro-pase de seguridad) + `KNOWN_ISSUES.md`
(#18-26), `BACKLOG.md` y `SCHEMA.md` (valores de `sales.status`) actualizados.

**§7 Calidad/testing — CUMPLIDO:** suite `npx vitest run` pasa 119/119 (118 previos + contrato de
filtro de estados); `npx vite build` OK (warning de chunk preexistente).

### Micro-pase de seguridad (skill security-best-practices, 10 sep 2026)

Escaneo del alcance del PR contra las referencias React/JS de la skill (audit order: secrets,
network layer, sinks, authz). Alcance: migraciones SQL (RPCs) + services JS + tests. Sin cambios de
JSX/UI en el diff (sin superficie DOM/redirect/postMessage nueva).

- **SEC-GRANT-001 — Medio → CORREGIDO.** Los RPCs de reportes concedían `EXECUTE` a `anon`
  (`20260910120100:93`, `20260910120200:122`, `20260910120300:127`, `20260910120400:123`,
  `20260910120500:125`). Con funciones invoker y RLS `USING(true)` en varias tablas de datos
  (`KNOWN_ISSUES.md` #13), un llamador sin sesión podía invocar reportes de caja/comisiones/
  inventario con la anon key pública. Fix: `20260910120600_restrict_report_rpc_grants.sql` revoca
  `EXECUTE ... FROM anon` (se conserva `authenticated`; la app solo llama con sesión vía
  `AuthContext`, `src/App.jsx:22`). Follow-up: el patrón base `20260909123000` comparte el mismo
  grant `anon` — ver `KNOWN_ISSUES.md` #26.
- **SEC-RPC-002 — PASS (SQL injection):** parámetros tipados `p_*` (`uuid`, `timestamptz`, `integer`),
  `LIMIT/OFFSET` numéricos calculados con `COALESCE`, sin concatenación de strings — no hay SQL
  dinámico.
- **SEC-NET-003 — PASS:** los services usan el `supabaseClient` fijo (`src/lib/supabaseClient.js:3-6`,
  URL + anon key vía `VITE_*`); sin destinos controlados por el usuario ni requests con credenciales
  hacia orígenes externos.
- **SEC-SECRETS-004 — PASS:** grep del diff sin secretos/credenciales (única coincidencia:
  `client_sale_token`, columna de idempotencia).
- **SEC-DEFINER-005 — PASS:** todos los RPCs son `LANGUAGE sql` invoker (sin `SECURITY DEFINER`), por
  lo que las políticas RLS siguen aplicando al llamador.

---

## Informe de Auditoría — RAMA `refactor/ticket-builder` (16 de septiembre de 2026)

**Alcance:** descomposición de `src/utils/ticketBuilder.js` (1501 líneas) en `src/utils/ticket/`
(8 módulos puros + orquestador) con salida byte-idéntica y golden tests. Commits revisados:
`e47468b` (golden), `d81feb3`, `a6dd10d`, `519d30c` (extracciones), `fefdcc5` (ramas de
cancelación/puntos), `a69f142` (docs previas), `6322c9b` (DRY `getReturnPointsFromReturn`),
`91c7087` (rename `ticketLayoutFormatters`) y el commit de esta sección de auditoría. Base:
`origin/main`.

### Veredicto por sección

**§0 Bloqueantes de revisión previa — N/A:** esta rama no responde a bloqueantes previos.

**§1 Funcionalidad y Arquitectura — CUMPLIDO:**
- SRP/DIP: `src/utils/ticket/*.js` no importa `supabase` ni `sqlite3` (DIP); 8 módulos puros +
  orquestador (`src/utils/ticket/ticketBuilder.js:1-127`). Fuera del paquete solo se consume el
  export nombrado `buildTicketText`.
- OCP/ISP/KISS: los builders reciben únicamente lo que consumen; sin barrel/index ni config futura.
- Límite de líneas: `ticketSections.js` (640) y `ticketRewardService.js` (430) superan el umbral de
  300-400 de esta guía, pero son módulos puros sin UI/DB/estado (no "god components") y
  `CODE_STANDARDS.md` (KISS) desaconseja fragmentarlos; se dejan documentados. Origen: 1501 líneas
  → máximo actual 640.
- Pruebas en desarrollo: la impresión física del ticket **no** se probó manualmente; la
  equivalencia se garantiza con golden tests byte-idénticos. **QA manual pendiente.**

**§2 Corrección de Datos y Lógica de Negocio — CUMPLIDO:**
- Equivalencia verificada contra `origin/main`: 53/54 helpers token-idénticos y
  `getPartialReturnPointsFromReturns` refactorizado a delegar en `getReturnPointsFromReturn`
  (cadena de alias idéntica, ver re-auditoría al final); secuencia de
  `lines.push` de `buildTicketText` 104 = 104 idéntica (cubre ramas no asertadas); setup del
  orquestador y orden de composición idénticos; `buildTicketText` difiere solo por la descomposición
  esperada. Golden creado en el commit 1 (antes de extraer) → autoritativo.

**§3 Estado y Contexto Global — SIN CAMBIO:** no se mutan contextos compartidos.

**§4 Estilos y UI — SIN CAMBIO:** el diff no toca JSX ni CSS.

**§5 Convenciones Estrictas y Logs — CUMPLIDO (verificación mecánica):**
- Emojis: rango Unicode sobre líneas agregadas del diff sin resultados; `git log` sin emojis.
- `console.log`/`console.warn`: sin resultados en líneas agregadas; `src/utils/ticket/` sin bloques
  `catch` (no requiere `console.error`).
- EOF newline: 25/25 archivos del diff y todos los `src/utils/ticket/*` terminan en `0a`.

**§6 Documentación — CUMPLIDO:** `KNOWN_ISSUES.md` (#3 y #9 con conteos y desglose corregidos),
`docs/TESTING.md` (31 archivos / ~359 casos), `BACKLOG.md:17` y esta sección actualizados.

**§7 Calidad/testing — CUMPLIDO:** `npm test` pasa 359/359 (109 del paquete ticket en 9 suites);
`npm run build:frontend` OK. Ramas de cancelación con puntos, canje cancelado y devoluciones
parciales sin `created_at`/`items` cubiertas en `fefdcc5`.

### Hallazgos de la revisión
- MAJOR — resuelto: cobertura de ramas de cancelación/puntos (`fefdcc5`).
- MINOR — resueltos: self-referencias y conteos de `KNOWN_ISSUES.md`; naming
  `ticketLayout.js` → `ticketLayoutFormatters.js` (`91c7087`); duplicación DRY → `getReturnPointsFromReturn`
  (`6322c9b`).
- SUGERENCIA: `ticketSections.js` (640 líneas) podría dividirse en `sections/` si crece (hoy
  choca con KISS/YAGNI).
- QA manual pendiente del revisor: imprimir un ticket real con `npm run dev`.

### Re-auditoría (16 de septiembre de 2026)

Paso de la rama completo (commits `e47468b` → el presente) contra `origin/main` y contra los
estándares del repo, con el objetivo de quedar sin hallazgos. Hallazgos y estado:

1. **CORREGIDO — "54/54 helpers token-idénticos" (línea §2).** Tras `6322c9b` (DRY) son 53/54;
   `getPartialReturnPointsFromReturns` ahora delega en `getReturnPointsFromReturn`. Se verificó que
   la cadena de alias de puntos es idéntica a la del original y que la región de devoluciones
   parciales de `buildPartialReturnsSection` es idéntica salvo el wrapper `return lines`.
2. **CORREGIDO — "24/24 archivos del diff" (§5).** El diff actual vs `origin/main` son 25 archivos
   (este propio informe entró al diff); se ajustó a 25/25 con EOF verificado en todos.
3. **CORREGIDO — "ticketSections.js (654)" (§1 y SUGERENCIA).** Tras el DRY el archivo quedó en 640
   líneas; se actualizaron las tres menciones.
4. **CORREGIDO — `KNOWN_ISSUES.md` #3 (filas ~1720).** El total real de fuente en `src/utils/ticket/`
   es 1711; se ajustó a `~1710`.
5. **INFORMATIVO (sin cambio de código) — default de `getReturnPointsFromReturn(ret = {})`.** Con un
   elemento `undefined` en el arreglo de devoluciones devolvería 0 donde el original lanzaba
   TypeError; con `null` ambos lanzan. No es alcanzable en producción (los datos provienen de
   JSON/Supabase, donde `undefined` no existe), así que es un endurecimiento intencional y no una
   regresión.

Verificación final de la re-auditoría: 109 tests en el paquete ticket (9 suites), `npm test`
359/359, `npm run build:frontend` OK, sin emojis ni `console.log`/`console.warn` en líneas
agregadas del diff, sin referencias a `ticketLayout` ni a `src/utils/ticketBuilder.js`, grafo de
imports acíclico.

---

## Informe de seguridad — Fase 1 (rama `fix/security-hardening`, 17 sep 2026)

Alcance: cierre de #19/#20 (ya commiteado) y hardening SEC de #29, #38, #30, #13 y #10.

### Cambios aplicados

| Ítem | Tipo | Archivo | Estado |
|---|---|---|---|
| #29 validación de sucursal en caja | Migración SQL | `supabase/migrations/20260917190000_cash_register_branch_validation.sql` | Creada, **no aplicada al remoto** (pendiente `supabase db push`) |
| #30 excepción `get_branch_by_device` | Docs | `docs/SUPABASE_MIGRATIONS.md`, `PERMISSIONS.md` | Documentada |
| #38 auditoría SEC-3 | Migración SQL + Docs | `supabase/migrations/20260917200000_harden_transactional_rpcs.sql`, `docs/EDGE_FUNCTIONS.md`, este informe | Mitigado parcialmente; riesgo aceptado en mutaciones admin |
| #13/#10 matriz RLS/roles | Docs | `PERMISSIONS.md` | Decidido: "hardening sin habilitar RLS", riesgo aceptado |

La migración #29 agrega `_user_can_access_branch(p_branch_id)` (`SECURITY DEFINER`, exento
`is_admin()`) y exige membresía activa en `user_branches` a `get_cash_register_session` y
`open_cash_register`, lanzando `42501` (`insufficient_privilege`) si no pertenece. No se tocaron las
migraciones ya aplicadas.

### Auditoría #38 — acciones administrativas por endpoint

| Acción UI | Mutación server-side | Control actual | ¿Exige admin? |
|---|---|---|---|
| `cash_exit_access` | `INSERT cash_movements` | RLS por dueño (`user_id = auth.uid()`) + sesión abierta | No |
| `customers_deactivate` | `UPDATE customers` | RLS deshabilitado (solo `GRANT` de tabla) | No |
| `deactivate_fiscal_customer` | `UPDATE customers` | RLS deshabilitado | No |
| `products_delete_access` | `DELETE products` | RLS deshabilitado | No |
| `invoice_settings_access` | `UPDATE cfdi_settings` | RLS activo sin políticas (deny-all salvo RPC/owner) | Parcial |
| `reports_*`/`products_*_access` | Navegación (sin mutación) | No aplica | No aplica |

Las RPC transaccionales (`create_sale_transaction` ×3, `cancel_sale_transaction`,
`create_partial_return_transaction`, `create_transfer_order`, `cancel_transfer_order`,
`receive_transfer_order`, `cancel_sale`, `complete_sale`) eran `SECURITY DEFINER` con `EXECUTE` para
`anon`/`PUBLIC` y recibían `p_user_id` del cliente en vez de derivarlo de `auth.uid()`.

**Decisión y mitigación aplicada (17 sep 2026):** se eligió el modelo "hardening sin habilitar RLS"
(no se activan políticas sobre las ~37 tablas sin RLS). La migración
`20260917200000_harden_transactional_rpcs.sql` (a) revoca `EXECUTE` a `anon` y `PUBLIC` en esas RPCs
(solo `authenticated`/`service_role`) y (b) fija `p_user_id := coalesce(auth.uid(), p_user_id)`, de
modo que un usuario autenticado no puede suplantar a otro; el valor entrante solo se conserva sin
sesión (`service_role`). `is_admin()` resuelve `users.id = auth.uid()`, así que el uid coincide con
`public.users.id`.

**Conclusión #38:** mitigado lo mitigable sin la matriz de roles. Persisten como **riesgo aceptado**:
las mutaciones administrativas vía PostgREST (`cash_movements`, `customers`, `products`) que cualquier
usuario autenticado puede invocar saltándose el modal; y la falta de validación/auditoría de
`reason`/`action`/`targetId` en `authorize-admin-action`. Se resolverían con RLS por módulo +
`has_permission()`, o con un token de un solo uso desde `authorize-admin-action` (ver
`docs/EDGE_FUNCTIONS.md`).

### Verificación

- `npm test`: 359/359 en 31 archivos. `npm run build:frontend`: OK (4.29 s).
- Migraciones #29 y #38/SEC-3: sin build de DB local (Docker no disponible). Ambas se **validaron
  ejecutándolas contra el remoto dentro de `BEGIN; … ROLLBACK;`** (HTTP 201) y confirmando después que
  no persistió nada (helper ausente / ACL intacta). Aplicación remota pendiente de `supabase db push`.
- La migración de hardening se generó desde `pg_get_functiondef` del remoto (sin transcripción manual)
  para eliminar riesgo de divergencia de cuerpos; solo se insertó la línea de `auth.uid()` al inicio de
  cada cuerpo y se añadieron los `REVOKE`.
