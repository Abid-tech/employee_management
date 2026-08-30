const AuditEvent = require('../model/audit_event')

// Writing to the trust log must never be the reason a request fails. If the log
// write breaks, the action the user asked for still happened and still matters —
// the failure is recorded on the server and the response goes out unchanged.
const record = async (event) => {
    try {
        return await AuditEvent.create(event)
    } catch (error) {
        console.error('[audit] could not record event:', error.message)
        return null
    }
}

const byAgent = (action, { subjectKind, subjectId, summary, detail, engine } = {}) =>
    record({ action, actorKind: 'agent', actorName: 'Feedback agent', subjectKind, subjectId, summary, detail, engine })

const byHuman = (action, actor, { subjectKind, subjectId, summary, detail } = {}) =>
    record({
        action,
        actorKind: 'human',
        actorId: actor?.id || actor?._id || null,
        actorName: actor?.name || 'Someone',
        subjectKind, subjectId, summary, detail
    })

const list = async ({ limit = 60, subjectId } = {}) => {
    const filter = subjectId ? { subjectId } : {}
    const events = await AuditEvent.find(filter).sort({ createdAt: -1 }).limit(Number(limit) || 60)

    return events.map(e => ({
        id: String(e._id),
        action: e.action,
        actorKind: e.actorKind,
        actorName: e.actorName,
        subjectKind: e.subjectKind,
        subjectId: e.subjectId ? String(e.subjectId) : null,
        summary: e.summary,
        detail: e.detail,
        engine: e.engine,
        at: e.createdAt
    }))
}

module.exports = { record, byAgent, byHuman, list }
