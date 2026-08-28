import { useState,useEffect } from "react"
import "../../index.css"

function Leave(){
    
    const [leaveType, setLeaveType] = useState("");
    const [leaveDuration, setDuration] = useState("");
    const [priority, setPriority] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [total, countTotal] = useState(0)
    const [reason, setReason] = useState("")
    const [replacement, setReplacement] = useState("")
    const [Allleaves, setAllLeave] = useState([])
    const [leaveSummary, setLeaveSummary] = useState({
        totalTaken: 0,
        totalPending: 0,
        totalApproved: 0,
        remainingBalance: 0
    })
    const [userBalance, setUserBalance] = useState(0)

    useEffect(() => {
        if (!startDate || !endDate) {
            countTotal(0)
            return
        }
        const start = new Date(startDate)
        const end = new Date(endDate)
        const diff = ((end - start) / (1000 * 60 * 60 * 24)) + 1

        if (diff > 0) {
            countTotal(diff)
        } else {
            countTotal("Fix your end date")
        }
    }, [startDate, endDate])



    useEffect(() => {

        calculateLeaveSummary()

    }, [Allleaves, userBalance])


    const calculateLeaveSummary = () => {

        let totalPending = 0
        let totalApproved = 0
        let totalTaken = 0


        if (Allleaves && Allleaves.length > 0) {

            Allleaves.forEach(leave => {

                const days = Number(leave.TotalDays) || 0


                if (leave.status === "Pending") {

                    totalPending += days

                }


                else if (leave.status === "Accepted") {

                    totalApproved += days

                    totalTaken += days

                }

            })

        }


        const remainingBalance = Number(userBalance) || 0


        setLeaveSummary({

            totalTaken: totalTaken,

            totalPending: totalPending,

            totalApproved: totalApproved,

            remainingBalance: Math.max(
                0,
                remainingBalance
            )

        })

    }



    const HandleSubmit = async (e) => {
        e.preventDefault()

        const formData = {
            leaveType: leaveType,
            leaveDuration: leaveDuration,
            Priority: priority,
            StartDate: startDate,
            EndDate: endDate,
            TotalDays: total,
            Reason: reason,
            ReplacementEmployee: replacement
        }

        try {
            const response = await fetch("http://localhost:9505/leave-management", {
                method: "POST",
                credentials: 'include',
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(formData)
            })

            if (!response.ok) {
                if (response.status === 401) {
                    alert("Please login first")
                    window.location.href = "/login"
                    return
                }
                throw new Error(`HTTP error! status: ${response.status}`)
            }

            const result = await response.json()
            console.log(result)
            setLeaveType("");
            setDuration("");
            setPriority("");
            setStartDate("");
            setEndDate("");
            countTotal(0)
            setReason("")
            setReplacement("")


            await fetchLeavehistory()
            await fetchUserProfile()
            
        } catch (err) {
            console.log(err)
        }
    }

    const fetchLeavehistory = async () => {
        try {
            const response = await fetch("http://localhost:9505/leave-management", {
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                }
            })

            if (!response.ok) {
                if (response.status === 401) {
                    window.location.href = "/login"
                    return
                }
                throw new Error(`HTTP error! status: ${response.status}`)
            }
            const data = await response.json()
            console.log("📋 Leave data:", data)
            setAllLeave(data.leaves || [])
        } catch (err) {
            console.log("error message", err)
            setAllLeave([])
        }
    }

    // Fetch user profile to get leave balance
    const fetchUserProfile = async () => {

            try {

                const response = await fetch(
                    "http://localhost:9505/user/auth/me",
                    {
                        credentials: "include",
                        headers: {
                            "Accept": "application/json"
                        }
                    }
                )


                if (!response.ok) {

                    if (response.status === 401) {

                        window.location.href = "/login"

                        return

                    }

                    throw new Error(
                        `HTTP error! status: ${response.status}`
                    )

                }


                const data = await response.json()


                if (
                    data.success &&
                    data.user
                ) {

                    setUserBalance(
                        Number(data.user.leaveBalance) || 0
                    )

                }

            } catch (err) {

                console.log(
                    "Error fetching user profile:",
                    err
                )

            }

    }

    useEffect(() => {
        const loadData = async () => {
            await fetchLeavehistory()
            await fetchUserProfile()
        }
        loadData()
    }, [])

    const formatDate = (dateString) => {
        if (!dateString) {
            return "N/A"
        }
        const date = new Date(dateString)
        return date.toISOString().split('T')[0]
    }




    return (
        <>
            <section id="leave-management">
                <div className="container">
                    <div className="row">

                        <div className="col-lg-8">
                            <div className="leave-form">
                                <div className="row">

                                    <div className="col-lg-12">
                                        <div className="form-top">
                                            <h4>Apply for Leave</h4>
                                        </div>
                                        <hr />
                                    </div>

                                    <div className="col-lg-12">

                                        <form action="" onSubmit={HandleSubmit}>
                                            
                                            <div className="main-form-part">

                                                <div className="row g-2">

                                                   <div className="col-md-4">
                                                        <label className="form-label">Leave Type</label>
                                                        <select 
                                                        className="form-select"
                                                        value={leaveType}
                                                        onChange={(e)=>setLeaveType(e.target.value)}
                                                        >   <option value="">Select Leave Type</option>
                                                            <option value="Annual Leave">Annual Leave</option>
                                                            <option value="Medical Leave">Medical Leave</option>
                                                            <option value="Casual Leave">Casual Leave</option>
                                                            <option value="Emergency Leave">Emergency Leave</option>
                                                        </select>
                                                    </div>

                                                    <div className="col-md-4">
                                                        <label className="form-label d-block">Leave Duration</label>

                                                        <div className="form-check form-check-inline">
                                                            <input
                                                                className="form-check-input"
                                                                type="radio"
                                                                name="duration"
                                                                id="fullDay"
                                                                value="Full Day"
                                                                checked={leaveDuration === "Full Day"}
                                                                onChange={(e) => setDuration(e.target.value)}
                                                            />
                                                            <label className="form-check-label" htmlFor="fullDay">
                                                                Full Day
                                                            </label>
                                                        </div>

                                                        <div className="form-check form-check-inline">
                                                            <input
                                                                className="form-check-input"
                                                                type="radio"
                                                                name="duration"
                                                                id="halfDay"
                                                                value= "Half Day"
                                                                checked={leaveDuration === "Half Day"}
                                                                onChange={(e) => setDuration(e.target.value)}
                                                            />
                                                            <label className="form-check-label" htmlFor="halfDay">
                                                                Half Day
                                                            </label>
                                                        </div>
                                                    </div>

                                                    <div className="col-md-4">
                                                        <label className="form-label">Priority</label>
                                                        <select 
                                                        className="form-select"
                                                        value={priority}
                                                        onChange={(e)=>setPriority(e.target.value)}
                                                        >   
                                                            <option value="">Select Priority Type</option>
                                                            <option value="Normal">Normal</option>
                                                            <option value="Urgent">Urgent</option>
                                                        </select>
                                                    </div>

                                                </div>

                                                <div className="row g-2 mt-1">

                                                    <div className="col-md-4">
                                                        <label className="form-label">Start Date</label>
                                                        <input
                                                            type="date"
                                                            className="form-control"
                                                            value={startDate}
                                                            onChange={(e)=>{setStartDate(e.target.value)}}
                                                        />
                                                    </div>

                                                    <div className="col-md-4">
                                                        <label className="form-label">End Date</label>
                                                        <input
                                                            type="date"
                                                            className="form-control"
                                                            value={endDate}
                                                            onChange={(e)=>{setEndDate(e.target.value)}}
                                                        />
                                                    </div>

                                                    <div className="col-md-4">
                                                        <label className="form-label">Total Days</label>
                                                        <input
                                                            type="text"
                                                            className="form-control"
                                                            value={total}
                                                            onChange={(e)=>{countTotal(e.target.value)}}
                                                            readOnly
                                                        />
                                                    </div>

                                                </div>

                                                {/* Row 3 */}
                                                <div className="row mt-1">
                                                    <div className="col-12">
                                                        <label className="form-label">Reason</label>
                                                        <textarea
                                                            className="form-control"
                                                            rows="3"
                                                            placeholder="Write your reason..."
                                                            value={reason}
                                                            onChange={(e)=>{setReason(e.target.value)}}
                                                        ></textarea>
                                                    </div>
                                                </div>

                                                {/* Row 4 */}
                                                <div className="row g-2 mt-1">

                                                    <div className="col-md-6">
                                                        <label className="form-label">
                                                            Replacement Employee
                                                            <small className="text-muted"> (Optional)</small>
                                                        </label>

                                                        <select 
                                                        className="form-select"
                                                        value={replacement}
                                                        onChange={(e)=>{setReplacement(e.target.value)}}
                                                        >
                                                            <option value="">Select employee</option>
                                                            <option value="John Doe">John Doe</option>
                                                            <option value="Jane Smith">Jane Smith</option>
                                                        </select>
                                                    </div>

                                                    {/* <div className="col-md-6">
                                                        <label className="form-label">
                                                            Attachment
                                                            <small className="text-muted"> (Optional)</small>
                                                        </label>

                                                        <input
                                                            type="file"
                                                            className="form-control"
                                                        />

                                                        <small className="text-muted">
                                                            Medical certificate or supporting document
                                                        </small>
                                                    </div> */}

                                                </div>

                                    
                                                <div className="leave-form-btn text-center mt-4">
                                                    <button
                                                        type="submit"
                                                        className="btn btn-primary px-5"
                                                    >
                                                        Submit Request
                                                    </button>
                                                </div>

                                            </div>

                                        </form>

                                    </div>


                                </div>
                            </div>
                        </div>

                       {/* Dynamic Leave Summary */}
                        <div className="col-lg-4">
                            <div className="leave-status">

                                <div className="leave-status-header">
                                    <h4>Leave Summary</h4>
                                </div>

                                <hr />

                                <div className="leave-summary-item">
                                    <div className="leave-summary-icon taken">
                                        <span>▣</span>
                                    </div>
                                    <span className="leave-summary-label">
                                        Total Leaves Taken
                                    </span>
                                    <strong className="leave-summary-value">
                                        {leaveSummary.totalTaken} Days
                                    </strong>
                                </div>

                                <div className="leave-summary-item">
                                    <div className="leave-summary-icon pending">
                                        <span>◷</span>
                                    </div>
                                    <span className="leave-summary-label">
                                        Total Leaves Pending
                                    </span>
                                    <strong className="leave-summary-value">
                                        {leaveSummary.totalPending} Days
                                    </strong>
                                </div>

                                <div className="leave-summary-item">
                                    <div className="leave-summary-icon approved">
                                        <span>✓</span>
                                    </div>
                                    <span className="leave-summary-label">
                                        Total Leaves Approved
                                    </span>
                                    <strong className="leave-summary-value">
                                        {leaveSummary.totalApproved} Days
                                    </strong>
                                </div>

                                <div className="leave-summary-item">
                                    <div className="leave-summary-icon remaining">
                                        <span>◔</span>
                                    </div>
                                    <span className="leave-summary-label">
                                        Remaining Leaves
                                    </span>
                                    <strong className="leave-summary-value">
                                        {leaveSummary.remainingBalance} Days
                                    </strong>
                                </div>

                            </div>
                        </div>


                        <div className="col-lg-12 mt-4">
                            <div className="leave-history">

                                <div className="history-top">
                                    <h4>Leave History</h4>
                                </div>

                                <hr />

                                <div className="table-responsive">
                                    <table className="table align-middle">

                                        <thead>
                                            <tr>
                                                <th></th>
                                                <th>Leave Type</th>
                                                <th>Duration</th>
                                                <th>Days</th>
                                                <th>Priority</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {Allleaves.length===0?(
                                                <tr>
                                                    <td>No Previous record to show</td>
                                                </tr>
                                            ):(

                                                Allleaves.map((leave,index)=>(
                                                    <tr key={leave._id}>
                                                        <td>
                                                            <span>
                                                                {index+1}
                                                            </span>
                                                        </td>

                                                        <td>
                                                            <span className={`leave-type ${leave.leaveType.split(" ")[0].toLowerCase()}`}>
                                                                {leave.leaveType}
                                                            </span>
                                                        </td>

                                                        <td>
                                                            {formatDate(leave.StartDate)} - {formatDate(leave.EndDate)}
                                                        </td>

                                                        <td>{leave.TotalDays}</td>

                                                        <td>{leave.Priority}</td>

                                                        <td>
                                                            <span className={`status ${leave.status.toLowerCase()}`}>
                                                                {leave.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))
                                                

                                            )}
    

                                        </tbody>

                                    </table>
                                </div>

                            </div>
                        </div>


                    </div>
                </div>
            </section>
        </>
    )
}


export default Leave