const Trip = require('../models/Trip');
const Registration = require('../models/Registration');
const Bus = require('../models/Bus');
const allocationService = require('../services/allocationService');

/**
 * @desc    Get all trips with dynamic capacity information
 * @route   GET /api/trips
 * @access  Public / Authenticated
 */
const getTrips = async (req, res, next) => {
  try {
    const trips = await Trip.find().sort({ createdAt: -1 });

    // Calculate total fleet capacity
    const buses = await Bus.find({ isActive: true });
    const totalFleetCapacity = buses.reduce((acc, b) => acc + b.capacity, 0);

    const tripSummaries = await Promise.all(
      trips.map(async (trip) => {
        const registeredCount = await Registration.countDocuments({
          trip: trip._id,
          status: 'confirmed'
        });

        const remainingSeats = Math.max(0, totalFleetCapacity - registeredCount);
        const isFleetFull = remainingSeats <= 0;

        return {
          ...trip.toObject(),
          totalCapacity: totalFleetCapacity,
          registeredStudents: registeredCount,
          remainingSeats,
          isFleetFull
        };
      })
    );

    res.status(200).json({
      success: true,
      data: tripSummaries
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get single trip by ID with real-time capacity and bus status
 * @route   GET /api/trips/:id
 * @access  Public / Authenticated
 */
const getTripById = async (req, res, next) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Church trip not found.'
      });
    }

    const stats = await allocationService.getTripDashboardStats(trip._id);

    res.status(200).json({
      success: true,
      data: {
        ...trip.toObject(),
        stats
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Create a new church trip
 * @route   POST /api/trips
 * @access  Private/Admin
 */
const createTrip = async (req, res, next) => {
  try {
    const { destination, date, departureTime, registrationStatus, description } = req.body;

    if (!destination || !date || !departureTime) {
      return res.status(400).json({
        success: false,
        message: 'Destination, date, and departure time are required.'
      });
    }

    const trip = await Trip.create({
      destination: destination.trim(),
      date: date.trim(),
      departureTime: departureTime.trim(),
      registrationStatus: registrationStatus || 'open',
      description: description ? description.trim() : 'Sunday Service University Church Shuttle'
    });

    res.status(201).json({
      success: true,
      message: 'Trip created successfully.',
      data: trip
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update trip details
 * @route   PUT /api/trips/:id
 * @access  Private/Admin
 */
const updateTrip = async (req, res, next) => {
  try {
    const { destination, date, departureTime, registrationStatus, description } = req.body;

    const trip = await Trip.findById(req.params.id);
    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found.'
      });
    }

    if (destination) trip.destination = destination.trim();
    if (date) trip.date = date.trim();
    if (departureTime) trip.departureTime = departureTime.trim();
    if (registrationStatus) trip.registrationStatus = registrationStatus;
    if (description !== undefined) trip.description = description.trim();

    await trip.save();

    res.status(200).json({
      success: true,
      message: 'Trip updated successfully.',
      data: trip
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Open or close trip registration
 * @route   PUT /api/trips/:id/status
 * @access  Private/Admin
 */
const toggleTripRegistrationStatus = async (req, res, next) => {
  try {
    const { registrationStatus } = req.body;

    if (!['open', 'closed'].includes(registrationStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either "open" or "closed".'
      });
    }

    const trip = await Trip.findById(req.params.id);
    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found.'
      });
    }

    trip.registrationStatus = registrationStatus;
    await trip.save();

    res.status(200).json({
      success: true,
      message: `Registration has been ${registrationStatus === 'open' ? 'opened' : 'closed'} successfully.`,
      data: trip
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete a trip
 * @route   DELETE /api/trips/:id
 * @access  Private/Admin
 */
const deleteTrip = async (req, res, next) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found.'
      });
    }

    // Delete associated registrations
    await Registration.deleteMany({ trip: trip._id });
    await trip.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Trip and associated registrations deleted successfully.'
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getTrips,
  getTripById,
  createTrip,
  updateTrip,
  toggleTripRegistrationStatus,
  deleteTrip
};
