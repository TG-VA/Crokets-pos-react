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
| Runtime | Node.js (Express) |
| Base de datos local | SQLite (`sqlite3`) |
| Backend remoto | Supabase (auth, funciones edge, base de datos) |

> **Nota:** el backend local Express (`src/backend/server.js`) actualmente solo se inicia en modo desarrollo. Ver `KNOWN_ISSUES.md` (punto 1) y `DEPLOYMENT.md` antes de generar cualquier build de distribución.

#### Prerrequisitos

Antes de comenzar, asegúrate de tener instalados los siguientes programas y herramientas:

- [Node.js](https://nodejs.org/) (versión LTS recomendada)
- [NVM (Node Version Manager)](https://github.com/nvm-sh/nvm) para gestionar versiones de Node.js
- [npm](https://www.npmjs.com/) (incluido con Node.js)
- [Git](https://git-scm.com/) para clonar el repositorio
- [SQLite3](https://www.sqlite.org/) para la base de datos local
- Un archivo `.env` con las credenciales del proyecto de Supabase (no se commitea — ver `.gitignore` y `AGENTS.md`)

##### Dependencias principales

Estas se instalarán automáticamente con `npm install`:

- [React](https://reactjs.org/) — Librería para la interfaz de usuario
- [React DOM](https://www.npmjs.com/package/react-dom) — Renderizado de componentes en el DOM
- [React Router DOM](https://reactrouter.com/) — Ruteo entre páginas
- [Electron.js](https://www.electronjs.org/) — Entorno para crear aplicaciones de escritorio
- [Express](https://expressjs.com/) — Servidor backend local
- [SQLite3](https://www.npmjs.com/package/sqlite3) — Base de datos local
- [@supabase/supabase-js](https://supabase.com/docs/reference/javascript) — Cliente del backend remoto (auth, base de datos)
- [CORS](https://www.npmjs.com/package/cors) — Permitir peticiones entre orígenes

##### Dependencias de desarrollo

- [Vite](https://vitejs.dev/) — Herramienta de construcción y servidor de desarrollo
- [Electron Builder](https://www.electron.build/) — Empaquetar y generar instaladores
- [Electron Rebuild](https://github.com/electron/electron-rebuild) — Reconstruir módulos nativos
- [Concurrently](https://www.npmjs.com/package/concurrently) — Ejecutar varios comandos en paralelo
- [Cross Env](https://www.npmjs.com/package/cross-env) — Configuración de variables de entorno multiplataforma
- [Wait On](https://www.npmjs.com/package/wait-on) — Esperar a que recursos estén listos
- [Nodemon](https://nodemon.io/) — Reinicio automático del servidor backend
- [Node Gyp](https://github.com/nodejs/node-gyp) — Compilación de módulos nativos
- Tipos para TypeScript: `@types/react`, `@types/react-dom`, `@types/sqlite3`

#### Estructura del Proyecto

```
POS-CROKETS-REACT/
├── electron/                # Archivos relacionados con la configuración de Electron
├── node_modules/            # Dependencias instaladas con npm
├── src/                     # Código fuente de la aplicación
│   ├── assets/              # Recursos estáticos
│   │   ├── icons/           # Iconos de la aplicación
│   │   └── images/          # Imágenes
│   ├── backend/             # Lógica de backend integrada en el proyecto
│   ├── components/          # Componentes reutilizables
│   ├── pages/               # Páginas principales de la app
│   ├── App.jsx              # Componente raíz de React
│   └── main.jsx              # Punto de entrada de la app React
├── .gitignore                # Archivos y carpetas ignorados por Git
├── index.html                 # HTML principal usado por Vite
├── package-lock.json          # Versión exacta de dependencias instaladas
├── package.json               # Configuración del proyecto y scripts
└── README.md                  # Documentación del proyecto
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
| `npm run rebuild` | Reconstruye módulos nativos (necesario tras cambios relacionados con `sqlite3`) |

> **Nota:** completar esta tabla si existen otros scripts definidos en `package.json` (por ejemplo, lint o test una vez se configuren — ver `KNOWN_ISSUES.md` punto 8).

#### Documentación relacionada
- `AGENTS.md` — convenciones para agentes de IA y desarrolladores
- `CODE_STANDARDS.md` — estándares de código del proyecto
- `KNOWN_ISSUES.md` — problemas conocidos y su severidad
- `DEPLOYMENT.md` — build y distribución
- `PERMISSIONS.md` / `SCHEMA.md` — roles, permisos y datos