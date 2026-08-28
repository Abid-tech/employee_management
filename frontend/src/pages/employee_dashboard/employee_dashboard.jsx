import { useState, useEffect } from "react"
import "../../index.css"
import EmployeeSalary from "../../components/employee_salary/employeeSalary"

function EmployeeDashboard() {

    const [communications, setCommunications] = useState([])
    const [selectedOptions, setSelectedOptions] = useState({})
    const [voting, setVoting] = useState(null)
    const [loading, setLoading] = useState(true)


    useEffect(() => {

        fetchCommunications()

    }, [])


    const fetchCommunications = async () => {

        try {

            const response = await fetch(
                "http://localhost:9505/communication",
                {
                    method: "GET",
                    credentials: "include"
                }
            )


            if (response.status === 401) {

                window.location.href = "/login"
                return

            }


            const data = await response.json()


            if (!response.ok) {

                throw new Error(
                    data.message ||
                    "Failed to fetch communications"
                )

            }


            setCommunications(
                data.communications || []
            )


            // Store already voted options
            const votedOptions = {}


            data.communications.forEach(
                communication => {

                    if (
                        communication.hasVoted
                    ) {

                        votedOptions[
                            communication._id
                        ] =
                            communication.selectedOption

                    }

                }
            )


            setSelectedOptions(votedOptions)


        } catch (err) {

            console.error(
                "Error fetching communications:",
                err
            )

        } finally {

            setLoading(false)

        }
    }



    const handleOptionChange = (
        pollId,
        optionId
    ) => {

        setSelectedOptions(
            prev => ({
                ...prev,
                [pollId]: optionId
            })
        )

    }



    const handleVote = async (pollId) => {

        const selectedOption =
            selectedOptions[pollId]


        if (!selectedOption) {

            alert(
                "Please select an option before voting."
            )

            return

        }


        setVoting(pollId)


        try {

            const response = await fetch(
                `http://localhost:9505/communication/${pollId}/vote`,
                {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body: JSON.stringify({
                        optionId: selectedOption
                    })
                }
            )


            const data =
                await response.json()


            if (!response.ok) {

                alert(
                    data.message ||
                    "Failed to submit vote"
                )

                return

            }


            alert(
                "Your vote has been submitted successfully!"
            )


            // Update UI
            setCommunications(
                prev =>
                    prev.map(
                        communication =>
                            communication._id === pollId
                                ? {
                                    ...communication,
                                    hasVoted: true,
                                    selectedOption
                                }
                                : communication
                    )
            )


        } catch (err) {

            console.error(
                "Voting error:",
                err
            )

            alert(
                "Something went wrong while submitting your vote."
            )

        } finally {

            setVoting(null)

        }
    }



    const formatDate = dateString => {

        if (!dateString) {
            return "N/A"
        }


        return new Date(
            dateString
        ).toLocaleString()

    }



    const announcements =
        communications.filter(
            communication =>
                communication.type ===
                "Announcement"
        )


    const polls =
        communications.filter(
            communication =>
                communication.type ===
                "Poll"
        )



    return (
        <>

            <section id="employee-dashboard">

                <div className="container">

                    {/* ================= WELCOME ================= */}

                    <div className="row">

                        <div className="col-lg-12">

                            <div className="employee-welcome">

                                <h3>
                                    Welcome
                                </h3>

                                <p>
                                    Stay updated with the latest
                                    company announcements and polls.
                                </p>

                            </div>

                        </div>

                    </div>



                    {/* ================= ANNOUNCEMENTS ================= */}

                    <div className="row">

                        <div className="col-lg-12">

                            <div className="employee-section">

                                <div className="employee-section-header">

                                    <div>

                                        <h4>
                                            Company Announcements
                                        </h4>

                                        <p>
                                            Latest updates from the company
                                        </p>

                                    </div>

                                </div>



                                {loading ? (

                                    <p>
                                        Loading announcements...
                                    </p>

                                ) : announcements.length === 0 ? (

                                    <p>
                                        No announcements available.
                                    </p>

                                ) : (

                                    <div className="row g-3">

                                        {announcements.map(
                                            announcement => (

                                                <div
                                                    className="col-lg-6"
                                                    key={
                                                        announcement._id
                                                    }
                                                >

                                                    <div className="announcement-card">

                                                        <h5>
                                                            {
                                                                announcement.title
                                                            }
                                                        </h5>

                                                        <p>
                                                            {
                                                                announcement.message
                                                            }
                                                        </p>

                                                        <div className="announcement-date">

                                                            Posted:{" "}

                                                            {
                                                                formatDate(
                                                                    announcement.createdAt
                                                                )
                                                            }

                                                        </div>

                                                        {announcement.expirationDate && (

                                                            <div className="announcement-date">

                                                                Expires:{" "}

                                                                {
                                                                    formatDate(
                                                                        announcement.expirationDate
                                                                    )
                                                                }

                                                            </div>

                                                        )}

                                                    </div>

                                                </div>

                                            )
                                        )}

                                    </div>

                                )}

                            </div>

                        </div>

                    </div>



                    {/* ================= POLLS ================= */}

                    <div className="row mt-4">

                        <div className="col-lg-12">

                            <div className="employee-section">

                                <div className="employee-section-header">

                                    <div>

                                        <h4>
                                            Active Polls
                                        </h4>

                                        <p>
                                            Share your opinion with the company
                                        </p>

                                    </div>

                                </div>



                                {loading ? (

                                    <p>
                                        Loading polls...
                                    </p>

                                ) : polls.length === 0 ? (

                                    <p>
                                        No active polls available.
                                    </p>

                                ) : (

                                    <div className="row g-3">

                                        {polls.map(
                                            poll => (

                                                <div
                                                    className="col-lg-12"
                                                    key={
                                                        poll._id
                                                    }
                                                >

                                                    <div className="poll-card">

                                                        <h5>
                                                            {
                                                                poll.title
                                                            }
                                                        </h5>

                                                        <p className="poll-message">
                                                            {
                                                                poll.message
                                                            }
                                                        </p>



                                                        {/* OPTIONS */}

                                                        <div className="poll-options">

                                                            {poll.options.map(
                                                                option => (
                                                                    <label
                                                                        className={`poll-option ${
                                                                            selectedOptions[
                                                                                poll._id
                                                                            ] === option.text
                                                                                ? "selected"
                                                                                : ""
                                                                        }`}
                                                                        key={
                                                                            option._id
                                                                        }
                                                                    >

                                                                        <input
                                                                            type="radio"
                                                                            name={`poll-${poll._id}`}
                                                                            value={
                                                                                option._id
                                                                            }
                                                                            checked={
                                                                                selectedOptions[
                                                                                    poll._id
                                                                                ] === option._id
                                                                            }
                                                                            disabled={
                                                                                poll.hasVoted
                                                                            }
                                                                            onChange={
                                                                                () =>
                                                                                    handleOptionChange(
                                                                                        poll._id,
                                                                                        option._id
                                                                                    )
                                                                            }
                                                                        />

                                                                        <span>
                                                                            {
                                                                                option.text
                                                                            }
                                                                        </span>

                                                                    </label>

                                                                )
                                                            )}

                                                        </div>



                                                        {/* VOTE BUTTON */}

                                                        <div className="poll-vote">

                                                            {poll.hasVoted ? (

                                                                <button
                                                                    type="button"
                                                                    disabled
                                                                >
                                                                    You have already voted
                                                                </button>

                                                            ) : (

                                                                <button
                                                                    type="button"
                                                                    disabled={
                                                                        voting ===
                                                                        poll._id
                                                                    }
                                                                    onClick={() =>
                                                                        handleVote(
                                                                            poll._id
                                                                        )
                                                                    }
                                                                >

                                                                    {voting ===
                                                                    poll._id
                                                                        ? "Submitting..."
                                                                        : "Vote"}

                                                                </button>

                                                            )}

                                                        </div>



                                                        {poll.expirationDate && (

                                                            <small className="text-muted">

                                                                Expires:{" "}

                                                                {
                                                                    formatDate(
                                                                        poll.expirationDate
                                                                    )
                                                                }

                                                            </small>

                                                        )}

                                                    </div>

                                                </div>

                                            )
                                        )}

                                    </div>

                                )}

                            </div>

                        </div>

                    </div>

                </div>

            </section>

            <EmployeeSalary />

        </>
    )
}


export default EmployeeDashboard