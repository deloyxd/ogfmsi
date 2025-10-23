const { Router } = require('express');
const db = require('../database/mysql');
const { parsePageParams } = require('../utils/pagination');
const router = Router();

// GET all payments
router.get('/sales', async (req, res) => {
  const { useLimit, limit, offset } = parsePageParams(req);
  let sql = `SELECT * FROM payment_tbl WHERE payment_type = 'sales' ORDER BY created_at DESC`;
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

// PUT new sales payment
router.put('/sales/:id', async (req, res) => {
  const { id } = req.params;
  const { payment_amount_paid_cash, payment_amount_paid_cashless, payment_amount_change, payment_method, payment_ref } = req.body;

  const updateQuery = `
    UPDATE payment_tbl 
    SET payment_amount_paid_cash = ?, payment_amount_paid_cashless = ?, payment_amount_change = ?, payment_method = ?, payment_ref = ?, payment_type = 'sales'
    WHERE payment_id = ?
  `;

  try {
    // If a reference is provided, ensure it's unique across all payments except this one
    if (payment_ref && String(payment_ref).trim() !== '') {
      const dup = await db.query(
        'SELECT payment_id FROM payment_tbl WHERE payment_ref = ? AND payment_id <> ? LIMIT 1',
        [payment_ref, id]
      );
      if (dup && dup.length > 0) {
        return res.status(409).json({ error: 'This reference number has already been used. Please enter a valid one.' });
      }
    }

    await db.query(
      updateQuery,
      [payment_amount_paid_cash, payment_amount_paid_cashless, payment_amount_change, payment_method, payment_ref || null, id]
    );
    return res.status(201).json({
      message: 'Payment created successfully',
      result: {
        payment_id: id,
        payment_amount_paid_cash,
        payment_amount_paid_cashless,
        payment_amount_change,
        payment_method,
        payment_ref: payment_ref || null,
      },
    });
  } catch (error) {
    console.error('Creating payment error:', error);
    return res.status(500).json({ error: 'Creating payment failed' });
  }
});

module.exports = router;
