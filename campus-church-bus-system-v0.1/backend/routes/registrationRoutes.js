const express = require('express');
const router = express.Router();
const {
  registerForTrip,
  getMyRegistration,
  getRegistrations,
  cancelRegistration
} = require('../controllers/registrationController');
const { protect } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/adminMiddleware');

// Student endpoints
router.post('/', protect, registerForTrip);
router.get('/my', protect, getMyRegistration);

// Admin view all registrations
router.get('/', protect, requireAdmin, getRegistrations);

// Cancel registration (student for own, or admin)
router.delete('/:id', protect, cancelRegistration);

module.exports = router;
