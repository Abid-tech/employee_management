const Task = require('../model/task')
const Employee = require('../model/employee')
const Department = require('../model/department')
const Objective = require('../model/objective')
const Comment = require('../model/comment')

// Employee Performance Management.

const PILLARS = [
    {
        key: 'delivery',
        label: 'Delivery',
        weight: 0.40,
        blurb: 'Work completed, weighted by size and priority',
        howMeasured: 'Of the work assigned to you, the share you finished — weighted by estimated hours and priority, so one critical 40-hour build outweighs six one-hour chores.',
        formula: 'weighted hours finished ÷ weighted hours assigned × 100',
        inputs: ['Task status', 'Estimated hours', 'Priority']
    },
    {
        key: 'quality',
        label: 'Quality',
        weight: 0.30,
        blurb: 'On time, estimated honestly, finished properly',
        howMeasured: 'The average of three things nobody has to rate by hand: what share landed by its due date, how close estimates were to hours actually spent, and whether checklists were finished rather than abandoned. Any of the three is skipped when the data is not there.',
        formula: 'mean(on-time %, estimate accuracy %, checklist completion %)',
        inputs: ['Due date vs completed date', 'Estimated vs spent hours', 'Subtask completion']
    },
    {
        key: 'collaboration',
        label: 'Collaboration',
        weight: 0.20,
        blurb: 'Questions answered and teammates unblocked',
        howMeasured: 'Built only from activity on other people\'s tasks — comments, replies and threads you resolved. Commenting on your own task is talking to yourself and scores nothing. The bar scales with team size, so it does not get harder as the company grows.',
        formula: 'volume 40% + depth (replies & resolutions) 35% + spread across teammates 25%',
        inputs: ['Comments on others\' tasks', 'Replies', 'Threads resolved']
    },
    {
        key: 'consistency',
        label: 'Consistency',
        weight: 0.10,
        blurb: 'A steady rhythm rather than bursts',
        howMeasured: 'How many of the last 12 weeks had any completion at all, tempered by how evenly output was spread. A steady contributor scores above someone who delivers everything in one heroic week.',
        formula: 'active-week coverage 60% + evenness 40%',
        inputs: ['Completion dates over 12 weeks']
    }
]

// Stated once so the interface never has to assert it independently: the four weights.
const SCORE_MAX = 100

// Nothing on this page is entered by a manager.
const SCORE_SOURCE = 'automatic'

// A critical task is not the same unit of work as a low one.
const PRIORITY_WEIGHT = { critical: 2.0, high: 1.5, medium: 1.0, low: 0.7 }

// Points are awarded for facts, never for rank.
const POINTS = {
    perWeightedHour: 10,
    onTimeBonus: 25,
    criticalBonus: 50,
    unblockBonus: 30,
    milestoneEvery: 25          // tasks completed
}

const GRADES = [
    { min: 90, label: 'Exceptional', tone: 'peak' },
    { min: 80, label: 'Strong', tone: 'good' },
    { min: 70, label: 'Solid', tone: 'fair' },
    { min: 55, label: 'Developing', tone: 'warn' },
    { min: 0, label: 'Needs support', tone: 'risk' }
]

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

// --- Small helpers ----------------------------------------------------------

const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n))
const round = (n, dp = 0) => {
    const f = 10 ** dp
    return Math.round((Number(n) || 0) * f) / f
}
const pct = (part, whole) => (whole > 0 ? (part / whole) * 100 : 0)
const mean = (list) => (list.length ? list.reduce((a, b) => a + b, 0) / list.length : 0)

const weightOf = (task) => (PRIORITY_WEIGHT[task.priority] ?? 1) * (task.estimateHours || 0)

const gradeFor = (score) => GRADES.find(g => score >= g.min) ?? GRADES[GRADES.length - 1]

const idOf = (value) => {
    if (!value) return null
    if (typeof value === 'string') return value
    if (value._id) return String(value._id)
    return String(value)
}

// A task counts towards a period by when it was finished, not when it was created.
const inPeriod = (date, from, to) => {
    if (!date) return false
    const t = new Date(date).getTime()
    return t >= from.getTime() && t <= to.getTime()
}

// --- The four pillars -------------------------------------------------------

// Delivery.
const scoreDelivery = (assigned, done) => {
    if (assigned.length === 0) return { value: 0, evidence: { assigned: 0, done: 0 } }

    const assignedWeight = assigned.reduce((sum, t) => sum + weightOf(t), 0)
    const doneWeight = done.reduce((sum, t) => sum + weightOf(t), 0)

    // With no estimates recorded anywhere, fall back to counting tasks.
    const value = assignedWeight > 0
        ? pct(doneWeight, assignedWeight)
        : pct(done.length, assigned.length)

    return {
        value: clamp(value),
        evidence: {
            assigned: assigned.length,
            done: done.length,
            weightedHoursDone: round(doneWeight, 1),
            weightedHoursAssigned: round(assignedWeight, 1)
        }
    }
}

