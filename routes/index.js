const express = require('express');
const booksBorrow = require('../routes/booksBorrow');

const router = express.Router();

router.use('/books-borrow', booksBorrow);

module.exports = router;
