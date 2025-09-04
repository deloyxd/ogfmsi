// Load environment variables
require('dotenv').config({ path: '../.env' });

const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
});

connection.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL database:', err);
    return;
  }
  console.log(`✅ Successfully connected to the MySQL database`);
  console.log('Database name:', process.env.DB_NAME);
  console.log('Connection ID:', connection.threadId);
  console.log('Host:', process.env.DB_HOST);
});

module.exports = connection;