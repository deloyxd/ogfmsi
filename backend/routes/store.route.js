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

// GET products by category
router.get('/products/category/:category', async (req, res) => {
  const { category } = req.params;
  const query = 'SELECT * FROM store_products_tbl WHERE product_type = ? ORDER BY created_at DESC';
  
  mysqlConnection.query(query, [category], (error, result) => {
    if (error) {
      console.error('Fetching products by category error:', error);
      res.status(500).json({ error: 'Fetching products by category failed' });
    }
    res.status(200).json({ message: 'Fetching products by category successful', result: result });
  });
});

// GET low stock products
router.get('/products/low-stock', async (req, res) => {
  const query = 'SELECT * FROM store_products_tbl WHERE status IN ("Low Stock", "Out of Stock") ORDER BY quantity ASC';
  
  mysqlConnection.query(query, (error, result) => {
    if (error) {
      console.error('Fetching low stock products error:', error);
      res.status(500).json({ error: 'Fetching low stock products failed' });
    }
    res.status(200).json({ message: 'Fetching low stock products successful', result: result });
  });
});

// POST bulk update products
router.post('/products/bulk-update', async (req, res) => {
  const { products } = req.body;
  
  if (!Array.isArray(products) || products.length === 0) {
    return res.status(400).json({ error: 'Invalid products data' });
  }
  
  const updatePromises = products.map(product => {
    return new Promise((resolve, reject) => {
      const { product_id, quantity, price, status } = product;
      const query = 'UPDATE store_products_tbl SET quantity = ?, price = ?, status = ? WHERE product_id = ?';
      
      mysqlConnection.query(query, [quantity, price, status, product_id], (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      });
    });
  });
  
  try {
    await Promise.all(updatePromises);
    res.status(200).json({ message: 'Bulk update successful' });
  } catch (error) {
    console.error('Bulk update error:', error);
    res.status(500).json({ error: 'Bulk update failed' });
  }
});

// GET transaction statistics
router.get('/transactions/stats', async (req, res) => {
  const query = `
    SELECT 
      COUNT(*) as total_transactions,
      SUM(total_amount) as total_revenue,
      COUNT(DISTINCT DATE(created_at)) as days_with_sales,
      AVG(total_amount) as average_transaction_value
    FROM store_transactions_tbl 
    WHERE status = 'completed'
  `;
  
  mysqlConnection.query(query, (error, result) => {
    if (error) {
      console.error('Fetching transaction stats error:', error);
      res.status(500).json({ error: 'Fetching transaction stats failed' });
    }
    res.status(200).json({ message: 'Fetching transaction stats successful', result: result[0] });
  });
});

// GET product statistics
router.get('/products/stats', async (req, res) => {
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
      console.error('Fetching product stats error:', error);
      res.status(500).json({ error: 'Fetching product stats failed' });
    }
    res.status(200).json({ message: 'Fetching product stats successful', result: result[0] });
  });
});

// POST process cart checkout
router.post('/cart/checkout', async (req, res) => {
  const { items, payment_method, processed_by } = req.body;
  
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Invalid cart items' });
  }
  
  try {
    const transactionResults = [];
    
    for (const item of items) {
      const { product_id, quantity, price } = item;
      
      // Check if product exists and has sufficient stock
      const checkQuery = 'SELECT quantity, product_name FROM store_products_tbl WHERE product_id = ?';
      const [product] = await new Promise((resolve, reject) => {
        mysqlConnection.query(checkQuery, [product_id], (error, result) => {
          if (error) reject(error);
          else resolve(result);
        });
      });
      
      if (!product || product.length === 0) {
        return res.status(404).json({ error: `Product ${product_id} not found` });
      }
      
      if (product[0].quantity < quantity) {
        return res.status(400).json({ 
          error: `Insufficient stock for ${product[0].product_name}. Available: ${product[0].quantity}, Requested: ${quantity}` 
        });
      }
      
      // Create transaction
      const transaction_id = 'TXN_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      const total_amount = quantity * price;
      
      const transactionQuery = 'INSERT INTO store_transactions_tbl (transaction_id, product_id, quantity_sold, unit_price, total_amount, payment_method, processed_by, status) VALUES (?, ?, ?, ?, ?, ?, ?, "completed")';
      
      await new Promise((resolve, reject) => {
        mysqlConnection.query(transactionQuery, [transaction_id, product_id, quantity, price, total_amount, payment_method, processed_by], (error, result) => {
          if (error) reject(error);
          else resolve(result);
        });
      });
      
      // Update product quantity
      const updateQuery = 'UPDATE store_products_tbl SET quantity = quantity - ? WHERE product_id = ?';
      await new Promise((resolve, reject) => {
        mysqlConnection.query(updateQuery, [quantity, product_id], (error, result) => {
          if (error) reject(error);
          else resolve(result);
        });
      });
      
      transactionResults.push({
        transaction_id,
        product_id,
        product_name: product[0].product_name,
        quantity,
        price,
        total_amount
      });
    }
    
    const totalAmount = transactionResults.reduce((sum, item) => sum + item.total_amount, 0);
    
    res.status(201).json({ 
      message: 'Cart checkout processed successfully', 
      result: {
        transactions: transactionResults,
        total_amount: totalAmount,
        items_count: items.length
      }
    });
    
  } catch (error) {
    console.error('Cart checkout error:', error);
    res.status(500).json({ error: 'Cart checkout failed' });
  }
});

// GET cart summary
router.get('/cart/summary', async (req, res) => {
  const query = `
    SELECT 
      COUNT(*) as total_items,
      SUM(quantity_sold * unit_price) as total_value,
      COUNT(DISTINCT DATE(created_at)) as days_with_sales
    FROM store_transactions_tbl 
    WHERE status = 'completed' 
    AND DATE(created_at) = CURDATE()
  `;
  
  mysqlConnection.query(query, (error, result) => {
    if (error) {
      console.error('Fetching cart summary error:', error);
      res.status(500).json({ error: 'Fetching cart summary failed' });
    }
    res.status(200).json({ message: 'Fetching cart summary successful', result: result[0] });
  });
});

module.exports = router;
