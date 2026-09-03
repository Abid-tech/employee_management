// Google Gemini.

const API_ROOT = 'https://generativelanguage.googleapis.com/v1beta/models'
const TIMEOUT_MS = 120000

const isConfigured = () => Boolean(process.env.GEMINI_API_KEY)
const modelName = () => process.env.GEMINI_MODEL || 'gemini-3.6-flash'

// Gemini accepts an OpenAPI-style schema and will only answer with JSON that matches it.
const PLAN_SCHEMA = {
    type: 'OBJECT',
    properties: {
        summary: { type: 'STRING' },
        tasks: {
            type: 'ARRAY',
            items: {
                type: 'OBJECT',
                properties: {
                    title: { type: 'STRING' },
                    description: { type: 'STRING' },
                    priority: { type: 'STRING', enum: ['critical', 'high', 'medium', 'low'] },
                    estimateHours: { type: 'NUMBER' },
                    department: { type: 'STRING' },
                    suggestedAssigneeEmail: { type: 'STRING' },
                    subtasks: { type: 'ARRAY', items: { type: 'STRING' } },
                    reason: { type: 'STRING' }
                },
                required: ['title', 'description', 'priority', 'estimateHours', 'department', 'reason']
            }
        }
    },
    required: ['summary', 'tasks']
}

const SYSTEM = `You are a delivery lead turning a project document into a workable task list.

Rules:
- Produce between 4 and 12 tasks. Each one must be something a single person can finish.
- Write every title as an action starting with a verb. No numbering, no "Task 1".
- estimateHours must be realistic, between 1 and 40.
- department must be one of the department names given. Pick the one that would really do the work.
- Only set suggestedAssigneeEmail to an email from the team list, and only when that person's skills clearly fit. Otherwise return an empty string.
- priority: critical means it blocks other work or has a hard deadline; low means it can wait a month.
- reason is one short sentence explaining why this task exists, drawn from the document. Never invent facts that are not in it.
- subtasks are optional: only include them where the document actually implies concrete steps.
- summary is one sentence describing what the document is asking for.`

const buildPrompt = ({ text, departments, employees, notes }) => {
    const roster = employees
        .map(person => `- ${person.name} <${person.email}> | ${person.jobTitle}, ${person.department} | skills: ${(person.skills || []).join(', ') || 'not listed'}`)
        .join('\n')

    return `DEPARTMENTS
${departments.join(', ')}

TEAM
${roster || 'No team members provided.'}

${notes ? `EXTRA CONTEXT FROM THE MANAGER\n${notes}\n` : ''}
DOCUMENT
"""
${text}
"""

Break this document into tasks.`
}

// Google answers 503 "high demand" and 429 "rate limited" on the free tier often enough.
const RETRY_ON = [429, 503]
const RETRIES = 3
const BACKOFF_MS = 2500

const attempt = async ({ text, departments, employees, notes }) => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

    try {
        const response = await fetch(
            `${API_ROOT}/${modelName()}:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal,
                body: JSON.stringify({
                    systemInstruction: { parts: [{ text: SYSTEM }] },
                    contents: [{ role: 'user', parts: [{ text: buildPrompt({ text, departments, employees, notes }) }] }],
                    generationConfig: {
                        temperature: 0.3,
                        responseMimeType: 'application/json',
                        responseSchema: PLAN_SCHEMA
                    }
                })
            }
        )

        if (!response.ok) {
            const detail = await response.text()
            const error = new Error(`Gemini responded ${response.status}: ${detail.slice(0, 250)}`)
            error.status = response.status
            throw error
        }

        const payload = await response.json()
        const raw = payload.candidates?.[0]?.content?.parts?.[0]?.text
        if (!raw) throw new Error('Gemini returned an empty response.')

        const plan = JSON.parse(raw)
        return { ...plan, engine: `Gemini (${modelName()})` }
    } finally {
        clearTimeout(timer)
    }
}

const generatePlan = async (input) => {
    let last

    for (let tries = 1; tries <= RETRIES; tries++) {
        try {
            return await attempt(input)
        } catch (err) {
            last = err
            if (!RETRY_ON.includes(err.status) || tries === RETRIES) throw err

            console.warn(`[gemini] ${err.status} on attempt ${tries} of ${RETRIES}, retrying in ${BACKOFF_MS}ms`)
            await new Promise(resolve => setTimeout(resolve, BACKOFF_MS))
        }
    }

    throw last
}

module.exports = { isConfigured, modelName, generatePlan }
