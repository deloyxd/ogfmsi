const { Router } = require('express');
const db = require('../database/mysql');
const { parsePageParams } = require('../utils/pagination');
const router = Router();

// GET all customers
router.get('/customers', async (req, res) => {
  const { useLimit, limit, offset } = parsePageParams(req);
  let sql = 'SELECT * FROM customer_tbl ORDER BY created_at DESC';
  const params = [];
  if (useLimit) {
    sql += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);
  }
  try {
    const rows = await db.query(sql, params);
    res.status(200).json({ message: 'Fetching customers successful', result: rows });
  } catch (error) {
    console.error('Fetching customers error:', error);
    return res.status(500).json({ error: 'Fetching customers failed' });
  }
});

// GET specific customer
router.get('/customers', async (req, res) => {
  const { useLimit, limit, offset } = parsePageParams(req);
  const { customer_contact } = req.body;
  let sql = 'SELECT * FROM customer_tbl WHERE customer_contact = ?';
  const params = [customer_contact];
  if (useLimit) {
    sql += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);
  }
  try {
    const rows = await db.query(sql, params);
    res.status(200).json({ message: 'Fetching customers successful', result: rows });
  } catch (error) {
    console.error('Fetching customers error:', error);
    return res.status(500).json({ error: 'Fetching customers failed' });
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
