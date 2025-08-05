

const { Router } = require("express");
const mysqlConnection = require('../database/mysql');
const NotFoundException = require('../exception/Notfound');
const router = Router();



// GET all items
router.get('/', (req, res) => {
    mysqlConnection.query('SELECT * FROM roles', (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!rows || rows.length === 0) {
            //Pwede kayo mag create ng own exception nyo para sa mga different error na pwede mangyari
            const error = new NotFoundException('No items found',404);


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
    });
});

// GET single item by ID
router.get('/:id', (req, res) => {
    mysqlConnection.query('SELECT * FROM your_table WHERE id = ?', [req.params.id], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Item not found' });
        }
        res.json(rows[0]);
    });
});

// POST new item
router.post('/', (req, res) => {
    const item = req.body;
    mysqlConnection.query('INSERT INTO your_table SET ?', item, (err, result) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({
            message: 'Item created successfully',
            id: result.insertId
        });
    });
});

// PUT update item
router.put('/:id', (req, res) => {
    const item = req.body;
    mysqlConnection.query('UPDATE your_table SET ? WHERE id = ?', [item, req.params.id], (err, result) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Item not found' });
        }
        res.json({ message: 'Item updated successfully' });
    });
});

// DELETE item
router.delete('/:id', (req, res) => {
    mysqlConnection.query('DELETE FROM your_table WHERE id = ?', [req.params.id], (err, result) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Item not found' });
        }
        res.json({ message: 'Item deleted successfully' });
    });
});

module.exports = router;