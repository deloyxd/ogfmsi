const { Router } = require("express");
const db = require('../database/mysql');
const { parsePageParams } = require('../utils/pagination');
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

  try {
    await db.query(query, [order_id, session_id, total_amount, payment_method, customer_payment, change_amount, processed_by]);
    res.status(201).json({ 
      message: 'Order created successfully', 
      result: { order_id, total_amount, payment_method, customer_payment, change_amount }
    });
  } catch (error) {
    console.error('Creating order error:', error);
    return res.status(500).json({ error: 'Creating order failed' });
  }
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

  try {
    await db.query(query, [
      order_item_id, order_id, product_id, product_name, unit_price, quantity, total_price
    ]);
    res.status(201).json({ message: 'Order item added successfully' });
  } catch (error) {
    console.error('Adding order item error:', error);
    return res.status(500).json({ error: 'Adding order item failed' });
  }
});

// GET all orders
router.get('/orders', async (req, res) => {
  const { useLimit, limit, offset } = parsePageParams(req);
  let sql = 'SELECT * FROM ecommerce_orders_tbl ORDER BY created_at DESC';
  const params = [];
  if (useLimit) {
    sql += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);
  }
  try {
    const rows = await db.query(sql, params);
    res.status(200).json({ message: 'Fetching orders successful', result: rows });
  } catch (error) {
    console.error('Fetching orders error:', error);
    return res.status(500).json({ error: 'Fetching orders failed' });
  }
});

// GET single order with items
router.get('/orders/:order_id', async (req, res) => {
  const { order_id } = req.params;

  const orderQuery = 'SELECT * FROM ecommerce_orders_tbl WHERE order_id = ?';
  const itemsQuery = 'SELECT * FROM ecommerce_order_items_tbl WHERE order_id = ?';

  try {
    const orderRows = await db.query(orderQuery, [order_id]);
    if (!orderRows || orderRows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const itemsRows = await db.query(itemsQuery, [order_id]);

    res.status(200).json({ 
      message: 'Fetching order successful', 
      result: {
        order: orderRows[0],
        items: itemsRows
      }
    });
  } catch (error) {
    console.error('Fetching order or items error:', error);
    return res.status(500).json({ error: 'Fetching order failed' });
  }
});

// PUT update order status
router.put('/orders/:order_id/status', async (req, res) => {
  const { order_id } = req.params;
  const { status } = req.body;

  const query = 'UPDATE ecommerce_orders_tbl SET status = ? WHERE order_id = ?';

  try {
    const result = await db.query(query, [status, order_id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Order not found' });
    } else {
      res.status(200).json({ message: 'Order status updated successfully' });
    }
  } catch (error) {
    console.error('Updating order status error:', error);
    return res.status(500).json({ error: 'Updating order status failed' });
  }
});

module.exports = router;
