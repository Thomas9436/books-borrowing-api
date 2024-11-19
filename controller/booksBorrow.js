const booksBorrowService = require('../services/booksBorrowService');

// Créer un emprunt
exports.borrowBook = async (req, res) => {
    const { bookId, userId, dueDate } = req.body;

    try {
        const borrow = await booksBorrowService.createBorrow({ bookId, userId, dueDate });
        res.status(201).json(borrow);
    } catch (error) {
        console.error('Error in borrowBook:', error.message);
        res.status(400).json({ message: error.message });
    }
};

// Mettre à jour le statut de l'emprunt
exports.updateBorrowStatus = async (req, res) => {
    const { status } = req.body;

    try {
        const borrow = await booksBorrowService.updateBorrowStatus(req.params.id, status);
        res.json({ message: `Statut de l'emprunt mis à jour à "${status}"`, borrow });
    } catch (error) {
        console.error('Error in updateBorrowStatus:', error.message);
        res.status(400).json({ message: error.message });
    }
};

// Prolonger la durée de l'emprunt
exports.extendBorrowDueDate = async (req, res) => {
    const { additionalDays } = req.body;

    try {
        const borrow = await booksBorrowService.extendDueDate(req.params.id, additionalDays);
        res.json({ message: `Emprunt prolongé de ${additionalDays} jours`, borrow });
    } catch (error) {
        console.error('Error in extendBorrowDueDate:', error.message);
        res.status(400).json({ message: error.message });
    }
};

// Supprimer un emprunt
exports.deleteBorrow = async (req, res) => {
    try {
        await booksBorrowService.deleteBorrow(req.params.id);
        res.json({ message: 'Emprunt supprimé avec succès' });
    } catch (error) {
        console.error('Error in deleteBorrow:', error.message);
        res.status(500).json({ message: error.message });
    }
};

// Obtenir tous les emprunts
exports.getAllBorrows = async (req, res) => {
    try {
        const borrows = await booksBorrowService.getAllBorrows();
        res.json(borrows);
    } catch (error) {
        console.error('Error in getAllBorrows:', error.message);
        res.status(500).json({ message: error.message });
    }
};
