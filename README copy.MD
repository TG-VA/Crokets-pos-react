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
| ------ | ------ |
| Electron.js | Framework para aplicaciones de escritorio |
| React | Biblioteca principal para construcción de UI |
| Vite | Bundler y entorno de desarrollo |
| React Router | Manejo de navegación entre vistas |

##### Backend
| Tecnología | Función |
| ------ | ------ |
| Express | Servidor local embebido (`src/backend/server.js`) |
| SQLite (`sqlite3`) | Base de datos local |
| Supabase | Backend remoto (auth, funciones edge, base de datos) |

> **Nota:** el backend local Express actualmente solo se inicia en modo desarrollo. Ver `KNOWN_ISSUES.md` (punto 1) antes de generar cualquier build de distribución.

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

#### Requisitos previos
- Node.js (versión compatible con Electron 37 / Vite 7 — confirmar versión mínima usada por el equipo)
- Un archivo `.env` con las credenciales de Supabase (no se commitea, ver `.gitignore`)

#### Comandos Disponibles
| Comando | Descripción |
| ------ | ------ |
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
