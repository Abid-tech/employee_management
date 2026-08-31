const Review = require('../model/review')
const Employee = require('../model/employee')

const { COMPETENCIES } = Review

// Calibration, with the reasoning shown.

const round = (n, dp = 2) => {
    const f = 10 ** dp
    return Math.round((Number(n) || 0) * f) / f
}
const mean = (list) => (list.length ? list.reduce((a, b) => a + b, 0) / list.length : 0)
const stdev = (list) => {
    if (list.length < 2) return 0
    const m = mean(list)
    return Math.sqrt(mean(list.map(v => (v - m) ** 2)))
}

// Below this a finding is a coincidence rather than a tendency.
const MIN_REVIEWS = 3

// --- The language check ------------------------------------------------------

// Trait words describe a person; behaviour words describe something they did.
const TRAIT_WORDS = [
    'great', 'good', 'excellent', 'amazing', 'awesome', 'brilliant', 'outstanding',
    'smart', 'clever', 'talented', 'gifted', 'rockstar', 'superstar', 'ninja',
    'hard-working', 'hardworking', 'dedicated', 'passionate', 'motivated', 'driven',
    'team player', 'nice', 'friendly', 'pleasant', 'positive attitude', 'attitude',
    'proactive', 'reliable', 'solid', 'strong performer', 'natural', 'always',
    'never', 'very good', 'well done', 'keep it up', 'nothing to add'
]

// Signals that somebody pointed at something that actually happened.
const SPECIFIC_MARKERS = [
    /\b\d+\b/,                                   // any number: counts, dates, hours
    /\b(when|after|during|because|so that|which meant|led to|resulted in)\b/i,
    /\b(for example|e\.g\.|specifically|in particular)\b/i,
    /\b(sprint|release|migration|outage|incident|deadline|demo|handover|review|ticket|bug)\b/i
]

const assessLanguage = (text) => {
    const body = (text || '').trim()
    if (body.length === 0) return { verdict: 'empty', traitHits: [], specificHits: 0, words: 0 }

    const lower = body.toLowerCase()
    const traitHits = TRAIT_WORDS.filter(w => lower.includes(w))
    const specificHits = SPECIFIC_MARKERS.filter(rx => rx.test(body)).length
    const words = body.split(/\s+/).filter(Boolean).length

    let verdict = 'specific'
    if (words < 8) verdict = 'too_short'
    else if (specificHits === 0 && traitHits.length > 0) verdict = 'trait_language'
    else if (specificHits === 0) verdict = 'unevidenced'

    return { verdict, traitHits, specificHits, words }
}

const LANGUAGE_COPY = {
    specific: 'Points at something that happened.',
    trait_language: 'Describes the person rather than the work — hard to act on or to disagree with.',
    unevidenced: 'No example, date or number to anchor it.',
    too_short: 'Too short to be useful to the person receiving it.',
    empty: 'No written comment at all.'
}

// --- Reviewer-level findings -------------------------------------------------

// Drift is measured against the same people, not against the company.
const driftAgainstPeers = (mine, allReviews) => {
    const deltas = []

    for (const review of mine) {
        if (review.overall == null || !review.employee) continue
        const employeeId = String(review.employee._id || review.employee)
        const reviewerId = String(review.reviewer?._id || review.reviewer)

        const others = allReviews.filter(other =>
            other.overall != null &&
            String(other.employee?._id || other.employee) === employeeId &&
            // Every other review this reviewer wrote about the same person.
            String(other.reviewer?._id || other.reviewer) !== reviewerId &&
            other.source !== 'self')

        if (others.length === 0) continue
        deltas.push(review.overall - mean(others.map(o => o.overall)))
    }

    return { delta: deltas.length ? mean(deltas) : null, comparable: deltas.length }
}

