import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { feedbackApi } from '../../lib/feedback_api'
import { Avatar, Icon } from './feedback_ui'

// Where the record and the humans disagree.
//
// The app holds two independent opinions of every person: a score derived from
// finished work, and a rating written by colleagues. Every competitor owns one
// of those and is structurally unable to see the other, so nobody ships the
// comparison — which is a shame, because the comparison is the useful part.
//
// The page is built around one chart. A slope graph is the correct form here and
// almost the only correct form: the question is "do these two instruments put
// the same people in the same order", and a slope graph answers it at a glance —
// flat lines agree, steep lines do not, and the direction of the slope says
// which instrument is the generous one. A scatter plot would answer the same
// question worse, and a table would not answer it at all.

const DIRECTION = {
    rated_above: {
        label: 'Rated above their record',
        tone: 'gold',
        blurb: 'Colleagues place them higher than the work record does.'
    },
    rated_below: {
        label: 'Rated below their record',
        tone: 'rose',
        blurb: 'The work record places them higher than colleagues do.'
    },
    agree: {
        label: 'Both agree',
        tone: 'green',
        blurb: 'The two instruments put them in the same part of the company.'
    }
}

// --- The slope graph ---------------------------------------------------------

// Two axes, one line per person, drawn between where each instrument places
// them. Percentiles rather than raw values, because a score out of 100 and a
// rating out of 5 share no scale — the only fair comparison is positional.
function SlopeGraph({ rows, selected, onSelect }) {
    const height = 460
    const padY = 34
    const left = 128
    const right = 512
    const width = 640

    const y = (percentile) => padY + (100 - percentile) * ((height - padY * 2) / 100)

    // Labels are pushed apart where people land on the same percentile, so two
    // names never draw on top of each other and become unreadable.
    const stack = (side) => {
        const placed = []
        return rows
            .slice()
            .sort((a, b) => b[side] - a[side])
            .map(row => {
                let at = y(row[side])
                const last = placed[placed.length - 1]
                if (last !== undefined && at - last < 15) at = last + 15
                placed.push(at)
                return { id: row.id, at }
            })
            .reduce((map, item) => map.set(item.id, item.at), new Map())
    }

    const leftAt = stack('recordPercentile')
    const rightAt = stack('humanPercentile')

    return (
        <div className="fb-slopewrap">
            <svg className="fb-slope" viewBox={`0 0 ${width} ${height}`} role="img"
                aria-label="Where the work record and colleague ratings place each person">
                <text x={left} y={16} textAnchor="end" className="sl-axis">The record</text>
                <text x={right} y={16} textAnchor="start" className="sl-axis">The reviewers</text>

                <line x1={left} y1={padY - 8} x2={left} y2={height - padY + 8} className="sl-rail" />
                <line x1={right} y1={padY - 8} x2={right} y2={height - padY + 8} className="sl-rail" />

                <text x={left - 8} y={padY - 12} textAnchor="end" className="sl-tick">top of the company</text>
                <text x={left - 8} y={height - padY + 20} textAnchor="end" className="sl-tick">bottom</text>

                {rows.map(row => {
                    const y1 = leftAt.get(row.id)
                    const y2 = rightAt.get(row.id)
                    const dim = selected && selected !== row.id
                    const tone = DIRECTION[row.direction].tone

                    return (
                        <g key={row.id} className={`sl-g ${tone} ${dim ? 'dim' : ''} ${selected === row.id ? 'on' : ''}`}
                            onClick={() => onSelect(selected === row.id ? '' : row.id)}
                            tabIndex={0} role="button"
                            onKeyDown={e => {
                                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(selected === row.id ? '' : row.id) }
                            }}>
                            {/* A wide invisible line under the visible one, so a
                                1.8px stroke is not a 1.8px click target. */}
                            <line x1={left} y1={y1} x2={right} y2={y2} className="sl-hit" />
                            <line x1={left} y1={y1} x2={right} y2={y2} className="sl-line" />
                            <circle cx={left} cy={y1} r="4" className="sl-dot" />
                            <circle cx={right} cy={y2} r="4" className="sl-dot" />

                            <text x={left - 10} y={y1 + 4} textAnchor="end" className="sl-name">
                                {row.name}
                            </text>
                            <text x={right + 10} y={y2 + 4} textAnchor="start" className="sl-name">
                                {row.name}
                            </text>
                        </g>
                    )
                })}
            </svg>

            <div className="fb-slopekey">
                {Object.entries(DIRECTION).map(([key, meta]) => (
                    <span className="k" key={key}><i className={meta.tone} /> {meta.label}</span>
                ))}
            </div>
        </div>
    )
}

// --- One person's disagreement ----------------------------------------------

