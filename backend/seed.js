// Fills the Atlas database with the starting data in data/dummy_data.js.
require('dotenv').config({ path: require('path').join(__dirname, '.env') })
const mongoose = require('mongoose')
const connectDB = require('./config/db')

const Department = require('./model/department')
const Employee = require('./model/employee')
const Objective = require('./model/objective')
const Task = require('./model/task')
const Comment = require('./model/comment')
const Attachment = require('./model/attachment')

const { DEPARTMENTS, EMPLOYEES, OBJECTIVES, TASKS } = require('./data/dummy_data')

const run = async () => {
    await connectDB()
    console.log('Connected to', mongoose.connection.name)
    console.log('Clearing the Module 3 collections...')

    await Promise.all([
        Department.deleteMany({}),
        Employee.deleteMany({}),
        Objective.deleteMany({}),
        Task.deleteMany({}),
        Comment.deleteMany({}),
        Attachment.deleteMany({})
    ])

    await Department.insertMany(DEPARTMENTS)

    // Skills are inferred from the job title so the AI import has something to match work against.
    const skillsFor = (jobTitle) => {
        const title = jobTitle.toLowerCase()
        const skills = []
        if (/frontend|ui|full-stack/.test(title)) skills.push('frontend')
        if (/backend|full-stack|engineering lead/.test(title)) skills.push('backend')
        if (/qa|quality/.test(title)) skills.push('testing')
        if (/design|ui|ux/.test(title)) skills.push('design')
        if (/research|ux/.test(title)) skills.push('research')
        if (/content|strategist|recruiter|hr/.test(title)) skills.push('documentation')
        if (/marketing|growth|analyst|manager/.test(title)) skills.push('reporting')
        return skills.length ? skills : ['documentation']
    }

    const employees = await Employee.insertMany(EMPLOYEES.map(person => ({
        name: person.name,
        email: `${person.name.split(' ')[0].toLowerCase()}@northwind.io`,
        jobTitle: person.jobTitle,
        department: person.department,
        color: person.color,
        skills: skillsFor(person.jobTitle)
    })))

    const objectives = await Objective.insertMany(OBJECTIVES.map(o => ({
        title: o.title,
        description: o.description,
        client: o.client,
        startDate: o.startDate,
        dueDate: o.dueDate,
        status: o.status
    })))

    // The dummy data uses its own short ids; map them onto the real ObjectIds.
    const employeeByOldId = Object.fromEntries(
        EMPLOYEES.map((person, index) => [person.id, employees[index]._id])
    )
    const objectiveByOldId = Object.fromEntries(
        OBJECTIVES.map((objective, index) => [objective.id, objectives[index]._id])
    )

    // The three lifecycle stamps have to be written here as well.
    const hoursAfter = (date, hours) => new Date(new Date(date).getTime() + hours * 3600 * 1000)

    const tasks = await Task.insertMany(TASKS.map(task => {
        const createdAt = task.createdAt ? new Date(task.createdAt) : new Date()
        const started = task.status !== 'todo'

        return {
            title: task.title,
            description: task.description,
            department: task.department,
            assignee: task.assigneeId ? employeeByOldId[task.assigneeId] : null,
            objective: task.objectiveId ? objectiveByOldId[task.objectiveId] : null,
            priority: task.priority,
            status: task.status,
            estimateHours: task.estimateHours,
            spentHours: task.spentHours,
            dueDate: task.dueDate ? new Date(task.dueDate) : null,
            subtasks: task.subtasks.map(s => ({
                title: s.title,
                done: s.done,
                completedAt: s.done ? hoursAfter(createdAt, 20) : undefined
            })),
            createdAt,

            // Assigned the same day it was raised.
            assignedAt: task.assigneeId ? hoursAfter(createdAt, 2) : undefined,
            startedAt: started ? hoursAfter(createdAt, 26) : undefined,
            completedAt: task.status === 'done' ? hoursAfter(createdAt, 74) : undefined
        }
    }), { timestamps: false })

    // A couple of open questions, so the discussion feature is not an empty box.
    const byTitle = new Map(tasks.map(task => [task.title, task]))
    await Comment.insertMany([
        {
            task: byTitle.get('Fix the login API token refresh')._id,
            authorName: 'Sadia Karim',
            kind: 'question',
            body: 'Does this affect the mobile clients too, or only the web session?'
        },
        {
            task: byTitle.get('Single sign-on with the corporate directory')._id,
            authorName: 'Moumita Heena',
            kind: 'comment',
            body: 'Client confirmed they only need group mapping for the two admin roles at launch.'
        },
        {
            task: byTitle.get('Rebuild the invoice list screen')._id,
            authorName: 'Rima Sultana',
            kind: 'question',
            body: 'Should the date filter use the invoice date or the payment due date?'
        }
    ])

    const open = tasks.filter(t => t.status !== 'done').length

    console.log('')
    console.log(`  Departments : ${DEPARTMENTS.length}`)
    console.log(`  Employees   : ${employees.length}`)
    console.log(`  Objectives  : ${objectives.length}`)
    console.log(`  Tasks       : ${tasks.length} (${open} open)`)
    console.log(`  Questions   : 3`)
    console.log('')

    await mongoose.connection.close()
}

run().catch(async (error) => {
    console.error('Seeding failed:', error.message)
    await mongoose.connection.close().catch(() => {})
    process.exit(1)
})
