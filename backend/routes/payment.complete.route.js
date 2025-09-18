const { Router } = require('express');
const mysqlConnection = require('../database/mysql');
const router = Router();

// GET all payments
router.get('/complete', async (req, res) => {
  const query = `SELECT * FROM payment_tbl WHERE payment_type = 'complete' ORDER BY created_at DESC`;
  mysqlConnection.query(query, (error, result) => {
    if (error) {
      console.error('Fetching payments error:', error);
      return res.status(500).json({ error: 'Fetching payments failed' });
    }
    res.status(200).json({ message: 'Fetching payments successful', result: result });
  });
});

// PUT new complete payment
router.put('/complete/:id', async (req, res) => {
  const { id } = req.params;
  const { payment_amount_paid_cash, payment_amount_paid_cashless, payment_amount_change, payment_method } = req.body;

  const query = `
    UPDATE payment_tbl 
    SET payment_amount_paid_cash = ?, payment_amount_paid_cashless = ?, payment_amount_change = ?, payment_method = ?, payment_type = 'complete'
    WHERE payment_id = ?
  `;

  mysqlConnection.query(
    query,
    [payment_amount_paid_cash, payment_amount_paid_cashless, payment_amount_change, payment_method, id],
    (error, result) => {
      if (error) {
        console.error('Creating payment error:', error);
        return res.status(500).json({ error: 'Creating payment failed' });
      }
      res.status(201).json({
        message: 'Payment created successfully',
        result: {
          payment_id: id,
          payment_amount_paid_cash,
          payment_amount_paid_cashless,
          payment_amount_change,
          payment_method,
        },
      });
    }
  );
});

module.exports = router;
