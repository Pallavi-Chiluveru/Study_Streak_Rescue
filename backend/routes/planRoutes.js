const express = require('express');
const router = express.Router();
const {
  generatePlanPreview,
  createPlan,
  getPlans,
  getPlanById,
  deletePlan,
  rescuePlanController,
  quickAdaptPlan
} = require('../controllers/planController');
const { getPlanTasks } = require('../controllers/taskController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/generate', generatePlanPreview);
router.post('/', createPlan);
router.get('/', getPlans);
router.get('/:id', getPlanById);
router.delete('/:id', deletePlan);
router.post('/:id/rescue', rescuePlanController);
router.post('/:id/quick-adapt', quickAdaptPlan);
router.get('/:planId/tasks', getPlanTasks);

module.exports = router;
