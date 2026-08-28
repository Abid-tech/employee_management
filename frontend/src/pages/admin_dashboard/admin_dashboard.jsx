import { API_BASE } from '../../lib/api_base'
import { useState, useEffect } from "react"
import "../../index.css"
import AdminSalary from "../../components/admin_salary/adminSalary"

function AdminDashboard() {
    const [leaves, setLeaves] = useState([])
    const [updating, setUpdating] = useState(null) 
    const [type, setType] = useState("Announcement")

    const [title, setTitle] = useState("")
    const [message, setMessage] = useState("")
    const [expirationDate, setExpirationDate] = useState("")
    const [options, setOptions] = useState([ "",""])
    const [creatingCommunication, setCreatingCommunication] = useState(false)
    const [pollResults, setPollResults] = useState([])


    // Communication part
    const addOption = () => {

            if (options.length >= 10) {

                alert("Maximum 10 options allowed.")

                return
            }

            setOptions([
                ...options,
                ""
            ])
        }
    const removeOption = (index) => {

        if (options.length <= 2) {
            return
        }

        setOptions(
            options.filter(
                (_, i) => i !== index
            )
        )
    }

    const updateOption = (index, value) => {

        const updatedOptions = [
            ...options
        ]

        updatedOptions[index] = value

        setOptions(updatedOptions)
    }

    const handleCommunicationSubmit = async (e) => {

            e.preventDefault()


            if (!title.trim()) {

                alert("Please enter a title.")

                return
            }


            if (!message.trim()) {

                alert("Please enter a message.")

                return
            }


            let cleanedOptions = []


            if (type === "Poll") {

                cleanedOptions = options
                    .map(option => option.trim())
                    .filter(option => option !== "")


                if (cleanedOptions.length < 2) {

                    alert(
                        "A poll must have at least 2 options."
                    )

                    return
                }


                if (
                    new Set(cleanedOptions).size !==
                    cleanedOptions.length
                ) {

                    alert(
                        "Poll options must be unique."
                    )

                    return
                }
            }


            setCreatingCommunication(true)


            try {

                const response = await fetch(
                    `${API_BASE}/communication`,
                    {
                        method: "POST",
                        credentials: "include",
                        headers: {
                            "Content-Type":
                                "application/json"
                        },
                        body: JSON.stringify({

                            type,

                            title,

                            message,

                            options:
                                type === "Poll"
                                    ? cleanedOptions
                                    : [],

                            expirationDate:
                                expirationDate || null

                        })
                    }
                )


                const result =
                    await response.json()


                if (!response.ok) {

                    alert(
                        result.message ||
                        "Failed to create communication"
                    )

                    return
                }


                alert(
                    type === "Poll"
                        ? "Poll created successfully!"
                        : "Announcement created successfully!"
                )


                // Clear form

                setTitle("")

                setMessage("")

                setExpirationDate("")

                setType("Announcement")

                setOptions([
                    "",
                    ""
                ])


                // Refresh poll results

                fetchPollResults()


            } catch (err) {

                console.error(
                    "Communication error:",
                    err
                )

                alert(
                    "Something went wrong."
                )

            } finally {

                setCreatingCommunication(false)

            }
        }


        const fetchPollResults = async () => {

            try {

                // First get all communications to find polls
                const response = await fetch(
                    `${API_BASE}/communication`,
                    {
                        method: "GET",
                        credentials: "include"
                    }
                )


                const data = await response.json()


                if (!response.ok) {

                    throw new Error(
                        data.message ||
                        "Failed to fetch communications"
                    )
                }


                // Filter to only polls
                const polls = (data.communications || [])
                    .filter(comm => comm.type === "Poll")


                // Fetch results for each poll
                const results = []
                
                for (const poll of polls) {
                    
                    try {
                        const resultResponse = await fetch(
                            `${API_BASE}/communication/${poll._id}/results`,
                            {
                                method: "GET",
                                credentials: "include"
                            }
                        )


                        const resultData = await resultResponse.json()


                        if (resultResponse.ok) {
                            results.push(resultData.poll)
                        }
                    } catch (err) {
                        console.error(`Error fetching results for poll ${poll._id}:`, err)
                    }
                }


                setPollResults(results)


            } catch (err) {

                console.error(
                    "Error fetching poll results:",
                    err
                )
            }
        }

    

// Leave part

    useEffect(() => {
        fetchLeaves()
        fetchPollResults()
    }, [])

    const fetchLeaves = async () => {
        try {
            const response = await fetch(`${API_BASE}/leave-management`, {
                method: "GET",
                credentials: "include",
            })
            const data = await response.json()
            console.log("Fetched leaves:", data)
            setLeaves(data.leaves)
        } catch (err) {
            console.error("Error fetching leaves:", err)
        }
    }


    const updateStatus = async (id, newStatus) => {

            setUpdating(id)

            try {

                const response = await fetch(
                    `${API_BASE}/leave-management/${id}`,
                    {
                        method: "PUT",
                        credentials: "include",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            status: newStatus
                        })
                    }
                )


                const result = await response.json()


                console.log(
                    "Update response:",
                    result
                )


                if (!response.ok) {

                    alert(
                        result.message ||
                        result.error ||
                        "Failed to update leave status"
                    )

                    return

                }


                // Only update UI after successful backend update
                setLeaves(prevLeaves =>
                    prevLeaves.map(leave =>
                        leave._id === id
                            ? {
                                ...leave,
                                status: result.leave.status
                            }
                            : leave
                    )
                )


            } catch (err) {

                console.error(
                    "Error updating status:",
                    err
                )

                alert(
                    "Something went wrong while updating the leave."
                )

            } finally {

                setUpdating(null)

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


            <section id="communication-dashboard">
                <div className="container">

                    <div className="row">
                        <div className="col-lg-12 mx-auto">

                            <div className="communication-form">

                                {/* Header */}
                                <div className="communication-form-header">

                                    <h4>
                                        Internal Communication
                                    </h4>

                                    <p>
                                        Create an announcement or poll
                                        for employees
                                    </p>

                                </div>

                                <hr />


                                <form onSubmit={handleCommunicationSubmit}>

                                    {/* ================= TYPE ================= */}

                                    <div className="mb-3">

                                        <label className="form-label">
                                            Communication Type
                                        </label>


                                        <div className="communication-type-options">

                                            {/* Announcement */}

                                            <label
                                                className={`communication-type-option ${
                                                    type === "Announcement"
                                                        ? "active"
                                                        : ""
                                                }`}
                                            >

                                                <input
                                                    type="radio"
                                                    name="type"
                                                    value="Announcement"
                                                    checked={
                                                        type === "Announcement"
                                                    }
                                                    onChange={(e) =>
                                                        setType(
                                                            e.target.value
                                                        )
                                                    }
                                                />

                                                <div>
                                                    <strong>
                                                        Announcement
                                                    </strong>

                                                    <small>
                                                        Share an important
                                                        update
                                                    </small>
                                                </div>

                                            </label>


                                            {/* Poll */}

                                            <label
                                                className={`communication-type-option ${
                                                    type === "Poll"
                                                        ? "active"
                                                        : ""
                                                }`}
                                            >

                                                <input
                                                    type="radio"
                                                    name="type"
                                                    value="Poll"
                                                    checked={
                                                        type === "Poll"
                                                    }
                                                    onChange={(e) =>
                                                        setType(
                                                            e.target.value
                                                        )
                                                    }
                                                />

                                                <div>
                                                    <strong>
                                                        Poll
                                                    </strong>

                                                    <small>
                                                        Collect employee
                                                        responses
                                                    </small>
                                                </div>

                                            </label>

                                        </div>

                                    </div>


                                    {/* ================= TITLE ================= */}

                                    <div className="mb-3">

                                        <label className="form-label">
                                            Title
                                        </label>

                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="Enter communication title"
                                            maxLength={200}
                                            value={title}
                                            onChange={(e) =>
                                                setTitle(e.target.value)
                                            }
                                        />

                                        <div className="field-hint">
                                            Maximum 200 characters
                                        </div>

                                    </div>


                                    {/* ================= MESSAGE ================= */}

                                    <div className="mb-3">

                                        <label className="form-label">
                                            Message
                                        </label>

                                        <textarea
                                                className="form-control communication-textarea"
                                                rows="5"
                                                placeholder="Write your message..."
                                                maxLength={2000}
                                                value={message}
                                                onChange={(e) =>
                                                    setMessage(e.target.value)
                                                }
                                        />

                                        <div className="field-hint">
                                            Maximum 2000 characters
                                        </div>

                                    </div>


                                    {/* ================= POLL OPTIONS ================= */}

                                    {type === "Poll" && (

                                        <div className="poll-options-section">

                                            <label className="form-label">
                                                Poll Options
                                            </label>


                                            {options.map(
                                                (option, index) => (

                                                    <div
                                                        className="poll-input-row"
                                                        key={index}
                                                    >

                                                        <input
                                                            type="text"
                                                            className="form-control"
                                                            placeholder={`Option ${
                                                                index + 1
                                                            }`}
                                                            value={option}
                                                            onChange={(e) =>
                                                                updateOption(
                                                                    index,
                                                                    e.target.value
                                                                )
                                                            }
                                                        />


                                                        <button
                                                            type="button"
                                                            className="remove-option-btn"
                                                            onClick={() =>
                                                                removeOption(
                                                                    index
                                                                )
                                                            }
                                                        >
                                                            ×
                                                        </button>

                                                    </div>

                                                )
                                            )}


                                            <button
                                                type="button"
                                                className="add-option-btn"
                                                onClick={addOption}
                                            >
                                                + Add Option
                                            </button>

                                        </div>

                                    )}


                                    {/* ================= EXPIRATION ================= */}

                                    <div className="mb-3">

                                        <label className="form-label">
                                            Expiration Date
                                            <span className="optional-text">
                                                Optional
                                            </span>
                                        </label>

                                        <input
                                                type="datetime-local"
                                                className="form-control"
                                                value={expirationDate}
                                                onChange={(e) =>
                                                    setExpirationDate(e.target.value)
                                                }
                                            />

                                    </div>


                                    {/* ================= SUBMIT ================= */}

                                    <div className="communication-submit">

                                        <button
                                            type="submit"
                                            className="btn communication-submit-btn"
                                            disabled={creatingCommunication}
                                        >
                                            {creatingCommunication
                                                ? "Creating..."
                                                : type === "Poll"
                                                    ? "Create Poll"
                                                    : "Create Announcement"}
                                        </button>

                                    </div>

                                </form>

                            </div>

                        </div>
                    </div>




                    <div className="row">

                            <div className="col-lg-12 mt-4">

                                <div className="poll-result">

                                    <div className="poll-result-header">

                                        <div>

                                            <h4>
                                                Poll Results
                                            </h4>

                                            <p>
                                                Current employee responses
                                            </p>

                                        </div>

                                    </div>


                                    <hr />


                                    {pollResults.length === 0 ? (

                                        <p>
                                            No polls created yet.
                                        </p>

                                    ) : (

                                        pollResults.map(poll => (

                                                    <div
                                                        className="mb-5"
                                                        key={poll._id}
                                                    >

                                                        <div className="poll-question">

                                                            <span>
                                                                Poll
                                                            </span>

                                                            <strong>
                                                                {poll.title}
                                                            </strong>

                                                        </div>


                                                        <p>
                                                            {poll.message}
                                                        </p>


                                                        <p className="text-muted">

                                                            Total votes:
                                                            {" "}
                                                            {poll.totalVotes || poll.options.reduce((sum, opt) => sum + opt.votes, 0)}

                                                        </p>


                                                        {poll.options.map(
                                                            option => (

                                                                <div
                                                                    className="poll-option"
                                                                    key={option._id || option.text} // Use _id or text as key
                                                                >

                                                                    <div className="poll-option-info">

                                                                        <span>
                                                                            {option.text} 
                                                                        </span>

                                                                        <strong>
                                                                            {option.votes}
                                                                            {" "}
                                                                            (
                                                                            {poll.totalVotes > 0 
                                                                                ? Math.round((option.votes / poll.totalVotes) * 100) 
                                                                                : 0}%)
                                                                        </strong>

                                                                    </div>


                                                                    <div className="poll-progress">

                                                                        <div
                                                                            className="poll-progress-bar"
                                                                            style={{
                                                                                width: `${poll.totalVotes > 0 ? Math.round((option.votes / poll.totalVotes) * 100) : 0}%`
                                                                            }}
                                                                        />

                                                                    </div>

                                                                </div>

                                                            )
                                                        )}

                                                    </div>

                                                )))
                                            }

                                </div>

                            </div>

                        </div>

            
                    </div>




            </section>



            <AdminSalary />
    


        </>
    )
}

export default AdminDashboard