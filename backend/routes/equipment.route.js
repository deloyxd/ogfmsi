const { Router } = require("express");
const db = require('../database/mysql');
const { generateEquipmentCode, updateGeneralStatus, updateGeneralStatusForEquipment } = require('../utils/helper');
const { parsePageParams } = require('../utils/pagination');
const router = Router();

/* 🔥 EQUIPMENT INVENTORY ROUTES 🔥 */

// POST new equipment with auto-registration of individual items
router.post('/', async (req, res) => {
  const { equipment_name, equipment_type, quantity, image_url } = req.body;

  // Generate unique equipment ID
  const equipment_id = 'EQ_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

  let conn;
  try {
    conn = await db.getConnection();
    await conn.beginTransaction();

    // Insert main equipment record
    const mainQuery = 'INSERT INTO gym_equipment_tbl (equipment_id, equipment_name, equipment_type, total_quantity, image_url, general_status) VALUES (?, ?, ?, ?, ?, ?)';
    await conn.query(mainQuery, [equipment_id, equipment_name, equipment_type, quantity, image_url, 'All Available']);

    // Generate individual item codes and insert them
    const itemQuery = 'INSERT INTO gym_equipment_items_tbl (item_id, equipment_id, item_code, individual_status) VALUES (?, ?, ?, ?)';
    const insertItem = async (i) => {
      const item_id = equipment_id + '_ITEM_' + i;
      const item_code = generateEquipmentCode(equipment_name, i);
      await conn.query(itemQuery, [item_id, equipment_id, item_code, 'Available']);
    };

    for (let i = 1; i <= quantity; i++) {
      await insertItem(i);
    }

    await conn.commit();

    res.status(201).json({
      message: 'Equipment and individual items created successfully',
      result: {
        equipment_id,
        equipment_name,
        equipment_type,
        total_quantity: quantity,
        individual_items_created: quantity
      }
    });
  } catch (err) {
    console.error('Creating equipment error:', err);
    if (conn) {
      try { await conn.rollback(); } catch (_) {}
    }
    return res.status(500).json({ error: 'Creating equipment failed' });
  } finally {
    if (conn) conn.release();
  }
});

// GET all equipment (main entries only)
router.get('/', async (req, res) => {
  const { useLimit, limit, offset } = parsePageParams(req);
  let sql = `
    SELECT e.*, COALESCE(SUM(CASE WHEN i.individual_status = 'Unavailable' THEN 1 ELSE 0 END), 0) AS unavailable_count
    FROM gym_equipment_tbl e
    LEFT JOIN gym_equipment_items_tbl i ON i.equipment_id = e.equipment_id
    GROUP BY e.equipment_id
    ORDER BY e.created_at DESC
  `;
  const params = [];
  if (useLimit) {
    sql += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);
  }
  try {
    const rows = await db.query(sql, params);
    res.status(200).json({ message: 'Fetching equipment successful', result: rows });
  } catch (error) {
    console.error('Fetching equipment error:', error);
    return res.status(500).json({ error: 'Fetching equipment failed' });
  }
});

// GET individual equipment items for a specific equipment
router.get('/:id/items', async (req, res) => {
  const { id } = req.params;
  const { useLimit, limit, offset } = parsePageParams(req);
  let sql = 'SELECT * FROM gym_equipment_items_tbl WHERE equipment_id = ? ORDER BY item_code ASC';
  const params = [id];
  if (useLimit) {
    sql += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);
  }
  try {
    const rows = await db.query(sql, params);
    res.status(200).json({ message: 'Fetching equipment items successful', result: rows });
  } catch (error) {
    console.error('Fetching equipment items error:', error);
    return res.status(500).json({ error: 'Fetching equipment items failed' });
  }
});

// GET equipment items (optionally filter by status) - across all equipment
router.get('/items', async (req, res) => {
  const { status } = req.query;
  const whereClause = status ? 'WHERE i.individual_status = ?' : '';
  const params = status ? [status] : [];
  const query = `
    SELECT i.*, e.equipment_name
    FROM gym_equipment_items_tbl i
    JOIN gym_equipment_tbl e ON e.equipment_id = i.equipment_id
    ${whereClause}
    ORDER BY i.created_at DESC
  `;
  try {
    const rows = await db.query(query, params);
    res.status(200).json({ message: 'Fetching equipment items successful', result: rows });
  } catch (error) {
    console.error('Fetching items error:', error);
    return res.status(500).json({ error: 'Fetching equipment items failed' });
  }
});

// GET single equipment
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const query = 'SELECT * FROM gym_equipment_tbl WHERE equipment_id = ?';
  try {
    const rows = await db.query(query, [id]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Equipment not found' });
    } else {
      res.status(200).json({ message: 'Fetching equipment successful', result: rows[0] });
    }
  } catch (error) {
    console.error('Fetching equipment error:', error);
    return res.status(500).json({ error: 'Fetching equipment failed' });
  }
});

