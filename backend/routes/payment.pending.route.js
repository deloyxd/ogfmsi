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
  const { payment_id, payment_customer_id, payment_purpose, payment_amount_to_pay, payment_rate, payment_ref } = req.body;

  // If a reference is provided, ensure it's unique across all payments
  try {
    if (payment_ref && String(payment_ref).trim() !== '') {
      const dup = await db.query(
        'SELECT payment_id FROM payment_tbl WHERE payment_ref = ? LIMIT 1',
        [payment_ref]
      );
      if (dup && dup.length > 0) {
        return res.status(409).json({ error: 'This reference number has already been used. Please enter a valid one.' });
      }
    }

    const query = `
      INSERT INTO payment_tbl
      (payment_id, payment_customer_id, payment_purpose, payment_amount_to_pay, payment_rate, payment_ref, payment_type)
      VALUES (?, ?, ?, ?, ?, ?, 'pending')
    `;

    await db.query(query, [payment_id, payment_customer_id, payment_purpose, payment_amount_to_pay, payment_rate, payment_ref || null]);
    return res.status(201).json({
      message: 'Payment created successfully',
      result: {
        payment_id,
        payment_customer_id,
        payment_purpose,
        payment_amount_to_pay,
        payment_rate,
        payment_ref: payment_ref || null,
      },
    });
  } catch (error) {
    console.error('Creating payment error:', error);
    return res.status(500).json({ error: 'Creating payment failed' });
  }
});

module.exports = router;
