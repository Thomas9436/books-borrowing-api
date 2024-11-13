// borrow-service/services/booksBorrowService.js
const mqttClient = require('../config/mqttClient');

const publishEvent = (topic, message) => {
    mqttClient.publish(topic, JSON.stringify(message), (err) => {
        if (err) {
            console.error('Erreur de publication MQTT:', err);
        }
    });
};

module.exports = {
    bookBorrowed: (bookId) => {
        publishEvent('book/borrowed', { bookId, status: 'borrowed' });
    },
    bookReturned: (bookId) => {
        publishEvent('book/returned', { bookId, status: 'available' });
    }
};
