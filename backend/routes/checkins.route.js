const { Router } = require("express");
const mysqlConnection = require('../database/mysql');
const router = Router();

/* 🔥 Daily Check-ins & Monthly Passes Routes 🔥 */

// ===== DAILY CHECK-INS =====
// GET all daily check-ins
router.get('/daily', async (req, res) => {
  const query = 'SELECT * FROM daily_checkins_tbl ORDER BY checkin_date DESC, checkin_time DESC';
  mysqlConnection.query(query, (error, result) => {
    if (error) {
      console.error('Fetching daily check-ins error:', error);
      res.status(500).json({ error: 'Fetching daily check-ins failed' });
    }
    res.status(200).json({ message: 'Fetching daily check-ins successful', result: result });
  });
});

// GET daily check-ins by date
router.get('/daily/date/:date', async (req, res) => {
  const { date } = req.params;
  const query = 'SELECT * FROM daily_checkins_tbl WHERE checkin_date = ? ORDER BY checkin_time DESC';
  mysqlConnection.query(query, [date], (error, result) => {
    if (error) {
      console.error('Fetching daily check-ins by date error:', error);
      res.status(500).json({ error: 'Fetching daily check-ins by date failed' });
    }
    res.status(200).json({ message: 'Fetching daily check-ins by date successful', result: result });
  });
});

// GET single daily check-in
router.get('/daily/:id', async (req, res) => {
  const { id } = req.params;
  const query = 'SELECT * FROM daily_checkins_tbl WHERE checkin_id = ?';
  mysqlConnection.query(query, [id], (error, result) => {
    if (error) {
      console.error('Fetching daily check-in error:', error);
      res.status(500).json({ error: 'Fetching daily check-in failed' });
    }
    if (!result || result.length === 0) {
      res.status(404).json({ error: 'Daily check-in not found' });
    } else {
      res.status(200).json({ message: 'Fetching daily check-in successful', result: result[0] });
    }
  });
});

// POST new daily check-in
router.post('/daily', async (req, res) => {
  const { user_id, user_name, checkin_date, checkin_time, checkin_type, amount_paid, processed_by } = req.body;
  
  // Generate unique check-in ID
  const checkin_id = 'CHECK_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  
  const query = 'INSERT INTO daily_checkins_tbl (checkin_id, user_id, user_name, checkin_date, checkin_time, checkin_type, amount_paid, processed_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
  
  mysqlConnection.query(query, [checkin_id, user_id, user_name, checkin_date, checkin_time, checkin_type, amount_paid, processed_by], (error, result) => {
    if (error) {
      console.error('Creating daily check-in error:', error);
      res.status(500).json({ error: 'Creating daily check-in failed' });
    }
    res.status(201).json({ 
      message: 'Daily check-in created successfully', 
      result: { checkin_id, user_id, user_name, checkin_date, checkin_time }
    });
  });
});

// PUT update daily check-in
router.put('/daily/:id', async (req, res) => {
  const { id } = req.params;
  const { user_name, checkin_date, checkin_time, checkin_type, amount_paid, status } = req.body;
  
  const query = 'UPDATE daily_checkins_tbl SET user_name = ?, checkin_date = ?, checkin_time = ?, checkin_type = ?, amount_paid = ?, status = ? WHERE checkin_id = ?';
  
  mysqlConnection.query(query, [user_name, checkin_date, checkin_time, checkin_type, amount_paid, status, id], (error, result) => {
    if (error) {
      console.error('Updating daily check-in error:', error);
      res.status(500).json({ error: 'Updating daily check-in failed' });
    }
    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Daily check-in not found' });
    } else {
      res.status(200).json({ message: 'Daily check-in updated successfully' });
    }
  });
});

// DELETE daily check-in (void)
router.delete('/daily/:id', async (req, res) => {
  const { id } = req.params;
  const query = 'UPDATE daily_checkins_tbl SET status = "voided" WHERE checkin_id = ?';
  
  mysqlConnection.query(query, [id], (error, result) => {
    if (error) {
      console.error('Voiding daily check-in error:', error);
      res.status(500).json({ error: 'Voiding daily check-in failed' });
    }
    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Daily check-in not found' });
    } else {
      res.status(200).json({ message: 'Daily check-in voided successfully' });
    }
  });
});

// ===== MONTHLY PASSES =====
// GET all monthly passes
router.get('/monthly', async (req, res) => {
  const query = 'SELECT * FROM monthly_passes_tbl ORDER BY created_at DESC';
  mysqlConnection.query(query, (error, result) => {
    if (error) {
      console.error('Fetching monthly passes error:', error);
      res.status(500).json({ error: 'Fetching monthly passes failed' });
    }
    res.status(200).json({ message: 'Fetching monthly passes successful', result: result });
  });
});

// GET active monthly passes
router.get('/monthly/active', async (req, res) => {
  const query = 'SELECT * FROM monthly_passes_tbl WHERE status = "active" AND end_date >= CURDATE() ORDER BY end_date ASC';
  mysqlConnection.query(query, (error, result) => {
    if (error) {
      console.error('Fetching active monthly passes error:', error);
      res.status(500).json({ error: 'Fetching active monthly passes failed' });
    }
    res.status(200).json({ message: 'Fetching active monthly passes successful', result: result });
  });
});

// GET expiring monthly passes (within 2 weeks)
router.get('/monthly/expiring', async (req, res) => {
  const query = `
    SELECT * FROM monthly_passes_tbl 
    WHERE status = "active" 
    AND end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 14 DAY)
    ORDER BY end_date ASC
  `;
  mysqlConnection.query(query, (error, result) => {
    if (error) {
      console.error('Fetching expiring monthly passes error:', error);
      res.status(500).json({ error: 'Fetching expiring monthly passes failed' });
    }
    res.status(200).json({ message: 'Fetching expiring monthly passes successful', result: result });
  });
});

