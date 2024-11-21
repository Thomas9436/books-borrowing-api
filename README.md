# Book-borrowing-api

Cette application sert de servive API de gestion des emprunts des livres, elle communique avec l'API users et l'API books-management via RabbitMQ afin de gérer la création d'un emprunt à partir d'un userId et d'un bookId.
Elle effectue également récupérer la liste des livres et augmenter le delais de la date de rendu de l'emprunt.

# Prérequis

Avant de commencer, assurez-vous d'avoir les outils suivants installés sur votre machine :

-   Docker et Docker Compose
-   Node.js (si vous souhaitez exécuter l'application en local, hors conteneur Docker)

Par défaut le projet est fait pour être lancé avec docker de préférence.

# Configuration

Variables d'environnement
Le fichier .env n'est pas inclus dans ce dépôt. Vous devez créer un fichier .env à la racine du projet avec les variables suivantes :
```plaintext
Port de l'application
PORT=6000 //Port de l'api Books-borrow

ATTENTION : Configuration RabbitMQ pour Docker
RABBITMQ_URL=amqp://user:password@rabbitmq:5672

ATTENTION : Configuration RabbitMQ pour exécution locale
RABBITMQ_URL=amqp://user:password@localhost:5672
```
# Lancer l'application avec Docker :

Créer un fichier docker-compose.yml dans un dossier parent du dossier clone :
```yaml
version: '3.8'

services:
  traefik:
    container_name: traefik
    image: traefik:v2.9
    command:
      - "--api.insecure=true"
      - "--api.dashboard=true"
      - "--providers.docker=true"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.dashboard.address=:8081" # Entrypoint dédié au dashboard
    ports:
      - "80:80"       # API Gateway / Web
      - "8081:8081"   # Dashboard
    volumes:
      - "/var/run/docker.sock:/var/run/docker.sock:ro"
    networks:
      - app-network
    labels:
      - "traefik.http.routers.traefik.rule=Host(`localhost`)"
      - "traefik.http.routers.traefik.service=api@internal"
      - "traefik.http.routers.traefik.entrypoints=dashboard"
      - "traefik.http.middlewares.traefik-auth.basicauth.users=test:$$apr1$$H6uskkkW$$IgXLP6ewTrSuBkTrqE8wj/"

  gateway-api:
    build:
      context: ./gateway-api
    container_name: gateway-api
    depends_on:
      - rabbitmq
    labels:
      - "traefik.http.routers.gateway.rule=Host(`localhost`)"
      - "traefik.http.services.gateway.loadbalancer.server.port=3000"
      - "traefik.http.routers.gateway.entrypoints=web" # Utilise le port 80
    networks:
      - app-network

  users-api:
    build:
      context: ./users-api
    container_name: users-api
    depends_on:
      - rabbitmq
    labels:
      - "traefik.http.routers.users.rule=PathPrefix(`/users`)" # Route pour Users API
      - "traefik.http.services.users.loadbalancer.server.port=4000"
      - "traefik.http.routers.users.entrypoints=web"
    networks:
      - app-network

  books-management-api:
    build:
      context: ./books-management-api
    container_name: books-management-api
    depends_on:
      - rabbitmq
    labels:
      - "traefik.http.routers.books-management.rule=PathPrefix(`/books/manage`)" # Route pour Books Management
      - "traefik.http.services.books-management.loadbalancer.server.port=5000"
      - "traefik.http.routers.books-management.entrypoints=web"
    networks:
      - app-network

  books-borrowing-api: 
    build:
      context: ./books-borrowing-api
    container_name: books-borrowing-api
    depends_on:
      - rabbitmq
    labels:
      - "traefik.http.routers.books-borrowing.rule=PathPrefix(`/books/borrow`)" # Route pour Books Borrowing
      - "traefik.http.services.books-borrowing.loadbalancer.server.port=6000"
      - "traefik.http.routers.books-borrowing.entrypoints=web"
    networks:
      - app-network

  rabbitmq:
    image: rabbitmq:3-management
    container_name: rabbitmq
    ports:
      - "5672:5672"   # AMQP port
      - "15672:15672" # Management UI
    environment:
      RABBITMQ_DEFAULT_USER: user
      RABBITMQ_DEFAULT_PASS: password
    networks:
      - app-network

networks:
  app-network:
    name: app-network
    driver: bridge
```
Executer le fichier pour build et run les containers avec la commande :
```plaintext
docker-compose up
```
# Endpoints avec Docker

1. API Gateway
   URL : http://localhost

La Gateway est le seul service exposé publiquement via Traefik. Elle joue le rôle de point d'entrée pour les requêtes vers les autres services.

2. Traefik
   URL : http://localhost:8081

Ce tableau de bord est activé uniquement pour le suivi des routes et services.

3. RabbitMQ
   URL : http://localhost:5672

Identifiant par défaut : user
Mot de passe par défaut : password

4. Les services communiquent sur le reséau interne : app-network

5. Les endpoints des autres services (API users, API books-manage, API books-borrow) ne sont pas exposés directement pour des raisons de sécurité.
   Ces services sont uniquement accessibles à travers la Gateway (via les proxys internes définis dans la Gateway).
   Ce qui serait également le cas de la gateway si jamais un front était présent.
   Cela garantit que les services ne sont jamais accessibles directement depuis l'extérieur, limitant les risques d'attaques.

6. Exemple de requêtes :
   Utilisation des utilisateurs : /users
   Gestion des livres : /books/manage
   Emprunt de livres : /books/borrow

# Pour tester en Local (si jamais):

1. Lancer chaque service avec la commande :
```plaintext
npm start
```
2. Modifier le fichier .env de chaque service pour lancer RabbitMQ en local et non avec docker :
`plaintext
PORT=6000 //Port de l'api Books-borrow
#Local
RABBITMQ_URL=amqp://user:password@localhost:5672
```
3. Modifier le proxy dans l'index.js de la gateway API afin d'utiliser les path en local :
```javascript
// Redirection vers l'API Users
app.use(
  '/users',
  createProxyMiddleware({
    target: 'http://localhost:4000', // En local
    changeOrigin: true,
    onProxyReq: fixRequestBody, // Réécrit le corps de la requête avant de la transmettre
    onError: (err, req, res) => {
      console.error('Proxy error:', err.message);
      res.status(502).json({ message: 'Erreur de communication avec Users API.' });
    },
  })
);

// Redirection vers l'API Books Management
app.use(
  '/books/manage',
  createProxyMiddleware({
    target: 'http://localhost:5000', // En local
    changeOrigin: true,
    onProxyReq: fixRequestBody,
    onError: (err, req, res) => {
      console.error('Erreur de proxy :', err.message);
      res.status(502).json({
        message: 'Erreur de communication avec book-management.',
        error: err.message,
      });
    },
  })
);

// Redirection vers l'API Book Borrow
app.use(
  '/books/borrow',
  createProxyMiddleware({
    target: 'http://localhost:6000', // En local
    changeOrigin: true,
    onProxyReq: fixRequestBody,
    onError: (err, req, res) => {
      console.error('Erreur de proxy :', err.message);
      res.status(502).json({
        message: 'Erreur de communication avec book-borrow.',
        error: err.message,
      });
    },
  })
);

```
# Endpoint en local

1. API Gateway
   URL : http://localhost:3000

La Gateway est le seul service exposé publiquement via Traefik. Elle joue le rôle de point d'entrée pour les requêtes vers les autres services.

2. Traefik

Traefik n'a pas d'intêret en local.

3. RabbitMQ
   URL : http://localhost:5672

Il faut lancer le conteneur RabbitMQ même si on test tous les services en local :
```yaml
rabbitmq:
image: rabbitmq:3-management
container_name: rabbitmq
ports: - "5672:5672" # AMQP port - "15672:15672" # Management UI
environment:
RABBITMQ_DEFAULT_USER: user
RABBITMQ_DEFAULT_PASS: password
```
4. Users API
   URL : http://localhost:4000

5. Books-mangement API
   URL : http://localhost:5000

6. Books-borrowing API
   URL : http://localhost:6000
