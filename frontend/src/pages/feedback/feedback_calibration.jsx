import { useCallback, useEffect, useState } from 'react'
import { feedbackApi } from '../../lib/feedback_api'
import { Avatar, Bar, Icon, Score } from './feedback_ui'

// Calibration, with the reasoning on screen.

const KIND_COPY = {
    lenient: 'Rates high',
    severe: 'Rates low',
    clustered: 'No spread',
    vague_language: 'Vague wording'
}

export default function FeedbackCalibration() {
    const [data, setData] = useState(null)
    const [cycle, setCycle] = useState('')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const load = useCallback(async () => {
        setLoading(true)
        try {
            setData(await feedbackApi.calibration(cycle))
            setError('')
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [cycle])

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { load() }, [load])

    if (loading && !data) {
        return <div className="fb-card s12"><div className="fb-skel" style={{ height: 340 }} /></div>
    }
    if (error && !data) {
        return <><div className="fb-err">{error}</div><button className="fb-btn" onClick={load}>Try again</button></>
    }

    const flagged = data.reviewers.filter(r => r.flags.length > 0)
    const clean = data.reviewers.filter(r => r.flags.length === 0)
    const maxBand = Math.max(...data.distribution.map(b => b.count), 1)

    return (
        <div className="fb-grid">
            {error && <div className="fb-err s12">{error}</div>}

            <section className="fb-card s12">
                <div className="fb-lbl">
                    <span>Calibration · {data.cycle}</span>
                    <span className={`fb-pill ${data.flaggedCount > 0 ? 'gold' : 'green'}`}>
                        {data.flaggedCount} {data.flaggedCount === 1 ? 'finding' : 'findings'}
                    </span>
                </div>

                <div className="fb-kpis">
                    <div className="fb-kpi">
                        <div className="k-l">Company average</div>
                        <div className="k-n">{data.orgMean}<span style={{ fontSize: 14, color: 'var(--f-muted)' }}>/5</span></div>
                        <div className="k-s">over {data.reviewCount} submitted reviews</div>
                    </div>
                    <div className="fb-kpi">
                        <div className="k-l">Reviewers</div>
                        <div className="k-n">{data.reviewerCount}</div>
                        <div className="k-s">{flagged.length} with something to look at</div>
                    </div>
                    <div className="fb-kpi warn">
                        <div className="k-l">Evidence bar</div>
                        <div className="k-n">{data.minReviewsForFinding}</div>
                        <div className="k-s">minimum before anything is flagged</div>
                    </div>
                    <div className="fb-kpi">
                        <div className="k-l">Weakest axis</div>
                        <div className="k-n" style={{ fontSize: 17 }}>{data.competencies[0]?.label || '—'}</div>
                        <div className="k-s">company-wide average {data.competencies[0]?.average ?? '—'}</div>
                    </div>
                </div>

                <div className="fb-field" style={{ maxWidth: 220, marginTop: 14 }}>
                    <label htmlFor="c-cycle">Cycle</label>
                    <select id="c-cycle" value={cycle} onChange={e => setCycle(e.target.value)}>
                        <option value="">All cycles</option>
                        {data.cycles.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
            </section>

            {/* Findings. */}
            <section className="fb-card s7">
                <div className="fb-lbl"><span>What stands out, and why</span><Icon name="scale" size={14} /></div>

                {flagged.length === 0
                    ? <p className="fb-state">Nothing stands out this cycle. Every reviewer sits within 10% of their colleagues.</p>
                    : flagged.map(reviewer => (
                        <div key={reviewer.reviewerId} style={{ marginTop: 14 }}>
                            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                <Avatar person={reviewer} />
                                <span style={{ minWidth: 0 }}>
                                    <span style={{ fontSize: 13, fontWeight: 650 }}>{reviewer.name}</span>
                                    <span style={{ display: 'block', fontSize: 10.5, color: 'var(--f-muted)' }}>
                                        {reviewer.jobTitle} · {reviewer.reviewCount} reviews written
                                    </span>
                                </span>
                                <span style={{ marginLeft: 'auto', textAlign: 'right' }}>
                                    <Score value={reviewer.average} />
                                    <span style={{
                                        display: 'block', fontSize: 10.5, fontFamily: 'var(--f-mono)',
                                        color: reviewer.driftPercent > 0 ? 'var(--f-green)' : 'var(--f-rose)'
                                    }}>
                                        {reviewer.driftPercent > 0 ? '+' : ''}{reviewer.driftPercent}%
                                    </span>
                                </span>
                            </div>

                            {reviewer.flags.map((flag, i) => (
                                <div className={`fb-find ${flag.severity}`} key={i}>
                                    <div className="f-h">
                                        <span className="fb-pill gold" style={{ marginRight: 7 }}>{KIND_COPY[flag.kind] || flag.kind}</span>
                                        {flag.headline}
                                    </div>
                                    <dl>
                                        <dt>Because</dt><dd>{flag.because}</dd>
                                        <dt>So what</dt><dd>{flag.soWhat}</dd>
                                    </dl>
                                </div>
                            ))}
                        </div>
                    ))}

                {clean.length > 0 && (
                    <>
                        <div className="fb-lbl" style={{ marginTop: 20 }}><span>Nothing to look at</span></div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                            {clean.map(reviewer => (
                                <span key={reviewer.reviewerId} className="fb-pill plain"
                                    title={`${reviewer.reviewCount} reviews, average ${reviewer.average}`}>
                                    {reviewer.name} · {reviewer.driftPercent > 0 ? '+' : ''}{reviewer.driftPercent}%
                                </span>
                            ))}
                        </div>
                    </>
                )}
            </section>

            <section className="fb-card s5">
                <div className="fb-lbl"><span>How the scores fall</span></div>
                <p className="fb-sub">A wall at one band means nobody is being told where they stand.</p>

                <div style={{ marginTop: 10 }}>
                    {data.distribution.map(band => (
                        <div className="fb-rate" key={band.band}>
                            <span className="n">{band.band} out of 5</span>
                            <span className="fb-bar"><i style={{ width: `${(band.count / maxBand) * 100}%` }} /></span>
                            <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11.5, color: 'var(--f-muted)' }}>
                                {band.percent}%
                            </span>
                        </div>
                    ))}
                </div>

                <div className="fb-lbl" style={{ marginTop: 18 }}><span>By competency</span></div>
                <div style={{ marginTop: 6 }}>
                    {data.competencies.map(competency => (
                        <div className="fb-rate" key={competency.competency}>
                            <span className="n">{competency.label}</span>
                            <Bar value={competency.average ?? 0}
                                tone={competency.average >= 4 ? 'green' : competency.average >= 3 ? '' : 'gold'} />
                            <Score value={competency.average} />
                        </div>
                    ))}
                </div>

                <div className="fb-lbl" style={{ marginTop: 18 }}><span>How these are worked out</span></div>
                <div style={{ marginTop: 6 }}>
                    {Object.entries(data.method).map(([key, text]) => (
                        <p className="fb-quote" key={key}><b>{key}.</b> {text}</p>
                    ))}
                </div>
            </section>

            <section className="fb-card s12">
                <div className="fb-lbl"><span>Every reviewer</span></div>
                <div className="fb-tablewrap">
                    <table className="fb-table">
                        <thead>
                            <tr>
                                <th>Reviewer</th><th>Department</th><th>Reviews</th>
                                <th>Average</th><th>Spread</th><th>Drift vs peers</th><th>Findings</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.reviewers.map(reviewer => (
                                <tr key={reviewer.reviewerId}>
                                    <td style={{ color: 'var(--f-text)' }}>{reviewer.name}</td>
                                    <td>{reviewer.department}</td>
                                    <td className="num">{reviewer.reviewCount}</td>
                                    <td className="num">{reviewer.average}</td>
                                    <td className="num">{reviewer.spread}</td>
                                    <td className="num" style={{
                                        color: Math.abs(reviewer.driftPercent) >= 10
                                            ? (reviewer.driftPercent > 0 ? 'var(--f-green)' : 'var(--f-rose)')
                                            : 'var(--f-muted)'
                                    }}>
                                        {reviewer.driftPercent > 0 ? '+' : ''}{reviewer.driftPercent}%
                                    </td>
                                    <td>
                                        {reviewer.flags.length === 0
                                            ? <span style={{ color: 'var(--f-muted)' }}>—</span>
                                            : reviewer.flags.map((f, i) => (
                                                <span className="fb-pill gold" key={i} style={{ marginRight: 4 }}>
                                                    {KIND_COPY[f.kind] || f.kind}
                                                </span>
                                            ))}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    )
}
