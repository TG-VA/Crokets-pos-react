// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
// Componente raíz de la aplicación.
import App from './App';

// Renderiza el componente principal de la aplicación en el DOM.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
