# CODE_STANDARDS.md — Estándares de código

Guía pragmática de buenas prácticas para este proyecto. El objetivo es mantener el código legible, seguro y fácil de modificar a medida que el sistema crece.

## Principios Fundamentales

### 1. Single Responsibility (SRP), versión práctica
- Un componente o archivo debería tener una responsabilidad clara.
- Separar la lógica de negocio, llamadas a base de datos (Supabase/SQLite) y componentes visuales.
- Extraer hooks personalizados para manejo de estado complejo (ej. `useProductsReport`).
- Extraer servicios para consultas de Supabase o SQLite (ej. `productReportsService.js`).

### 2. DRY, KISS y YAGNI
- **DRY (Don't Repeat Yourself):** Maximizar la reutilización del código. Si una lógica específica (control de modales, alertas, formateo de datos, atajos de teclado) se necesita en más de un componente, debe extraerse a la raíz global (`src/hooks/` o `src/utils/`). Está estrictamente prohibido duplicar implementaciones o estados locales que resuelvan el mismo problema.
- **KISS (Keep It Simple, Stupid):** Priorizar la legibilidad y la simplicidad sobre la abstracción prematura. Si un componente es extenso pero es puramente presentacional (solo renderiza JSX y carece de efectos o base de datos), debe mantenerse unificado. Se desaconseja fragmentar componentes visuales si esto obliga a inyectar múltiples propiedades (*Prop Drilling*) de forma artificial.
- **YAGNI (You Aren't Gonna Need It):** No escribir código ni diseñar arquitecturas para casos de uso futuros hipotéticos. Queda prohibida la creación de carpetas genéricas aisladas (como `services/` o `utils/`) dentro de un submódulo si esa lógica se utiliza en una sola vista. Las abstracciones se crean cuando la necesidad de reutilización es real, no antes.

### 3. Estilos y CSS Modules
- **CSS Modules estrictos:** Cada componente o página debe utilizar su archivo `*.module.css`.
- **Cero estilos inline:** Prohibido usar `style={{ ... }}` en JSX para layout, fuentes, colores o alineaciones. Estilos inline solo se toleran para valores dinámicos calculados estrictamente en tiempo de ejecución.
- **Cero `!important`:** Resolver conflictos de CSS refinando la especificidad del selector o el orden de importación.
- **Iconografía:** Usar exclusivamente iconos SVG del catálogo `src/assets/icons/`. Ajustar sus dimensiones y opacidad con CSS Modules.

### 4. Cero Emojis (Regla Estricta)
- No incluir emojis en código JSX, componentes, mensajes de alerta, UI, commits, logs de consola ni documentación.

### 5. Manejo de Logs y Trazabilidad de Errores
- **Logs de Debug (`console.log`, `console.warn`):** Deben limpiarse en el código final/PR para mantener limpia la consola en producción.
- **Logs de Error (`console.error`):** **NO ELIMINAR `console.error`** en bloques `catch` o llamadas a servicios asíncronos. La trazabilidad en consola es indispensable para debugging en producción cuando no hay servicio de APM/error tracking. Sanitizar emojis en los textos de error pero mantener el log.

### 6. Calidad de Sintaxis y Formato
- Construir `className` dinámicos de forma limpia, evitando espacios colgantes o clases vacías imprevistas.
- Garantizar salto de línea final (EOF newline) en todos los archivos del repositorio.

### 7. Accesibilidad (a11y) y Comentarios
- **Imágenes decorativas (a11y):** Si un icono o imagen es puramente visual y está dentro de un botón o enlace que ya tiene texto descriptivo (o atributos como `title` o `aria-label`), el atributo `alt` debe estar vacío (`alt=""`) para evitar tartamudeo o redundancia en lectores de pantalla.
- **Comentarios limpios:** Los comentarios en el código (CSS o JS) deben explicar el "por qué" o describir la sección estructuralmente. Evitar comentarios que detallen la historia de refactorizaciones pasadas (ej. evitar "Aquí quitamos la clase X").
