const Borrow = require('../model/booksBorrow');
const { publishBorrowEvent } = require('./producers/bookBorrowProducer');
const { consumeBookManageResponses, consumeUserResponses} = require('./consumers/bookBorrowConsumer');

const pendingResponses = new Map();

// Créer un emprunt
exports.createBorrow = async ({ bookId, userId, dueDate }) => {
    const correlationIdUser = generateCorrelationId();
    const correlationIdBook = generateCorrelationId();

    // Étape 1 : Valider l'utilisateur
    await publishBorrowEvent('validate-user', { userId, correlationId: correlationIdUser });
    const userResponse = await waitForResponse('user.responses', correlationIdUser);
    if (userResponse.status !== 'success') throw new Error(userResponse.message);

    // Étape 2 : Vérifier la disponibilité du livre
    await publishBorrowEvent('check-book-availability', { bookId, correlationId: correlationIdBook });
    const bookResponse = await waitForResponse('book-manage.responses', correlationIdBook);
    if (bookResponse.status !== 'success') throw new Error(bookResponse.message);

    // Étape 3 : Créer l'emprunt
    const borrow = new Borrow({ bookId, userId, dueDate, status: 'borrowed' });
    await borrow.save();

    return borrow;
};

// Mettre à jour le statut de l'emprunt
exports.updateBorrowStatus = async (borrowId, status) => {
    const borrow = await Borrow.findById(borrowId);
    if (!borrow) throw new Error('Emprunt non trouvé');

    if (status === 'returned') {
        borrow.returnedDate = new Date();

        // Publier l'événement `borrow.book-returned` avec l'ID du livre
        await publishBorrowEvent('book-returned', { bookId: borrow.bookId })

        // Mettre à jour le statut du livre à "available"
        await Book.findByIdAndUpdate(borrow.bookId, { status: 'available' });
    }

    borrow.status = status;
    await borrow.save();
    return borrow;
};

// Prolonger la durée de l'emprunt
exports.extendDueDate = async (borrowId, additionalDays) => {
    const borrow = await Borrow.findById(borrowId);
    if (!borrow) throw new Error('Emprunt non trouvé');

    borrow.dueDate.setDate(borrow.dueDate.getDate() + additionalDays);
    await borrow.save();
    return borrow;
};

// Supprimer un emprunt
exports.deleteBorrow = async (borrowId) => {
    const borrow = await Borrow.findByIdAndDelete(borrowId);
    if (!borrow) throw new Error('Emprunt non trouvé');

    await publishBorrowEvent('book-returned', { bookId: borrow.bookId });
};

// Obtenir tous les emprunts
exports.getAllBorrows = async () => {
    return await Borrow.find().populate('bookId');
};

//Fonction pour attendre de consommer les events responses des autres apis
async function waitForResponse(queue, correlationId, timeoutDuration = 5000) {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error(`Timeout waiting for response with correlationId: ${correlationId}`));
        }, timeoutDuration);

        pendingResponses.set(correlationId, { resolve, timeout });

        if (queue === 'users.responses') {
            consumeUserResponses(); 
        } else if (queue === 'manage.responses') {
            consumeBookManageResponses(); // Consumer pour book-manage
        }
    });
}

// Fonction pour générer un ID unique
function generateCorrelationId() {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

