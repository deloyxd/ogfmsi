const { Router } = require("express");
const db = require('../database/mysql');
const router = Router();

/* 🔥 E-COMMERCE CART ROUTES 🔥 */

// POST add item to cart
router.post('/cart', async (req, res) => {
  const { session_id, product_id, product_name, product_image, price, quantity, measurement, measurement_unit, category } = req.body;

  // Generate unique cart ID
  const cart_id = 'CART_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

  // Check if item already exists in cart for this session
  const checkQuery = 'SELECT * FROM ecommerce_cart_tbl WHERE session_id = ? AND product_id = ?';
  try {
    const existing = await db.query(checkQuery, [session_id, product_id]);
    if (existing && existing.length > 0) {
      // Update existing item quantity
      const updateQuery = 'UPDATE ecommerce_cart_tbl SET quantity = quantity + ? WHERE cart_id = ?';
      await db.query(updateQuery, [quantity, existing[0].cart_id]);
      return res.status(200).json({ message: 'Cart item updated successfully' });
    } else {
      // Add new item to cart
      const insertQuery = `
        INSERT INTO ecommerce_cart_tbl 
        (cart_id, session_id, product_id, product_name, product_image, price, quantity, measurement, measurement_unit, category) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      await db.query(insertQuery, [
        cart_id, session_id, product_id, product_name, product_image, price, quantity, measurement, measurement_unit, category
      ]);
      return res.status(201).json({ message: 'Item added to cart successfully' });
    }
  } catch (error) {
    console.error('Adding to cart error:', error);
    return res.status(500).json({ error: 'Adding to cart failed' });
  }
});

// GET cart items by session
router.get('/cart/:session_id', async (req, res) => {
  const { session_id } = req.params;

  // First, clean up any disposed products from the cart
  const cleanupQuery = `
    DELETE c FROM ecommerce_cart_tbl c
    LEFT JOIN ecommerce_products_tbl p ON c.product_id = p.product_id
    WHERE c.session_id = ? AND p.disposal_status = 'Disposed'
  `;

  try {
    // Cleanup disposed products; log errors but do not block fetch
    try {
      await db.query(cleanupQuery, [session_id]);
    } catch (cleanupError) {
      console.error('Cleanup disposed products error:', cleanupError);
    }

    // Then fetch the remaining cart items
    const query = `
      SELECT c.*, p.disposal_status 
      FROM ecommerce_cart_tbl c
      LEFT JOIN ecommerce_products_tbl p ON c.product_id = p.product_id
      WHERE c.session_id = ? AND (p.disposal_status IS NULL OR p.disposal_status != 'Disposed')
      ORDER BY c.created_at DESC
    `;
    const rows = await db.query(query, [session_id]);
    return res.status(200).json({ message: 'Fetching cart successful', result: rows });
  } catch (error) {
    console.error('Fetching cart error:', error);
    return res.status(500).json({ error: 'Fetching cart failed' });
  }
});

// PUT update cart item quantity
router.put('/cart/:cart_id', async (req, res) => {
  const { cart_id } = req.params;
  const { quantity } = req.body;

  const query = 'UPDATE ecommerce_cart_tbl SET quantity = ? WHERE cart_id = ?';
  try {
    const result = await db.query(query, [quantity, cart_id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Cart item not found' });
    } else {
      return res.status(200).json({ message: 'Cart quantity updated successfully' });
    }
  } catch (error) {
    console.error('Updating cart quantity error:', error);
    return res.status(500).json({ error: 'Updating cart quantity failed' });
  }
});

// DELETE remove item from cart
router.delete('/cart/:cart_id', async (req, res) => {
  const { cart_id } = req.params;
  const query = 'DELETE FROM ecommerce_cart_tbl WHERE cart_id = ?';
  try {
    const result = await db.query(query, [cart_id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Cart item not found' });
    } else {
      return res.status(200).json({ message: 'Item removed from cart successfully' });
    }
  } catch (error) {
    console.error('Removing from cart error:', error);
    return res.status(500).json({ error: 'Removing from cart failed' });
  }
});

// DELETE clear entire cart for session
router.delete('/cart/session/:session_id', async (req, res) => {
  const { session_id } = req.params;
  const query = 'DELETE FROM ecommerce_cart_tbl WHERE session_id = ?';
  try {
    await db.query(query, [session_id]);
    return res.status(200).json({ message: 'Cart cleared successfully' });
  } catch (error) {
    console.error('Clearing cart error:', error);
    return res.status(500).json({ error: 'Clearing cart failed' });
  }
});

module.exports = router;
