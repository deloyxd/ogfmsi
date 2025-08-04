/* 👇 Default: Do not modify 👇 */

require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const mysqlConnection = require('./database/mysql');
const app = express();
const PORT = process.env.PORT || 5501;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

app.use(bodyParser.json());

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use((req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.path}`);
  next();
});

/* 👆 Default: Do not modify 👆 */

/* 🔥 Sales route 🔥 */

app.get('/api/sales', async (req, res) => {
  const query = 'SELECT * FROM admin_sales_tbl LIMIT 10;';

  mysqlConnection.query(query, (error, result) => {
    if (error) {
      console.error('Fetching sales error:', error);
      res.status(500).json({ error: 'Fetching sales failed' });
    }
    res.status(201).json({ message: 'Fetching sales successful', result: result });
  });
});

app.post('/api/sales', async (req, res) => {
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
