const Bus = require('../models/Bus');
const Registration = require('../models/Registration');
const Trip = require('../models/Trip');

/**
 * Service handling all bus allocation and capacity calculations.
 * Encapsulates the core business rules for the TPCM Ride.
 */
class AllocationService {
  /**
   * Calculate dynamic occupancies for all active buses for a specific trip.
   * Note: Occupancy is NEVER hard-coded or statically stored in the Bus model.
   * It is always calculated dynamically from active registrations.
   *
   * @param {string|mongoose.Types.ObjectId} tripId
   * @returns {Promise<Array>} List of buses with calculated occupancy & status
   */
  async getBusOccupancies(tripId) {
    const buses = await Bus.find({ isActive: true }).sort({ busNumber: 1 }).lean();

    // Get counts of assigned students per bus for this trip
    const counts = await Registration.aggregate([
      {
        $match: {
          trip: new (require('mongoose').Types.ObjectId)(tripId.toString()),
          status: 'confirmed',
          bus: { $ne: null }
        }
      },
      {
        $group: {
          _id: '$bus',
          count: { $sum: 1 }
        }
      }
    ]);

    const countMap = {};
    counts.forEach((c) => {
      countMap[c._id.toString()] = c.count;
    });

    return buses.map((bus) => {
      const occupiedSeats = countMap[bus._id.toString()] || 0;
      const remainingSeats = Math.max(0, bus.capacity - occupiedSeats);
      const isFull = occupiedSeats >= bus.capacity;

      return {
        ...bus,
        occupiedSeats,
        remainingSeats,
        isFull,
        status: isFull ? 'FULL' : 'AVAILABLE'
      };
    });
  }

  /**
   * Calculate aggregated system statistics for a trip.
   *
   * @param {string|mongoose.Types.ObjectId} tripId
   * @returns {Promise<Object>} Summary metrics (Total Registered, Capacity, Occupied, Available, etc.)
   */
  async getTripDashboardStats(tripId) {
    const busList = await this.getBusOccupancies(tripId);

    // Total capacity across all buses
    const totalCapacity = busList.reduce((acc, b) => acc + b.capacity, 0);

    // Total confirmed registered students for this trip
    const totalRegistered = await Registration.countDocuments({
      trip: tripId,
      status: 'confirmed'
    });

    // Occupied seats (students assigned to a bus)
    const occupiedSeats = busList.reduce((acc, b) => acc + b.occupiedSeats, 0);

    // Remaining unassigned students
    const unassignedStudents = Math.max(0, totalRegistered - occupiedSeats);

    // Available seats in the fleet
    const availableSeats = Math.max(0, totalCapacity - occupiedSeats);

    // Full buses vs Available buses
    const fullBuses = busList.filter((b) => b.isFull).length;
    const availableBuses = busList.filter((b) => !b.isFull).length;

    return {
      totalStudents: totalRegistered,
      totalCapacity,
      occupiedSeats,
      availableSeats,
      unassignedStudents,
      fullBuses,
      availableBuses
    };
  }

  /**
   * Assign or Move a registered student to a designated bus.
   * Strictly enforces bus capacity on the backend before making any assignment.
   *
   * @param {string} registrationId
   * @param {string} busId
   * @returns {Promise<Object>} Updated registration
   */
  async assignStudentToBus(registrationId, busId) {
    const registration = await Registration.findById(registrationId)
      .populate('student', 'name studentId gender university email phone')
      .populate('bus');

    if (!registration) {
      throw new Error('Registration record not found.');
    }

    if (registration.status !== 'confirmed') {
      throw new Error('Cannot assign bus to an unconfirmed or cancelled registration.');
    }

    const targetBus = await Bus.findById(busId);
    if (!targetBus || !targetBus.isActive) {
      throw new Error('Selected bus is not found or is currently inactive.');
    }

    // If student is already assigned to this exact bus, nothing to do
    if (registration.bus && registration.bus._id.toString() === targetBus._id.toString()) {
      return registration;
    }

    // RULE: Calculate current occupancy of target bus for this trip
    const currentOccupancy = await Registration.countDocuments({
      trip: registration.trip,
      bus: targetBus._id,
      status: 'confirmed'
    });

    // CAPACITY RULE: Backend verification
    if (currentOccupancy >= targetBus.capacity) {
      const err = new Error(`Bus ${targetBus.busNumber} is already full (${currentOccupancy}/${targetBus.capacity} seats occupied).`);
      err.statusCode = 400;
      throw err;
    }

    // Preserve previous bus if moving from another bus
    if (registration.bus) {
      registration.previousBus = registration.bus._id;
    }

    registration.bus = targetBus._id;
    await registration.save();

    return await Registration.findById(registration._id)
      .populate('student', 'name studentId gender university email phone')
      .populate('bus')
      .populate('previousBus');
  }

  /**
   * Remove a student from their currently assigned bus.
   *
   * @param {string} registrationId
   * @returns {Promise<Object>} Updated registration
   */
  async removeStudentFromBus(registrationId) {
    const registration = await Registration.findById(registrationId)
      .populate('student', 'name studentId gender university email phone')
      .populate('bus');

    if (!registration) {
      throw new Error('Registration record not found.');
    }

    if (!registration.bus) {
      throw new Error('Student is not currently assigned to any bus.');
    }

    // Record previous bus before removing
    registration.previousBus = registration.bus._id;
    registration.bus = null;
    await registration.save();

    return await Registration.findById(registration._id)
      .populate('student', 'name studentId gender university email phone')
      .populate('previousBus');
  }

  /**
   * Automatically allocate unassigned registered students across available buses.
   * Allocates sequentially filling available seats without exceeding any bus's capacity.
   *
   * @param {string|mongoose.Types.ObjectId} tripId
   * @returns {Promise<Object>} Summary of allocation result
   */
  async autoAllocateStudents(tripId) {
    // 1. Fetch all confirmed registrations for this trip with no bus assigned
    const unassignedRegistrations = await Registration.find({
      trip: tripId,
      status: 'confirmed',
      bus: null
    }).sort({ registrationDate: 1 });

    if (unassignedRegistrations.length === 0) {
      return {
        message: 'No unassigned students to allocate.',
        allocatedCount: 0,
        unassignedRemaining: 0
      };
    }

    // 2. Fetch buses and their current occupancies
    const busList = await this.getBusOccupancies(tripId);

    // Filter buses that have available capacity
    const availableBuses = busList.filter((b) => b.remainingSeats > 0);

    if (availableBuses.length === 0) {
      const err = new Error('Cannot allocate students: All available buses are completely full.');
      err.statusCode = 400;
      throw err;
    }

    let allocatedCount = 0;
    let studentIndex = 0;

    // 3. Fill buses up to their remaining capacity
    for (const bus of availableBuses) {
      let seatsToFill = bus.remainingSeats;

      while (seatsToFill > 0 && studentIndex < unassignedRegistrations.length) {
        const reg = unassignedRegistrations[studentIndex];
        reg.bus = bus._id;
        await reg.save();

        seatsToFill--;
        studentIndex++;
        allocatedCount++;
      }

      if (studentIndex >= unassignedRegistrations.length) {
        break; // All students allocated
      }
    }

    const unassignedRemaining = unassignedRegistrations.length - allocatedCount;

    return {
      message: `Successfully allocated ${allocatedCount} student(s) across available buses.`,
      allocatedCount,
      unassignedRemaining
    };
  }
}

module.exports = new AllocationService();
