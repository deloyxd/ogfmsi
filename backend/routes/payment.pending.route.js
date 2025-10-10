const { Router } = require('express');
const db = require('../database/mysql');
const { parsePageParams } = require('../utils/pagination');
const router = Router();

// GET all payments
router.get('/pending', async (req, res) => {
  const { useLimit, limit, offset } = parsePageParams(req);
  let sql = `SELECT * FROM payment_tbl WHERE payment_type = 'pending' ORDER BY created_at DESC`;
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

// POST new payment
router.post('/pending', async (req, res) => {
  const { payment_id, payment_customer_id, payment_purpose, payment_amount_to_pay, payment_rate } = req.body;

  const query = `
    INSERT INTO payment_tbl
    (payment_id, payment_customer_id, payment_purpose, payment_amount_to_pay, payment_rate, payment_type)
    VALUES (?, ?, ?, ?, ?, 'pending')
  `;

  try {
    await db.query(query, [payment_id, payment_customer_id, payment_purpose, payment_amount_to_pay, payment_rate]);
    return res.status(201).json({
      message: 'Payment created successfully',
      result: {
        payment_id,
        payment_customer_id,
        payment_purpose,
        payment_amount_to_pay,
        payment_rate,
      },
    });
  } catch (error) {
    console.error('Creating payment error:', error);
    return res.status(500).json({ error: 'Creating payment failed' });
  }
});

module.exports = router;