// Quality — three things that are all knowable without anyone rating anyone.
const scoreQuality = (done) => {
    if (done.length === 0) return { value: 0, evidence: { onTimeRate: null, estimateAccuracy: null, thoroughness: null } }

    const dated = done.filter(t => t.dueDate && t.completedAt)
    const onTime = dated.filter(t => new Date(t.completedAt) <= new Date(t.dueDate))
    const onTimeRate = dated.length ? pct(onTime.length, dated.length) : null

    const logged = done.filter(t => t.spentHours > 0 && t.estimateHours > 0)
    const estimateAccuracy = logged.length
        ? clamp(mean(logged.map(t => {
            const drift = Math.abs(t.spentHours - t.estimateHours) / t.estimateHours
            return (1 - Math.min(drift, 1)) * 100
        })))
        : null

    const withLists = done.filter(t => (t.subtasks || []).length > 0)
    const thoroughness = withLists.length
        ? clamp(mean(withLists.map(t => pct(t.subtasks.filter(s => s.done).length, t.subtasks.length))))
        : null

    const parts = [onTimeRate, estimateAccuracy, thoroughness].filter(v => v !== null)
    // Nothing measurable yet — treat as neutral rather than perfect or awful.
    const value = parts.length ? mean(parts) : 60

    return {
        value: clamp(value),
        evidence: {
            onTimeRate: onTimeRate === null ? null : round(onTimeRate),
            estimateAccuracy: estimateAccuracy === null ? null : round(estimateAccuracy),
            thoroughness: thoroughness === null ? null : round(thoroughness),
            onTimeCount: onTime.length,
            datedCount: dated.length
        }
    }
}

// Collaboration — the pillar most performance tools cannot see at all.
const scoreCollaboration = (comments, myTaskIds, teamSize) => {
    const onOthers = comments.filter(c => !myTaskIds.has(idOf(c.task)))
    const answers = onOthers.filter(c => c.replyTo)
    const resolved = onOthers.filter(c => c.resolved)
    const reach = new Set(onOthers.map(c => idOf(c.task))).size

    // Scaled against the size of the team rather than an absolute target.
    const expected = Math.max(3, Math.round(teamSize * 0.8))
    const helpVolume = pct(onOthers.length, expected)
    const helpDepth = pct(answers.length + resolved.length, Math.max(2, expected / 2))
    const spread = pct(reach, Math.max(2, expected))

    const value = clamp(helpVolume * 0.4 + helpDepth * 0.35 + spread * 0.25)

    return {
        value,
        evidence: {
            commentsOnOthers: onOthers.length,
            answers: answers.length,
            resolved: resolved.length,
            tasksReached: reach
        }
    }
}

// Consistency — a steady contributor beats a heroic one who vanishes for a month.
const scoreConsistency = (weekly) => {
    const active = weekly.filter(w => w.done > 0).length
    if (active === 0) return { value: 0, evidence: { activeWeeks: 0, totalWeeks: weekly.length } }

    const coverage = pct(active, weekly.length)

    // Coefficient of variation: how lumpy the output was. Low spread scores high.
    const counts = weekly.map(w => w.done)
    const avg = mean(counts)
    const variance = mean(counts.map(c => (c - avg) ** 2))
    const evenness = avg > 0 ? clamp(100 - (Math.sqrt(variance) / avg) * 55) : 0

    return {
        value: clamp(coverage * 0.6 + evenness * 0.4),
        evidence: { activeWeeks: active, totalWeeks: weekly.length, evenness: round(evenness) }
    }
}

// --- Weekly history ---------------------------------------------------------

// Twelve buckets ending at `to`, oldest first.
const weeklyHistory = (done, to, weeks = 12) => {
    const end = to.getTime()
    return Array.from({ length: weeks }, (_, i) => {
        const start = end - (weeks - i) * WEEK_MS
        const stop = end - (weeks - i - 1) * WEEK_MS
        const inWeek = done.filter(t => {
            const at = new Date(t.completedAt).getTime()
            return at > start && at <= stop
        })
        return {
            week: i + 1,
            label: `W${i + 1}`,
            done: inWeek.length,
            weightedHours: round(inWeek.reduce((sum, t) => sum + weightOf(t), 0), 1)
        }
    })
}

// Momentum — the direction of travel, which a single score cannot show.
const momentumOf = (weekly) => {
    const half = Math.floor(weekly.length / 2)
    const older = weekly.slice(0, half).reduce((s, w) => s + w.weightedHours, 0)
    const recent = weekly.slice(half).reduce((s, w) => s + w.weightedHours, 0)

    if (older === 0 && recent === 0) return { direction: 'flat', changePercent: 0, label: 'No activity' }
    if (older === 0) return { direction: 'up', changePercent: 100, label: 'Just started' }

    const change = ((recent - older) / older) * 100
    const direction = change > 12 ? 'up' : change < -12 ? 'down' : 'flat'
    const label = { up: 'Rising', down: 'Slipping', flat: 'Steady' }[direction]

    // Someone who did almost nothing in the first half produces percentages in the hundreds.
    const capped = Math.min(change, 200)

    return { direction, changePercent: round(capped), cappedAt: change > 200 ? 200 : null, label }
}

// --- Reward points ----------------------------------------------------------

