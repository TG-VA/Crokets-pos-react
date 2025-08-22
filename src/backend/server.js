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
        // Credenciales válidas - incluir datos del usuario
        const userData = {
          id: row.id,
          username: row.username,
          name: row.name || row.username,
          permissions: JSON.parse(row.permissions || '[]')
        };
        res.json({ 
          success: true, 
          message: 'Login exitoso',
          user: userData
        });
      } else {
        // Credenciales inválidas.
        res.status(401).json({ success: false, message: 'Usuario o contraseña incorrectos' });
      }
    }
  );
});

// --- Rutas CRUD para Usuarios ---

// GET /api/users - Obtener todos los usuarios
app.get('/api/users', (req, res) => {
  db.all(
    'SELECT * FROM users ORDER BY id DESC',
    [],
    (err, rows) => {
      if (err) {
        console.error('Error al obtener usuarios:', err);
        return res.status(500).json({ success: false, message: 'Error al obtener usuarios' });
      }

      // Parsear permisos de JSON string a array
      const users = rows.map(user => ({
        id: user.id,
        name: user.name || user.username || 'Sin nombre',
        username: user.username,
        permissions: JSON.parse(user.permissions || '[]'),
        createdAt: user.created_at || new Date().toISOString()
      }));

      res.json(users);
    }
  );
});

// POST /api/users - Crear nuevo usuario
app.post('/api/users', (req, res) => {
  const { name, username, password, permissions } = req.body;

  // Validaciones
  if (!name || !username || !password || !permissions) {
    return res.status(400).json({ 
      success: false, 
      message: 'Todos los campos son requeridos' 
    });
  }

  if (name.trim().length < 2) {
    return res.status(400).json({ 
      success: false, 
      message: 'El nombre debe tener al menos 2 caracteres' 
    });
  }

  if (password.length < 6) {
    return res.status(400).json({ 
      success: false, 
      message: 'La contraseña debe tener al menos 6 caracteres' 
    });
  }

  if (!Array.isArray(permissions) || permissions.length === 0) {
    return res.status(400).json({ 
      success: false, 
      message: 'Debe seleccionar al menos un permiso' 
    });
  }

  // Verificar si el username ya existe
  db.get(
    'SELECT COUNT(*) AS count FROM users WHERE username = ?',
    [username],
    (err, row) => {
      if (err) {
        console.error('Error al verificar usuario:', err);
        return res.status(500).json({ success: false, message: 'Error interno del servidor' });
      }

      if (row.count > 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'El nombre de usuario ya existe' 
        });
      }

      // Crear usuario - verificar primero qué columnas existen
      const permissionsJson = JSON.stringify(permissions);
      
      // Intentar primero con todas las columnas
      db.run(
        'INSERT INTO users (username, name, password, permissions) VALUES (?, ?, ?, ?)',
        [username, name.trim(), password, permissionsJson],
        function(err) {
          if (err) {
            // Si falla, intentar solo con las columnas básicas
            db.run(
              'INSERT INTO users (username, password) VALUES (?, ?)',
              [username, password],
              function(err2) {
                if (err2) {
                  console.error('Error al crear usuario:', err2);
                  return res.status(500).json({ success: false, message: 'Error al crear usuario' });
                }
                
                // Intentar actualizar con los nuevos campos
                db.run(
                  'UPDATE users SET name = ?, permissions = ? WHERE id = ?',
                  [name.trim(), permissionsJson, this.lastID],
                  () => {
                    // Obtener el usuario creado
                    getUserById(this.lastID, res);
                  }
                );
              }
            );
          } else {
            // Obtener el usuario recién creado
            getUserById(this.lastID, res);
          }
        }
      );
    }
  );
});

// Función helper para obtener usuario por ID
function getUserById(userId, res) {
  db.get(
    'SELECT * FROM users WHERE id = ?',
    [userId],
    (err, user) => {
      if (err) {
        console.error('Error al obtener usuario creado:', err);
        return res.status(500).json({ success: false, message: 'Usuario creado pero error al obtener datos' });
      }

      const userData = {
        id: user.id,
        name: user.name || user.username || 'Sin nombre',
        username: user.username,
        permissions: JSON.parse(user.permissions || '[]'),
        createdAt: user.created_at || new Date().toISOString()
      };

      res.status(201).json(userData);
    }
  );
}

