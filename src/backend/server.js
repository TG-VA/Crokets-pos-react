require('dotenv').config();

const express = require('express');
const cors = require('cors');
const db = require('./bd');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const port = 3000;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const getActiveCashSessionWithUser = async (branchId) => {
  const { data: session, error } = await supabase
    .from('cash_register_sessions')
    .select('*')
    .eq('branch_id', branchId)
    .eq('status', 'open')
    .order('opened_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!session) return null;

  let userProfile = null;

  if (session.user_id) {
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, username')
      .eq('id', session.user_id)
      .maybeSingle();

    if (userError) {
      console.error('Error obteniendo usuario dueño de caja:', userError);
    }

    userProfile = userData || null;
  }

  return {
    ...session,
    user: userProfile,
    users: userProfile,
    username: userProfile?.username || null,
  };
};

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
    'SELECT * FROM users WHERE username = ? AND password = ?',
    [username, password],
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

      db.run(
        'INSERT INTO users (username, name, password, permissions) VALUES (?, ?, ?, ?)',
        [username, name.trim(), password, permissionsJson],
        function (insertErr) {
          if (insertErr) {
            db.run(
              'INSERT INTO users (username, password) VALUES (?, ?)',
              [username, password],
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

        const updateQuery = password
          ? 'UPDATE users SET username = ?, name = ?, password = ?, permissions = ? WHERE id = ?'
          : 'UPDATE users SET username = ?, name = ?, permissions = ? WHERE id = ?';

        const updateParams = password
          ? [username, name.trim(), password, permissionsJson, userId]
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

// DISPOSITIVO / SUCURSAL
app.post('/device/branch', async (req, res) => {
  try {
    const { deviceCode } = req.body;

    if (!deviceCode) {
      return res.status(400).json({
        success: false,
        message: 'deviceCode requerido',
      });
    }

    const { data, error } = await supabase
      .from('pos_devices')
      .select('branch_id, branches:branch_id ( id, name, code )')
      .eq('device_code', deviceCode)
      .eq('is_active', true)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return res.json({
        success: false,
        message: 'Este POS no está asignado a ninguna sucursal',
      });
    }

    return res.json({
      success: true,
      branch: {
        id: data.branch_id,
        name: data.branches?.name,
        code: data.branches?.code,
      },
    });
  } catch (e) {
    console.error('Error en /device/branch:', e);
    return res.status(500).json({
      success: false,
      message: 'Error resolviendo sucursal del POS',
    });
  }
});

// CAJA
app.post('/cash/check', async (req, res) => {
  try {
    const { branchId } = req.body;

    if (!branchId) {
      return res.status(400).json({
        success: false,
        message: 'branchId requerido',
      });
    }

    const session = await getActiveCashSessionWithUser(branchId);

    return res.json({
      success: true,
      session: session || null,
    });
  } catch (e) {
    console.error('Error /cash/check:', e);
    return res.status(500).json({
      success: false,
      message: 'Error verificando caja',
    });
  }
});

app.post('/cash/open', async (req, res) => {
  try {
    const { branchId, userId, openingAmount } = req.body;

    if (!branchId) {
      return res.status(400).json({
        success: false,
        message: 'branchId requerido',
      });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId requerido',
      });
    }

    const amount = Number(openingAmount ?? 0);

    if (Number.isNaN(amount) || amount < 0) {
      return res.status(400).json({
        success: false,
        message: 'openingAmount inválido',
      });
    }

    const openSession = await getActiveCashSessionWithUser(branchId);

    if (openSession) {
      const isSameUser = openSession.user_id === userId;
      const owner = openSession.username
        ? String(openSession.username).toUpperCase()
        : 'OTRO USUARIO';

      return res.json({
        success: false,
        session: openSession,
        code: isSameUser
          ? 'CASH_ALREADY_OPEN_BY_SAME_USER'
          : 'CASH_ALREADY_OPEN_BY_OTHER_USER',
        message: isSameUser
          ? 'Ya tienes una caja abierta en esta sucursal.'
          : `Ya existe una caja abierta en esta sucursal por ${owner}. Debe cerrarse antes de abrir otra caja.`,
      });
    }

    const { data, error } = await supabase
      .from('cash_register_sessions')
      .insert([
        {
          branch_id: branchId,
          user_id: userId,
          opening_amount: amount,
          opened_at: new Date().toISOString(),
          status: 'open',
        },
      ])
      .select('*')
      .single();

    if (error) throw error;

    return res.json({
      success: true,
      session: data,
    });
  } catch (e) {
    console.error('Error /cash/open:', e);
    return res.status(500).json({
      success: false,
      message: 'Error abriendo caja',
    });
  }
});

app.post('/cash/close', async (req, res) => {
  try {
    const { branchId, closingAmount } = req.body;

    if (!branchId) {
      return res.status(400).json({
        success: false,
        message: 'branchId requerido',
      });
    }

    const closeAmt = Number(closingAmount ?? 0);

    if (Number.isNaN(closeAmt) || closeAmt < 0) {
      return res.status(400).json({
        success: false,
        message: 'closingAmount inválido',
      });
    }

    const { data: session, error: findErr } = await supabase
      .from('cash_register_sessions')
      .select('*')
      .eq('branch_id', branchId)
      .eq('status', 'open')
      .order('opened_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (findErr) throw findErr;

    if (!session) {
      return res.json({
        success: false,
        message: 'No hay caja abierta en esta sucursal',
      });
    }

    const diff = closeAmt - Number(session.opening_amount ?? 0);

    const { data, error } = await supabase
      .from('cash_register_sessions')
      .update({
        closing_amount: closeAmt,
        closed_at: new Date().toISOString(),
        status: 'closed',
        difference: diff,
      })
      .eq('id', session.id)
      .select('*')
      .single();

    if (error) throw error;

    return res.json({
      success: true,
      session: data,
    });
  } catch (e) {
    console.error('Error /cash/close:', e);
    return res.status(500).json({
      success: false,
      message: 'Error cerrando caja',
    });
  }
});

app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});