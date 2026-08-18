import { useState } from 'react'
import { api } from '../lib/api'

function LoginPage({ onLoginSuccess }) {
    const [isRegister, setIsRegister] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    // Login state
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')

    // Registration state
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        department: 'IT',
        role: 'Employee',
        password: '',
    })

    const handleLoginSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)
        try {
            const data = await api.login({ email, password })
            if (data?.success && data?.user) {
                onLoginSuccess(data.user)
            } else {
                setError(data?.message || 'Login failed')
            }
        } catch (err) {
            setError(err.message || 'Invalid credentials or server error')
        } finally {
            setLoading(false)
        }
    }

    const handleRegisterSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)
        try {
            const data = await api.register(formData)
            if (data?.success && data?.user) {
                onLoginSuccess(data.user)
            } else {
                setError(data?.message || 'Registration failed')
            }
        } catch (err) {
            setError(err.message || 'Failed to create account')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="d-flex align-items-center justify-content-center min-vh-100 px-3 py-4" style={{ background: 'var(--gray-50)' }}>
            <div className="card-widget" style={{ maxWidth: isRegister ? '500px' : '420px', width: '100%', padding: '32px', transition: 'all 0.3s ease' }}>
                <div className="text-center mb-4">
                    <h4 style={{ color: 'var(--blue-color)', fontWeight: 700, margin: 0 }}>Employee Management</h4>
                    <p className="text-muted-custom mt-1" style={{ fontSize: '13px' }}>
                        {isRegister ? 'Create a new account' : 'Sign in to your account'}
                    </p>
                </div>

                {error && (
                    <div className="alert alert-danger py-2 px-3 mb-3" style={{ fontSize: '13px', borderRadius: 'var(--radius-sm)' }}>
                        {error}
                    </div>
                )}

                {isRegister ? (
                    <form onSubmit={handleRegisterSubmit}>
                        <div className="row g-2 mb-2">
                            <div className="col-6 form-group-custom">
                                <label>First Name</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="John"
                                    value={formData.firstName}
                                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                />
                            </div>
                            <div className="col-6 form-group-custom">
                                <label>Last Name</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Doe"
                                    value={formData.lastName}
                                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="form-group-custom mb-2">
                            <label>Email Address</label>
                            <input
                                type="email"
                                required
                                placeholder="name@company.com"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>

                        <div className="form-group-custom mb-2">
                            <label>Phone Number</label>
                            <input
                                type="tel"
                                required
                                placeholder="+1 (555) 000-0000"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>

                        <div className="row g-2 mb-2">
                            <div className="col-6 form-group-custom">
                                <label>Department</label>
                                <select
                                    value={formData.department}
                                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                >
                                    <option value="IT">IT</option>
                                    <option value="Human Resources">Human Resources</option>
                                    <option value="Finance">Finance</option>
                                    <option value="Marketing">Marketing</option>
                                    <option value="Administration">Administration</option>
                                </select>
                            </div>
                            <div className="col-6 form-group-custom">
                                <label>Role</label>
                                <select
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                >
                                    <option value="Employee">Employee</option>
                                    <option value="Admin">Admin</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-group-custom mb-4">
                            <label>Password (min 6 chars)</label>
                            <input
                                type="password"
                                required
                                minLength={6}
                                placeholder="******"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary-custom w-100 mb-3"
                            style={{ padding: '10px 0', fontSize: '14px' }}
                        >
                            {loading ? 'Creating Account...' : 'Create Account'}
                        </button>

                        <div className="text-center" style={{ fontSize: '13px' }}>
                            <span className="text-muted-custom">Already have an account? </span>
                            <button
                                type="button"
                                onClick={() => { setIsRegister(false); setError('') }}
                                style={{ background: 'none', border: 'none', color: 'var(--blue-color)', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                            >
                                Sign In
                            </button>
                        </div>
                    </form>
                ) : (
                    <form onSubmit={handleLoginSubmit}>
                        <div className="form-group-custom mb-3">
                            <label>Email Address</label>
                            <input
                                type="email"
                                required
                                placeholder="name@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        <div className="form-group-custom mb-4">
                            <label>Password</label>
                            <input
                                type="password"
                                required
                                placeholder="******"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary-custom w-100 mb-3"
                            style={{ padding: '10px 0', fontSize: '14px' }}
                        >
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>

                        <div className="text-center" style={{ fontSize: '13px' }}>
                            <span className="text-muted-custom">Don't have an account? </span>
                            <button
                                type="button"
                                onClick={() => { setIsRegister(true); setError('') }}
                                style={{ background: 'none', border: 'none', color: 'var(--blue-color)', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                            >
                                Sign Up
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    )
}

export default LoginPage
