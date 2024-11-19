const express = require('express');
const cors = require('cors');
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUI = require('swagger-ui-express');
const app = express();
require('dotenv').config();
const connectDB = require('./database/db');
const routes = require('./routes/index');
const { consumeUserResponses, consumeBookManageResponses } = require('./services/consumers/bookBorrowConsumer');

connectDB();
const port = process.env.PORT || 6000;

app.use(express.json());

// Lancer les consumers pour écouter les réponses
consumeUserResponses();
consumeBookManageResponses();

app.use(
    cors({
        origin: '*', // Autorise toutes les origines
        methods: 'GET,POST,PUT,DELETE',
        allowedHeaders: 'Content-Type,Authorization'
    })
);

app.use(routes);

const swaggerOptions = {
    swaggerDefinition: {
        openapi: '3.0.0',
        info: {
            title: 'API',
            version: '1.0.0'
        }
    },
    apis: ['./routes/**/*.js', './model/**/*.js', './swagger.js'] // Inclure les fichiers routes et swagger.js
};
const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerDocs));

app.get('/', (req, res) => {
    res.send('Bienvenue sur mon API!');
});

app.listen(port, () => {
    console.log(`Serveur en écoute sur http://localhost:${port}`);
});
