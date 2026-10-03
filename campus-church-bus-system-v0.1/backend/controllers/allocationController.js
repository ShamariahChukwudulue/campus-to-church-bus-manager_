const allocationService = require('../services/allocationService');
const Trip = require('../models/Trip');

/**
 * @desc    Assign student to a bus
 * @route   POST /api/allocation/assign
 * @access  Private/Admin
 */
const assignStudent = async (req, res, next) => {
  try {
    const { registrationId, busId } = req.body;

    if (!registrationId || !busId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both registrationId and busId.'
      });
    }

    const updatedRegistration = await allocationService.assignStudentToBus(registrationId, busId);

    res.status(200).json({
      success: true,
      message: `Student assigned to bus ${updatedRegistration.bus.busNumber} successfully.`,
      data: updatedRegistration
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Move a student to a different bus
 * @route   POST /api/allocation/move
 * @access  Private/Admin
 */
const moveStudent = async (req, res, next) => {
  try {
    const { registrationId, targetBusId } = req.body;

    if (!registrationId || !targetBusId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both registrationId and targetBusId.'
      });
    }

    const updatedRegistration = await allocationService.assignStudentToBus(registrationId, targetBusId);

    res.status(200).json({
      success: true,
      message: `Student moved to bus ${updatedRegistration.bus.busNumber} successfully.`,
      data: updatedRegistration
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Remove a student from their assigned bus
 * @route   POST /api/allocation/remove
 * @access  Private/Admin
 */
const removeStudent = async (req, res, next) => {
  try {
    const { registrationId } = req.body;

    if (!registrationId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide registrationId.'
      });
    }

    const updatedRegistration = await allocationService.removeStudentFromBus(registrationId);

    res.status(200).json({
      success: true,
      message: 'Student removed from bus assignment successfully.',
      data: updatedRegistration
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Automatically allocate registered unassigned students across available buses
 * @route   POST /api/allocation/auto
 * @access  Private/Admin
 */
const autoAllocate = async (req, res, next) => {
  try {
    let { tripId } = req.body;

    if (!tripId) {
      const latestTrip = await Trip.findOne().sort({ createdAt: -1 });
      if (!latestTrip) {
        return res.status(404).json({
          success: false,
          message: 'No active trip found for auto-allocation.'
        });
      }
      tripId = latestTrip._id;
    }

    const result = await allocationService.autoAllocateStudents(tripId);

    res.status(200).json({
      success: true,
      message: result.message,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get dynamic dashboard statistics
 * @route   GET /api/allocation/stats
 * @access  Private/Admin
 */
const getDashboardStats = async (req, res, next) => {
  try {
    let { tripId } = req.query;

    if (!tripId) {
      const latestTrip = await Trip.findOne().sort({ createdAt: -1 });
      if (!latestTrip) {
        return res.status(200).json({
          success: true,
          data: {
            totalStudents: 0,
            totalCapacity: 0,
            occupiedSeats: 0,
            availableSeats: 0,
            unassignedStudents: 0,
            fullBuses: 0,
            availableBuses: 0
          }
        });
      }
      tripId = latestTrip._id;
    }

    const stats = await allocationService.getTripDashboardStats(tripId);

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  assignStudent,
  moveStudent,
  removeStudent,
  autoAllocate,
  getDashboardStats
};
