function TaskDeliveryChart({ onTime = 0, late = 0 }) {
    const total = onTime + late
    if (total === 0) {
        return <div className="empty-state" style={{ fontSize: '12px' }}>No completed tasks</div>
    }

    const onTimeRate = Math.round((onTime / total) * 100)
    const lateRate = 100 - onTimeRate

    const barW = 200, barH = 24, rx = 12

    return (
        <div className="chart-container" style={{ flexDirection: 'column', gap: 8 }}>
            <svg viewBox={`0 0 ${barW} ${barH}`} width="100%" style={{ maxWidth: barW }}>
                <rect x="0" y="0" width={barW} height={barH} rx={rx} fill="#fee2e2" />
                <rect x="0" y="0" width={(onTimeRate / 100) * barW} height={barH} rx={rx} fill="#22c55e"
                    style={{ transition: 'width 0.6s ease' }} />
            </svg>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 16, fontSize: 11, fontWeight: 600 }}>
                <span style={{ color: '#22c55e' }}>On-time: {onTime} ({onTimeRate}%)</span>
                <span style={{ color: '#ef4444' }}>Late: {late} ({lateRate}%)</span>
            </div>
        </div>
    )
}

export default TaskDeliveryChart
