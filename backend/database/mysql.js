// Load environment variables
// Note: Keeping original env path behavior to preserve existing configuration resolution
require('dotenv').config({ path: '../.env' });

const mysql = require('mysql2/promise');
const { addDbDuration } = require('../utils/request-context');

const SLOW_QUERY_MS = Number(process.env.SLOW_QUERY_MS || 200);

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
 * Internal: truncate SQL for logging
 * @param {string} sql
 * @param {number} [max=200]
 */
function truncateSql(sql, max = 200) {
  if (typeof sql !== 'string') return '';
  const normalized = sql.replace(/\s+/g, ' ').trim();
  return normalized.length > max ? normalized.slice(0, max) + '…' : normalized;
}

/**
 * Internal: log slow queries at WARN level
 * @param {string} sql
 * @param {any[]} params
 * @param {number} ms
 */
function logSlow(sql, params, ms) {
  try {
    const binds = Array.isArray(params) ? params.length : (params && typeof params === 'object' ? Object.keys(params).length : 0);
    // Avoid dumping large/binary params; just include bind count.
    console.warn(`[DB SLOW ${ms.toFixed(1)}ms] ${truncateSql(sql)} | binds=${binds}`);
  } catch (_) {
    // no-op
  }
}

/**
 * Internal: time a query executor and aggregate DB duration into request context
 * executor signature: (sql, params) => Promise<[rows, fields]>
 * @param {(sql:string, params:any[])=>Promise<any>} executor
 * @param {string} sql
 * @param {any[]} [params=[]]
 * @returns {Promise<[any, any]>} [rows, fields]
 */
async function timeAndRun(executor, sql, params = []) {
  const useHr = typeof process.hrtime.bigint === 'function';
  const start = useHr ? process.hrtime.bigint() : null;
  try {
    const result = await executor(sql, params);
    if (start) {
      const durMs = Number(process.hrtime.bigint() - start) / 1e6;
      addDbDuration(durMs);
      if (durMs >= SLOW_QUERY_MS) {
        logSlow(sql, params, durMs);
      }
    }
    return result;
  } catch (err) {
    if (start) {
      const durMs = Number(process.hrtime.bigint() - start) / 1e6;
      addDbDuration(durMs);
    }
    throw err;
  }
}

/**
 * Thin helper that awaits pool.query and returns rows only.
 * @param {string} sql
 * @param {any[]} [params=[]]
 * @returns {Promise<any[]>} rows
 */
async function query(sql, params = []) {
  const [rows/*, fields*/] = await timeAndRun((s, p) => pool.query(s, p), sql, params);
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
  const conn = await pool.getConnection();

  // Wrap conn.query to include timing and slow-log, preserving return shape [rows, fields]
  const originalQuery = conn.query.bind(conn);
  conn.query = async (sql, params = []) => {
    return timeAndRun(originalQuery, sql, params);
  };

  return conn;
}

module.exports = {
  pool,
  query,
  getConnection,
};