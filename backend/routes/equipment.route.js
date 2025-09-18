const { Router } = require("express");
const mysqlConnection = require('../database/mysql');
const { generateEquipmentCode, updateGeneralStatus, updateGeneralStatusForEquipment } = require('../utils/helper');
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
  const query = `
    SELECT e.*, COALESCE(SUM(CASE WHEN i.individual_status = 'Unavailable' THEN 1 ELSE 0 END), 0) AS unavailable_count
    FROM gym_equipment_tbl e
    LEFT JOIN gym_equipment_items_tbl i ON i.equipment_id = e.equipment_id
    GROUP BY e.equipment_id
    ORDER BY e.created_at DESC
  `;
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
  mysqlConnection.query(query, params, (error, result) => {
    if (error) {
      console.error('Fetching items error:', error);
      return res.status(500).json({ error: 'Fetching equipment items failed' });
    }
    res.status(200).json({ message: 'Fetching equipment items successful', result });
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
  
  // Start transaction
  mysqlConnection.beginTransaction((err) => {
    if (err) {
      console.error('Transaction start error:', err);
      return res.status(500).json({ error: 'Transaction failed' });
    }

    // Update main equipment record
    const query = 'UPDATE gym_equipment_tbl SET equipment_name = ?, equipment_type = ?, total_quantity = ?, image_url = ?, general_status = ?, notes = ? WHERE equipment_id = ?';
    
    mysqlConnection.query(query, [equipment_name, equipment_type, total_quantity, image_url, general_status, notes, id], (error, result) => {
      if (error) {
        console.error('Updating equipment error:', error);
        return mysqlConnection.rollback(() => {
          res.status(500).json({ error: 'Updating equipment failed' });
        });
      }
      
      if (result.affectedRows === 0) {
        return mysqlConnection.rollback(() => {
          res.status(404).json({ error: 'Equipment not found' });
        });
      }

      // Update individual item codes if equipment name changed
      const updateItemCodesQuery = 'UPDATE gym_equipment_items_tbl SET item_code = ? WHERE item_id = ?';
      
      // Get all individual items for this equipment
      const getItemsQuery = 'SELECT item_id FROM gym_equipment_items_tbl WHERE equipment_id = ? ORDER BY item_id ASC';
      
      mysqlConnection.query(getItemsQuery, [id], (itemsError, itemsResult) => {
        if (itemsError) {
          console.error('Getting equipment items error:', itemsError);
          return mysqlConnection.rollback(() => {
            res.status(500).json({ error: 'Failed to get equipment items' });
          });
        }

        // Update each item code
        const itemPromises = itemsResult.map((item, index) => {
          const newItemCode = generateEquipmentCode(equipment_name, index + 1);
          
          return new Promise((resolve, reject) => {
            mysqlConnection.query(updateItemCodesQuery, [newItemCode, item.item_id], (updateError) => {
              if (updateError) {
                reject(updateError);
              } else {
                resolve();
              }
            });
          });
        });

        // Wait for all item codes to be updated
        Promise.all(itemPromises)
          .then(() => {
            mysqlConnection.commit((commitError) => {
              if (commitError) {
                console.error('Commit error:', commitError);
                return mysqlConnection.rollback(() => {
                  res.status(500).json({ error: 'Failed to commit transaction' });
                });
              }
              res.status(200).json({ message: 'Equipment and item codes updated successfully' });
            });
          })
          .catch((updateError) => {
            console.error('Updating item codes error:', updateError);
            mysqlConnection.rollback(() => {
              res.status(500).json({ error: 'Failed to update item codes' });
            });
          });
      });
    });
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

// DELETE individual equipment item (Dispose)
router.delete('/items/:itemId', async (req, res) => {
  const { itemId } = req.params;
  // Mark as Disposed and set disposed_at
  const query = "UPDATE gym_equipment_items_tbl SET individual_status = 'Disposed', disposed_at = CURRENT_TIMESTAMP WHERE item_id = ?";
  
  mysqlConnection.query(query, [itemId], (error, result) => {
    if (error) {
      console.error('Disposing equipment item error:', error);
      return res.status(500).json({ error: 'Disposing equipment item failed' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Equipment item not found' });
    }
    // Update general status for parent equipment after disposal
    updateGeneralStatus(itemId, res, mysqlConnection);
  });
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
  
  // Start transaction
  mysqlConnection.beginTransaction((err) => {
    if (err) {
      console.error('Transaction start error:', err);
      return res.status(500).json({ error: 'Transaction failed' });
    }

    // First, verify the equipment exists and get current quantity
    const getEquipmentQuery = 'SELECT total_quantity FROM gym_equipment_tbl WHERE equipment_id = ?';
    
    mysqlConnection.query(getEquipmentQuery, [id], (error, result) => {
      if (error) {
        console.error('Getting equipment error:', error);
        return mysqlConnection.rollback(() => {
          res.status(500).json({ error: 'Failed to get equipment' });
        });
      }
      
      if (result.length === 0) {
        return mysqlConnection.rollback(() => {
          res.status(404).json({ error: 'Equipment not found' });
        });
      }
      
      const currentQuantity = result[0].total_quantity;
      const newQuantity = currentQuantity + add_quantity;
      
      // Update the total quantity in the main equipment table
      const updateQuantityQuery = 'UPDATE gym_equipment_tbl SET total_quantity = ? WHERE equipment_id = ?';
      
      mysqlConnection.query(updateQuantityQuery, [newQuantity, id], (updateError) => {
        if (updateError) {
          console.error('Updating quantity error:', updateError);
          return mysqlConnection.rollback(() => {
            res.status(500).json({ error: 'Failed to update quantity' });
          });
        }
        
        // Create new individual items
        const createItemsQuery = 'INSERT INTO gym_equipment_items_tbl (item_id, equipment_id, item_code, individual_status) VALUES (?, ?, ?, ?)';
        
        const itemPromises = [];
        for (let i = 0; i < add_quantity; i++) {
          const itemIndex = start_index + i;
          const item_id = id + '_ITEM_' + itemIndex;
          const item_code = generateEquipmentCode(equipment_name, itemIndex);
          
          itemPromises.push(new Promise((resolve, reject) => {
            mysqlConnection.query(createItemsQuery, [item_id, id, item_code, 'Available'], (itemError) => {
              if (itemError) {
                reject(itemError);
              } else {
                resolve();
              }
            });
          }));
        }
        
        // Wait for all new items to be created
        Promise.all(itemPromises)
          .then(() => {
            mysqlConnection.commit((commitError) => {
              if (commitError) {
                console.error('Commit error:', commitError);
                return mysqlConnection.rollback(() => {
                  res.status(500).json({ error: 'Failed to commit transaction' });
                });
              }

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
              }, mysqlConnection);
            });
          })
          .catch((createError) => {
            console.error('Creating items error:', createError);
            mysqlConnection.rollback(() => {
              res.status(500).json({ error: 'Failed to create new items' });
            });
          });
      });
    });
  });
});


// DELETE equipment
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  
  // Start transaction
  mysqlConnection.beginTransaction((err) => {
    if (err) {
      console.error('Transaction start error:', err);
      return res.status(500).json({ error: 'Transaction failed' });
    }

    // First, verify the equipment exists
    const checkQuery = 'SELECT equipment_id FROM gym_equipment_tbl WHERE equipment_id = ?';
    
    mysqlConnection.query(checkQuery, [id], (checkError, checkResult) => {
      if (checkError) {
        console.error('Checking equipment error:', checkError);
        return mysqlConnection.rollback(() => {
          res.status(500).json({ error: 'Failed to check equipment' });
        });
      }
      
      if (checkResult.length === 0) {
        return mysqlConnection.rollback(() => {
          res.status(404).json({ error: 'Equipment not found' });
        });
      }
      
      // Delete the equipment (individual items will be deleted automatically due to CASCADE)
      const deleteQuery = 'DELETE FROM gym_equipment_tbl WHERE equipment_id = ?';
      
      mysqlConnection.query(deleteQuery, [id], (error, result) => {
        if (error) {
          console.error('Deleting equipment error:', error);
          return mysqlConnection.rollback(() => {
            res.status(500).json({ error: 'Deleting equipment failed' });
          });
        }
        
        mysqlConnection.commit((commitError) => {
          if (commitError) {
            console.error('Commit error:', commitError);
            return mysqlConnection.rollback(() => {
              res.status(500).json({ error: 'Failed to commit transaction' });
            });
          }
          
          res.status(200).json({ 
            message: 'Equipment and all associated items deleted successfully',
            deleted_equipment: id
          });
        });
      });
    });
  });
});

module.exports = router;