// GET single monthly pass
router.get('/monthly/:id', async (req, res) => {
  const { id } = req.params;
  const query = 'SELECT * FROM monthly_passes_tbl WHERE pass_id = ?';
  mysqlConnection.query(query, [id], (error, result) => {
    if (error) {
      console.error('Fetching monthly pass error:', error);
      res.status(500).json({ error: 'Fetching monthly pass failed' });
    }
    if (!result || result.length === 0) {
      res.status(404).json({ error: 'Monthly pass not found' });
    } else {
      res.status(200).json({ message: 'Fetching monthly pass successful', result: result[0] });
    }
  });
});

// POST new monthly pass
router.post('/monthly', async (req, res) => {
  const { user_id, user_name, pass_type, start_date, end_date, amount, renewal_amount } = req.body;
  
  // Generate unique pass ID
  const pass_id = 'PASS_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  
  const query = 'INSERT INTO monthly_passes_tbl (pass_id, user_id, user_name, pass_type, start_date, end_date, amount, renewal_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
  
  mysqlConnection.query(query, [pass_id, user_id, user_name, pass_type, start_date, end_date, amount, renewal_amount], (error, result) => {
    if (error) {
      console.error('Creating monthly pass error:', error);
      res.status(500).json({ error: 'Creating monthly pass failed' });
    }
    res.status(201).json({ 
      message: 'Monthly pass created successfully', 
      result: { pass_id, user_id, user_name, pass_type, start_date, end_date, amount }
    });
  });
});

// PUT update monthly pass
router.put('/monthly/:id', async (req, res) => {
  const { id } = req.params;
  const { user_name, pass_type, start_date, end_date, amount, renewal_amount, status } = req.body;
  
  const query = 'UPDATE monthly_passes_tbl SET user_name = ?, pass_type = ?, start_date = ?, end_date = ?, amount = ?, renewal_amount = ?, status = ? WHERE pass_id = ?';
  
  mysqlConnection.query(query, [user_name, pass_type, start_date, end_date, amount, renewal_amount, status, id], (error, result) => {
    if (error) {
      console.error('Updating monthly pass error:', error);
      res.status(500).json({ error: 'Updating monthly pass failed' });
    }
    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Monthly pass not found' });
    } else {
      res.status(200).json({ message: 'Monthly pass updated successfully' });
    }
  });
});

// PUT renew monthly pass
router.put('/monthly/:id/renew', async (req, res) => {
  const { id } = req.params;
  const { renewal_amount } = req.body;
  
  // Calculate new dates (extend by 1 month)
  const query = `
    UPDATE monthly_passes_tbl 
    SET start_date = end_date, 
        end_date = DATE_ADD(end_date, INTERVAL 1 MONTH),
        amount = renewal_amount,
        status = 'active'
    WHERE pass_id = ?
  `;
  
  mysqlConnection.query(query, [id], (error, result) => {
    if (error) {
      console.error('Renewing monthly pass error:', error);
      res.status(500).json({ error: 'Renewing monthly pass failed' });
    }
    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Monthly pass not found' });
    } else {
      res.status(200).json({ message: 'Monthly pass renewed successfully' });
    }
  });
});

// DELETE monthly pass (cancel)
router.delete('/monthly/:id', async (req, res) => {
  const { id } = req.params;
  const query = 'UPDATE monthly_passes_tbl SET status = "cancelled" WHERE pass_id = ?';
  
  mysqlConnection.query(query, [id], (error, result) => {
    if (error) {
      console.error('Cancelling monthly pass error:', error);
      res.status(500).json({ error: 'Cancelling monthly pass failed' });
    }
    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Monthly pass not found' });
    } else {
      res.status(200).json({ message: 'Monthly pass cancelled successfully' });
    }
  });
});

// ===== STATISTICS =====
// GET daily check-in statistics
router.get('/stats/daily', async (req, res) => {
  const { period = 'today' } = req.query;
  
  let dateCondition = '';
  switch (period) {
    case 'today':
      dateCondition = 'WHERE checkin_date = CURDATE()';
      break;
    case 'week':
      dateCondition = 'WHERE checkin_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
      break;
    case 'month':
      dateCondition = 'WHERE checkin_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
      break;
    default:
      dateCondition = 'WHERE checkin_date = CURDATE()';
  }
  
  const query = `
    SELECT 
      COUNT(*) as total_checkins,
      SUM(amount_paid) as total_revenue,
      COUNT(DISTINCT user_id) as unique_users
    FROM daily_checkins_tbl 
    ${dateCondition}
  `;
  
  mysqlConnection.query(query, (error, result) => {
    if (error) {
      console.error('Fetching daily check-in stats error:', error);
      res.status(500).json({ error: 'Fetching daily check-in stats failed' });
    }
    res.status(200).json({ message: 'Fetching daily check-in stats successful', result: result[0] });
  });
});

// GET monthly pass statistics
router.get('/stats/monthly', async (req, res) => {
  const query = `
    SELECT 
      COUNT(*) as total_passes,
      COUNT(CASE WHEN status = 'active' THEN 1 END) as active_passes,
      COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired_passes,
      SUM(amount) as total_revenue,
      COUNT(CASE WHEN end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 14 DAY) THEN 1 END) as expiring_soon
    FROM monthly_passes_tbl
  `;
  
  mysqlConnection.query(query, (error, result) => {
    if (error) {
      console.error('Fetching monthly pass stats error:', error);
      res.status(500).json({ error: 'Fetching monthly pass stats failed' });
    }
    res.status(200).json({ message: 'Fetching monthly pass stats successful', result: result[0] });
  });
});

module.exports = router;
