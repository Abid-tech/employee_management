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
                <div className="row mb-4">
                    <div className="col-lg-12">

                        <div className="employee-section">

                            <div className="employee-section-header">
                                <div>
                                    <h4>My Salary Slips</h4>
                                    <p>View your salary history and payment status</p>
                                </div>
                            </div>

                            {loading ? (
                                <p>Loading salary slips...</p>
                            ) : slips.length === 0 ? (
                                <p>No salary slips available yet.</p>
                            ) : (
                                <div className="table-responsive">
                                    <table className="table align-middle">
                                        <thead>
                                            <tr>
                                                <th>Month/Year</th>
                                                <th>Net Pay</th>
                                                <th>Status</th>
                                                <th></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {slips.map((slip) => (
                                                <tr key={slip._id}>
                                                    <td>{slip.month}/{slip.year}</td>
                                                    <td>{slip.netPay}</td>
                                                    <td>
                                                        <span className={`badge bg-${statusBadge[slip.paymentStatus]}`}>
                                                            {slip.paymentStatus}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-outline-primary"
                                                            onClick={() => setSelected(slip)}
                                                        >
                                                            View
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

                {selected && (
                    <div
                        className="modal show d-block"
                        style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
                    >
                        <div className="modal-dialog">
                            <div className="modal-content">

                                <div className="modal-header">
                                    <h5 className="modal-title">
                                        Salary Slip — {selected.month}/{selected.year}
                                    </h5>
                                    <button className="btn-close" onClick={() => setSelected(null)} />
                                </div>

                                <div className="modal-body">
                                    <table className="table table-sm">
                                        <tbody>
                                            <tr><td>Basic Salary</td><td>{selected.basicSalary}</td></tr>
                                            <tr><td>Present Days</td><td>{selected.presentDays}</td></tr>
                                            <tr><td>Overtime Days</td><td>{selected.overtimeDays}</td></tr>
                                            <tr><td>Bonus (per OT day)</td><td>{selected.bonusPerOvertimeDay}</td></tr>
                                            <tr><td>Total Bonus</td><td>{selected.totalBonus}</td></tr>
                                            <tr><td>Deductions</td><td>{selected.deductions}</td></tr>
                                            <tr><td>Gross Pay</td><td>{selected.grossPay}</td></tr>
                                            <tr className="fw-bold">
                                                <td>Net Pay</td>
                                                <td>{selected.netPay}</td>
                                            </tr>
                                            <tr>
                                                <td>Status</td>
                                                <td>
                                                    <span className={`badge bg-${statusBadge[selected.paymentStatus]}`}>
                                                        {selected.paymentStatus}
                                                    </span>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                <div className="modal-footer">
                                    <button className="btn btn-secondary" onClick={() => setSelected(null)}>
                                        Close
                                    </button>
                                </div>

                            </div>
                        </div>
                    </div>
                )}
            </div>
        </section>
    )
}


export default EmployeeSalary