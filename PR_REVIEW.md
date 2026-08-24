# PR_REVIEW.md — Guía de revisión de Pull Requests

Lista de verificación completa para la revisión de PRs (humana y mediante agentes de IA como Claude, Gemini, Cursor o Copilot).

> **Orden de trabajo sugerido:** 1) leer el diff completo para entender la intención del PR,
> 2) abrir los archivos completos de cualquier función con lógica async o de negocio,
> 3) trazar manualmente las rutas críticas (dinero, inventario, comisiones), 4) recién entonces
> evaluar estilo y convenciones. No evalúes estilo antes de entender la lógica.

> **Nota crítica:** un diff muestra solo fragmentos con contexto limitado. Antes de emitir
> veredicto, el agente debe abrir el archivo completo (no solo el hunk) para cualquier función
> que involucre async/await, manejo de estado, o lógica de negocio — un `try/catch` o un
> `return` puede estar fuera del rango visible del diff y cambiar el comportamiento real.

## Checklist de Revisión

### 0. Correctitud y manejo de errores (revisar primero)
- [ ] **Async/await:** ¿Todo `try` que hace `await` tiene su propio `catch`, o depende de un catch externo que puede no ejecutarse por callbacks asíncronos (ej. confirmaciones, setTimeout, promesas "fire and forget")?
- [ ] **Estados de carga/guardado:** ¿`setSaving`/`setLoading` se resetean en TODOS los caminos (éxito, error, cancelación), sin quedar colgados?
- [ ] **Validación antes de mutar:** ¿Los datos se validan antes de escribir a Supabase, no después?
- [ ] **Regresiones de comportamiento:** ¿Alguna función existente (ej. cálculos, validaciones) cambió su lógica dentro de un "refactor" aparentemente cosmético? Compara `Number.isFinite` vs `isFinite`, condiciones `>=` vs `>`, etc.
- [ ] **Trazabilidad de rutas críticas:** Para cualquier cambio que toque cálculos de dinero, inventario o comisiones, ¿el agente trazó manualmente el flujo de datos línea por línea (no confió en que "se probó en dev")?

### 1. Funcionalidad y Arquitectura
- [ ] **Pruebas en desarrollo:** ¿El cambio fue probado con `npm run dev` verificando el flujo completo (ventas, caja, sucursal)?
- [ ] **Aislamiento de lógica (SRP):** ¿La lógica de negocio reside en hooks/servicios y no saturando el JSX del componente?
- [ ] **Validación DRY:** ¿El código introducido hace uso de hooks, contextos o servicios globales existentes en lugar de reescribir su propia implementación?
- [ ] **Validación KISS/YAGNI:** ¿El refactor soluciona el problema actual de la forma más directa posible, sin introducir sobreingeniería o configuraciones para escenarios futuros no confirmados?
- [ ] **Límite de líneas:** ¿Se evitó crear o agrandar 'god components' de más de 300-400 líneas?

### 2. Estilos y UI
- [ ] **CSS Modules:** ¿Se usaron únicamente archivos `*.module.css` sin estilar con CSS global o frameworks externos?
- [ ] **Cero estilos inline:** ¿Se eliminaron los atributos `style={{...}}` innecesarios en JSX?
- [ ] **Sin `!important`:** ¿El CSS Module no utiliza `!important` para forzar estilos?
- [ ] **Clases dinámicas limpias:** ¿Las interpolaciones de `className` no dejan espacios extra en blanco?
- [ ] **Iconos SVG locales:** ¿Se importaron SVGs locales desde `src/assets/icons/` respetando `ICONS.md`?
- [ ] **Existencia de assets:** ¿Se verificó que los iconos/rutas importados realmente existen en el repo?

### 3. Convenciones Estrictas y Logs
- [ ] **Cero Emojis:** ¿El diff está 100% libre de emojis en código, UI, comentarios o mensajes de error?
- [ ] **Limpieza de Debug:** ¿Se eliminaron todos los `console.log` y `console.warn` de rastreo?
- [ ] **Preservación de Errors:** ¿Se mantuvieron los `console.error` en bloques `catch` (sin emojis) para mantener trazabilidad en producción?
- [ ] **EOF Newline:** ¿Todos los archivos modificados finalizan con un salto de línea en blanco?

### 4. Documentación
- [ ] **Checklist de estado:** Si el PR completa una página o resuelve un ítem de `KNOWN_ISSUES.md` o `TEMPLATE_NUEVA_PAGINA.md`, ¿se actualizó la documentación correspondientemente?

### 5. Accesibilidad (a11y) y Calidad
- [ ] **Imágenes decorativas:** ¿Los iconos/imágenes dentro de botones con `title`/texto tienen `alt=""` para evitar redundancia en lectores de pantalla?
- [ ] **Comentarios:** ¿Los comentarios son claros, explican el propósito actual y no contienen historial de refactorizaciones?

