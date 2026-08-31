const Review = require('../model/review')
const performance = require('./performance_service')

// Where the record and the humans disagree about the same person.

const round = (n, dp = 1) => {
    const f = 10 ** dp
    return Math.round((Number(n) || 0) * f) / f
}
const mean = (list) => (list.length ? list.reduce((a, b) => a + b, 0) / list.length : 0)

// Below this a person's rating is one or two opinions.
const MIN_REVIEWS = 3

// How far apart the two readings must sit before it is worth a manager's attention.
const GAP_THRESHOLD = 20

// --- Putting two different measurements on one axis --------------------------

// A score out of 100 and a rating out of 5 cannot be compared directly.
const percentileOf = (value, population) => {
    if (population.length < 2) return 50
    const below = population.filter(v => v < value).length
    const equal = population.filter(v => v === value).length
    return round(((below + equal / 2) / population.length) * 100, 1)
}

// Spearman's rank correlation between the two orderings.
const spearman = (pairs) => {
    if (pairs.length < 3) return null

    const rank = (values) => {
        const sorted = values.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v)
        const ranks = new Array(values.length)

        // Ties share the average of the positions they occupy.
        let i = 0
        while (i < sorted.length) {
            let j = i
            while (j + 1 < sorted.length && sorted[j + 1].v === sorted[i].v) j += 1
            const shared = (i + j) / 2 + 1
            for (let k = i; k <= j; k += 1) ranks[sorted[k].i] = shared
            i = j + 1
        }
        return ranks
    }

    const a = rank(pairs.map(p => p.record))
    const b = rank(pairs.map(p => p.human))
    const n = pairs.length

    const meanA = mean(a)
    const meanB = mean(b)

    let cov = 0
    let varA = 0
    let varB = 0
    for (let i = 0; i < n; i += 1) {
        cov += (a[i] - meanA) * (b[i] - meanB)
        varA += (a[i] - meanA) ** 2
        varB += (b[i] - meanB) ** 2
    }

    if (varA === 0 || varB === 0) return null
    return round(cov / Math.sqrt(varA * varB), 2)
}

// --- What the disagreement is made of ----------------------------------------

