const express = require('express');
const router = express.Router();
const {
  getTodayTasks,
  startTask,
  completeTask,
  simulateMissedTasks
} = require('../controllers/taskController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/today', getTodayTasks);
router.patch('/:id/start', startTask);
router.patch('/:id/complete', completeTask);
router.post('/simulate-missed', simulateMissedTasks);

module.exports = router;