// PUT update equipment
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { equipment_name, equipment_type, total_quantity, image_url, general_status, notes } = req.body;

  let conn;
  try {
    conn = await db.getConnection();
    await conn.beginTransaction();

    // Update main equipment record
    const query = 'UPDATE gym_equipment_tbl SET equipment_name = ?, equipment_type = ?, total_quantity = ?, image_url = ?, general_status = ?, notes = ? WHERE equipment_id = ?';
    const [result] = await conn.query(query, [equipment_name, equipment_type, total_quantity, image_url, general_status, notes, id]);

    if (result.affectedRows === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Equipment not found' });
    }

    // Get all individual items for this equipment
    const [itemsResult] = await conn.query('SELECT item_id FROM gym_equipment_items_tbl WHERE equipment_id = ? ORDER BY item_id ASC', [id]);

    // Update each item code if equipment name changed
    const updateItemCodesQuery = 'UPDATE gym_equipment_items_tbl SET item_code = ? WHERE item_id = ?';
    for (let index = 0; index < itemsResult.length; index++) {
      const item = itemsResult[index];
      const newItemCode = generateEquipmentCode(equipment_name, index + 1);
      await conn.query(updateItemCodesQuery, [newItemCode, item.item_id]);
    }

    await conn.commit();
    res.status(200).json({ message: 'Equipment and item codes updated successfully' });
  } catch (error) {
    console.error('Updating equipment error:', error);
    if (conn) {
      try { await conn.rollback(); } catch (_) {}
    }
    return res.status(500).json({ error: 'Updating equipment failed' });
  } finally {
    if (conn) conn.release();
  }
});

// PUT update individual equipment item status
router.put('/items/:itemId', async (req, res) => {
  const { itemId } = req.params;
  const { individual_status } = req.body;

  const query = 'UPDATE gym_equipment_items_tbl SET individual_status = ? WHERE item_id = ?';

  try {
    const result = await db.query(query, [individual_status, itemId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Equipment item not found' });
    } else {
      // Update general status based on individual statuses
      return updateGeneralStatus(itemId, res);
    }
  } catch (error) {
    console.error('Updating equipment item status error:', error);
    return res.status(500).json({ error: 'Updating equipment item status failed' });
  }
});

// DELETE individual equipment item (Dispose)
router.delete('/items/:itemId', async (req, res) => {
  const { itemId } = req.params;
  // Mark as Disposed and set disposed_at
  const query = "UPDATE gym_equipment_items_tbl SET individual_status = 'Disposed', disposed_at = CURRENT_TIMESTAMP WHERE item_id = ?";

  try {
    const result = await db.query(query, [itemId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Equipment item not found' });
    }
    // Update general status for parent equipment after disposal
    return updateGeneralStatus(itemId, res);
  } catch (error) {
    console.error('Disposing equipment item error:', error);
    return res.status(500).json({ error: 'Disposing equipment item failed' });
  }
});

// POST add quantity to existing equipment
router.post('/:id/add-quantity', async (req, res) => {
  const { id } = req.params;
  const { add_quantity, equipment_name, start_index } = req.body;

  if (!add_quantity || add_quantity < 1) {
    return res.status(400).json({ error: 'Invalid quantity' });
  }

  if (!equipment_name) {
    return res.status(400).json({ error: 'Equipment name is required' });
  }

  let conn;
  try {
    conn = await db.getConnection();
    await conn.beginTransaction();

    // First, verify the equipment exists and get current quantity
    const getEquipmentQuery = 'SELECT total_quantity FROM gym_equipment_tbl WHERE equipment_id = ?';
    const [equipRows] = await conn.query(getEquipmentQuery, [id]);

    if (equipRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Equipment not found' });
    }

    const currentQuantity = equipRows[0].total_quantity;
    const newQuantity = currentQuantity + add_quantity;

    // Update the total quantity in the main equipment table
    const updateQuantityQuery = 'UPDATE gym_equipment_tbl SET total_quantity = ? WHERE equipment_id = ?';
    await conn.query(updateQuantityQuery, [newQuantity, id]);

    // Create new individual items
    const createItemsQuery = 'INSERT INTO gym_equipment_items_tbl (item_id, equipment_id, item_code, individual_status) VALUES (?, ?, ?, ?)';

    for (let i = 0; i < add_quantity; i++) {
      const itemIndex = start_index + i;
      const item_id = id + '_ITEM_' + itemIndex;
      const item_code = generateEquipmentCode(equipment_name, itemIndex);
      await conn.query(createItemsQuery, [item_id, id, item_code, 'Available']);
    }

    await conn.commit();

    // Recompute general status after adding items (to reflect partial availability with disposed items)
    updateGeneralStatusForEquipment(id, (gsErr, gs) => {
      if (gsErr) {
        // Not fatal for the add-quantity action
        console.warn('General status recompute failed:', gsErr);
      }
      res.status(200).json({
        message: 'Quantity added successfully',
        new_quantity: newQuantity,
        items_added: add_quantity,
        general_status: gs ? gs.general_status : undefined,
      });
    });
  } catch (error) {
    console.error('Creating items error:', error);
    if (conn) {
      try { await conn.rollback(); } catch (_) {}
    }
    return res.status(500).json({ error: 'Failed to create new items' });
  } finally {
    if (conn) conn.release();
  }
});

// DELETE equipment
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  let conn;
  try {
    conn = await db.getConnection();
    await conn.beginTransaction();

    // First, verify the equipment exists
    const checkQuery = 'SELECT equipment_id FROM gym_equipment_tbl WHERE equipment_id = ?';
    const [checkRows] = await conn.query(checkQuery, [id]);

    if (checkRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Equipment not found' });
    }

    // Delete the equipment (individual items will be deleted automatically due to CASCADE)
    const deleteQuery = 'DELETE FROM gym_equipment_tbl WHERE equipment_id = ?';
    await conn.query(deleteQuery, [id]);

    await conn.commit();

    res.status(200).json({
      message: 'Equipment and all associated items deleted successfully',
      deleted_equipment: id
    });
  } catch (error) {
    console.error('Deleting equipment error:', error);
    if (conn) {
      try { await conn.rollback(); } catch (_) {}
    }
    return res.status(500).json({ error: 'Deleting equipment failed' });
  } finally {
    if (conn) conn.release();
  }
});

module.exports = router;