// Candidate explanations, each one a check that either holds or does not.
const explain = ({ direction, person, ratings, competencyGaps }) => {
    const reasons = []
    const stats = person.stats || {}
    const health = person.sustainability || {}

    if (direction === 'rated_above') {
        // People think more of them than the delivery record does.
        if (stats.helped > 0 || stats.answers > 0) {
            reasons.push({
                kind: 'invisible_work',
                headline: `Unblocked ${stats.helped} people and answered ${stats.answers} questions`,
                detail: 'Collaboration is 20% of the derived score and completed tasks are 40%, so time spent '
                    + 'making other people faster reads as a gap in their own output. Their colleagues can see it; '
                    + 'the score can only see it second-hand.'
            })
        }
        if (health.status === 'overloaded' || health.status === 'stretched') {
            reasons.push({
                kind: 'overloaded',
                headline: `Carrying ${health.openHours}h of open work${health.overdue ? ` and ${health.overdue} tasks past their date` : ''}`,
                detail: 'A person given more than they can finish scores badly on delivery for a reason that is '
                    + 'about the allocation, not about them. Reviewers who watch them work see the effort; '
                    + 'the record only sees the unfinished half.'
            })
        }
        if (stats.onTimeRate !== undefined && stats.onTimeRate < 70) {
            reasons.push({
                kind: 'deadlines',
                headline: `Only ${stats.onTimeRate}% of their work landed on time`,
                detail: 'This is the specific thing the reviewers are not pricing in. Worth raising directly — '
                    + 'a rating that ignores missed dates stops being useful to the person receiving it.'
            })
        }
    }

    if (direction === 'rated_below') {
        // The record is strong and the humans are not.
        const worst = competencyGaps[0]
        const spread = worst?.best !== undefined ? round(worst.best - worst.score, 2) : 0

        // Whether the complaint is concentrated in one competency or spread evenly across all six changes.
        if (worst && spread >= 0.5) {
            reasons.push({
                kind: 'competency',
                headline: `Weakest on ${worst.label} at ${worst.score}/5, against ${worst.best}/5 on ${worst.bestLabel}`,
                detail: `${spread} points separate their best competency from their worst, so the reviewers are `
                    + `not marking them down across the board — the complaint is concentrated in one place. `
                    + `The derived score measures output and cannot see ${worst.label.toLowerCase()} at all, `
                    + 'which is why the two readings come apart here.'
            })
        } else if (worst) {
            reasons.push({
                kind: 'competency',
                headline: `Rated evenly across all six competencies, ${worst.score}/5 to ${worst.best}/5`,
                detail: `Only ${spread} points separate their strongest competency from their weakest, so there is `
                    + 'no single skill dragging the average down. A flat profile below a strong delivery record '
                    + 'usually means the reviewers are rating a general impression rather than anything specific — '
                    + 'which is worth knowing about the reviews as much as about the person.'
            })
        }
        if (person.silentHero) {
            reasons.push({
                kind: 'visibility',
                headline: 'Delivers steadily and is rarely credited for it',
                detail: 'Already flagged by the performance module as doing critical work with little recognition. '
                    + 'A low rating on a high record often means people are not seeing the work rather than '
                    + 'disagreeing with it.'
            })
        }
        if (person.momentum?.direction === 'down') {
            reasons.push({
                kind: 'momentum',
                headline: `Output is down ${Math.abs(person.momentum.changePercent)}% on the first half of the period`,
                detail: 'Reviews are written from the recent past, the score is averaged over the whole period. '
                    + 'A person who has slowed recently will be rated on the slowdown before the score reflects it.'
            })
        }
    }

    if (direction === 'agree') {
        reasons.push({
            kind: 'agreement',
            headline: 'Both instruments put them in the same part of the company',
            detail: `The record places them at the ${round(person.recordPercentile, 0)}th percentile and the `
                + `reviewers at the ${round(person.humanPercentile, 0)}th. Two independent measurements agreeing `
                + 'is the strongest reading either can give.'
        })
    }

    // A gap with nothing in the recorded data to account for it is itself a result.
    if (direction !== 'agree' && reasons.length === 0) {
        reasons.push({
            kind: 'unexplained',
            headline: 'Nothing in the recorded data accounts for this gap',
            detail: `The record places them at the ${round(person.recordPercentile, 0)}th percentile and the `
                + `reviewers at the ${round(person.humanPercentile, 0)}th, and none of the usual causes hold — `
                + 'they are not overloaded, not slipping, and the ratings are not concentrated in one competency. '
                + 'That makes this a question for a conversation, not for a further query.'
        })
    }

    // Always last: what the ratings themselves are made of.
    reasons.push({
        kind: 'evidence',
        headline: `${ratings.count} reviews from ${ratings.sourceCount} of the 4 sources`,
        detail: ratings.sourceCount < 3
            ? 'Fewer than three of manager, peer, self and client are represented, so the human reading is '
                + 'narrower than it looks. Treat the gap as a prompt to collect more, not as a conclusion.'
            : 'Manager, peer, self and client are represented widely enough that the average is not one '
                + 'person\'s opinion.'
    })

    return reasons
}

// --- Public ------------------------------------------------------------------

