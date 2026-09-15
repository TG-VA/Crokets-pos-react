require('dotenv').config();

const express = require('express');
const cors = require('cors');
const db = require('./bd');
const { hashPassword, verifyPassword } = require('./password');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// LOGIN LOCAL ANTIGUO
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: 'Faltan credenciales',
    });
  }

  db.get(
    'SELECT * FROM users WHERE username = ?',
    [username],
    (err, row) => {
      if (err) {
        console.error('Error al consultar la base de datos:', err);
        return res.status(500).json({
          success: false,
          message: 'Error interno del servidor',
        });
      }

      if (!row) {
        return res.status(401).json({
          success: false,
          message: 'Usuario o contraseña incorrectos',
        });
      }

      const { valid, needsUpgrade } = verifyPassword(password, row.password);

      if (!valid) {
        return res.status(401).json({
          success: false,
          message: 'Usuario o contraseña incorrectos',
        });
      }

      if (needsUpgrade) {
        db.run(
          'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [hashPassword(password), row.id],
          (upgradeErr) => {
            if (upgradeErr) {
              console.error('Error migrando contraseña a hash:', upgradeErr);
            }
          }
        );
      }

      const userData = {
        id: row.id,
        username: row.username,
        name: row.name || row.username,
        permissions: JSON.parse(row.permissions || '[]'),
      };

      return res.json({
        success: true,
        message: 'Login exitoso',
        user: userData,
      });
    }
  );
});

// USUARIOS
app.get('/api/users', (req, res) => {
  db.all('SELECT * FROM users ORDER BY id DESC', [], (err, rows) => {
    if (err) {
      console.error('Error al obtener usuarios:', err);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener usuarios',
      });
    }

    const users = rows.map((user) => ({
      id: user.id,
      name: user.name || user.username || 'Sin nombre',
      username: user.username,
      permissions: JSON.parse(user.permissions || '[]'),
      createdAt: user.created_at || new Date().toISOString(),
    }));

    return res.json(users);
  });
});

app.post('/api/users', (req, res) => {
  const { name, username, password, permissions } = req.body;

  if (!name || !username || !password || !permissions) {
    return res.status(400).json({
      success: false,
      message: 'Todos los campos son requeridos',
    });
  }

  if (name.trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: 'El nombre debe tener al menos 2 caracteres',
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'La contraseña debe tener al menos 6 caracteres',
    });
  }

  if (!Array.isArray(permissions) || permissions.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Debe seleccionar al menos un permiso',
    });
  }

  db.get(
    'SELECT COUNT(*) AS count FROM users WHERE username = ?',
    [username],
    (err, row) => {
      if (err) {
        console.error('Error al verificar usuario:', err);
        return res.status(500).json({
          success: false,
          message: 'Error interno del servidor',
        });
      }

      if (row.count > 0) {
        return res.status(400).json({
          success: false,
          message: 'El nombre de usuario ya existe',
        });
      }

      const permissionsJson = JSON.stringify(permissions);
      const hashedPassword = hashPassword(password);

      db.run(
        'INSERT INTO users (username, name, password, permissions) VALUES (?, ?, ?, ?)',
        [username, name.trim(), hashedPassword, permissionsJson],
        function (insertErr) {
          if (insertErr) {
            db.run(
              'INSERT INTO users (username, password) VALUES (?, ?)',
              [username, hashedPassword],
              function (basicInsertErr) {
                if (basicInsertErr) {
                  console.error('Error al crear usuario:', basicInsertErr);
                  return res.status(500).json({
                    success: false,
                    message: 'Error al crear usuario',
                  });
                }

                db.run(
                  'UPDATE users SET name = ?, permissions = ? WHERE id = ?',
                  [name.trim(), permissionsJson, this.lastID],
                  () => getUserById(this.lastID, res)
                );
              }
            );
          } else {
            getUserById(this.lastID, res);
          }
        }
      );
    }
  );
});

function getUserById(userId, res) {
  db.get('SELECT * FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) {
      console.error('Error al obtener usuario creado:', err);
      return res.status(500).json({
        success: false,
        message: 'Usuario creado pero error al obtener datos',
      });
    }

    const userData = {
      id: user.id,
      name: user.name || user.username || 'Sin nombre',
      username: user.username,
      permissions: JSON.parse(user.permissions || '[]'),
      createdAt: user.created_at || new Date().toISOString(),
    };

    return res.status(201).json(userData);
  });
}

app.put('/api/users/:id', (req, res) => {
  const userId = req.params.id;
  const { name, username, password, permissions } = req.body;

  if (!name || !username || !permissions) {
    return res.status(400).json({
      success: false,
      message: 'Nombre, usuario y permisos son requeridos',
    });
  }

  if (name.trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: 'El nombre debe tener al menos 2 caracteres',
    });
  }

  if (password && password.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'La contraseña debe tener al menos 6 caracteres',
    });
  }

  if (!Array.isArray(permissions) || permissions.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Debe seleccionar al menos un permiso',
    });
  }

  db.get('SELECT * FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) {
      console.error('Error al buscar usuario:', err);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
      });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado',
      });
    }

    db.get(
      'SELECT COUNT(*) AS count FROM users WHERE username = ? AND id != ?',
      [username, userId],
      (checkErr, row) => {
        if (checkErr) {
          console.error('Error al verificar username:', checkErr);
          return res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
          });
        }

        if (row.count > 0) {
          return res.status(400).json({
            success: false,
            message: 'El nombre de usuario ya existe',
          });
        }

        const permissionsJson = JSON.stringify(permissions);
        const hashedPassword = password ? hashPassword(password) : null;

        const updateQuery = password
          ? 'UPDATE users SET username = ?, name = ?, password = ?, permissions = ? WHERE id = ?'
          : 'UPDATE users SET username = ?, name = ?, permissions = ? WHERE id = ?';

        const updateParams = password
          ? [username, name.trim(), hashedPassword, permissionsJson, userId]
          : [username, name.trim(), permissionsJson, userId];

        db.run(updateQuery, updateParams, function (updateErr) {
          if (updateErr) {
            console.error('Error al actualizar usuario:', updateErr);
            return res.status(500).json({
              success: false,
              message: 'Error al actualizar usuario',
            });
          }

          db.get('SELECT * FROM users WHERE id = ?', [userId], (getErr, updatedUser) => {
            if (getErr) {
              console.error('Error al obtener usuario actualizado:', getErr);
              return res.status(500).json({
                success: false,
                message: 'Usuario actualizado pero error al obtener datos',
              });
            }

            const userData = {
              id: updatedUser.id,
              name: updatedUser.name || updatedUser.username || 'Sin nombre',
              username: updatedUser.username,
              permissions: JSON.parse(updatedUser.permissions || '[]'),
              createdAt: updatedUser.created_at || new Date().toISOString(),
              updatedAt: updatedUser.updated_at || new Date().toISOString(),
            };

            return res.json(userData);
          });
        });
      }
    );
  });
});

app.delete('/api/users/:id', (req, res) => {
  const userId = req.params.id;

  db.get('SELECT * FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) {
      console.error('Error al buscar usuario:', err);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
      });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado',
      });
    }

    if (user.username === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'No se puede eliminar el usuario administrador principal',
      });
    }

    db.run('DELETE FROM users WHERE id = ?', [userId], function (deleteErr) {
      if (deleteErr) {
        console.error('Error al eliminar usuario:', deleteErr);
        return res.status(500).json({
          success: false,
          message: 'Error al eliminar usuario',
        });
      }

      return res.json({
        success: true,
        message: 'Usuario eliminado exitosamente',
        deletedId: userId,
      });
    });
  });
});

app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});
