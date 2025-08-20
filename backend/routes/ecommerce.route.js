const { Router } = require("express");
const mysqlConnection = require('../database/mysql');
const router = Router();

/* 🔥 E-COMMERCE PRODUCTS ROUTES 🔥 */

// POST new product
router.post('/products', async (req, res) => {
  const { 
    product_name, 
    product_name_encoded, 
    price, 
    price_encoded, 
    quantity, 
    measurement_value, 
    measurement_unit, 
    category, 
    image_url 
  } = req.body;
  
  // Generate unique product ID
  const product_id = 'PROD_' + Date.now();
  
  // Determine stock status based on quantity
  let stock_status = 'In Stock';
  if (quantity <= 0) {
    stock_status = 'Out of Stock';
  } else if (quantity <= 10) {
    stock_status = 'Low Stock';
  }
  
  const query = `
    INSERT INTO ecommerce_products_tbl 
    (product_id, product_name, product_name_encoded, price, price_encoded, quantity, stock_status, measurement_value, measurement_unit, category, image_url) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  mysqlConnection.query(query, [
    product_id, 
    product_name, 
    product_name_encoded, 
    price, 
    price_encoded, 
    quantity, 
    stock_status, 
    measurement_value, 
    measurement_unit, 
    category, 
    image_url
  ], (error, result) => {
    if (error) {
      console.error('Creating product error:', error);
      return res.status(500).json({ error: 'Creating product failed' });
    }
    res.status(201).json({ 
      message: 'Product created successfully', 
      result: { 
        product_id, 
        product_name, 
        price, 
        quantity, 
        category,
        stock_status 
      }
    });
  });
});

// GET all products
router.get('/products', async (req, res) => {
  const query = 'SELECT * FROM ecommerce_products_tbl ORDER BY created_at DESC';
  mysqlConnection.query(query, (error, result) => {
    if (error) {
      console.error('Fetching products error:', error);
      return res.status(500).json({ error: 'Fetching products failed' });
    }
    res.status(200).json({ message: 'Fetching products successful', result: result });
  });
});

// GET products by category
router.get('/products/category/:category', async (req, res) => {
  const { category } = req.params;
  const query = 'SELECT * FROM ecommerce_products_tbl WHERE category = ? ORDER BY created_at DESC';
  mysqlConnection.query(query, [category], (error, result) => {
    if (error) {
      console.error('Fetching products by category error:', error);
      return res.status(500).json({ error: 'Fetching products by category failed' });
    }
    res.status(200).json({ message: 'Fetching products by category successful', result: result });
  });
});

// GET single product
router.get('/products/:id', async (req, res) => {
  const { id } = req.params;
  const query = 'SELECT * FROM ecommerce_products_tbl WHERE product_id = ?';
  mysqlConnection.query(query, [id], (error, result) => {
    if (error) {
      console.error('Fetching product error:', error);
      return res.status(500).json({ error: 'Fetching product failed' });
    }
    if (!result || result.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    } else {
      res.status(200).json({ message: 'Fetching product successful', result: result[0] });
    }
  });
});

// PUT update product
router.put('/products/:id', async (req, res) => {
  const { id } = req.params;
  const { 
    product_name, 
    product_name_encoded, 
    price, 
    price_encoded, 
    quantity, 
    measurement_value, 
    measurement_unit, 
    category, 
    image_url 
  } = req.body;
  
  // Determine stock status based on quantity
  let stock_status = 'In Stock';
  if (quantity <= 0) {
    stock_status = 'Out of Stock';
  } else if (quantity <= 10) {
    stock_status = 'Low Stock';
  }
  
  const query = `
    UPDATE ecommerce_products_tbl 
    SET product_name = ?, product_name_encoded = ?, price = ?, price_encoded = ?, 
        quantity = ?, stock_status = ?, measurement_value = ?, measurement_unit = ?, 
        category = ?, image_url = ? 
    WHERE product_id = ?
  `;
  
  mysqlConnection.query(query, [
    product_name, 
    product_name_encoded, 
    price, 
    price_encoded, 
    quantity, 
    stock_status, 
    measurement_value, 
    measurement_unit, 
    category, 
    image_url, 
    id
  ], (error, result) => {
    if (error) {
      console.error('Updating product error:', error);
      return res.status(500).json({ error: 'Updating product failed' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Product not found' }); 
    } else {
      res.status(200).json({ message: 'Product updated successfully' });
    }
  });
});

// DELETE product
router.delete('/products/:id', async (req, res) => {
  const { id } = req.params;
  const query = 'DELETE FROM ecommerce_products_tbl WHERE product_id = ?';
  
  mysqlConnection.query(query, [id], (error, result) => {
    if (error) {
      console.error('Deleting product error:', error);
      // Handle FK constraint errors clearly
      if (error.code === 'ER_ROW_IS_REFERENCED_2') {
        return res.status(409).json({
          error: 'Cannot delete product because it is referenced by existing order items. Consider archiving instead.'
        });
      }
      return res.status(500).json({ error: 'Deleting product failed' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Product not found' });
    } else {
      res.status(200).json({ message: 'Product deleted successfully' });
    }
  });
});

// PUT update product stock (for sales)
router.put('/products/:id/stock', async (req, res) => {
  const { id } = req.params;
  const { sold_quantity } = req.body;
  
  // First get current product quantity
  const getQuery = 'SELECT quantity FROM ecommerce_products_tbl WHERE product_id = ?';
  mysqlConnection.query(getQuery, [id], (getError, getResult) => {
    if (getError) {
      console.error('Getting product quantity error:', getError);
      return res.status(500).json({ error: 'Getting product quantity failed' });
    }
    
    if (!getResult || getResult.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    const currentQuantity = getResult[0].quantity;
    const newQuantity = Math.max(0, currentQuantity - sold_quantity);
    
    // Determine stock status based on new quantity
    let stock_status = 'In Stock';
    if (newQuantity <= 0) {
      stock_status = 'Out of Stock';
    } else if (newQuantity <= 10) {
      stock_status = 'Low Stock';
    }
    
    // Update product quantity and stock status
    const updateQuery = 'UPDATE ecommerce_products_tbl SET quantity = ?, stock_status = ? WHERE product_id = ?';
    mysqlConnection.query(updateQuery, [newQuantity, stock_status, id], (updateError, updateResult) => {
      if (updateError) {
        console.error('Updating product stock error:', updateError);
        return res.status(500).json({ error: 'Updating product stock failed' });
      }
      
      res.status(200).json({ 
        message: 'Product stock updated successfully',
        result: {
          product_id: id,
          previous_quantity: currentQuantity,
          sold_quantity: sold_quantity,
          new_quantity: newQuantity,
          stock_status: stock_status
        }
      });
    });
  });
});

/* 🔥 E-COMMERCE CART ROUTES 🔥 */

// POST add item to cart
router.post('/cart', async (req, res) => {
  const { session_id, product_id, product_name, product_image, price, quantity, category } = req.body;
  
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
        (cart_id, session_id, product_id, product_name, product_image, price, quantity, category) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      mysqlConnection.query(insertQuery, [
        cart_id, session_id, product_id, product_name, product_image, price, quantity, category
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