// A ledger rather than a running total.
const buildLedger = (done) => {
    const entries = []

    for (const task of done) {
        const weighted = weightOf(task)
        const base = Math.round(weighted * POINTS.perWeightedHour)
        if (base > 0) {
            entries.push({
                kind: 'delivery',
                label: task.title,
                detail: `${task.priority} · ${task.estimateHours || 0}h`,
                points: base,
                at: task.completedAt
            })
        }

        if (task.dueDate && task.completedAt && new Date(task.completedAt) <= new Date(task.dueDate)) {
            entries.push({ kind: 'on_time', label: 'Delivered on time', detail: task.title, points: POINTS.onTimeBonus, at: task.completedAt })
        }
        if (task.priority === 'critical') {
            entries.push({ kind: 'critical', label: 'Critical work cleared', detail: task.title, points: POINTS.criticalBonus, at: task.completedAt })
        }
    }

    // Milestones for every N tasks finished.
    const milestones = Math.floor(done.length / POINTS.milestoneEvery)
    for (let i = 1; i <= milestones; i += 1) {
        entries.push({
            kind: 'milestone',
            label: `${i * POINTS.milestoneEvery} tasks completed`,
            detail: 'Milestone reached',
            points: 250,
            at: done[i * POINTS.milestoneEvery - 1]?.completedAt ?? null
        })
    }

    return entries.sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0))
}

const badgesFor = ({ done, collaboration, quality, consistency, streak }) => {
    const list = [
        { key: 'mentor', label: 'Mentor', earned: collaboration.evidence.answers >= 3, count: collaboration.evidence.answers, blurb: 'Answered 3+ questions on other people\'s work' },
        { key: 'unblocker', label: 'Unblocker', earned: collaboration.evidence.tasksReached >= 5, count: collaboration.evidence.tasksReached, blurb: 'Turned up on 5+ teammates\' tasks' },
        { key: 'on_time', label: 'On time', earned: (quality.evidence.onTimeRate ?? 0) >= 85, count: quality.evidence.onTimeCount, blurb: '85% or more delivered by the promised date' },
        { key: 'milestone', label: 'Milestone', earned: done.length >= POINTS.milestoneEvery, count: Math.floor(done.length / POINTS.milestoneEvery), blurb: `${POINTS.milestoneEvery} tasks completed` },
        { key: 'steady', label: 'Steady', earned: consistency.value >= 75, count: consistency.evidence.activeWeeks, blurb: 'Shipped something in most weeks' },
        { key: 'streak', label: 'Streak', earned: streak >= 4, count: streak, blurb: '4+ consecutive weeks with a completion' }
    ]
    return list
}

const streakOf = (weekly) => {
    let streak = 0
    for (let i = weekly.length - 1; i >= 0; i -= 1) {
        if (weekly[i].done > 0) streak += 1
        else break
    }
    return streak
}

// --- Sustainability ---------------------------------------------------------

// The thing leaderboards are usually blind to: what the ranking cost the person.
const sustainabilityOf = (openTasks, done) => {
    const openHours = openTasks.reduce((sum, t) => sum + (t.estimateHours || 0) * (1 - (t.progress ?? 0) / 100), 0)
    const openCritical = openTasks.filter(t => t.priority === 'critical').length
    const overdue = openTasks.filter(t => t.overdue).length

    const weekendFinishes = done.filter(t => {
        const day = new Date(t.completedAt).getDay()
        return day === 0 || day === 6
    }).length
    const weekendRate = pct(weekendFinishes, Math.max(1, done.length))

    // 40h of open work is a full week already committed.
    const loadIndex = clamp((openHours / 40) * 100, 0, 200)

    let status = 'healthy'
    if (loadIndex > 150 || (openCritical >= 3 && overdue >= 2)) status = 'at_risk'
    else if (loadIndex > 90 || weekendRate > 30 || overdue >= 2) status = 'stretched'

    const reasons = []
    if (loadIndex > 90) reasons.push(`${round(openHours)}h of open work still owed`)
    if (openCritical >= 2) reasons.push(`${openCritical} critical tasks open at once`)
    if (overdue >= 2) reasons.push(`${overdue} tasks already past their date`)
    if (weekendRate > 30) reasons.push(`${round(weekendRate)}% of work finished on a weekend`)

    return {
        status,
        loadIndex: round(loadIndex),
        openHours: round(openHours, 1),
        openCritical,
        overdue,
        weekendRate: round(weekendRate),
        reasons
    }
}

// --- The coach --------------------------------------------------------------

// Inverting the formula: given the pillar weights.
const coachFor = (profile) => {
    const gap = PILLARS
        .map(p => ({
            ...p,
            value: profile.pillars[p.key].value,
            // How many points of final score are recoverable in this pillar.
            upside: (100 - profile.pillars[p.key].value) * p.weight
        }))
        .sort((a, b) => b.upside - a.upside)

    const top = gap[0]
    const q = profile.pillars.quality.evidence
    const c = profile.pillars.collaboration.evidence

    const actions = {
        delivery: `Close out open work before taking more on — finishing what is already assigned is worth up to ${round(top.upside)} points of score.`,
        quality: q.onTimeRate !== null && q.onTimeRate < 80
            ? `${q.datedCount - q.onTimeCount} of ${q.datedCount} completed tasks landed late. Pulling estimates tighter is the fastest ${round(top.upside)}-point gain available.`
            : `Finish the checklists on tasks before closing them — thoroughness is the weakest part of quality right now.`,
        collaboration: `Only ${c.commentsOnOthers} comments on other people's tasks this period. Answering open questions is worth up to ${round(top.upside)} points and is the least contested route up.`,
        consistency: `Output is bunched rather than spread. Landing something most weeks is worth up to ${round(top.upside)} points.`
    }

    const nextGrade = GRADES.slice().reverse().find(g => g.min > profile.score)

    return {
        focus: top.key,
        focusLabel: top.label,
        upside: round(top.upside),
        message: actions[top.key],
        nextGrade: nextGrade ? { label: nextGrade.label, at: nextGrade.min, gap: round(nextGrade.min - profile.score, 1) } : null
    }
}

