import express from 'express';
import Room from '../model/Room.js';
import Booking from '../model/Booking.js';

const router = express.Router();





// Get all rooms with optional filters
router.get('/rooms', async (req, res) => {
  try {
    const { startTime, endTime, vacantLimit, feature } = req.query;
    let query = {};

    // Build filter query
    if (vacantLimit) {
      query.vacantLimit = { $gte: parseInt(vacantLimit) };
    }

    if (feature) {
      query.customFeatures = { $in: [feature] };
    }

    let rooms = await Room.find(query).lean();

    // Filter by time availability if time range is provided
    if (startTime && endTime) {
      rooms = rooms.filter(room => {
        const todayAvailability = room.availability.find(a => a.date === new Date().toISOString().split('T')[0]);
        if (!todayAvailability) return false;
        
        // Check if any slot overlaps with requested time
        return todayAvailability.slots.some(slot => {
          const slotStart = slot.start;
          const slotEnd = slot.end;
          const isAvailable = !slot.booked;
          // Check if slot is within requested range
          return isAvailable && slotStart >= startTime && slotEnd <= endTime;
        });
      });
    }

    res.json(rooms);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


/* ------------------ ADD ROOM ------------------ */

router.post('/rooms', async (req, res) => {
  try {
    const {
      roomNo,
      vacantLimit,
      customFeatures,
      date,
      startTime,
      endTime,
      slotDuration
    } = req.body;

    // Check if room already exists
    const existing = await Room.findOne({ roomNo });

    if (existing) {
      return res.status(400).json({
        message: "Room already exists"
      });
    }

    // Generate Slots
    const slots = [];

    let current = new Date(`${date}T${startTime}:00`);
    const end = new Date(`${date}T${endTime}:00`);

    while (current < end) {

      const next = new Date(current.getTime() + slotDuration * 60000);

      slots.push({
        start: current.toTimeString().slice(0,5),
        end: next.toTimeString().slice(0,5),
        booked: false,
        bookedBy: null
      });

      current = next;
    }

    const room = new Room({
      roomNo,
      vacantLimit,
      customFeatures,
      availability: [
        {
          date,
          slots
        }
      ]
    });

    await room.save();

    res.status(201).json(room);

  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});


// Get room by ID
router.get('/rooms/:id', async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
    res.json(room);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Book a room
router.post('/bookings', async (req, res) => {
  try {
    const { roomNo, date, startTime, endTime, bookedBy } = req.body;

    // Create booking record
    const booking = new Booking({
      roomNo,
      date,
      startTime,
      endTime,
      bookedBy
    });
    await booking.save();

    // Update room availability
    const room = await Room.findOne({ roomNo });
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const availability = room.availability.find(a => a.date === date);
    if (!availability) {
      return res.status(404).json({ message: 'Availability for this date not found' });
    }

    // Find and update the specific slot
    const slot = availability.slots.find(s => s.start === startTime && s.end === endTime);
    if (slot) {
      slot.booked = true;
      slot.bookedBy = bookedBy;
    }

    await room.save();

    res.status(201).json({ message: 'Room booked successfully', booking });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get bookings for a specific room and date
router.get('/bookings/:roomNo/:date', async (req, res) => {
  try {
    const { roomNo, date } = req.params;
    const bookings = await Booking.find({ roomNo, date });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;