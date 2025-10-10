'use strict';

/**
 * Index Migration Runner
 * - Reuses shared pool from backend/database/mysql.js
 * - Checks information_schema for each index before ALTER TABLE ADD INDEX
 * - Skips gracefully if table/column is missing
 * - Idempotent and safe to run multiple times
 * - Concise logging and non-zero exit on unexpected SQL errors
 */

const { pool, query } = require('./mysql');

// Define the exact index set to apply (names and columns must match)
const INDEX_DEFS = [
  // ecommerce_products_tbl
  { table: 'ecommerce_products_tbl', index: 'idx_products_created_at', columns: ['created_at'] },
  { table: 'ecommerce_products_tbl', index: 'idx_products_category_created', columns: ['category', 'created_at'] },
  { table: 'ecommerce_products_tbl', index: 'idx_products_stock_status', columns: ['stock_status'] },

  // ecommerce_cart_tbl
  { table: 'ecommerce_cart_tbl', index: 'idx_cart_session_created', columns: ['session_id', 'created_at'] },

  // ecommerce_orders_tbl
  { table: 'ecommerce_orders_tbl', index: 'idx_orders_created', columns: ['created_at'] },
  { table: 'ecommerce_orders_tbl', index: 'idx_orders_status_created', columns: ['status', 'created_at'] },

  // ecommerce_order_items_tbl
  { table: 'ecommerce_order_items_tbl', index: 'idx_order_items_order_id', columns: ['order_id'] },
  { table: 'ecommerce_order_items_tbl', index: 'idx_order_items_product', columns: ['product_id'] },

  // gym_equipment_tbl
  { table: 'gym_equipment_tbl', index: 'idx_equipment_created', columns: ['created_at'] },

  // gym_equipment_items_tbl
  { table: 'gym_equipment_items_tbl', index: 'idx_items_equipment_itemcode', columns: ['equipment_id', 'item_code'] },
  { table: 'gym_equipment_items_tbl', index: 'idx_items_equipment_status', columns: ['equipment_id', 'individual_status'] },

  // equipment_maintenance_tbl
  { table: 'equipment_maintenance_tbl', index: 'idx_maint_scheduled', columns: ['scheduled_date'] },
  { table: 'equipment_maintenance_tbl', index: 'idx_maint_status_sched', columns: ['status', 'scheduled_date'] },
  { table: 'equipment_maintenance_tbl', index: 'idx_maint_created', columns: ['created_at'] },

  // customer_tbl
  { table: 'customer_tbl', index: 'idx_customer_created', columns: ['created_at'] },

  // customer_monthly_tbl
  { table: 'customer_monthly_tbl', index: 'idx_cust_monthly_enddate', columns: ['customer_end_date'] },
  { table: 'customer_monthly_tbl', index: 'idx_cust_monthly_customer', columns: ['customer_id'] },

  // inquiry_checkins_regular_tbl
  { table: 'inquiry_checkins_regular_tbl', index: 'idx_checkins_regular_created', columns: ['created_at'] },

  // inquiry_checkins_monthly_tbl
  { table: 'inquiry_checkins_monthly_tbl', index: 'idx_checkins_monthly_created', columns: ['created_at'] },

  // payment_tbl
  { table: 'payment_tbl', index: 'idx_payment_type_created', columns: ['payment_type', 'created_at'] },
  { table: 'payment_tbl', index: 'idx_payment_customer', columns: ['payment_customer_id'] },
];

async function tableExists(table) {
  const rows = await query(
    'SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ? LIMIT 1',
    [table]
  );
  return rows.length > 0;
}

async function columnsMissing(table, columns) {
  if (!columns || columns.length === 0) return [];
  const missing = [];
  for (const col of columns) {
    const rows = await query(
      'SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ? LIMIT 1',
      [table, col]
    );
    if (rows.length === 0) {
      missing.push(col);
    }
  }
  return missing;
}

async function indexExists(table, index) {
  const rows = await query(
    'SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ? LIMIT 1',
    [table, index]
  );
  return rows.length > 0;
}

function fmtCols(cols) {
  return cols.map((c) => '`' + c + '`').join(', ');
}

async function addIndex(def) {
  const sql = `ALTER TABLE \`${def.table}\` ADD INDEX \`${def.index}\` (${fmtCols(def.columns)})`;
  // Use pool.query directly to get error objects with codes
  await pool.query(sql);
}

async function run() {
  console.log('==> Running DB index migration (information_schema-guarded)');

  let created = 0;
  let exists = 0;
  let skipped = 0;
  let warnings = 0;
  let fatalError = null;

  for (const def of INDEX_DEFS) {
    try {
      // 1) Check table exists
      const hasTable = await tableExists(def.table);
      if (!hasTable) {
        console.warn(`[SKIP] ${def.table}.${def.index} - table not found`);
        skipped++;
        continue;
      }

      // 2) Check columns present
      const missing = await columnsMissing(def.table, def.columns);
      if (missing.length > 0) {
        console.warn(
          `[SKIP] ${def.table}.${def.index} - missing column(s): ${missing.join(', ')}`
        );
        skipped++;
        continue;
      }

      // 3) Check index existence
      const hasIndex = await indexExists(def.table, def.index);
      if (hasIndex) {
        console.log(`[EXISTS] ${def.table}.${def.index}`);
        exists++;
        continue;
      }

      // 4) Create index
      await addIndex(def);
      console.log(
        `[ADDED] ${def.table}.${def.index} (${def.columns.join(', ')})`
      );
      created++;
    } catch (err) {
      // MySQL error codes to treat as non-fatal skips/warns where appropriate
      const code = err && (err.code || err.errno);
      // Duplicate index name
      if (code === 'ER_DUP_KEYNAME' || code === 1061) {
        console.log(`[EXISTS] ${def.table}.${def.index} (detected during ALTER)`);
        exists++;
        continue;
      }
      // Unknown table
      if (code === 'ER_NO_SUCH_TABLE' || code === 1146) {
        console.warn(`[SKIP] ${def.table}.${def.index} - table not found during ALTER`);
        skipped++;
        continue;
      }
      // Unknown column
      if (code === 'ER_BAD_FIELD_ERROR' || code === 1054) {
        console.warn(`[SKIP] ${def.table}.${def.index} - column missing during ALTER`);
        skipped++;
        continue;
      }

      // Unexpected error - mark fatal but continue to attempt clean shutdown
      warnings++;
      console.error(
        `[ERROR] ${def.table}.${def.index} - unexpected SQL error (${code || 'unknown'}): ${err.message}`
      );
      // Capture first fatal error to set exit code at end
      if (!fatalError) fatalError = err;
    }
  }

  console.log('==> Migration summary:');
  console.log(`    added: ${created}, exists: ${exists}, skipped: ${skipped}, errors: ${warnings}`);

  try {
    await pool.end();
  } catch (_) {
    // ignore pool end errors
  }

  if (fatalError) {
    process.exitCode = 1;
  } else {
    process.exitCode = 0;
  }
}

run().catch(async (err) => {
  console.error(`[FATAL] Migration runner crashed: ${err.message}`);
  try { await pool.end(); } catch (_) {}
  process.exit(1);
});