function GapCard({ row, scoreMax, open, onToggle }) {
    const meta = DIRECTION[row.direction]

    return (
        <div className={`fb-gap ${meta.tone} ${open ? 'on' : ''}`}>
            <div className="g-top">
                <Avatar person={row} size="md" />
                <span className="g-who">
                    <span className="g-name">{row.name}</span>
                    <span className="g-role">{row.jobTitle} · {row.department}</span>
                </span>
                <span className={`fb-pill ${meta.tone}`}>{meta.label}</span>
            </div>

            {/* The two readings, side by side, with the percentile underneath —
                the raw figures are what people recognise, the percentiles are
                what the comparison is actually made of. */}
            <div className="g-pair">
                <div className="g-side">
                    <span className="g-n">{row.score}<small>/{scoreMax}</small></span>
                    <span className="g-l">The record</span>
                    <span className="g-p">{Math.round(row.recordPercentile)}th percentile</span>
                </div>

                <div className="g-arrow">
                    <span className={`g-gap ${row.gap >= 0 ? 'up' : 'down'}`}>
                        {row.gap >= 0 ? '+' : ''}{Math.round(row.gap)}
                    </span>
                    <span className="g-gl">percentile points apart</span>
                </div>

                <div className="g-side right">
                    <span className="g-n">{row.rating}<small>/5</small></span>
                    <span className="g-l">The reviewers</span>
                    <span className="g-p">{Math.round(row.humanPercentile)}th percentile</span>
                </div>
            </div>

            <button className="g-why" onClick={onToggle} aria-expanded={open}>
                {open ? 'Hide what is behind it' : 'What is behind it'}
            </button>

            {open && (
                <div className="g-detail">
                    {row.reasons.map((reason, i) => (
                        <div className="g-reason" key={i}>
                            <span className="r-h">{reason.headline}</span>
                            <span className="r-d">{reason.detail}</span>
                        </div>
                    ))}

                    <div className="fb-lbl" style={{ marginTop: 14 }}><span>How they were rated, competency by competency</span></div>
                    <div className="g-comps">
                        {row.competencies.map(comp => (
                            <div className="g-comp" key={comp.key}>
                                <span className="c-l">{comp.label}</span>
                                <span className="c-t"><i style={{ width: `${(comp.score / 5) * 100}%` }} /></span>
                                <span className="c-v">{comp.score}</span>
                            </div>
                        ))}
                    </div>

                    <Link className="fb-btn ghost sm" to={`/feedback/employee/${row.id}`} style={{ marginTop: 12 }}>
                        Open their feedback record <Icon name="right" size={12} />
                    </Link>
                </div>
            )}
        </div>
    )
}

// --- The page ----------------------------------------------------------------

