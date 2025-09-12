const { Router } = require("express");
const mysqlConnection = require('../database/mysql');
const router = Router();

/* 🔥 E-COMMERCE CART ROUTES 🔥 */

// POST add item to cart
router.post('/cart', async (req, res) => {
  const { session_id, product_id, product_name, product_image, price, quantity, measurement, measurement_unit, category } = req.body;
  
  // Generate unique cart ID
  const cart_id = 'CART_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  
  // Check if item already exists in cart for this session
  const checkQuery = 'SELECT * FROM ecommerce_cart_tbl WHERE session_id = ? AND product_id = ?';
  mysqlConnection.query(checkQuery, [session_id, product_id], (checkError, checkResult) => {
    if (checkError) {
      console.error('Checking cart error:', checkError);
      return res.status(500).json({ error: 'Checking cart failed' });
    }
    
    if (checkResult && checkResult.length > 0) {
      // Update existing item quantity
      const updateQuery = 'UPDATE ecommerce_cart_tbl SET quantity = quantity + ? WHERE cart_id = ?';
      mysqlConnection.query(updateQuery, [quantity, checkResult[0].cart_id], (updateError, updateResult) => {
        if (updateError) {
          console.error('Updating cart error:', updateError);
          return res.status(500).json({ error: 'Updating cart failed' });
        }
        res.status(200).json({ message: 'Cart item updated successfully' });
      });
    } else {
      // Add new item to cart
      const insertQuery = `
        INSERT INTO ecommerce_cart_tbl 
        (cart_id, session_id, product_id, product_name, product_image, price, quantity, measurement, measurement_unit, category) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      mysqlConnection.query(insertQuery, [
        cart_id, session_id, product_id, product_name, product_image, price, quantity, measurement, measurement_unit, category
      ], (insertError, insertResult) => {
        if (insertError) {
          console.error('Adding to cart error:', insertError);
          return res.status(500).json({ error: 'Adding to cart failed' });
        }
        res.status(201).json({ message: 'Item added to cart successfully' });
      });
    }
  });
});

// GET cart items by session
router.get('/cart/:session_id', async (req, res) => {
  const { session_id } = req.params;
  const query = 'SELECT * FROM ecommerce_cart_tbl WHERE session_id = ? ORDER BY created_at DESC';
  
  mysqlConnection.query(query, [session_id], (error, result) => {
    if (error) {
      console.error('Fetching cart error:', error);
      return res.status(500).json({ error: 'Fetching cart failed' });
    }
    res.status(200).json({ message: 'Fetching cart successful', result: result });
  });
});

// PUT update cart item quantity
router.put('/cart/:cart_id', async (req, res) => {
  const { cart_id } = req.params;
  const { quantity } = req.body;
  
  const query = 'UPDATE ecommerce_cart_tbl SET quantity = ? WHERE cart_id = ?';
  
  mysqlConnection.query(query, [quantity, cart_id], (error, result) => {
    if (error) {
      console.error('Updating cart quantity error:', error);
      return res.status(500).json({ error: 'Updating cart quantity failed' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Cart item not found' });
    } else {
      res.status(200).json({ message: 'Cart quantity updated successfully' });
    }
  });
});

// DELETE remove item from cart
router.delete('/cart/:cart_id', async (req, res) => {
  const { cart_id } = req.params;
  const query = 'DELETE FROM ecommerce_cart_tbl WHERE cart_id = ?';
  
  mysqlConnection.query(query, [cart_id], (error, result) => {
    if (error) {
      console.error('Removing from cart error:', error);
      return res.status(500).json({ error: 'Removing from cart failed' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Cart item not found' });
    } else {
      res.status(200).json({ message: 'Item removed from cart successfully' });
    }
  });
});

// DELETE clear entire cart for session
router.delete('/cart/session/:session_id', async (req, res) => {
  const { session_id } = req.params;
  const query = 'DELETE FROM ecommerce_cart_tbl WHERE session_id = ?';
  
  mysqlConnection.query(query, [session_id], (error, result) => {
    if (error) {
      console.error('Clearing cart error:', error);
      return res.status(500).json({ error: 'Clearing cart failed' });
    }
    res.status(200).json({ message: 'Cart cleared successfully' });
  });
});

module.exports = router;


