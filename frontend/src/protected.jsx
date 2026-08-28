import { Navigate } from "react-router-dom"

function ProtectedRoute({
    user,
    loading,
    children,
    requiredRole
}) {

    // Still checking authentication
    if (loading) {
        return <div>Loading...</div>
    }


    // Not logged in
    if (!user) {
        return <Navigate to="/login" replace />
    }


    // Logged in but wrong role
    if (requiredRole && user.role !== requiredRole) {
        return <Navigate to="/" replace />
    }


    // Everything is okay
    return children
}

export default ProtectedRoute