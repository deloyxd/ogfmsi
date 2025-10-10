const { Router } = require("express");
const db = require('../database/mysql');
const { parsePageParams } = require('../utils/pagination');
const router = Router();

/* 🔥 EQUIPMENT MAINTENANCE ROUTES 🔥 */

// GET all maintenance records
router.get('/', async (req, res) => {
  const { useLimit, limit, offset } = parsePageParams(req);
  let sql = 'SELECT * FROM equipment_maintenance_tbl ORDER BY scheduled_date ASC, created_at DESC';
  const params = [];
  if (useLimit) {
    sql += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);
  }
  try {
    const rows = await db.query(sql, params);
    return res.status(200).json({ message: 'Fetching maintenance records successful', result: rows });
  } catch (error) {
    console.error('Fetching maintenance records error:', error);
    return res.status(500).json({ error: 'Fetching maintenance records failed' });
  }
});

// GET maintenance records by status
router.get('/status/:status', async (req, res) => {
  const { status } = req.params;
  const { useLimit, limit, offset } = parsePageParams(req);
  let sql = 'SELECT * FROM equipment_maintenance_tbl WHERE status = ? ORDER BY scheduled_date ASC';
  const params = [status];
  if (useLimit) {
    sql += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);
  }
  try {
    const rows = await db.query(sql, params);
    return res.status(200).json({ message: 'Fetching maintenance records by status successful', result: rows });
  } catch (error) {
    console.error('Fetching maintenance records by status error:', error);
    return res.status(500).json({ error: 'Fetching maintenance records by status failed' });
  }
});

// GET overdue maintenance records
router.get('/overdue', async (req, res) => {
  const { useLimit, limit, offset } = parsePageParams(req);
  let sql = `
    SELECT * FROM equipment_maintenance_tbl
    WHERE status IN ('scheduled', 'in_progress')
    AND scheduled_date < CURDATE()
    ORDER BY scheduled_date ASC
  `;
  const params = [];
  if (useLimit) {
    sql += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);
  }
  try {
    const rows = await db.query(sql, params);
    return res.status(200).json({ message: 'Fetching overdue maintenance records successful', result: rows });
  } catch (error) {
    console.error('Fetching overdue maintenance records error:', error);
    return res.status(500).json({ error: 'Fetching overdue maintenance records failed' });
  }
});

// GET single maintenance record
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const query = 'SELECT * FROM equipment_maintenance_tbl WHERE maintenance_id = ?';
  try {
    const rows = await db.query(query, [id]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Maintenance record not found' });
    } else {
      return res.status(200).json({ message: 'Fetching maintenance record successful', result: rows[0] });
    }
  } catch (error) {
    console.error('Fetching maintenance record error:', error);
    return res.status(500).json({ error: 'Fetching maintenance record failed' });
  }
});

// POST new maintenance record
router.post('/', async (req, res) => {
  const { equipment_name, maintenance_type, description, scheduled_date, assigned_to, cost } = req.body;

  // Generate unique maintenance ID
  const maintenance_id = 'MAINT_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

  const query = 'INSERT INTO equipment_maintenance_tbl (maintenance_id, equipment_name, maintenance_type, description, scheduled_date, assigned_to, cost) VALUES (?, ?, ?, ?, ?, ?, ?)';
  try {
    await db.query(query, [maintenance_id, equipment_name, maintenance_type, description, scheduled_date, assigned_to, cost]);
    return res.status(201).json({
      message: 'Maintenance record created successfully',
      result: { maintenance_id, equipment_name, maintenance_type, scheduled_date }
    });
  } catch (error) {
    console.error('Creating maintenance record error:', error);
    return res.status(500).json({ error: 'Creating maintenance record failed' });
  }
});

// PUT update maintenance record
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { equipment_name, maintenance_type, description, scheduled_date, completed_date, status, assigned_to, cost } = req.body;

  const query = 'UPDATE equipment_maintenance_tbl SET equipment_name = ?, maintenance_type = ?, description = ?, scheduled_date = ?, completed_date = ?, status = ?, assigned_to = ?, cost = ? WHERE maintenance_id = ?';
  try {
    const result = await db.query(query, [equipment_name, maintenance_type, description, scheduled_date, completed_date, status, assigned_to, cost, id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Maintenance record not found' });
    } else {
      return res.status(200).json({ message: 'Maintenance record updated successfully' });
    }
  } catch (error) {
    console.error('Updating maintenance record error:', error);
    return res.status(500).json({ error: 'Updating maintenance record failed' });
  }
});

// PUT complete maintenance record
router.put('/:id/complete', async (req, res) => {
  const { id } = req.params;
  const { cost } = req.body;

  const query = `
    UPDATE equipment_maintenance_tbl 
    SET status = 'completed', 
        completed_date = CURDATE(),
        cost = ?
    WHERE maintenance_id = ?
  `;
  try {
    const result = await db.query(query, [cost, id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Maintenance record not found' });
    } else {
      return res.status(200).json({ message: 'Maintenance record completed successfully' });
    }
  } catch (error) {
    console.error('Completing maintenance record error:', error);
    return res.status(500).json({ error: 'Completing maintenance record failed' });
  }
});

// PUT start maintenance record
router.put('/:id/start', async (req, res) => {
  const { id } = req.params;

  const query = 'UPDATE equipment_maintenance_tbl SET status = "in_progress" WHERE maintenance_id = ?';
  try {
    const result = await db.query(query, [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Maintenance record not found' });
    } else {
      return res.status(200).json({ message: 'Maintenance record started successfully' });
    }
  } catch (error) {
    console.error('Starting maintenance record error:', error);
    return res.status(500).json({ error: 'Starting maintenance record failed' });
  }
});

// DELETE maintenance record
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const query = 'DELETE FROM equipment_maintenance_tbl WHERE maintenance_id = ?';
  try {
    const result = await db.query(query, [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Maintenance record not found' });
    } else {
      return res.status(200).json({ message: 'Maintenance record deleted successfully' });
    }
  } catch (error) {
    console.error('Deleting maintenance record error:', error);
    return res.status(500).json({ error: 'Deleting maintenance record failed' });
  }
});

module.exports = router;
