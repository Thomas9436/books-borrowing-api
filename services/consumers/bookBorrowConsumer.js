const connectRabbitMQ = require('../../clients/rabbitmq');

// Map pour stocker les réponses en attente
const pendingResponses = new Map();

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

function resolvePendingResponse(correlationId, result, response) {
    if (pendingResponses.has(correlationId)) {
        const { resolve, timeout } = pendingResponses.get(correlationId);
        clearTimeout(timeout); // Annule le timeout
        console.log('Resolving pending response for correlationId:', correlationId, response);
        resolve(response); // Résout la promesse avec la réponse complète
        pendingResponses.delete(correlationId); // Nettoie la map
    }
}

let userResponsesConsumerStarted = false;
let bookResponsesConsumerStarted = false;

async function consumeUserResponses() {
    if (userResponsesConsumerStarted) return;
    userResponsesConsumerStarted = true;

    const channel = await connectRabbitMQ();
    const queue = 'borrow-service.user.responses.queue';
    const exchange = 'user.responses';

    await channel.assertExchange(exchange, 'topic', { durable: true });
    await channel.assertQueue(queue, { durable: true });
    await channel.bindQueue(queue, exchange, 'user.response.*');

    console.log(`Waiting for user responses in queue: ${queue}...`);

    channel.consume(queue, async (msg) => {
        try {
            if (msg) {
                const response = JSON.parse(msg.content.toString());
                console.log(`Received user response:`, response);

                const { correlationId, status } = response;
                resolvePendingResponse(correlationId, status === 'success', response);
            }
        } catch (error) {
            console.error('Error processing user response:', error);
        } finally {
            channel.ack(msg);
        }
    });
}

async function consumeBookManageResponses() {
    if (bookResponsesConsumerStarted) return;
    bookResponsesConsumerStarted = true;

    const channel = await connectRabbitMQ();
    const queue = 'borrow-service.book-manage.responses.queue';
    const exchange = 'book-manage.responses';

    await channel.assertExchange(exchange, 'topic', { durable: true });
    await channel.assertQueue(queue, { durable: true });
    await channel.bindQueue(queue, exchange, 'book.response.*');

    console.log(`Waiting for book-manage responses in queue: ${queue}...`);

    channel.consume(queue, async (msg) => {
        try {
            if (msg) {
                const response = JSON.parse(msg.content.toString());
                console.log(`Received book-manage response:`, response);

                const { correlationId, status } = response;
                resolvePendingResponse(correlationId, status === 'success', response);
            }
        } catch (error) {
            console.error('Error processing book-manage response:', error);
        } finally {
            channel.ack(msg);
        }
    });
}

module.exports = {
    consumeUserResponses,
    consumeBookManageResponses,
    waitForResponse
};
