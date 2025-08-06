const { Router } = require("express");
const mysqlConnection = require('../database/mysql');
const router = Router();


/* 🔥 Sales route 🔥 */


//API URL: (host):(port)/api/sales METHOD:GET
router.get('/', async (req, res) => {
  const query = 'SELECT * FROM admin_sales_tbl LIMIT 10;';
  mysqlConnection.query(query, (error, result) => {
    if (error) {
      console.error('Fetching sales error:', error);
      res.status(500).json({ error: 'Fetching sales failed' });
    }
    res.status(201).json({ message: 'Fetching sales successful', result: result });
  });
});

router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const query = 'SELECT * FROM admin_sales_tbl WHERE id = ?;';
  mysqlConnection.query(query, [id], (error, result) => {
    if (error) {
      console.error('Fetching sales error:', error);
      res.status(500).json({ error: 'Fetching sales failed' });
    }
    res.status(201).json({ message: 'Fetching sales successful', result: result });
  });
});
//API URL: (host):(port)/api/sales METHOD: POST
router.post('/', async (req, res) => {
    
  const query = 'INSERT INTO admin_sales_tbl (purpose, amount, time_stamp) VALUES (?, ?, NOW())';
  const { purpose, amount } = req.body;

  mysqlConnection.query(query, [purpose, amount], (error, result) => {
    if (error) {
      console.error('Inserting sales error:', error);
      res.status(500).json({ error: 'Inserting sales failed' });
    }
    res.status(201).json({ message: 'Inserting sales successful', result: result });
  });
});

module.exports = router;