// --- One person -------------------------------------------------------------

const buildProfile = (employee, allTasks, allComments, ctx) => {
    const empId = String(employee._id)

    const assigned = allTasks.filter(t => t.assigneeId === empId)
    const done = assigned
        .filter(t => t.status === 'done' && inPeriod(t.completedAt, ctx.from, ctx.to))
        .sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt))
    const open = assigned.filter(t => t.status !== 'done')

    const myTaskIds = new Set(assigned.map(t => t.id))
    const comments = allComments.filter(c => idOf(c.author) === empId && inPeriod(c.createdAt, ctx.from, ctx.to))

    const weekly = weeklyHistory(done, ctx.to)

    const delivery = scoreDelivery(assigned, done)
    const quality = scoreQuality(done)
    const collaboration = scoreCollaboration(comments, myTaskIds, ctx.teamSize)
    const consistency = scoreConsistency(weekly)

    const pillars = { delivery, quality, collaboration, consistency }
    const score = clamp(PILLARS.reduce((sum, p) => sum + pillars[p.key].value * p.weight, 0))

    const ledger = buildLedger(done)
    const points = ledger.reduce((sum, e) => sum + e.points, 0)
    const streak = streakOf(weekly)

    // Difficulty of the work this person was handed, used for the fair ranking further down.
    const difficulty = assigned.length
        ? mean(assigned.map(t => (PRIORITY_WEIGHT[t.priority] ?? 1) * Math.log1p(t.estimateHours || 0)))
        : 0

    return {
        id: empId,
        name: employee.name,
        email: employee.email || '',
        jobTitle: employee.jobTitle || 'Employee',
        department: employee.department,
        color: employee.color || '#0A2947',
        initials: employee.name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join(''),

        score: round(score, 1),
        grade: gradeFor(score),

        // Each pillar carries both readings it is asked for on screen: value 0–100.
        pillars: Object.fromEntries(PILLARS.map(p => {
            const v = pillars[p.key]
            return [p.key, {
                ...v,
                value: round(v.value, 1),
                weight: p.weight,
                contributed: round(v.value * p.weight, 1),
                max: round(p.weight * 100, 1),
                // What finishing this pillar off would still add.
                headroom: round((100 - v.value) * p.weight, 1)
            }]
        })),

        points,
        ledger: ledger.slice(0, 40),
        badges: badgesFor({ done, collaboration, quality, consistency, streak }),
        streak,

        weekly,
        momentum: momentumOf(weekly),
        sustainability: sustainabilityOf(open, done),

        stats: {
            tasksDone: done.length,
            tasksOpen: open.length,
            tasksAssigned: assigned.length,
            onTimeRate: quality.evidence.onTimeRate,
            weightedHoursDone: delivery.evidence.weightedHoursDone ?? 0,
            criticalDone: done.filter(t => t.priority === 'critical').length,
            helped: collaboration.evidence.commentsOnOthers,
            answers: collaboration.evidence.answers
        },

        difficulty: round(difficulty, 3)
    }
}

// --- The roster -------------------------------------------------------------

// Fair rank.
const applyFairRank = (roster) => {
    const avgDifficulty = mean(roster.map(p => p.difficulty).filter(d => d > 0)) || 1

    const withFair = roster.map(p => {
        const factor = p.difficulty > 0 ? p.difficulty / avgDifficulty : 1
        // Deliberately gentle: a 12% swing at most.
        const fairScore = clamp(p.score * (1 + 0.12 * (factor - 1)))
        return { ...p, fairScore: round(fairScore, 1), difficultyFactor: round(factor, 2) }
    })

    const byScore = [...withFair].sort((a, b) => b.score - a.score)
    const byFair = [...withFair].sort((a, b) => b.fairScore - a.fairScore)

    return withFair.map(p => {
        const rank = byScore.findIndex(x => x.id === p.id) + 1
        const fairRank = byFair.findIndex(x => x.id === p.id) + 1
        return { ...p, rank, fairRank, rankDelta: rank - fairRank }
    }).sort((a, b) => a.rank - b.rank)
}

