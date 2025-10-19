const express = require('express');
const router = express.Router();
const db = require('../database/mysql');
const crypto = require('crypto');

function generateAdminId() {
  const rand = crypto.randomBytes(4).toString('hex');
  return `A_${Date.now()}_${rand}`;
}

function hashPassword(plain) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(plain, salt, 64).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

router.post('/users', async (req, res) => {
  try {
    const {
      admin_full_name,
      admin_username,
      admin_role,
      admin_password,
      admin_email,
    } = req.body || {};

    // Basic validation
    if (
      !admin_full_name ||
      !admin_username ||
      !admin_role ||
      !admin_password
    ) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const role = String(admin_role).toLowerCase();
    if (!['admin', 'staff'].includes(role)) {
      return res.status(400).json({ error: 'Invalid admin_role' });
    }

    // Prevent trivial usernames
    if (String(admin_username).trim().length < 3) {
      return res.status(400).json({ error: 'Username too short' });
    }

    // Check duplicate username
    const [dupes] = await db.query(
      'SELECT id FROM admin_users_tbl WHERE admin_username = ? LIMIT 1',
      [admin_username]
    );
    if (dupes && dupes.length > 0) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    const admin_id = generateAdminId();
    const admin_password_hash = hashPassword(String(admin_password));

    const insertSql = `
      INSERT INTO admin_users_tbl
        (admin_id, admin_full_name, admin_username, admin_email, admin_role, admin_status, admin_password_hash)
      VALUES
        (?, ?, ?, ?, ?, 'active', ?)
    `;
    const params = [
      admin_id,
      String(admin_full_name).trim(),
      String(admin_username).trim(),
      admin_email ? String(admin_email).trim() : null,
      role,
      admin_password_hash,
    ];

    await db.query(insertSql, params);

    return res.status(201).json({
      message: 'Admin user created successfully',
      result: {
        admin_id,
        admin_full_name: String(admin_full_name).trim(),
        admin_username: String(admin_username).trim(),
        admin_email: admin_email ? String(admin_email).trim() : null,
        admin_role: role,
        admin_status: 'active',
      },
    });
  } catch (err) {
    console.error('POST /admin/users error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;