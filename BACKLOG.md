# BACKLOG.md — Roadmap y Priorización

Vista resumida y priorizada de las tareas pendientes del proyecto **CROKETS POS**, pensada para
planeación rápida. La descripción técnica completa, el estado y el impacto de cada punto viven en
`KNOWN_ISSUES.md` — este documento **no duplica esa información**, solo la ordena por prioridad de
ejecución. Al resolver un ítem, actualizar primero `KNOWN_ISSUES.md` (cambiar su Estado a
**Resuelto**) y luego marcar el checkbox aquí.

## Prioridad Crítica (Bloqueantes de Producción)

* [ ] Backend embebido no arranca en producción — ver `KNOWN_ISSUES.md` #1
* [ ] Contraseña de admin local en texto plano — ver `KNOWN_ISSUES.md` #2

## Prioridad Alta (Arquitectura y Backend)

* [ ] Componentes "dios" pendientes de refactor (`CashCut.jsx`, `ticketBuilder.js`, `RewardModal.jsx`) — ver `KNOWN_ISSUES.md` #3
* [ ] Emojis pendientes de limpiar en código fuente (`Settings.jsx`, `SalesProductsTable.jsx`, `bd.js`) — ver `KNOWN_ISSUES.md` #4
* [ ] Transacciones atómicas (RPC) faltantes en Supabase para Importación y Kits — ver `KNOWN_ISSUES.md` #5

## Prioridad Media (Infraestructura y Testing)

* [x] Configurar entorno de testing (Vitest + jsdom, `npm test`) — ver `KNOWN_ISSUES.md` #8
* [ ] Configurar linter (ESLint/Prettier) — ver `KNOWN_ISSUES.md` #8
* [x] Unit tests para utilidades puras restantes — `importUtils`, `productsImportService` y `productKitsService` cubiertos (suite total en 83 tests con `productFormatters`, `usePagination`, `productCrudService` y `useSalesTotals`) — ver `KNOWN_ISSUES.md` #9
* [ ] Migraciones SQL versionadas para el schema de Supabase (baseline del schema existente; ya existe la primera migración funcional) — ver `KNOWN_ISSUES.md` #6
* [ ] Revisión de roles y permisos entre Supabase y SQLite local — ver `KNOWN_ISSUES.md` #10
* [x] Migrar tablas de reportes al hook global `usePagination` (client-side, server-side Sales e híbrido Cash completo) — ver `KNOWN_ISSUES.md` #15
* [x] Extraer componente compartido `PaginationBar` y eliminar los footers de paginación duplicados — ver `KNOWN_ISSUES.md` #15
* [x] Migrar lista de productos a paginación server-side (RPC `get_branch_products_paginated`; `useProductsList` desacoplado de `ProductsContext`) — ver `KNOWN_ISSUES.md` #16
* [x] Refactor de `ProductsContext`: extraer lógica de datos/CRUD a `src/services/products/` y optimizar realtime — ver `KNOWN_ISSUES.md` #16

## Prioridad Baja (Nuevas Vistas y Cosmética)

* [ ] Vistas pendientes: `/inventory`, `/invoices`, `/cashout`, `/settings` — ver `TEMPLATE_NUEVA_PAGINA.md` y `KNOWN_ISSUES.md` #12
* [ ] Simplificar condicional muerto de ícono en `electron/main.js` — ver `KNOWN_ISSUES.md` #11
* [ ] Normalizar EOF newline en archivos preexistentes de `src/` (decenas de archivos) — ver `KNOWN_ISSUES.md` #17

---

## Cómo usar este documento

- Este archivo responde a **"qué hacer primero"**. `KNOWN_ISSUES.md` responde a **"qué está roto y
  por qué"**. No agregar descripciones largas aquí — si un ítem necesita más contexto, ese contexto
  va en `KNOWN_ISSUES.md`.
- Si surge una tarea nueva sin issue asociado todavía, agregarla primero en `KNOWN_ISSUES.md` con su
  severidad, y después referenciarla aquí con su prioridad de ejecución.
