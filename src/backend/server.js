// Módulos de Node.js para el servidor, CORS, rutas y base de datos.
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./bd');
const app = express();
const port = 3000;

// --- Configuración de Middleware ---
// Permite solicitudes desde otros orígenes.
app.use(cors()); // Habilita el análisis del cuerpo de las solicitudes en formato JSON.
app.use(express.json()); // Habilita el análisis del cuerpo de las solicitudes de formularios.
app.use(express.urlencoded({ extended: true }));

// --- Rutas de la API ---

// Ruta para el inicio de sesión (`POST /login`).
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  // Valida que se hayan proporcionado las credenciales.
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Faltan credenciales' });
  }

  // Consulta la base de datos para verificar las credenciales.
  db.get(
    'SELECT * FROM users WHERE username = ? AND password = ?',
    [username, password],
    (err, row) => {
      if (err) {
        // Manejo de errores de la base de datos.
        console.error('Error al consultar la base de datos:', err);
        return res.status(500).json({ success: false, message: 'Error interno del servidor' });
      }

      if (row) {
        // Credenciales válidas.
        res.json({ success: true, message: 'Login exitoso' });
      } else {
        // Credenciales inválidas.
        res.status(401).json({ success: false, message: 'Usuario o contraseña incorrectos' });
      }
    }
  );
});

// Inicia el servidor y lo pone a escuchar en el puerto definido.
app.listen(port, () => {
  console.log(`🟢 Servidor corriendo en http://localhost:${port}`);
});