### 6. Impacto en el sistema
- [ ] **Consumo downstream:** Si el PR agrega o renombra un campo (ej. de X a Y), ¿se identificaron TODOS los lugares que leían el campo viejo? Búsqueda global del nombre anterior.
- [ ] **Cambios de esquema:** Si el código asume columnas/tablas nuevas en Supabase, ¿el PR incluye la migración SQL correspondiente o referencia dónde se aplicó?

### 7. Alcance del PR
- [ ] **Cambios no relacionados:** ¿Todo el diff pertenece al objetivo declarado del PR? Señala explícitamente cualquier archivo/función modificada que no tenga relación directa con el título del PR.
- [ ] **Ruido en el diff:** ¿Hay cambios de indentación/formato incidentales que no aportan nada y solo dificultan el review?

### 8. Operaciones sensibles
- [ ] **Mutaciones masivas:** ¿Alguna acción sobreescribe o borra datos de múltiples registros (bulk update/delete)? Si es así, ¿el usuario ve claramente el alcance ("esto afectará N productos") antes de confirmar?
- [ ] **Diálogos de confirmación innecesarios:** ¿La confirmación se dispara solo cuando el dato relevante realmente cambió, no en cada guardado?
- [ ] **Pérdida de datos silenciosa:** ¿Algún override/valor específico de un registro hijo puede perderse sin aviso al actualizar el padre?

### 9. Consistencia
- [ ] **Naming coherente:** ¿El PR introduce un nombre de campo/variable que ya existe con otra convención en otra parte del código (ej. singular vs plural, `enable` vs `enabled`)? Señálalo aunque no sea nuevo.

### 10. Seguridad
- [ ] **Secrets:** ¿Se filtran API keys, tokens o credenciales en el código, logs o mensajes de error?
- [ ] **RLS de Supabase:** Si se agregan tablas/columnas nuevas, ¿las políticas de Row Level Security cubren el nuevo campo, o quedó accesible sin restricción?
- [ ] **Input sin sanitizar:** ¿Algún valor del usuario se inserta directo en queries, URLs, o `dangerouslySetInnerHTML` sin validar?

> **Nota para el agente:** las secciones 6 y 9 no se pueden verificar solo leyendo el diff.
> Antes de responder, busca en el repositorio completo (grep/search) el nombre del campo
> anterior y el nuevo, para confirmar dónde se lee/escribe cada uno. Si no tienes acceso
> al repo completo, dilo explícitamente en "Preguntas al autor" en vez de asumir que está bien.

## Formato de salida obligatorio

El agente debe estructurar su respuesta así, en este orden:

1. **Veredicto** en una línea: Aprobado / Aprobado con comentarios menores / Cambios solicitados / Rechazado.
   - **Aprobado**: cumple todas las secciones relevantes, sin bloqueantes ni observaciones importantes.
   - **Aprobado con comentarios menores**: sin bloqueantes; solo hay nits de estilo o convenciones (🟡).
   - **Cambios solicitados**: la idea/arquitectura es correcta, pero hay bloqueantes puntuales y corregibles (🔴 y/o 🟠 relevantes) sin necesidad de replantear el enfoque.
   - **Rechazado**: el enfoque de fondo está mal (ej. lógica de negocio en el lugar incorrecto, solución que no resuelve el problema real, o rompe una convención arquitectónica no negociable del proyecto). Se necesita replantear, no parchear.
2. **🔴 Bloqueantes** — bugs reales, regresiones, mutaciones destructivas sin control, falta de manejo de errores, datos que no se persisten o no se consumen donde deberían.
3. **🟠 Importante** — deuda técnica relevante, UX riesgosa, inconsistencias que probablemente causen bugs futuros.
4. **🟡 Menor / nits** — estilo, convenciones del checklist, ruido en el diff.
5. **Preguntas al autor** — cuando el agente no tiene contexto suficiente para juzgar (ej. "¿dónde se consume este campo?"), debe preguntar en vez de asumir que está bien.

Reglas:
- El agente NUNCA debe dar "Aprobado" si hay al menos un bloqueante, sin importar cuántas casillas de estilo se cumplan.
- Cada hallazgo en 🔴/🟠/🟡 debe citar el archivo y, si aplica, la línea o función exacta — nunca una observación genérica sin ubicación.
- El agente nunca debe afirmar que algo "funciona correctamente" o "no tiene problemas" en un área que no pudo verificar directamente (ej. base de datos, ejecución real, tests). En esos casos debe decir explícitamente "no pude verificar esto" y moverlo a "Preguntas al autor".