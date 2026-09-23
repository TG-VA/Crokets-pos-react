### Crokets-POS - Sistema de Punto de Venta para Mascotas

#### Introducción

**Crokets-POS** es un sistema de punto de venta especializado para establecimientos de alimentos para mascotas que ofrece:

- Gestión integral de ventas
- Control de inventario avanzado
- Generación de reportes detallados
- Interfaz intuitiva y fácil de usar

#### Arquitectura Técnica

##### Frontend
| Tecnología | Función |
|------------|---------|
| Electron.js | Framework para aplicaciones de escritorio |
| React | Biblioteca principal para construcción de UI |
| Vite | Bundler y entorno de desarrollo |
| React Router | Manejo de navegación entre vistas |

##### Backend
| Componente | Tecnología |
|------------|-----------|
| Runtime | Node.js (proceso main de Electron) |
| Backend remoto | Supabase (auth, RPCs, base de datos PostgreSQL) |

> **Nota:** el backend local Express con SQLite (`src/backend`) se eliminó por completo — ya no se usa en
> desarrollo ni en producción (ver `KNOWN_ISSUES.md` #31 y #34, resueltos). El frontend consumía sus
> endpoints legacy, pero ese flujo migró a RPCs de Supabase. `npm run dev` solo levanta Vite + Electron.

#### Prerrequisitos

Antes de comenzar, asegúrate de tener instalados los siguientes programas y herramientas:

- [Node.js](https://nodejs.org/) (versión LTS recomendada)
- [NVM (Node Version Manager)](https://github.com/nvm-sh/nvm) para gestionar versiones de Node.js
- [npm](https://www.npmjs.com/) (incluido con Node.js)
- [Git](https://git-scm.com/) para clonar el repositorio
- Un archivo `.env` con las credenciales del proyecto de Supabase (no se commitea — ver `.gitignore` y `AGENTS.md`)

##### Dependencias principales

Estas se instalarán automáticamente con `npm install`:

- [React](https://reactjs.org/) — Librería para la interfaz de usuario
- [React DOM](https://www.npmjs.com/package/react-dom) — Renderizado de componentes en el DOM
- [React Router DOM](https://reactrouter.com/) — Ruteo entre páginas
- [Electron.js](https://www.electronjs.org/) — Entorno para crear aplicaciones de escritorio
- [@supabase/supabase-js](https://supabase.com/docs/reference/javascript) — Cliente del backend remoto (auth, base de datos)

##### Dependencias de desarrollo

- [Vite](https://vitejs.dev/) — Herramienta de construcción y servidor de desarrollo
- [Electron Builder](https://www.electron.build/) — Empaquetar y generar instaladores
- [Concurrently](https://www.npmjs.com/package/concurrently) — Ejecutar varios comandos en paralelo
- [Cross Env](https://www.npmjs.com/package/cross-env) — Configuración de variables de entorno multiplataforma
- [Wait On](https://www.npmjs.com/package/wait-on) — Esperar a que recursos estén listos
- [Node Gyp](https://github.com/nodejs/node-gyp) — Compilación de módulos nativos
- Tipos para TypeScript: `@types/react`, `@types/react-dom`

#### Estructura del Proyecto

```
POS-CROKETS-REACT/
├── docs/                    # Documentación técnica (env, testing, migraciones, edge functions)
├── electron/                # Proceso principal y preload de Electron
├── scripts/                 # Scripts de importación (ej. códigos postales SEPOMEX)
├── src/                     # Código fuente de la aplicación
│   ├── assets/              # Recursos estáticos
│   │   ├── icons/           # Iconos SVG de la aplicación (ver ICONS.md)
│   │   └── images/          # Imágenes
│   ├── components/          # Componentes por subdominio (Sales, Products, Reports, etc.)
│   ├── config/              # Configuración transversal (ej. secciones protegidas)
│   ├── contexts/            # Contextos globales (Auth, Branch, Products)
│   ├── hooks/               # Hooks globales reutilizables
│   ├── lib/                 # Clientes y servicios base (Supabase, permisos)
│   ├── pages/               # Páginas principales de la app
│   ├── services/            # Servicios de datos por dominio
│   ├── utils/               # Utilidades puras (ticket, corte, formatters)
│   ├── App.jsx              # Componente raíz de React (rutas)
│   └── main.jsx             # Punto de entrada de la app React
├── supabase/                # Migraciones, edge functions y config del proyecto remoto
├── .gitignore               # Archivos y carpetas ignorados por Git
├── index.html               # HTML principal usado por Vite
├── package-lock.json        # Versión exacta de dependencias instaladas
├── package.json             # Configuración del proyecto y scripts
└── README.MD                # Documentación del proyecto
```

#### Proceso de Instalación

```bash
# 1. Clonar repositorio
git clone https://github.com/TG-VA/crokets-pos.git

# 2. Navegar al directorio
cd crokets-pos

# 3. Instalar dependencias
npm install

# 4. Crear el archivo .env con las credenciales de Supabase (ver AGENTS.md)

# 5. Iniciar en modo desarrollo
npm run dev
```

#### Comandos Disponibles
| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Inicia Vite + Electron en modo desarrollo |
| `npm run build` | Genera el instalador de escritorio (NSIS, Windows). Ver `DEPLOYMENT.md` antes de usarlo con clientes reales |
| `npm run build:frontend` | Solo compila el frontend con Vite |
| `npm run build:electron` | Solo empaqueta con electron-builder |
| `npm run start` | Inicia Electron sobre el build existente (sin Vite) |
| `npm run watch` | Compila el frontend en modo watch |
| `npm run preview` | Sirve localmente el build de Vite |
| `npm test` | Ejecuta la suite de tests (Vitest). Ver `docs/TESTING.md` |

> El linter (ESLint/Prettier) todavía no está configurado — ver `KNOWN_ISSUES.md` punto 8.

#### Documentación relacionada
- `AGENTS.md` — convenciones para agentes de IA y desarrolladores
- `CODE_STANDARDS.md` — estándares de código del proyecto
- `KNOWN_ISSUES.md` — problemas conocidos y su severidad
- `BACKLOG.md` — roadmap priorizado de pendientes
- `PR_REVIEW.md` — checklist de revisión de PRs
- `docs/PR_AUDIT_HISTORY.md` — historial de auditorías de PRs aprobados
- `DEPLOYMENT.md` — build y distribución
- `PERMISSIONS.md` / `SCHEMA.md` — roles, permisos y datos
- `ICONS.md` / `TEMPLATE_NUEVA_PAGINA.md` — catálogo de iconos y plantilla de páginas
- `docs/ENV_VARIABLES.md` — variables de entorno requeridas
- `docs/TESTING.md` — cómo correr y escribir tests
- `docs/SUPABASE_MIGRATIONS.md` — flujo de migraciones y edge functions
- `docs/EDGE_FUNCTIONS.md` — contrato de las funciones edge
