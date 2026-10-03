const express = require('express');
const router = express.Router();
const {
  getBuses,
  getBusById,
  createBus,
  updateBus,
  deleteBus
} = require('../controllers/busController');
const { protect } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/adminMiddleware');

// View buses
router.get('/', getBuses);
router.get('/:id', getBusById);

// Admin-only management
router.post('/', protect, requireAdmin, createBus);
router.put('/:id', protect, requireAdmin, updateBus);
router.delete('/:id', protect, requireAdmin, deleteBus);

module.exports = router;
