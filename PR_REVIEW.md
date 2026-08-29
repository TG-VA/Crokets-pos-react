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