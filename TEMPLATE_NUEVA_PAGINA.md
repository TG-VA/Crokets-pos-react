# 🛠️ TEMPLATE PARA CREAR NUEVAS PÁGINAS

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
<Route 
  path="/[ruta-url]" 
  element={
    cashRegistered ? 
      <[NombrePagina] /> : 
      <Navigate to="/cash-register" replace />
  } 
/>
```

### 5. El botón del navbar ya está configurado
El botón ya existe en el array `navItems` del `Navbar.jsx`, solo necesita que exista la página correspondiente.

## PÁGINAS PENDIENTES POR CREAR:
- ✅ `/products` - Productos (CREADA)
- ⏳ `/inventory` - Inventario
- ⏳ `/invoices` - Facturas  
- ⏳ `/cashout` - Corte de caja
- ⏳ `/reports` - Reportes
- ⏳ `/settings` - Configuración

## ESTRUCTURA DE CARPETAS RECOMENDADA:
```
src/pages/
├── Dashboard/
├── Login/  
├── CashRegister/
├── Products/ ✅
├── Inventory/
├── Invoices/
├── Cashout/
├── Reports/
└── Settings/
```
