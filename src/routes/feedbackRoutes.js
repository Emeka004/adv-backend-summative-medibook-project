const express = require('express');
const { showFeedback } = require('../controllers/feedbackController');

const router = express.Router();

router.get('/', showFeedback);

module.exports = router;
