import { useState } from "react";
import axios from "axios";
import "./AddRoom.css";

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

      await axios.post("http://localhost:5001/api/rooms", {

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

    <div className="add-room-page">

      <div className="add-room-card">

        <h2>Add New Room</h2>

        <form onSubmit={handleSubmit} className="add-room-form">

          <div className="form-grid">

            <div className="form-group">
              <label>Room Number</label>
              <input
                name="roomNo"
                value={form.roomNo}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Vacant Limit</label>
              <input
                type="number"
                name="vacantLimit"
                value={form.vacantLimit}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Date</label>
              <input
                type="date"
                name="date"
                value={form.date}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Slot Duration</label>
              <input
                type="number"
                name="slotDuration"
                value={form.slotDuration}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Start Time</label>
              <input
                type="time"
                name="startTime"
                value={form.startTime}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>End Time</label>
              <input
                type="time"
                name="endTime"
                value={form.endTime}
                onChange={handleChange}
                required
              />
            </div>

          </div>

          <h4>Room Features</h4>

          <div className="features-grid">

            {FEATURES.map(feature => (

              <label key={feature}>

                <input
                  type="checkbox"
                  checked={form.customFeatures.includes(feature)}
                  onChange={() => handleFeature(feature)}
                />

                {feature}

              </label>

            ))}

          </div>

          <button className="submit-btn">
            Add Room
          </button>

        </form>

      </div>

    </div>

  );

}

export default AddRoom;