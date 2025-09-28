const { Router } = require('express');
const mysqlConnection = require('../database/mysql');
const router = Router();

// Regular Check-Ins Logbook
router.get('/checkins/regular', async (req, res) => {
  const query = 'SELECT * FROM inquiry_checkins_regular_tbl ORDER BY created_at DESC';
  mysqlConnection.query(query, (error, result) => {
    if (error) {
      console.error('Fetching regular check-ins error:', error);
      return res.status(500).json({ error: 'Fetching regular check-ins failed' });
    }
    res.status(200).json({ message: 'Fetching regular check-ins successful', result });
  });
});

router.post('/checkins/regular', async (req, res) => {
  const { checkin_id, customer_id, customer_name_encoded, customer_contact, customer_image_url, transaction_id } =
    req.body;

  const query = `
    INSERT INTO inquiry_checkins_regular_tbl 
      (checkin_id, customer_id, customer_name_encoded, customer_contact, customer_image_url, transaction_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  mysqlConnection.query(
    query,
    [checkin_id, customer_id, customer_name_encoded, customer_contact, customer_image_url, transaction_id],
    (error) => {
      if (error) {
        console.error('Creating regular check-in error:', error);
        return res.status(500).json({ error: 'Creating regular check-in failed' });
      }
      res.status(201).json({ message: 'Regular check-in created successfully' });
    }
  );
});

// Monthly Check-Ins Logbook
router.get('/checkins/monthly', async (req, res) => {
  const query = 'SELECT * FROM inquiry_checkins_monthly_tbl ORDER BY created_at DESC';
  mysqlConnection.query(query, (error, result) => {
    if (error) {
      console.error('Fetching monthly check-ins error:', error);
      return res.status(500).json({ error: 'Fetching monthly check-ins failed' });
    }
    res.status(200).json({ message: 'Fetching monthly check-ins successful', result });
  });
});

router.post('/checkins/monthly', async (req, res) => {
  const { checkin_id, customer_id, customer_name_encoded, customer_contact, customer_image_url, transaction_id } =
    req.body;

  const query = `
    INSERT INTO inquiry_checkins_monthly_tbl 
      (checkin_id, customer_id, customer_name_encoded, customer_contact, customer_image_url, transaction_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  mysqlConnection.query(
    query,
    [checkin_id, customer_id, customer_name_encoded, customer_contact, customer_image_url, transaction_id],
    (error) => {
      if (error) {
        console.error('Creating monthly check-in error:', error);
        return res.status(500).json({ error: 'Creating monthly check-in failed' });
      }
      res.status(201).json({ message: 'Monthly check-in created successfully' });
    }
  );
});

// Delete Regular Check-In
router.delete('/checkins/regular/:checkinId', async (req, res) => {
  const { checkinId } = req.params;
  const query = 'DELETE FROM inquiry_checkins_regular_tbl WHERE checkin_id = ?';
  
  mysqlConnection.query(query, [checkinId], (error) => {
    if (error) {
      console.error('Deleting regular check-in error:', error);
      return res.status(500).json({ error: 'Deleting regular check-in failed' });
    }
    res.status(200).json({ message: 'Regular check-in deleted successfully' });
  });
});

// Clear All Monthly Check-Ins (for midnight reset)
router.delete('/checkins/monthly/clear', async (req, res) => {
  const query = 'DELETE FROM inquiry_checkins_monthly_tbl';
  
  mysqlConnection.query(query, (error) => {
    if (error) {
      console.error('Clearing monthly check-ins error:', error);
      return res.status(500).json({ error: 'Clearing monthly check-ins failed' });
    }
    res.status(200).json({ message: 'Monthly check-ins cleared successfully' });
  });
});

module.exports = router;


