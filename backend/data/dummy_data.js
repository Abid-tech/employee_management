// Dummy data for Module 3 (Task & Objective Management).
//
// It lives in memory rather than in MongoDB for now, so the module runs with no
// database setup. When the team is ready to persist it, the shape below already
// matches what a Mongoose schema would hold — only the store changes.

const DEPARTMENTS = [
    { name: 'Engineering', mark: '</>', blurb: 'Builds and runs the product' },
    { name: 'Design', mark: '◈', blurb: 'Research, interface and brand' },
    { name: 'Marketing', mark: '◆', blurb: 'Demand, content and campaigns' },
    { name: 'Human Resources', mark: '☺', blurb: 'Hiring, people and policy' }
]

const EMPLOYEES = [
    { id: 'u1', name: 'Golam Rabbani Shanto', jobTitle: 'Engineering Lead', department: 'Engineering', color: '#1C5D8C' },
    { id: 'u2', name: 'Rima Sultana', jobTitle: 'Senior Frontend Engineer', department: 'Engineering', color: '#2E7D6F' },
    { id: 'u3', name: 'Ayan Mahmud', jobTitle: 'Backend Engineer', department: 'Engineering', color: '#B2622F' },
    { id: 'u4', name: 'Rahim Uddin', jobTitle: 'Full-stack Engineer', department: 'Engineering', color: '#3D6A94' },
    { id: 'u5', name: 'Sadia Karim', jobTitle: 'QA Engineer', department: 'Engineering', color: '#7A4E9B' },
    { id: 'u6', name: 'Farhana Islam', jobTitle: 'Design Lead', department: 'Design', color: '#C2455E' },
    { id: 'u7', name: 'Karim Chowdhury', jobTitle: 'UI Designer', department: 'Design', color: '#D08A2E' },
    { id: 'u8', name: 'Mehedi Hasan', jobTitle: 'Marketing Lead', department: 'Marketing', color: '#A8442E' },
    { id: 'u9', name: 'Sumaiya Akter', jobTitle: 'Content Strategist', department: 'Marketing', color: '#2F6E8F' },
    { id: 'u10', name: 'Nusrat Jahan', jobTitle: 'HR Manager', department: 'Human Resources', color: '#7C4D8B' },
    { id: 'u11', name: 'Shakib Rahman', jobTitle: 'Recruiter', department: 'Human Resources', color: '#357A6B' },
    { id: 'u12', name: 'Moumita Heena', jobTitle: 'Product Delivery Manager', department: 'Engineering', color: '#8B5E3C' }
]

const days = (n) => {
    const date = new Date()
    date.setDate(date.getDate() + n)
    date.setHours(18, 0, 0, 0)
    return date.toISOString()
}

// Projects. They deliberately cut across departments — that is the whole reason
// they exist alongside them, and why the project page can answer a question the
// per-department orbit never can.
//
// The dates are relative to whenever the seed is run, so the demo never goes
// stale: one project is always overdue, one is close, one has room.
const OBJECTIVES = [
    {
        id: 'o1',
        title: 'Launch the client portal v2',
        client: 'Meghna Group',
        description: 'Replace the v1 portal with self-service invoices, SSO and a rebuilt order list.',
        startDate: days(-24),
        dueDate: days(9),
        status: 'active'
    },
    {
        id: 'o2',
        title: 'Mobile beta for field staff',
        client: 'Internal',
        description: 'A field app that works offline and syncs job status when the signal comes back.',
        startDate: days(-12),
        dueDate: days(26),
        status: 'active'
    },
    {
        id: 'o3',
        title: 'Q3 brand and site refresh',
        client: 'Northwind Digital',
        description: 'New brand system applied across the marketing site, with the campaign to launch it.',
        startDate: days(-18),
        dueDate: days(-2),
        status: 'active'
    },
    {
        id: 'o4',
        title: 'Hire six engineers',
        client: 'Internal',
        description: 'Two backend, two frontend, one QA and one lead, all in post before the portal ships.',
        startDate: days(-30),
        dueDate: days(40),
        status: 'active'
    },
    {
        id: 'o5',
        title: 'Platform reliability push',
        client: 'Internal',
        description: 'Alerting, failover rehearsal and the background job backlog, after two incidents in a month.',
        startDate: days(-9),
        dueDate: days(-1),
        status: 'active'
    }
]

