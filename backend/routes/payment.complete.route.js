const { Router } = require('express');
const mysqlConnection = require('../database/mysql');
const router = Router();

// GET all complete payments
router.get('/complete', async (req, res) => {
  const query = `SELECT * FROM payment_tbl WHERE payment_type != 'pending' ORDER BY created_at DESC`;
  mysqlConnection.query(query, (error, result) => {
    if (error) {
      console.error('Fetching payments error:', error);
      return res.status(500).json({ error: 'Fetching payments failed' });
    }
    res.status(200).json({ message: 'Fetching payments successful', result: result });
  });
});

module.exports = router;
