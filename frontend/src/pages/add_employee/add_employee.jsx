import { useState, useEffect } from 'react'
import '../../index.css'
import './add_employee.css'

const API = import.meta.env.VITE_API_URL || ''

function AddEmployee() {
    const [employees, setEmployees] = useState([])
    const [feedback, setFeedback] = useState(null)
    const [deleteTarget, setDeleteTarget] = useState(null)

    // Form state
    const [form, setForm] = useState({
        name: '', role: '', customRole: '', team: '',
        employeeId: '', email: '', joiningDate: '', department: '',
    })
    const [editingId, setEditingId] = useState(null)

    useEffect(() => { fetchEmployees() }, [])
    useEffect(() => {
        if (feedback) {
            const t = setTimeout(() => setFeedback(null), 4000)
            return () => clearTimeout(t)
        }
    }, [feedback])

    async function fetchEmployees() {
        try {
            const res = await fetch(`${API}/api/employees`)
            setEmployees(await res.json())
        } catch { setFeedback({ type: 'error', message: 'Failed to load employees' }) }
    }

    function updateField(field, value) {
        setForm(prev => ({ ...prev, [field]: value }))
        if (field === 'role' && value !== 'Other') setForm(prev => ({ ...prev, customRole: '' }))
    }

    function resetForm() {
        setForm({ name: '', role: '', customRole: '', team: '', employeeId: '', email: '', joiningDate: '', department: '' })
        setEditingId(null)
    }

    function startEdit(emp) {
        const roleOptions = ['SWE', 'CEO', 'HR Manager', 'Designer', 'QA Engineer', 'Project Manager']
        const isStandardRole = roleOptions.includes(emp.role)
        setForm({
            name: emp.name || '',
            role: isStandardRole ? emp.role : 'Other',
            customRole: isStandardRole ? '' : (emp.role || ''),
            team: emp.team || '',
            employeeId: emp.employeeId || '',
            email: emp.email || '',
            joiningDate: emp.joiningDate ? emp.joiningDate.slice(0, 10) : '',
            department: emp.department || '',
        })
        setEditingId(emp._id)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    async function handleSubmit(e) {
        e.preventDefault()
        const finalRole = form.role === 'Other' ? form.customRole : form.role
        const body = {
            name: form.name, role: finalRole, team: form.team,
            employeeId: form.employeeId, email: form.email,
            joiningDate: form.joiningDate || null, department: form.department,
        }

        try {
            const url = editingId ? `${API}/api/employees/${editingId}` : `${API}/api/employees`
            const method = editingId ? 'PUT' : 'POST'
            const res = await fetch(url, {
                method, headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            })
            const data = await res.json()
            if (!res.ok) { setFeedback({ type: 'error', message: data.error || 'Something went wrong' }); return }
            setFeedback({ type: 'success', message: editingId ? 'Employee updated!' : 'Employee added!' })
            resetForm()
            fetchEmployees()
        } catch { setFeedback({ type: 'error', message: 'Network error' }) }
    }

    async function confirmDelete() {
        if (!deleteTarget) return
        try {
            const res = await fetch(`${API}/api/employees/${deleteTarget._id}`, { method: 'DELETE' })
            if (!res.ok) { setFeedback({ type: 'error', message: 'Delete failed' }) }
            else { setFeedback({ type: 'success', message: 'Employee deleted!' }); fetchEmployees() }
        } catch { setFeedback({ type: 'error', message: 'Network error' }) }
        setDeleteTarget(null)
    }

    return (
        <>
            <section id="add-employee-page">
                <div className="container">
                    <div className="ae-page-title">
                        <h2>Employee Management</h2>
                        <p>Add, edit, and manage your team members</p>
                    </div>

                    {feedback && (
                        <div className={`hm-alert ${feedback.type === 'success' ? 'hm-alert-success' : 'hm-alert-error'}`}>
                            {feedback.message}
                        </div>
                    )}

                    <div className="row g-4">
                        {/* Form */}
                        <div className="col-md-5">
                            <div className="hm-card ae-form-card">
                                <div className="hm-card-title">
                                    {editingId ? 'Edit Employee' : 'Add Employee'}
                                </div>
                                <form className="hm-form" onSubmit={handleSubmit}>
                                    <div className="mb-3">
                                        <label className="form-label">Full Name *</label>
                                        <input type="text" className="form-control" placeholder="e.g. Jane Doe"
                                            value={form.name} onChange={e => updateField('name', e.target.value)} required />
                                    </div>
                                    <div className="row mb-3">
                                        <div className="col-6">
                                            <label className="form-label">Role *</label>
                                            <select className="form-select" value={form.role}
                                                onChange={e => updateField('role', e.target.value)} required>
                                                <option value="">Select role</option>
                                                <option value="SWE">SWE</option>
                                                <option value="CEO">CEO</option>
                                                <option value="HR Manager">HR Manager</option>
                                                <option value="Designer">Designer</option>
                                                <option value="QA Engineer">QA Engineer</option>
                                                <option value="Project Manager">Project Manager</option>
                                                <option value="Other">Other (type below)</option>
                                            </select>
                                        </div>
                                        <div className="col-6">
                                            <label className="form-label">Team</label>
                                            <input type="text" className="form-control" placeholder="e.g. Backend"
                                                value={form.team} onChange={e => updateField('team', e.target.value)} />
                                        </div>
                                    </div>
                                    {form.role === 'Other' && (
                                        <div className="mb-3">
                                            <label className="form-label">Custom Role *</label>
                                            <input type="text" className="form-control" placeholder="e.g. DevOps Engineer"
                                                value={form.customRole} onChange={e => updateField('customRole', e.target.value)} required />
                                        </div>
                                    )}
                                    <div className="row mb-3">
                                        <div className="col-6">
                                            <label className="form-label">Employee ID</label>
                                            <input type="text" className="form-control" placeholder="e.g. EMP-001"
                                                value={form.employeeId} onChange={e => updateField('employeeId', e.target.value)} />
                                        </div>
                                        <div className="col-6">
                                            <label className="form-label">Department</label>
                                            <input type="text" className="form-control" placeholder="e.g. Engineering"
                                                value={form.department} onChange={e => updateField('department', e.target.value)} />
                                        </div>
                                    </div>
                                    <div className="row mb-3">
                                        <div className="col-6">
                                            <label className="form-label">Email</label>
                                            <input type="email" className="form-control" placeholder="jane@company.com"
                                                value={form.email} onChange={e => updateField('email', e.target.value)} />
                                        </div>
                                        <div className="col-6">
                                            <label className="form-label">Joining Date</label>
                                            <input type="date" className="form-control"
                                                value={form.joiningDate} onChange={e => updateField('joiningDate', e.target.value)} />
                                        </div>
                                    </div>
                                    <div className="d-flex gap-2">
                                        <button type="submit" className="hm-btn-primary">
                                            {editingId ? 'Update Employee' : 'Add Employee'}
                                        </button>
                                        {editingId && (
                                            <button type="button" className="hm-btn-secondary" onClick={resetForm}>Cancel</button>
                                        )}
                                    </div>
                                </form>
                            </div>
                        </div>

                        {/* Employee list */}
                        <div className="col-md-7">
                            <div className="hm-card">
                                <div className="hm-card-title">All Employees ({employees.length})</div>
                                {employees.length === 0 ? (
                                    <div className="empty-state">No employees yet - add one!</div>
                                ) : (
                                    <div className="ae-table-wrap">
                                        <table className="ae-table">
                                            <thead>
                                                <tr>
                                                    <th>Name</th>
                                                    <th>Role</th>
                                                    <th>Team</th>
                                                    <th>Department</th>
                                                    <th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {employees.map(emp => (
                                                    <tr key={emp._id}>
                                                        <td>
                                                            <div className="ae-emp-name">{emp.name}</div>
                                                            {emp.email && <div className="ae-emp-email">{emp.email}</div>}
                                                        </td>
                                                        <td><span className="employee-role">{emp.role}</span></td>
                                                        <td>{emp.team || '-'}</td>
                                                        <td>{emp.department || '-'}</td>
                                                        <td>
                                                            <div className="holiday-list-actions">
                                                                <button className="btn-edit" onClick={() => startEdit(emp)}>Edit</button>
                                                                <button className="btn-delete" onClick={() => setDeleteTarget(emp)}>Delete</button>
                                                            </div>
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
                </div>
            </section>

            {deleteTarget && (
                <div className="confirm-overlay">
                    <div className="confirm-box">
                        <h5>Delete Employee?</h5>
                        <p>Remove "<strong>{deleteTarget.name}</strong>" from the system? This can't be undone.</p>
                        <div className="confirm-actions">
                            <button className="hm-btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
                            <button className="hm-btn-primary" onClick={confirmDelete}>Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

export default AddEmployee