// Silent heroes.
const findSilentHeroes = (roster) => {
    if (roster.length < 3) return []

    const medianHelp = [...roster].sort((a, b) => a.stats.helped - b.stats.helped)[Math.floor(roster.length / 2)].stats.helped
    const topThird = Math.max(1, Math.ceil(roster.length / 3))

    return roster
        .filter(p => {
            const helpsALot = p.stats.helped > medianHelp && p.stats.helped >= 2
            const carriesCritical = p.stats.criticalDone >= 1
            const notCelebrated = p.rank > topThird
            return notCelebrated && (helpsALot || carriesCritical) && p.score >= 45
        })
        .map(p => ({
            id: p.id,
            name: p.name,
            department: p.department,
            initials: p.initials,
            color: p.color,
            rank: p.rank,
            score: p.score,
            reason: p.stats.helped > medianHelp
                ? `Answered ${p.stats.answers || p.stats.helped} times on other people's work — more than most of the company — while sitting at #${p.rank}.`
                : `Cleared ${p.stats.criticalDone} critical ${p.stats.criticalDone === 1 ? 'task' : 'tasks'} without a leaderboard position to show for it.`
        }))
        .slice(0, 4)
}

// --- Departments ------------------------------------------------------------

const buildDepartments = (roster, departments, tasks, ctx) => {
    const names = [...new Set([...departments.map(d => d.name), ...roster.map(p => p.department)])].sort()

    return names.map(name => {
        const people = roster.filter(p => p.department === name)
        const deptTasks = tasks.filter(t => t.department === name)
        const deptDone = deptTasks.filter(t => t.status === 'done' && inPeriod(t.completedAt, ctx.from, ctx.to))
        const meta = departments.find(d => d.name === name)

        const avgScore = round(mean(people.map(p => p.score)), 1)
        const goalProgress = round(pct(deptDone.length, Math.max(1, deptTasks.length)))

        return {
            name,
            mark: meta?.mark || '•',
            blurb: meta?.blurb || '',
            headcount: people.length,
            avgScore,
            grade: gradeFor(avgScore),
            goalProgress,
            tasksDone: deptDone.length,
            tasksTotal: deptTasks.length,
            points: people.reduce((sum, p) => sum + p.points, 0),
            overdue: deptTasks.filter(t => t.status !== 'done' && t.overdue).length,
            atRisk: people.filter(p => p.sustainability.status === 'at_risk').length,
            top: people.slice().sort((a, b) => b.score - a.score)[0] || null,

            // Enough to open a department in place rather than sending the reader to another page to find.
            openTasks: deptTasks.filter(t => t.status !== 'done').length,
            openCritical: deptTasks.filter(t => t.status !== 'done' && t.priority === 'critical').length,
            unassigned: deptTasks.filter(t => t.status !== 'done' && !t.assigneeId).length,
            pillarAverages: Object.fromEntries(PILLARS.map(p => [
                p.key, round(mean(people.map(x => x.pillars[p.key].value)), 1)
            ])),
            people: people
                .slice()
                .sort((a, b) => b.score - a.score)
                .map(p => ({
                    id: p.id, name: p.name, initials: p.initials, color: p.color,
                    jobTitle: p.jobTitle, score: p.score, rank: p.rank,
                    points: p.points,
                    tasksDone: p.stats.tasksDone,
                    tasksOpen: p.stats.tasksOpen,
                    status: p.sustainability.status,
                    momentum: p.momentum.label
                }))
        }
    }).sort((a, b) => b.avgScore - a.avgScore)
}

// --- Recommended actions ----------------------------------------------------

// The panel that earns its place on a manager's screen.
const SEVERITY = { urgent: 0, soon: 1, opportunity: 2 }

