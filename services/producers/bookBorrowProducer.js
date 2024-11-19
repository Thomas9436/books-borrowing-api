const connectRabbitMQ = require('../../clients/rabbitmq');

async function publishBorrowEvent(eventType, payload) {
  const channel = await connectRabbitMQ();
  const exchange = 'borrow.events';
  await channel.assertExchange(exchange, 'topic', { durable: true });

  const routingKey = `borrow.${eventType}`;
  const message = { event: routingKey, payload };

  channel.publish(exchange, routingKey, Buffer.from(JSON.stringify(message)));
  console.log(`Published event: ${routingKey}`, payload);
}

module.exports = { publishBorrowEvent };
