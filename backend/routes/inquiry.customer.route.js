const { Router } = require('express');
const db = require('../database/mysql');
const { parsePageParams } = require('../utils/pagination');
const router = Router();

// GET all customers or lookup by email
router.get('/customers', async (req, res) => {
  const { email } = req.query;

  try {
    // ✅ if an email query param exists, fetch that specific customer
    if (email) {
      const [rows] = await db.query('SELECT * FROM customer_tbl WHERE customer_contact = ? LIMIT 1', [email]);

      if (!rows) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      return res.status(200).json({
        message: 'Fetching customer successful',
        result: rows,
      });
    }

    // 🔁 otherwise, return all customers (existing behavior)
    const { useLimit, limit, offset } = parsePageParams(req);
    let sql = 'SELECT * FROM customer_tbl ORDER BY created_at DESC';
    const params = [];
    if (useLimit) {
      sql += ' LIMIT ? OFFSET ?';
      params.push(limit, offset);
    }
    const rows = await db.query(sql, params);
    return res.status(200).json({ message: 'Fetching regular check-ins successful', result: rows });
  } catch (err) {
    console.error('Fetching customers failed:', err);
    res.status(500).json({ error: 'Fetching customers failed' });
  }
});

// GET single customer
router.get('/customers/:id', async (req, res) => {
  const { id } = req.params;
  const query = 'SELECT * FROM customer_tbl WHERE customer_id = ?';
  try {
    const rows = await db.query(query, [id]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    } else {
      res.status(200).json({ message: 'Fetching customer successful', result: rows[0] });
    }
  } catch (error) {
    console.error('Fetching customer error:', error);
    return res.status(500).json({ error: 'Fetching customer failed' });
  }
});

// LOGIN ROUTE
router.post('/login', async (req, res) => {
  const { customer_contact } = req.body;

  if (!customer_contact) {
    return res.status(400).json({ error: 'customer_contact is required' });
  }

  try {
    const [rows] = await db.query('SELECT * FROM customer_tbl WHERE customer_contact = ?', [customer_contact]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found. Please sign up.' });
    }

    res.status(200).json({
      message: 'Login successful',
      result: rows[0],
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// SIGNUP ROUTE
router.post('/signup', async (req, res) => {
  const {
    id,
    customer_contact,
    customer_first_name,
    customer_last_name,
    customer_image_url,
    customer_type,
    customer_tid,
    customer_pending,
    customer_rate,
  } = req.body;

  if (!customer_contact) {
    return res.status(400).json({ error: 'customer_contact is required' });
  }

  try {
    // Check if the customer already exists
    const [existing] = await db.query('SELECT * FROM customer_tbl WHERE customer_contact = ? LIMIT 1', [
      customer_contact,
    ]);

    if (existing.length > 0) {
      return res.status(409).json({ error: 'Customer already exists. Please log in.' });
    }

    // Create new customer
    const customer_id = id || 'U' + Date.now();
    const image_url = customer_image_url || '';
    const first_name = customer_first_name || '';
    const last_name = customer_last_name || '';
    const type = customer_type || 'daily';
    const tid = customer_tid || '';
    const pending = customer_pending || 0;
    const rate = customer_rate || 'regular';

    const insertQuery = `
      INSERT INTO customer_tbl
      (customer_id, customer_image_url, customer_first_name, customer_last_name, customer_contact, customer_type, customer_tid, customer_pending, customer_rate)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await db.query(insertQuery, [
      customer_id,
      image_url,
      first_name,
      last_name,
      customer_contact,
      type,
      tid,
      pending,
      rate,
    ]);

    res.status(201).json({
      message: 'Customer created successfully',
      result: {
        customer_id,
        customer_image_url: image_url,
        customer_first_name: first_name,
        customer_last_name: last_name,
        customer_contact,
        customer_type: type,
        customer_tid: tid,
        customer_pending: pending,
        customer_rate: rate,
      },
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Signup failed' });
  }
});

// POST new customer
router.post('/customers', async (req, res) => {
  const {
    customer_id,
    customer_image_url,
    customer_first_name,
    customer_last_name,
    customer_contact,
    customer_type,
    customer_tid,
    customer_pending,
    customer_rate,
  } = req.body;

  const query = `
    INSERT INTO customer_tbl 
    (customer_id, customer_image_url, customer_first_name, customer_last_name, customer_contact, customer_type, customer_tid, customer_pending, customer_rate) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  try {
    await db.query(query, [
      customer_id,
      customer_image_url,
      customer_first_name,
      customer_last_name,
      customer_contact,
      customer_type,
      customer_tid,
      customer_pending,
      customer_rate,
    ]);

    res.status(201).json({
      message: 'Customer created successfully',
      result: {
        customer_id,
        customer_image_url,
        customer_first_name,
        customer_last_name,
        customer_contact,
        customer_type,
        customer_tid,
        customer_pending,
        customer_rate,
      },
    });
  } catch (error) {
    console.error('Creating customer error:', error);
    return res.status(500).json({ error: 'Creating customer failed' });
  }
});

// PUT update customer pending
router.put('/customers/pending/:id', async (req, res) => {
  const { id } = req.params;
  const { customer_type, customer_tid, customer_pending } = req.body;

  const query = `
    UPDATE customer_tbl 
    SET customer_type = ?, customer_tid = ?, customer_pending = ?
    WHERE customer_id = ?
  `;

  try {
    const result = await db.query(query, [customer_type, customer_tid, customer_pending, id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    } else {
      res.status(200).json({ message: 'Customer updated successfully' });
    }
  } catch (error) {
    console.error('Updating customer error:', error);
    return res.status(500).json({ error: 'Updating customer failed' });
  }
});

// PUT update customer
router.put('/customers/:id', async (req, res) => {
  const { id } = req.params;
  const {
    customer_image_url,
    customer_first_name,
    customer_last_name,
    customer_contact,
    customer_type,
    customer_tid,
    customer_pending,
    customer_rate,
  } = req.body;

  const query = `
    UPDATE customer_tbl 
    SET customer_image_url = ?, customer_first_name = ?, customer_last_name = ?, customer_contact = ?, customer_type = ?, customer_tid = ?, customer_pending = ?, customer_rate = ?
    WHERE customer_id = ?
  `;

  try {
    const result = await db.query(query, [
      customer_image_url,
      customer_first_name,
      customer_last_name,
      customer_contact,
      customer_type,
      customer_tid,
      customer_pending,
      customer_rate,
      id,
    ]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    } else {
      res.status(200).json({ message: 'Customer updated successfully' });
    }
  } catch (error) {
    console.error('Updating customer error:', error);
    return res.status(500).json({ error: 'Updating customer failed' });
  }
});

// DELETE customer
router.delete('/customers/:id', async (req, res) => {
  const { id } = req.params;
  const query = 'DELETE FROM customer_tbl WHERE customer_id = ?';

  try {
    const result = await db.query(query, [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    } else {
      res.status(200).json({ message: 'Customer deleted successfully' });
    }
  } catch (error) {
    console.error('Deleting customer error:', error);
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(409).json({
        error: 'Cannot delete customer because they are referenced by other records.',
      });
    }
    return res.status(500).json({ error: 'Deleting customer failed' });
  }
});

module.exports = router;
