const { Router } = require('express');
const db = require('../database/mysql');
const { parsePageParams } = require('../utils/pagination');
const router = Router();

// GET all past monthly customers (expired monthly pass)
router.get('/pastmonthly', async (req, res) => {
  const { useLimit, limit, offset } = parsePageParams(req);
  let sql = `
    SELECT DISTINCT c.customer_id, c.customer_first_name, c.customer_last_name, 
           c.customer_image_url, c.customer_contact, c.customer_rate,
           m.customer_start_date, m.customer_end_date, m.customer_months,
           m.created_at
    FROM customer_tbl c
    INNER JOIN customer_monthly_tbl m ON c.customer_id = m.customer_id
    WHERE m.customer_end_date < CURDATE()
    AND m.customer_pending = 0
    ORDER BY m.customer_end_date DESC
  `;
  const params = [];
  if (useLimit) {
    sql += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);
  }
  try {
    const rows = await db.query(sql, params);
    res.status(200).json({ message: 'Fetching past monthly customers successful', result: rows });
  } catch (error) {
    console.error('Fetching customers error:', error);
    return res.status(500).json({ error: 'Fetching past monthly customers failed' });
  }
});

// POST move expired monthly customers to past monthly
router.post('/pastmonthly/auto-move', async (req, res) => {
  const { useLimit, limit, offset } = parsePageParams(req);
  const today = new Date().toISOString().split('T')[0];

  // Find expired monthly customers
  const findExpiredQuery = `
    SELECT DISTINCT c.customer_id, c.customer_first_name, c.customer_last_name, 
           c.customer_image_url, c.customer_contact, c.customer_rate,
           m.customer_start_date, m.customer_end_date, m.customer_months,
           m.created_at
    FROM customer_tbl c
    INNER JOIN customer_monthly_tbl m ON c.customer_id = m.customer_id
    WHERE m.customer_end_date < ?
    AND m.customer_pending = 0
  `;
  const params = [];
  if (useLimit) {
    sql += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);
  }
  try {
    const expiredCustomers = await db.query(findExpiredQuery, params);

    if (expiredCustomers.length === 0) {
      return res.status(200).json({
        message: 'No expired monthly customers found',
        result: [],
        moved_count: 0,
      });
    }

    // Mark these customers as past monthly (we can add a status field or use existing logic)
    // For now, we'll just return the expired customers - the frontend will handle the display
    res.status(200).json({
      message: `Found ${expiredCustomers.length} expired monthly customers`,
      result: expiredCustomers,
      moved_count: expiredCustomers.length,
    });
  } catch (error) {
    console.error('Finding expired monthly customers error:', error);
    return res.status(500).json({ error: 'Finding expired monthly customers failed' });
  }
});

module.exports = router;
