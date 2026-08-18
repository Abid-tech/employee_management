import { useState, useEffect } from 'react'
import { api } from '../lib/api'

function HolidayPage({ user }) {
    const [holidays, setHolidays] = useState([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [editId, setEditId] = useState(null)
    const [form, setForm] = useState({ name: '', date: '', type: 'National', description: '', isRecurring: false })
    const [showCSV, setShowCSV] = useState(false)
    const [csvFile, setCsvFile] = useState(null)
    const [csvResult, setCsvResult] = useState(null)
    const [csvDragging, setCsvDragging] = useState(false)
    const [showConflict, setShowConflict] = useState(false)
    const [conflicts, setConflicts] = useState(null)
    const [conflictDate, setConflictDate] = useState('')
    const [conflictHolidayName, setConflictHolidayName] = useState('')
    const [genYear, setGenYear] = useState(new Date().getFullYear() + 1)

    const isAdmin = user?.role === 'Admin'

    useEffect(() => {
        api.getHolidays().then(setHolidays).catch(() => {}).finally(() => setLoading(false))
    }, [])

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            if (editId) {
                const updated = await api.updateHoliday(editId, form)
                setHolidays(h => h.map(x => x._id === editId ? updated : x))
            } else {
                const conflictData = await api.checkConflicts(form.date)
                if (conflictData.hasConflicts) {
                    setConflicts(conflictData.conflicts)
                    setConflictDate(form.date)
                    setConflictHolidayName(form.name)
                    setShowConflict(true)
                    const created = await api.createHoliday(form)
                    setHolidays(h => [...h, created])
                } else {
                    const created = await api.createHoliday(form)
                    setHolidays(h => [...h, created])
                }
            }
            resetForm()
        } catch (err) {
            alert(err.message)
        }
    }

    const handleDelete = async (id) => {
        if (!confirm('Delete this holiday?')) return
        try {
            await api.deleteHoliday(id)
            setHolidays(h => h.filter(x => x._id !== id))
        } catch (err) {
            alert(err.message)
        }
    }

    const handleEdit = (h) => {
        setEditId(h._id)
        setForm({
            name: h.name,
            date: new Date(h.date).toISOString().split('T')[0],
            type: h.type,
            description: h.description || '',
            isRecurring: h.isRecurring || false,
        })
        setShowForm(true)
    }

    const resetForm = () => {
        setShowForm(false)
        setEditId(null)
        setForm({ name: '', date: '', type: 'National', description: '', isRecurring: false })
    }

    const handleCSVUpload = async () => {
        if (!csvFile) return
        try {
            const formData = new FormData()
            formData.append('file', csvFile)
            const result = await api.importCSV(formData)
            setCsvResult(result)
            const updated = await api.getHolidays()
            setHolidays(updated)
        } catch (err) {
            alert(err.message)
        }
    }

    const handleGenerate = async () => {
        try {
            const result = await api.generateRecurring(genYear)
            alert(result.message)
            const updated = await api.getHolidays()
            setHolidays(updated)
        } catch (err) {
            alert(err.message)
        }
    }

    const handleFlagConflicts = async () => {
        try {
            const body = {
                holidayName: conflictHolidayName,
                date: conflictDate,
                conflicts: {
                    bookingIds: conflicts.bookings.map(b => b._id),
                    leaveIds: conflicts.leaves.map(l => l._id),
                    taskIds: conflicts.tasks.map(t => t._id),
                },
            }
            const result = await api.flagConflicts(body)
            alert(result.message)
            setShowConflict(false)
        } catch (err) {
            alert(err.message)
        }
    }

    if (loading) return <div className="d-flex justify-content-center p-5"><div className="spinner-border"></div></div>

    return (
        <div className="holiday-page">
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h4 style={{ fontWeight: 700, color: 'var(--blue-color)', fontSize: 20 }}>Holiday Management</h4>
                {isAdmin && (
                    <div className="d-flex gap-2">
                        <button className="btn-primary-custom" onClick={() => { resetForm(); setShowForm(true) }}>
                            + Add Holiday
                        </button>
                        <button className="btn-secondary-custom" onClick={() => setShowCSV(true)}>
                            CSV Import
                        </button>
                    </div>
                )}
            </div>

            {isAdmin && (
                <div className="card-widget mb-3">
                    <h6>Auto-Generate Recurring Holidays</h6>
                    <div className="d-flex align-items-center gap-2">
                        <span style={{ fontSize: 13 }}>Generate for year:</span>
                        <input
                            type="number" value={genYear}
                            onChange={e => setGenYear(parseInt(e.target.value))}
                            style={{ width: 80, padding: '4px 8px', border: '1px solid var(--gray-300)', borderRadius: 6, fontSize: 13 }}
                        />
                        <button className="btn-primary-custom" onClick={handleGenerate}>Generate</button>
                    </div>
                </div>
            )}

            <div className="card-widget">
                <h6>All Holidays ({holidays.length})</h6>
                {holidays.length === 0 ? (
                    <div className="empty-state">No holidays found</div>
                ) : (
                    holidays.sort((a, b) => new Date(a.date) - new Date(b.date)).map(h => (
                        <div key={h._id} className="holiday-list-item">
                            <div>
                                <div style={{ fontWeight: 600, fontSize: 14 }}>
                                    {h.name}
                                    {h.isRecurring && <span className="badge-recurring">Recurring</span>}
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>
                                    {new Date(h.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                    {h.description && ` - ${h.description}`}
                                </div>
                            </div>
                            <div className="d-flex align-items-center gap-2">
                                <span className={`holiday-type-badge ${h.type.toLowerCase()}`}>{h.type}</span>
                                {isAdmin && (
                                    <>
                                        <button className="btn-secondary-custom" style={{ padding: '4px 10px' }} onClick={() => handleEdit(h)}>Edit</button>
                                        <button style={{ border: 'none', background: 'var(--red)', color: '#fff', padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }} onClick={() => handleDelete(h._id)}>Del</button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {showForm && (
                <div className="modal-overlay" onClick={resetForm}>
                    <div className="modal-content-custom" onClick={e => e.stopPropagation()}>
                        <div className="modal-header-custom">
                            <h5>{editId ? 'Edit Holiday' : 'Add Holiday'}</h5>
                            <button className="modal-close" onClick={resetForm}>Ã-</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group-custom">
                                <label>Holiday Name</label>
                                <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                            </div>
                            <div className="form-group-custom">
                                <label>Date</label>
                                <input type="date" required value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                            </div>
                            <div className="form-group-custom">
                                <label>Type</label>
                                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                                    <option>National</option>
                                    <option>Religious</option>
                                    <option>Company</option>
                                </select>
                            </div>
                            <div className="form-group-custom">
                                <label>Description</label>
                                <textarea rows="2" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}></textarea>
                            </div>
                            <div className="form-group-custom">
                                <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <input type="checkbox" checked={form.isRecurring} onChange={e => setForm(f => ({ ...f, isRecurring: e.target.checked }))} />
                                    Mark as recurring (auto-generates each year)
                                </label>
                            </div>
                            <div className="d-flex gap-2">
                                <button type="submit" className="btn-primary-custom">{editId ? 'Update' : 'Create'}</button>
                                <button type="button" className="btn-secondary-custom" onClick={resetForm}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showCSV && (
                <div className="modal-overlay" onClick={() => { setShowCSV(false); setCsvResult(null); setCsvFile(null) }}>
                    <div className="modal-content-custom" onClick={e => e.stopPropagation()}>
                        <div className="modal-header-custom">
                            <h5>Import Holidays from CSV</h5>
                            <button className="modal-close" onClick={() => { setShowCSV(false); setCsvResult(null); setCsvFile(null) }}>Ã-</button>
                        </div>

                        <p style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 12 }}>
                            CSV columns: <code>name, date, type, description, isRecurring</code><br/>
                            Types: National, Religious, Company. isRecurring: true/false (optional).
                        </p>

                        <div
                            className={`csv-dropzone ${csvDragging ? 'dragging' : ''}`}
                            onDragOver={e => { e.preventDefault(); setCsvDragging(true) }}
                            onDragLeave={() => setCsvDragging(false)}
                            onDrop={e => { e.preventDefault(); setCsvDragging(false); setCsvFile(e.dataTransfer.files[0]) }}
                            onClick={() => document.getElementById('csvInput').click()}
                        >
                            {csvFile ? (
                                <div>{csvFile.name} ({(csvFile.size / 1024).toFixed(1)} KB)</div>
                            ) : (
                                <div>
                                    Drop CSV file here or click to browse
                                </div>
                            )}
                            <input id="csvInput" type="file" accept=".csv" style={{ display: 'none' }} onChange={e => setCsvFile(e.target.files[0])} />
                        </div>

                        {csvFile && !csvResult && (
                            <button className="btn-primary-custom w-100 mt-3" onClick={handleCSVUpload}>
                                Import {csvFile.name}
                            </button>
                        )}

                        {csvResult && (
                            <div className="mt-3" style={{ fontSize: 13 }}>
                                <div style={{ fontWeight: 600, color: 'var(--green-dark)', marginBottom: 4 }}>
                                    {csvResult.message}
                                </div>
                                {csvResult.errors?.length > 0 && (
                                    <div style={{ marginTop: 8 }}>
                                        <div style={{ fontWeight: 600, color: 'var(--red)' }}>Errors:</div>
                                        {csvResult.errors.map((e, i) => (
                                            <div key={i} style={{ fontSize: 11, color: 'var(--gray-500)' }}>
                                                Row {e.row}: {e.error}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {showConflict && conflicts && (
                <div className="modal-overlay" onClick={() => setShowConflict(false)}>
                    <div className="modal-content-custom" onClick={e => e.stopPropagation()}>
                        <div className="modal-header-custom">
                            <h5>Conflicts Detected</h5>
                            <button className="modal-close" onClick={() => setShowConflict(false)}>Ã-</button>
                        </div>

                        <p style={{ fontSize: 13, color: 'var(--gray-600)', marginBottom: 12 }}>
                            The holiday "<strong>{conflictHolidayName}</strong>" on {new Date(conflictDate).toLocaleDateString()} conflicts with the following:
                        </p>

                        {conflicts.bookings.length > 0 && (
                            <div className="mb-3">
                                <h6 style={{ fontSize: 12, fontWeight: 700, color: '#3b82f6' }}>Meeting Room Bookings</h6>
                                {conflicts.bookings.map(b => (
                                    <div key={b._id} className="conflict-item booking">
                                        Room {b.roomNo} - {b.startTime}-{b.endTime} - Booked by {b.bookedBy}
                                    </div>
                                ))}
                            </div>
                        )}

                        {conflicts.leaves.length > 0 && (
                            <div className="mb-3">
                                <h6 style={{ fontSize: 12, fontWeight: 700, color: 'var(--orange)' }}>Leave Requests</h6>
                                {conflicts.leaves.map(l => (
                                    <div key={l._id} className="conflict-item leave">
                                        {l.user} - {l.leaveType} - {l.status}
                                    </div>
                                ))}
                            </div>
                        )}

                        {conflicts.tasks.length > 0 && (
                            <div className="mb-3">
                                <h6 style={{ fontSize: 12, fontWeight: 700, color: 'var(--red)' }}>Task Deadlines</h6>
                                {conflicts.tasks.map(t => (
                                    <div key={t._id} className="conflict-item task">
                                        {t.title} - Assigned to {t.assignee} - {t.priority}
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="d-flex gap-2 mt-3">
                            <button className="btn-primary-custom" onClick={handleFlagConflicts}>
                                Flag and Notify All
                            </button>
                            <button className="btn-secondary-custom" onClick={() => setShowConflict(false)}>
                                Dismiss
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default HolidayPage
