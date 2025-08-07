const { Router } = require("express");
const mysqlConnection = require('../database/mysql');
const router = Router();

/* 🔥 Store/Inventory Routes 🔥 */

// GET all products
router.get('/products', async (req, res) => {
  const query = 'SELECT * FROM store_products_tbl ORDER BY created_at DESC';
  mysqlConnection.query(query, (error, result) => {
    if (error) {
      console.error('Fetching products error:', error);
      res.status(500).json({ error: 'Fetching products failed' });
    }
    res.status(200).json({ message: 'Fetching products successful', result: result });
  });
});

// GET single product by ID
router.get('/products/:id', async (req, res) => {
  const { id } = req.params;
  const query = 'SELECT * FROM store_products_tbl WHERE product_id = ?';
  mysqlConnection.query(query, [id], (error, result) => {
    if (error) {
      console.error('Fetching product error:', error);
      res.status(500).json({ error: 'Fetching product failed' });
    }
    if (!result || result.length === 0) {
      res.status(404).json({ error: 'Product not found' });
    } else {
      res.status(200).json({ message: 'Fetching product successful', result: result[0] });
    }
  });
});

// POST new product
router.post('/products', async (req, res) => {
  const { product_name, product_type, quantity, price, image_url } = req.body;
  
  // Generate unique product ID
  const product_id = 'PROD_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  
  // Determine status based on quantity
  let status = 'In Stock';
  if (quantity === 0) {
    status = 'Out of Stock';
  } else if (quantity <= 10) {
    status = 'Low Stock';
  }

  const query = 'INSERT INTO store_products_tbl (product_id, product_name, product_type, quantity, price, status, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)';
  
  mysqlConnection.query(query, [product_id, product_name, product_type, quantity, price, status, image_url], (error, result) => {
    if (error) {
      console.error('Creating product error:', error);
      res.status(500).json({ error: 'Creating product failed' });
    }
    res.status(201).json({ 
      message: 'Product created successfully', 
      result: { product_id, product_name, product_type, quantity, price, status }
    });
  });
});

// PUT update product
router.put('/products/:id', async (req, res) => {
  const { id } = req.params;
  const { product_name, product_type, quantity, price, image_url } = req.body;
  
  // Determine status based on quantity
  let status = 'In Stock';
  if (quantity === 0) {
    status = 'Out of Stock';
  } else if (quantity <= 10) {
    status = 'Low Stock';
  }

  const query = 'UPDATE store_products_tbl SET product_name = ?, product_type = ?, quantity = ?, price = ?, status = ?, image_url = ? WHERE product_id = ?';
  
  mysqlConnection.query(query, [product_name, product_type, quantity, price, status, image_url, id], (error, result) => {
    if (error) {
      console.error('Updating product error:', error);
      res.status(500).json({ error: 'Updating product failed' });
    }
    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Product not found' });
    } else {
      res.status(200).json({ message: 'Product updated successfully' });
    }
  });
});

// DELETE product
router.delete('/products/:id', async (req, res) => {
  const { id } = req.params;
  const query = 'DELETE FROM store_products_tbl WHERE product_id = ?';
  
  mysqlConnection.query(query, [id], (error, result) => {
    if (error) {
      console.error('Deleting product error:', error);
      res.status(500).json({ error: 'Deleting product failed' });
    }
    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Product not found' });
    } else {
      res.status(200).json({ message: 'Product deleted successfully' });
    }
  });
});

// GET all transactions
router.get('/transactions', async (req, res) => {
  const query = `
    SELECT t.*, p.product_name, p.product_type 
    FROM store_transactions_tbl t 
    JOIN store_products_tbl p ON t.product_id = p.product_id 
    ORDER BY t.created_at DESC
  `;
  mysqlConnection.query(query, (error, result) => {
    if (error) {
      console.error('Fetching transactions error:', error);
      res.status(500).json({ error: 'Fetching transactions failed' });
    }
    res.status(200).json({ message: 'Fetching transactions successful', result: result });
  });
});

// POST new transaction
router.post('/transactions', async (req, res) => {
  const { product_id, quantity_sold, unit_price, payment_method, processed_by } = req.body;
  
  // Generate unique transaction ID
  const transaction_id = 'TXN_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  const total_amount = quantity_sold * unit_price;

  const query = 'INSERT INTO store_transactions_tbl (transaction_id, product_id, quantity_sold, unit_price, total_amount, payment_method, processed_by) VALUES (?, ?, ?, ?, ?, ?, ?)';
  
  mysqlConnection.query(query, [transaction_id, product_id, quantity_sold, unit_price, total_amount, payment_method, processed_by], (error, result) => {
    if (error) {
      console.error('Creating transaction error:', error);
      res.status(500).json({ error: 'Creating transaction failed' });
    }
    
    // Update product quantity
    const updateQuery = 'UPDATE store_products_tbl SET quantity = quantity - ? WHERE product_id = ?';
    mysqlConnection.query(updateQuery, [quantity_sold, product_id], (updateError) => {
      if (updateError) {
        console.error('Updating product quantity error:', updateError);
      }
    });
    
    res.status(201).json({ 
      message: 'Transaction created successfully', 
      result: { transaction_id, product_id, quantity_sold, total_amount, payment_method }
    });
  });
});

// PUT update transaction status
router.put('/transactions/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  const query = 'UPDATE store_transactions_tbl SET status = ? WHERE transaction_id = ?';
  
  mysqlConnection.query(query, [status, id], (error, result) => {
    if (error) {
      console.error('Updating transaction status error:', error);
      res.status(500).json({ error: 'Updating transaction status failed' });
    }
    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Transaction not found' });
    } else {
      res.status(200).json({ message: 'Transaction status updated successfully' });
    }
  });
});

module.exports = router;
