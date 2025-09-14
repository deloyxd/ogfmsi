const { Router } = require("express");
const mysqlConnection = require('../database/mysql');
const { generateEquipmentCode, updateGeneralStatus } = require('../utils/helper');
const router = Router();

/* 🔥 EQUIPMENT INVENTORY ROUTES 🔥 */

// POST new equipment with auto-registration of individual items
router.post('/', async (req, res) => {
  const { equipment_name, equipment_type, quantity, image_url } = req.body;
  
  // Generate unique equipment ID
  const equipment_id = 'EQ_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  
  // Start transaction
  mysqlConnection.beginTransaction((err) => {
    if (err) {
      console.error('Transaction start error:', err);
      return res.status(500).json({ error: 'Transaction failed' });
    }

    // Insert main equipment record
    const mainQuery = 'INSERT INTO gym_equipment_tbl (equipment_id, equipment_name, equipment_type, total_quantity, image_url, general_status) VALUES (?, ?, ?, ?, ?, ?)';
    
    mysqlConnection.query(mainQuery, [equipment_id, equipment_name, equipment_type, quantity, image_url, 'All Available'], (error, result) => {
      if (error) {
        console.error('Creating equipment error:', error);
        return mysqlConnection.rollback(() => {
          res.status(500).json({ error: 'Creating equipment failed' });
        });
      }

      // Generate individual item codes and insert them
      const itemPromises = [];
      for (let i = 1; i <= quantity; i++) {
        const item_id = equipment_id + '_ITEM_' + i;
        const item_code = generateEquipmentCode(equipment_name, i);
        
        const itemQuery = 'INSERT INTO gym_equipment_items_tbl (item_id, equipment_id, item_code, individual_status) VALUES (?, ?, ?, ?)';
        
        itemPromises.push(new Promise((resolve, reject) => {
          mysqlConnection.query(itemQuery, [item_id, equipment_id, item_code, 'Available'], (itemError) => {
            if (itemError) {
              reject(itemError);
            } else {
              resolve();
            }
          });
        }));
      }

      // Wait for all individual items to be created
      Promise.all(itemPromises)
        .then(() => {
          // Commit transaction
          mysqlConnection.commit((commitErr) => {
            if (commitErr) {
              console.error('Commit error:', commitErr);
              return res.status(500).json({ error: 'Failed to commit transaction' });
            }
            
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
          });
        })
        .catch((itemError) => {
          console.error('Creating individual items error:', itemError);
          mysqlConnection.rollback(() => {
            res.status(500).json({ error: 'Creating individual items failed' });
          });
        });
    });
  });
});

// GET all equipment (main entries only)
router.get('/', async (req, res) => {
  const query = 'SELECT * FROM gym_equipment_tbl ORDER BY created_at DESC';
  mysqlConnection.query(query, (error, result) => {
    if (error) {
      console.error('Fetching equipment error:', error);
      return res.status(500).json({ error: 'Fetching equipment failed' });
    }
    res.status(200).json({ message: 'Fetching equipment successful', result: result });
  });
});

// GET individual equipment items for a specific equipment
router.get('/:id/items', async (req, res) => {
  const { id } = req.params;
  const query = 'SELECT * FROM gym_equipment_items_tbl WHERE equipment_id = ? ORDER BY item_code ASC';
  mysqlConnection.query(query, [id], (error, result) => {
    if (error) {
      console.error('Fetching equipment items error:', error);
      return res.status(500).json({ error: 'Fetching equipment items failed' });
    }
    res.status(200).json({ message: 'Fetching equipment items successful', result: result });
  });
});

// GET single equipment
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const query = 'SELECT * FROM gym_equipment_tbl WHERE equipment_id = ?';
  mysqlConnection.query(query, [id], (error, result) => {
    if (error) {
      console.error('Fetching equipment error:', error);
      return res.status(500).json({ error: 'Fetching equipment failed' });
    }
    if (!result || result.length === 0) {
      return res.status(404).json({ error: 'Equipment not found' });
    } else {
      res.status(200).json({ message: 'Fetching equipment successful', result: result[0] });
    }
  });
});

// PUT update equipment
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { equipment_name, equipment_type, total_quantity, image_url, general_status, notes } = req.body;
  
  const query = 'UPDATE gym_equipment_tbl SET equipment_name = ?, equipment_type = ?, total_quantity = ?, image_url = ?, general_status = ?, notes = ? WHERE equipment_id = ?';
  
  mysqlConnection.query(query, [equipment_name, equipment_type, total_quantity, image_url, general_status, notes, id], (error, result) => {
    if (error) {
      console.error('Updating equipment error:', error);
      return res.status(500).json({ error: 'Updating equipment failed' })
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Equipment not found' }); 
    } else {
      res.status(200).json({ message: 'Equipment updated successfully' });
    }
  });
});

// PUT update individual equipment item status
router.put('/items/:itemId', async (req, res) => {
  const { itemId } = req.params;
  const { individual_status } = req.body;
  
  const query = 'UPDATE gym_equipment_items_tbl SET individual_status = ? WHERE item_id = ?';
  
  mysqlConnection.query(query, [individual_status, itemId], (error, result) => {
    if (error) {
      console.error('Updating equipment item status error:', error);
      return res.status(500).json({ error: 'Updating equipment item status failed' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Equipment item not found' }); 
    } else {
      // Update general status based on individual statuses
      updateGeneralStatus(itemId, res, mysqlConnection);
    }
  });
});


// DELETE equipment
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const query = 'DELETE FROM gym_equipment_tbl WHERE equipment_id = ?';
  
  mysqlConnection.query(query, [id], (error, result) => {
    if (error) {
      console.error('Deleting equipment error:', error);
      return res.status(500).json({ error: 'Deleting equipment failed' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Equipment not found' });
    } else {
      res.status(200).json({ message: 'Equipment deleted successfully' });
    }
  });
});

module.exports = router;
