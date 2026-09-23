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

## Informe de Auditoría — RAMA `chore/tech-debt-foundations` (17 de septiembre de 2026)

Fase 0 de deuda técnica: guardarraíles (ESLint/Prettier/CI), baseline de migraciones de Supabase y
re-baseline documental. **No modifica código de producción**: `src/` no aparece en el diff. El
cambio son archivos de configuración, CI, migraciones SQL y documentación.

### Veredicto por sección
**§1 Funcionalidad y Arquitectura — N/A (sin cambios de runtime).** El diff no toca componentes,
hooks ni servicios. El build pasa (`npm run build:frontend` OK, 4.33 s) con el code-splitting
existente intacto (`spreadsheets` 1.36 MB bajo demanda). La configuración de ESLint respeta los
estándares del repo (`no-console` solo permite `console.error`).

**§2 Corrección de Datos y Lógica de Negocio — CUMPLIDO (migraciones idempotentes).**
`migrations/20260917180000_get_email_by_username.sql` reproduce el cuerpo exacto del remoto
capturado con `pg_get_functiondef` (`SECURITY DEFINER`, `STABLE`, `search_path=public` fijo, retorna
solo el email de usuarios `status = true`) y normaliza grants (`REVOKE ALL FROM public` + `anon`,
`authenticated`, `service_role`). Tras `db push` se verificó por introspección que la ACL es
`anon/authenticated/service_role` (sin el grant implícito a `public`).
`00000000000000_remote_schema_baseline.sql` es **schema-only**: 0 `INSERT`/`COPY`; 50 tablas, 30
funciones, 31 policies. Se marcó como aplicada con `migration repair` (no re-ejecuta DDL) y
`supabase migration list` muestra las **15 versiones alineadas** local/remoto.

**§3 Estado y Contexto Global — N/A:** no se tocan contextos compartidos.

**§4 Estilos y UI — N/A:** el diff no toca JSX ni CSS. La única regla CSS es la configuración de
Prettier (`tabWidth 2`, comillas dobles, `trailingComma es5`, LF), alineada con el estilo dominante
del repo.

