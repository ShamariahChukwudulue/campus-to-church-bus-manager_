const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student reference is required']
    },
    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      required: [true, 'Trip reference is required']
    },
    bus: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bus',
      default: null // Null until allocated
    },
    previousBus: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bus',
      default: null // Preserves previous bus if admin moves student
    },
    status: {
      type: String,
      enum: ['confirmed', 'cancelled'],
      default: 'confirmed'
    },
    registrationDate: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Prevent duplicate trip registrations for the same student
registrationSchema.index({ student: 1, trip: 1 }, { unique: true });

module.exports = mongoose.model('Registration', registrationSchema);
