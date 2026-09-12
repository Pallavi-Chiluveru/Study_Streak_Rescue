const express = require('express');
const { getGamification } = require('../controllers/gamificationController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();
router.get('/', protect, getGamification);

module.exports = router;