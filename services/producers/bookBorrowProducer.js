const connectRabbitMQ = require('../../clients/rabbitmq');

// Fonction générique pour publier des événements
async function publishBorrowEvent(exchange, eventType, payload) {
    const channel = await connectRabbitMQ();
    await channel.assertExchange(exchange, 'topic', { durable: true });

    const routingKey = `${eventType}`;
    const message = { event: routingKey, payload };

    channel.publish(exchange, routingKey, Buffer.from(JSON.stringify(message)));
    console.log(`Published event to exchange ${exchange}:`, message);
}

module.exports = {
    publishUserEvent: (eventType, payload) => publishBorrowEvent('user.events', `user.${eventType}`, payload),

    publishBookEvent: (eventType, payload) => publishBorrowEvent('book-manage.events', `book.${eventType}`, payload)
};
