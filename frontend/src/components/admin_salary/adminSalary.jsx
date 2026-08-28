import { useState, useEffect } from "react"
import "../../index.css"


function AdminSalary() {

    const [employees, setEmployees] = useState([])
    const [slips, setSlips] = useState([])

    const [form, setForm] = useState({
        employeeId: "",
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        hourlyRate: "",
        bonusPerOvertimeHour: "",
        deductions: ""
    })

    const [summary, setSummary] = useState(null)
    const [loadingSummary, setLoadingSummary] = useState(false)
    const [generating, setGenerating] = useState(false)

    const [statusFilter, setStatusFilter] = useState("")


    useEffect(() => {
        fetchEmployees()
        fetchSlips()
    }, [])


    useEffect(() => {
        fetchSlips()
    }, [statusFilter])


    // Fetch attendance summary whenever employee/month/year changes
    useEffect(() => {

        const { employeeId, month, year } = form

        if (!employeeId) {
            setSummary(null)
            return
        }

        fetchAttendanceSummary(employeeId, month, year)

    }, [form.employeeId, form.month, form.year])


    const fetchEmployees = async () => {

        try {

            const response = await fetch(
                "http://localhost:9505/user/employees",
                {
                    method: "GET",
                    credentials: "include"
                }
            )

            const data = await response.json()

            if (response.ok) {
                setEmployees(data.employees || [])
            }

        } catch (err) {
            console.error("Error fetching employees:", err)
        }
    }


    const fetchAttendanceSummary = async (employeeId, month, year) => {

        setLoadingSummary(true)

        try {

            const response = await fetch(
                `http://localhost:9505/salary/attendance-summary?employeeId=${employeeId}&month=${month}&year=${year}`,
                {
                    method: "GET",
                    credentials: "include"
                }
            )

            const data = await response.json()

            if (response.ok) {
                setSummary(data.summary)
            } else {
                setSummary(null)
            }

        } catch (err) {

            console.error("Error fetching attendance summary:", err)
            setSummary(null)

        } finally {
            setLoadingSummary(false)
        }
    }


    const fetchSlips = async () => {

        try {

            const query = statusFilter ? `?status=${statusFilter}` : ""

            const response = await fetch(
                `http://localhost:9505/salary${query}`,
                {
                    method: "GET",
                    credentials: "include"
                }
            )

            const data = await response.json()

            if (response.ok) {
                setSlips(data.slips || [])
            }

        } catch (err) {
            console.error("Error fetching salary slips:", err)
        }
    }


    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value })
    }


    // Live estimates shown to admin before generating the slip
    const estimatedRegularPay =
        summary && form.hourlyRate
            ? summary.totalWorkingHours * Number(form.hourlyRate)
            : 0

    const estimatedOvertimeBonus =
        summary && form.bonusPerOvertimeHour
            ? summary.overtimeHours * Number(form.bonusPerOvertimeHour)
            : 0

    const estimatedNet =
        estimatedRegularPay +
        estimatedOvertimeBonus -
        (Number(form.deductions) || 0)


    const handleGenerate = async (e) => {

        e.preventDefault()

        setGenerating(true)

        try {

            const response = await fetch(
                "http://localhost:9505/salary/generate",
                {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(form)
                }
            )

            const data = await response.json()

            if (!response.ok) {

                alert(data.message || "Failed to generate salary slip")
                return
            }

            alert("Salary slip generated successfully!")

            setForm({
                ...form,
                hourlyRate: "",
                bonusPerOvertimeHour: "",
                deductions: ""
            })

            setSummary(null)

            fetchSlips()

        } catch (err) {

            console.error("Error generating slip:", err)
            alert("Something went wrong.")

        } finally {
            setGenerating(false)
        }
    }


    const handleStatusChange = async (id, status) => {

        try {

            const response = await fetch(
                `http://localhost:9505/salary/${id}/status`,
                {
                    method: "PUT",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ status })
                }
            )

            const data = await response.json()

            if (!response.ok) {

                alert(data.message || "Failed to update status")
                return
            }

            fetchSlips()

        } catch (err) {

            console.error("Error updating status:", err)
            alert("Something went wrong.")
        }
    }


    const statusBadge = {
        Pending: "warning",
        Processing: "info",
        Paid: "success"
    }


    return (
    <>
        {/* ================= GENERATE SALARY SLIP ================= */}

        <section id="salary-generate">

            <div className="container">

                <div className="row">

                    <div className="col-lg-12">

                        <div className="salary-card">

                            {/* Header */}

                            <div className="salary-card-header">

                                <div>
                                    <h4>Generate Salary Slip</h4>

                                    <p>
                                        Enter salary information and generate
                                        the employee's salary slip.
                                    </p>
                                </div>

                                <div className="salary-header-icon">
                                    ৳
                                </div>

                            </div>

                            <hr />


                            <form onSubmit={handleGenerate}>

                                {/* Employee / Month / Year */}

                                <div className="row g-3">

                                    <div className="col-md-6">

                                        <label className="form-label">
                                            Employee
                                        </label>

                                        <select
                                            className="form-select"
                                            name="employeeId"
                                            value={form.employeeId}
                                            onChange={handleChange}
                                            required
                                        >

                                            <option value="">
                                                Select employee
                                            </option>

                                            {employees.map((emp) => (

                                                <option
                                                    key={emp._id}
                                                    value={emp._id}
                                                >
                                                    {emp.firstName}{" "}
                                                    {emp.lastName}
                                                    {" — "}
                                                    {emp.department}
                                                </option>

                                            ))}

                                        </select>

                                    </div>


                                    <div className="col-md-3">

                                        <label className="form-label">
                                            Month
                                        </label>

                                        <select
                                            className="form-select"
                                            name="month"
                                            value={form.month}
                                            onChange={handleChange}
                                        >

                                            {Array.from(
                                                { length: 12 },
                                                (_, i) => i + 1
                                            ).map((m) => (

                                                <option
                                                    key={m}
                                                    value={m}
                                                >
                                                    {new Date(
                                                        0,
                                                        m - 1
                                                    ).toLocaleString(
                                                        "default",
                                                        {
                                                            month: "long"
                                                        }
                                                    )}
                                                </option>

                                            ))}

                                        </select>

                                    </div>


                                    <div className="col-md-3">

                                        <label className="form-label">
                                            Year
                                        </label>

                                        <input
                                            type="number"
                                            className="form-control"
                                            name="year"
                                            value={form.year}
                                            onChange={handleChange}
                                        />

                                    </div>


                                    {/* Salary fields */}

                                    <div className="col-md-4">

                                        <label className="form-label">
                                            Hourly Rate
                                        </label>

                                        <div className="salary-input">

                                            <span>৳</span>

                                            <input
                                                type="number"
                                                className="form-control"
                                                name="hourlyRate"
                                                value={form.hourlyRate}
                                                onChange={handleChange}
                                                min="0"
                                                placeholder="0"
                                                required
                                            />

                                        </div>

                                    </div>


                                    <div className="col-md-4">

                                        <label className="form-label">
                                            Bonus / Overtime Hour
                                        </label>

                                        <div className="salary-input">

                                            <span>৳</span>

                                            <input
                                                type="number"
                                                className="form-control"
                                                name="bonusPerOvertimeHour"
                                                value={form.bonusPerOvertimeHour}
                                                onChange={handleChange}
                                                min="0"
                                                placeholder="0"
                                            />

                                        </div>

                                    </div>


                                    <div className="col-md-4">

                                        <label className="form-label">
                                            Deductions
                                        </label>

                                        <div className="salary-input">

                                            <span>৳</span>

                                            <input
                                                type="number"
                                                className="form-control"
                                                name="deductions"
                                                value={form.deductions}
                                                onChange={handleChange}
                                                min="0"
                                                placeholder="0"
                                            />

                                        </div>

                                    </div>

                                </div>


                                {/* ================= ATTENDANCE SUMMARY ================= */}

                                {form.employeeId && (

                                    <div className="attendance-summary">

                                        <div className="summary-header">

                                            <div>
                                                <h5>
                                                    Attendance Summary
                                                </h5>

                                                <p>
                                                    Automatically calculated
                                                    from attendance records.
                                                </p>
                                            </div>

                                            {loadingSummary && (
                                                <span className="summary-loading">
                                                    Loading...
                                                </span>
                                            )}

                                        </div>


                                        {loadingSummary ? (

                                            <div className="summary-loading-box">
                                                Fetching attendance data...
                                            </div>

                                        ) : summary ? (

                                            <div className="row g-2">

                                                <div className="col-md-3">

                                                    <div className="summary-item">

                                                        <span>
                                                            Present Days
                                                        </span>

                                                        <strong>
                                                            {summary.presentDays}
                                                        </strong>

                                                    </div>

                                                </div>


                                                <div className="col-md-3">

                                                    <div className="summary-item">

                                                        <span>
                                                            Total Hours Worked
                                                        </span>

                                                        <strong>
                                                            {summary.totalWorkingHours}
                                                        </strong>

                                                    </div>

                                                </div>


                                                <div className="col-md-3">

                                                    <div className="summary-item">

                                                        <span>
                                                            Overtime Hours
                                                        </span>

                                                        <strong>
                                                            {summary.overtimeHours}
                                                        </strong>

                                                    </div>

                                                </div>


                                                <div className="col-md-3">

                                                    <div className="summary-item net-pay">

                                                        <span>
                                                            Estimated Net Pay
                                                        </span>

                                                        <strong>
                                                            ৳ {estimatedNet}
                                                        </strong>

                                                    </div>

                                                </div>

                                            </div>

                                        ) : (

                                            <div className="summary-empty">
                                                No attendance data available
                                                for this employee and period.
                                            </div>

                                        )}

                                    </div>

                                )}


                                {/* Generate Button */}

                                <div className="salary-form-footer">

                                    <button
                                        type="submit"
                                        className="generate-salary-btn"
                                        disabled={generating}
                                    >

                                        {generating
                                            ? "Generating..."
                                            : "Generate Salary Slip"}

                                    </button>

                                </div>

                            </form>

                        </div>

                    </div>

                </div>

            </div>

        </section>


        {/* ================= MANAGE SALARY SLIPS ================= */}

        <section id="salary-manage">

            <div className="container">

                <div className="row">

                    <div className="col-lg-12">

                        <div className="salary-card">

                            {/* Header */}

                            <div className="salary-card-header">

                                <div>

                                    <h4>
                                        Salary Slips
                                        <span className="slip-count">
                                            {slips.length}
                                        </span>
                                    </h4>

                                    <p>
                                        View and manage generated salary
                                        slips.
                                    </p>

                                </div>


                                <div className="salary-filter">

                                    <label>
                                        Filter
                                    </label>

                                    <select
                                        className="form-select"
                                        value={statusFilter}
                                        onChange={(e) =>
                                            setStatusFilter(
                                                e.target.value
                                            )
                                        }
                                    >

                                        <option value="">
                                            All Statuses
                                        </option>

                                        <option value="Pending">
                                            Pending
                                        </option>

                                        <option value="Processing">
                                            Processing
                                        </option>

                                        <option value="Paid">
                                            Paid
                                        </option>

                                    </select>

                                </div>

                            </div>

                            <hr />


                            {/* Table */}

                            <div className="table-responsive">

                                <table className="table salary-table align-middle">

                                    <thead>

                                        <tr>

                                            <th>#</th>

                                            <th>Employee</th>

                                            <th>Period</th>

                                            <th>Net Pay</th>

                                            <th>Status</th>

                                            <th>Update Status</th>

                                        </tr>

                                    </thead>


                                    <tbody>

                                        {slips.length === 0 ? (

                                            <tr>

                                                <td
                                                    colSpan="6"
                                                    className="salary-empty"
                                                >

                                                    <div className="empty-icon">
                                                        ৳
                                                    </div>

                                                    <strong>
                                                        No salary slips found
                                                    </strong>

                                                    <span>
                                                        Generated salary slips
                                                        will appear here.
                                                    </span>

                                                </td>

                                            </tr>

                                        ) : (

                                            slips.map((slip, index) => (

                                                <tr key={slip._id}>

                                                    <td className="table-number">
                                                        {index + 1}
                                                    </td>


                                                    <td>

                                                        <div className="employee-cell">

                                                            <div className="employee-avatar">
                                                                {slip.employee?.firstName
                                                                    ?.charAt(0)
                                                                    ?.toUpperCase()}
                                                            </div>

                                                            <div>

                                                                <strong>
                                                                    {slip.employee?.firstName}{" "}
                                                                    {slip.employee?.lastName}
                                                                </strong>

                                                                <small>
                                                                    {slip.employee?.department}
                                                                </small>

                                                            </div>

                                                        </div>

                                                    </td>


                                                    <td>

                                                        <span className="period-badge">

                                                            {slip.month}/
                                                            {slip.year}

                                                        </span>

                                                    </td>


                                                    <td>

                                                        <strong className="net-pay-value">

                                                            ৳ {slip.netPay}

                                                        </strong>

                                                    </td>


                                                    <td>

                                                        <span
                                                            className={`salary-status ${
                                                                slip.paymentStatus
                                                                    ?.toLowerCase()
                                                                    .replace(
                                                                        " ",
                                                                        "-"
                                                                    )
                                                            }`}
                                                        >
                                                            {slip.paymentStatus}
                                                        </span>

                                                    </td>


                                                    <td>

                                                        <select
                                                            className="form-select status-select"
                                                            value={
                                                                slip.paymentStatus
                                                            }
                                                            onChange={(e) =>
                                                                handleStatusChange(
                                                                    slip._id,
                                                                    e.target.value
                                                                )
                                                            }
                                                        >

                                                            <option value="Pending">
                                                                Pending
                                                            </option>

                                                            <option value="Processing">
                                                                Processing
                                                            </option>

                                                            <option value="Paid">
                                                                Paid
                                                            </option>

                                                        </select>

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


export default AdminSalary