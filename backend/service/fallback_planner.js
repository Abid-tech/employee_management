// Used when no Gemini key is set, or when the API call fails.

// Bullets survive a PDF badly.
const BULLET = /^\s*(?:[-*+•‣▪◦·–—"'“”‘’·•▪●◦]|\d+[.)]|[a-z][.)])\s+/i
const HEADING_HASH = /^\s*#{1,6}\s+/
const TRAILING = /[.:;,]\s*$/

// Maps words in a document to the skill tags kept on employee records.
const SKILL_WORDS = {
    // "page" is deliberately absent.
    frontend: ['frontend', 'front-end', 'ui', 'interface', 'react', 'screen', 'component', 'responsive', 'layout'],
    backend: ['backend', 'back-end', 'api', 'endpoint', 'server', 'node', 'express', 'service', 'integration', 'database', 'schema'],
    design: ['design', 'wireframe', 'mockup', 'prototype', 'figma', 'branding', 'typography', 'ux', 'icon'],
    testing: ['test', 'testing', 'qa', 'quality', 'bug', 'regression', 'coverage'],
    research: ['research', 'analysis', 'analyse', 'analyze', 'benchmark', 'survey', 'investigate', 'interview'],
    // "dashboard" is absent for a subtler reason than "page" above.
    reporting: ['report', 'analytics', 'metric', 'chart', 'kpi', 'campaign',
        'announcement', 'newsletter', 'press', 'social'],
    documentation: ['document', 'documentation', 'readme', 'guide', 'manual', 'specification', 'spec', 'policy', 'copy', 'content']
}

const URGENT = ['critical', 'blocker', 'urgent', 'asap', 'immediately', 'must', 'required', 'security']
const IMPORTANT = ['important', 'priority', 'key', 'essential', 'deadline', 'soon']
const RELAXED = ['optional', 'nice to have', 'later', 'if time', 'stretch', 'future', 'eventually']

// Whole-word matching: a plain substring search finds "ui" inside "build" and "api" inside "rapid".
const escape = (word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const hasWord = (text, word) =>
    new RegExp(`(^|[^a-z0-9])${escape(word)}(s|es)?($|[^a-z0-9])`, 'i').test(text)

const skillsIn = (text) =>
    Object.entries(SKILL_WORDS)
        .filter(([, words]) => words.some(word => hasWord(text, word)))
        .map(([skill]) => skill)

const priorityFor = (text) => {
    if (URGENT.some(word => hasWord(text, word))) return 'critical'
    if (IMPORTANT.some(word => hasWord(text, word))) return 'high'
    if (RELAXED.some(word => hasWord(text, word))) return 'low'
    return 'medium'
}

// Longer, denser lines describe bigger jobs.
const estimateFor = (text) => {
    const words = text.split(/\s+/).length
    let hours = 4
    if (words > 24) hours = 16
    else if (words > 14) hours = 12
    else if (words > 8) hours = 8

    if (/(research|investigate|migrate|redesign|rebuild|architecture|integrate)/i.test(text)) hours += 4
    if (/(fix|update|tweak|rename|adjust|small|minor)/i.test(text)) hours = Math.max(2, hours - 4)
    return hours
}

const clean = (line) => line.replace(BULLET, '').replace(HEADING_HASH, '').replace(TRAILING, '').trim()

const ACTION_VERBS = ['build', 'create', 'design', 'develop', 'implement', 'add', 'set up', 'write', 'draft',
    'review', 'test', 'fix', 'deploy', 'configure', 'integrate', 'migrate', 'research', 'prepare', 'update',
    'refactor', 'document', 'plan', 'define', 'validate', 'produce', 'deliver', 'launch', 'run']

const startsWithAction = (text) =>
    ACTION_VERBS.some(verb => text.trim().toLowerCase().startsWith(verb + ' '))

const isHeading = (line) => {
    const raw = line.trim()
    if (!raw) return false
    if (HEADING_HASH.test(raw)) return true
    if (raw.length < 60 && raw.endsWith(':')) return true
    if (raw.length < 50 && raw === raw.toUpperCase() && /[A-Z]/.test(raw)) return true

    // A PDF keeps none of Markdown's "#" marks and a Word heading carries its weight in the style.
    if (raw.length <= 60 &&
        /^[A-Z0-9]/.test(raw) &&
        !/[.,;!?]$/.test(raw) &&
        raw.split(/\s+/).length <= 8 &&
        !startsWithAction(raw)) {
        return true
    }

    return false
}

const titleFrom = (text) => {
    // Collapse whitespace first.
    const flat = String(text).replace(/\s+/g, ' ').trim()

    const first = flat.split(/(?<=[.!?])\s/)[0] || flat
    const trimmed = first.replace(TRAILING, '')
    const capped = trimmed.length <= 90 ? trimmed : `${trimmed.slice(0, 87).trimEnd()}...`
    return capped.charAt(0).toUpperCase() + capped.slice(1)
}

const collectCandidates = (text) => {
    const candidates = []
    let heading = ''

    for (const line of text.split('\n')) {
        const raw = line.trim()
        if (!raw) continue

        if (isHeading(raw) && !BULLET.test(raw)) {
            heading = clean(raw)
            continue
        }

        if (BULLET.test(raw)) {
            const body = clean(raw)
            if (body.length > 3) candidates.push({ body, heading })
            continue
        }

        // Plain prose only becomes a task when it reads like an instruction.
        if (raw.length > 20 && startsWithAction(raw)) {
            candidates.push({ body: clean(raw), heading })
        }
    }

    // If the document had no list structure at all.
    if (candidates.length < 3) {
        text.split(/(?<=[.!?])\s+/)
            .map(s => s.trim())
            .filter(s => s.length > 30)
            .slice(0, 10)
            .forEach(sentence => candidates.push({
                body: sentence.replace(/\s+/g, ' ').replace(TRAILING, ''),
                heading: ''
            }))
    }

    return candidates.slice(0, 12)
}

// Where a task goes when nothing in its wording points anywhere in particular.
const defaultDepartment = (departments, employees) => {
    const headcount = {}
    for (const person of employees) {
        if (departments.includes(person.department)) {
            headcount[person.department] = (headcount[person.department] || 0) + 1
        }
    }

    return [...departments].sort((a, b) => (headcount[b] || 0) - (headcount[a] || 0))[0] || departments[0]
}

// Picks the department whose people most often carry the skills this task needs.
const departmentFor = (skills, employees, departments, fallback) => {
    if (skills.length === 0) return fallback

    const scores = {}
    for (const person of employees) {
        const overlap = (person.skills || []).filter(skill => skills.includes(skill)).length
        if (overlap > 0) scores[person.department] = (scores[person.department] || 0) + overlap
    }

    const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0]
    return best ? best[0] : fallback
}

const assigneeFor = (skills, department, employees) => {
    if (skills.length === 0) return ''

    const ranked = employees
        .filter(person => person.department === department)
        .map(person => ({
            person,
            matches: (person.skills || []).filter(skill => skills.includes(skill)).length
        }))
        .filter(entry => entry.matches > 0)
        .sort((a, b) => b.matches - a.matches)

    return ranked[0]?.person.email || ''
}

const generatePlan = ({ text, departments, employees }) => {
    const candidates = collectCandidates(text)
    const fallbackDepartment = defaultDepartment(departments, employees)

    const tasks = candidates.map(candidate => {
        const combined = `${candidate.heading} ${candidate.body}`
        const skills = skillsIn(combined)
        const department = departmentFor(skills, employees, departments, fallbackDepartment)

        return {
            title: titleFrom(candidate.body),
            description: candidate.heading
                ? `From "${candidate.heading}" in the source document.\n\n${candidate.body}`
                : candidate.body,
            priority: priorityFor(combined),
            estimateHours: estimateFor(candidate.body),
            department,
            suggestedAssigneeEmail: assigneeFor(skills, department, employees),
            subtasks: [],
            reason: candidate.heading
                ? `Listed under "${candidate.heading}" in the document.`
                : 'Taken directly from a line in the document.'
        }
    })

    const firstLine = text.split('\n').map(l => l.trim()).find(Boolean) || 'Imported document'

    return {
        summary: titleFrom(clean(firstLine)),
        tasks,
        engine: 'Built-in reader'
    }
}

module.exports = { generatePlan, defaultDepartment }
