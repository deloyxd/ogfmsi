const { Router } = require('express');
const mysqlConnection = require('../database/mysql');
const router = Router();

// GET all archived customers
router.get('/archived', async (req, res) => {
  const query = `SELECT * FROM customer_tbl WHERE customer_type = 'archived' ORDER BY created_at DESC`;
  mysqlConnection.query(query, (error, result) => {
    if (error) {
      console.error('Fetching archived customers error:', error);
      return res.status(500).json({ error: 'Fetching archived customers failed' });
    }
    res.status(200).json({ message: 'Fetching archived customers successful', result: result });
  });
});

// PUT mark customer as archived
router.put('/archived/:id', async (req, res) => {
  const { id } = req.params;

  const query = `
    UPDATE customer_tbl 
    SET customer_type = 'archived'
    WHERE customer_id = ?
  `;

  mysqlConnection.query(query, [id], (error, result) => {
    if (error) {
      console.error('Archiving customer error:', error);
      return res.status(500).json({ error: 'Archiving customer failed' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.status(200).json({
      message: 'Customer archived successfully',
      result: { customer_id: id, customer_type: 'archived' },
    });
  });
});

module.exports = router;
