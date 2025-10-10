// Load environment variables
// Note: Keeping original env path behavior to preserve existing configuration resolution
require('dotenv').config({ path: '../.env' });

const mysql = require('mysql2/promise');

/**
 * Shared MySQL promise-based connection pool
 * Defaults chosen to avoid head-of-line blocking and improve concurrency.
 *
 * Pool settings:
 * - connectionLimit: 15
 * - waitForConnections: true
 * - queueLimit: 0 (unbounded queue; lets Node backpressure handle)
 * - enableKeepAlive: true
 * - keepAliveInitialDelay: 0
 * - supportBigNumbers: true
 * - bigNumberStrings: true
 *
 * Host/user/password/database/port values are sourced from existing environment variables.
 */
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,

  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0,

  enableKeepAlive: true,
  keepAliveInitialDelay: 0,

  supportBigNumbers: true,
  bigNumberStrings: true,
});

/**
 * Thin helper that awaits pool.query and returns rows only.
 * @param {string} sql
 * @param {any[]} [params=[]]
 * @returns {Promise<any[]>} rows
 */
async function query(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

/**
 * Get a pooled connection for transactional use.
 *
 * Example usage:
 * const conn = await getConnection();
 * try {
 *   await conn.beginTransaction();
 *   const [rows] = await conn.query('SELECT 1');
 *   await conn.commit();
 *   // send response here
 * } catch (err) {
 *   try { await conn.rollback(); } catch(_) {}
 *   // handle error / send error response here
 * } finally {
 *   conn.release();
 * }
 *
 * @returns {Promise<import('mysql2/promise').PoolConnection>}
 */
async function getConnection() {
  return pool.getConnection();
}

module.exports = {
  pool,
  query,
  getConnection,
};