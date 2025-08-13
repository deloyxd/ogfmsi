const { Router } = require("express");
const mysqlConnection = require('../database/mysql');
const router = Router();

/* 🔥 EQUIPMENT INVENTORY ROUTES 🔥 */

// POST new equipment
router.post('/equipment', async (req, res) => {
  const { equipment_name, equipment_type, quantity, image_url, condition_status } = req.body;
  
  // Generate unique equipment ID
  const equipment_id = 'EQ_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  
  const query = 'INSERT INTO gym_equipment_tbl (equipment_id, equipment_name, equipment_type, quantity, image_url, condition_status) VALUES (?, ?, ?, ?, ?, ?)';
  
  mysqlConnection.query(query, [equipment_id, equipment_name, equipment_type, quantity, image_url, condition_status], (error, result) => {
    if (error) {
      console.error('Creating equipment error:', error);
      return res.status(500).json({ error: 'Creating equipment failed' });
    }
    res.status(201).json({ 
      message: 'Equipment created successfully', 
      result: { equipment_id, equipment_name, equipment_type, quantity }
    });
  });
});

// GET all equipment
router.get('/equipment', async (req, res) => {
  const query = 'SELECT * FROM gym_equipment_tbl ORDER BY created_at DESC';
  mysqlConnection.query(query, (error, result) => {
    if (error) {
      console.error('Fetching equipment error:', error);
      return res.status(500).json({ error: 'Fetching equipment failed' });
    }
    res.status(200).json({ message: 'Fetching equipment successful', result: result });
  });
});

// GET single equipment
router.get('/equipment/:id', async (req, res) => {
  const { id } = req.params;
  const query = 'SELECT * FROM gym_equipment_tbl WHERE equipment_id = ?';
  mysqlConnection.query(query, [id], (error, result) => {
    if (error) {
      console.error('Fetching equipment error:', error);
      return res.status(500).json({ error: 'Fetching equipment failed' });
    }
    if (!result || result.length === 0) {
      return res.status(404).json({ error: 'Equipment not found' });
    } else {
      res.status(200).json({ message: 'Fetching equipment successful', result: result[0] });
    }
  });
});

// PUT update equipment
router.put('/equipment/:id', async (req, res) => {
  const { id } = req.params;
  const { equipment_name, equipment_type, quantity, image_url, condition_status, notes } = req.body;
  
  const query = 'UPDATE gym_equipment_tbl SET equipment_name = ?, equipment_type = ?, quantity = ?, image_url = ?, condition_status = ?, notes = ? WHERE equipment_id = ?';
  
  mysqlConnection.query(query, [equipment_name, equipment_type, quantity, image_url, condition_status, notes, id], (error, result) => {
    if (error) {
      console.error('Updating equipment error:', error);
      return res.status(500).json({ error: 'Updating equipment failed' })
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Equipment not found' }); 
    } else {
      res.status(200).json({ message: 'Equipment updated successfully' });
    }
  });
});

// DELETE equipment
router.delete('/equipment/:id', async (req, res) => {
  const { id } = req.params;
  const query = 'DELETE FROM gym_equipment_tbl WHERE equipment_id = ?';
  
  mysqlConnection.query(query, [id], (error, result) => {
    if (error) {
      console.error('Deleting equipment error:', error);
      return res.status(500).json({ error: 'Deleting equipment failed' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Equipment not found' });
    } else {
      res.status(200).json({ message: 'Equipment deleted successfully' });
    }
  });
});

/* 🔥 Equipment Maintenance Routes 🔥 */

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

// ===== STATISTICS =====
// GET maintenance statistics
router.get('/stats/overview', async (req, res) => {
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
  
  mysqlConnection.query(query, (error, result) => {
    if (error) {
      console.error('Fetching maintenance stats error:', error);
      res.status(500).json({ error: 'Fetching maintenance stats failed' });
    }
    res.status(200).json({ message: 'Fetching maintenance stats successful', result: result[0] });
  });
});

// GET maintenance by type statistics
router.get('/stats/by-type', async (req, res) => {
  const query = `
    SELECT 
      maintenance_type,
      COUNT(*) as count,
      SUM(cost) as total_cost,
      AVG(cost) as average_cost
    FROM equipment_maintenance_tbl
    GROUP BY maintenance_type
  `;
  
  mysqlConnection.query(query, (error, result) => {
    if (error) {
      console.error('Fetching maintenance by type stats error:', error);
      res.status(500).json({ error: 'Fetching maintenance by type stats failed' });
    }
    res.status(200).json({ message: 'Fetching maintenance by type stats successful', result: result });
  });
});

// GET upcoming maintenance (next 30 days)
router.get('/stats/upcoming', async (req, res) => {
  const query = `
    SELECT * FROM equipment_maintenance_tbl 
    WHERE status IN ('scheduled', 'in_progress')
    AND scheduled_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
    ORDER BY scheduled_date ASC
  `;
  
  mysqlConnection.query(query, (error, result) => {
    if (error) {
      console.error('Fetching upcoming maintenance error:', error);
      res.status(500).json({ error: 'Fetching upcoming maintenance failed' });
    }
    res.status(200).json({ message: 'Fetching upcoming maintenance successful', result: result });
  });
});

module.exports = router;
