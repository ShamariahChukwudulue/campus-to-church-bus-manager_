const express = require('express');
const router = express.Router();
const {
  assignStudent,
  moveStudent,
  removeStudent,
  autoAllocate,
  getDashboardStats
} = require('../controllers/allocationController');
const { protect } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/adminMiddleware');

// All allocation routes are strictly protected for administrators
router.use(protect, requireAdmin);

router.post('/assign', assignStudent);
router.post('/move', moveStudent);
router.post('/remove', removeStudent);
router.post('/auto', autoAllocate);
router.get('/stats', getDashboardStats);

module.exports = router;
