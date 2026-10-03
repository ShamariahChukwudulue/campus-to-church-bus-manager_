const express = require('express');
const router = express.Router();
const {
  getTrips,
  getTripById,
  createTrip,
  updateTrip,
  toggleTripRegistrationStatus,
  deleteTrip
} = require('../controllers/tripController');
const { protect } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/adminMiddleware');

// Public/authenticated view routes
router.get('/', getTrips);
router.get('/:id', getTripById);

// Admin-only management routes
router.post('/', protect, requireAdmin, createTrip);
router.put('/:id', protect, requireAdmin, updateTrip);
router.put('/:id/status', protect, requireAdmin, toggleTripRegistrationStatus);
router.delete('/:id', protect, requireAdmin, deleteTrip);

module.exports = router;
