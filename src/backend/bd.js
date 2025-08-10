const sqlite3 = require('sqlite3').verbose();
const path = require('path');

/**
 * Configuración de la base de datos SQLite.
 */

// Define la ruta del archivo de la base de datos.
const dbPath = path.join(__dirname,'db', 'users.db');

// Conexión a la base de datos
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error al abrir la base de datos:', err.message);
    process.exit(1); // Termina la aplicación si no puede conectarse a la DB
  } else {
    console.log('✅ Base de datos conectada correctamente en:', dbPath);

    // Crear tabla si no existe
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL
      )
    `, (err) => {
      if (err) return console.error('Error al crear la tabla:', err.message);

      console.log('Tabla "users" verificada.');

      // Insertar usuario por defecto solo si no existe
      db.get(`SELECT COUNT(*) AS total FROM users WHERE username = ?`, ['admin'], (err, row) => {
        if (err) return console.error('Error al verificar usuario:', err.message);

        if (row.total === 0) {
          db.run(`INSERT INTO users (username, password) VALUES (?, ?)`, ['admin', '1234'], (err) => {
            if (err) return console.error('Error al insertar usuario inicial:', err.message);
            console.log('Usuario inicial "admin" creado con contraseña "1234".');
          });
        } else {
          console.log('Usuario "admin" ya existe.');
        }
      });
    });
  }
});

// Exporta el objeto de la base de datos para su uso en otros módulos.
module.exports = db;
