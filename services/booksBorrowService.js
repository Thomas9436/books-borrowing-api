const Borrow = require('../model/booksBorrow');
const { publishBookEvent, publishUserEvent } = require('./producers/bookBorrowProducer');
const { waitForResponse } = require('./consumers/bookBorrowConsumer');

// Créer un emprunt
exports.createBorrow = async ({ bookId, userId, dueDate }) => {
    const correlationIdUser = generateCorrelationId();
    const correlationIdBook = generateCorrelationId();

    // Étape 1 : Valider l'utilisateur
    await publishUserEvent('validate-user', { userId, correlationId: correlationIdUser });
    const userResponse = await waitForResponse('user.responses', correlationIdUser);

    console.log(userResponse);
    if (userResponse.status !== 'success') {
        console.error('Error in Step 1:', userResponse.message);
        throw new Error(userResponse.message);
    }

    // Étape 2 : Vérifier la disponibilité du livre
    console.log('Step 2: Check book availability - Publishing event');
    await publishBookEvent('check-book-availability', { bookId, correlationId: correlationIdBook });
    const bookResponse = await waitForResponse('book-manage.responses', correlationIdBook);
    if (bookResponse.status !== 'success') throw new Error(bookResponse.message);

    // Étape 3 : Créer l'emprunt
    const borrow = new Borrow({ bookId, userId, dueDate, status: 'borrowed' });
    await borrow.save();

    return borrow;
};

// Prolonger la durée de l'emprunt
exports.extendDueDate = async (borrowId, additionalDays) => {
    console.log(borrowId);
    const borrow = await Borrow.findById(borrowId);
    if (!borrow) throw new Error('Emprunt non trouvé');

    borrow.dueDate.setDate(borrow.dueDate.getDate() + additionalDays);
    await borrow.save();
    return borrow;
};

// Obtenir tous les emprunts
exports.getAllBorrows = async () => {
    return await Borrow.find().populate('bookId');
};

// Fonction pour générer un ID unique
function generateCorrelationId() {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}
