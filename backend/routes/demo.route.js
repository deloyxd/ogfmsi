const { Router } = require("express");
const db = require('../database/mysql');
const NotFoundException = require('../exception/Notfound');
const router = Router();

// GET all items
router.get('/', async (req, res) => {
  try {
    const rows = await db.query('SELECT * FROM roles');
    if (!rows || rows.length === 0) {
      //Pwede kayo mag create ng own exception nyo para sa mga different error na pwede mangyari
      const error = new NotFoundException('No items found', 404);

      //Pwede kayo gamit ng jsdocs para mag set ng type for better type checking and type error
      /**
       * @type {{test:string,email:string}[]}
       */
      const simpleArray = [];

      return res.status(error.statusCode).json({
        error: error.name,
        message: error.message
      });
    }
    res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET single item by ID
router.get('/:id', async (req, res) => {
  try {
    const rows = await db.query('SELECT * FROM your_table WHERE id = ?', [req.params.id]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: 'Item not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST new item
router.post('/', async (req, res) => {
  try {
    const item = req.body;
    const result = await db.query('INSERT INTO your_table SET ?', item);
    res.status(201).json({
      message: 'Item created successfully',
      id: result.insertId
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT update item
router.put('/:id', async (req, res) => {
  try {
    const item = req.body;
    const result = await db.query('UPDATE your_table SET ? WHERE id = ?', [item, req.params.id]);
    if (!result || result.affectedRows === 0) {
      return res.status(404).json({ message: 'Item not found' });
    }
    res.json({ message: 'Item updated successfully' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE item
router.delete('/:id', async (req, res) => {
  try {
    const result = await db.query('DELETE FROM your_table WHERE id = ?', [req.params.id]);
    if (!result || result.affectedRows === 0) {
      return res.status(404).json({ message: 'Item not found' });
    }
    res.json({ message: 'Item deleted successfully' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;