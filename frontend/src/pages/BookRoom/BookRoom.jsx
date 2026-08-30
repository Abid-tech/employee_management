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

      {/* ================= PAGE HEADER ================= */}
      <div className="room-page-header mb-4">
        <div>
          <h2 className="page-title mb-1">Book a Meeting Room</h2>
          <p className="page-subtitle">
            Find and reserve an available meeting room for your team.
          </p>
        </div>
      </div>


      {/* ================= FILTER SECTION ================= */}
      <div className="filter-section mb-4">

        <div className="filter-header">
          <div>
            <h6 className="filter-title">
              <i className="bi bi-funnel me-2"></i>
              Find a Room
            </h6>
            <p className="filter-description">
              Filter rooms based on your preferred time and requirements.
            </p>
          </div>
        </div>

        <form onSubmit={handleFilterSubmit}>
          <div className="row g-3">

            {/* Start Time */}
            <div className="col-lg-2 col-md-6">
              <label className="form-label">Start Time</label>

              <select
                className="form-select"
                name="startTime"
                value={filters.startTime}
                onChange={handleFilterChange}
              >
                <option value="">Select time</option>

                {timeSlots.slice(0, -1).map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </div>


            {/* End Time */}
            <div className="col-lg-2 col-md-6">
              <label className="form-label">End Time</label>

              <select
                className="form-select"
                name="endTime"
                value={filters.endTime}
                onChange={handleFilterChange}
              >
                <option value="">Select time</option>

                {timeSlots.slice(1).map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </div>


            {/* Person Limit */}
            <div className="col-lg-2 col-md-6">
              <label className="form-label">Capacity</label>

              <select
                className="form-select"
                name="vacantLimit"
                value={filters.vacantLimit}
                onChange={handleFilterChange}
              >
                <option value="">Any capacity</option>
                <option value="4">4+ persons</option>
                <option value="6">6+ persons</option>
                <option value="8">8+ persons</option>
                <option value="10">10+ persons</option>
                <option value="12">12+ persons</option>
              </select>
            </div>


            {/* Features */}
            <div className="col-lg-3 col-md-6">
              <label className="form-label">Feature</label>

              <select
                className="form-select"
                name="feature"
                value={filters.feature}
                onChange={handleFilterChange}
              >
                <option value="">Any feature</option>

                {allFeatures.map((feature) => (
                  <option key={feature} value={feature}>
                    {feature}
                  </option>
                ))}
              </select>
            </div>


            {/* Buttons */}
            <div className="col-lg-3 col-md-12 d-flex align-items-end gap-2">

              <button
                type="submit"
                className="btn btn-filter"
              >
                <i className="bi bi-search me-1"></i>
                Search
              </button>

              <button
                type="button"
                className="btn btn-reset"
                onClick={resetFilters}
              >
                Reset
              </button>

            </div>

          </div>
        </form>
      </div>


      {/* ================= ROOM SECTION ================= */}

      <div className="rooms-section">

        <div className="rooms-section-header mb-3">
          <h5>Available Meeting Rooms</h5>
          <span>
            {filteredRooms.length} rooms
          </span>
        </div>


        {/* Loading */}
        {loading ? (

          <div className="room-state">
            <div
              className="spinner-border"
              role="status"
            >
              <span className="visually-hidden">
                Loading...
              </span>
            </div>

            <p>Finding available rooms...</p>
          </div>

        ) : error ? (

          /* Error */
          <div className="room-alert error">
            <i className="bi bi-exclamation-circle me-2"></i>
            {error}
          </div>

        ) : filteredRooms.length === 0 ? (

          /* No rooms */
          <div className="room-state empty">

            <div className="empty-icon">
              <i className="bi bi-door-open"></i>
            </div>

            <h6>No rooms found</h6>

            <p>
              No rooms are available matching your selected criteria.
            </p>

            <button
              type="button"
              className="btn btn-reset"
              onClick={resetFilters}
            >
              Clear Filters
            </button>

          </div>

        ) : (

          /* Room Cards */
          <div className="row g-4">

            {filteredRooms.map((room) => {

              const todayAvail = getTodayAvailability(room);

              const isAvailable = todayAvail
                ? todayAvail.slots.some(
                    (slot) => !slot.booked
                  )
                : false;

              return (

                <div
                  key={room._id}
                  className="col-lg-4 col-md-6"
                >

                  <div className="room-card h-100">

                    {/* Card Header */}
                    <div className="room-card-header">

                      <div className="room-icon">
                        <i className="bi bi-building"></i>
                      </div>

                      <div className="room-title-area">

                        <h5>
                          Room {room.roomNo}
                        </h5>

                        <span>
                          Meeting Room
                        </span>

                      </div>

                      <span
                        className={`room-status ${
                          isAvailable
                            ? "available"
                            : "booked"
                        }`}
                      >
                        <span className="status-dot"></span>

                        {isAvailable
                          ? "Available"
                          : "Fully Booked"}
                      </span>

                    </div>


                    {/* Card Body */}
                    <div className="room-card-body">

                      {/* Capacity */}
                      <div className="room-detail">

                        <div className="detail-icon">
                          <i className="bi bi-people"></i>
                        </div>

                        <div>
                          <span>Capacity</span>
                          <strong>
                            {room.vacantLimit} persons
                          </strong>
                        </div>

                      </div>


                      {/* Features */}
                      <div className="room-features">

                        <span className="feature-label">
                          <i className="bi bi-stars me-1"></i>
                          Features
                        </span>

                        <div className="feature-tags">

                          {room.customFeatures.map(
                            (feature, idx) => (

                              <span
                                key={idx}
                                className="feature-tag"
                              >
                                {feature}
                              </span>

                            )
                          )}

                        </div>

                      </div>


                      {/* Availability */}
                      {todayAvail && (

                        <div className="availability-preview">

                          <div className="availability-header">

                            <span>
                              <i className="bi bi-clock me-1"></i>
                              Today's availability
                            </span>

                          </div>

                          <div className="slot-preview">

                            {todayAvail.slots
                              .slice(0, 4)
                              .map((slot, idx) => (

                                <span
                                  key={idx}
                                  className={`slot-indicator ${
                                    slot.booked
                                      ? "booked"
                                      : "available"
                                  }`}
                                  title={
                                    slot.booked
                                      ? `Booked by ${
                                          slot.bookedBy ||
                                          "Unknown"
                                        }`
                                      : "Available"
                                  }
                                >
                                  {slot.start}
                                </span>

                              ))}

                            {todayAvail.slots.length > 4 && (
                              <span className="more-slots">
                                +{todayAvail.slots.length - 4}
                              </span>
                            )}

                          </div>

                        </div>

                      )}

                    </div>


                    {/* Card Footer */}
                    <div className="room-card-footer">

                      <button
                        className="btn btn-view"
                        onClick={() =>
                          handleViewDetails(room._id)
                        }
                      >
                        <i className="bi bi-eye me-1"></i>
                        Details
                      </button>

                      <button
                        className="btn btn-book"
                        onClick={() =>
                          handleBookNow(room)
                        }
                        disabled={!isAvailable}
                      >
                        <i className="bi bi-calendar-plus me-1"></i>
                        Book Room
                      </button>

                    </div>

                  </div>

                </div>

              );

            })}

          </div>

        )}

      </div>

    </div>


    {/* ================================================= */}
    {/* BOOKING MODAL */}
    {/* ================================================= */}

    {showBookingModal && selectedRoom && (

      <div
        className="modal show d-block custom-modal"
        tabIndex="-1"
      >

        <div className="modal-dialog modal-dialog-centered">

          <div className="modal-content">

            <div className="modal-header">

              <div>
                <span className="modal-eyebrow">
                  Meeting Room
                </span>

                <h5 className="modal-title">
                  Book Room {selectedRoom.roomNo}
                </h5>
              </div>

              <button
                type="button"
                className="btn-close"
                onClick={() =>
                  setShowBookingModal(false)
                }
              ></button>

            </div>


            <div className="modal-body">

              {/* Name */}
              <div className="mb-3">

                <label className="form-label">
                  Your Name
                </label>

                <input
                  type="text"
                  className="form-control"
                  value={bookingDetails.bookedBy}
                  onChange={(e) =>
                    setBookingDetails({
                      ...bookingDetails,
                      bookedBy: e.target.value
                    })
                  }
                  placeholder="Enter your name"
                />

              </div>


              {/* Date */}
              <div className="mb-3">

                <label className="form-label">
                  Date
                </label>

                <input
                  type="date"
                  className="form-control"
                  value={bookingDetails.date}
                  onChange={(e) =>
                    setBookingDetails({
                      ...bookingDetails,
                      date: e.target.value
                    })
                  }
                />

              </div>


              <div className="row">

                {/* Start Time */}
                <div className="col-md-6">

                  <div className="mb-3">

                    <label className="form-label">
                      Start Time
                    </label>

                    <select
                      className="form-select"
                      value={filters.startTime}
                      onChange={(e) =>
                        setFilters({
                          ...filters,
                          startTime: e.target.value
                        })
                      }
                    >

                      <option value="">
                        Select time
                      </option>

                      {timeSlots
                        .slice(0, -1)
                        .map((time) => (

                          <option
                            key={time}
                            value={time}
                          >
                            {time}
                          </option>

                        ))}

                    </select>

                  </div>

                </div>


                {/* End Time */}
                <div className="col-md-6">

                  <div className="mb-3">

                    <label className="form-label">
                      End Time
                    </label>

                    <select
                      className="form-select"
                      value={filters.endTime}
                      onChange={(e) =>
                        setFilters({
                          ...filters,
                          endTime: e.target.value
                        })
                      }
                    >

                      <option value="">
                        Select time
                      </option>

                      {timeSlots
                        .slice(1)
                        .map((time) => (

                          <option
                            key={time}
                            value={time}
                          >
                            {time}
                          </option>

                        ))}

                    </select>

                  </div>

                </div>

              </div>


              <div className="booking-note">
                <i className="bi bi-info-circle"></i>
                <span>
                  Maximum booking duration is 2 hours.
                </span>
              </div>


              {/* Room Details */}
              <div className="booking-room-summary">

                <h6>Room Information</h6>

                <div className="summary-row">
                  <span>Capacity</span>
                  <strong>
                    {selectedRoom.vacantLimit} persons
                  </strong>
                </div>

                <div className="summary-row">
                  <span>Features</span>

                  <strong>
                    {selectedRoom.customFeatures.join(", ")}
                  </strong>
                </div>

              </div>

            </div>


            <div className="modal-footer">

              <button
                type="button"
                className="btn btn-reset"
                onClick={() =>
                  setShowBookingModal(false)
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="btn btn-book"
                onClick={handleBookingConfirm}
              >
                <i className="bi bi-calendar-check me-1"></i>
                Confirm Booking
              </button>

            </div>

          </div>

        </div>

      </div>

    )}


    {/* ================================================= */}
    {/* ROOM DETAILS MODAL */}
    {/* ================================================= */}

    {showDetailModal && roomDetails && (

      <div
        className="modal show d-block custom-modal"
        tabIndex="-1"
      >

        <div className="modal-dialog modal-lg modal-dialog-centered">

          <div className="modal-content">

            <div className="modal-header">

              <div>

                <span className="modal-eyebrow">
                  Meeting Room
                </span>

                <h5 className="modal-title">
                  Room {roomDetails.roomNo}
                </h5>

              </div>

              <button
                type="button"
                className="btn-close"
                onClick={() =>
                  setShowDetailModal(false)
                }
              ></button>

            </div>


            <div className="modal-body">

              <div className="row g-4">

                {/* Room Information */}
                <div className="col-md-5">

                  <div className="details-panel">

                    <h6>Room Information</h6>

                    <div className="detail-row">
                      <span>Room Number</span>
                      <strong>
                        {roomDetails.roomNo}
                      </strong>
                    </div>

                    <div className="detail-row">
                      <span>Capacity</span>
                      <strong>
                        {roomDetails.vacantLimit} persons
                      </strong>
                    </div>


                    <div className="detail-feature-list">

                      <span>
                        Features
                      </span>

                      <div className="feature-tags">

                        {roomDetails.customFeatures.map(
                          (feature, idx) => (

                            <span
                              key={idx}
                              className="feature-tag"
                            >
                              {feature}
                            </span>

                          )
                        )}

                      </div>

                    </div>

                  </div>

                </div>


                {/* Timeline */}
                <div className="col-md-7">

                  <div className="details-panel">

                    <div className="timeline-header">

                      <div>
                        <h6>Today's Availability</h6>
                        <small>
                          9:00 AM – 5:00 PM
                        </small>
                      </div>

                    </div>


                    <div className="timeline-chart">

                      {getTodayAvailability(roomDetails)
                        ?.slots.map(
                          (slot, idx) => (

                            <div
                              key={idx}
                              className="timeline-item"
                            >

                              <span className="timeline-time">
                                {slot.start}
                              </span>

                              <div className="timeline-bar">

                                <div
                                  className={`bar ${
                                    slot.booked
                                      ? "booked"
                                      : "available"
                                  }`}
                                >

                                  <span className="bar-label">

                                    {slot.booked
                                      ? `Booked by ${
                                          slot.bookedBy ||
                                          "Unknown"
                                        }`
                                      : "Available"}

                                  </span>

                                </div>

                              </div>

                            </div>

                          )
                        )}

                    </div>

                  </div>

                </div>

              </div>

            </div>


            <div className="modal-footer">

              <button
                type="button"
                className="btn btn-reset"
                onClick={() =>
                  setShowDetailModal(false)
                }
              >
                Close
              </button>

            </div>

          </div>

        </div>

      </div>

    )}


    {/* Modal Backdrop */}

    {(showBookingModal || showDetailModal) && (

      <div
        className="modal-backdrop show custom-backdrop"
        onClick={() => {
          setShowBookingModal(false);
          setShowDetailModal(false);
        }}
      ></div>

    )}

  </div>
);
};

export default BookRoom;