// borrow-service/routes/borrowRoutes.js
const express = require('express');
const borrowController = require('../controller/booksBorrow');

const router = express.Router();

// Emprunter un livre
router.post('/', borrowController.borrowBook);

// Mettre à jour le statut de l'emprunt (ex: le retourner)
router.patch('/:id/status', borrowController.updateBorrowStatus);

// Prolonger la durée de l'emprunt
router.patch('/:id/extend', borrowController.extendBorrowDueDate);

// Supprimer un emprunt
router.delete('/:id', borrowController.deleteBorrow);

// Obtenir tous les emprunts
router.get('/', borrowController.getAllBorrows);

module.exports = router;
