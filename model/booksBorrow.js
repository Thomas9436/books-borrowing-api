// borrow-service/models/borrowModel.js
const mongoose = require('mongoose');

const borrowSchema = new mongoose.Schema({
    bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true }, // Référence au livre emprunté
    userId: { type: String, required: true }, // Identifiant de l'utilisateur qui emprunte le livre
    borrowedDate: { type: Date, default: Date.now }, // Date de l'emprunt
    dueDate: { type: Date, required: true }, // Date de retour prévue
    returnedDate: { type: Date }, // Date de retour réelle (si retourné)
});

module.exports = mongoose.model('Borrow', borrowSchema);