const buildActions = (roster, departments, tasks, ctx) => {
    const actions = []
    const person = (p) => ({ id: p.id, name: p.name, initials: p.initials, color: p.color, department: p.department })

    // 1.
    for (const p of roster.filter(p => p.sustainability.status === 'at_risk')) {
        actions.push({
            kind: 'protect',
            severity: 'urgent',
            title: `${p.name} is carrying too much`,
            detail: p.sustainability.reasons.join(' · ') || `Load index ${p.sustainability.loadIndex}, well beyond a normal week.`,
            action: 'Move work off them this week, or push a deadline.',
            people: [person(p)],
            metric: `${p.sustainability.openHours}h open`
        })
    }

    // 2.
    const unowned = tasks.filter(t => t.status !== 'done' && t.priority === 'critical' && !t.assigneeId)
    if (unowned.length) {
        actions.push({
            kind: 'assign',
            severity: 'urgent',
            title: `${unowned.length} critical ${unowned.length === 1 ? 'task has' : 'tasks have'} no owner`,
            detail: unowned.slice(0, 3).map(t => t.title).join(' · '),
            action: 'Assign an owner before the next standup.',
            people: [],
            metric: `${unowned.length} unowned`
        })
    }

    // 3.
    for (const dept of departments.filter(d => d.headcount >= 2)) {
        const deptDone = tasks.filter(t =>
            t.department === dept.name && t.status === 'done' && inPeriod(t.completedAt, ctx.from, ctx.to))
        const total = deptDone.reduce((sum, t) => sum + weightOf(t), 0)
        if (total <= 0) continue

        for (const p of dept.people) {
            const mine = deptDone.filter(t => t.assigneeId === p.id).reduce((sum, t) => sum + weightOf(t), 0)
            const share = pct(mine, total)
            if (share >= 55) {
                actions.push({
                    kind: 'spread',
                    severity: 'soon',
                    title: `${p.name} is a single point of failure in ${dept.name}`,
                    detail: `${round(share)}% of everything ${dept.name} delivered this period came from one person.`,
                    action: 'Pair someone onto their next critical task so the knowledge is not held once.',
                    people: [person({ ...p, department: dept.name })],
                    metric: `${round(share)}% of output`
                })
            }
        }
    }

    // 4.
    for (const dept of departments.filter(d => d.headcount >= 2)) {
        const sorted = [...dept.people].sort((a, b) => b.tasksOpen - a.tasksOpen)
        const heavy = sorted[0]
        const light = sorted[sorted.length - 1]
        if (heavy && light && heavy.id !== light.id && heavy.tasksOpen >= 4 && heavy.tasksOpen - light.tasksOpen >= 3) {
            actions.push({
                kind: 'rebalance',
                severity: 'soon',
                title: `Work is stacked unevenly in ${dept.name}`,
                detail: `${heavy.name} has ${heavy.tasksOpen} open tasks while ${light.name} has ${light.tasksOpen}.`,
                action: `Move one or two of ${heavy.name.split(' ')[0]}'s tasks across.`,
                people: [person({ ...heavy, department: dept.name }), person({ ...light, department: dept.name })],
                metric: `${heavy.tasksOpen} vs ${light.tasksOpen}`
            })
        }
    }

    // 5.
    for (const p of roster.filter(p => p.momentum.direction === 'down' && p.sustainability.status !== 'at_risk')) {
        actions.push({
            kind: 'check_in',
            severity: 'soon',
            title: `${p.name}'s output is falling`,
            detail: `Down ${Math.abs(p.momentum.changePercent)}% on the first half of the period, currently scoring ${p.score}.`,
            action: 'Worth a 1-on-1 to find out whether it is workload, blockers or motivation.',
            people: [person(p)],
            metric: `${p.momentum.changePercent}%`
        })
    }

    // 6.
    for (const hero of findSilentHeroes(roster)) {
        actions.push({
            kind: 'recognise',
            severity: 'opportunity',
            title: `${hero.name} is holding people up without the rank to show it`,
            detail: hero.reason,
            action: 'Call this out publicly — it is invisible in the leaderboard by design.',
            people: [{ id: hero.id, name: hero.name, initials: hero.initials, color: hero.color, department: hero.department }],
            metric: `#${hero.rank}`
        })
    }

    // 7.
    for (const p of roster.filter(p => p.score >= 80 && p.sustainability.status === 'healthy' && p.momentum.direction !== 'down').slice(0, 2)) {
        actions.push({
            kind: 'reward',
            severity: 'opportunity',
            title: `${p.name} is performing well and sustainably`,
            detail: `Scoring ${p.score} (${p.grade.label}) with a healthy workload and ${p.streak} consecutive active weeks.`,
            action: 'Candidate for reward, stretch work or promotion.',
            people: [person(p)],
            metric: `◈${p.points.toLocaleString()}`
        })
    }

    return actions
        .sort((a, b) => SEVERITY[a.severity] - SEVERITY[b.severity])
        .slice(0, 8)
}

// --- Contribution to company goals ------------------------------------------

// Rank tells you the order people finished in.
const buildContribution = (objectives, tasks, roster, ctx) => {
    const live = objectives.filter(o => o.status === 'active' || o.status === 'planning')
    const liveIds = new Set(live.map(o => String(o._id)))

    // One population, used for both the progress figure and the shares.
    const goalTasks = tasks.filter(t => liveIds.has(t.objectiveId))
    const doneTasks = goalTasks.filter(t => t.status === 'done')

    const totalWeight = goalTasks.reduce((sum, t) => sum + weightOf(t), 0)
    const doneWeight = doneTasks.reduce((sum, t) => sum + weightOf(t), 0)
    const goalProgress = round(pct(doneWeight, totalWeight))

    const goals = live.map(objective => {
        const mine = goalTasks.filter(t => t.objectiveId === String(objective._id))
        const finished = mine.filter(t => t.status === 'done')
        const weight = mine.reduce((sum, t) => sum + weightOf(t), 0)
        const finishedWeight = finished.reduce((sum, t) => sum + weightOf(t), 0)

        return {
            id: String(objective._id),
            title: objective.title,
            status: objective.status,
            dueDate: objective.dueDate || null,
            progress: round(pct(finishedWeight, weight)),
            tasksDone: finished.length,
            tasksTotal: mine.length,
            remainingHours: round(mine
                .filter(t => t.status !== 'done')
                .reduce((sum, t) => sum + (t.estimateHours || 0) * (1 - (t.progress ?? 0) / 100), 0)),
            // Share of the whole company goal this one objective represents.
            weightShare: round(pct(weight, totalWeight))
        }
    }).sort((a, b) => a.progress - b.progress)

    // Who did the finished work.
    const shares = roster
        .map(p => {
            const mine = doneTasks.filter(t => t.assigneeId === p.id)
            const weight = mine.reduce((sum, t) => sum + weightOf(t), 0)
            return {
                id: p.id,
                name: p.name,
                initials: p.initials,
                color: p.color,
                department: p.department,
                share: round(pct(weight, doneWeight), 1),
                weightedHours: round(weight, 1),
                tasks: mine.length,
                points: p.points
            }
        })
        .filter(s => s.share > 0)
        .sort((a, b) => b.share - a.share)

    // The same completed work grouped by department.
    const byDepartment = [...new Set(shares.map(s => s.department))]
        .map(name => {
            const people = shares.filter(s => s.department === name)
            return {
                name,
                share: round(people.reduce((sum, s) => sum + s.share, 0), 1),
                people: people.length,
                tasks: people.reduce((sum, s) => sum + s.tasks, 0)
            }
        })
        .sort((a, b) => b.share - a.share)

    return {
        goalProgress,
        goals,
        shares,
        byDepartment,
        goalCount: live.length,
        totalWeightedHours: round(totalWeight, 1),
        doneWeightedHours: round(doneWeight, 1)
    }
}

