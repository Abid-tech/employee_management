import { API_BASE } from '../../lib/api_base'
import { useState, useEffect } from "react"
import "../../index.css"


function EmployeeSalary() {

    const [slips, setSlips] = useState([])
    const [selected, setSelected] = useState(null)
    const [loading, setLoading] = useState(true)


    useEffect(() => {
        fetchMySlips()
    }, [])


    const fetchMySlips = async () => {

        try {

            const response = await fetch(
                `${API_BASE}/salary/my`,
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

            if (response.ok) {
                setSlips(data.slips || [])
            }

        } catch (err) {
            console.error("Error fetching salary slips:", err)
        } finally {
            setLoading(false)
        }
    }


    const statusBadge = {
        Pending: "warning",
        Processing: "info",
        Paid: "success"
    }


    return (
    <section id="employee-salary">

        <div className="container">

            {/* ================= SALARY HISTORY ================= */}

            <div className="row">

                <div className="col-lg-12">

                    <div className="salary-history-card">

                        {/* Header */}

                        <div className="salary-history-header">

                            <div>
                                <h4>My Salary Slips</h4>

                                <p>
                                    View your salary history and payment status
                                </p>
                            </div>

                            <div className="salary-count">
                                {slips.length}
                            </div>

                        </div>

                        <hr />


                        {/* Content */}

                        {loading ? (

                            <div className="salary-message">
                                <span className="salary-loader"></span>
                                Loading salary slips...
                            </div>

                        ) : slips.length === 0 ? (

                            <div className="salary-message empty">
                                <div className="empty-salary-icon">
                                    ৳
                                </div>

                                <strong>
                                    No salary slips available
                                </strong>

                                <span>
                                    Your generated salary slips will appear here.
                                </span>
                            </div>

                        ) : (

                            <div className="table-responsive">

                                <table className="table salary-history-table align-middle">

                                    <thead>
                                        <tr>
                                            <th>Period</th>
                                            <th>Net Pay</th>
                                            <th>Status</th>
                                            <th className="text-end">
                                                Action
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>

                                        {slips.map((slip) => (

                                            <tr key={slip._id}>

                                                {/* Period */}

                                                <td>

                                                    <div className="salary-period">

                                                        <div className="period-icon">
                                                            $
                                                        </div>

                                                        <div>
                                                            <strong>
                                                                {new Date(
                                                                    2000,
                                                                    slip.month - 1
                                                                ).toLocaleString(
                                                                    "default",
                                                                    {
                                                                        month: "long"
                                                                    }
                                                                )}
                                                            </strong>

                                                            <small>
                                                                {slip.year}
                                                            </small>
                                                        </div>

                                                    </div>

                                                </td>


                                                {/* Net Pay */}

                                                <td>

                                                    <span className="salary-net-pay">
                                                        ৳ {slip.netPay}
                                                    </span>

                                                </td>


                                                {/* Status */}

                                                <td>

                                                    <span
                                                        className={`salary-payment-status ${
                                                            slip.paymentStatus
                                                                ?.toLowerCase()
                                                                .replace(" ", "-")
                                                        }`}
                                                    >
                                                        <span className="status-dot"></span>

                                                        {slip.paymentStatus}
                                                    </span>

                                                </td>


                                                {/* Action */}

                                                <td className="text-end">

                                                    <button
                                                        type="button"
                                                        className="salary-view-btn"
                                                        onClick={() =>
                                                            setSelected(slip)
                                                        }
                                                    >
                                                        View Slip
                                                    </button>

                                                </td>

                                            </tr>

                                        ))}

                                    </tbody>

                                </table>

                            </div>

                        )}

                    </div>

                </div>

            </div>


            {/* ================= SALARY SLIP MODAL ================= */}

            {selected && (

                <div
                    className="salary-modal-overlay"
                    onClick={() => setSelected(null)}
                >

                    <div
                        className="salary-slip-modal"
                        onClick={(e) => e.stopPropagation()}
                    >

                        {/* Slip Header */}

                        <div className="salary-slip-header">

                            <div>

                                <h4>
                                    Salary Slip
                                </h4>

                                <p>
                                    {new Date(
                                        2000,
                                        selected.month - 1
                                    ).toLocaleString(
                                        "default",
                                        {
                                            month: "long"
                                        }
                                    )}{" "}
                                    {selected.year}
                                </p>

                            </div>


                            <button
                                type="button"
                                className="salary-close-btn"
                                onClick={() => setSelected(null)}
                            >
                                ×
                            </button>

                        </div>


                        {/* Company / Employee information */}

                        <div className="slip-information">

                            <div>

                                <span>Employee</span>

                                <strong>
                                    Salary Statement
                                </strong>

                            </div>

                            <div className="text-end">

                                <span>Payment Status</span>

                                <span
                                    className={`salary-payment-status ${
                                        selected.paymentStatus
                                            ?.toLowerCase()
                                            .replace(" ", "-")
                                    }`}
                                >
                                    <span className="status-dot"></span>

                                    {selected.paymentStatus}
                                </span>

                            </div>

                        </div>


                        {/* Earnings */}

                        <div className="slip-section">

                            <div className="slip-section-title">
                                Earnings
                            </div>


                            <div className="slip-row">

                                <span>
                                    Basic Salary
                                </span>

                                <strong>
                                    ৳ {selected.basicSalary}
                                </strong>

                            </div>


                            <div className="slip-row">

                                <span>
                                    Present Days
                                </span>

                                <strong>
                                    {selected.presentDays} days
                                </strong>

                            </div>


                            <div className="slip-row">

                                <span>
                                    Overtime Days
                                </span>

                                <strong>
                                    {selected.overtimeDays} days
                                </strong>

                            </div>


                            <div className="slip-row">

                                <span>
                                    Bonus / Overtime Day
                                </span>

                                <strong>
                                    ৳ {selected.bonusPerOvertimeDay}
                                </strong>

                            </div>


                            <div className="slip-row">

                                <span>
                                    Total Bonus
                                </span>

                                <strong>
                                    ৳ {selected.totalBonus}
                                </strong>

                            </div>

                        </div>


                        {/* Deductions */}

                        <div className="slip-section">

                            <div className="slip-section-title">
                                Deductions
                            </div>


                            <div className="slip-row">

                                <span>
                                    Total Deductions
                                </span>

                                <strong className="deduction-value">
                                    - ৳ {selected.deductions}
                                </strong>

                            </div>

                        </div>


                        {/* Gross Pay */}

                        <div className="slip-total-row">

                            <span>
                                Gross Pay
                            </span>

                            <strong>
                                ৳ {selected.grossPay}
                            </strong>

                        </div>


                        {/* Net Pay */}

                        <div className="slip-net-pay">

                            <div>

                                <span>
                                    Net Pay
                                </span>

                                <small>
                                    Final amount payable
                                </small>

                            </div>

                            <strong>
                                ৳ {selected.netPay}
                            </strong>

                        </div>


                        {/* Footer */}

                        <div className="slip-footer">

                            <span>
                                This is a computer-generated salary slip.
                            </span>

                            <button
                                type="button"
                                onClick={() => setSelected(null)}
                            >
                                Close
                            </button>

                        </div>

                    </div>

                </div>

            )}

        </div>

    </section>
)
}


export default EmployeeSalary