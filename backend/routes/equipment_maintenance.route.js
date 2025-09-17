const { Router } = require("express");
const mysqlConnection = require('../database/mysql');
const router = Router();

/* 🔥 EQUIPMENT MAINTENANCE ROUTES 🔥 */

// GET all maintenance records
router.get('/', async (req, res) => {
  const query = 'SELECT * FROM equipment_maintenance_tbl ORDER BY scheduled_date ASC, created_at DESC';
  mysqlConnection.query(query, (error, result) => {
    if (error) {
      console.error('Fetching maintenance records error:', error);
      res.status(500).json({ error: 'Fetching maintenance records failed' });
    }
    res.status(200).json({ message: 'Fetching maintenance records successful', result: result });
  });
});

// GET maintenance records by status
router.get('/status/:status', async (req, res) => {
  const { status } = req.params;
  const query = 'SELECT * FROM equipment_maintenance_tbl WHERE status = ? ORDER BY scheduled_date ASC';
  mysqlConnection.query(query, [status], (error, result) => {
    if (error) {
      console.error('Fetching maintenance records by status error:', error);
      res.status(500).json({ error: 'Fetching maintenance records by status failed' });
    }
    res.status(200).json({ message: 'Fetching maintenance records by status successful', result: result });
  });
});

// GET overdue maintenance records
router.get('/overdue', async (req, res) => {
  const query = `
    SELECT * FROM equipment_maintenance_tbl 
    WHERE status IN ('scheduled', 'in_progress') 
    AND scheduled_date < CURDATE()
    ORDER BY scheduled_date ASC
  `;
  mysqlConnection.query(query, (error, result) => {
    if (error) {
      console.error('Fetching overdue maintenance records error:', error);
      res.status(500).json({ error: 'Fetching overdue maintenance records failed' });
    }
    res.status(200).json({ message: 'Fetching overdue maintenance records successful', result: result });
  });
});

// GET single maintenance record
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const query = 'SELECT * FROM equipment_maintenance_tbl WHERE maintenance_id = ?';
  mysqlConnection.query(query, [id], (error, result) => {
    if (error) {
      console.error('Fetching maintenance record error:', error);
      res.status(500).json({ error: 'Fetching maintenance record failed' });
    }
    if (!result || result.length === 0) {
      res.status(404).json({ error: 'Maintenance record not found' });
    } else {
      res.status(200).json({ message: 'Fetching maintenance record successful', result: result[0] });
    }
  });
});

// POST new maintenance record
router.post('/', async (req, res) => {
  const { equipment_name, maintenance_type, description, scheduled_date, assigned_to, cost } = req.body;
  
  // Generate unique maintenance ID
  const maintenance_id = 'MAINT_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  
  const query = 'INSERT INTO equipment_maintenance_tbl (maintenance_id, equipment_name, maintenance_type, description, scheduled_date, assigned_to, cost) VALUES (?, ?, ?, ?, ?, ?, ?)';
  
  mysqlConnection.query(query, [maintenance_id, equipment_name, maintenance_type, description, scheduled_date, assigned_to, cost], (error, result) => {
    if (error) {
      console.error('Creating maintenance record error:', error);
      res.status(500).json({ error: 'Creating maintenance record failed' });
    }
    res.status(201).json({ 
      message: 'Maintenance record created successfully', 
      result: { maintenance_id, equipment_name, maintenance_type, scheduled_date }
    });
  });
});

// PUT update maintenance record
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { equipment_name, maintenance_type, description, scheduled_date, completed_date, status, assigned_to, cost } = req.body;
  
  const query = 'UPDATE equipment_maintenance_tbl SET equipment_name = ?, maintenance_type = ?, description = ?, scheduled_date = ?, completed_date = ?, status = ?, assigned_to = ?, cost = ? WHERE maintenance_id = ?';
  
  mysqlConnection.query(query, [equipment_name, maintenance_type, description, scheduled_date, completed_date, status, assigned_to, cost, id], (error, result) => {
    if (error) {
      console.error('Updating maintenance record error:', error);
      res.status(500).json({ error: 'Updating maintenance record failed' });
    }
    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Maintenance record not found' });
    } else {
      res.status(200).json({ message: 'Maintenance record updated successfully' });
    }
  });
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
  
  mysqlConnection.query(query, [cost, id], (error, result) => {
    if (error) {
      console.error('Completing maintenance record error:', error);
      res.status(500).json({ error: 'Completing maintenance record failed' });
    }
    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Maintenance record not found' });
    } else {
      res.status(200).json({ message: 'Maintenance record completed successfully' });
    }
  });
});

// PUT start maintenance record
router.put('/:id/start', async (req, res) => {
  const { id } = req.params;
  
  const query = 'UPDATE equipment_maintenance_tbl SET status = "in_progress" WHERE maintenance_id = ?';
  
  mysqlConnection.query(query, [id], (error, result) => {
    if (error) {
      console.error('Starting maintenance record error:', error);
      res.status(500).json({ error: 'Starting maintenance record failed' });
    }
    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Maintenance record not found' });
    } else {
      res.status(200).json({ message: 'Maintenance record started successfully' });
    }
  });
});

// DELETE maintenance record
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const query = 'DELETE FROM equipment_maintenance_tbl WHERE maintenance_id = ?';
  
  mysqlConnection.query(query, [id], (error, result) => {
    if (error) {
      console.error('Deleting maintenance record error:', error);
      res.status(500).json({ error: 'Deleting maintenance record failed' });
    }
    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Maintenance record not found' });
    } else {
      res.status(200).json({ message: 'Maintenance record deleted successfully' });
    }
  });
});

module.exports = router;