// --- Loading ----------------------------------------------------------------

const periodFrom = ({ from, to } = {}) => {
    const end = to ? new Date(to) : new Date()
    const start = from ? new Date(from) : new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000)
    return { from: start, to: end }
}

// Everything in four queries rather than one per person, so adding staff does not add round trips.
const loadAll = async () => {
    const [employees, taskDocs, comments, departments, objectives] = await Promise.all([
        Employee.find({ isActive: { $ne: false } }).sort({ name: 1 }),
        Task.find().populate('assignee', 'name department'),
        Comment.find(),
        Department.find(),
        Objective.find()
    ])

    const { decorate } = require('./task_service')
    const tasks = taskDocs.map(decorate)

    return { employees, tasks, comments, departments, objectives }
}

const buildRoster = async (options = {}) => {
    const ctx = periodFrom(options)
    const { employees, tasks, comments, departments, objectives } = await loadAll()

    ctx.teamSize = employees.length || 1

    let roster = employees.map(e => buildProfile(e, tasks, comments, ctx))
    roster = applyFairRank(roster)

    return { ctx, roster, tasks, comments, departments, objectives }
}

// --- Public reads -----------------------------------------------------------

const overview = async (options = {}) => {
    const { ctx, roster, tasks, departments, objectives } = await buildRoster(options)

    const scoped = options.department
        ? roster.filter(p => p.department === options.department)
        : roster

    const contribution = buildContribution(objectives, tasks, roster, ctx)
    const depts = buildDepartments(roster, departments, tasks, ctx)

    const companyScore = round(mean(roster.map(p => p.score)), 1)
    const doneInPeriod = tasks.filter(t => t.status === 'done' && inPeriod(t.completedAt, ctx.from, ctx.to))

    return {
        period: { from: ctx.from, to: ctx.to },
        pillars: PILLARS,
        grades: GRADES,
        scoreMax: SCORE_MAX,
        scoreSource: SCORE_SOURCE,

        company: {
            score: companyScore,
            grade: gradeFor(companyScore),
            headcount: roster.length,
            departments: depts.length,
            tasksCompleted: doneInPeriod.length,
            pointsAwarded: roster.reduce((sum, p) => sum + p.points, 0),
            goalProgress: contribution.goalProgress,
            atRisk: roster.filter(p => p.sustainability.status === 'at_risk').length,
            stretched: roster.filter(p => p.sustainability.status === 'stretched').length
        },

        leaderboard: scoped.map(p => ({
            id: p.id, name: p.name, initials: p.initials, color: p.color,
            department: p.department, jobTitle: p.jobTitle,
            score: p.score, fairScore: p.fairScore, grade: p.grade,
            rank: p.rank, fairRank: p.fairRank, rankDelta: p.rankDelta,
            points: p.points, streak: p.streak,
            momentum: p.momentum, sustainability: p.sustainability,
            badges: p.badges.filter(b => b.earned).length,
            stats: p.stats,

            // Weighted hours per week, not task counts.
            weekly: p.weekly.map(w => w.weightedHours)
        })),

        departments: depts,
        contribution,
        silentHeroes: findSilentHeroes(roster),
        actions: buildActions(roster, depts, tasks, ctx),

        // The people a manager should look at today, and why.
        attention: roster
            .filter(p => p.sustainability.status !== 'healthy' || p.momentum.direction === 'down')
            .map(p => ({
                id: p.id, name: p.name, initials: p.initials, color: p.color,
                department: p.department, score: p.score,
                status: p.sustainability.status,
                momentum: p.momentum,
                reasons: p.sustainability.reasons.length
                    ? p.sustainability.reasons
                    : [`Output down ${Math.abs(p.momentum.changePercent)}% on the first half of the period`]
            }))
            .slice(0, 6)
    }
}

const employeeDetail = async (id, options = {}) => {
    const { roster } = await buildRoster(options)
    const person = roster.find(p => p.id === String(id))
    if (!person) return null

    const peers = roster.filter(p => p.department === person.department && p.id !== person.id)

    return {
        employee: person,
        coach: coachFor(person),
        pillars: PILLARS,
        scoreMax: SCORE_MAX,
        scoreSource: SCORE_SOURCE,
        peerAverage: round(mean(peers.map(p => p.score)), 1),
        companyAverage: round(mean(roster.map(p => p.score)), 1),
        percentile: round(pct(roster.filter(p => p.score <= person.score).length, roster.length))
    }
}