const TASKS = [
    // --- Engineering --------------------------------------------------------
    {
        id: 't1',
        title: 'Fix the login API token refresh',
        description: 'Sessions drop after fifteen minutes on slow connections because the refresh call races the expiry. Reproduce on a throttled network first.',
        department: 'Engineering', assigneeId: 'u3', objectiveId: 'o1',
        priority: 'critical', status: 'in_progress',
        estimateHours: 8, spentHours: 3, dueDate: days(1), createdAt: days(-4),
        subtasks: [
            { id: 's1', title: 'Reproduce the bug', done: true },
            { id: 's2', title: 'Patch the token refresh', done: false },
            { id: 's3', title: 'Add a regression test', done: false }
        ]
    },
    {
        id: 't2',
        title: 'Single sign-on with the corporate directory',
        description: 'SAML flow against the customer directory, including group-to-role mapping on first login.',
        department: 'Engineering', assigneeId: 'u1', objectiveId: 'o1',
        priority: 'critical', status: 'in_progress',
        estimateHours: 24, spentHours: 15, dueDate: days(2), createdAt: days(-10),
        subtasks: [
            { id: 's4', title: 'Metadata exchange with the client', done: true },
            { id: 's5', title: 'Assertion parsing and validation', done: true },
            { id: 's6', title: 'Role mapping rules', done: false },
            { id: 's7', title: 'Session handling and logout', done: false }
        ]
    },
    {
        id: 't3',
        title: 'Rebuild the invoice list screen',
        description: 'Paginated invoice table with filters for status and date range. Replaces the old scrolling list that loads every record at once.',
        department: 'Engineering', assigneeId: 'u2', objectiveId: 'o1',
        priority: 'high', status: 'in_progress',
        estimateHours: 16, spentHours: 9, dueDate: days(3), createdAt: days(-8),
        subtasks: [
            { id: 's8', title: 'Table component with sorting', done: true },
            { id: 's9', title: 'Status and date filters', done: true },
            { id: 's10', title: 'Empty and loading states', done: false },
            { id: 's11', title: 'Wire to the invoices endpoint', done: false }
        ]
    },
    {
        id: 't4',
        title: 'Document download service',
        description: 'Signed, expiring download links so documents are never served straight from storage.',
        department: 'Engineering', assigneeId: 'u3', objectiveId: 'o1',
        priority: 'high', status: 'todo',
        estimateHours: 12, spentHours: 0, dueDate: days(6), createdAt: days(-1),
        subtasks: []
    },
    {
        id: 't5',
        title: 'Alerting for failed background jobs',
        description: 'Nobody notices a failed nightly job until a customer asks. Route failures to the on-call channel.',
        department: 'Engineering', assigneeId: 'u4', objectiveId: 'o5',
        priority: 'critical', status: 'todo',
        estimateHours: 10, spentHours: 0, dueDate: days(-2), createdAt: days(-6),
        subtasks: []
    },
    {
        id: 't6',
        title: 'Regression suite for the invoice flow',
        description: 'Cover the paths that broke in the last release: partial payments, credit notes, and multi-currency totals.',
        department: 'Engineering', assigneeId: 'u5', objectiveId: 'o1',
        priority: 'high', status: 'todo',
        estimateHours: 14, spentHours: 0, dueDate: days(9), createdAt: days(0),
        subtasks: []
    },
    {
        id: 't7',
        title: 'Build the navigation component',
        description: 'Shared navigation for the portal, including the mobile drawer and the account menu.',
        department: 'Engineering', assigneeId: 'u2', objectiveId: 'o1',
        priority: 'medium', status: 'in_progress',
        estimateHours: 12, spentHours: 7, dueDate: days(5), createdAt: days(-6),
        subtasks: [
            { id: 's12', title: 'Responsive layout', done: true },
            { id: 's13', title: 'Dropdown menu', done: true },
            { id: 's14', title: 'Mobile drawer', done: false }
        ]
    },
    {
        id: 't8',
        title: 'Offline queue for status updates',
        description: 'Hold updates locally when the device is offline and replay them in order once it reconnects.',
        department: 'Engineering', assigneeId: null, objectiveId: 'o2',
        priority: 'high', status: 'todo',
        estimateHours: 16, spentHours: 0, dueDate: days(20), createdAt: days(-1),
        subtasks: []
    },
    {
        id: 't9',
        title: 'Job status screen for field engineers',
        description: "One screen: today's jobs, a status control, and a notes box that works with no signal.",
        department: 'Engineering', assigneeId: 'u4', objectiveId: 'o2',
        priority: 'medium', status: 'todo',
        estimateHours: 18, spentHours: 0, dueDate: days(16), createdAt: days(-2),
        subtasks: []
    },
    {
        id: 't10',
        title: 'Database failover rehearsal',
        description: 'Practise the failover on staging and time it, so the real thing is not the first attempt.',
        department: 'Engineering', assigneeId: 'u3', objectiveId: 'o5',
        priority: 'low', status: 'todo',
        estimateHours: 8, spentHours: 0, dueDate: days(25), createdAt: days(-3),
        subtasks: []
    },
    {
        id: 't11',
        title: 'Prepare the monthly delivery review',
        description: 'What shipped, what slipped, and why — for the leadership team.',
        department: 'Engineering', assigneeId: 'u12', objectiveId: null,
        priority: 'medium', status: 'todo',
        estimateHours: 6, spentHours: 0, dueDate: days(7), createdAt: days(-1),
        subtasks: []
    },
    {
        id: 't12',
        title: 'Set up staging environment',
        description: 'Isolated staging stack with anonymised production data.',
        department: 'Engineering', assigneeId: 'u4', objectiveId: 'o5',
        priority: 'high', status: 'done',
        estimateHours: 8, spentHours: 7, dueDate: days(-14), createdAt: days(-20),
        subtasks: []
    },

    // --- Design -------------------------------------------------------------
    {
        id: 't13',
        title: 'Portal design system pass',
        description: 'One set of buttons, inputs and table styles across the portal, replacing the four variants that grew over time.',
        department: 'Design', assigneeId: 'u6', objectiveId: 'o1',
        priority: 'high', status: 'review',
        estimateHours: 10, spentHours: 10, dueDate: days(3), createdAt: days(-14),
        subtasks: [
            { id: 's15', title: 'Audit the existing components', done: true },
            { id: 's16', title: 'Token sheet for colour and spacing', done: true },
            { id: 's17', title: 'Hand-off notes for engineering', done: true }
        ]
    },
    {
        id: 't14',
        title: 'Design the mobile task cards',
        description: "Cards readable at arm's length in daylight, with the status control reachable by thumb.",
        department: 'Design', assigneeId: 'u7', objectiveId: 'o2',
        priority: 'medium', status: 'in_progress',
        estimateHours: 10, spentHours: 6, dueDate: days(7), createdAt: days(-4),
        subtasks: [
            { id: 's18', title: 'Layout options', done: true },
            { id: 's19', title: 'Contrast test outdoors', done: false }
        ]
    },
    {
        id: 't15',
        title: 'New visual language for the product',
        description: 'Colour, type and spacing decided once, documented, and applied to the shared components.',
        department: 'Design', assigneeId: 'u6', objectiveId: 'o3',
        priority: 'medium', status: 'in_progress',
        estimateHours: 24, spentHours: 11, dueDate: days(12), createdAt: days(-14),
        subtasks: [
            { id: 's20', title: 'Colour and contrast study', done: true },
            { id: 's21', title: 'Type scale', done: true },
            { id: 's22', title: 'Component examples', done: false },
            { id: 's23', title: 'Written guidelines', done: false }
        ]
    },
    {
        id: 't16',
        title: 'Icon set for the dashboard',
        description: 'One consistent set at two sizes, replacing the mix of three libraries currently in use.',
        department: 'Design', assigneeId: 'u7', objectiveId: 'o3',
        priority: 'low', status: 'todo',
        estimateHours: 12, spentHours: 0, dueDate: days(22), createdAt: days(-1),
        subtasks: []
    },
    {
        id: 't17',
        title: 'Accessibility audit of the portal',
        description: 'Keyboard navigation, contrast and screen reader labels across the twelve main screens.',
        department: 'Design', assigneeId: 'u6', objectiveId: 'o1',
        priority: 'high', status: 'todo',
        estimateHours: 12, spentHours: 0, dueDate: days(4), createdAt: days(-2),
        subtasks: []
    },

    // --- Marketing ----------------------------------------------------------
    {
        id: 't18',
        title: 'Write the garments sector case study',
        description: 'One customer, real numbers, and their permission to use the name.',
        department: 'Marketing', assigneeId: 'u9', objectiveId: null,
        priority: 'high', status: 'todo',
        estimateHours: 12, spentHours: 0, dueDate: days(5), createdAt: days(-2),
        subtasks: []
    },
    {
        id: 't19',
        title: 'Rewrite the marketing site copy',
        description: 'Say what the product does in the first sentence of every page.',
        department: 'Marketing', assigneeId: 'u9', objectiveId: 'o3',
        priority: 'medium', status: 'in_progress',
        estimateHours: 16, spentHours: 7, dueDate: days(10), createdAt: days(-9),
        subtasks: [
            { id: 's24', title: 'Home and pricing', done: true },
            { id: 's25', title: 'Product pages', done: false },
            { id: 's26', title: 'About and careers', done: false }
        ]
    },
    {
        id: 't20',
        title: 'Run the LinkedIn campaign experiment',
        description: 'Two audiences, two messages, a fixed budget, and one clear read on cost per demo.',
        department: 'Marketing', assigneeId: 'u8', objectiveId: null,
        priority: 'medium', status: 'in_progress',
        estimateHours: 12, spentHours: 4, dueDate: days(9), createdAt: days(-6),
        subtasks: []
    },
    {
        id: 't21',
        title: 'Produce the two-minute demo video',
        description: 'Screen recording with a voiceover, showing one whole job from brief to finished plan.',
        department: 'Marketing', assigneeId: 'u8', objectiveId: 'o3',
        priority: 'low', status: 'todo',
        estimateHours: 16, spentHours: 0, dueDate: days(28), createdAt: days(0),
        subtasks: []
    },
    {
        id: 't22',
        title: 'Refresh the pricing page copy',
        description: 'Shorter, clearer, and honest about what each plan does not include.',
        department: 'Marketing', assigneeId: 'u9', objectiveId: 'o3',
        priority: 'critical', status: 'todo',
        estimateHours: 6, spentHours: 0, dueDate: days(-1), createdAt: days(-5),
        subtasks: []
    },

    // --- Human Resources ----------------------------------------------------
    {
        id: 't23',
        title: 'Source backend candidates',
        description: 'Twelve qualified candidates at first-call stage for the two backend roles.',
        department: 'Human Resources', assigneeId: 'u11', objectiveId: 'o4',
        priority: 'critical', status: 'in_progress',
        estimateHours: 20, spentHours: 12, dueDate: days(2), createdAt: days(-14),
        subtasks: [
            { id: 's27', title: 'Job description', done: true },
            { id: 's28', title: 'Post to the boards', done: true },
            { id: 's29', title: 'First-call screening', done: false }
        ]
    },
    {
        id: 't24',
        title: 'Write the engineering interview rubric',
        description: 'Same questions, same scoring, so two candidates seen by different panels can be compared.',
        department: 'Human Resources', assigneeId: 'u10', objectiveId: 'o4',
        priority: 'high', status: 'in_progress',
        estimateHours: 12, spentHours: 6, dueDate: days(4), createdAt: days(-8),
        subtasks: [
            { id: 's30', title: 'Backend rubric', done: true },
            { id: 's31', title: 'Frontend rubric', done: true },
            { id: 's32', title: 'Scoring sheet', done: false }
        ]
    },
    {
        id: 't25',
        title: 'Write the Ramadan working hours policy',
        description: 'Written down once so each team stops agreeing something slightly different.',
        department: 'Human Resources', assigneeId: 'u10', objectiveId: null,
        priority: 'medium', status: 'todo',
        estimateHours: 6, spentHours: 0, dueDate: days(14), createdAt: days(-1),
        subtasks: []
    },
    {
        id: 't26',
        title: 'Set up the referral bonus scheme',
        description: 'Referrals convert best and cost least; the scheme just needs writing down and announcing.',
        department: 'Human Resources', assigneeId: 'u11', objectiveId: 'o4',
        priority: 'low', status: 'todo',
        estimateHours: 6, spentHours: 0, dueDate: days(26), createdAt: days(0),
        subtasks: []
    },
    {
        id: 't27',
        title: 'Run the quarterly access review',
        description: 'Check every production account still belongs to somebody who works here.',
        department: 'Human Resources', assigneeId: 'u10', objectiveId: null,
        priority: 'medium', status: 'done',
        estimateHours: 6, spentHours: 5, dueDate: days(-8), createdAt: days(-16),
        subtasks: []
    }
]

module.exports = { DEPARTMENTS, EMPLOYEES, OBJECTIVES, TASKS }
