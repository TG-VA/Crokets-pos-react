# TEMPLATE PARA CREAR NUEVAS PÁGINAS

## Pasos para agregar una nueva página al sistema:

### 1. Crear el componente JSX
```jsx
// src/pages/[NombrePagina]/[NombrePagina].jsx
import React from 'react';
import Navbar from '../../components/Navbar/Navbar';
import Footer from '../../components/Footer/Footer';
import styles from './[NombrePagina].module.css';

const [NombrePagina] = () => {
  return (
    <div className={styles.container}>
      <Navbar />
      <main className={styles.mainContent}>
        <div className={styles.header}>
          <h1>Título de la Página</h1>
          <p>Descripción de la funcionalidad</p>
        </div>

        <div className={styles.content}>
          {/* Contenido específico de la página */}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default [NombrePagina];
```

### 2. Crear estilos CSS Module
```css
/* src/pages/[NombrePagina]/[NombrePagina].module.css */
:root {
  --croketsOrange: #fc8913;
  --croketsOrangeDark: #e07a0d;
  --croketsBlue: #1092b1;
  --lightGray: #f2f2f2;
  --mediumGray: #e0e0e0;
  --darkGray: #333333;
  --textColor: #333333;
  --white: #ffffff;
}

.container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.mainContent {
  flex: 1;
  padding: 2rem;
  background-color: var(--lightGray);
  min-height: calc(100vh - 160px);
}

/* Resto de estilos específicos */
```

### 3. Agregar importación en App.jsx
```jsx
import [NombrePagina] from './pages/[NombrePagina]/[NombrePagina]';
```

### 4. Agregar ruta en App.jsx
```jsx
<Route path="/[ruta-url]/*" element={<AuthGuard><[NombrePagina] /></AuthGuard>} />
```
Las rutas operativas (requieren sesión y caja abierta) usan `AuthGuard`; las administrativas
(`/settings`, `/profiles`) usan `<AuthGuard requireCashRegister={false}>`. El guard resuelve la
redirección a `/cash-register` o `/login` según corresponda, sin repetir la lógica en cada ruta.

### 5. El botón del navbar ya está configurado
El botón ya existe en el array `navItems` del `Navbar.jsx`, solo necesita que exista la página correspondiente.

## ESTADO DE LAS VISTAS (14 sep 2026)

Todas las vistas base están implementadas y enrutadas en `src/App.jsx:52-63`:

| Ruta | Vista | Estado |
|---|---|---|
| `/login` | Login | Implementada |
| `/cash-register` | Apertura de caja | Implementada |
| `/dashboard` | Dashboard | Implementada |
| `/products/*` | Productos | Implementada |
| `/cashcut/*` | Corte de caja | Implementada |
| `/inventory/*` | Inventario | Implementada |
| `/invoices/*` | Facturas | Implementada |
| `/customers/*` | Clientes | Implementada |
| `/reports/*` | Reportes | Implementada |
| `/settings` | Configuración | Implementada |
| `/profiles` | Perfiles de usuario | Implementada |

Nota: la ruta de corte de caja es `/cashcut/*` (no `/cashout`). Ver `KNOWN_ISSUES.md` #12.

## ESTRUCTURA DE CARPETAS
```
src/pages/
├── CashCut/
├── CashRegister/
├── Customers/
├── Dashboard/
├── Inventory/
├── Invoices/
├── Login/
├── Products/
├── Profiles/
├── Reports/
└── Settings/
```
