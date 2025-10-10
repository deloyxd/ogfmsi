const { Router } = require("express");
const db = require('../database/mysql');
const router = Router();

/* 🔥 EQUIPMENT INVENTORY STATISTICS ROUTES 🔥 */

// GET maintenance statistics
router.get('/overview', async (req, res) => {
  const query = `
    SELECT 
      COUNT(*) as total_maintenance,
      COUNT(CASE WHEN status = 'scheduled' THEN 1 END) as scheduled_maintenance,
      COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_maintenance,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_maintenance,
      COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue_maintenance,
      SUM(cost) as total_cost,
      AVG(cost) as average_cost
    FROM equipment_maintenance_tbl
  `;
  try {
    const rows = await db.query(query);
    return res.status(200).json({ message: 'Fetching maintenance stats successful', result: rows[0] });
  } catch (error) {
    console.error('Fetching maintenance stats error:', error);
    return res.status(500).json({ error: 'Fetching maintenance stats failed' });
  }
});

// GET maintenance by type statistics
router.get('/by-type', async (req, res) => {
  const query = `
    SELECT 
      maintenance_type,
      COUNT(*) as count,
      SUM(cost) as total_cost,
      AVG(cost) as average_cost
    FROM equipment_maintenance_tbl
    GROUP BY maintenance_type
  `;
  try {
    const rows = await db.query(query);
    return res.status(200).json({ message: 'Fetching maintenance by type stats successful', result: rows });
  } catch (error) {
    console.error('Fetching maintenance by type stats error:', error);
    return res.status(500).json({ error: 'Fetching maintenance by type stats failed' });
  }
});

// GET upcoming maintenance (next 30 days)
router.get('/upcoming', async (req, res) => {
  const query = `
    SELECT * FROM equipment_maintenance_tbl 
    WHERE status IN ('scheduled', 'in_progress')
    AND scheduled_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
    ORDER BY scheduled_date ASC
  `;
  try {
    const rows = await db.query(query);
    return res.status(200).json({ message: 'Fetching upcoming maintenance successful', result: rows });
  } catch (error) {
    console.error('Fetching upcoming maintenance error:', error);
    return res.status(500).json({ error: 'Fetching upcoming maintenance failed' });
  }
});

module.exports = router;
