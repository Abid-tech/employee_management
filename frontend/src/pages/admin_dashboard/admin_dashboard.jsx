import { useState, useEffect } from "react"
import "../../index.css"

function AdminDashboard() {
    const [leaves, setLeaves] = useState([])
    const [updating, setUpdating] = useState(null) 

    useEffect(() => {
        fetchLeaves()
    }, [])

    const fetchLeaves = async () => {
        try {
            const response = await fetch("http://localhost:5000/leave-management")
            const data = await response.json()
            console.log("Fetched leaves:", data)
            setLeaves(data)
        } catch (err) {
            console.error("Error fetching leaves:", err)
        }
    }


    const updateStatus = async (id, newStatus) => {
        setUpdating(id)
        try {
            const response = await fetch(`http://localhost:5000/leave-management/${id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ status: newStatus })
            })

            const result = await response.json()
            console.log("Update response:", result)

     
            setLeaves(prevLeaves =>
                prevLeaves.map(leave =>
                    leave._id === id ? { ...leave, status: newStatus } : leave
                )
            )

        } catch (err) {
            console.error("Error updating status:", err)
        } 
    }

    const formatDate = (dateString) => {
        if (!dateString){
            return "N/A"
        }
        else{
            const date = new Date(dateString)
            return date.toISOString().split('T')[0]
        }
    }



    return (
        <>
            <section id="Leave-request-handle">
                <div className="container">
                    <div className="row">
                        <div className="col-lg-12 mt-2 mb-2">
                            <div className="leave-history">
                                <div className="history-top">
                                    <h4>Leave Requests ({leaves.length})</h4>
                                </div>

                                <hr />

                                <div className="table-responsive">
                                    <table className="table align-middle">
                                        <thead>
                                            <tr>
                                                <th>#</th>
                                                <th>Leave Type</th>
                                                <th>Duration</th>
                                                <th>Days</th>
                                                <th>Priority</th>
                                                <th>Reason</th>
                                                <th>Replacement</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {leaves.length === 0 ? (
                                                <tr>
                                                    <td colSpan="9" className="text-center">
                                                        No leave requests found
                                                    </td>
                                                </tr>
                                            ) : (
                                                leaves.map((leave, index) => (
                                                    <tr key={leave._id}>
                                                        <td>{index + 1}</td>


                                                        <td>
                                                            <span className={`leave-type ${leave.leaveType?.toLowerCase().replace(' ', '-') || 'annual'}`}>
                                                                {leave.leaveType || "N/A"}
                                                            </span>
                                                        </td>

                                                        <td>
                                                            {formatDate(leave.StartDate)} - {formatDate(leave.EndDate)}
                                                            <br />
                                                            <small className="text-muted">
                                                                {leave.leaveDuration}
                                                            </small>
                                                        </td>

                                                        <td>{leave.TotalDays}</td>

                                                        <td>
                                                            {leave.Priority}
                                                        </td>

                                                        <td>
                                                            {leave.Reason?.length > 50 
                                                                ? leave.Reason.substring(0, 50) + "..." 
                                                                : leave.Reason}
                                                        </td>

                                                        <td>{leave.ReplacementEmployee || "None"}</td>

                                                        <td>
                                                            <div className="status-action">
                                                                <select
                                                                    className="status-select"
                                                                    value={leave.status || "Pending"}
                                                                    onChange={(e) => updateStatus(leave._id, e.target.value)}
                                                                    disabled={leave.status !== "Pending"}
                                                                >
                                                                    <option value="Pending">Pending</option>
                                                                    <option value="Accepted">Accepted</option>
                                                                    <option value="Rejected">Rejected</option>
                                                                </select>
                                                            </div>
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

export default AdminDashboard