**§5 Convenciones Estrictas y Logs — CUMPLIDO (verificación mecánica):**
- Emojis en líneas agregadas del diff: sin resultados (las dos apariciones de `✅` en
  `KNOWN_ISSUES.md` son texto preexistente de #34, no líneas nuevas).
- `console.log`/`console.warn`: sin resultados en los archivos nuevos.
- EOF newline: 0 archivos del diff sin salto final (verificado por byte con `od`).
- Sin `!important`, emojis ni estilos inline introducidos.

**§6 Documentación — CUMPLIDO:** `KNOWN_ISSUES.md` (#6, #8 y #41 con estado y fecha),
`BACKLOG.md` (checkboxes de lint y migraciones), `docs/SUPABASE_MIGRATIONS.md` (baseline, tabla de
migraciones, `legacy/`, `scripts/` y flujo de `migration repair`), `SCHEMA.md` (script versionado y
baseline) y `docs/TESTING.md` (sección de lint/format). El SQL legacy se movió de la raíz a
`supabase/legacy/` con `git mv` (historial preservado).

**§7 Calidad/testing — CUMPLIDO:** `npm test` 359/359 (31 archivos); `npm run build:frontend` OK;
ESLint y Prettier incrementales sobre el diff contra `origin/main` (`3491a90`) con `EXIT=0` en
ambos. Se corrigió el formato de `eslint.config.mjs` y `.prettierrc.json` antes de cerrar (Prettier
los marcaba).

### Notas y límites conscientes
- **Lint incremental:** el repo arrastra 684 problemas legacy (140 errores, 544 warnings) que no se
  corrigen en esta fase; el CI solo bloquea por el diff para no congelar el proyecto. Queda como
  deuda a saldar conforme se tocan archivos (documentado en #8).
- **Baseline marcado con `migration repair`:** es una operación de historial, no de schema; no se
  ejecutó DDL sobre el remoto (se verificó que `db push --dry-run` solo listaba la migración nueva).
- **`SCHEMA.md`** no se regeneró con las últimas migraciones (`app_settings`, RPCs de caja/login);
  se documentó como pendiente con el script versionado listo para regenerarlo.
- **`rg` en el CI:** el workflow usa ripgrep (preinstalado en los runners `ubuntu-latest` de GitHub)
  con `xargs -r`; el exit 0/1 se maneja con `|| true` para el caso sin archivos.
- **Pendiente de Fase 0:** confirmar que el workflow CI se dispara correctamente en el primer push
  del PR (no se puede validar localmente el runner de GitHub).

---

## Informe de Auditoría — RAMA `perf/reports-scalability` (17 de septiembre de 2026)

**Alcance:** escalabilidad de reportes y SRP: #21 (pushdown del CTE `session_payments` + índice),
#22 (concurrencia acotada en rentabilidad), #25 (extraer `inventoryReportCalculationService.js`) y
#45 (llave de agrupación de pagos por `id`). No hay cambios de UI ni de contratos de datos; la
salida de los reportes se mantiene idéntica.

### Veredicto por sección
**§1 Funcionalidad y Arquitectura — CUMPLIDO:**
- #22: nuevo helper `mapWithConcurrency` en `src/utils/asyncUtils.js` (DIP: el service no cambia su
  dependencia de Supabase, solo el patrón de carga); `profitabilityReportService.js` pasa de un
  `for await` secuencial a lotes de 100 con concurrencia 4, aislando el fallo por lote (`[]`).
- #25: `inventoryReportCalculationService.js` puro (sin I/O) con las agregaciones y
  `inventoryReportService.fetchInventoryReportData` reducido a RPC + delegación, conservando el
  contrato `{ items, kpis, byDepartment, reorderSuggestions, exhaustedProducts, departments }`.
- #45: `groupPaymentsByMethod` agrupa por `id` (`name` solo como fallback) con `Map`.

**§2 Corrección de Datos y Lógica de Negocio — CUMPLIDO:** #21 reescribe únicamente el acotamiento del
CTE; validado contra el remoto con `BEGIN/ROLLBACK` (34 filas, salida idéntica a la versión previa).
#45 no altera totales (`total` sigue sumando `amount`); los tests cubren el caso de mismo nombre con
`id` distinto.

**§3 Estado y Contexto Global — SIN CAMBIO:** los calculation services son puros y no mutan arreglos
de entrada (los mapas/filtros crean nuevas estructuras).

**§4 Estilos y UI — SIN CAMBIO:** el diff no toca JSX ni CSS.

**§5 Convenciones Estrictas y Logs — CUMPLIDO (verificación mecánica):** sin emojis; sin `console.log`
nuevos; `console.error` conservado en los `catch` de los services; comillas dobles y EOF newline.

**§6 Documentación — CUMPLIDO:** `KNOWN_ISSUES.md` #21/#22/#25/#45 con estado y resolución,
`BACKLOG.md` actualizado y este informe.

**§7 Calidad/testing — CUMPLIDO:** `npm test` 377/377 (34 archivos; +18 sobre los 359 previos),
`npm run build:frontend` OK, ESLint y Prettier incrementales sobre el diff contra `origin/main` con
`EXIT=0`. Nuevos tests: `inventoryReportCalculationService.test.js`, `asyncUtils.test.js` y
`profitabilityReportService.test.js` (concurrencia: 5 lotes / máximo 4 en vuelo para 450 ventas).

### Notas y límites conscientes
- **#21 sin aplicar:** la migración `20260917210000_cash_report_session_payments_pushdown.sql` está
  creada y validada, pero no aplicada al remoto; requiere `supabase db push` (se solicita
  confirmación al usuario). El `CTE` nuevo ya está en el archivo de migración.
- **Prettier sobre archivos legacy:** 6 archivos tocados ya incumplían el formato en `main`; se
  formatearon completos porque el CI incremental verifica el archivo íntegro (churn de formato
  acotado a esos archivos).

---

## Informe de Auditoría — RAMA `refactor/reward-modal` (17 de septiembre de 2026)

**Alcance:** descomposición del god component
`src/components/CustomersComponents/Modals/RewardModal/RewardModal.jsx` (#3). Alcance estricto: no se
tocan `ProductsModify.jsx` ni `ProductsPromotions.jsx`. Paso previo: aplicación al remoto de la
migración pendiente de Fase 2 (`supabase db push` de `20260917210000`).

### Veredicto por sección
**§1 Funcionalidad y Arquitectura — CUMPLIDO (playbook `ticketBuilder`):**
- `rewardModalCalculationService.js` (puro): constantes, normalización de campos, validación,
  construcción de formulario/payload, diff de productos y helpers de UI (estado de campo, filtro).
- `rewardModalService.js` (DIP): catálogo de productos, productos vinculados, búsqueda de duplicados,
  persistencia de `rewards` y sincronización de `reward_products`.
- `useRewardModal.js`: estado, efectos de inicialización, derivados y handlers.
- Vistas presentacionales `RewardDiscountFields.jsx` y `RewardProductSelector.jsx`.
- `RewardModal.jsx`: orquestador de **280 líneas** (< 350); ya no importa `supabase`.

**§2 Corrección de Datos y Lógica de Negocio — CUMPLIDO:** se portó la lógica sin cambios
(validaciones, mensajes de error, defaults, orden de operaciones y textos de los avisos). La suite
caracterizó y detectó un bug latente (ver Hallazgos).

**§3 Estado y Contexto Global — SIN CAMBIO:** el modal no muta contextos compartidos; expone los
mismos props (`isOpen`, `onClose`, `onSaved`, `rewardToEdit`) a `RewardsSettings.jsx`.

**§4 Estilos y UI — SIN CAMBIO:** mismo módulo CSS, misma estructura de nodos y clases; no se agregan
`!important`.

**§5 Convenciones Estrictas y Logs — CUMPLIDO (verificación mecánica):** sin emojis; sin
`console.log`/`console.warn`; `console.error` conservado en los `catch`; comillas dobles y EOF newline.

**§6 Documentación — CUMPLIDO:** `KNOWN_ISSUES.md` #3 (tabla y bitácora), `BACKLOG.md` y este
informe.

**§7 Calidad/testing — CUMPLIDO:** `npm test` 430/430 (36 archivos; +53 sobre los 377 previos),
`npm run build:frontend` OK, ESLint y Prettier incrementales sobre el diff contra `origin/main` con
`EXIT=0` (solo warnings preexistentes de `no-unused-vars` por la config `jsx-runtime`).

### Hallazgos de la revisión
- **Bug latente corregido (validación de productos):** el `validateValues` original resolvía el
  argumento `selectedIds` por default a partir del estado `selectedProductIds`. Al extraerlo como
  función pura a `rewardModalCalculationService.js`, ese default se perdió; el test de caracterización
  de `handleSubmit` lo detectó (un `free_product` con producto seleccionado no se guardaba). Se
  corrigió pasando `selectedProductIds` explícito en `handleSubmit`, `currentErrors`, `handleChange`,
  `handleBlur` y `handleRewardTypeChange`, conservando el comportamiento original.

### Notas y límites conscientes
- **#21 aplicado durante el setup:** la migración de Fase 2 se aplicó al remoto con
  `supabase db push` (verificado: índice `idx_sale_payments_branch_created_at`, historial
  `20260917210000` y RPC con el filtro `filtered_sessions`).
- **Tests de UI:** el proyecto no testea JSX (ver `docs/TESTING.md`); la caracterización se centró en
  el servicio puro y el hook.

---


## Informe de Auditoría — RAMA `test/coverage-gaps` (17 de septiembre de 2026)

**Alcance:** Fase 4 — testing faltante (#9). Cobertura de los RPC de ventas, la lógica de impresión y
corte de caja y el proceso principal de Electron, siguiendo el checklist de este documento.
Restricción: sin cambios de lógica de producción salvo el desacople necesario para testear
`electron/main.js`; Vitest + jsdom.

### Veredicto por sección
**§1 Funcionalidad y Arquitectura — CUMPLIDO:**
- RPC de ventas: `salesTransactionService.test.js` (contrato mock de `create_sale_transaction`) y
  `supabase/migrations/transactionalRpcsContract.test.js` (firma, retorno y grants de
  `create_sale_transaction` y `create_transfer_order`, más cross-check cliente↔BD de nombres de
  parámetros). `create_transfer_order` no tiene caller JS (la vista de traspasos es el stub de #12),
  por lo que su contrato se ancla al SQL.
- Corte/impresión: `cashCutBuilder.test.js` y `ticketPrinter.test.js`.
- Electron: se extrajo `electron/mainProcess.js` (inyección de dependencias, sin `require('electron')`)
  y `main.js` quedó como wiring. `mainProcess.test.js` cubre los seis canales IPC, el zoom y el ciclo
  de vida.

**§2 Corrección de Datos y Lógica de Negocio — CUMPLIDO:** los tests fijan comportamiento observable
(no implementación). El contrato SQL verifica parámetros, retorno y `REVOKE` de `anon`/`public`. No
hay cambios en la lógica de producción; la extracción de `mainProcess.js` preserva el comportamiento
(ventana, hardening de navegación, zoom y eventos de app).

**§3 Estado y Contexto Global — SIN CAMBIO:** `main.js` mantiene el estado en un objeto
`windowState`, un `Map` y un `WeakSet` inyectados; no cambia el contrato con el renderer ni el
preload.

**§4 Estilos y UI — SIN CAMBIO:** no se tocó UI ni CSS.

**§5 Convenciones Estrictas y Logs — CUMPLIDO:** sin emojis; sin `console.log`/`console.warn` nuevos
(los tests espían `console` para silenciar o forzar fallos); `console.error` conservado; comillas
dobles y EOF newline; Prettier/ESLint sobre el diff con `EXIT=0`.

**§6 Documentación — CUMPLIDO:** `docs/TESTING.md` (tabla y huecos), `KNOWN_ISSUES.md` #9 y nuevo
#49, `BACKLOG.md` y este informe.

**§7 Calidad/testing — CUMPLIDO:** `npm test` **524/524** (41 archivos; +94 sobre los 430 previos) y
`npm run build:frontend` `EXIT=0`.

### Hallazgos de la revisión
- **[MEDIO][#49] `create_sale_transaction` sin `search_path` fijado:** sus tres sobrecargas son
  `SECURITY DEFINER` sin `SET search_path`, a diferencia de `create_transfer_order`,
  `receive_transfer_order`, `cancel_transfer_order` y `get_email_by_username`, que la migración de
  endurecimiento sí fija. Documentado como #49 y evidenciado por el test de contrato; requiere una
  migración correctiva (fuera del alcance de testing).
- **[BAJO] `create_transfer_order` sin caller:** el RPC existe en la migración pero la vista de
  traspasos es un stub (#12). El test fija su interfaz SQL; cuando exista el service JS conviene un
  test de contrato mock (como `create_sale_transaction`) con cross-check cliente↔BD.
- **[BAJO] `ticketPrinter.js` usa `console.log`:** la función "imprime" por consola (placeholder). No
  se modificó (fuera de alcance) y el test espía `console`; si se conecta a una impresora real, el
  contrato `{ success, message, error }` ya queda fijado.

### Notas y límites conscientes
- **Backend Express/SQLite fuera de alcance:** `electron/main.js` **no** inicializa Express ni SQLite
  (viven en `src/backend/server.js` y `bd.js`, que hacen `app.listen()`/abren SQLite al importar). Se
  documenta como el siguiente desacople en `docs/TESTING.md` y `BACKLOG.md`.
- **Cadena de `require` en Electron:** `vi.mock('electron')` no intercepta los `require` CJS; por eso
  se optó por la extracción con inyección de dependencias en lugar de mockear el módulo `electron`.
- **Contrato SQL por parsing de migración:** `transactionalRpcsContract.test.js` lee el archivo de
  migración con `fs`; fija la firma efectiva, pero no ejecuta la función en Postgres.
- **Prettier/ESLint incrementales:** se formatearon `electron/main.js` (reescrito) y los archivos
  nuevos; sin churn en el resto.

## Informe de Auditoría — RAMA `cleanup/ui-and-docs` (borrador, 18 sep 2026)

**Alcance:** cosmética y cierre: #48 (barrido de `!important` en módulos CSS, 128 ocurrencias en 30
archivos), #33 (panel del tope de apertura de caja + RPCs admin), #7 (README), #31/#34 (eliminación
completa del backend local SQLite) y #35 (opciones explícitas de persistencia de sesión en
`supabaseClient`). Implica 30 `*.module.css`, `primitives.jsx` (CashCut), `cashSettingsService.js` +
tests, `Settings.jsx`/`Settings.module.css`, la migración
`20260918120000_app_settings_cash_rpcs.sql`, `src/lib/supabaseClient.js`, `package.json`/
`package-lock.json` (sin Express/SQLite/Nodemon/bcryptjs/cors/node-fetch/electron-rebuild) y la
documentación (`KNOWN_ISSUES.md`, `BACKLOG.md`, `AGENTS.md`, `DEPLOYMENT.md`, `README.MD`). Estado:
**trabajo sin commitear aún**; este informe es borrador a revisar en la PR.

### Veredicto por sección
**§1 Funcionalidad y Arquitectura — CUMPLIDO:**
- #33 con SRP/DIP: `cashSettingsService.js` aísla las RPCs (`getCashMaxOpeningAmount` /
  `updateCashMaxOpeningAmount`) y `Settings.jsx` no importa `supabase`; el panel se gatea con
  `checkUserIsAdmin(user.id)` solo como UX porque la RPC revalida `is_admin()` en el servidor.
- #48: el refactor de `IconImg` (CashCut) a variables CSS (`--icon-size`, `--icon-filter`) elimina
  overrides inline de iconos dentro del propio componente (DIP visual).
- #31/#34: sin backend local, `electron/main.js` y `preload.js` no requieren cambios (los handlers IPC
  legacy ya no existían); el diff no toca runtime de Electron/Vite.

**§2 Corrección de Datos y Lógica de Negocio — CUMPLIDO:**
- #33 se sigue el patrón de `open_cash_register`: `SECURITY DEFINER` con `set search_path = public`,
  guard `is_admin()`, validación de monto no negativo (`raise exception` msj consistente) y
  `to_jsonb(v_amount::text)` replicando el formato de seed de `app_settings`. Prueba del contrato:
  `cashSettingsService.test.js` (7 casos) verifica lectura, escritura y propagación de error/mensaje.
- #48/#7/#31/#34/#35: sin cambio de datos; #35 solo fija opciones de auth explícitas en
  `createClient` (ver §3).

**§3 Estado y Contexto Global — CON EFECTO CONTROLADO:** `#35` cambia `storageKey` de
`'sb-<ref>-auth-token'` (default) a `'sb-crokets-pos-auth-token'`; las sesiones existentes en
`localStorage` dejan de ser válidas → **un re-login esperado tras el deploy**. `detectSessionInUrl:
false` y `flowType: 'pkce'` son inocuos con `signInWithPassword` (único flujo usado). No se mutan otros
contextos compartidos.

**§4 Estilos y UI — CUMPLIDO (con nota Prettier):**
- Especificidad sin `!important`: selectores anclados por prefijo de tabla/estado
  (`.tableRow.selectedRow`, `.itemsTable td.textCenter`, `.infoCard .statusConnected`,
  `.field .fieldError`, `table tbody tr.outOfStockRow:hover > td`) o doble clase solo cuando compite
  un hover del padre portaleado (`td.detailCell.detailCell`, `.datePickerPopper.datePickerPopper`).
- `rg "!important" --glob "*.module.css" src` → **0** resultados (0 archivos).
- El `.recoveredDraftDiscard` de Sales se eliminó (selector muerto) y el hover de fila reescribe
  colores por pares clase-componente en lugar de `transition` forzado.
- **Nota:** Prettier reformateó hunks ajenos en 6 CSS/JSX que ya incumplían el formato en `main`
  (p. ej. `transition:` multilínea en Sales.module.css, `EmptyState` en primitives.jsx); se aceptó
  como higiene acotada a archivos ya tocados.

**§5 Convenciones Estrictas y Logs — CUMPLIDO (verificación mecánica):** sin emojis en líneas
agregadas; sin `console.log`/`console.warn` nuevos (`cashSettingsService.js` usa `console.error` solo
en `catch`); comillas dobles y EOF newline en archivos JS/CSS tocados.

**§6 Documentación — CUMPLIDO:** `KNOWN_ISSUES.md` #7/#31/#33/#34/#35/#48 con estado **Resuelto** y
fecha; `BACKLOG.md` con checkboxes actualizados (+ítem de endurecimiento #35 abierto);
`AGENTS.md`/`DEPLOYMENT.md`/`README.MD` sin referencias a Express/SQLite/Nodemon/`npm run rebuild`
(línea "sin linter" de AGENTS.md queda como inexactitud preexistente de #8 en esta rama). Pendiente
operativo: aplicar la migración `20260918120000` al remoto con `supabase db push`.

**§7 Calidad/testing — CUMPLIDO:** `npm test` 430/430 (36 archivos; +7 de `cashSettingsService.test.js`
sobre los 430 del paso previo); `npm run build:frontend` OK; ESLint incremental sobre el diff sin
errores nuevos (solo warnings preexistentes de `no-unused-vars`). Nota de conteo: la proyección
anterior de "35 archivos tras borrar `password.test.js`" era incorrecta — `password.test.js` nunca lo
recogía Vitest, y el conteo subió de 35 a 36 archivos solo por la suite nueva de #33.

### Hallazgos y límites conscientes
- **Migración remota pendiente:** las RPCs #33 se validan contra el archivo de migración, pero aún no
  se aplicaron (`supabase db push`) — el panel mostrará error hasta aplicarlas.
- **Re-login de sesiones existentes por `storageKey` (#35)** — efecto controlado, documentado en
  `KNOWN_ISSUES.md` #35; el token sigue en `localStorage` (riesgo residual aceptado).
- **`AGENTS.md` línea de linter** queda obsoleta respecto a #8 en main; se deja fuera de alcance de
  este borrador (ver `KNOWN_ISSUES.md` #8).
- **QA visual pendiente:** tamaños de icono de CashCut con las nuevas variables `--icon-size` y los
  estados de fila reescritos (reporte de inventario) deben verificarse en la UI con `npm run dev`.

## Informe de Auditoría — RAMA `refactor/products-modify` (borrador, 21 sep 2026)

**Alcance:** descomposición del god component
`src/components/ProductsComponents/PageProducts/ProductsModify/ProductsModify.jsx` (#3), última fila
declarada como refactor posterior. Alcance estricto: solo el formulario Modificar producto; no se tocan
`ProductsSearchModal`, `AppModal`, `useProductModifyDOM.js` ni `ProductsModify.module.css`. Estado:
**trabajo sin commitear aún**; este informe es borrador a revisar en la PR.

### Veredicto por sección
**§1 Funcionalidad y Arquitectura — CUMPLIDO (playbook `RewardModal`):**
- `services/productModifyCalculationService.js` (puro, sin I/O): `calculateGanancia`, `roundMoney`/
  `roundPercent`, `getDiscountPriceFromPercent`/`getDiscountPercentFromPrice`, `validateProductModifyForm`
  y los payloads `buildProductPayload`/`buildDiscountPayload`.
- `services/productModifyDataService.js` (DIP): `loadProductDiscountData` (normaliza `{ success,
  discount, error }` y aísla el flujo `getProductDiscountByProductId`) y `saveProductModifications`
  (orquesta producto → descuento con resultado `{ success, error, partial }`); recibe los callbacks del
  contexto, no importa `supabase`.
- Seis vistas presentacionales en `components/`: `ProductModifyLookup`, `ProductModifyGeneralSection`,
  `ProductModifyPricingSection`, `ProductModifyInventorySection`, `ProductModifyDiscountSection` y
  `ProductModifyFooter`; comparten el CSS module del módulo y reciben `getFieldClassName`/`renderError`
  como props (patrón `RewardDiscountFields`).
- `ProductsModify.jsx` bajó de **640 a 177 líneas** y quedó como orquestador (header + lookup + grid de
  columnas + modales). Los hooks delegan: `useProductModifyForm` → validación/cálculos/payloads del
  servicio puro; `useProductsModify` → persistencia y mensajes del data service.

**§2 Corrección de Datos y Lógica de Negocio — CUMPLIDO (48 tests de caracterización):**
- `productModifyCalculationService.test.js` (39 casos): ganancia (incl. costo 0, negativos y no
  numéricos), redondeos, descuento ida/vuelta, validación campo a campo (obligatorios, rangos, dup codigo
  con `selectedProduct.id`, comisión y descuento condicionales) y payloads (coerciones, defaults,
  descuento deshabilitado que conserva el porcentaje configurado).
- `productModifyDataService.test.js` (9 casos): normalización de descuento (habilitado/deshabilitado),
  propagación de error del callback, guard de `productId` y captura de excepciones en ambos servicios
  (`console.error` espiado).
- Detalle: el formulario original sobrescribía "precio venta debe ser mayor a 0" con "no puede ser menor
  al costo" cuando `precio = 0` (orden de checks). El refactor fija la precedencia de `precio <= 0`; el
  resto de mensajes/contratos se conservan idénticos (verificado por tests).

**§3 Estado y Contexto Global — SIN CAMBIO:** el contrato expuesto por `useProductsModify` es el mismo
(los componentes consumen las mismas props); no se muta contexto global ni se agrega estado nuevo fuera
del módulo.

**§4 Estilos y UI — SIN CAMBIO:** no se agregó CSS; las seis vistas reutilizan clases existentes de
`ProductsModify.module.css` (`.formRow`, `.input`, `.inputError`, `.sectionCard`, `.helperBox`,
`.infoBox`, `.bodyFooter`, etc.).

**§5 Convenciones Estrictas y Logs — CUMPLIDO:** sin emojis; sin `console.log`/`console.warn` nuevos;
`console.error` conservado en los `catch` de ambos services; comillas dobles y EOF newline.

**§6 Documentación — CUMPLIDO:** `KNOWN_ISSUES.md` #3 (tabla + estado + bitácora), `BACKLOG.md`
(checkbox) y este informe.

**§7 Calidad/testing — CUMPLIDO:** `npm test` **573/573** (43 archivos) con los 48 casos nuevos;
`npm run build:frontend` OK; ESLint incremental sin errores nuevos (persisten los warnings
preexistentes de `no-unused-vars` por JSX que ya emitía el archivo original en `main`).

### Notas y límites conscientes
- **Prettier sobre el módulo:** los 10 archivos tocados ya incumplían `prettier --check` en `main`
  (todo el módulo `ProductsModify`); se formatearon íntegros porque el CI incremental verifica el archivo
  completo (churn acotado a los archivos del refactor; `useProductModifyDOM.js` y el CSS module quedan
  fuera del diff).
- **Fix de precedencia §2:** pequeño cambio de mensaje observable solo cuando `precio = 0`; se documenta
  aquí para decisión del revisor (alternativa: preservar el mensaje original "menor al costo").
- **QA visual pendiente:** el grid de dos columnas, el estado `readOnly` de ganancia y los toggles de
  comisión/descuento deben verificarse en la UI con `npm run dev` antes de cerrar la PR.

## Informe de Auditoría final — 21 sep 2026 (revisión externa)

**Metodología:** `code-review-quality` + `react-vite-best-practices` (la skill `modern-web-guidance`
solicitada no existe en el inventario; se usó la más cercana para la semántica de inputs/formularios).
Verificación mecánica previa a la interpretación; evidencia textual por ítem.

### Estado de refs (hallazgo estructural)
`main` y `HEAD` apuntan al mismo commit `d645701`; `git diff main...HEAD` vacío y
`git merge-base main HEAD` = `HEAD`. Todo el refactor vivía sin commitear en el working tree
(6 modificados + 10 nuevos). **Resuelto en esta sesión:** commits creados en la rama y push.

### §1 Funcionalidad y Arquitectura — CUMPLIDO
- SRP: `services/productModifyCalculationService.js` puro (sin I/O); `services/productModifyDataService.js`
  DIP (recibe callbacks del contexto; único match de "supabase" es un JSDoc en `productModifyDataService.js:4`);
  6 vistas presentacionales ≤ 180 líneas; `ProductsModify.jsx` orquestador = **177 líneas** vs 640 en `main`.
- Extracción JSX token-idéntica (mismos `name`, clases, `type`, `step`, handlers y orden de focos).
- Foco por teclado conservado: `useProductModifyDOM.js` (fuera del diff) controla `getFocusableBodyElements`
  excluyendo `tabIndex -1`/`readOnly`/`disabled`; Ganancia conserva `tabIndex={-1}` en `ProductModifyPricingSection.jsx:69`.
- ISP/OCP/KISS validados; límite de líneas OK (todos ≤ 271).
- **Pendiente:** QA visual `npm run dev` (a cargo del autor).

### §2 Corrección de Datos y Lógica de Negocio — CUMPLIDO (1 cambio documentado y aprobado)
- Traza del caso límite `costo=50, precio=0`: en `main` el `if` de `precio <= 0` era sobrescrito por el
  bloque `precio < costo` (mensaje final "no puede ser menor al costo"); el refactor lo fija con cadena
  `else if` en `productModifyCalculationService.js:105-112` → mensaje "El precio venta global debe ser mayor a 0."
- Misma validez (form inválido en ambos casos), cambia solo el texto. Test `productModifyCalculationService.test.js:228-236`
  fija el nuevo mensaje. **Decisión del revisor (21 sep 2026): MANTENER** el nuevo mensaje.
- Preservación verificada: `calculateGanancia`, payloads y normalización de descuento idénticos;
  `saveProductModifications` con mismos tipos de alerta; `loadProductDiscountData` más defensivo
  (elimina posible unhandled rejection que `main` podía propagar desde `onSelect` → `loadProduct`).
- Caso que rompe la regla ejecutado: `costo=0/precio=0` → 0; `costo=0/precio=100` → 100; negativos → 0 (idénticos).

### §3 Estado y Contexto Global — SIN CAMBIO
Sin estados globales nuevos; el contrato de `useProductsModify` (props) es el mismo; `useProductModifyDOM.js`
intacto; persistencia vía callbacks preexistentes de `useProducts`.

### §4 Estilos y UI — SIN CAMBIO (verificación mecánica)
`rg "!important"` = 0; `rg "style=\{\{"` = 0; sin CSS nuevo (reuso de `ProductsModify.module.css`); el
CSS module no está en el diff; `getFieldClassName` idéntico al anterior `inputClassName` (sin espacios colgantes).

### §5 Convenciones Estrictas y Logs — CUMPLIDO (verificación mecánica)
- Cero emojis (barrido Unicode de los 15 archivos del módulo; `→` en `KNOWN_ISSUES.md`/`PR_REVIEW.md` es
  separador tipográfico preexistente, no emoji).
- Cero `console.log/warn/debug/info`; `console.error` conservados en `useProductsModify.js:44,90` y
  `productModifyDataService.js:54,106` (catch/fallo).
- EOF newline verificada (`od`) en los 16 archivos; comillas dobles.
- Prettier: los 3 originales fallaban `--check` en `main` (verificado) → churn de formato justificado.

### §6 Documentación — CUMPLIDO (impresión corregida en esta sesión)
- `KNOWN_ISSUES.md` #3, `BACKLOG.md` checkbox y borrador de auditoría presentes.
- Impresión "173 líneas" corregida a **177** (`KNOWN_ISSUES.md:95,194` y `PR_REVIEW.md:577`), acorde a `wc -l`.

### §7 Calidad/testing — CUMPLIDO
- `npm test` **573/573** (43 archivos) con los 48 casos nuevos (39+9); `npm run build:frontend` EXIT 0.
- ESLint módulo: **0 errores**; 9 warnings `no-unused-vars` por JSX **preexistentes** (config sin
  `react/jsx-uses-vars`; la versión de `main` emite la misma categoría — verificado linteando el original).
- Cobertura: validación campo a campo, ganancia (costo 0/negativo/no-numérico), descuento ida/vuelta,
  guard de `productId`, excepciones con `console.error` espiado.
- Descripción de test engañosa corregida en esta sesión: "devuelve 0 con costo cero y precio positivo"
  → "devuelve 100 (margen completo) con costo cero y precio positivo" (`productModifyCalculationService.test.js:46`).

### Hallazgos y estado
| # | Nivel | Hallazgo | Estado |
|---|---|---|---|
| F1 | Proceso | Rama sin commits (`main` = `HEAD` = d645701); CI no podía correr sobre el diff. | RESUELTO — commits y push en esta sesión |
| F2 | Minor | Conteo documentado 173 ≠ 177 reales. | RESUELTO — corregido |
| F3 | Minor | Descripción de test contradecía la aserción. | RESUELTO — corregido |
| F4 | Sugerencia | Cambio de mensaje de precedencia `precio=0`. | APROBADO — se mantiene el nuevo mensaje |
| F5 | Manual | QA visual `npm run dev` (grid, `readOnly` ganancia, toggles, F10/Enter). | PENDIENTE — a cargo del autor |
| F6 | Observación | Labels sin `htmlFor`/`id` (patrón a11y preexistente en todo el módulo, no introducido por el diff). | Backlog futuro, no bloqueante |

### Veredicto
El código del refactor es aprobable: servicios puros/DIP correctos, extracción fiel, DIP/ISP/SRP
verificados, tests (573/573) y build OK, sin emojis/logs depurados/`!important`. Único pendiente antes de
cerrar la PR: **QA visual manual (F5)**. Con el resultado de ese QA sin hallazgos, la rama queda
aprobada conforme a los estándares de `PR_REVIEW.md`.

## Informe de Auditoría — RAMA `fix/commissions-product-override` (borrador, 21 sep 2026)

**Alcance:** corrección de la precedencia de comisión de producto sobre departamento en la RPC
`get_commissions_report_data` (migración `20260921140000`) y su paridad en el servicio de cálculo
cliente (`commissionsCalculationService.js`). La regla de negocio objetivo: la decisión individual del
producto (exento con `commission_enabled = false`, o comisión propia con `= true`) **siempre** gana
sobre la comisión general del departamento; el departamento solo se hereda para productos sin
configuración explícita (`commission_enabled IS NULL`). Estado: **trabajo sin commitear aún**; este
informe es borrador a revisar en la PR.

### Veredicto por sección

**§2 Corrección de Datos y Lógica de Negocio — CUMPLIDO:**
- RPC (`computed` CTE): el `CASE` de `commission_amount` pasa a
  `WHEN dr.commission_enabled` → comisión de producto; `WHEN dr.commission_enabled IS NULL AND
  COALESCE(dr.dept_commission_enabled, false)` → herencia de departamento; `ELSE 0`. Un producto con
  `commission_enabled = false` ya no cae en la rama del departamento.
- `has_commission` (`WHEN commission_enabled THEN true / WHEN IS NULL THEN COALESCE(dept,false) /
  ELSE false`) ya no es `commission_enabled OR dept_commission_enabled`, que devolvía `NULL` (no
  `false`) cuando el producto era `NULL` y el depto no comisionaba.
- Sincronización de salida: `eff_commission_type` / `eff_commission_value` calculados por origen
  efectivo (producto: usa `commission_percent` para `percent`, coherente con el monto; departamento:
  `dept_commission_type`/`dept_commission_value`), y `rule_label` formatea esos valores efectivos con
  'Sin comision' para exentos. El `RETURNS TABLE` y el orden de columnas se conservan.
- Cliente (`commissionsCalculationService.js`): early-return con exención si
  `product.commission_enabled === false`; comisión propia solo si `=== true`; herencia del
  departamento únicamente en el `else if (department.commission_enabled)` (caso `undefined`/`null`);
  caso restante dispara el guard `!isEnabled || commVal <= 0` → 'Sin comisión'.
- Caso que rompía la regla ejecutado: *Nupec Adulto 2kg* (`commission_enabled = false`) en depto
  *Nupec* (`commission_enabled = true`) → antes caía en la rama del depto; ahora `has_commission =
  false`, monto 0, `rule_label = 'Sin comision'`. Cubierto por test en
  `commissionsCalculationService.test.js` (exención con depto comisionando) y por el contrato de la
  RPC en `commissionsReportService.test.js` (fila exenta / fila heredada).

**§1 Funcionalidad y Arquitectura — CUMPLIDO:** el cálculo sigue siendo puro (sin I/O); la regla vive
en SQL y en el service de cálculo, no en la vista (SRP). Sin cambios de contrato del RPC hacia el
cliente (mismas columnas).

**§3 Estado y Contexto Global — SIN CAMBIO:** no se tocan contextos ni hooks.

**§4 Estilos y UI — SIN CAMBIO:** el diff no toca JSX ni CSS.

**§5 Convenciones Estrictas y Logs — CUMPLIDO (verificación mecánica):** sin emojis en líneas
agregadas; sin `console.log`/`console.warn` nuevos; `console.error` conservados en los `catch` de los
services (sin cambios); comillas dobles y EOF newline (verificado con `od`).

**§6 Documentación — CUMPLIDO:** `KNOWN_ISSUES.md` nuevo #50 (precedencia y exención de producto
sobre departamento) y este informe.

**§7 Calidad/testing — CUMPLIDO:** `npm test` pasa la suite completa (ver resultado en el paso de
verificación); `npm run build:frontend` OK. Suite nueva `commissionsCalculationService.test.js`:
exención sobre depto comisionando, comisión propia, herencia con `commission_enabled` null/ausente,
producto sin departamento, tipo `percentage`, flat por pieza, valor ≤ 0, agregaciones y KPIs
(montos solo de filas comisionables). Contrato RPC complementado en `commissionsReportService.test.js`
(fila exenta y fila heredada).

### Notas y límites conscientes
- **Esquema `products.commission_enabled` con `DEFAULT false`:** al existir el default, los productos
  nuevos quedan exentos por defecto (no heredan el depto) salvo configuración explícita; es la regla
  objetivo del PR, pero implica que en datos legacy los productos con `commission_enabled = false`
  dejarán de comisionar si su depto sí lo hacía — efecto esperado y central del cambio.
- **Migración remota pendiente:** `20260921140000` debe aplicarse con `supabase db push`; hasta
  entonces el remoto conserva la precedencia antigua.
- **QA manual:** verificar en Reportes > Comisiones que *Nupec Adulto 2kg* figure como "Sin comisión"
  y no sume incentivo, y que el resto de productos del depto *Nupec* siga comisionando.

## Informe de Auditoría final — RAMA `fix/commissions-product-override` (21 sep 2026, revisión externa)

**Metodología:** `code-review-quality` + `supabase-postgres-best-practices`. Verificación mecánica
previa a la interpretación (`git diff`, `npm test`, `npm run build:frontend`, barridos de texto y
comparación estructural de migraciones); evidencia textual por ítem.

### Estado de refs (hallazgo de proceso)
`main` = `HEAD` = `4164732`; `git diff main...HEAD` queda vacío y `git merge-base main HEAD` = `HEAD`.
**Todo el trabajo sigue sin commitear en el working tree** (5 modificados + 2 archivos nuevos:
`BACKLOG.md`, `KNOWN_ISSUES.md`, `PR_REVIEW.md`, `commissionsCalculationService.js`,
`commissionsReportService.test.js`, `commissionsCalculationService.test.js` y la migración
`20260921140000`). El CI incremental no podrá evaluar el diff hasta commitear y pushear.

### §0 Bloqueantes de revisión previa — N/A
La rama no responde a bloqueantes previos.

### §1 Funcionalidad y Arquitectura — CUMPLIDO
- SRP/DIP intactos: la regla de precedencia vive en la RPC y en el service de cálculo puro (sin I/O);
  la vista y los hooks no calculan comisión por ítem (`useCommissionsReport.js:14-17` solo importa los
  agregadores; ningún componente importa `supabase`).
- La comparación estructural (`diff` normalizado, base `20260910120500` vs `20260921140000`) demuestra
  cirugía acotada: la firma, `RETURNS TABLE` (columna a columna), `filtered_sales`, `detail_rows`,
  `has_discount`, `ticket_number`, `LIMIT/OFFSET` y el bloque de grants quedan idénticos; cambian solo
  el `CASE` de `commission_amount`, `has_commission`, las dos columnas efectivas nuevas
  (`eff_commission_type`/`eff_commission_value`), su proyección y `rule_label`.
- **Obs (no nuevo):** `calculateItemCommission` es código muerto — no tiene consumidor en `src/` ni en
  `main` (grep: solo definición y tests). El render path es 100% RPC → mapping (`commissionsReportService.js:87-113`)
  → agregaciones. El PR lo mantiene sincronizado con tests de caracterización (higiene válida), pero
  no tiene efecto de runtime.

### §2 Corrección de Datos y Lógica de Negocio — CUMPLIDO (con cargas de evidencia)
Se ejecutaron los tres casos exigidos con números concretos (partida qty=2, unit_price=80, total_price=160,
depto *Nupec* value=5 percent, producto *Nupec Adulto 2kg*):

1. `p.commission_enabled = true` → usa el producto. SQL: primer `WHEN dr.commission_enabled`
   (`20260921140000:92-96`); has_commission `true` (`:105`); eff_type `COALESCE(commission_type,'percent')`
   (`:110`); eff_value coherente con el monto (`:115-119`). Cliente: `product.commission_enabled === true`
   (`commissionsCalculationService.js:32-37`).
2. `p.commission_enabled = false` → exención total. SQL: cae al `ELSE 0` (`:102`), has_commission `false`
   (`:108`), eff_type/value `NULL` (`:112,123`), rule_label `'Sin comision'` (`:143`). Cliente: early-return
   (`:18-26`). Antes caía en `WHEN dr.dept_commission_enabled` (base `:89`) y pagaba depto — bug #50.
3. `p.commission_enabled IS NULL` → solo entonces hereda el depto si `d.commission_enabled = true`.
   SQL: segunda rama exige `IS NULL AND COALESCE(dept_commission_enabled,false)` (`:97,111,120`); monto 8
   (160*0.05). Cliente: `else if (department.commission_enabled)` (`:38-43`).
- `has_commission` ya nunca devuelve `NULL` (antes `commission_enabled OR dept_commission_enabled` con
  producto NULL producía `NULL`); el CASE explícito (`:104-108`) resuelve el tercer estado.
- Cuba adicional ejecutada (caso que rompe la regla): producto exento + depto *Nupec* comisionando
  → 0 en monto y 0 en agregaciones (los agregadores y KPIs filtran `hasCommission`); producto sin
  departamento y sin comisión → correctamente no comisionable (`commissionsCalculationService.test.js:131-143`).
- **Paridad "exacta" del cliente acotada a la precedencia semántica:** en los bordes numéricos
  documentados la RPC y el legacy no son idénticos — base `unit_price*qty` vs `total_price` (#19),
  precedencia `commission_percent` vs `commission_value` y `has_commission` con valor 0 y tipo
  `'percentage'` (#20), formato de `rule_label` `percent: 10%` vs `10.00%` (#24). Ninguno es introducido
  por este PR (verificado: las sentencias relevantes y el default `commission_percent = commission_value`
  ya existían en `main`), y son irrelevantes en runtime por ser código muerto. La RPC es autoritativa.
- Grants: `REVOKE ALL FROM public` + `GRANT EXECUTE TO authenticated` (`20260921140000:152-153`); no se
  re-otorga `anon` → la ACL efectiva queda `authenticated`-only, consistente con `20260910120600` y con
  `docs/SUPABASE_MIGRATIONS.md` (RPC invoker, sin `SECURITY DEFINER`, RLS al llamador).

### §3 Estado y Contexto Global — SIN CAMBIO
No se tocan hooks de estado, contextos ni filtros (`useCommissionsReport.js` intacto).

### §4 Estilos y UI — SIN CAMBIO (verificación mecánica)
El diff no toca JSX ni CSS; barrido `!important` y `style={{` sin resultados en líneas agregadas.

### §5 Convenciones Estrictas y Logs — CUMPLIDO (verificación mecánica)
- Cero emojis en líneas agregadas (ripgrep de rangos Unicode sobre el diff consolidado): sin resultados.
- `console.log/warn/info/debug`: sin resultados (único match es prosa de este documento).
- `console.error` conservados en los `catch` de los services (sin cambios en el diff).
- EOF newline por byte (`tail -c 1`): `0a` en los 7 archivos tocados; comillas dobles.

### §6 Documentación — CUMPLIDO
`KNOWN_ISSUES.md` nuevo #50 completo (impacto, regla, verificación); `BACKLOG.md` con checkbox nuevo;
borrador de auditoría presente; este informe final.

### §7 Calidad/testing — CUMPLIDO con 1 pendiente de verificación
- `npm test`: **44 archivos / 588 tests** OK (573 previos + 13 de `commissionsCalculationService.test.js`
  + 2 de `commissionsReportService.test.js`).
- `npm run build:frontend`: EXIT 0, 7.71 s (warning de chunk > 500 kB preexistente).
- Cobertura unitaria del service: exención sobre depto comisionando, comisión propia, herencia
  null/ausente, producto sin depto, `'percentage'`, flat por pieza, valor ≤ 0, agregaciones y KPIs
  solo de filas comisionables. Contrato RPC: fila exenta y fila heredada en
  `commissionsReportService.test.js:189-251`.
- **Pendiente de verificar (mecánico, no diferible):** la migración `20260921140000` no tiene ninguna
  prueba ejecutada sobre su SQL. `commissionsReportService.test.js` mockea `supabase.rpc` (no lee el
  archivo de migración), y no se ejecutó la función contra Postgres (sin Docker local para
  `supabase start`; no tocar el remoto). El RPC debe validarse con `supabase db push` + consulta real
  (fila *Nupec Adulto 2kg* exenta monto 0; heredada del depto monto correcto) y verificación de la ACL
  (`\df+` / `information_schema`) tras el push — patrón usado con #18 al momento de aplicar migraciones.

### Hallazgos y estado
| # | Nivel | Hallazgo | Estado |
|---|---|---|---|
| F1 | Proceso | Rama sin commits sobre `main` (`main` = `HEAD`); CI no puede evaluar el diff. | PENDIENTE — commit + push antes de abrir la PR |
| F2 | Major | La migración (corazón del fix) no tiene cobertura ejecutada; validada solo textualmente. | PENDIENTE — `supabase db push` + verificación runtime + ACL |
| F3 | Minor | "Paridad exacta" del cliente aplica a precedencia; bordes #19/#20/#24 difieren (preexistentes) y `calculateItemCommission` es código muerto. | Aceptado, documentado |
| F4 | Minor | QA del borrador impreciso: `CommissionsAuditTable.jsx:14-16` y `useCashierCommissionDetail.js:23` filtran `hasCommission`, por lo que *Nupec Adulto 2kg* NO figurará en tablas; la exención solo se verá en el export Excel (detailedRows completos). | Ajustar la verificación de QA |
| F5 | Manual | QA visual `npm run dev` (formato `ruleLabel` #24, exención visible en detalle/export). | PENDIENTE — a cargo del autor |

### Veredicto
La **lógica del cambio es correcta y verificable mecánicamente**: los tres casos exigidos se trazan con
evidencia en SQL y cliente, el cambio es quirúrgico, grants seguros, `npm test` 588/588, build OK y
convenciones cumplidas. La rama **no está lista para push/PR todavía**: falta (F1) commitear el trabajo
(5 modificados + 2 nuevos) y (F2) aplicar y validar la migración contra el remoto. Con F1 y F2
resueltos y F4/F5 ajustados, la rama queda aprobada conforme a `PR_REVIEW.md`.

## Informe de Auditoría — RAMA `fix/department-commission-full-propagation` (borrador, 21 sep 2026)

**Alcance:** corrección de la propagación masiva de comisión de departamento en `departmentService.js`
(#51). La regla de negocio objetivo: al actualizar un departamento y confirmar la propagación, **todos**
los productos con `department_id = id` adoptan los nuevos valores de comisión
(`commission_enabled`, `commission_type`, `commission_value`, `commission_percent`); las decisiones
individuales de producto mandan solo hasta la siguiente propagación del departamento. Estado: **trabajo
sin commitear aún**; este informe es borrador a revisar en la PR.

### Veredicto por sección

**§1 Funcionalidad y Arquitectura — CUMPLIDO (cambio quirúrgico):**
- Se eliminó el `select` previo del departamento (`oldDept`) que quedaba como dead code y el bloque
  `if (oldDept)` que añadía tres `.eq` de comisión a la query de `products`. La actualización masiva
  quedó como una sola cadena limpia (`departmentService.js:97-106`):
  `supabase.from("products").update({...}).eq("department_id", id)` — un único `.eq`, sin filtros por
  valores anteriores.
- Sin cambios de contrato: `updateDepartment` sigue devolviendo `{ success, data, error, partial }` y
  `console.error` del `catch` se conserva (`:118`).

**§2 Corrección de Datos y Lógica de Negocio — CUMPLIDO (caso que rompía la regla ejecutado):**
- Antes: producto con comisión individual distinta a la previa del departamento (ej. exento con
  `commission_enabled=false`, o con `commission_value` propio) no matcheaba los tres `.eq` del filtro
  y **no** se actualizaba en la propagación — quedaba con valores obsoletos. Después: la propagación
  toca todos los productos del departamento; la decisión individual sigue mandando hasta la próxima
  propagación (que la re-impone), tal y como exige la regla.
- Evidencia de no-regresión en el payload: `commission_percent` se mantiene derivado
  (`comType === "percent" && comEnabled ? comVal : 0.0`, `:103-104`) con los mismos defaults de antes
  (`comEnabled=false`, `comType="percent"`, `comVal=0`), por lo que el comportamiento para el caso
  general de propagación es idéntico al previo cuando no existían overrides.
- `propagateToProducts=false` no toca la tabla `products` (el bloque vive dentro de la condición).

**§3 Estado y Contexto Global — SIN CAMBIO:** el service no muta contextos; no se tocan hooks ni
componentes.

**§4 Estilos y UI — SIN CAMBIO:** el diff no toca JSX ni CSS.

**§5 Convenciones Estrictas y Logs — CUMPLIDO (verificación mecánica):** sin emojis (barrido de rangos
Unicode sobre los dos archivos: sin resultados; las únicas coincidencias no-ASCII son acentos
españoles); sin `console.log`/`console.warn` nuevos; `console.error` del `catch` conservado; comillas
dobles; EOF newline verificada por byte (`0a` en ambos archivos); ESLint y Prettier `EXIT=0` sobre los
archivos tocados.

**§6 Documentación — CUMPLIDO:** `KNOWN_ISSUES.md` nuevo #51 regla + resolución + cobertura,
`BACKLOG.md` con checkbox nuevo y este informe.

**§7 Calidad/testing — CUMPLIDO:** `npm test` **45 archivos / 599 cases** OK (588 previos + 11 de
`departmentService.test.js`); `npm run build:frontend` OK (warning de chunk > 500 kB preexistente).
Suite nueva: propagación a todos los productos (verifica que el único `.eq` sobre `products` es
`["department_id","d1"]` y que no se llama `select`/`maybeSingle` en `departments`), `propagate=false`
sin tocar `products`, defaults con campos ausentes, `commission_percent` en 0 para `amount`, error de
departamento sin tocar productos, error de actualización masiva y excepción inesperada (`console.error`
espiado).

### Notas y límites conscientes
- **Filtro `oldDept` eliminado por completo:** al quitar la condición, el `select` previo quedaba dead
  code; se retiró también (un `select` menos por operación).
- **QA manual pendiente:** verificar en la UI (Productos > Departamentos) que al modificar la comisión
  de un departamento y confirmar la propagación se actualicen productos con comisión propia/exenta y
  que el reporte de comisiones refleje los nuevos valores con `npm run dev`.
- **Pendiente de proceso:** commit + push de la rama para que el CI incremental pueda evaluar el diff
  (mismo hallazgo F1 de ramas previas).

## Informe de Auditoría final — RAMA `fix/department-commission-full-propagation` (21 sep 2026, revisión externa)

**Metodología:** `code-review-quality` + `react-vite-best-practices`. Verificación mecánica previa a la
interpretación (`git diff`, `npm test`, `npm run build:frontend`, barridos de texto y bytes); evidencia
textual por ítem.

### Estado de refs (hallazgo de proceso)
`main` = `HEAD` = `487bb18`; `git diff main...HEAD` queda vacío y `git merge-base main HEAD` = `HEAD`.
**Todo el trabajo vivía sin commitear** en el working tree (4 modificados + 1 archivo nuevo: `BACKLOG.md`,
`KNOWN_ISSUES.md`, `PR_REVIEW.md`, `src/services/products/departmentService.js` y
`src/services/products/departmentService.test.js`). Resuelto en esta sesión: commit + push.

### §0 Bloqueantes de revisión previa — N/A
La rama no responde a bloqueantes previos.

### §1 Funcionalidad y Arquitectura — CUMPLIDO (cambio quirúrgico)
- El diff elimina el `select` previo del depto (`oldDept`) y todo el bloque `if (oldDept)` con los tres
  `.eq` de comisión. La propagación quedó como una sola cadena con un único `.eq`:
  `departmentService.js:97-106` → `supabase.from("products").update({...}).eq("department_id", id)`.
  Verificado mecánicamente: `rg` muestra solo `.eq("id", id)` (dept) y `.eq("department_id", id)`
  (products); sin `select` ni `maybeSingle` sobre `departments`.
- Contrato intacto: `{ success, data, error, partial }`; consumidores (`ProductsContext.jsx:142-144`,
  `useDepartments.js:155,222`) solo leen `result.success`/`result.error`. Un `select` de `departments`
  menos por operación.

### §2 Corrección de Datos y Lógica de Negocio — CUMPLIDO (caso que rompía la regla ejecutado)
- Antes: producto con comisión individual ≠ comisión previa del depto (exenta `commission_enabled=false`,
  otro tipo/valor) no matcheaba los tres `.eq` y quedaba con valores obsoletos. Después: la propagación
  toca **todos** los productos de `department_id = id`; la decisión individual manda hasta la próxima
  propagación (regla #51).
- No-regresión en payload: `commission_percent` (`comType === "percent" && comEnabled ? comVal : 0.0`,
  `:103-104`) y los defaults están en contexto del diff (idénticos a `HEAD`).
- `propagateToProducts=false` no toca `products` (bloque dentro de la condición, `:89-109`); la UI
  (`useDepartments.js:199-210`) solo ofrece el diálogo de sobrescritura si cambió la comisión.

### §3 Estado y Contexto Global — SIN CAMBIO
No se mutan contextos ni hooks.

### §4 Estilos y UI — SIN CAMBIO
El diff no toca JSX ni CSS.

### §5 Convenciones Estrictas y Logs — CUMPLIDO (verificación mecánica)
- Emojis: `rg` de rangos Unicode sobre líneas agregadas → sin resultados (EXIT 1); los únicos no-ASCII
  son acentos españoles.
- `console.log`/`console.warn`: ninguno. `console.error` conservados en los `catch`
  (`departmentService.js:33,118`).
- EOF newline por byte (`od`): `0a` en ambos archivos y en los 3 docs.
- Comillas dobles; ESLint EXIT 0 y Prettier --check EXIT 0 en los dos archivos tocados.

### §6 Documentación — CUMPLIDO
`KNOWN_ISSUES.md` #51 (regla + resolución + cobertura), `BACKLOG.md` checkbox (`:26`), borrador y este
informe final en `PR_REVIEW.md`.

### §7 Calidad/testing — CUMPLIDO
- `npm test`: **45 archivos / 599 tests passed**. Suite nueva `departmentService.test.js` con 11 casos,
  incluida la aserción central `expect(productsQ.eq.mock.calls).toEqual([["department_id","d1"]])`
  (único `.eq` sobre `products`) y `select`/`maybeSingle` de `departments` no llamados.
- `npm run build:frontend`: EXIT 0 (warning de chunk > 500 kB preexistente).

### Hallazgos y estado
| # | Nivel | Hallazgo | Estado |
|---|---|---|---|
| F1 | Alto (proceso) | Rama sin commits sobre `main`; CI incremental no evalúa el diff. | RESUELTO — commit + push en esta sesión |
| F2 | Manual | QA visual `npm run dev` (propagación con productos de comisión individual/exenta + reporte de comisiones). | PENDIENTE — a cargo del autor |
| O1 | Bajo | Interacción #50/#51: la propagación re-impone los valores del depto sobre exenciones individuales. | **APROBADO — es la regla de negocio objetivo**: la decisión individual manda solo hasta la próxima propagación (decisión 21 sep 2026) |
| O2 | Bajo | `partial` nunca se setea `true` en `updateDepartment` (depto actualizado + falla masiva → `success:false`). | Documentado como deuda preexistente, fuera del alcance |

### Veredicto
La **lógica del cambio es correcta y verificable mecánicamente**: propagación total con un único
`.eq("department_id", id)`, sin queries redundantes a `departments`, contrato intacto, `npm test` 599/599,
build OK, sin emojis/logs de depuración/`!important`, EOF newline y lint/format limpios. Con F1 resuelto
(commit + push) y F2 (QA visual) sin hallazgos, la rama queda **aprobada** conforme a `PR_REVIEW.md`.

## Informe de Auditoría — RAMA `fix/harden-create-sale-transaction-search-path` (23 sep 2026, revisión externa)

**Alcance:** cierre de `KNOWN_ISSUES.md` #49 (SEC-5): las tres sobrecargas de `create_sale_transaction`
(`SECURITY DEFINER`) carecían de `search_path` fijado, dejando un vector de escalada de privilegios
por sombreado de objetos en esquemas del path.

**Metodología:** generación mecanicista de la migración (extracción de los cuerpos desde las fuentes,
sin transcripción manual) + verificación autónoma con diff normalizado de los cuerpos resultantes;
`supabase-postgres-best-practices`; verificación mecánica previa a la interpretación (`npm test`,
`npm run build:frontend`, ESLint, Prettier, barridos de bytes y emojis).

### Estado de refs
`main` = `HEAD` = `feef116`. Trabajo **sin commitear** en el working tree (3 modificados + 1 archivo
nuevo): `KNOWN_ISSUES.md`, `BACKLOG.md`, `supabase/migrations/transactionalRpcsContract.test.js` y la
migración `supabase/migrations/20260923130000_fix_create_sale_transaction_search_path.sql`.

### §1 Funcionalidad y Arquitectura — CUMPLIDO
- Migración nueva `20260923130000_fix_create_sale_transaction_search_path.sql`: `CREATE OR REPLACE` de
  las tres sobrecargas con `SET search_path TO 'public'` a nivel de función (9 y 10 parámetros tomados
  de `20260917200000`; 11 parámetros tomados de `20260921170000`, la variante vigente con
  congelamiento de snapshot de comisión en `sale_details`).
- **Preservación exacta de cuerpos (evidencia durativa):** se escribió un script de extracción basado
  en las firmas y se verificó con un diff normalizado que, al retirar la cláusula `SET` insertada, cada
  cuerpo de la migración nueva es **byte idéntico** a su fuente (9-param, 10-param, 11-param: todos
  `OK` — misma longitud y sin diferencias carácter a carácter). Sin reemplazos manuales de lógica.
- Firme e idempotente: `CREATE OR REPLACE FUNCTION` + `REVOKE`/`GRANT`, aplicable sobre `main`.

### §2 Corrección de Datos y Lógica de Negocio — CUMPLIDO
- La única adición es la cláusula `SET`; `p_user_id := coalesce(auth.uid(), p_user_id)`, la idempotencia
  por `client_sale_token`, el descuento de stock con kits, la inserción de pagos con validación de
  totales y el congelamiento de comisión en `sale_details` quedan intactos.
- Grants reafirmados por sobrecarga: `REVOKE ALL` de `public` y `anon`; `GRANT EXECUTE` solo a
  `authenticated` y `service_role`. Consistente con `20260921170000` (authenticated-only) y con el
  requisito de `service_role` para flujos server-side/documentados en la ACL del RPC transaccional.

### §3 Estado y Contexto Global — SIN CAMBIO
No se tocan hooks, contextos ni el frontend.

### §4 Estilos y UI — SIN CAMBIO
El diff no toca JSX ni CSS.

### §5 Convenciones Estrictas y Logs — CUMPLIDO (verificación mecánica)
- Cero emojis en líneas agregadas (barrido de rangos Unicode sobre `git diff HEAD --`): sin resultados.
- Sin `console.log`/`console.warn` (no aplica: cambios solo en migración SQL y tests).
- EOF newline por byte (`tail -c 1`): `0a` en la migración nueva y en el test de contrato.
- ESLint EXIT 0 sobre ambos tests; Prettier `--check` OK en `transactionalRpcsContract.test.js`
  (el `.sql` no tiene parser de Prettier, consistente con el resto de migraciones).

### §6 Documentación — CUMPLIDO
- `KNOWN_ISSUES.md` #49: estado **resuelto**, con migración, rama, verificaciones y trazabilidad
  (cuerpos byte idénticos vs fuentes).
- `BACKLOG.md`: checkbox `[x]` del ítem de Prioridad Media #49 (`:52`).
- Este informe en `PR_REVIEW.md`.

### §7 Calidad/testing — CUMPLIDO
- `npm test`: **46 archivos / 616 tests passed** (610 previos + 6 nuevos del contrato). Contrastados
  contra el baseline 599/599 de la rama previa (610 tras #50, +6 de este cambio).
- `npm run build:frontend`: EXIT 0 en ~4 s (warning de chunk > 500 kB preexistente).
- Test de contrato `transactionalRpcsContract.test.js` extendido: lee la migración nueva y exige, para
  las tres sobrecargas, el `SET search_path TO 'public'` en el header y los grants REVOKE
  public/anon + GRANT EXECUTE authenticated/service_role (2 grupos `it.each` × 3 sobrecargas).
- `freezeCommissionsSnapshotContract.test.js` sin cambios y verde: lee `20260921170000` (intacta), por
  lo que las aserciones de congelamiento de comisión y grants se conservan.

### Hallazgos y estado
| # | Nivel | Hallazgo | Estado |
|---|---|---|---|
| F1 | Proceso | Rama sin commits sobre `main` (`main` = `HEAD`); CI incremental no evalúa el diff. | RESUELTO — commit + push en esta sesión |
| F2 | Deployment | Migración aún no aplicada al remoto (requiere `supabase db push` + verificación de ACL con `\df+`). | PENDIENTE — se coordinará en la pasada de despliegue general de migraciones |
| F3 | Manual | QA visual del flujo de venta (idempotencia por `client_sale_token`, congelamiento de comisión) tras el push. | PENDIENTE — a cargo del autor |
| O1 | Observación | `cancel_sale_transaction` y `create_partial_return_transaction` son `SECURITY DEFINER` sin `search_path` fijado (`20260917200000:283,1136`), misma clase de vector SEC-5 que #49; ninguna migración posterior lo corrige. | Registrado como `KNOWN_ISSUES.md` **#53 (Medio / SEC-5, abierto)** — migración correctiva de seguimiento |
| O2 | Observación | Grant a `service_role` es una adición vs. la ACL vigente del 11-param (`20260921170000` solo `authenticated`); no existe cliente service-role para esta RPC en `src/`/`electron/` (solo anon key). Inerte pero correcto bajo el requisito de menor privilegio del PR. | Aceptado, documentado |

### Veredicto
La **ciberseguridad del fix es correcta y verificable mecánicamente**: `search_path` fijado en las
tres sobrecargas con cuerpos byte idénticos a las fuentes (evidencia autónoma), grants mínimos
reafirmados, `npm test` 616/616, build OK y convenciones cumplidas. Con F1 (commit + push) y F2
(push de la migración al remoto) resueltos, la rama queda **aprobada** conforme a `PR_REVIEW.md`.

### Re-auditoría independiente de ciberseguridad (23 sep 2026, auditor externo)

Verificación mecánica de `20260923130000_fix_create_sale_transaction_search_path.sql` (script
`audit_identity.js`: extracción de cuerpos entre `AS $function$` y `$function$;` y comparación
SHA-256 contra las fuentes), independiente del proceso de generación del autor:

- **Byte-identity:** cuerpos 9-param (4.802 B, sha `e2833f8e…b12a`) y 10-param (6.885 B, sha
  `2c2b9540…64e1`) idénticos a `20260917200000`; 11-param (19.994 B, sha `ebb21603…08c4c`) idéntico
  a `20260921170000` (variante vigente con congelamiento de comisión en `sale_details`); cabeceras
  con la cláusula `SET` retirada byte-iguales a las fuentes. Artefactos `nine.sql`/`ten.sql`/
  `eleven.sql` y `gen_migration.js` contenidos íntegros en la migración → **generación mecanicista,
  sin transcripción manual; sin alteración accidental de ventas/comisiones**.
- **Cláusula de seguridad:** las tres sobrecargas tienen `SET search_path TO 'public'` inmediatamente
  después de `SECURITY DEFINER` (regex `/SECURITY DEFINER\s+SET search_path TO 'public'\s+AS \$function\$/`
  → `true` ×3).
- **Lógica de negocio intacta (11-param):** `p_user_id := coalesce(auth.uid(), p_user_id)`, snapshot
  de comisión (`commission_enabled`/`commission_type`/`commission_value`/`commission_amount` con
  herencia `dept_commission_enabled`), idempotencia por `client_sale_token` con `unique_violation`,
  kits y `discount_total`/`notes`.
- **ACL (menor privilegio):** 12 líneas: `REVOKE ALL … FROM public` + `anon` y
  `GRANT EXECUTE … TO authenticated` + `service_role` por sobrecarga; `GRANT … TO anon/public` = **0**.
- **Pruebas:** `npm test` → **46 archivos / 616 tests PASSED**; contratos SQL (2 suites) → 21/21;
  `npm run build:frontend` EXIT 0; ESLint y Prettier EXIT 0. Emojis en líneas agregadas: **0**. EOF
  newline (`0a`) por byte en los 5 archivos tocados.

**Hallazgo nuevo → `KNOWN_ISSUES.md` #53:** `cancel_sale_transaction` y
`create_partial_return_transaction` siguen como `SECURITY DEFINER` sin `search_path` fijado
(`20260917200000:283,1136`), misma clase de vector SEC-5 que #49; registro abierto con migración
correctiva de seguimiento propuesta. **No bloquea este PR** (fuera del alcance declarado de #49).
