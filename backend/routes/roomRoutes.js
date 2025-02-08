const express = require('express');
const router = express.Router();
const { createRoom } = require('../controllers/roomController');

router.post('/rooms', createRoom);

module.exports = router;