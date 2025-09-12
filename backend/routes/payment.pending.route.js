const { Router } = require('express');
const mysqlConnection = require('../database/mysql');
const router = Router();

// GET all payments
router.get('/pending', async (req, res) => {
  const query = `SELECT * FROM payment_tbl ORDER BY created_at DESC WHERE payment_type = 'pending'`;
  mysqlConnection.query(query, (error, result) => {
    if (error) {
      console.error('Fetching payments error:', error);
      return res.status(500).json({ error: 'Fetching payments failed' });
    }
    res.status(200).json({ message: 'Fetching payments successful', result: result });
  });
});

// POST new payment
router.post('/pending', async (req, res) => {
  const { payment_id, payment_customer_id, payment_purpose, payment_amount_to_pay, payment_rate } = req.body;

  const query = `
    INSERT INTO payment_tbl 
    (payment_id, payment_customer_id, payment_purpose, payment_amount_to_pay, payment_rate, payment_type) 
    VALUES (?, ?, ?, ?, ?, 'pending')
  `;

  mysqlConnection.query(
    query,
    [payment_id, payment_customer_id, payment_purpose, payment_amount_to_pay, payment_rate],
    (error, result) => {
      if (error) {
        console.error('Creating payment error:', error);
        return res.status(500).json({ error: 'Creating payment failed' });
      }
      res.status(201).json({
        message: 'Payment created successfully',
        result: {
          payment_id,
          payment_customer_id,
          payment_purpose,
          payment_amount_to_pay,
          payment_rate,
        },
      });
    }
  );
});

// DELETE payment
router.delete('/pending/:id', async (req, res) => {
  const { id } = req.params;
  const query = 'DELETE FROM payment_tbl WHERE payment_id = ?';

  mysqlConnection.query(query, [id], (error, result) => {
    if (error) {
      console.error('Deleting payment error:', error);
      if (error.code === 'ER_ROW_IS_REFERENCED_2') {
        return res.status(409).json({
          error: 'Cannot delete payment because they are referenced by other records.',
        });
      }
      return res.status(500).json({ error: 'Deleting payment failed' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    } else {
      res.status(200).json({ message: 'Payment deleted successfully' });
    }
  });
});
