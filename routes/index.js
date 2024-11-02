const express = require('express');
const booksBorrow = require('./booksBorrow');

const router = express.Router();

router.use('/books-borrow', booksBorrow);

module.exports = router;
