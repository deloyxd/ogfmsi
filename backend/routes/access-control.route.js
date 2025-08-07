const { Router } = require("express");
const mysqlConnection = require('../database/mysql');
const router = Router();

/* 🔥 Access Control Routes 🔥 */

// ===== ROLES =====
// GET all roles
router.get('/roles', async (req, res) => {
  const query = 'SELECT * FROM system_roles_tbl WHERE is_active = TRUE ORDER BY role_name';
  mysqlConnection.query(query, (error, result) => {
    if (error) {
      console.error('Fetching roles error:', error);
      res.status(500).json({ error: 'Fetching roles failed' });
    }
    res.status(200).json({ message: 'Fetching roles successful', result: result });
  });
});

// GET single role with permissions
router.get('/roles/:id', async (req, res) => {
  const { id } = req.params;
  const query = `
    SELECT r.*, GROUP_CONCAT(p.permission_id) as permissions
    FROM system_roles_tbl r
    LEFT JOIN role_permissions_tbl rp ON r.role_id = rp.role_id
    LEFT JOIN system_permissions_tbl p ON rp.permission_id = p.permission_id
    WHERE r.role_id = ? AND r.is_active = TRUE
    GROUP BY r.role_id
  `;
  mysqlConnection.query(query, [id], (error, result) => {
    if (error) {
      console.error('Fetching role error:', error);
      res.status(500).json({ error: 'Fetching role failed' });
    }
    if (!result || result.length === 0) {
      res.status(404).json({ error: 'Role not found' });
    } else {
      const role = result[0];
      role.permissions = role.permissions ? role.permissions.split(',') : [];
      res.status(200).json({ message: 'Fetching role successful', result: role });
    }
  });
});

// POST new role
router.post('/roles', async (req, res) => {
  const { role_name, role_description, permissions } = req.body;
  
  // Generate unique role ID
  const role_id = 'ROLE_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  
  const query = 'INSERT INTO system_roles_tbl (role_id, role_name, role_description) VALUES (?, ?, ?)';
  
  mysqlConnection.query(query, [role_id, role_name, role_description], (error, result) => {
    if (error) {
      console.error('Creating role error:', error);
      res.status(500).json({ error: 'Creating role failed' });
    }
    
    // Add permissions if provided
    if (permissions && permissions.length > 0) {
      const permissionValues = permissions.map(perm => [role_id, perm]);
      const permissionQuery = 'INSERT INTO role_permissions_tbl (role_id, permission_id) VALUES ?';
      mysqlConnection.query(permissionQuery, [permissionValues], (permError) => {
        if (permError) {
          console.error('Adding permissions error:', permError);
        }
      });
    }
    
    res.status(201).json({ 
      message: 'Role created successfully', 
      result: { role_id, role_name, role_description }
    });
  });
});

// PUT update role
router.put('/roles/:id', async (req, res) => {
  const { id } = req.params;
  const { role_name, role_description, permissions } = req.body;
  
  const query = 'UPDATE system_roles_tbl SET role_name = ?, role_description = ? WHERE role_id = ?';
  
  mysqlConnection.query(query, [role_name, role_description, id], (error, result) => {
    if (error) {
      console.error('Updating role error:', error);
      res.status(500).json({ error: 'Updating role failed' });
    }
    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Role not found' });
    } else {
      // Update permissions if provided
      if (permissions) {
        // Remove existing permissions
        const deleteQuery = 'DELETE FROM role_permissions_tbl WHERE role_id = ?';
        mysqlConnection.query(deleteQuery, [id], (deleteError) => {
          if (deleteError) {
            console.error('Removing permissions error:', deleteError);
          } else {
            // Add new permissions
            if (permissions.length > 0) {
              const permissionValues = permissions.map(perm => [id, perm]);
              const permissionQuery = 'INSERT INTO role_permissions_tbl (role_id, permission_id) VALUES ?';
              mysqlConnection.query(permissionQuery, [permissionValues], (permError) => {
                if (permError) {
                  console.error('Adding permissions error:', permError);
                }
              });
            }
          }
        });
      }
      
      res.status(200).json({ message: 'Role updated successfully' });
    }
  });
});

// DELETE role
router.delete('/roles/:id', async (req, res) => {
  const { id } = req.params;
  const query = 'UPDATE system_roles_tbl SET is_active = FALSE WHERE role_id = ?';
  
  mysqlConnection.query(query, [id], (error, result) => {
    if (error) {
      console.error('Deleting role error:', error);
      res.status(500).json({ error: 'Deleting role failed' });
    }
    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Role not found' });
    } else {
      res.status(200).json({ message: 'Role deleted successfully' });
    }
  });
});

// ===== PERMISSIONS =====
// GET all permissions
router.get('/permissions', async (req, res) => {
  const query = 'SELECT * FROM system_permissions_tbl WHERE is_active = TRUE ORDER BY module, permission_name';
  mysqlConnection.query(query, (error, result) => {
    if (error) {
      console.error('Fetching permissions error:', error);
      res.status(500).json({ error: 'Fetching permissions failed' });
    }
    res.status(200).json({ message: 'Fetching permissions successful', result: result });
  });
});