const analyseReviewers = (reviews, orgMean) => {
    const byReviewer = new Map()

    for (const review of reviews) {
        if (!review.reviewer) continue
        // A self-assessment is not somebody reviewing other people.
        if (review.source === 'self') continue
        const key = String(review.reviewer._id || review.reviewer)
        if (!byReviewer.has(key)) byReviewer.set(key, [])
        byReviewer.get(key).push(review)
    }

    const out = []

    for (const [reviewerId, mine] of byReviewer) {
        const scores = mine.filter(r => r.overall != null).map(r => r.overall)
        if (scores.length === 0) continue

        const average = mean(scores)
        const spread = stdev(scores)

        const { delta, comparable } = driftAgainstPeers(mine, reviews)
        const driftPercent = delta === null || orgMean <= 0 ? 0 : (delta / orgMean) * 100

        const person = mine[0].reviewer
        const flags = []

        if (comparable >= MIN_REVIEWS && Math.abs(driftPercent) >= 10) {
            const high = driftPercent > 0
            flags.push({
                kind: high ? 'lenient' : 'severe',
                severity: Math.abs(driftPercent) >= 20 ? 'high' : 'medium',
                headline: `Rates ${Math.abs(round(driftPercent, 0))}% ${high ? 'above' : 'below'} other reviewers of the same people`,
                // The comparison, spelled out, so the reader can check it.
                because: `On ${comparable} ${comparable === 1 ? 'person' : 'people'} also reviewed by someone else, they score ${round(Math.abs(delta), 2)} `
                    + `${high ? 'higher' : 'lower'} on average. Their overall average is ${round(average, 2)}; the company average is ${round(orgMean, 2)}.`,
                soWhat: high
                    ? 'Their team looks stronger than it may be. Compare a few of their 5s against another reviewer\'s 4s before promotion decisions.'
                    : 'Their team looks weaker than it may be. Someone rated 3 here might be rated 4 elsewhere for the same work.'
            })
        }

        if (scores.length >= 4 && spread < 0.25) {
            flags.push({
                kind: 'clustered',
                severity: 'medium',
                headline: 'Gives nearly everyone the same score',
                because: `${scores.length} reviews, all within ${round(spread, 2)} of each other.`,
                soWhat: 'A rating that never varies carries no information. Nobody learns where they actually stand.'
            })
        }

        const texts = mine.map(r => [r.strengths, r.improvements, r.comment].filter(Boolean).join(' '))
        const verdicts = texts.map(assessLanguage)
        const weak = verdicts.filter(v => v.verdict === 'trait_language' || v.verdict === 'too_short' || v.verdict === 'empty')

        if (mine.length >= MIN_REVIEWS && weak.length / mine.length >= 0.5) {
            const traits = [...new Set(verdicts.flatMap(v => v.traitHits))].slice(0, 4)
            flags.push({
                kind: 'vague_language',
                severity: 'medium',
                headline: `${weak.length} of ${mine.length} comments describe the person, not the work`,
                because: traits.length
                    ? `Leans on trait words like ${traits.map(t => `"${t}"`).join(', ')} without an example, date or number.`
                    : 'Comments carry no example, date or number to anchor them.',
                soWhat: 'The person cannot act on it, and cannot argue with it either. Ask for one concrete instance per point.'
            })
        }

        out.push({
            reviewerId,
            name: person.name || 'Unknown',
            department: person.department || '',
            jobTitle: person.jobTitle || '',
            color: person.color || '#0A2947',
            reviewCount: mine.length,
            average: round(average, 2),
            spread: round(spread, 2),
            driftPercent: round(driftPercent, 1),
            enoughEvidence: scores.length >= MIN_REVIEWS,
            flags
        })
    }

    return out.sort((a, b) => b.flags.length - a.flags.length || Math.abs(b.driftPercent) - Math.abs(a.driftPercent))
}

// --- Department and competency views ----------------------------------------

const analyseDepartments = (reviews, orgMean) => {
    const names = [...new Set(reviews.map(r => r.employee?.department).filter(Boolean))]

    return names.map(name => {
        const mine = reviews.filter(r => r.employee?.department === name && r.overall != null)
        const average = mean(mine.map(r => r.overall))
        return {
            name,
            reviewCount: mine.length,
            average: round(average, 2),
            driftPercent: round(orgMean > 0 ? ((average - orgMean) / orgMean) * 100 : 0, 1)
        }
    }).sort((a, b) => b.average - a.average)
}

const analyseCompetencies = (reviews) => COMPETENCIES.map(c => {
    const scores = reviews.flatMap(r => (r.ratings || []).filter(x => x.competency === c.key).map(x => x.score))
    return {
        competency: c.key,
        label: c.label,
        average: scores.length ? round(mean(scores), 2) : null,
        spread: scores.length ? round(stdev(scores), 2) : null,
        count: scores.length
    }
}).sort((a, b) => (a.average ?? 9) - (b.average ?? 9))

// --- Distribution ------------------------------------------------------------

// How the whole company's scores fall.
const buildDistribution = (reviews) => {
    const buckets = [1, 2, 3, 4, 5].map(band => ({
        band,
        count: reviews.filter(r => r.overall != null && Math.round(r.overall) === band).length
    }))
    const total = buckets.reduce((s, b) => s + b.count, 0) || 1
    return buckets.map(b => ({ ...b, percent: round((b.count / total) * 100, 1) }))
}

// --- Public ------------------------------------------------------------------

const calibration = async ({ cycle } = {}) => {
    const filter = { status: { $in: ['submitted', 'acknowledged'] } }
    if (cycle) filter.cycle = cycle

    const reviews = await Review.find(filter)
        .populate('employee', 'name department jobTitle color')
        .populate('reviewer', 'name department jobTitle color')

    const scored = reviews.filter(r => r.overall != null)
    const orgMean = mean(scored.map(r => r.overall))

    const reviewers = analyseReviewers(reviews, orgMean)
    const flagged = reviewers.filter(r => r.flags.length > 0)

    const cycles = [...new Set((await Review.distinct('cycle')).filter(Boolean))].sort().reverse()

    return {
        cycle: cycle || 'All cycles',
        cycles,
        orgMean: round(orgMean, 2),
        reviewCount: scored.length,
        reviewerCount: reviewers.length,
        minReviewsForFinding: MIN_REVIEWS,

        distribution: buildDistribution(scored),
        reviewers,
        flaggedCount: flagged.reduce((sum, r) => sum + r.flags.length, 0),
        departments: analyseDepartments(reviews, orgMean),
        competencies: analyseCompetencies(reviews),

        // Written out so the interface never has to hard-code a copy of the rules it is displaying.
        method: {
            drift: `A reviewer is flagged when they sit 10% or more from what other reviewers gave the same people, over at least ${MIN_REVIEWS} people who were reviewed by more than one person. Comparing against the company average instead would flag anyone whose team is genuinely strong or genuinely struggling.`,
            clustering: 'Flagged when four or more reviews sit within 0.25 of each other — a rating that never varies carries no information.',
            language: 'Flagged when half or more of a reviewer\'s comments describe the person rather than something they did.'
        }
    }
}

module.exports = { calibration, assessLanguage, LANGUAGE_COPY, TRAIT_WORDS, MIN_REVIEWS }
