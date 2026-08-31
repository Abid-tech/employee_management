import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { feedbackApi } from '../../lib/feedback_api'
import { useActor } from './feedback_context'
import { SOURCE } from './feedback_format'
import { Icon, Stars } from './feedback_ui'

// Writing a review.

const TRAIT_WORDS = [
    'great', 'good', 'excellent', 'amazing', 'awesome', 'brilliant', 'outstanding',
    'smart', 'clever', 'talented', 'gifted', 'rockstar', 'superstar', 'ninja',
    'hard-working', 'hardworking', 'dedicated', 'passionate', 'motivated', 'driven',
    'team player', 'nice', 'friendly', 'pleasant', 'positive attitude', 'attitude',
    'proactive', 'reliable', 'solid', 'strong performer', 'natural', 'always',
    'never', 'very good', 'well done', 'keep it up', 'nothing to add'
]

const SPECIFIC_MARKERS = [
    /\b\d+\b/,
    /\b(when|after|during|because|so that|which meant|led to|resulted in)\b/i,
    /\b(for example|e\.g\.|specifically|in particular)\b/i,
    /\b(sprint|release|migration|outage|incident|deadline|demo|handover|review|ticket|bug)\b/i
]

const checkLanguage = (text) => {
    const body = (text || '').trim()
    if (!body) return null

    const lower = body.toLowerCase()
    const traits = TRAIT_WORDS.filter(w => lower.includes(w))
    const specifics = SPECIFIC_MARKERS.filter(rx => rx.test(body)).length
    const words = body.split(/\s+/).filter(Boolean).length

    if (words < 8) return { tone: 'warn', text: 'Too short to be useful to the person reading it.' }
    if (specifics === 0 && traits.length > 0) {
        return {
            tone: 'warn',
            text: `Describes the person rather than the work — “${traits[0]}”. Add what happened, and when.`
        }
    }
    if (specifics === 0) return { tone: 'warn', text: 'No example, date or number to anchor this.' }
    return { tone: 'good', text: 'Points at something that happened — good.' }
}