// POST new permission
router.post('/permissions', async (req, res) => {
  const { permission_name, permission_description, module } = req.body;
  
  // Generate unique permission ID
  const permission_id = 'PERM_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  
  const query = 'INSERT INTO system_permissions_tbl (permission_id, permission_name, permission_description, module) VALUES (?, ?, ?, ?)';
  
  mysqlConnection.query(query, [permission_id, permission_name, permission_description, module], (error, result) => {
    if (error) {
      console.error('Creating permission error:', error);
      res.status(500).json({ error: 'Creating permission failed' });
    }
    res.status(201).json({ 
      message: 'Permission created successfully', 
      result: { permission_id, permission_name, module }
    });
  });
});

// ===== USERS =====
// GET all users
router.get('/users', async (req, res) => {
  const query = `
    SELECT u.*, r.role_name 
    FROM system_users_tbl u 
    JOIN system_roles_tbl r ON u.role_id = r.role_id 
    WHERE u.is_active = TRUE 
    ORDER BY u.created_at DESC
  `;
  mysqlConnection.query(query, (error, result) => {
    if (error) {
      console.error('Fetching users error:', error);
      res.status(500).json({ error: 'Fetching users failed' });
    }
    res.status(200).json({ message: 'Fetching users successful', result: result });
  });
});

// GET single user
router.get('/users/:id', async (req, res) => {
  const { id } = req.params;
  const query = `
    SELECT u.*, r.role_name 
    FROM system_users_tbl u 
    JOIN system_roles_tbl r ON u.role_id = r.role_id 
    WHERE u.user_id = ? AND u.is_active = TRUE
  `;
  mysqlConnection.query(query, [id], (error, result) => {
    if (error) {
      console.error('Fetching user error:', error);
      res.status(500).json({ error: 'Fetching user failed' });
    }
    if (!result || result.length === 0) {
      res.status(404).json({ error: 'User not found' });
    } else {
      res.status(200).json({ message: 'Fetching user successful', result: result[0] });
    }
  });
});

// POST new user
router.post('/users', async (req, res) => {
  const { username, full_name, email, password_hash, role_id } = req.body;
  
  // Generate unique user ID
  const user_id = 'USER_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  
  const query = 'INSERT INTO system_users_tbl (user_id, username, full_name, email, password_hash, role_id) VALUES (?, ?, ?, ?, ?, ?)';
  
  mysqlConnection.query(query, [user_id, username, full_name, email, password_hash, role_id], (error, result) => {
    if (error) {
      console.error('Creating user error:', error);
      res.status(500).json({ error: 'Creating user failed' });
    }
    res.status(201).json({ 
      message: 'User created successfully', 
      result: { user_id, username, full_name, role_id }
    });
  });
});

// PUT update user
router.put('/users/:id', async (req, res) => {
  const { id } = req.params;
  const { full_name, email, role_id } = req.body;
  
  const query = 'UPDATE system_users_tbl SET full_name = ?, email = ?, role_id = ? WHERE user_id = ?';
  
  mysqlConnection.query(query, [full_name, email, role_id, id], (error, result) => {
    if (error) {
      console.error('Updating user error:', error);
      res.status(500).json({ error: 'Updating user failed' });
    }
    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'User not found' });
    } else {
      res.status(200).json({ message: 'User updated successfully' });
    }
  });
});

// DELETE user
router.delete('/users/:id', async (req, res) => {
  const { id } = req.params;
  const query = 'UPDATE system_users_tbl SET is_active = FALSE WHERE user_id = ?';
  
  mysqlConnection.query(query, [id], (error, result) => {
    if (error) {
      console.error('Deleting user error:', error);
      res.status(500).json({ error: 'Deleting user failed' });
    }
    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'User not found' });
    } else {
      res.status(200).json({ message: 'User deleted successfully' });
    }
  });
});

// ===== SYSTEM LOGS =====
// GET all logs
router.get('/logs', async (req, res) => {
  const query = `
    SELECT l.*, u.full_name as user_name 
    FROM system_logs_tbl l 
    LEFT JOIN system_users_tbl u ON l.user_id = u.user_id 
    ORDER BY l.created_at DESC 
    LIMIT 100
  `;
  mysqlConnection.query(query, (error, result) => {
    if (error) {
      console.error('Fetching logs error:', error);
      res.status(500).json({ error: 'Fetching logs failed' });
    }
    res.status(200).json({ message: 'Fetching logs successful', result: result });
  });
});

// POST new log entry
router.post('/logs', async (req, res) => {
  const { user_id, module, action, description, ip_address, user_agent } = req.body;
  
  // Generate unique log ID
  const log_id = 'LOG_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  
  const query = 'INSERT INTO system_logs_tbl (log_id, user_id, module, action, description, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)';
  
  mysqlConnection.query(query, [log_id, user_id, module, action, description, ip_address, user_agent], (error, result) => {
    if (error) {
      console.error('Creating log error:', error);
      res.status(500).json({ error: 'Creating log failed' });
    }
    res.status(201).json({ 
      message: 'Log created successfully', 
      result: { log_id, module, action }
    });
  });
});

module.exports = router;
