import { useState } from "react";
import axios from "axios";
import "./AddRoom.css";
import { API_BASE } from "../../lib/api_base";

const FEATURES = [
  "Projector",
  "Whiteboard",
  "Air Conditioner",
  "Smart Display",
  "Computer",
  "Microphone",
  "Speakers",
  "Video Conference"
];

function AddRoom() {

  const [form, setForm] = useState({
    roomNo: "",
    vacantLimit: "",
    date: "",
    startTime: "",
    endTime: "",
    slotDuration: 60,
    customFeatures: []
  });

  const handleChange = (e) => {

    setForm({
      ...form,
      [e.target.name]: e.target.value
    });

  };

  const handleFeature = (feature) => {

    if (form.customFeatures.includes(feature)) {

      setForm({
        ...form,
        customFeatures: form.customFeatures.filter(f => f !== feature)
      });

    } else {

      setForm({
        ...form,
        customFeatures: [...form.customFeatures, feature]
      });

    }

  };

  const handleSubmit = async (e) => {

    e.preventDefault();

    try {

      await axios.post(`${API_BASE}/api/rooms`, {

        roomNo: form.roomNo,
        vacantLimit: Number(form.vacantLimit),
        customFeatures: form.customFeatures,
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
        slotDuration: Number(form.slotDuration)

      });

      alert("Room Added Successfully!");

      setForm({
        roomNo: "",
        vacantLimit: "",
        date: "",
        startTime: "",
        endTime: "",
        slotDuration: 60,
        customFeatures: []
      });

    } catch (err) {

      console.error(err);

        alert(
        err.response?.data?.message ||
        err.message ||
        "Failed to add room"
        );

    }

  };

 return (
    <section id="add-room">
        <div className="container py-4">

            <div className="row justify-content-center">
                <div className="col-lg-10 col-xl-9">

                    <div className="add-room-card">

                        {/* Header */}
                        <div className="add-room-header">
                            <div>
                                <h4>Add New Room</h4>
                                <p>
                                    Create a meeting room and configure its availability.
                                </p>
                            </div>

                            <div className="room-header-icon">
                                <i className="bi bi-door-open"></i>
                            </div>
                        </div>

                        <hr />

                        <form
                            onSubmit={handleSubmit}
                            className="add-room-form"
                        >

                            {/* Basic Information */}
                            <div className="form-section">

                                <h6 className="form-section-title">
                                    <i className="bi bi-info-circle me-2"></i>
                                    Room Information
                                </h6>

                                <div className="row g-3">

                                    <div className="col-md-6">
                                        <label className="form-label">
                                            Room Number
                                        </label>

                                        <input
                                            type="text"
                                            className="form-control"
                                            name="roomNo"
                                            value={form.roomNo}
                                            onChange={handleChange}
                                            placeholder="e.g. 301"
                                            required
                                        />
                                    </div>

                                    <div className="col-md-6">
                                        <label className="form-label">
                                            Vacant Limit
                                        </label>

                                        <input
                                            type="number"
                                            className="form-control"
                                            name="vacantLimit"
                                            value={form.vacantLimit}
                                            onChange={handleChange}
                                            placeholder="Number of people"
                                            min="1"
                                            required
                                        />
                                    </div>

                                </div>
                            </div>


                            {/* Availability */}
                            <div className="form-section mt-4">

                                <h6 className="form-section-title">
                                    <i className="bi bi-clock me-2"></i>
                                    Room Availability
                                </h6>

                                <div className="row g-3">

                                    <div className="col-md-6">
                                        <label className="form-label">
                                            Date
                                        </label>

                                        <input
                                            type="date"
                                            className="form-control"
                                            name="date"
                                            value={form.date}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>

                                    <div className="col-md-6">
                                        <label className="form-label">
                                            Slot Duration
                                        </label>

                                        <div className="input-group">
                                            <input
                                                type="number"
                                                className="form-control"
                                                name="slotDuration"
                                                value={form.slotDuration}
                                                onChange={handleChange}
                                                placeholder="e.g. 60"
                                                min="1"
                                            />

                                            <span className="input-group-text">
                                                minutes
                                            </span>
                                        </div>
                                    </div>

                                    <div className="col-md-6">
                                        <label className="form-label">
                                            Start Time
                                        </label>

                                        <input
                                            type="time"
                                            className="form-control"
                                            name="startTime"
                                            value={form.startTime}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>

                                    <div className="col-md-6">
                                        <label className="form-label">
                                            End Time
                                        </label>

                                        <input
                                            type="time"
                                            className="form-control"
                                            name="endTime"
                                            value={form.endTime}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>

                                </div>
                            </div>


                            {/* Features */}
                            <div className="form-section mt-4">

                                <h6 className="form-section-title">
                                    <i className="bi bi-grid me-2"></i>
                                    Room Features
                                </h6>

                                <p className="feature-help">
                                    Select the facilities available in this room.
                                </p>

                                <div className="features-grid">

                                    {FEATURES.map(feature => (
                                        <label
                                            key={feature}
                                            className="feature-option"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={form.customFeatures.includes(feature)}
                                                onChange={() => handleFeature(feature)}
                                            />

                                            <span className="feature-check"></span>

                                            <span className="feature-name">
                                                {feature}
                                            </span>
                                        </label>
                                    ))}

                                </div>

                            </div>


                            {/* Submit */}
                            <div className="form-actions">

                                <button
                                    type="submit"
                                    className="submit-btn"
                                >
                                    <i className="bi bi-plus-circle me-2"></i>
                                    Add Room
                                </button>

                            </div>

                        </form>

                    </div>

                </div>
            </div>

        </div>
    </section>
);

}

export default AddRoom;