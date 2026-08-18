function AttendancePieChart({ rate = 0, label = 'On-time' }) {
    const R = 50, CX = 70, CY = 70, SW = 12
    const circumference = 2 * Math.PI * R
    const offset = circumference - (rate / 100) * circumference

    return (
        <div className="chart-container">
            <svg viewBox="0 0 140 140" width="140" height="140">
                <circle cx={CX} cy={CY} r={R} fill="none" stroke="#e5e7eb" strokeWidth={SW} />
                <circle
                    cx={CX} cy={CY} r={R}
                    fill="none"
                    stroke={rate >= 80 ? '#22c55e' : rate >= 50 ? '#f59e0b' : '#ef4444'}
                    strokeWidth={SW}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    transform={`rotate(-90 ${CX} ${CY})`}
                    style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                />
                <text x={CX} y={CY - 4} textAnchor="middle" fontSize="20" fontWeight="700" fill="#0A2947" fontFamily="Montserrat">
                    {rate}%
                </text>
                <text x={CX} y={CY + 14} textAnchor="middle" fontSize="10" fill="#6b7280" fontFamily="Montserrat">
                    {label}
                </text>
            </svg>
        </div>
    )
}

export default AttendancePieChart
