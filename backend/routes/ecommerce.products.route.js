const { Router } = require('express');
const db = require('../database/mysql');
const { parsePageParams } = require('../utils/pagination');
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
    image_url,
    expiration_date,
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
    (product_id, product_name, product_name_encoded, price, price_encoded, quantity, stock_status, measurement_value, measurement_unit, purchase_type, category, image_url, expiration_date) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  try {
    await db.query(query, [
      product_id,
      product_name,
      product_name_encoded,
      price,
      price_encoded,
      quantity,
      stock_status,
      measurement_value,
      measurement_unit,
      'retail',
      category,
      image_url,
      expiration_date || null,
    ]);

    res.status(201).json({
      message: 'Product created successfully',
      result: {
        product_id,
        product_name,
        price,
        quantity,
        stock_status,
        measurement_value,
        measurement_unit,
        category,
        image_url,
        expiration_date,
      },
    });
  } catch (error) {
    console.error('Creating product error:', error);
    return res.status(500).json({ error: 'Creating product failed' });
  }
});

// GET all products
router.get('/products', async (req, res) => {
  const { useLimit, limit, offset } = parsePageParams(req);
  let sql = 'SELECT * FROM ecommerce_products_tbl ORDER BY created_at DESC';
  const params = [];
  if (useLimit) {
    sql += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);
  }
  try {
    const rows = await db.query(sql, params);
    res.status(200).json({ message: 'Fetching products successful', result: rows });
  } catch (error) {
    console.error('Fetching products error:', error);
    return res.status(500).json({ error: 'Fetching products failed' });
  }
});

// GET products by category
router.get('/products/category/:category', async (req, res) => {
  const { category } = req.params;
  const { useLimit, limit, offset } = parsePageParams(req);
  let sql = 'SELECT * FROM ecommerce_products_tbl WHERE category = ? ORDER BY created_at DESC';
  const params = [category];
  if (useLimit) {
    sql += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);
  }
  try {
    const rows = await db.query(sql, params);
    res.status(200).json({ message: 'Fetching products by category successful', result: rows });
  } catch (error) {
    console.error('Fetching products by category error:', error);
    return res.status(500).json({ error: 'Fetching products by category failed' });
  }
});

// GET single product
router.get('/products/:id', async (req, res) => {
  const { id } = req.params;
  const query = 'SELECT * FROM ecommerce_products_tbl WHERE product_id = ?';
  try {
    const rows = await db.query(query, [id]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    } else {
      res.status(200).json({ message: 'Fetching product successful', result: rows[0] });
    }
  } catch (error) {
    console.error('Fetching product error:', error);
    return res.status(500).json({ error: 'Fetching product failed' });
  }
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
    image_url,
    expiration_date,
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
        category = ?, image_url = ?, expiration_date = ? 
    WHERE product_id = ?
  `;

  try {
    const result = await db.query(query, [
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
      expiration_date || null,
      id,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Product not found' });
    } else {
      res.status(200).json({ message: 'Product updated successfully' });
    }
  } catch (error) {
    console.error('Updating product error:', error);
    return res.status(500).json({ error: 'Updating product failed' });
  }
});

// DELETE product
router.delete('/products/:id', async (req, res) => {
  const { id } = req.params;
  const query = 'DELETE FROM ecommerce_products_tbl WHERE product_id = ?';

  try {
    const result = await db.query(query, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Product not found' });
    } else {
      res.status(200).json({ message: 'Product deleted successfully' });
    }
  } catch (error) {
    console.error('Deleting product error:', error);
    // Handle FK constraint errors clearly
    if (error && error.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(409).json({
        error: 'Cannot delete product because it is referenced by existing order items. Consider archiving instead.',
      });
    }
    return res.status(500).json({ error: 'Deleting product failed' });
  }
});

// PUT update product stock (for sales)
router.put('/products/:id/stock', async (req, res) => {
  const { id } = req.params;
  const { sold_quantity } = req.body;

  // First get current product quantity
  const getQuery = 'SELECT quantity FROM ecommerce_products_tbl WHERE product_id = ?';

  try {
    const rows = await db.query(getQuery, [id]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const currentQuantity = rows[0].quantity;
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

    await db.query(updateQuery, [newQuantity, stock_status, id]);

    res.status(200).json({
      message: 'Product stock updated successfully',
      result: {
        product_id: id,
        previous_quantity: currentQuantity,
        sold_quantity: sold_quantity,
        new_quantity: newQuantity,
        stock_status: stock_status,
      },
    });
  } catch (error) {
    console.error('Updating product stock error:', error);
    return res.status(500).json({ error: 'Updating product stock failed' });
  }
});

// PUT dispose product
router.put('/products/:id/dispose', async (req, res) => {
  const { id } = req.params;
  const { disposal_status, disposal_reason, disposal_notes, disposed_at } = req.body;

  // Validate required fields
  if (!disposal_status) {
    return res.status(400).json({ error: 'disposal_status is required' });
  }

  if (!disposal_reason) {
    return res.status(400).json({ error: 'disposal_reason is required' });
  }

  // Validate disposal_status value
  const validStatuses = ['Active', 'Disposed'];
  if (!validStatuses.includes(disposal_status)) {
    return res.status(400).json({ error: 'disposal_status must be either "Active" or "Disposed"' });
  }

  // First check if product exists
  const checkQuery = 'SELECT product_id FROM ecommerce_products_tbl WHERE product_id = ?';

  try {
    const checkResult = await db.query(checkQuery, [id]);
    if (!checkResult || checkResult.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const query = `
      UPDATE ecommerce_products_tbl 
      SET disposal_status = ?, disposal_reason = ?, disposal_notes = ?, disposed_at = ? 
      WHERE product_id = ?
    `;

    const result = await db.query(query, [
      disposal_status,
      disposal_reason || null,
      disposal_notes || null,
      disposed_at || null,
      id,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Product not found' });
    } else {
      res.status(200).json({
        message: 'Product disposed successfully',
        result: {
          product_id: id,
          disposal_status,
          disposal_reason,
          disposal_notes,
          disposed_at,
        },
      });
    }
  } catch (error) {
    console.error('Disposing product error:', error);
    return res.status(500).json({ error: 'Disposing product failed' });
  }
});

module.exports = router;
