const { Router } = require('express');
const db = require('../database/mysql');
const router = Router();

// GET all customers
router.get('/monthly', async (req, res) => {
  // Get only the most recent active monthly subscription for each customer
  const query = `
    SELECT m1.* 
    FROM customer_monthly_tbl m1
    INNER JOIN (
      SELECT customer_id, MAX(created_at) as max_created_at
      FROM customer_monthly_tbl
      WHERE customer_end_date >= CURDATE()
      AND customer_pending = 0
      GROUP BY customer_id
    ) m2 ON m1.customer_id = m2.customer_id AND m1.created_at = m2.max_created_at
    WHERE m1.customer_end_date >= CURDATE()
    AND m1.customer_pending = 0
    ORDER BY m1.created_at DESC
  `;
  db.query(query, (error, result) => {
    if (error) {
      console.error('Fetching customers error:', error);
      return res.status(500).json({ error: 'Fetching customers failed' });
    }
    res.status(200).json({ message: 'Fetching customers successful', result: result });
  });
});

// GET all expired customers
// router.get('/customers/monthly', async (req, res) => {
//   const query = 'SELECT * FROM customer_monthly_tbl WHERE customer_end_date < CURRENT_DATE ORDER BY created_at DESC';
//   mysqlConnection.query(query, (error, result) => {
//     if (error) {
//       console.error('Fetching customers error:', error);
//       return res.status(500).json({ error: 'Fetching customers failed' });
//     }
//     res.status(200).json({ message: 'Fetching customers successful', result: result });
//   });
// });

// POST new customer
router.post('/monthly', async (req, res) => {
  const { customer_id, customer_start_date, customer_end_date, customer_months, customer_tid, customer_pending } =
    req.body;

  const query = `
    INSERT INTO customer_monthly_tbl 
    (customer_id, customer_start_date, customer_end_date, customer_months, customer_tid, customer_pending) 
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  try {
    await db.query(
      query,
      [customer_id, customer_start_date, customer_end_date, customer_months, customer_tid, customer_pending]
    );

    res.status(201).json({
      message: 'Customer created successfully',
      result: {
        customer_id,
        customer_start_date,
        customer_end_date,
        customer_months,
        customer_tid,
        customer_pending,
      },
    });
  } catch (error) {
    console.error('Creating customer error:', error);
    return res.status(500).json({ error: 'Creating customer failed' });
  }
});

// PUT update customer
router.put('/monthly/:id', async (req, res) => {
  const { id } = req.params;
  const { customer_tid, customer_pending } = req.body;

  const query = `
    UPDATE customer_monthly_tbl 
    SET customer_tid = ?, customer_pending = ?
    WHERE customer_id = ?
  `;

  try {
    const result = await db.query(query, [customer_tid, customer_pending, id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    } else {
      res.status(200).json({ message: 'Customer updated successfully' });
    }
  } catch (error) {
    console.error('Updating customer error:', error);
    return res.status(500).json({ error: 'Updating customer failed' });
  }
});

// DELETE customers
router.delete('/monthly/:id', async (req, res) => {
  const { id } = req.params;
  const query = 'DELETE FROM customer_monthly_tbl WHERE customer_id = ?';

  try {
    const result = await db.query(query, [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    } else {
      res.status(200).json({ message: 'Customer deleted successfully' });
    }
  } catch (error) {
    console.error('Deleting customer error:', error);
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(409).json({
        error: 'Cannot delete customer because they are referenced by other records.',
      });
    }
    return res.status(500).json({ error: 'Deleting customer failed' });
  }
});

// DELETE expired customers
router.delete('/monthly', async (req, res) => {
  const query = 'DELETE FROM customer_monthly_tbl WHERE customer_end_date < CURRENT_DATE';

  try {
    const result = await db.query(query, []);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    } else {
      res.status(200).json({ message: 'Customer deleted successfully' });
    }
  } catch (error) {
    console.error('Deleting customer error:', error);
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(409).json({
        error: 'Cannot delete customer because they are referenced by other records.',
      });
    }
    return res.status(500).json({ error: 'Deleting customer failed' });
  }
});

module.exports = router;