export default function FeedbackReconciliation() {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [selected, setSelected] = useState('')
    const [openCard, setOpenCard] = useState('')

    const load = useCallback(async () => {
        setLoading(true)
        try {
            setData(await feedbackApi.reconciliation())
            setError('')
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [])

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { load() }, [load])

    if (loading && !data) {
        return <div className="fb-card s12"><div className="fb-skel" style={{ height: 420 }} /></div>
    }
    if (error && !data) {
        return <><div className="fb-err">{error}</div><button className="fb-btn" onClick={load}>Try again</button></>
    }

    const {
        rows, disagreements, agreement, agreementReading, covered, skipped,
        minReviews, gapThreshold, scoreMax, ratedAbove, ratedBelow, agreed
    } = data

    // Spearman runs −1 to +1; the bar is drawn on that full domain so a negative
    // correlation would be visibly on the wrong side of the line rather than
    // just a smaller bar.
    const agreementPercent = agreement === null ? 50 : ((agreement + 1) / 2) * 100

    return (
        <div className="fb-grid">
            {error && <div className="fb-err s12">{error}</div>}

            {/* ---- The headline finding ---- */}
            <section className="fb-hero">
                <span className="h-eyebrow">
                    The work record against the people who work with them · {covered} people
                    {skipped > 0 ? ` · ${skipped} left out for having fewer than ${minReviews} reviews` : ''}
                </span>

                <div className="h-main">
                    <div>
                        <div className="h-num">{agreement === null ? '—' : agreement}</div>
                        <div className="h-range">rank correlation between the two instruments</div>
                    </div>

                    <div className="h-stats">
                        <div className="h-stat">
                            <span className="s-n">{agreed}</span>
                            <span className="s-l">Both instruments agree</span>
                        </div>
                        <div className="h-stat">
                            <span className="s-n">{ratedAbove}</span>
                            <span className="s-l">Rated above their record</span>
                        </div>
                        <div className="h-stat">
                            <span className="s-n">{ratedBelow}</span>
                            <span className="s-l">Rated below their record</span>
                        </div>
                    </div>
                </div>

                <div className="h-scale">
                    <span className="sc-track">
                        <i className="sc-fill" style={{ width: `${agreementPercent}%` }} />
                        <i className="sc-zero" />
                    </span>
                    <span className="sc-ends">
                        <span>−1 · opposite orders</span>
                        <span>0 · unrelated</span>
                        <span>+1 · identical order</span>
                    </span>
                </div>

                <div className="h-foot">{agreementReading}</div>
            </section>

            {/* ---- The chart ---- */}
            <section className="fb-card s7">
                <div className="fb-lbl">
                    <span>Where each instrument places the same person</span>
                    <Icon name="scale" size={14} />
                </div>
                <p className="fb-sub">
                    A line runs from where the derived score puts somebody to where their colleagues put them.
                    Flat lines are people both agree about. Click a line to hold it.
                    Positions are <b>percentiles within this company</b>, never the raw figures — a score out of 100
                    and a rating out of 5 have no shared scale, and rescaling one onto the other would invent
                    disagreements out of the shape of the two distributions.
                </p>

                <SlopeGraph rows={rows} selected={selected} onSelect={setSelected} />
            </section>

            {/* ---- Why this is possible here ---- */}
            <section className="fb-card s5">
                <div className="fb-lbl"><span>Why no other tool shows you this</span></div>
                <p className="fb-sub">
                    The comparison needs both halves in one database, and the industry is split precisely down
                    that line.
                </p>

                <div className="fb-note info">
                    <span className="n-h">Review platforms hold the human half</span>
                    <span className="n-d">
                        Workday, Lattice and 15Five collect the ratings and have no record of what anybody
                        actually shipped, so they cannot check a review against delivery.
                    </span>
                </div>
                <div className="fb-note info">
                    <span className="n-h">Work trackers hold the recorded half</span>
                    <span className="n-d">
                        Jira and Asana know every task, deadline and comment, and have never heard of a review
                        cycle — so they can rank output and nothing else.
                    </span>
                </div>
                <div className="fb-note good">
                    <span className="n-h">This module has both, so it can disagree with itself</span>
                    <span className="n-d">
                        Module 4 derives a score from work nobody typed in. Module 5 collects ratings nobody
                        computed. Neither was built to check the other, which is exactly what makes the
                        comparison worth anything.
                    </span>
                </div>

                <p className="fb-sub" style={{ marginTop: 14 }}>
                    A gap of more than <b>{gapThreshold} percentile points</b> is treated as a disagreement worth
                    reading. Below that, two instruments measuring different things are as close as they can
                    reasonably be expected to land.
                </p>
            </section>

            {/* ---- The disagreements ---- */}
            <section className="fb-card s12">
                <div className="fb-lbl">
                    <span>The people the two instruments cannot agree about</span>
                    <span className="fb-pill rose">{disagreements.length}</span>
                </div>
                <p className="fb-sub">
                    Not a ranking, and not a verdict. Each card names what the recorded data can and cannot
                    see, so the reader can decide which instrument is missing something.
                </p>

                {disagreements.length === 0
                    ? (
                        <p className="fb-state">
                            Nobody sits more than {gapThreshold} percentile points apart on the two readings.
                            That is the healthy result, and it is worth re-checking once more reviews land.
                        </p>
                    )
                    : (
                        <div className="fb-gaps">
                            {disagreements.map(row => (
                                <GapCard row={row} scoreMax={scoreMax} key={row.id}
                                    open={openCard === row.id}
                                    onToggle={() => setOpenCard(current => (current === row.id ? '' : row.id))} />
                            ))}
                        </div>
                    )}
            </section>

            {/* ---- Everyone, as a table ---- */}
            <section className="fb-card s12">
                <div className="fb-lbl"><span>Every person covered by both</span></div>
                <div className="fb-tablewrap">
                    <table className="fb-table">
                        <thead>
                            <tr>
                                <th>Person</th><th>Score</th><th>Record percentile</th>
                                <th>Rating</th><th>Reviewer percentile</th><th>Gap</th><th>Reading</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map(row => (
                                <tr key={row.id} className={selected === row.id ? 'on' : ''}
                                    onClick={() => setSelected(selected === row.id ? '' : row.id)}>
                                    <td style={{ color: 'var(--f-text)' }}>{row.name}</td>
                                    <td className="num">{row.score}</td>
                                    <td className="num">{Math.round(row.recordPercentile)}</td>
                                    <td className="num">{row.rating}</td>
                                    <td className="num">{Math.round(row.humanPercentile)}</td>
                                    <td className="num" style={{
                                        color: row.direction === 'agree' ? 'inherit'
                                            : row.gap > 0 ? 'var(--f-clay)' : 'var(--f-rose)'
                                    }}>
                                        {row.gap > 0 ? '+' : ''}{Math.round(row.gap)}
                                    </td>
                                    <td>
                                        <span className={`fb-pill ${DIRECTION[row.direction].tone}`}>
                                            {DIRECTION[row.direction].label}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <p className="fb-sub">
                    Correlation is Spearman's rank coefficient, chosen over Pearson deliberately: nothing here
                    claims the two scales are linearly related, only that two instruments measuring anything
                    alike should put people in a similar order.
                </p>
            </section>
        </div>
    )
}
