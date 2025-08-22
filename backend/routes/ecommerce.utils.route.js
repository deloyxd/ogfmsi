const { Router } = require("express");
const mysqlConnection = require('../database/mysql');
const router = Router();

/* 🔥 E-COMMERCE UTILITY ROUTES 🔥 */

// GET product categories
router.get('/categories', async (req, res) => {
  const categories = [
    { value: 'supplements-nutrition', label: 'Supplements & Nutrition' },
    { value: 'food-meals', label: 'Food & Meals' },
    { value: 'beverages', label: 'Beverages' },
    { value: 'fitness-equipment', label: 'Fitness Equipment' },
    { value: 'apparel', label: 'Apparel' },
    { value: 'merchandise', label: 'Merchandise' },
    { value: 'other', label: 'Other' }
  ];
  
  res.status(200).json({ message: 'Categories fetched successfully', result: categories });
});

// GET measurement units
router.get('/measurement-units', async (req, res) => {
  const units = [
    // Weight
    { value: 'mg', label: 'Weight: mg' },
    { value: 'g', label: 'Weight: g' },
    { value: 'kg', label: 'Weight: kg' },
    { value: 'oz', label: 'Weight: oz' },
    { value: 'lb', label: 'Weight: lb' },
    // Volume
    { value: 'ml', label: 'Volume: ml' },
    { value: 'l', label: 'Volume: l' },
    // Count units
    { value: 'unit', label: 'Count: unit(s)' },
    { value: 'piece', label: 'Count: piece(s)' },
    { value: 'set', label: 'Count: set(s)' },
    { value: 'pair', label: 'Count: pair(s)' },
    { value: 'item', label: 'Count: item(s)' },
    { value: 'pack', label: 'Count: pack(s)' },
    { value: 'box', label: 'Count: box(es)' },
    { value: 'bar', label: 'Count: bar(s)' },
    { value: 'packet', label: 'Count: packet(s)' },
    { value: 'capsule', label: 'Count: capsule(s)' },
    { value: 'tablet', label: 'Count: tablet(s)' },
    { value: 'softgel', label: 'Count: softgel(s)' },
    { value: 'scoop', label: 'Count: scoop(s)' },
    { value: 'serving', label: 'Count: serving(s)' },
    { value: 'portion', label: 'Count: portion(s)' },
    { value: 'slice', label: 'Count: slice(s)' },
    { value: 'meal', label: 'Count: meal(s)' },
    { value: 'combo', label: 'Count: combo(s)' },
    { value: 'bowl', label: 'Count: bowl(s)' },
    { value: 'plate', label: 'Count: plate(s)' },
    { value: 'cup', label: 'Count: cup(s)' },
    { value: 'bottle', label: 'Count: bottle(s)' },
    { value: 'can', label: 'Count: can(s)' },
    { value: 'glass', label: 'Count: glass(es)' },
    { value: 'jug', label: 'Count: jug(s)' },
    { value: 'shot', label: 'Count: shot(s)' },
    // Size
    { value: 'inch', label: 'Size: inch(es)' },
    { value: 'cm', label: 'Size: cm' },
    { value: 'mm', label: 'Size: mm' },
    { value: 'size', label: 'Size: size(s)' },
    { value: 'level', label: 'Size: level(s)' }
  ];
  
  res.status(200).json({ message: 'Measurement units fetched successfully', result: units });
});

// GET stock statistics
router.get('/stock/stats', async (req, res) => {
  const query = `
    SELECT 
      COUNT(*) as total_products,
      SUM(CASE WHEN stock_status = 'In Stock' THEN 1 ELSE 0 END) as in_stock,
      SUM(CASE WHEN stock_status = 'Low Stock' THEN 1 ELSE 0 END) as low_stock,
      SUM(CASE WHEN stock_status = 'Out of Stock' THEN 1 ELSE 0 END) as out_of_stock,
      SUM(quantity) as total_quantity,
      SUM(CASE WHEN quantity > 50 THEN 1 ELSE 0 END) as best_selling,
      SUM(CASE WHEN quantity <= 10 AND quantity > 0 THEN 1 ELSE 0 END) as slow_moving
    FROM ecommerce_products_tbl
  `;
  
  mysqlConnection.query(query, (error, result) => {
    if (error) {
      console.error('Fetching stock stats error:', error);
      return res.status(500).json({ error: 'Fetching stock stats failed' });
    }
    res.status(200).json({ message: 'Stock stats fetched successfully', result: result[0] });
  });
});

// GET cart statistics (sales performance)
router.get('/cart/stats', async (req, res) => {
  const query = `
    SELECT 
      COUNT(DISTINCT oi.product_id) as best_selling,
      SUM(CASE WHEN oi.quantity >= 10 THEN 1 ELSE 0 END) as fast_moving,
      SUM(CASE WHEN oi.quantity <= 2 THEN 1 ELSE 0 END) as least_selling
    FROM ecommerce_order_items_tbl oi
    INNER JOIN ecommerce_orders_tbl o ON oi.order_id = o.order_id
    WHERE o.status = 'completed'
  `;
  
  mysqlConnection.query(query, (error, result) => {
    if (error) {
      console.error('Fetching cart stats error:', error);
      return res.status(500).json({ error: 'Fetching cart stats failed' });
    }
    
    // If no orders exist yet, return default values
    const stats = result[0] || { best_selling: 0, fast_moving: 0, least_selling: 0 };
    
    // Enhance stats with additional analytics
    const enhancedStats = {
      best_selling: stats.best_selling || 0,
      fast_moving: stats.fast_moving || 0,
      least_selling: stats.least_selling || 0
    };
    
    res.status(200).json({ message: 'Cart stats fetched successfully', result: enhancedStats });
  });
});

module.exports = router;


