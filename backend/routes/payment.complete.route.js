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
    return res.status(200).json({ message: 'Reference check ok', rows, used });
  } catch (error) {
    console.error('Reference check error:', error);
    return res.status(500).json({ error: 'Reference check failed' });
  }
});

// GET today's summary
router.get('/summary/today', async (req, res) => {
  const sql = `
    SELECT
      SUM(
        CASE 
          WHEN payment_method = 'cash' 
          THEN CAST(payment_amount_to_pay AS DECIMAL(12,2)) 
          ELSE 0 
        END
      ) AS total_cash,

      SUM(
        CASE 
          WHEN payment_method IN ('cashless', 'hybrid') 
          THEN CAST(payment_amount_to_pay AS DECIMAL(12,2)) 
          ELSE 0 
        END
      ) AS total_cashless_hybrid
    FROM payment_tbl
    WHERE payment_type IN ('sales', 'service')
      AND DATE(created_at) = CURDATE()
  `;

  try {
    const rows = await db.query(sql);
    return res.status(200).json({
      message: "Today's payment summary fetched successfully",
      result: rows[0]
    });
  } catch (error) {
    console.error("Error fetching today's summary:", error);
    return res.status(500).json({ error: "Failed to fetch payment summary" });
  }
});

// GET revenues
router.get('/summary/revenue', async (req, res) => {
  const sql = `
    SELECT
      SUM(
        CASE 
          WHEN payment_type = 'service'
            AND LOWER(payment_purpose) NOT LIKE '%reservation%'
          THEN CAST(payment_amount_to_pay AS DECIMAL(12,2))
          ELSE 0
        END
      ) AS gym_revenue,

      SUM(
        CASE
          WHEN payment_type = 'service'
            AND LOWER(payment_purpose) LIKE '%reservation%'
          THEN CAST(payment_amount_to_pay AS DECIMAL(12,2))
          ELSE 0
        END
      ) AS reservation_revenue,

      SUM(
        CASE
          WHEN payment_type = 'sales'
          THEN CAST(payment_amount_to_pay AS DECIMAL(12,2))
          ELSE 0
        END
      ) AS products_revenue
    FROM payment_tbl;
  `;

  try {
    const rows = await db.query(sql);
    return res.status(200).json({
      message: "System revenue summary fetched successfully",
      result: rows[0]
    });
  } catch (error) {
    console.error("System revenue summary error:", error);
    return res.status(500).json({ error: "Failed to fetch system revenue summary" });
  }
});

// GET averages
router.get('/summary/averages', async (req, res) => {
  const sql = `
    SELECT
      SUM(CAST(payment_amount_to_pay AS DECIMAL(12,2))) AS total_income,

      COUNT(DISTINCT DATE(created_at)) AS total_days,
      COUNT(DISTINCT YEARWEEK(created_at)) AS total_weeks,
      COUNT(DISTINCT DATE_FORMAT(created_at, '%Y-%m')) AS total_months
    FROM payment_tbl
    WHERE payment_type IN ('sales', 'service')
  `;

  try {
    const rows = await db.query(sql);
    const data = rows[0];

    const totalIncome = Number(data.total_income) || 0;
    const totalDays = Number(data.total_days) || 1;
    const totalWeeks = Number(data.total_weeks) || 1;
    const totalMonths = Number(data.total_months) || 1;

    const averageDaily = totalIncome / totalDays;
    const averageWeekly = totalIncome / totalWeeks;
    const averageMonthly = totalIncome / totalMonths;

    return res.status(200).json({
      message: "Averages fetched successfully",
      result: {
        totalIncome,
        totalDays,
        totalWeeks,
        totalMonths,
        averageDaily,
        averageWeekly,
        averageMonthly
      }
    });

  } catch (error) {
    console.error("Average income summary error:", error);
    return res.status(500).json({ error: "Failed to compute averages" });
  }
});

module.exports = router;
