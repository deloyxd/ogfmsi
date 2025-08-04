// Load environment variables from a .env file
require('dotenv').config();

const express = require('express');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');
const app = express();
const PORT = process.env.PORT || 5501;

// const mysqlConnection = require('./database/mysql');
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
};

const pool = mysql.createPool(dbConfig);
const handleDatabaseOperation = async (operation) => {
  const connection = await pool.getConnection();
  try {
    const result = await operation(connection);
    return result;
  } catch (error) {
    throw error;
  } finally {
    connection.release();
  }
};

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

app.get('/api/sales', async (req, res) => {
  const query = 'SELECT * FROM admin_sales_tbl LIMIT 10;';
  try {
    const result = await handleDatabaseOperation(async (connection) => {
      const [rows] = await connection.query(query);
      return rows;
    });
    res.status(201).json({ message: 'Fetching sales successful', result: result });
  } catch (error) {
    console.error('Fetching sales error:', error);
    res.status(500).json({ error: 'Fetching sales failed' });
  }
});

app.post('/api/sales', async (req, res) => {
  const query = 'INSERT INTO admin_sales_tbl (purpose, amount, time_stamp) VALUES (?, ?, NOW())';
  try {
    const { purpose, amount } = req.body;
    const result = await handleDatabaseOperation(async (connection) => {
      const [result] = await connection.query(query, [purpose, amount]);
      return result;
    });
    res.status(201).json({ message: 'Inserting sales successful', result: result });
  } catch (error) {
    console.error('Inserting sales error:', error);
    res.status(500).json({ error: 'Inserting sales failed' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
