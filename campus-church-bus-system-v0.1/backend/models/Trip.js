const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema(
  {
    destination: {
      type: String,
      required: [true, 'Trip destination is required'],
      trim: true
    },
    date: {
      type: String,
      required: [true, 'Trip date is required (YYYY-MM-DD)'],
      trim: true
    },
    departureTime: {
      type: String,
      required: [true, 'Departure time is required (e.g. 07:30 AM)'],
      trim: true
    },
    registrationStatus: {
      type: String,
      enum: ['open', 'closed'],
      default: 'open'
    },
    description: {
      type: String,
      default: 'Sunday Service University Church Shuttle',
      trim: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Trip', tripSchema);
