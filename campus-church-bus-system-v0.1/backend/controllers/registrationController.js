const Registration = require('../models/Registration');
const Trip = require('../models/Trip');
const Bus = require('../models/Bus');

/**
 * @desc    Register logged-in student for a church trip
 * @route   POST /api/registrations
 * @access  Private/Student
 */
const registerForTrip = async (req, res, next) => {
  try {
    const { tripId } = req.body;
    const studentId = req.user._id;

    let trip;
    if (tripId) {
      trip = await Trip.findById(tripId);
    } else {
      // Default to latest trip
      trip = await Trip.findOne().sort({ createdAt: -1 });
    }

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'No available church trip found for registration.'
      });
    }

    // RULE: Check if registration is open
    if (trip.registrationStatus !== 'open') {
      return res.status(400).json({
        success: false,
        message: 'Registration is currently closed.'
      });
    }

    // RULE: Prevent duplicate registration for the same trip
    const existingRegistration = await Registration.findOne({
      student: studentId,
      trip: trip._id,
      status: 'confirmed'
    });

    if (existingRegistration) {
      return res.status(400).json({
        success: false,
        message: 'You have already registered for this church trip.'
      });
    }

    // RULE: Check total available fleet capacity
    const buses = await Bus.find({ isActive: true });
    const totalCapacity = buses.reduce((acc, b) => acc + b.capacity, 0);

    const currentRegistrationsCount = await Registration.countDocuments({
      trip: trip._id,
      status: 'confirmed'
    });

    if (currentRegistrationsCount >= totalCapacity) {
      return res.status(400).json({
        success: false,
        message: 'Trip registration is full. All available seats have been exhausted.'
      });
    }

    // Create registration (unassigned bus initially)
    let registration;
    try {
      registration = await Registration.create({
        student: studentId,
        trip: trip._id,
        bus: null,
        status: 'confirmed'
      });
    } catch (createErr) {
      // Unique index (student + trip) catches double-clicks / simultaneous requests
      if (createErr && createErr.code === 11000) {
        return res.status(400).json({
          success: false,
          message: 'You have already registered for this church trip.'
        });
      }
      throw createErr;
    }

    const populated = await Registration.findById(registration._id)
      .populate('student', 'name studentId gender university email phone')
      .populate('trip');

    res.status(201).json({
      success: true,
      message: 'Successfully registered for the church trip. Bus allocation will be assigned shortly.',
      data: populated
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Build the student-facing payload for a single registration
 * (trip info, assigned bus + live occupancy, and bus-change notice).
 */
const buildRegistrationPayload = async (registration, user) => {
  let busDetails = null;
  let busChangedNotice = null;

  if (registration.bus) {
    // Calculate current occupancy of this assigned bus (for this trip only)
    const busOccupancy = await Registration.countDocuments({
      trip: registration.trip._id,
      bus: registration.bus._id,
      status: 'confirmed'
    });

    busDetails = {
      busId: registration.bus._id,
      busNumber: registration.bus.busNumber,
      busType: registration.bus.busType,
      capacity: registration.bus.capacity,
      occupancy: busOccupancy,
      displayOccupancy: `${busOccupancy} / ${registration.bus.capacity}`,
      isFull: busOccupancy >= registration.bus.capacity
    };

    // Check if bus assignment was modified by administrator
    if (
      registration.previousBus &&
      registration.previousBus._id.toString() !== registration.bus._id.toString()
    ) {
      busChangedNotice = {
        hasChanged: true,
        previousBusNumber: registration.previousBus.busNumber,
        previousBusType: registration.previousBus.busType,
        newBusNumber: registration.bus.busNumber,
        newBusType: registration.bus.busType
      };
    }
  }

  return {
    registrationId: registration._id,
    status: registration.status,
    registrationDate: registration.registrationDate,
    student: {
      id: user._id,
      name: user.name,
      studentId: user.studentId,
      email: user.email
    },
    trip: registration.trip,
    assignedBus: busDetails,
    busChangedNotice
  };
};

/**
 * @desc    Get logged-in student's registration details and assigned bus.
 *          - default:            most recent confirmed registration (or the one for ?tripId=)
 *          - ?all=true:          ALL of the student's confirmed registrations (one per trip)
 * @route   GET /api/registrations/my
 * @access  Private/Student
 */
const getMyRegistration = async (req, res, next) => {
  try {
    const studentId = req.user._id;
    const { tripId, all } = req.query;

    const query = { student: studentId, status: 'confirmed' };
    if (tripId) {
      query.trip = tripId;
    }

    const populateAll = (q) =>
      q.populate('trip').populate('bus').populate('previousBus');

    if (all === 'true') {
      const registrations = await populateAll(
        Registration.find(query).sort({ createdAt: 1 })
      );

      // Skip registrations whose trip no longer exists
      const valid = registrations.filter((r) => r.trip);
      const data = await Promise.all(
        valid.map((r) => buildRegistrationPayload(r, req.user))
      );

      return res.status(200).json({
        success: true,
        count: data.length,
        data
      });
    }

    // Single (most recent) registration - kept for backwards compatibility
    const registration = await populateAll(
      Registration.findOne(query).sort({ createdAt: -1 })
    );

    if (!registration) {
      return res.status(200).json({
        success: true,
        data: null,
        message: 'No active church trip registration found.'
      });
    }

    res.status(200).json({
      success: true,
      data: await buildRegistrationPayload(registration, req.user)
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get all registrations with student & bus details (Admin view)
 * @route   GET /api/registrations
 * @access  Private/Admin
 */
const getRegistrations = async (req, res, next) => {
  try {
    let { tripId, busId, unassignedOnly } = req.query;

    let filter = { status: 'confirmed' };

    if (!tripId) {
      const latestTrip = await Trip.findOne().sort({ createdAt: -1 });
      if (latestTrip) {
        filter.trip = latestTrip._id;
      }
    } else {
      filter.trip = tripId;
    }

    if (busId) {
      filter.bus = busId;
    }

    if (unassignedOnly === 'true') {
      filter.bus = null;
    }

    const registrations = await Registration.find(filter)
      .sort({ createdAt: -1 })
      .populate('student', 'name studentId gender university email phone')
      .populate('bus')
      .populate('previousBus')
      .populate('trip');

    res.status(200).json({
      success: true,
      count: registrations.length,
      data: registrations
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Cancel trip registration
 * @route   DELETE /api/registrations/:id
 * @access  Private
 */
const cancelRegistration = async (req, res, next) => {
  try {
    const registration = await Registration.findById(req.params.id);

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration record not found.'
      });
    }

    // Students can only cancel their own registration
    if (
      req.user.role !== 'admin' &&
      registration.student.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You can only cancel your own registration.'
      });
    }

    await registration.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Trip registration cancelled successfully.'
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  registerForTrip,
  getMyRegistration,
  getRegistrations,
  cancelRegistration
};