const reconcile = async (options = {}) => {
    // Both halves are read exactly once.
    const [overview, reviews] = await Promise.all([
        performance.overview(options),
        Review.find({ status: { $ne: 'draft' } }).select('employee ratings source')
    ])

    // Human side: one average per person.
    const byPerson = new Map()
    for (const review of reviews) {
        const key = String(review.employee)
        if (!byPerson.has(key)) byPerson.set(key, { scores: [], sources: new Set(), byCompetency: new Map() })
        const bucket = byPerson.get(key)

        const scores = (review.ratings || []).map(r => r.score).filter(n => n > 0)
        if (scores.length === 0) continue

        bucket.scores.push(mean(scores))
        bucket.sources.add(review.source)
        for (const rating of review.ratings || []) {
            if (!(rating.score > 0)) continue
            if (!bucket.byCompetency.has(rating.competency)) bucket.byCompetency.set(rating.competency, [])
            bucket.byCompetency.get(rating.competency).push(rating.score)
        }
    }

    const LABEL = Object.fromEntries(Review.COMPETENCIES.map(c => [c.key, c.label]))

    // Only people who appear on both instruments with enough evidence on each.
    const eligible = overview.leaderboard
        .map(person => {
            const bucket = byPerson.get(person.id)
            if (!bucket || bucket.scores.length < MIN_REVIEWS) return null
            return { person, bucket }
        })
        .filter(Boolean)

    const recordValues = eligible.map(e => e.person.score)
    const humanValues = eligible.map(e => round(mean(e.bucket.scores), 2))

    const rows = eligible.map(({ person, bucket }, index) => {
        const humanAverage = humanValues[index]

        const recordPercentile = percentileOf(person.score, recordValues)
        const humanPercentile = percentileOf(humanAverage, humanValues)
        const gap = round(humanPercentile - recordPercentile, 1)

        const direction = Math.abs(gap) <= GAP_THRESHOLD ? 'agree'
            : gap > 0 ? 'rated_above'
                : 'rated_below'

        // Weakest competency first.
        const competencyGaps = [...bucket.byCompetency.entries()]
            .map(([key, scores]) => ({ key, label: LABEL[key] || key, score: round(mean(scores), 2), count: scores.length }))
            .sort((a, b) => a.score - b.score)

        const best = competencyGaps[competencyGaps.length - 1]
        if (competencyGaps[0] && best) {
            competencyGaps[0].best = best.score
            competencyGaps[0].bestLabel = best.label
        }

        const silentHero = (overview.silentHeroes || []).some(h => (h.id || h) === person.id)

        const enriched = {
            ...person,
            recordPercentile,
            humanPercentile,
            silentHero
        }

        return {
            id: person.id,
            name: person.name,
            initials: person.initials,
            color: person.color,
            department: person.department,
            jobTitle: person.jobTitle,

            // The record's half.
            score: person.score,
            grade: person.grade,
            recordPercentile,

            // The humans' half.
            rating: humanAverage,
            reviewCount: bucket.scores.length,
            sourceCount: bucket.sources.size,
            humanPercentile,

            gap,
            direction,
            competencies: competencyGaps,
            reasons: explain({
                direction,
                person: enriched,
                ratings: { count: bucket.scores.length, sourceCount: bucket.sources.size },
                competencyGaps
            })
        }
    })

    // Biggest disagreement first: this page exists to send somebody to look at the people the two.
    rows.sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap))

    const agreement = spearman(rows.map(r => ({ record: r.score, human: r.rating })))
    const disagreements = rows.filter(r => r.direction !== 'agree')

    return {
        generatedAt: new Date(),
        period: overview.period,
        minReviews: MIN_REVIEWS,
        gapThreshold: GAP_THRESHOLD,

        covered: rows.length,
        skipped: overview.leaderboard.length - rows.length,
        scoreMax: overview.scoreMax,

        // How much the two instruments agree overall, and what that means.
        agreement,
        agreementReading: agreement === null ? 'Not enough people are covered by both to compare the orderings.'
            : agreement >= 0.6 ? 'The two instruments broadly put people in the same order, so the exceptions below are worth a look rather than a rewrite of either.'
                : agreement >= 0.3 ? 'The two orderings are related but loosely. Expect the gaps below to be real, and expect several of them to be about work the score cannot see.'
                    : agreement >= 0 ? 'The record and the reviewers are close to unrelated. Before acting on any individual gap, ask whether reviews here are being written from evidence at all.'
                        : 'The orderings run opposite to each other. That is a finding about the review process, not about the people in it.',

        ratedAbove: rows.filter(r => r.direction === 'rated_above').length,
        ratedBelow: rows.filter(r => r.direction === 'rated_below').length,
        agreed: rows.filter(r => r.direction === 'agree').length,

        rows,
        disagreements
    }
}

module.exports = { reconcile, spearman, percentileOf, MIN_REVIEWS, GAP_THRESHOLD }
