// Seed file for demo day. Run with: node seed.js
// Clears employees, holidays, and reminders, then inserts fresh demo data.

require('dotenv').config()
const mongoose = require('mongoose')
const Employee = require('./model/Employee')
const Holiday = require('./model/Holiday')
const Reminder = require('./model/Reminder')

const EMPLOYEES = [
    { name: 'Golam Rabbani Shanto', role: 'Engineering Lead', team: 'Backend', employeeId: 'EMP-001', email: 'shanto@company.com', department: 'Engineering', joiningDate: new Date('2024-01-15') },
    { name: 'Md. Abid Ali', role: 'SWE', team: 'Backend', employeeId: 'EMP-002', email: 'abid@company.com', department: 'Engineering', joiningDate: new Date('2024-03-01') },
    { name: 'Md. Sybeen Abrar Prohor', role: 'SWE', team: 'Frontend', employeeId: 'EMP-003', email: 'prohor@company.com', department: 'Engineering', joiningDate: new Date('2024-02-10') },
    { name: 'Moumita Heena Haque', role: 'Project Manager', team: 'Management', employeeId: 'EMP-004', email: 'heena@company.com', department: 'Engineering', joiningDate: new Date('2024-01-20') },
    { name: 'Rima Sultana', role: 'QA Engineer', team: 'QA', employeeId: 'EMP-005', email: 'rima@company.com', department: 'Engineering', joiningDate: new Date('2024-04-01') },
    { name: 'Ayan Mahmud', role: 'Designer', team: 'Design', employeeId: 'EMP-006', email: 'ayan@company.com', department: 'Design', joiningDate: new Date('2024-05-15') },
]

const now = new Date()
const y = now.getFullYear()
const m = now.getMonth()

const HOLIDAYS = [
    { name: 'Independence Day', date: new Date(y, m, 26), type: 'National', description: 'National holiday celebrating independence' },
    { name: 'Victory Day', date: new Date(y, m + 1, 16), type: 'National', description: 'Celebrating national victory' },
    { name: 'Eid ul-Fitr', date: new Date(y, m, 30), type: 'Religious', description: 'End of Ramadan celebration' },
    { name: 'Eid ul-Adha', date: new Date(y, m + 1, 7), type: 'Religious', description: 'Festival of sacrifice' },
    { name: 'Company Foundation Day', date: new Date(y, m, 15), type: 'Company', description: 'Annual company celebration' },
    { name: 'Team Building Day', date: new Date(y, m + 1, 22), type: 'Company', description: 'Company-wide team building activities' },
]

async function run() {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('Connected to MongoDB')

    // Clear existing data
    await Employee.deleteMany({})
    await Holiday.deleteMany({})
    await Reminder.deleteMany({})
    console.log('Cleared existing data')

    // Insert employees
    const employees = await Employee.insertMany(EMPLOYEES)
    console.log(`Inserted ${employees.length} employees`)

    // Insert holidays
    const holidays = await Holiday.insertMany(HOLIDAYS)
    console.log(`Inserted ${holidays.length} holidays`)

    // Insert some reminders for the first few employees
    const reminders = [
        { employeeId: employees[0]._id, title: 'Submit sprint report', date: new Date(y, m, 18), note: 'Include velocity metrics', isAlarm: true },
        { employeeId: employees[0]._id, title: 'Code review for PR #42', date: new Date(y, m, 20), note: '', isAlarm: false },
        { employeeId: employees[1]._id, title: 'Update API documentation', date: new Date(y, m, 17), note: 'Focus on auth endpoints', isAlarm: false },
        { employeeId: employees[1]._id, title: 'Deploy staging build', date: new Date(y, m, 22), note: 'Run smoke tests after', isAlarm: true },
        { employeeId: employees[2]._id, title: 'UI component library review', date: new Date(y, m, 19), note: 'Check accessibility', isAlarm: false },
        { employeeId: employees[3]._id, title: 'Prepare project status deck', date: new Date(y, m, 16), note: 'For leadership review', isAlarm: true },
        { employeeId: employees[3]._id, title: 'Budget review meeting prep', date: new Date(y, m, 24), note: '', isAlarm: false },
        { employeeId: employees[4]._id, title: 'Regression test run', date: new Date(y, m, 21), note: 'Full suite before release', isAlarm: true },
    ]
    await Reminder.insertMany(reminders)
    console.log(`Inserted ${reminders.length} reminders`)

    console.log('\nDone! Demo data ready.')
    await mongoose.connection.close()
}

run().catch(async (err) => {
    console.error('Seed failed:', err.message)
    await mongoose.connection.close().catch(() => {})
    process.exit(1)
})
