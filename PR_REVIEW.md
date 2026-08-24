# PR_REVIEW.md — Guía de revisión de Pull Requests

Lista de verificación completa para la revisión de PRs (humana y mediante agentes de IA como Claude, Gemini, Cursor o Copilot).

## Checklist de Revisión

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
