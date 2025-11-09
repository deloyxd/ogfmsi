const { Router } = require('express');
const db = require('../database/mysql');
const router = Router();

// GET all notifications
router.get('/', async (req, res) => {
  const query = `SELECT * FROM notif_tbl ORDER BY created_at DESC`;
  try {
    const rows = await db.query(query);
    return res.status(200).json({ message: 'Fetching notifications successful', result: rows });
  } catch (error) {
    console.error('Fetching notifications error:', error);
    return res.status(500).json({ error: 'Fetching notifications failed' });
  }
});

// GET all notifications of customer
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const query = `
    SELECT * FROM notif_tbl 
    WHERE notif_customer_id = ? OR notif_customer_id = 'ALL'
    ORDER BY created_at DESC
  `;
  try {
    const rows = await db.query(query, [id]);
    return res.status(200).json({ message: 'Fetching notifications successful', result: rows });
  } catch (error) {
    console.error('Fetching notifications error:', error);
    return res.status(500).json({ error: 'Fetching notifications failed' });
  }
});

// POST new notification
router.post('/', async (req, res) => {
  const { notif_customer_id, notif_title, notif_body, notif_type } = req.body;

  const query = `
    INSERT INTO notif_tbl
    (notif_customer_id, notif_title, notif_body, notif_type)
    VALUES (?, ?, ?, ?)
  `;

  try {
    await db.query(query, [notif_customer_id, notif_title, notif_body, notif_type]);
    return res.status(201).json({
      message: 'Notification created successfully',
      result: {
        notif_customer_id,
        notif_title,
        notif_body,
        notif_type,
      },
    });
  } catch (error) {
    console.error('Creating notification error:', error);
    return res.status(500).json({ error: 'Creating notification failed' });
  }
});

module.exports = router;
