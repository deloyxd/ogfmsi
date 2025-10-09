const { Router } = require('express');
const mysqlConnection = require('../database/mysql');
const router = Router();

// GET all canceled payments
router.get('/canceled', async (req, res) => {
  const query = `SELECT * FROM payment_tbl WHERE payment_type = 'canceled' ORDER BY created_at DESC`;
  mysqlConnection.query(query, (error, result) => {
    if (error) {
      console.error('Fetching canceled payments error:', error);
      return res.status(500).json({ error: 'Fetching payments failed' });
    }
    res.status(200).json({ message: 'Fetching payments successful', result: result });
  });
});

// Mark a pending payment as canceled
router.put('/canceled/:id', async (req, res) => {
  const { id } = req.params;

  const query = `
    UPDATE payment_tbl 
    SET payment_type = 'canceled'
    WHERE payment_id = ?
  `;

  mysqlConnection.query(query, [id], (error, result) => {
    if (error) {
      console.error('Updating payment to canceled error:', error);
      return res.status(500).json({ error: 'Updating payment failed' });
    }
    res.status(200).json({
      message: 'Payment marked as canceled',
      result: { payment_id: id, payment_type: 'canceled' },
    });
  });
});

module.exports = router;