export default function FeedbackWrite() {
    const navigate = useNavigate()
    const [params] = useSearchParams()
    const { actor, actorId, meta } = useActor()

    const [form, setForm] = useState({
        employee: params.get('employee') || '',
        source: 'manager',
        clientName: '',
        objective: params.get('objective') || '',
        cycle: '',
        strengths: '',
        improvements: ''
    })
    const [ratings, setRatings] = useState({})
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [done, setDone] = useState('')

    const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }))

    // Both of these used to be effects that wrote back into form state the moment something else.
    const cycle = form.cycle || meta?.currentCycle || ''

    // A self-assessment is always about the person writing it.
    const employeeId = form.source === 'self' ? (actorId || '') : form.employee

    const competencies = meta?.competencies || []
    const rated = competencies.filter(c => ratings[c.key])
    const overall = rated.length
        ? Math.round((rated.reduce((sum, c) => sum + ratings[c.key], 0) / rated.length) * 100) / 100
        : null

    const strengthCheck = useMemo(() => checkLanguage(form.strengths), [form.strengths])
    const improveCheck = useMemo(() => checkLanguage(form.improvements), [form.improvements])

    const submit = async (status) => {
        setError('')

        if (!actorId) return setError('Choose who you are in the Acting as box first.')
        if (!employeeId) return setError('Choose who the feedback is about.')
        if (form.source === 'client' && !form.clientName.trim()) {
            return setError('Client feedback needs the client’s name.')
        }
        if (rated.length === 0) return setError('Rate at least one competency.')

        setSaving(true)
        try {
            const review = await feedbackApi.createReview({
                actorId,
                employee: employeeId,
                source: form.source,
                reviewer: form.source === 'client' ? null : actorId,
                reviewerName: form.source === 'client' ? form.clientName : actor?.name,
                clientName: form.source === 'client' ? form.clientName : '',
                objective: form.objective || null,
                cycle,
                strengths: form.strengths,
                improvements: form.improvements,
                ratings: rated.map(c => ({ competency: c.key, score: ratings[c.key] })),
                status
            })

            if (status === 'submitted') {
                navigate(`/feedback/employee/${review.review.employeeId}`)
            } else {
                setDone('Saved as a draft. It is not visible to the employee until you submit it.')
                setRatings({})
                setForm(prev => ({ ...prev, strengths: '', improvements: '' }))
            }
        } catch (err) {
            setError(err.message)
        } finally {
            setSaving(false)
        }
    }

    if (!meta) {
        return <div className="fb-card s12"><div className="fb-skel" style={{ height: 320 }} /></div>
    }

    const subject = meta.employees.find(e => e.id === employeeId)

    return (
        <div className="fb-grid">
            {error && <div className="fb-err s12">{error}</div>}
            {done && <div className="fb-ok s12">{done}</div>}

            <section className="fb-card s12">
                <div className="fb-lbl">
                    <span>New feedback</span>
                    {overall !== null && <span className="fb-pill navy">Overall {overall} / 5</span>}
                </div>

                <div className="fb-fields" style={{ marginTop: 14 }}>
                    <div className="fb-field">
                        <label htmlFor="w-source">Who is speaking</label>
                        <select id="w-source" value={form.source} onChange={e => set('source', e.target.value)}>
                            {Object.entries(SOURCE).map(([key, meta]) => (
                                <option key={key} value={key}>{meta.label} — {meta.blurb}</option>
                            ))}
                        </select>
                    </div>

                    <div className="fb-field">
                        <label htmlFor="w-employee">About</label>
                        <select id="w-employee" value={employeeId}
                            disabled={form.source === 'self'}
                            onChange={e => set('employee', e.target.value)}>
                            <option value="">Choose a person…</option>
                            {meta.employees.map(person => (
                                <option key={person.id} value={person.id}>{person.name} · {person.department}</option>
                            ))}
                        </select>
                        {form.source === 'self' && <span className="fb-hint">A self-assessment is always about you.</span>}
                    </div>

                    {form.source === 'client' && (
                        <div className="fb-field">
                            <label htmlFor="w-client">Client name</label>
                            <input id="w-client" value={form.clientName} placeholder="Northwind Retail"
                                onChange={e => set('clientName', e.target.value)} />
                        </div>
                    )}

                    <div className="fb-field">
                        <label htmlFor="w-objective">About which project</label>
                        <select id="w-objective" value={form.objective} onChange={e => set('objective', e.target.value)}>
                            <option value="">Not about a specific project</option>
                            {meta.objectives.map(objective => (
                                <option key={objective.id} value={objective.id}>{objective.title}</option>
                            ))}
                        </select>
                    </div>

                    <div className="fb-field">
                        <label htmlFor="w-cycle">Cycle</label>
                        <input id="w-cycle" value={cycle} onChange={e => set('cycle', e.target.value)} />
                    </div>
                </div>
            </section>

            {/* Ratings. */}
            <section className="fb-card s6">
                <div className="fb-lbl">
                    <span>Ratings</span>
                    <span className="fb-pill plain">{rated.length} of {competencies.length}</span>
                </div>
                <p className="fb-sub">
                    Skip any axis you have no evidence for — a guess is worse than a gap.
                </p>

                <div style={{ marginTop: 8 }}>
                    {competencies.map(competency => (
                        <div className="fb-rate" key={competency.key}>
                            <span className="n">
                                {competency.label}
                                <small>{competency.blurb}</small>
                            </span>
                            <Stars value={ratings[competency.key] || 0}
                                onChange={score => setRatings(prev => ({ ...prev, [competency.key]: score }))} />
                            <span style={{ fontFamily: 'var(--f-mono)', fontSize: 12, color: 'var(--f-muted)', minWidth: 18, textAlign: 'right' }}>
                                {ratings[competency.key] || '—'}
                            </span>
                        </div>
                    ))}
                </div>
            </section>

            {/* Comments. */}
            <section className="fb-card s6">
                <div className="fb-lbl"><span>In writing</span></div>
                <p className="fb-sub">
                    Checked as you type against the same rule the calibration page uses afterwards.
                </p>

                <div className="fb-form">
                    <div className="fb-field">
                        <label htmlFor="w-strengths">What went well</label>
                        <textarea id="w-strengths" value={form.strengths}
                            placeholder="Took the portal migration from spec to release without it slipping…"
                            onChange={e => set('strengths', e.target.value)} />
                        {strengthCheck && (
                            <span className={`fb-hint ${strengthCheck.tone}`}>
                                {strengthCheck.tone === 'good' ? '✓ ' : '! '}{strengthCheck.text}
                            </span>
                        )}
                    </div>

                    <div className="fb-field">
                        <label htmlFor="w-improve">What to improve</label>
                        <textarea id="w-improve" value={form.improvements}
                            placeholder="Two of the last four items ran past their date without the date being moved…"
                            onChange={e => set('improvements', e.target.value)} />
                        {improveCheck && (
                            <span className={`fb-hint ${improveCheck.tone}`}>
                                {improveCheck.tone === 'good' ? '✓ ' : '! '}{improveCheck.text}
                            </span>
                        )}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 9, marginTop: 14, flexWrap: 'wrap' }}>
                    <button className="fb-btn" disabled={saving || !actorId} onClick={() => submit('submitted')}>
                        <Icon name="check" size={14} />
                        {saving ? 'Saving…' : `Submit${subject ? ` to ${subject.name.split(' ')[0]}` : ''}`}
                    </button>
                    <button className="fb-btn ghost" disabled={saving || !actorId} onClick={() => submit('draft')}>
                        Save as draft
                    </button>
                </div>
                <p className="fb-sub" style={{ marginTop: 8 }}>
                    Submitting makes it visible to the employee and counts towards calibration.
                </p>
            </section>
        </div>
    )
}
