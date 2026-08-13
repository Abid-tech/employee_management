const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema({
  start: { type: String, required: true },
  end: { type: String, required: true },
  booked: { type: Boolean, default: false },
  bookedBy: { type: String, default: null }
});

const availabilitySchema = new mongoose.Schema({
  date: { type: String, required: true },
  slots: [slotSchema]
});

const roomSchema = new mongoose.Schema({
  roomNo: { type: String, required: true, unique: true },
  vacantLimit: { type: Number, required: true },
  customFeatures: [{ type: String }],
  availability: [availabilitySchema]
});

module.exports = mongoose.model('Room', roomSchema);