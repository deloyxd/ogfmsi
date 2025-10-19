const express = require('express');
const router = express.Router();
const db = require('../database/mysql');
const { parsePageParams } = require('../utils/pagination');
const crypto = require('crypto');

function hashPassword(plain) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(plain, salt, 64).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

/**
 * Verify password against scrypt-hash formatted as: "scrypt:<salt>:<hex-hash>"
 * Returns true on match, false otherwise.
 */
function verifyScryptPassword(plain, stored) {
  try {
    if (typeof stored !== 'string') return false;
    const parts = stored.split(':');
    if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
    const salt = parts[1];
    const hashHex = parts[2];
    const derived = crypto.scryptSync(String(plain), salt, 64).toString('hex');

    const a = Buffer.from(hashHex, 'hex');
    const b = Buffer.from(derived, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch (_) {
    return false;
  }
}

/**
 * POST /login
 * Admin Login endpoint
 * Body: { "email": string, "password": string }
 * Behavior:
 *  - Validates input types and presence
 *  - Looks up user in admin_users_tbl by admin_username (treated as email/username)
 *  - Requires admin_status = 'active'
 *  - Verifies password:
 *      - Supports scrypt format: "scrypt:<salt>:<hashHex>"
 *      - If value looks like bcrypt ("$2...") but bcrypt is not installed, returns 500 (config issue)
 *      - Otherwise falls back to plain string comparison
 * Responses:
 *  - 200 { success: true, user: { id, email, name, role } }
 *  - 400 { error: "..." } for validation errors
 *  - 401 { success: false, message: "Invalid email or password" } on auth failure
 *  - 500 { error: "Internal server error" } on unexpected errors
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (typeof email !== 'string' || typeof password !== 'string' || email.trim() === '' || password === '') {
      return res.status(400).json({ error: 'Invalid request body: email and password are required' });
    }

    // Treat admin_username as the login identifier (email/username)
    const rows = await db.query(
      'SELECT admin_id, admin_full_name, admin_username, admin_role, admin_status, admin_password_hash FROM admin_users_tbl WHERE admin_username = ? LIMIT 1',
      [email]
    );

    if (!rows || rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const record = rows[0];

    // Enforce active status
    if (record.admin_status !== 'active') {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const stored = record.admin_password_hash || '';

    // If bcrypt-like hash is stored but bcrypt isn't installed, treat as server configuration issue.
    if (typeof stored === 'string' && stored.startsWith('$2')) {
      console.error('Login error: bcrypt hash detected but bcrypt is not installed');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Verify password
    let ok = false;
    if (typeof stored === 'string' && stored.startsWith('scrypt:')) {
      ok = verifyScryptPassword(password, stored);
    } else {
      // Fallback: plaintext comparison
      ok = String(password) === String(stored);
    }

    if (!ok) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: record.admin_id,
        email: record.admin_username,
        name: record.admin_full_name,
        role: record.admin_role,
      },
    });
  } catch (err) {
    console.error('POST /admin/login error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
 
router.get('/users', async (req, res) => {
  const { useLimit, limit, offset } = parsePageParams(req);
  let sql = `SELECT * FROM admin_users_tbl ORDER BY created_at DESC`;
  const params = [];
  if (useLimit) {
    sql += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);
  }
  try {
    const rows = await db.query(sql, params);
    res.status(200).json({ message: 'Fetching system users successful', result: rows });
  } catch (error) {
    console.error('Fetching system users error:', error);
    return res.status(500).json({ error: 'Fetching system users failed' });
  }
});

router.post('/users', async (req, res) => {
  try {
    const {
      admin_id,
      admin_image_url,
      admin_full_name,
      admin_username,
      admin_role,
      admin_password,
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

    const admin_password_hash = hashPassword(String(admin_password));

    const insertSql = `
      INSERT INTO admin_users_tbl
        (admin_id, admin_image_url, admin_full_name, admin_username, admin_role, admin_status, admin_password_hash)
      VALUES
        (?, ?, ?, ?, ?, 'active', ?)
    `;
    const params = [
      admin_id,
      admin_image_url,
      String(admin_full_name).trim(),
      String(admin_username).trim(),
      role,
      admin_password_hash,
    ];

    await db.query(insertSql, params);

    return res.status(201).json({
      message: 'Admin user created successfully',
      result: {
        admin_id,
        admin_image_url,
        admin_full_name: String(admin_full_name).trim(),
        admin_username: String(admin_username).trim(),
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