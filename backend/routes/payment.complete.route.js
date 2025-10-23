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

// GET all complete payments
router.get('/complete/:id', async (req, res) => {
  const { id } = req.params;
  const query = `SELECT * FROM payment_tbl WHERE payment_id = ?`;
  try {
      const rows = await db.query(query, [id]);
    return res.status(200).json({ message: 'Fetching payments successful', result: rows });
  } catch (error) {
    console.error('Fetching payments error:', error);
    return res.status(500).json({ error: 'Fetching payments failed' });
  }
});

// GET check if reference number is already used
router.get('/ref/check/:ref', async (req, res) => {
  const { ref } = req.params;
  if (!ref || String(ref).trim() === '') {
    return res.status(400).json({ error: 'Reference is required' });
  }
  try {
    const rows = await db.query('SELECT payment_id FROM payment_tbl WHERE payment_ref = ? LIMIT 1', [ref]);
    const used = Array.isArray(rows) && rows.length > 0;
    return res.status(200).json({ message: 'Reference check ok', used });
  } catch (error) {
    console.error('Reference check error:', error);
    return res.status(500).json({ error: 'Reference check failed' });
  }
});

module.exports = router;
