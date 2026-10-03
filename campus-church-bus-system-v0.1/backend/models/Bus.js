const mongoose = require('mongoose');

const busSchema = new mongoose.Schema(
  {
    busNumber: {
      type: String,
      required: [true, 'Bus number/identifier is required'],
      unique: true,
      uppercase: true,
      trim: true
    },
    busType: {
      type: String,
      required: [true, 'Bus type is required (e.g., 12-Seater)'],
      trim: true
    },
    capacity: {
      type: Number,
      required: [true, 'Bus capacity is required'],
      min: [1, 'Capacity must be at least 1']
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Bus', busSchema);
