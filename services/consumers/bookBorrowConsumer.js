const connectRabbitMQ = require('../../clients/rabbitmq');

// Map pour stocker les réponses en attente
const pendingResponses = new Map();

function resolvePendingResponse(correlationId, result) {
    if (pendingResponses.has(correlationId)) {
        const { resolve, timeout } = pendingResponses.get(correlationId);
        clearTimeout(timeout); // Annule le timeout
        resolve(result); // Résout la promesse avec le résultat
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
                resolvePendingResponse(correlationId, status === 'success'); // Résout ou rejette
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
    await channel.bindQueue(queue, exchange, 'book-manage.response.*');

    console.log(`Waiting for book-manage responses in queue: ${queue}...`);

    channel.consume(queue, async (msg) => {
        try {
            if (msg) {
                const response = JSON.parse(msg.content.toString());
                console.log(`Received book-manage response:`, response);

                const { correlationId, status } = response;
                resolvePendingResponse(correlationId, status === 'success'); // Résout ou rejette
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
    resolvePendingResponse,
    consumeBookManageResponses
};
