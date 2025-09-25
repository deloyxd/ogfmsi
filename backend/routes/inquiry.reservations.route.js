const express = require('express');
const router = express.Router();
const db = require('../database/firebase');

// GET all reservations
router.get('/reservations', async (req, res) => {
    try {
        const snapshot = await db.collection('reservations').get();
        const reservations = [];
        snapshot.forEach(doc => {
            reservations.push({ id: doc.id, ...doc.data() });
        });
        res.status(200).json(reservations);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching reservations', error });
    }
});

// POST new reservation
router.post('/reservations', async (req, res) => {
    try {
        const reservation = req.body;
        if (!reservation.id) {
            return res.status(400).json({ message: 'Reservation ID is required' });
        }
        await db.collection('reservations').doc(reservation.id).set(reservation);
        res.status(201).json({ message: 'Reservation created successfully', id: reservation.id });
    } catch (error) {
        res.status(500).json({ message: 'Error creating reservation', error });
    }
});

// PUT update reservation
router.put('/reservations/:id', async (req, res) => {
    try {
        const reservationId = req.params.id;
        const updatedData = req.body;
        await db.collection('reservations').doc(reservationId).update(updatedData);
        res.status(200).json({ message: `Reservation ${reservationId} updated successfully` });
    } catch (error) {
        res.status(500).json({ message: 'Error updating reservation', error });
    }
});

// DELETE reservation
router.delete('/reservations/:id', async (req, res) => {
    try {
        const reservationId = req.params.id;
        await db.collection('reservations').doc(reservationId).delete();
        res.status(200).json({ message: `Reservation ${reservationId} deleted successfully` });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting reservation', error });
    }
});

module.exports = router;