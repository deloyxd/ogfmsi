const { Router } = require("express");
const mysqlConnection = require('../database/mysql');
const router = Router();

/* 🔥 E-COMMERCE ORDERS ROUTES 🔥 */

// POST create new order
router.post('/orders', async (req, res) => {
  const { session_id, total_amount, payment_method, customer_payment, change_amount, processed_by } = req.body;
  
  // Generate unique order ID
  const order_id = 'ORDER_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  
  const query = `
    INSERT INTO ecommerce_orders_tbl 
    (order_id, session_id, total_amount, payment_method, customer_payment, change_amount, processed_by) 
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  
  mysqlConnection.query(query, [order_id, session_id, total_amount, payment_method, customer_payment, change_amount, processed_by], (error, result) => {
    if (error) {
      console.error('Creating order error:', error);
      return res.status(500).json({ error: 'Creating order failed' });
    }
    res.status(201).json({ 
      message: 'Order created successfully', 
      result: { order_id, total_amount, payment_method, customer_payment, change_amount }
    });
  });
});

// POST add order items
router.post('/orders/:order_id/items', async (req, res) => {
  const { order_id } = req.params;
  const { product_id, product_name, unit_price, quantity, total_price } = req.body;
  
  // Generate unique order item ID
  const order_item_id = 'ITEM_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  
  const query = `
    INSERT INTO ecommerce_order_items_tbl 
    (order_item_id, order_id, product_id, product_name, unit_price, quantity, total_price) 
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  
  mysqlConnection.query(query, [
    order_item_id, order_id, product_id, product_name, unit_price, quantity, total_price
  ], (error, result) => {
    if (error) {
      console.error('Adding order item error:', error);
      return res.status(500).json({ error: 'Adding order item failed' });
    }
    res.status(201).json({ message: 'Order item added successfully' });
  });
});

// GET all orders
router.get('/orders', async (req, res) => {
  const query = 'SELECT * FROM ecommerce_orders_tbl ORDER BY created_at DESC';
  mysqlConnection.query(query, (error, result) => {
    if (error) {
      console.error('Fetching orders error:', error);
      return res.status(500).json({ error: 'Fetching orders failed' });
    }
    res.status(200).json({ message: 'Fetching orders successful', result: result });
  });
});

// GET single order with items
router.get('/orders/:order_id', async (req, res) => {
  const { order_id } = req.params;
  
  // Get order details
  const orderQuery = 'SELECT * FROM ecommerce_orders_tbl WHERE order_id = ?';
  mysqlConnection.query(orderQuery, [order_id], (orderError, orderResult) => {
    if (orderError) {
      console.error('Fetching order error:', orderError);
      return res.status(500).json({ error: 'Fetching order failed' });
    }
    
    if (!orderResult || orderResult.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Get order items
    const itemsQuery = 'SELECT * FROM ecommerce_order_items_tbl WHERE order_id = ?';
    mysqlConnection.query(itemsQuery, [order_id], (itemsError, itemsResult) => {
      if (itemsError) {
        console.error('Fetching order items error:', itemsError);
        return res.status(500).json({ error: 'Fetching order items failed' });
      }
      
      res.status(200).json({ 
        message: 'Fetching order successful', 
        result: {
          order: orderResult[0],
          items: itemsResult
        }
      });
    });
  });
});

// PUT update order status
router.put('/orders/:order_id/status', async (req, res) => {
  const { order_id } = req.params;
  const { status } = req.body;
  
  const query = 'UPDATE ecommerce_orders_tbl SET status = ? WHERE order_id = ?';
  
  mysqlConnection.query(query, [status, order_id], (error, result) => {
    if (error) {
      console.error('Updating order status error:', error);
      return res.status(500).json({ error: 'Updating order status failed' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Order not found' });
    } else {
      res.status(200).json({ message: 'Order status updated successfully' });
    }
  });
});

module.exports = router;


