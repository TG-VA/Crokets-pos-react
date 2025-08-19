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
        name TEXT NOT NULL,
        password TEXT NOT NULL,
        permissions TEXT NOT NULL DEFAULT '[]',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) return console.error('Error al crear la tabla:', err.message);

      console.log('Tabla "users" verificada.');

      // Verificar y agregar columnas si no existen (para compatibilidad con DBs existentes)
      db.all(`PRAGMA table_info(users)`, (err, columns) => {
        if (err) {
          console.error('Error al obtener información de la tabla:', err);
          return;
        }

        const columnNames = columns.map(col => col.name);
        
        // Agregar columna name si no existe
        if (!columnNames.includes('name')) {
          db.run(`ALTER TABLE users ADD COLUMN name TEXT DEFAULT 'Usuario'`, (err) => {
            if (err) console.log('Columna name ya existe o error:', err.message);
            else console.log('Columna name agregada');
          });
        }

        // Agregar columna permissions si no existe
        if (!columnNames.includes('permissions')) {
          db.run(`ALTER TABLE users ADD COLUMN permissions TEXT DEFAULT '[]'`, (err) => {
            if (err) console.log('Columna permissions ya existe o error:', err.message);
            else console.log('Columna permissions agregada');
          });
        }

        // Agregar columna created_at si no existe
        if (!columnNames.includes('created_at')) {
          db.run(`ALTER TABLE users ADD COLUMN created_at DATETIME`, (err) => {
            if (err) console.log('Columna created_at ya existe o error:', err.message);
            else {
              console.log('Columna created_at agregada');
              // Actualizar registros existentes con fecha actual
              db.run(`UPDATE users SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL`);
            }
          });
        }

        // Agregar columna updated_at si no existe
        if (!columnNames.includes('updated_at')) {
          db.run(`ALTER TABLE users ADD COLUMN updated_at DATETIME`, (err) => {
            if (err) console.log('Columna updated_at ya existe o error:', err.message);
            else {
              console.log('Columna updated_at agregada');
              // Actualizar registros existentes con fecha actual
              db.run(`UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL`);
            }
          });
        }
      });

      // Insertar usuario por defecto solo si no existe
      db.get(`SELECT COUNT(*) AS total FROM users WHERE username = ?`, ['admin'], (err, row) => {
        if (err) return console.error('Error al verificar usuario:', err.message);

        if (row.total === 0) {
          const adminPermissions = JSON.stringify([
            'ventas', 'productos', 'inventario', 'facturas', 
            'corte', 'reportes', 'configuracion'
          ]);
          db.run(`INSERT INTO users (username, name, password, permissions) VALUES (?, ?, ?, ?)`, 
            ['admin', 'Administrador', '1234', adminPermissions], (err) => {
            if (err) return console.error('Error al insertar usuario inicial:', err.message);
            console.log('Usuario inicial "admin" creado con contraseña "1234".');
          });
        } else {
          console.log('Usuario "admin" ya existe.');
          // Actualizar usuario admin existente con nuevos campos
          const adminPermissions = JSON.stringify([
            'ventas', 'productos', 'inventario', 'facturas', 
            'corte', 'reportes', 'configuracion'
          ]);
          db.run(`UPDATE users SET name = ?, permissions = ? WHERE username = ? AND (name IS NULL OR permissions IS NULL)`, 
            ['Administrador', adminPermissions, 'admin'], () => {});
        }
      });
    });
  }
});

// Exporta el objeto de la base de datos para su uso en otros módulos.
module.exports = db;
