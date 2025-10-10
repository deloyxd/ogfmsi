const { Router } = require('express');
const db = require('../database/mysql');
const { parsePageParams } = require('../utils/pagination');
const router = Router();

// GET all complete payments
router.get('/complete', async (req, res) => {
  const { useLimit, limit, offset } = parsePageParams(req);
  let sql = `SELECT * FROM payment_tbl WHERE payment_type != 'pending' ORDER BY created_at DESC`;
  const params = [];
  if (useLimit) {
    sql += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);
  }
  try {
    const rows = await db.query(sql, params);
    return res.status(200).json({ message: 'Fetching payments successful', result: rows });
  } catch (error) {
    console.error('Fetching payments error:', error);
    return res.status(500).json({ error: 'Fetching payments failed' });
  }
});

module.exports = router;
