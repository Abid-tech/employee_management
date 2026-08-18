function AttendanceLineChart({ data = [] }) {
    if (!data.length) return <div className="empty-state">No attendance data</div>

    const W = 320, H = 160, PX = 36, PY = 20
    const chartW = W - PX * 2, chartH = H - PY * 2
    const maxVal = Math.max(...data.map(d => d.totalMinutes || 0), 1)

    const points = data.map((d, i) => ({
        x: PX + (i / Math.max(data.length - 1, 1)) * chartW,
        y: PY + chartH - ((d.totalMinutes || 0) / maxVal) * chartH,
    }))

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    const areaPath = linePath + ` L ${points[points.length - 1].x} ${PY + chartH} L ${points[0].x} ${PY + chartH} Z`

    return (
        <div className="chart-container">
            <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: W }}>
                {[0, 0.25, 0.5, 0.75, 1].map(frac => {
                    const y = PY + chartH - frac * chartH
                    return <line key={frac} x1={PX} y1={y} x2={W - PX} y2={y} stroke="#e5e7eb" strokeWidth="0.5" />
                })}

                <path d={areaPath} fill="rgba(10, 41, 71, 0.08)" />

                <path d={linePath} fill="none" stroke="#0A2947" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

                {points.map((p, i) => (
                    <g key={i}>
                        <circle cx={p.x} cy={p.y} r="4" fill={data[i].checkedIn ? '#0A2947' : '#ef4444'} />
                        <circle cx={p.x} cy={p.y} r="2" fill="#fff" />
                    </g>
                ))}

                {data.map((d, i) => (
                    <text key={i} x={points[i].x} y={H - 2} textAnchor="middle" fontSize="10" fill="#6b7280" fontFamily="Montserrat">
                        {d.day}
                    </text>
                ))}

                <text x={2} y={PY + 4} fontSize="9" fill="#9ca3af" fontFamily="Montserrat">{Math.round(maxVal / 60)}h</text>
                <text x={2} y={PY + chartH + 4} fontSize="9" fill="#9ca3af" fontFamily="Montserrat">0</text>
            </svg>
        </div>
    )
}

export default AttendanceLineChart
