const { Router } = require('express');
const db = require('../database/mysql');
const { parsePageParams } = require('../utils/pagination');
const router = Router();

// Regular Check-Ins Logbook
router.get('/checkins/regular', async (req, res) => {
  const { useLimit, limit, offset } = parsePageParams(req);
  let sql = 'SELECT * FROM inquiry_checkins_regular_tbl ORDER BY created_at DESC';
  const params = [];
  if (useLimit) {
    sql += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);
  }
  try {
    const rows = await db.query(sql, params);
    return res.status(200).json({ message: 'Fetching regular check-ins successful', result: rows });
  } catch (error) {
    console.error('Fetching regular check-ins error:', error);
    return res.status(500).json({ error: 'Fetching regular check-ins failed' });
  }
});

router.post('/checkins/regular', async (req, res) => {
  const { checkin_id, customer_id, customer_name_encoded, customer_contact, customer_image_url, transaction_id } = req.body;

  const query = `
    INSERT INTO inquiry_checkins_regular_tbl 
      (checkin_id, customer_id, customer_name_encoded, customer_contact, customer_image_url, transaction_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  try {
    await db.query(query, [checkin_id, customer_id, customer_name_encoded, customer_contact, customer_image_url, transaction_id]);
    return res.status(201).json({ message: 'Regular check-in created successfully' });
  } catch (error) {
    console.error('Creating regular check-in error:', error);
    return res.status(500).json({ error: 'Creating regular check-in failed' });
  }
});

// Monthly Check-Ins Logbook
router.get('/checkins/monthly', async (req, res) => {
  const { useLimit, limit, offset } = parsePageParams(req);
  let sql = 'SELECT * FROM inquiry_checkins_monthly_tbl ORDER BY created_at DESC';
  const params = [];
  if (useLimit) {
    sql += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);
  }
  try {
    const rows = await db.query(sql, params);
    return res.status(200).json({ message: 'Fetching monthly check-ins successful', result: rows });
  } catch (error) {
    console.error('Fetching monthly check-ins error:', error);
    return res.status(500).json({ error: 'Fetching monthly check-ins failed' });
  }
});

router.post('/checkins/monthly', async (req, res) => {
  const { checkin_id, customer_id, customer_name_encoded, customer_contact, customer_image_url, transaction_id } = req.body;

  const query = `
    INSERT INTO inquiry_checkins_monthly_tbl 
      (checkin_id, customer_id, customer_name_encoded, customer_contact, customer_image_url, transaction_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  try {
    await db.query(query, [checkin_id, customer_id, customer_name_encoded, customer_contact, customer_image_url, transaction_id]);
    return res.status(201).json({ message: 'Monthly check-in created successfully' });
  } catch (error) {
    console.error('Creating monthly check-in error:', error);
    return res.status(500).json({ error: 'Creating monthly check-in failed' });
  }
});

// Delete Regular Check-In
router.delete('/checkins/regular/:checkinId', async (req, res) => {
  const { checkinId } = req.params;
  const query = 'DELETE FROM inquiry_checkins_regular_tbl WHERE checkin_id = ?';

  try {
    await db.query(query, [checkinId]);
    return res.status(200).json({ message: 'Regular check-in deleted successfully' });
  } catch (error) {
    console.error('Deleting regular check-in error:', error);
    return res.status(500).json({ error: 'Deleting regular check-in failed' });
  }
});

// Clear All Regular Check-Ins older than today (for midnight reset)
router.delete('/checkins/regular/clear', async (req, res) => {
  const query = 'DELETE FROM inquiry_checkins_regular_tbl WHERE created_at < CURDATE()';

  try {
    await db.query(query);
    return res.status(200).json({ message: 'Regular check-ins cleared successfully' });
  } catch (error) {
    console.error('Clearing regular check-ins error:', error);
    return res.status(500).json({ error: 'Clearing regular check-ins failed' });
  }
});

// Clear All Monthly Check-Ins (for midnight reset)
router.delete('/checkins/monthly/clear', async (req, res) => {
  // Only clear monthly check-ins from previous days; keep today's records
  const query = 'DELETE FROM inquiry_checkins_monthly_tbl WHERE created_at < CURDATE()';

  try {
    await db.query(query);
    return res.status(200).json({ message: 'Monthly check-ins cleared successfully' });
  } catch (error) {
    console.error('Clearing monthly check-ins error:', error);
    return res.status(500).json({ error: 'Clearing monthly check-ins failed' });
  }
});

module.exports = router;
