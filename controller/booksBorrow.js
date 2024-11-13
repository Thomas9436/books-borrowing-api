// borrow-service/controllers/borrowController.js
const Borrow = require('../model/booksBorrow');
const mqttClient = require('../config/mqttClient');
const booksBorrowService = require('../service/booksBorrowService');
const { v4: uuidv4 } = require('uuid');

exports.borrowBook = async (req, res) => {
    const { bookId, userId, dueDate } = req.body;
    const correlationId = uuidv4(); // Crée un identifiant de corrélation

    try {
        // Étape 1 : Valider l'utilisateur via MQTT
        await new Promise((resolve, reject) => {
            mqttClient.publish('user-get', JSON.stringify({ userId, correlationId }), (err) => {
                if (err) return reject(err);
                mqttClient.on('message', (topic, message) => {
                    const response = JSON.parse(message);
                    if (topic === 'user-get-response' && response.correlationId === correlationId) {
                        mqttClient.removeAllListeners('message'); // Nettoyage des écouteurs
                        if (response.status === 'success') {
                            resolve();
                        } else {
                            reject(new Error('Utilisateur non trouvé'));
                        }
                    }
                });
            });
        });

        // Étape 2 : Vérifier la disponibilité du livre via MQTT
        await new Promise((resolve, reject) => {
            mqttClient.publish('book/checkAvailability', JSON.stringify({ bookId, correlationId }), (err) => {
                if (err) return reject(err);
                mqttClient.on('message', (topic, message) => {
                    const response = JSON.parse(message);
                    if (topic === 'book/checkAvailability/response' && response.correlationId === correlationId) {
                        mqttClient.removeAllListeners('message'); // Nettoyage des écouteurs
                        if (response.isAvailable) {
                            resolve();
                        } else {
                            reject(new Error('Livre non disponible'));
                        }
                    }
                });
            });
        });

        // Étape 3 : Créer l'emprunt
        const borrow = new Borrow({ bookId, userId, dueDate, status: 'borrowed' });
        await borrow.save();

        // Notifier que le livre est emprunté
        booksBorrowService.notifyBookBorrowed(bookId);
        res.status(201).json(borrow);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Mettre à jour le statut de l'emprunt
exports.updateBorrowStatus = async (req, res) => {
    const { status } = req.body;

    try {
        const borrow = await Borrow.findById(req.params.id);
        if (!borrow) return res.status(404).json({ message: 'Emprunt non trouvé' });

        if (status === 'returned') {
            // Mettre à jour la date de retour et publier l'événement de retour
            borrow.returnedDate = new Date();
            booksBorrowService.bookReturned(borrow.bookId);
        }

        // Mettre à jour le statut de l'emprunt et sauvegarder
        borrow.status = status;
        await borrow.save();

        res.json({ message: `Statut de l'emprunt mis à jour à "${status}"`, borrow });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Prolonger la durée de l'emprunt
exports.extendBorrowDueDate = async (req, res) => {
    const { additionalDays } = req.body;

    try {
        const borrow = await Borrow.findById(req.params.id);
        if (!borrow) return res.status(404).json({ message: 'Emprunt non trouvé' });

        // Calculer la nouvelle date de retour
        borrow.dueDate.setDate(borrow.dueDate.getDate() + additionalDays);
        await borrow.save();

        res.json({ message: `Emprunt prolongé de ${additionalDays} jours`, borrow });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Supprimer un emprunt
exports.deleteBorrow = async (req, res) => {
    try {
        const borrow = await Borrow.findByIdAndDelete(req.params.id);
        if (!borrow) return res.status(404).json({ message: 'Emprunt non trouvé' });

        // Publier un événement pour notifier que le livre est de nouveau disponible
        booksBorrowService.bookReturned(borrow.bookId);

        res.json({ message: 'Emprunt supprimé avec succès' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Obtenir tous les emprunts
exports.getAllBorrows = async (req, res) => {
    try {
        const borrows = await Borrow.find().populate('bookId');
        res.json(borrows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
