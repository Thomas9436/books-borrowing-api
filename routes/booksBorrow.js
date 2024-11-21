// borrow-service/routes/borrowRoutes.js
const express = require('express');
const borrowController = require('../controller/booksBorrow');

const router = express.Router();

// Emprunter un livre
router.post('/', borrowController.borrowBook);

// Prolonger la durée de l'emprunt
router.post('/extend/:id', borrowController.extendBorrowDueDate);

// Obtenir tous les emprunts
router.get('/', borrowController.getAllBorrows);

module.exports = router;
