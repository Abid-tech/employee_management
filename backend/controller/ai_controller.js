const service = require('../service/task_service')
const objectives = require('../service/objective_service')
const { extractText, SUPPORTED } = require('../service/document_parser')
const gemini = require('../service/gemini')
const fallback = require('../service/fallback_planner')

const PRIORITIES = ['critical', 'high', 'medium', 'low']

// Tells the interface which engine is available.
const status = (req, res) => {
    res.json({
        geminiConfigured: gemini.isConfigured(),
        model: gemini.isConfigured() ? gemini.modelName() : null,
        supportedFiles: SUPPORTED
    })
}

// Reads an uploaded document and returns a draft set of tasks.
const analyseDocument = async (req, res) => {
    let source

    try {
        if (req.file) {
            const extracted = await extractText(req.file)
            source = { text: extracted.text, name: req.file.originalname, truncated: extracted.truncated }
        } else if (req.body.text && req.body.text.trim().length > 40) {
            source = { text: req.body.text.trim().slice(0, 20000), name: 'Pasted text', truncated: false }
        } else {
            return res.status(400).json({
                error: `Upload a document or paste at least a short paragraph. Supported files: ${SUPPORTED.join(', ')}.`
            })
        }
    } catch (err) {
        return res.status(400).json({ error: err.message })
    }

    const [departments, employees] = await Promise.all([
        service.listDepartments(),
        service.listEmployees()
    ])

    const departmentNames = departments.map(d => d.name)

    // Every task has to land in a department.
    if (departmentNames.length === 0) {
        return res.status(409).json({
            error: 'There are no departments set up yet, so there is nowhere to file the work. Run "npm run seed" in the backend folder first.'
        })
    }

    const notes = req.body.notes || ''

    let plan
    let notice = ''

    if (gemini.isConfigured()) {
        try {
            plan = await gemini.generatePlan({ text: source.text, departments: departmentNames, employees, notes })
        } catch (err) {
            // A demo should never die because a key expired or the network blipped.
            console.error('[ai] Gemini failed, using the built-in reader:', err.message)
            plan = fallback.generatePlan({ text: source.text, departments: departmentNames, employees })
            notice = 'Gemini was unavailable, so this came from the built-in reader. The result is editable either way.'
        }
    } else {
        plan = fallback.generatePlan({ text: source.text, departments: departmentNames, employees })
        notice = 'No Gemini key is configured, so this came from the built-in reader. Add GEMINI_API_KEY to backend/.env for a sharper read.'
    }

    const byEmail = new Map(employees.map(person => [person.email?.toLowerCase(), person]))

    // Same default the built-in reader uses.
    const fallbackDepartment = fallback.defaultDepartment(departmentNames, employees)

    // Normalise whatever came back into exactly what the review screen expects.
    const tasks = (plan.tasks || []).slice(0, 12).map((task, index) => {
        const suggested = task.suggestedAssigneeEmail
            ? byEmail.get(String(task.suggestedAssigneeEmail).toLowerCase())
            : null

        const department = departmentNames.includes(task.department)
            ? task.department
            : fallbackDepartment

        return {
            key: `draft-${index}`,
            title: String(task.title || '').trim().slice(0, 200) || `Task ${index + 1}`,
            description: String(task.description || '').trim(),
            department,
            priority: PRIORITIES.includes(task.priority) ? task.priority : 'medium',
            estimateHours: Math.min(80, Math.max(1, Number(task.estimateHours) || 4)),
            assigneeId: suggested ? suggested._id.toString() : '',
            assigneeName: suggested ? suggested.name : '',
            subtasks: Array.isArray(task.subtasks) ? task.subtasks.map(String).filter(Boolean).slice(0, 8) : [],
            reason: String(task.reason || '').trim(),
            include: true
        }
    })

    res.json({
        summary: plan.summary || '',
        tasks,
        engine: plan.engine,
        notice,
        source: { name: source.name, truncated: source.truncated },
        // A document is one piece of work.
        suggestedProject: projectNameFrom(plan.summary, source.name)
    })
}

// Turns whatever the reader produced into something that reads like a project name.
const projectNameFrom = (summary, filename) => {
    const cleaned = String(summary || '')
        .replace(/^(client\s+)?brief\s*[—:-]\s*/i, '')
        .replace(/\s+/g, ' ')
        .trim()

    if (cleaned.length >= 4 && cleaned.length <= 80) return cleaned

    const base = String(filename || 'Imported project').replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim()
    return base.charAt(0).toUpperCase() + base.slice(1)
}

// Creates the tasks the manager kept from the draft.
const createFromDraft = async (req, res) => {
    const tasks = Array.isArray(req.body.tasks) ? req.body.tasks : []

    if (tasks.length === 0) {
        return res.status(400).json({ error: 'There are no tasks to create.' })
    }

    // Three ways in: file under an existing project.
    let objectiveId = req.body.objectiveId || null
    let project = null

    if (!objectiveId && req.body.projectTitle && String(req.body.projectTitle).trim()) {
        project = await objectives.createObjective({
            title: String(req.body.projectTitle).trim(),
            description: req.body.summary || '',
            summary: req.body.summary || '',
            dueDate: req.body.projectDueDate || null,
            client: req.body.client || '',
            source: 'ai',
            sourceDocument: req.body.sourceDocument || ''
        })
        objectiveId = project._id.toString()
    }

    const created = await service.createManyTasks(tasks.map(task => ({
        ...task,
        objectiveId,
        source: 'ai',
        aiReason: task.reason || ''
    })))

    res.status(201).json({
        created,
        objectiveId,
        project: project ? { id: project._id.toString(), title: project.title } : null
    })
}

module.exports = { status, analyseDocument, createFromDraft }
