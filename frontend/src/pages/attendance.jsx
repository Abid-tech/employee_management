import { useEffect, useState } from "react"
import {MapContainer,TileLayer,Marker,Circle,useMap} from "react-leaflet"

import L from "leaflet"

import "leaflet/dist/leaflet.css"
import "../index.css"



delete L.Icon.Default.prototype._getIconUrl

L.Icon.Default.mergeOptions({
    iconRetinaUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",

    iconUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",

    shadowUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png"
})





// Center map when user's location changes
function RecenterMap({ position }) {

    const map = useMap()

    useEffect(() => {

        if (position) {

            map.setView(
                [position.latitude, position.longitude],
                17
            )
        }

    }, [position, map])


    return null
}


function Attendence() {

    const officeLatitude = Number(import.meta.env.VITE_OFFICE_LATITUDE)

    const officeLongitude = Number(import.meta.env.VITE_OFFICE_LONGITUDE)

    const attendanceRadius = Number(import.meta.env.VITE_ATTENDANCE_RADIUS)


    const [attendance, setAttendance] = useState(null)

    const [location, setLocation] = useState(null)

    const [distance, setDistance] = useState(null)

    const [locationError, setLocationError] = useState("")

    const [loadingLocation, setLoadingLocation] = useState(false)

    const [processing, setProcessing] = useState(false)



    const [currentTime, setCurrentTime] = useState(new Date())


    // Get today's attendance
    const fetchAttendance = async () => {

        try {

            const response = await fetch(
                "http://localhost:5000/attendance/today",
                {
                    method: "GET",
                    credentials: "include"
                }
            )


            const data = await response.json()


            if (response.ok) {

                setAttendance(data.attendance)

            }

        } catch (err) {

            console.error(
                "Attendance fetch error:",
                err
            )
        }
    }


    // Get current location
    const getLocation = () => {

        if (!navigator.geolocation) {

            setLocationError("Geolocation is not supported by your browser.")

            return
        }


        setLoadingLocation(true)
        setLocationError("")


        navigator.geolocation.getCurrentPosition((position) => {

                const newLocation = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy
                }


                setLocation(newLocation)


                const calculatedDistance =
                    calculateDistance(
                        newLocation.latitude,
                        newLocation.longitude,
                        officeLatitude,
                        officeLongitude
                    )


                setDistance(calculatedDistance)

                setLoadingLocation(false)
            },


            (error) => {

                console.error(
                    "Location error:",
                    error
                )


                setLocationError(
                    getLocationErrorMessage(error.code)
                )

                setLoadingLocation(false)
            },


            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        )
    }


    // Check-in
    const handleCheckIn = async () => {

        if (!location) {

            getLocation()

            return
        }


        if (distance > attendanceRadius) {

            alert(
                "You are outside the 50 meter office range."
            )

            return
        }


        setProcessing(true)


        try {

            const response = await fetch(
                "http://localhost:5000/attendance/check-in",
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    credentials: "include",

                    body: JSON.stringify({
                        latitude: location.latitude,
                        longitude: location.longitude,
                        accuracy: location.accuracy
                    })
                }
            )


            const data = await response.json()


            if (response.ok) {

                setAttendance(data.attendance)
                alert("Check-in successful")

            } else {

                alert(
                    data.message ||
                    "Check-in failed"
                )
            }

        } catch (err) {

            console.error(
                "Check-in error:",
                err
            )

            alert("Something went wrong")

        } finally {

            setProcessing(false)

        }
    }


    // Check-out
    const handleCheckOut = async () => {

        if (!location) {

            getLocation()

            return
        }


        if (distance > attendanceRadius) {

            alert(
                "You are outside the 50 meter office range."
            )

            return
        }


        setProcessing(true)


        try {

            const response = await fetch(
                "http://localhost:5000/attendance/check-out",
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    credentials: "include",

                    body: JSON.stringify({
                        latitude: location.latitude,
                        longitude: location.longitude,
                        accuracy: location.accuracy
                    })
                }
            )


            const data = await response.json()


            if (response.ok) {

                setAttendance(data.attendance)

                alert("Check-out successful")

            } else {

                alert(
                    data.message ||
                    "Check-out failed"
                )
            }

        } catch (err) {

            console.error(
                "Check-out error:",
                err
            )

            alert("Something went wrong")

        } finally {

            setProcessing(false)

        }
    }


    // Initial data
    useEffect(() => {

        fetchAttendance()
        getLocation()

    }, [])


    // Clock
    useEffect(() => {

        const interval = setInterval(() => {

            setCurrentTime(new Date())

        }, 1000)


        return () => clearInterval(interval)

    }, [])


    const today = currentTime.toLocaleDateString(
        "en-US",
        {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        }
    )


    const time = currentTime.toLocaleTimeString(
        "en-US",
        {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        }
    )


    const checkInTime =
        attendance?.checkIn?.time
            ? new Date(
                attendance.checkIn.time
            ).toLocaleTimeString(
                "en-US",
                {
                    hour: "2-digit",
                    minute: "2-digit"
                }
            )
            : "--:--"


    const checkOutTime =
        attendance?.checkOut?.time
            ? new Date(
                attendance.checkOut.time
            ).toLocaleTimeString(
                "en-US",
                {
                    hour: "2-digit",
                    minute: "2-digit"
                }
            )
            : "--:--"


    const totalMinutes = attendance?.totalWorkingMinutes || 0


    const hours = Math.floor(totalMinutes / 60)


    const minutes = totalMinutes % 60


    const isCheckedIn = Boolean(attendance?.checkIn?.time)


    const isCheckedOut = Boolean(attendance?.checkOut?.time)


    const withinOffice =
        distance !== null &&
        distance <= attendanceRadius


    return (
        <>
            <section className="attendance-section">

                <div className="container">


                    <div className="row g-3 attendance-summary">


                        {/* Date */}

                        <div className="col-lg-3 col-md-6">

                            <div className="attendance-card">

                                <div className="attendance-icon blue">
                                    <span>◷</span>
                                </div>

                                <div className="attendance-card-info">

                                    <p>Today's Date</p>

                                    <h5>
                                        {currentTime.toLocaleDateString(
                                            "en-US"
                                        )}
                                    </h5>

                                    <small>
                                        {currentTime.toLocaleDateString(
                                            "en-US",
                                            {
                                                weekday: "long"
                                            }
                                        )}
                                    </small>

                                </div>

                            </div>

                        </div>


                        {/* Check In */}

                        <div className="col-lg-3 col-md-6">

                            <div className="attendance-card">

                                <div className="attendance-icon green">
                                    <span>✓</span>
                                </div>

                                <div className="attendance-card-info">

                                    <p>Check-In Time</p>

                                    <h5>
                                        {checkInTime}
                                    </h5>

                                    <small>
                                        {isCheckedIn
                                            ? "Today"
                                            : "Not Checked In"}
                                    </small>

                                </div>

                            </div>

                        </div>


                        {/* Check Out */}

                        <div className="col-lg-3 col-md-6">

                            <div className="attendance-card">

                                <div className="attendance-icon orange">
                                    <span>→</span>
                                </div>

                                <div className="attendance-card-info">

                                    <p>Check-Out Time</p>

                                    <h5>
                                        {checkOutTime}
                                    </h5>

                                    <small>
                                        {isCheckedOut
                                            ? "Today"
                                            : "Not Checked Out"}
                                    </small>

                                </div>

                            </div>

                        </div>


                        {/* Total */}

                        <div className="col-lg-3 col-md-6">

                            <div className="attendance-card">

                                <div className="attendance-icon purple">
                                    <span>◷</span>
                                </div>

                                <div className="attendance-card-info">

                                    <p>Total Working Hours</p>

                                    <h5>
                                        {hours}h {minutes}m
                                    </h5>

                                    <small>
                                        Today
                                    </small>

                                </div>

                            </div>

                        </div>

                    </div>


                    <div className="row g-3 mt-1">


                        {/* LEFT */}

                        <div className="col-lg-4">

                            <div className="attendance-main-card">


                                <div className="attendance-section-title">

                                    <h5>
                                        Clock In / Out
                                    </h5>

                                </div>


                                <hr />


                                {/* Clock */}

                                <div className="attendance-clock">

                                    <div className="clock-circle">

                                        <div className="clock-content">

                                            <small>
                                                {today}
                                            </small>

                                            <h2>
                                                {time}
                                            </h2>

                                            <span className="present-badge">

                                                {isCheckedIn
                                                    ? "You are Present"
                                                    : "Not Checked In"}

                                            </span>

                                        </div>

                                    </div>

                                </div>


                                {/* Location status */}

                                <div className="location-verified">

                                    <strong>

                                        {loadingLocation
                                            ? "Checking Location..."
                                            : withinOffice
                                                ? "Location Verified ✓"
                                                : "Outside Office Range"}

                                    </strong>


                                    <p>

                                        {loadingLocation
                                            ? "Getting your current location"
                                            : withinOffice
                                                ? "You are within office premises"
                                                : "You must be within 50 meters of the office"}

                                    </p>


                                    {location?.accuracy && (

                                        <small>
                                            GPS Accuracy:{" "}
                                            {Math.round(
                                                location.accuracy
                                            )} meters
                                        </small>

                                    )}

                                </div>


                                {/* Buttons */}

                                <div className="attendance-buttons">

                                    <button
                                        className="btn check-in-btn"
                                        onClick={handleCheckIn}
                                        disabled={
                                            isCheckedIn ||
                                            !withinOffice ||
                                            processing
                                        }
                                    >

                                        ✓ &nbsp;

                                        {processing
                                            ? "Processing..."
                                            : isCheckedIn
                                                ? "Checked In"
                                                : "Check In"}

                                    </button>


                                    <button
                                        className="btn check-out-btn"
                                        onClick={handleCheckOut}
                                        disabled={
                                            !isCheckedIn ||
                                            isCheckedOut ||
                                            !withinOffice ||
                                            processing
                                        }
                                    >

                                        ⊗ &nbsp;

                                        {isCheckedOut
                                            ? "Checked Out"
                                            : "Check Out"}

                                    </button>

                                </div>


                                {/* Office */}

                                <div className="office-location">

                                    <div className="location-pin">
                                        📍
                                    </div>


                                    <div>

                                        <strong>
                                            Office Location
                                        </strong>

                                        <span>
                                            Company Office
                                        </span>

                                        <span>
                                            Attendance Premises
                                        </span>

                                    </div>


                                    <div className="location-range">

                                        <span>
                                            {withinOffice
                                                ? "Within Range"
                                                : "Outside Range"}
                                        </span>

                                        <small>

                                            Distance:{" "}

                                            {distance !== null
                                                ? `${Math.round(distance)} m`
                                                : "--"}

                                        </small>

                                    </div>

                                </div>

                            </div>

                        </div>


                        {/* RIGHT */}

                        <div className="col-lg-8">

                            <div className="attendance-main-card">


                                <div className="live-location-header">

                                    <h5>
                                        Live Location Verification
                                    </h5>


                                    <button
                                        className="refresh-btn"
                                        onClick={getLocation}
                                    >
                                        ↻
                                    </button>

                                </div>


                                <hr />


                                {/* Actual Map */}

                                <div className="map-container">

                                    <MapContainer
                                        center={[
                                            Number(import.meta.env.VITE_OFFICE_LATITUDE),
                                            Number(import.meta.env.VITE_OFFICE_LONGITUDE)
                                        ]}
                                        zoom={17}
                                        style={{
                                            width: "100%",
                                            height: "100%"
                                        }}
                                    >

                                        <TileLayer
                                            attribution='&copy; OpenStreetMap contributors'
                                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                        />


                                        {/* Office */}

                                        <Marker
                                            position={[
                                                Number(import.meta.env.VITE_OFFICE_LATITUDE),
                                                Number(import.meta.env.VITE_OFFICE_LONGITUDE)
                                            ]}
                                        />


                                        {/* 50 meter geofence */}

                                        <Circle
                                            center={[
                                                Number(import.meta.env.VITE_OFFICE_LATITUDE),
                                                Number(import.meta.env.VITE_OFFICE_LONGITUDE)
                                            ]}
                                            radius={
                                                Number(import.meta.env.VITE_ATTENDANCE_RADIUS)
                                            }
                                            pathOptions={{
                                                color: "blue"
                                            }}
                                        />


                                        {/* User */}

                                        {location && (

                                            <>

                                                <Marker
                                                    position={[
                                                        location.latitude,
                                                        location.longitude
                                                    ]}
                                                />


                                                <RecenterMap
                                                    position={location}
                                                />

                                            </>

                                        )}

                                    </MapContainer>

                                </div>


                                {/* Verification */}

                                <div className="verification-message">

                                    <div className="verification-icon">

                                        {withinOffice
                                            ? "✓"
                                            : "!"}

                                    </div>


                                    <div>

                                        <strong>

                                            {withinOffice
                                                ? "You are within the office geofence"
                                                : "You are outside the office geofence"}

                                        </strong>


                                        <p>

                                            {withinOffice
                                                ? "Your location is verified. You can check-in/out."
                                                : "Move within 50 meters of the office to check-in/out."}

                                        </p>

                                    </div>

                                </div>


                                {/* Location details */}

                                <div className="location-details">

                                    <div className="detail-row">

                                        <strong>
                                            Current Location
                                        </strong>

                                        <span>

                                            {location
                                                ? `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`
                                                : "Location unavailable"}

                                        </span>

                                    </div>


                                    <div className="detail-row">

                                        <strong>
                                            Latitude / Longitude
                                        </strong>

                                        <span>

                                            {location
                                                ? `${location.latitude.toFixed(6)}° N, ${location.longitude.toFixed(6)}° E`
                                                : "--"}

                                        </span>

                                    </div>


                                    <div className="detail-row">

                                        <strong>
                                            Accuracy
                                        </strong>

                                        <span>

                                            {location?.accuracy
                                                ? `${Math.round(location.accuracy)} meters`
                                                : "--"}

                                        </span>

                                    </div>


                                    <div className="detail-row">

                                        <strong>
                                            Distance From Office
                                        </strong>

                                        <span>

                                            {distance !== null
                                                ? `${Math.round(distance)} meters`
                                                : "--"}

                                        </span>

                                    </div>

                                </div>

                            </div>

                        </div>

                    </div>

                </div>

            </section>
        </>
    )
}


// Haversine distance calculation
function calculateDistance(latitude1,longitude1,latitude2,longitude2) {

    const earthRadius = 6371000

    const lat1 =
        latitude1 * Math.PI / 180

    const lat2 =
        latitude2 * Math.PI / 180

    const differenceLatitude =
        (latitude2 - latitude1) *
        Math.PI / 180

    const differenceLongitude =
        (longitude2 - longitude1) *
        Math.PI / 180


    const a =
        Math.sin(differenceLatitude / 2) *
        Math.sin(differenceLatitude / 2) +

        Math.cos(lat1) *
        Math.cos(lat2) *
        Math.sin(differenceLongitude / 2) *
        Math.sin(differenceLongitude / 2)


    const c =
        2 * Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
        )


    return earthRadius * c
}


// Geolocation error messages
function getLocationErrorMessage(errorCode) {

    switch (errorCode) {

        case 1:
            return "Location permission was denied."

        case 2:
            return "Your location could not be determined."

        case 3:
            return "Location request timed out."

        default:
            return "Unable to get your location."
    }
}


export default Attendence