// PUT /api/users/:id - Actualizar usuario
app.put('/api/users/:id', (req, res) => {
  const userId = req.params.id;
  const { name, username, password, permissions } = req.body;

  // Validaciones
  if (!name || !username || !permissions) {
    return res.status(400).json({ 
      success: false, 
      message: 'Nombre, usuario y permisos son requeridos' 
    });
  }

  if (name.trim().length < 2) {
    return res.status(400).json({ 
      success: false, 
      message: 'El nombre debe tener al menos 2 caracteres' 
    });
  }

  if (password && password.length < 6) {
    return res.status(400).json({ 
      success: false, 
      message: 'La contraseña debe tener al menos 6 caracteres' 
    });
  }

  if (!Array.isArray(permissions) || permissions.length === 0) {
    return res.status(400).json({ 
      success: false, 
      message: 'Debe seleccionar al menos un permiso' 
    });
  }

  // Verificar si el usuario existe
  db.get(
    'SELECT * FROM users WHERE id = ?',
    [userId],
    (err, user) => {
      if (err) {
        console.error('Error al buscar usuario:', err);
        return res.status(500).json({ success: false, message: 'Error interno del servidor' });
      }

      if (!user) {
        return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
      }

      // Verificar si el nuevo username ya existe (excepto el usuario actual)
      db.get(
        'SELECT COUNT(*) AS count FROM users WHERE username = ? AND id != ?',
        [username, userId],
        (err, row) => {
          if (err) {
            console.error('Error al verificar username:', err);
            return res.status(500).json({ success: false, message: 'Error interno del servidor' });
          }

          if (row.count > 0) {
            return res.status(400).json({ 
              success: false, 
              message: 'El nombre de usuario ya existe' 
            });
          }

          // Preparar la actualización
          const permissionsJson = JSON.stringify(permissions);
          let updateQuery, updateParams;

          if (password) {
            // Actualizar con nueva contraseña
            updateQuery = 'UPDATE users SET username = ?, name = ?, password = ?, permissions = ? WHERE id = ?';
            updateParams = [username, name.trim(), password, permissionsJson, userId];
          } else {
            // Actualizar sin cambiar contraseña
            updateQuery = 'UPDATE users SET username = ?, name = ?, permissions = ? WHERE id = ?';
            updateParams = [username, name.trim(), permissionsJson, userId];
          }

          db.run(updateQuery, updateParams, function(err) {
            if (err) {
              console.error('Error al actualizar usuario:', err);
              return res.status(500).json({ success: false, message: 'Error al actualizar usuario' });
            }

            // Obtener el usuario actualizado
            db.get(
              'SELECT * FROM users WHERE id = ?',
              [userId],
              (err, updatedUser) => {
                if (err) {
                  console.error('Error al obtener usuario actualizado:', err);
                  return res.status(500).json({ success: false, message: 'Usuario actualizado pero error al obtener datos' });
                }

                const userData = {
                  id: updatedUser.id,
                  name: updatedUser.name || updatedUser.username || 'Sin nombre',
                  username: updatedUser.username,
                  permissions: JSON.parse(updatedUser.permissions || '[]'),
                  createdAt: updatedUser.created_at || new Date().toISOString(),
                  updatedAt: updatedUser.updated_at || new Date().toISOString()
                };

                res.json(userData);
              }
            );
          });
        }
      );
    }
  );
});

// DELETE /api/users/:id - Eliminar usuario
app.delete('/api/users/:id', (req, res) => {
  const userId = req.params.id;

  // Verificar si el usuario existe
  db.get(
    'SELECT * FROM users WHERE id = ?',
    [userId],
    (err, user) => {
      if (err) {
        console.error('Error al buscar usuario:', err);
        return res.status(500).json({ success: false, message: 'Error interno del servidor' });
      }

      if (!user) {
        return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
      }

      // No permitir eliminar el usuario admin principal
      if (user.username === 'admin') {
        return res.status(400).json({ 
          success: false, 
          message: 'No se puede eliminar el usuario administrador principal' 
        });
      }

      // Eliminar usuario
      db.run(
        'DELETE FROM users WHERE id = ?',
        [userId],
        function(err) {
          if (err) {
            console.error('Error al eliminar usuario:', err);
            return res.status(500).json({ success: false, message: 'Error al eliminar usuario' });
          }

          res.json({ 
            success: true, 
            message: 'Usuario eliminado exitosamente',
            deletedId: userId
          });
        }
      );
    }
  );
});

// Inicia el servidor y lo pone a escuchar en el puerto definido.
app.listen(port, () => {
  console.log(`🟢 Servidor corriendo en http://localhost:${port}`);
});
