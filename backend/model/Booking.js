const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  roomNo: { type: String, required: true },
  date: { type: String, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  bookedBy: { type: String, required: true },
  bookedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Booking', bookingSchema);
