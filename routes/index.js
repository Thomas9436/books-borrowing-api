const express = require('express');
const booksBorrow = require('../routes/booksBorrow');

const router = express.Router();

router.use(booksBorrow);

module.exports = router;
