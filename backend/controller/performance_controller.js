const service = require('../service/performance_service')
const staffing = require('../service/staffing_service')

// Module 4 — HTTP only. Every calculation lives in performance_service.

const asyncRoute = (handler) => (req, res, next) =>
    Promise.resolve(handler(req, res, next)).catch(next)

// Query strings arrive as strings or, for repeated keys, as arrays.
const listParam = (value) => {
    if (!value) return []
    if (Array.isArray(value)) return value.flatMap(v => String(v).split(','))
    return String(value).split(',')
}

const optionsFrom = (query) => ({
    from: query.from || undefined,
    to: query.to || undefined,
    department: query.department || undefined
})

const getOverview = asyncRoute(async (req, res) => {
    res.json(await service.overview(optionsFrom(req.query)))
})

const getEmployee = asyncRoute(async (req, res) => {
    const found = await service.employeeDetail(req.params.id, optionsFrom(req.query))
    if (!found) return res.status(404).json({ error: 'That employee is not on the performance roster.' })

    res.json(found)
})

const reportOptions = (query) => ({
    ...optionsFrom(query),
    columns: listParam(query.columns).map(c => c.trim()).filter(Boolean),
    minScore: query.minScore,
    maxScore: query.maxScore,
    status: query.status,
    momentum: query.momentum,
    sortBy: query.sortBy,
    sortDir: query.sortDir,
    limit: query.limit
})

const getReport = asyncRoute(async (req, res) => {
    res.json(await service.report(reportOptions(req.query)))
})

// A spreadsheet is still how most of this gets shared.
const escapeCell = (value) => {
    const text = value === null || value === undefined ? '' : String(value)
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

const getReportCsv = asyncRoute(async (req, res) => {
    const built = await service.report(reportOptions(req.query))
    const labelFor = (key) => built.availableColumns.find(c => c.key === key)?.label || key

    const lines = [
        built.columns.map(labelFor).map(escapeCell).join(','),
        ...built.rows.map(row => built.columns.map(key => escapeCell(row[key])).join(','))
    ]

    const stamp = new Date().toISOString().slice(0, 10)
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="performance-report-${stamp}.csv"`)
    res.send(lines.join('\n'))
})

// The scoring rules themselves.
const getRules = asyncRoute(async (req, res) => {
    res.json({
        pillars: service.PILLARS,
        priorityWeight: service.PRIORITY_WEIGHT,
        points: service.POINTS,
        grades: service.GRADES,
        columns: service.REPORT_COLUMNS,
        scoreMax: service.SCORE_MAX,
        scoreSource: service.SCORE_SOURCE
    })
})

// --- Rebalancing -------------------------------------------------------------

// Turns the overload findings into specific, costed moves.
const getRebalance = asyncRoute(async (req, res) => {
    res.json(await staffing.rebalance())
})

module.exports = { getOverview, getEmployee, getReport, getReportCsv, getRules, getRebalance }
