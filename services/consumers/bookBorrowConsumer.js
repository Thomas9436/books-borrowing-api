const connectRabbitMQ = require('../../clients/rabbitmq');

// Fonction pour gérer les réponses en attente
const pendingResponses = new Map();

function resolvePendingResponse(correlationId, result) {
    if (pendingResponses.has(correlationId)) {
        const { resolve, timeout } = pendingResponses.get(correlationId);
        clearTimeout(timeout); // Annule le timeout
        resolve(result); // Résout la promesse avec le résultat
        pendingResponses.delete(correlationId); // Nettoie la map
    }
}

async function consumeUserResponses() {
    const channel = await connectRabbitMQ();
    const queue = 'borrow-service.user.responses.queue';
    const exchange = 'user.responses'; // L'échange où l'API `users` publie ses réponses

    await channel.assertExchange(exchange, 'topic', { durable: true });
    await channel.assertQueue(queue, { durable: true });
    await channel.bindQueue(queue, exchange, 'user.response.*'); // Écoute toutes les réponses des utilisateurs

    console.log(`Waiting for user responses in queue: ${queue}...`);

    channel.consume(queue, async (msg) => {
        if (msg) {
            const response = JSON.parse(msg.content.toString());
            console.log(`Received user response:`, response);

            const { correlationId, status, message } = response;

            if (status === 'success') {
                resolvePendingResponse(correlationId, true); // Réponse réussie
            } else {
                resolvePendingResponse(correlationId, false); // Réponse échouée
            }

            channel.ack(msg);
        }
    });
}

async function consumeBookManageResponses() {
  const channel = await connectRabbitMQ();
  const queue = 'borrow-service.book-manage.responses.queue';
  const exchange = 'book-manage.responses'; // L'échange où l'API `book-manage` publie ses réponses

  await channel.assertExchange(exchange, 'topic', { durable: true });
  await channel.assertQueue(queue, { durable: true });
  await channel.bindQueue(queue, exchange, 'book-manage.response.*'); // Écoute toutes les réponses de book-manage

  console.log(`Waiting for book-manage responses in queue: ${queue}...`);

  channel.consume(queue, async (msg) => {
      if (msg) {
          const response = JSON.parse(msg.content.toString());
          console.log(`Received book-manage response:`, response);

          const { correlationId, status, message } = response;

          if (status === 'success') {
              resolvePendingResponse(correlationId, true); // Réponse réussie
          } else {
              resolvePendingResponse(correlationId, false); // Réponse échouée
          }

          channel.ack(msg);
      }
  });
}


module.exports = { consumeUserResponses, resolvePendingResponse, consumeBookManageResponses };
