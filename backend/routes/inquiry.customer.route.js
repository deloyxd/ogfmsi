const { Router } = require('express');
const mysqlConnection = require('../database/mysql');
const router = Router();

// GET all customers
router.get('/customers', async (req, res) => {
  const query = 'SELECT * FROM customer_tbl ORDER BY created_at DESC';
  mysqlConnection.query(query, (error, result) => {
    if (error) {
      console.error('Fetching customers error:', error);
      return res.status(500).json({ error: 'Fetching customers failed' });
    }
    res.status(200).json({ message: 'Fetching customers successful', result: result });
  });
});

// GET single customer
router.get('/customers/:id', async (req, res) => {
  const { id } = req.params;
  const query = 'SELECT * FROM customer_tbl WHERE customer_id = ?';
  mysqlConnection.query(query, [id], (error, result) => {
    if (error) {
      console.error('Fetching customer error:', error);
      return res.status(500).json({ error: 'Fetching customer failed' });
    }
    if (!result || result.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    } else {
      res.status(200).json({ message: 'Fetching customer successful', result: result[0] });
    }
  });
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

  mysqlConnection.query(
    query,
    [
      customer_id,
      customer_image_url,
      customer_first_name,
      customer_last_name,
      customer_contact,
      customer_type,
      customer_tid,
      customer_pending,
      customer_rate,
    ],
    (error, result) => {
      if (error) {
        console.error('Creating customer error:', error);
        return res.status(500).json({ error: 'Creating customer failed' });
      }
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
    }
  );
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

  mysqlConnection.query(query, [customer_type, customer_tid, customer_pending, id], (error, result) => {
    if (error) {
      console.error('Updating customer error:', error);
      return res.status(500).json({ error: 'Updating customer failed' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    } else {
      res.status(200).json({ message: 'Customer updated successfully' });
    }
  });
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

  mysqlConnection.query(
    query,
    [
      customer_image_url,
      customer_first_name,
      customer_last_name,
      customer_contact,
      customer_type,
      customer_tid,
      customer_pending,
      customer_rate,
      id,
    ],
    (error, result) => {
      if (error) {
        console.error('Updating customer error:', error);
        return res.status(500).json({ error: 'Updating customer failed' });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Customer not found' });
      } else {
        res.status(200).json({ message: 'Customer updated successfully' });
      }
    }
  );
});

// DELETE customer
router.delete('/customers/:id', async (req, res) => {
  const { id } = req.params;
  const query = 'DELETE FROM customer_tbl WHERE customer_id = ?';

  mysqlConnection.query(query, [id], (error, result) => {
    if (error) {
      console.error('Deleting customer error:', error);
      if (error.code === 'ER_ROW_IS_REFERENCED_2') {
        return res.status(409).json({
          error: 'Cannot delete customer because they are referenced by other records.',
        });
      }
      return res.status(500).json({ error: 'Deleting customer failed' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    } else {
      res.status(200).json({ message: 'Customer deleted successfully' });
    }
  });
});

module.exports = router;
