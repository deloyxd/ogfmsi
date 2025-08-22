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

module.exports = router;


