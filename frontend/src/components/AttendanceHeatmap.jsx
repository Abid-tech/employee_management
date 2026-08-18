function AttendanceHeatmap({ heatmap = {} }) {
    const days = []
    const today = new Date()
    for (let i = 364; i >= 0; i--) {
        const d = new Date(today)
        d.setDate(d.getDate() - i)
        const key = d.toISOString().split('T')[0]
        days.push({ date: key, count: heatmap[key] || 0, dayOfWeek: d.getDay() })
    }

    const maxCount = Math.max(...days.map(d => d.count), 1)

    const getColor = (count) => {
        if (count === 0) return '#e5e7eb'
        const intensity = count / maxCount
        if (intensity < 0.25) return '#bbf7d0'
        if (intensity < 0.5) return '#86efac'
        if (intensity < 0.75) return '#22c55e'
        return '#16a34a'
    }

    const weeks = []
    let currentWeek = new Array(7).fill(null)
    for (const day of days) {
        currentWeek[day.dayOfWeek] = day
        if (day.dayOfWeek === 6) {
            weeks.push(currentWeek)
            currentWeek = new Array(7).fill(null)
        }
    }
    if (currentWeek.some(d => d !== null)) weeks.push(currentWeek)

    return (
        <div style={{ overflowX: 'auto', padding: '4px 0' }}>
            <div style={{ display: 'flex', gap: 2, minWidth: weeks.length * 16 }}>
                {weeks.map((week, wi) => (
                    <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {week.map((day, di) => (
                            <div
                                key={di}
                                className="heatmap-cell"
                                style={{ background: day ? getColor(day.count) : 'transparent' }}
                                title={day ? `${day.date}: ${day.count} check-ins` : ''}
                            />
                        ))}
                    </div>
                ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, fontSize: 10, color: '#6b7280' }}>
                <span>Less</span>
                {['#e5e7eb', '#bbf7d0', '#86efac', '#22c55e', '#16a34a'].map(c => (
                    <div key={c} style={{ width: 12, height: 12, borderRadius: 2, background: c }} />
                ))}
                <span>More</span>
            </div>
        </div>
    )
}

export default AttendanceHeatmap
