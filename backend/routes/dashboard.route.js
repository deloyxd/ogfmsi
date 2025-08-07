const { Router } = require("express");
const mysqlConnection = require('../database/mysql');
const router = Router();

/* 🔥 Dashboard Statistics & Reports Routes 🔥 */

// ===== DASHBOARD OVERVIEW STATS =====
// GET dashboard overview statistics
router.get('/overview', async (req, res) => {
  try {
    // Get today's sales
    const todaySalesQuery = `
      SELECT 
        COUNT(*) as total_transactions,
        SUM(amount) as total_revenue
      FROM admin_sales_tbl 
      WHERE DATE(time_stamp) = CURDATE()
    `;
    
    // Get today's check-ins
    const todayCheckinsQuery = `
      SELECT 
        COUNT(*) as total_checkins,
        COUNT(DISTINCT user_id) as unique_users
      FROM daily_checkins_tbl 
      WHERE checkin_date = CURDATE()
    `;
    
    // Get active monthly passes
    const activePassesQuery = `
      SELECT COUNT(*) as active_passes
      FROM monthly_passes_tbl 
      WHERE status = 'active' AND end_date >= CURDATE()
    `;
    
    // Get low stock products
    const lowStockQuery = `
      SELECT COUNT(*) as low_stock_count
      FROM store_products_tbl 
      WHERE status IN ('Low Stock', 'Out of Stock')
    `;
    
    // Get pending maintenance
    const pendingMaintenanceQuery = `
      SELECT COUNT(*) as pending_maintenance
      FROM equipment_maintenance_tbl 
      WHERE status IN ('scheduled', 'in_progress')
    `;
    
    // Execute all queries
    mysqlConnection.query(todaySalesQuery, (salesError, salesResult) => {
      if (salesError) {
        console.error('Fetching sales stats error:', salesError);
        return res.status(500).json({ error: 'Fetching sales stats failed' });
      }
      
      mysqlConnection.query(todayCheckinsQuery, (checkinsError, checkinsResult) => {
        if (checkinsError) {
          console.error('Fetching check-ins stats error:', checkinsError);
          return res.status(500).json({ error: 'Fetching check-ins stats failed' });
        }
        
        mysqlConnection.query(activePassesQuery, (passesError, passesResult) => {
          if (passesError) {
            console.error('Fetching passes stats error:', passesError);
            return res.status(500).json({ error: 'Fetching passes stats failed' });
          }
          
          mysqlConnection.query(lowStockQuery, (stockError, stockResult) => {
            if (stockError) {
              console.error('Fetching stock stats error:', stockError);
              return res.status(500).json({ error: 'Fetching stock stats failed' });
            }
            
            mysqlConnection.query(pendingMaintenanceQuery, (maintenanceError, maintenanceResult) => {
              if (maintenanceError) {
                console.error('Fetching maintenance stats error:', maintenanceError);
                return res.status(500).json({ error: 'Fetching maintenance stats failed' });
              }
              
              const overview = {
                sales: salesResult[0] || { total_transactions: 0, total_revenue: 0 },
                checkins: checkinsResult[0] || { total_checkins: 0, unique_users: 0 },
                passes: passesResult[0] || { active_passes: 0 },
                inventory: stockResult[0] || { low_stock_count: 0 },
                maintenance: maintenanceResult[0] || { pending_maintenance: 0 }
              };
              
              res.status(200).json({ 
                message: 'Dashboard overview stats fetched successfully', 
                result: overview 
              });
            });
          });
        });
      });
    });
  } catch (error) {
    console.error('Dashboard overview error:', error);
    res.status(500).json({ error: 'Dashboard overview failed' });
  }
});

// ===== SALES STATISTICS =====
// GET sales statistics by period
router.get('/sales/:period', async (req, res) => {
  const { period } = req.params;
  let dateCondition = '';
  
  switch (period) {
    case 'today':
      dateCondition = 'WHERE DATE(time_stamp) = CURDATE()';
      break;
    case 'week':
      dateCondition = 'WHERE time_stamp >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
      break;
    case 'month':
      dateCondition = 'WHERE time_stamp >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
      break;
    case 'year':
      dateCondition = 'WHERE time_stamp >= DATE_SUB(CURDATE(), INTERVAL 1 YEAR)';
      break;
    default:
      dateCondition = 'WHERE DATE(time_stamp) = CURDATE()';
  }
  
  const query = `
    SELECT 
      COUNT(*) as total_transactions,
      SUM(amount) as total_revenue,
      AVG(amount) as average_transaction,
      MIN(amount) as min_transaction,
      MAX(amount) as max_transaction
    FROM admin_sales_tbl 
    ${dateCondition}
  `;
  
  mysqlConnection.query(query, (error, result) => {
    if (error) {
      console.error('Fetching sales stats error:', error);
      res.status(500).json({ error: 'Fetching sales stats failed' });
    }
    res.status(200).json({ message: 'Fetching sales stats successful', result: result[0] });
  });
});

