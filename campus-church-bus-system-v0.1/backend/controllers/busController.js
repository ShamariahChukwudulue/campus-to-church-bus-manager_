const Bus = require('../models/Bus');
const Registration = require('../models/Registration');
const Trip = require('../models/Trip');
const allocationService = require('../services/allocationService');

/**
 * @desc    Get all buses with dynamic occupancies for a specific or latest trip
 * @route   GET /api/buses
 * @access  Public / Authenticated
 */
const getBuses = async (req, res, next) => {
  try {
    let tripId = req.query.tripId;

    if (!tripId) {
      // Find latest active trip
      const latestTrip = await Trip.findOne().sort({ createdAt: -1 });
      if (latestTrip) {
        tripId = latestTrip._id;
      }
    }

    if (!tripId) {
      // If no trips exist yet, just return the buses with 0 occupancy
      const buses = await Bus.find({ isActive: true }).sort({ busNumber: 1 });
      const simpleBuses = buses.map((b) => ({
        ...b.toObject(),
        occupiedSeats: 0,
        remainingSeats: b.capacity,
        isFull: false,
        status: 'AVAILABLE'
      }));
      return res.status(200).json({ success: true, data: simpleBuses });
    }

    const busesWithOccupancy = await allocationService.getBusOccupancies(tripId);

    res.status(200).json({
      success: true,
      data: busesWithOccupancy
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get single bus details and list of assigned students
 * @route   GET /api/buses/:id
 * @access  Authenticated
 */
const getBusById = async (req, res, next) => {
  try {
    const bus = await Bus.findById(req.params.id);
    if (!bus) {
      return res.status(404).json({
        success: false,
        message: 'Bus not found.'
      });
    }

    let tripId = req.query.tripId;
    if (!tripId) {
      const latestTrip = await Trip.findOne().sort({ createdAt: -1 });
      if (latestTrip) tripId = latestTrip._id;
    }

    let assignedStudents = [];
    if (tripId) {
      const regs = await Registration.find({
        trip: tripId,
        bus: bus._id,
        status: 'confirmed'
      }).populate('student', 'name studentId gender university email phone');

      assignedStudents = regs.map((r) => ({
        registrationId: r._id,
        student: r.student,
        registrationDate: r.registrationDate
      }));
    }

    const occupiedSeats = assignedStudents.length;
    const remainingSeats = Math.max(0, bus.capacity - occupiedSeats);
    const isFull = occupiedSeats >= bus.capacity;

    res.status(200).json({
      success: true,
      data: {
        ...bus.toObject(),
        occupiedSeats,
        remainingSeats,
        isFull,
        status: isFull ? 'FULL' : 'AVAILABLE',
        assignedStudents
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Create a new bus in the fleet
 * @route   POST /api/buses
 * @access  Private/Admin
 */
const createBus = async (req, res, next) => {
  try {
    const { busNumber, busType, capacity } = req.body;

    if (!busNumber || !busType || !capacity) {
      return res.status(400).json({
        success: false,
        message: 'Please provide busNumber, busType, and capacity.'
      });
    }

    const bus = await Bus.create({
      busNumber: busNumber.toUpperCase().trim(),
      busType: busType.trim(),
      capacity: Number(capacity)
    });

    res.status(201).json({
      success: true,
      message: 'Bus created successfully.',
      data: bus
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update bus details
 * @route   PUT /api/buses/:id
 * @access  Private/Admin
 */
const updateBus = async (req, res, next) => {
  try {
    const { busNumber, busType, capacity, isActive } = req.body;

    const bus = await Bus.findById(req.params.id);
    if (!bus) {
      return res.status(404).json({
        success: false,
        message: 'Bus not found.'
      });
    }

    if (busNumber) bus.busNumber = busNumber.toUpperCase().trim();
    if (busType) bus.busType = busType.trim();
    if (capacity) bus.capacity = Number(capacity);
    if (isActive !== undefined) bus.isActive = isActive;

    await bus.save();

    res.status(200).json({
      success: true,
      message: 'Bus updated successfully.',
      data: bus
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete a bus
 * @route   DELETE /api/buses/:id
 * @access  Private/Admin
 */
const deleteBus = async (req, res, next) => {
  try {
    const bus = await Bus.findById(req.params.id);
    if (!bus) {
      return res.status(404).json({
        success: false,
        message: 'Bus not found.'
      });
    }

    // Unassign students from this bus
    await Registration.updateMany({ bus: bus._id }, { $set: { bus: null } });
    await bus.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Bus deleted successfully. Any assigned students were unassigned.'
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getBuses,
  getBusById,
  createBus,
  updateBus,
  deleteBus
};
