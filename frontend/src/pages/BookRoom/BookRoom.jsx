import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './BookRoom.css';
import { API_BASE } from '../../lib/api_base';

const BookRoom = () => {
  const [rooms, setRooms] = useState([]);
  const [filteredRooms, setFilteredRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    startTime: '',
    endTime: '',
    vacantLimit: '',
    feature: ''
  });
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingDetails, setBookingDetails] = useState({
    bookedBy: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [roomDetails, setRoomDetails] = useState(null);

  const API_URL = `${API_BASE}/api`;

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/rooms`);
      setRooms(response.data);
      setFilteredRooms(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch rooms');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = async () => {
      if (!filters.startTime && !filters.endTime && !filters.vacantLimit && !filters.feature) {
    setFilteredRooms(rooms); // Show the full original list
    return; 
    }
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.startTime) params.append('startTime', filters.startTime);
      if (filters.endTime) params.append('endTime', filters.endTime);
      if (filters.vacantLimit) params.append('vacantLimit', filters.vacantLimit);
      if (filters.feature) params.append('feature', filters.feature);

      const response = await axios.get(`${API_URL}/rooms?${params.toString()}`);
      setFilteredRooms(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to filter rooms');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    applyFilters();
  };

  const handleBookNow = (room) => {
    setSelectedRoom(room);
    setShowBookingModal(true);
    setBookingDetails({
      ...bookingDetails,
      bookedBy: ''
    });
  };

  const handleBookingConfirm = async () => {
    if (!bookingDetails.bookedBy.trim()) {
      alert('Please enter your name');
      return;
    }

    if (!filters.startTime || !filters.endTime) {
      alert('Please select start and end time from filters');
      return;
    }

    try {
      const bookingData = {
        roomNo: selectedRoom.roomNo,
        date: bookingDetails.date,
        startTime: filters.startTime,
        endTime: filters.endTime,
        bookedBy: bookingDetails.bookedBy
      };

      await axios.post(`${API_URL}/bookings`, bookingData);
      alert('Room booked successfully!');
      setShowBookingModal(false);
      // Refresh rooms data
      fetchRooms();
      applyFilters();
    } catch (err) {
      alert('Failed to book room: ' + err.response?.data?.message || err.message);
      console.error(err);
    }
  };

  const handleViewDetails = async (roomId) => {
    try {
      const response = await axios.get(`${API_URL}/rooms/${roomId}`);
      setRoomDetails(response.data);
      setShowDetailModal(true);
    } catch (err) {
      alert('Failed to fetch room details');
      console.error(err);
    }
  };

  const resetFilters = () => {
    setFilters({
      startTime: '',
      endTime: '',
      vacantLimit: '',
      feature: ''
    });
    setFilteredRooms(rooms);
  };

  // Generate time slots for dropdown (9 AM to 5 PM)
  const timeSlots = [];
  for (let i = 9; i <= 17; i++) {
    const hour = i.toString().padStart(2, '0');
    timeSlots.push(`${hour}:00`);
    if (i < 17) {
      timeSlots.push(`${hour}:30`);
    }
  }

  // Get unique features from rooms for filter dropdown
  const allFeatures = [...new Set(rooms.flatMap(room => room.customFeatures))];

  // Get today's availability for a room
  const getTodayAvailability = (room) => {
    const today = new Date().toISOString().split('T')[0];
    const availability = room.availability.find(a => a.date === today);
    return availability || null;
  };

  return (
    <div className="book-room-page">
      <div className="container py-4">
        <h2 className="page-title mb-4">Book a Meeting Room</h2>

        {/* Search and Filter Section */}
        <div className="filter-section card p-4 mb-4">
          <form onSubmit={handleFilterSubmit}>
            <div className="row g-3">
              <div className="col-md-2">
                <label className="form-label">Start Time</label>
                <select 
                  className="form-select" 
                  name="startTime" 
                  value={filters.startTime}
                  onChange={handleFilterChange}
                >
                  <option value="">Select</option>
                  {timeSlots.slice(0, -1).map(time => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-2">
                <label className="form-label">End Time</label>
                <select 
                  className="form-select" 
                  name="endTime" 
                  value={filters.endTime}
                  onChange={handleFilterChange}
                >
                  <option value="">Select</option>
                  {timeSlots.slice(1).map(time => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-2">
                <label className="form-label">Person Limit</label>
                <select 
                  className="form-select" 
                  name="vacantLimit" 
                  value={filters.vacantLimit}
                  onChange={handleFilterChange}
                >
                  <option value="">Any</option>
                  <option value="4">4+</option>
                  <option value="6">6+</option>
                  <option value="8">8+</option>
                  <option value="10">10+</option>
                  <option value="12">12+</option>
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label">Features</label>
                <select 
                  className="form-select" 
                  name="feature" 
                  value={filters.feature}
                  onChange={handleFilterChange}
                >
                  <option value="">Any</option>
                  {allFeatures.map(feature => (
                    <option key={feature} value={feature}>{feature}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-3 d-flex align-items-end gap-2">
                <button type="submit" className="btn btn-primary btn-filter">
                  <i className="bi bi-search"></i> Filter
                </button>
                <button type="button" className="btn btn-outline-secondary" onClick={resetFilters}>
                  Reset
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Room Cards Section */}
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : error ? (
          <div className="alert alert-danger">{error}</div>
        ) : filteredRooms.length === 0 ? (
          <div className="alert alert-info">No rooms available matching your criteria</div>
        ) : (
          <div className="row g-4">
            {filteredRooms.map((room) => {
              const todayAvail = getTodayAvailability(room);
              const isAvailable = todayAvail ? todayAvail.slots.some(slot => !slot.booked) : false;
              
              return (
                <div key={room._id} className="col-lg-4 col-md-6">
                  <div className="card room-card h-100">
                    <div className="card-body">
                      <div className="d-flex justify-content-between align-items-start">
                        <h5 className="card-title">Room {room.roomNo}</h5>
                        <span className={`badge ${isAvailable ? 'bg-success' : 'bg-danger'}`}>
                          {isAvailable ? 'Available' : 'Fully Booked'}
                        </span>
                      </div>
                      <div className="room-info mt-3">
                        <p><strong>Vacant Limit:</strong> {room.vacantLimit} persons</p>
                        <p><strong>Features:</strong></p>
                        <div className="feature-tags mb-3">
                          {room.customFeatures.map((feature, idx) => (
                            <span key={idx} className="badge bg-light text-dark me-1">
                              {feature}
                            </span>
                          ))}
                        </div>
                        {todayAvail && (
                          <div className="availability-preview">
                            <p><strong>Today's Availability:</strong></p>
                            <div className="slot-preview">
                              {todayAvail.slots.slice(0, 4).map((slot, idx) => (
                                <span key={idx} className={`slot-indicator ${slot.booked ? 'booked' : 'available'}`}>
                                  {slot.start}-{slot.end}
                                </span>
                              ))}
                              {todayAvail.slots.length > 4 && <span className="text-muted">...</span>}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="card-footer bg-transparent border-top-0 d-flex gap-2">
                      <button 
                        className="btn btn-info btn-sm flex-grow-1"
                        onClick={() => handleViewDetails(room._id)}
                      >
                        <i className="bi bi-eye"></i> View Details
                      </button>
                      <button 
                        className="btn btn-primary btn-sm flex-grow-1"
                        onClick={() => handleBookNow(room)}
                        disabled={!isAvailable}
                      >
                        <i className="bi bi-calendar-plus"></i> Book Now
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Booking Modal */}
      {showBookingModal && selectedRoom && (
        <div className="modal show d-block" tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Book Room {selectedRoom.roomNo}</h5>
                <button type="button" className="btn-close" onClick={() => setShowBookingModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Your Name</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={bookingDetails.bookedBy}
                    onChange={(e) => setBookingDetails({...bookingDetails, bookedBy: e.target.value})}
                    placeholder="Enter your name"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Date</label>
                  <input 
                    type="date" 
                    className="form-control" 
                    value={bookingDetails.date}
                    onChange={(e) => setBookingDetails({...bookingDetails, date: e.target.value})}
                  />
                </div>
                <div className="mb-3">
  <label className="form-label">Start Time</label>
  <select 
    className="form-control"
    value={filters.startTime}
    onChange={(e) => setFilters({...filters, startTime: e.target.value})}
  >
    <option value="">Select Start Time</option>
    {timeSlots.slice(0, -1).map(time => (
      <option key={time} value={time}>{time}</option>
    ))}
  </select>
</div>

<div className="mb-3">
  <label className="form-label">End Time</label>
  <select 
    className="form-control"
    value={filters.endTime}
    onChange={(e) => setFilters({...filters, endTime: e.target.value})}
  >
    <option value="">Select End Time</option>
    {timeSlots.slice(1).map(time => (
      <option key={time} value={time}>{time}</option>
    ))}
  </select>
</div>

<small className="text-warning d-block mt-2">* 2 hours maximum booking time</small>
                <div className="mb-3">
                  <label className="form-label">Room Details</label>
                  <p><strong>Vacant Limit:</strong> {selectedRoom.vacantLimit} persons</p>
                  <p><strong>Features:</strong> {selectedRoom.customFeatures.join(', ')}</p>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowBookingModal(false)}>
                  Cancel
                </button>
                <button type="button" className="btn btn-primary" onClick={handleBookingConfirm}>
                  Confirm Booking
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Room Details Modal */}
      {showDetailModal && roomDetails && (
        <div className="modal show d-block" tabIndex="-1">
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Room {roomDetails.roomNo} - Details</h5>
                <button type="button" className="btn-close" onClick={() => setShowDetailModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="row mb-4">
                  <div className="col-md-6">
                    <h6>Room Information</h6>
                    <p><strong>Room No:</strong> {roomDetails.roomNo}</p>
                    <p><strong>Vacant Limit:</strong> {roomDetails.vacantLimit} persons</p>
                    <p><strong>Features:</strong></p>
                    <ul>
                      {roomDetails.customFeatures.map((feature, idx) => (
                        <li key={idx}>{feature}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="col-md-6">
                    <h6>Today's Availability (9 AM - 5 PM)</h6>
                    <div className="timeline-chart">
                      {getTodayAvailability(roomDetails)?.slots.map((slot, idx) => (
                        <div key={idx} className="timeline-item d-flex align-items-center gap-2 mb-1">
                          <span className="timeline-time" style={{minWidth: '80px'}}>
                            {slot.start} - {slot.end}
                          </span>
                          <div className="timeline-bar flex-grow-1">
                            <div 
                              className={`bar ${slot.booked ? 'booked' : 'available'}`}
                              style={{width: '100%', height: '20px', borderRadius: '4px'}}
                            >
                              <span className="bar-label">
                                {slot.booked ? `Booked by ${slot.bookedBy || 'Unknown'}` : 'Available'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowDetailModal(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Backdrops */}
      {(showBookingModal || showDetailModal) && (
        <div className="modal-backdrop show" onClick={() => {
          setShowBookingModal(false);
          setShowDetailModal(false);
        }}></div>
      )}
    </div>
  );
};

export default BookRoom;