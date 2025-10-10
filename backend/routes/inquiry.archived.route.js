const { Router } = require('express');
const db = require('../database/mysql');
const { parsePageParams } = require('../utils/pagination');
const router = Router();

// GET all archived customers
router.get('/archived', async (req, res) => {
  const { useLimit, limit, offset } = parsePageParams(req);
  let sql = `SELECT * FROM customer_tbl WHERE customer_type = 'archived' ORDER BY created_at DESC`;
  const params = [];
  if (useLimit) {
    sql += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);
  }
  try {
    const rows = await db.query(sql, params);
    res.status(200).json({ message: 'Fetching archived customers successful', result: rows });
  } catch (error) {
    console.error('Fetching archived customers error:', error);
    return res.status(500).json({ error: 'Fetching archived customers failed' });
  }
});

// PUT mark customer as archived
router.put('/archived/:id', async (req, res) => {
  const { id } = req.params;

  const query = `
    UPDATE customer_tbl 
    SET customer_type = 'archived'
    WHERE customer_id = ?
  `;

  try {
    const result = await db.query(query, [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    } else {
      res
        .status(200)
        .json({ message: 'Customer archived successfully', result: { customer_id: id, customer_type: 'archived' } });
    }
  } catch (error) {
    console.error('Archiving customer error:', error);
    return res.status(500).json({ error: 'Archiving customer failed' });
  }
});

// PUT unarchive customer (restore to daily type)
router.put('/unarchive/:id', async (req, res) => {
  const { id } = req.params;

  const query = `
    UPDATE customer_tbl 
    SET customer_type = 'daily'
    WHERE customer_id = ?
  `;

  try {
    const result = await db.query(query, [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    } else {
      res
        .status(200)
        .json({ message: 'Customer unarchived successfully', result: { customer_id: id, customer_type: 'daily' } });
    }
  } catch (error) {
    console.error('Unarchiving customer error:', error);
    return res.status(500).json({ error: 'Unarchiving customer failed' });
  }
});

// POST auto-archive inactive customers (3+ months inactive)
router.post('/auto-archive', async (req, res) => {
  const { useLimit, limit, offset } = parsePageParams(req);
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const threeMonthsAgoStr = threeMonthsAgo.toISOString().split('T')[0];

  // Find customers who haven't been active for 3+ months
  // We'll check both customer_tbl and any recent check-ins
  const findInactiveQuery = `
    SELECT DISTINCT c.customer_id, c.customer_first_name, c.customer_last_name, c.customer_image_url, c.customer_contact, c.created_at
    FROM customer_tbl c
    LEFT JOIN inquiry_checkins_regular_tbl r ON c.customer_id = r.customer_id AND r.created_at > ?
    LEFT JOIN inquiry_checkins_monthly_tbl m ON c.customer_id = m.customer_id AND m.created_at > ?
    WHERE c.customer_type IN ('daily', 'monthly')
    AND c.customer_pending = 0
    AND (r.customer_id IS NULL AND m.customer_id IS NULL)
    AND c.created_at < ?
  `;
  let params = [threeMonthsAgoStr, threeMonthsAgoStr, threeMonthsAgoStr];
  if (useLimit) {
    sql += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);
  }
  try {
    const inactiveCustomers = await db.query(findInactiveQuery, params);

    if (inactiveCustomers.length === 0) {
      return res.status(200).json({
        message: 'No inactive customers found',
        result: [],
        archived_count: 0,
      });
    }

    // Archive all inactive customers
    const archiveQuery = `
      UPDATE customer_tbl 
      SET customer_type = 'archived'
      WHERE customer_id IN (${inactiveCustomers.map(() => '?').join(',')})
    `;

    params = inactiveCustomers.map((customer) => customer.customer_id);
    if (useLimit) {
      sql += ' LIMIT ? OFFSET ?';
      params.push(limit, offset);
    }

    try {
      const rows = await db.query(archiveQuery, params);
      res.status(200).json({
        message: `Successfully auto-archived ${rows.length} inactive customers`,
        result: inactiveCustomers,
        archived_count: rows.length,
      });
    } catch (error) {
      console.error('Auto-archiving customers error:', error);
      return res.status(500).json({ error: 'Auto-archiving customers failed' });
    }
  } catch (error) {
    console.error('Finding inactive customers error:', error);
    return res.status(500).json({ error: 'Finding inactive customers failed' });
  }
});

module.exports = router;