// --- Customisable reports ---------------------------------------------------

// Every column the report builder can offer.
const REPORT_COLUMNS = [
    { key: 'rank', label: 'Rank', type: 'number' },
    { key: 'name', label: 'Employee', type: 'text' },
    { key: 'department', label: 'Department', type: 'text' },
    { key: 'jobTitle', label: 'Job title', type: 'text' },
    { key: 'score', label: 'Score', type: 'number' },
    { key: 'grade', label: 'Grade', type: 'text' },
    { key: 'fairScore', label: 'Fair score', type: 'number' },
    { key: 'fairRank', label: 'Fair rank', type: 'number' },
    { key: 'delivery', label: 'Delivery', type: 'number' },
    { key: 'quality', label: 'Quality', type: 'number' },
    { key: 'collaboration', label: 'Collaboration', type: 'number' },
    { key: 'consistency', label: 'Consistency', type: 'number' },
    { key: 'tasksDone', label: 'Tasks done', type: 'number' },
    { key: 'tasksOpen', label: 'Tasks open', type: 'number' },
    { key: 'onTimeRate', label: 'On-time %', type: 'number' },
    { key: 'criticalDone', label: 'Critical done', type: 'number' },
    { key: 'helped', label: 'Times helped others', type: 'number' },
    { key: 'points', label: 'Reward points', type: 'number' },
    { key: 'streak', label: 'Week streak', type: 'number' },
    { key: 'momentum', label: 'Momentum', type: 'text' },
    { key: 'load', label: 'Load index', type: 'number' },
    { key: 'status', label: 'Wellbeing', type: 'text' }
]

const DEFAULT_COLUMNS = ['rank', 'name', 'department', 'score', 'grade', 'tasksDone', 'onTimeRate', 'points', 'momentum']

const flatten = (p) => ({
    rank: p.rank,
    name: p.name,
    department: p.department,
    jobTitle: p.jobTitle,
    score: p.score,
    grade: p.grade.label,
    fairScore: p.fairScore,
    fairRank: p.fairRank,
    delivery: p.pillars.delivery.value,
    quality: p.pillars.quality.value,
    collaboration: p.pillars.collaboration.value,
    consistency: p.pillars.consistency.value,
    tasksDone: p.stats.tasksDone,
    tasksOpen: p.stats.tasksOpen,
    onTimeRate: p.stats.onTimeRate ?? 0,
    criticalDone: p.stats.criticalDone,
    helped: p.stats.helped,
    points: p.points,
    streak: p.streak,
    momentum: p.momentum.label,
    load: p.sustainability.loadIndex,
    status: p.sustainability.status.replace('_', ' ')
})

const report = async (options = {}) => {
    const { ctx, roster } = await buildRoster(options)

    const columns = (options.columns?.length ? options.columns : DEFAULT_COLUMNS)
        .filter(key => REPORT_COLUMNS.some(c => c.key === key))

    let rows = roster.map(flatten)

    if (options.department) rows = rows.filter(r => r.department === options.department)
    if (options.minScore != null && options.minScore !== '') rows = rows.filter(r => r.score >= Number(options.minScore))
    if (options.maxScore != null && options.maxScore !== '') rows = rows.filter(r => r.score <= Number(options.maxScore))
    if (options.status) rows = rows.filter(r => r.status === String(options.status).replace('_', ' '))
    if (options.momentum) rows = rows.filter(r => r.momentum.toLowerCase() === String(options.momentum).toLowerCase())

    const sortBy = REPORT_COLUMNS.some(c => c.key === options.sortBy) ? options.sortBy : 'rank'
    const dir = options.sortDir === 'asc' ? 1 : -1
    const numeric = REPORT_COLUMNS.find(c => c.key === sortBy)?.type === 'number'

    rows.sort((a, b) => {
        // Rank reads backwards from every other column: #1 is the best row.
        const flip = sortBy === 'rank' || sortBy === 'fairRank' ? -1 : 1
        if (numeric) return (Number(a[sortBy]) - Number(b[sortBy])) * dir * flip
        return String(a[sortBy]).localeCompare(String(b[sortBy])) * dir * flip
    })

    // Kept before the limit is applied.
    const matched = rows.length
    const limit = Number(options.limit)
    if (Number.isFinite(limit) && limit > 0) rows = rows.slice(0, limit)

    const numericCols = columns.filter(k => REPORT_COLUMNS.find(c => c.key === k)?.type === 'number')
    const totals = Object.fromEntries(numericCols.map(k => [k, round(mean(rows.map(r => Number(r[k]) || 0)), 1)]))

    return {
        period: { from: ctx.from, to: ctx.to },
        availableColumns: REPORT_COLUMNS,
        defaultColumns: DEFAULT_COLUMNS,
        columns,
        rows,
        totals,
        count: rows.length,
        matched,
        total: roster.length,
        limit: Number.isFinite(limit) && limit > 0 ? limit : null,
        generatedAt: new Date()
    }
}

module.exports = {
    overview, employeeDetail, report,
    PILLARS, PRIORITY_WEIGHT, POINTS, GRADES, REPORT_COLUMNS, DEFAULT_COLUMNS,
    SCORE_MAX, SCORE_SOURCE
}