// GET sales by day (last 30 days)
router.get('/sales/daily/chart', async (req, res) => {
  const query = `
    SELECT 
      DATE(time_stamp) as date,
      COUNT(*) as transactions,
      SUM(amount) as revenue
    FROM admin_sales_tbl 
    WHERE time_stamp >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    GROUP BY DATE(time_stamp)
    ORDER BY date ASC
  `;
  
  mysqlConnection.query(query, (error, result) => {
    if (error) {
      console.error('Fetching daily sales chart error:', error);
      res.status(500).json({ error: 'Fetching daily sales chart failed' });
    }
    res.status(200).json({ message: 'Fetching daily sales chart successful', result: result });
  });
});

// ===== CHECK-IN STATISTICS =====
// GET check-in statistics by period
router.get('/checkins/:period', async (req, res) => {
  const { period } = req.params;
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
      COUNT(DISTINCT user_id) as unique_users,
      SUM(amount_paid) as total_revenue,
      AVG(amount_paid) as average_payment
    FROM daily_checkins_tbl 
    ${dateCondition}
  `;
  
  mysqlConnection.query(query, (error, result) => {
    if (error) {
      console.error('Fetching check-in stats error:', error);
      res.status(500).json({ error: 'Fetching check-in stats failed' });
    }
    res.status(200).json({ message: 'Fetching check-in stats successful', result: result[0] });
  });
});

// GET check-ins by hour (today)
router.get('/checkins/hourly/today', async (req, res) => {
  const query = `
    SELECT 
      HOUR(checkin_time) as hour,
      COUNT(*) as checkins
    FROM daily_checkins_tbl 
    WHERE checkin_date = CURDATE()
    GROUP BY HOUR(checkin_time)
    ORDER BY hour ASC
  `;
  
  mysqlConnection.query(query, (error, result) => {
    if (error) {
      console.error('Fetching hourly check-ins error:', error);
      res.status(500).json({ error: 'Fetching hourly check-ins failed' });
    }
    res.status(200).json({ message: 'Fetching hourly check-ins successful', result: result });
  });
});

// ===== MONTHLY PASSES STATISTICS =====
// GET monthly passes overview
router.get('/passes/overview', async (req, res) => {
  const query = `
    SELECT 
      COUNT(*) as total_passes,
      COUNT(CASE WHEN status = 'active' THEN 1 END) as active_passes,
      COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired_passes,
      COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_passes,
      SUM(amount) as total_revenue,
      COUNT(CASE WHEN end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 14 DAY) THEN 1 END) as expiring_soon
    FROM monthly_passes_tbl
  `;
  
  mysqlConnection.query(query, (error, result) => {
    if (error) {
      console.error('Fetching passes overview error:', error);
      res.status(500).json({ error: 'Fetching passes overview failed' });
    }
    res.status(200).json({ message: 'Fetching passes overview successful', result: result[0] });
  });
});

// GET passes by type
router.get('/passes/by-type', async (req, res) => {
  const query = `
    SELECT 
      pass_type,
      COUNT(*) as count,
      SUM(amount) as revenue
    FROM monthly_passes_tbl
    GROUP BY pass_type
  `;
  
  mysqlConnection.query(query, (error, result) => {
    if (error) {
      console.error('Fetching passes by type error:', error);
      res.status(500).json({ error: 'Fetching passes by type failed' });
    }
    res.status(200).json({ message: 'Fetching passes by type successful', result: result });
  });
});

// ===== INVENTORY STATISTICS =====
// GET inventory overview
router.get('/inventory/overview', async (req, res) => {
  const query = `
    SELECT 
      COUNT(*) as total_products,
      COUNT(CASE WHEN status = 'In Stock' THEN 1 END) as in_stock,
      COUNT(CASE WHEN status = 'Low Stock' THEN 1 END) as low_stock,
      COUNT(CASE WHEN status = 'Out of Stock' THEN 1 END) as out_of_stock,
      SUM(quantity) as total_quantity,
      SUM(quantity * price) as total_value
    FROM store_products_tbl
  `;
  
  mysqlConnection.query(query, (error, result) => {
    if (error) {
      console.error('Fetching inventory overview error:', error);
      res.status(500).json({ error: 'Fetching inventory overview failed' });
    }
    res.status(200).json({ message: 'Fetching inventory overview successful', result: result[0] });
  });
});

// GET inventory by type
router.get('/inventory/by-type', async (req, res) => {
  const query = `
    SELECT 
      product_type,
      COUNT(*) as count,
      SUM(quantity) as total_quantity,
      SUM(quantity * price) as total_value
    FROM store_products_tbl
    GROUP BY product_type
  `;
  
  mysqlConnection.query(query, (error, result) => {
    if (error) {
      console.error('Fetching inventory by type error:', error);
      res.status(500).json({ error: 'Fetching inventory by type failed' });
    }
    res.status(200).json({ message: 'Fetching inventory by type successful', result: result });
  });
});

// ===== MAINTENANCE STATISTICS =====
// GET maintenance overview
router.get('/maintenance/overview', async (req, res) => {
  const query = `
    SELECT 
      COUNT(*) as total_maintenance,
      COUNT(CASE WHEN status = 'scheduled' THEN 1 END) as scheduled,
      COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
      COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue,
      SUM(cost) as total_cost
    FROM equipment_maintenance_tbl
  `;
  
  mysqlConnection.query(query, (error, result) => {
    if (error) {
      console.error('Fetching maintenance overview error:', error);
      res.status(500).json({ error: 'Fetching maintenance overview failed' });
    }
    res.status(200).json({ message: 'Fetching maintenance overview successful', result: result[0] });
  });
});

// ===== REPORTS =====
// GET comprehensive report
router.get('/reports/comprehensive', async (req, res) => {
  const { start_date, end_date } = req.query;
  
  let dateCondition = '';
  if (start_date && end_date) {
    dateCondition = `WHERE DATE(time_stamp) BETWEEN '${start_date}' AND '${end_date}'`;
  }
  
  // Sales report
  const salesQuery = `
    SELECT 
      COUNT(*) as total_transactions,
      SUM(amount) as total_revenue,
      AVG(amount) as average_transaction
    FROM admin_sales_tbl 
    ${dateCondition}
  `;
  
  // Check-ins report
  const checkinsQuery = `
    SELECT 
      COUNT(*) as total_checkins,
      COUNT(DISTINCT user_id) as unique_users,
      SUM(amount_paid) as total_revenue
    FROM daily_checkins_tbl 
    ${dateCondition.replace('time_stamp', 'checkin_date')}
  `;
  
  // Passes report
  const passesQuery = `
    SELECT 
      COUNT(*) as total_passes,
      SUM(amount) as total_revenue
    FROM monthly_passes_tbl 
    WHERE created_at BETWEEN '${start_date || '2024-01-01'}' AND '${end_date || '2024-12-31'}'
  `;
  
  mysqlConnection.query(salesQuery, (salesError, salesResult) => {
    if (salesError) {
      console.error('Fetching sales report error:', salesError);
      return res.status(500).json({ error: 'Fetching sales report failed' });
    }
    
    mysqlConnection.query(checkinsQuery, (checkinsError, checkinsResult) => {
      if (checkinsError) {
        console.error('Fetching check-ins report error:', checkinsError);
        return res.status(500).json({ error: 'Fetching check-ins report failed' });
      }
      
      mysqlConnection.query(passesQuery, (passesError, passesResult) => {
        if (passesError) {
          console.error('Fetching passes report error:', passesError);
          return res.status(500).json({ error: 'Fetching passes report failed' });
        }
        
        const report = {
          period: { start_date, end_date },
          sales: salesResult[0] || { total_transactions: 0, total_revenue: 0, average_transaction: 0 },
          checkins: checkinsResult[0] || { total_checkins: 0, unique_users: 0, total_revenue: 0 },
          passes: passesResult[0] || { total_passes: 0, total_revenue: 0 }
        };
        
        res.status(200).json({ 
          message: 'Comprehensive report generated successfully', 
          result: report 
        });
      });
    });
  });
});

module.exports = router;
