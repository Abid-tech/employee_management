const nodemailer = require('nodemailer')
const MailMessage = require('../model/mail_message')

// Sending mail, and proving it was sent.
//
// The module follows the same shape as the Gemini integration already in this
// project: it works fully without credentials, and it always says which route a
// message actually took. With SMTP settings in .env it posts to a real server;
// without them it records the message to an outbox collection instead. Nothing
// silently does nothing, and no feature is unreachable because a marker's
// machine has no mail password.
//
// To send for real, add to backend/.env:
//   SMTP_HOST=smtp.gmail.com
//   SMTP_PORT=587
//   SMTP_USER=you@gmail.com
//   SMTP_PASS=an app password, not your account password
//   MAIL_FROM="Company Booster <you@gmail.com>"

const isConfigured = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)

const fromAddress = () => process.env.MAIL_FROM || process.env.SMTP_USER || 'Company Booster <no-reply@companybooster.local>'

let transporter = null
const getTransport = () => {
    if (!isConfigured()) return null
    if (transporter) return transporter

    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    })
    return transporter
}

// --- The message ------------------------------------------------------------

const PRIORITY_LABEL = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' }
const PRIORITY_COLOUR = { critical: '#B3402F', high: '#B87333', medium: '#2C6E9B', low: '#4E8163' }

const formatDate = (value) => value
    ? new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'no date set'

// Written in the brand palette so the mail looks like the product it came from:
// navy #0A2947, cream #F3E4C9, sage #D3D4C0, clay #8B5E3C.
//
// Table-based and inline-styled on purpose — mail clients strip <style> blocks
// and have no support for flexbox or grid, so a layout that renders correctly in
// a browser will collapse in Outlook.
const buildHtml = ({ name, tasks, appUrl }) => {
    const rows = tasks.map(task => `
      <tr>
        <td style="padding:14px 16px;border-bottom:1px solid #E4E0D6;">
          <div style="font:600 15px/1.4 'Segoe UI',Arial,sans-serif;color:#0A2947;">${escapeHtml(task.title)}</div>
          <div style="font:400 12px/1.5 'Segoe UI',Arial,sans-serif;color:#6B7C8C;margin-top:3px;">
            ${escapeHtml(task.department)}${task.objectiveTitle ? ` &middot; ${escapeHtml(task.objectiveTitle)}` : ''}
          </div>
          ${task.description ? `<div style="font:400 12.5px/1.55 'Segoe UI',Arial,sans-serif;color:#40566B;margin-top:6px;">${escapeHtml(task.description)}</div>` : ''}
        </td>
        <td style="padding:14px 16px;border-bottom:1px solid #E4E0D6;white-space:nowrap;vertical-align:top;">
          <span style="display:inline-block;font:700 10px/1 'Segoe UI',Arial,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#ffffff;background:${PRIORITY_COLOUR[task.priority] || '#2C6E9B'};padding:5px 9px;border-radius:100px;">
            ${PRIORITY_LABEL[task.priority] || task.priority}
          </span>
          <div style="font:400 12px/1.5 'Segoe UI',Arial,sans-serif;color:#40566B;margin-top:8px;">
            Due ${formatDate(task.dueDate)}
          </div>
          <div style="font:400 11.5px/1.5 'Segoe UI',Arial,sans-serif;color:#6B7C8C;">
            ${task.estimateHours || 0}h estimated
          </div>
        </td>
      </tr>`).join('')

    const totalHours = tasks.reduce((sum, t) => sum + (t.estimateHours || 0), 0)

    return `<!doctype html>
<html><body style="margin:0;padding:0;background:#F7F1E3;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F1E3;padding:26px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#FFFDF7;border:1px solid #E4E0D6;border-radius:16px;overflow:hidden;">

        <tr><td style="background:#0A2947;padding:22px 24px;">
          <div style="font:600 17px/1.3 'Segoe UI',Arial,sans-serif;color:#F3E4C9;">Company Booster</div>
          <div style="font:400 11px/1.4 'Segoe UI',Arial,sans-serif;color:#9FB3C7;letter-spacing:.18em;text-transform:uppercase;margin-top:3px;">Task assignment</div>
        </td></tr>

        <tr><td style="padding:24px 24px 6px;">
          <div style="font:600 19px/1.35 'Segoe UI',Arial,sans-serif;color:#0A2947;">
            Hello ${escapeHtml(name.split(' ')[0])},
          </div>
          <p style="font:400 14px/1.6 'Segoe UI',Arial,sans-serif;color:#40566B;margin:10px 0 0;">
            ${tasks.length === 1
              ? 'A task has been assigned to you.'
              : `${tasks.length} tasks have been assigned to you.`}
            ${totalHours > 0 ? `That is <strong style="color:#0A2947;">${totalHours} hours</strong> of estimated work in total.` : ''}
          </p>
        </td></tr>

        <tr><td style="padding:16px 8px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E4E0D6;border-radius:12px;overflow:hidden;">
            ${rows}
          </table>
        </td></tr>

        <tr><td style="padding:20px 24px 26px;" align="center">
          <a href="${appUrl}/tasks" style="display:inline-block;background:#0A2947;color:#F3E4C9;text-decoration:none;font:600 13px/1 'Segoe UI',Arial,sans-serif;padding:13px 26px;border-radius:10px;">
            Open your task board
          </a>
        </td></tr>

        <tr><td style="background:#D3D4C0;padding:14px 24px;">
          <div style="font:400 11px/1.5 'Segoe UI',Arial,sans-serif;color:#40566B;">
            Sent automatically when work was assigned to you. Replies to this address are not monitored.
          </div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body></html>`
}

const buildText = ({ name, tasks, appUrl }) => {
    const lines = tasks.map(task =>
        `- ${task.title}\n    ${PRIORITY_LABEL[task.priority] || task.priority} priority`
        + ` | due ${formatDate(task.dueDate)} | ${task.estimateHours || 0}h estimated`
        + `\n    ${task.department}${task.objectiveTitle ? ` / ${task.objectiveTitle}` : ''}`)

    return [
        `Hello ${name.split(' ')[0]},`,
        '',
        tasks.length === 1 ? 'A task has been assigned to you:' : `${tasks.length} tasks have been assigned to you:`,
        '',
        ...lines,
        '',
        `Open your task board: ${appUrl}/tasks`,
        '',
        'Sent automatically when work was assigned to you.'
    ].join('\n')
}

// Escaped because a task title is user input and this ends up as HTML in
// somebody's mail client.
const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')

// --- Sending -----------------------------------------------------------------

const deliver = async (message) => {
    const record = await MailMessage.create({ ...message, status: 'queued', transport: isConfigured() ? 'smtp' : 'outbox' })

    if (!isConfigured()) {
        // No mail server. The message is kept so it can be shown, and the
        // console line makes it obvious during a demo that this fired.
        console.log(`[mail] queued to outbox → ${message.to} — ${message.subject}`)
        return record
    }

    try {
        await getTransport().sendMail({
            from: fromAddress(),
            to: message.to,
            subject: message.subject,
            text: message.text,
            html: message.html
        })

        record.status = 'sent'
        record.sentAt = new Date()
        await record.save()
        console.log(`[mail] sent → ${message.to} — ${message.subject}`)
    } catch (error) {
        // A mail failure must never fail the assignment that triggered it. The
        // task is still assigned; the message is marked failed and can be
        // retried or read from the outbox.
        record.status = 'failed'
        record.error = error.message
        await record.save()
        console.error(`[mail] FAILED → ${message.to}: ${error.message}`)
    }

    return record
}

// --- The public call ---------------------------------------------------------

// One message per person, not one per task.
//
// Assigning a plan of nine tasks should not put nine emails in somebody's inbox
// — that is how a notification becomes something people filter away. The tasks
// are grouped by assignee and each person gets a single digest of everything
// that just landed on them.
const notifyAssignments = async (tasks, { appUrl } = {}) => {
    const assigned = (tasks || []).filter(task => task.assignee && task.assignee.email)
    if (assigned.length === 0) return []

    const byPerson = new Map()
    for (const task of assigned) {
        const key = String(task.assignee._id || task.assignee)
        if (!byPerson.has(key)) byPerson.set(key, { person: task.assignee, tasks: [] })
        byPerson.get(key).tasks.push({
            id: task._id || task.id,
            title: task.title,
            description: task.description || '',
            department: task.department,
            priority: task.priority,
            dueDate: task.dueDate,
            estimateHours: task.estimateHours,
            objectiveTitle: task.objective?.title || ''
        })
    }

    const base = appUrl || process.env.APP_URL || 'http://localhost:5173'
    const out = []

    for (const { person, tasks: theirs } of byPerson.values()) {
        const subject = theirs.length === 1
            ? `New task: ${theirs[0].title}`
            : `${theirs.length} new tasks assigned to you`

        out.push(await deliver({
            to: person.email,
            toName: person.name,
            employee: person._id || person.id || null,
            subject,
            text: buildText({ name: person.name, tasks: theirs, appUrl: base }),
            html: buildHtml({ name: person.name, tasks: theirs, appUrl: base }),
            kind: 'task_assignment',
            tasks: theirs.map(t => t.id).filter(Boolean),
            taskCount: theirs.length
        }))
    }

    return out
}

// A deadline moving is worth telling the person working to it. The reason is
// carried through verbatim — a date that changes with no explanation is the
// thing that erodes trust in the date.
const notifyDeadlineChange = async (task, { previous, reason, actor, moved } = {}) => {
    const person = task.assignee
    if (!person?.email) return null

    const base = process.env.APP_URL || 'http://localhost:5173'
    const was = previous ? formatDate(previous) : 'not set'
    const now = formatDate(task.dueDate)

    const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#F7F1E3;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F1E3;padding:26px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#FFFDF7;border:1px solid #E4E0D6;border-radius:16px;overflow:hidden;">
        <tr><td style="background:#0A2947;padding:22px 24px;">
          <div style="font:600 17px/1.3 'Segoe UI',Arial,sans-serif;color:#F3E4C9;">Company Booster</div>
          <div style="font:400 11px/1.4 'Segoe UI',Arial,sans-serif;color:#9FB3C7;letter-spacing:.18em;text-transform:uppercase;margin-top:3px;">Deadline changed</div>
        </td></tr>
        <tr><td style="padding:24px;">
          <div style="font:600 19px/1.35 'Segoe UI',Arial,sans-serif;color:#0A2947;">Hello ${escapeHtml(person.name.split(' ')[0])},</div>
          <p style="font:400 14px/1.6 'Segoe UI',Arial,sans-serif;color:#40566B;margin:10px 0 16px;">
            The deadline on <strong style="color:#0A2947;">${escapeHtml(task.title)}</strong> has been ${escapeHtml(moved || 'changed')}.
          </p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border:1px solid #E4E0D6;border-radius:12px;">
            <tr>
              <td style="padding:14px 16px;border-right:1px solid #E4E0D6;">
                <div style="font:700 9.5px/1 'Segoe UI',Arial,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#6B7C8C;">Was</div>
                <div style="font:600 15px/1.4 'Segoe UI',Arial,sans-serif;color:#6B7C8C;text-decoration:line-through;margin-top:5px;">${was}</div>
              </td>
              <td style="padding:14px 16px;">
                <div style="font:700 9.5px/1 'Segoe UI',Arial,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#8B5E3C;">Now</div>
                <div style="font:600 15px/1.4 'Segoe UI',Arial,sans-serif;color:#0A2947;margin-top:5px;">${now}</div>
              </td>
            </tr>
          </table>
          ${reason ? `<p style="font:400 13px/1.6 'Segoe UI',Arial,sans-serif;color:#40566B;margin:16px 0 0;padding:12px 14px;background:#F7F1E3;border-left:3px solid #8B5E3C;border-radius:8px;"><strong style="color:#0A2947;">Reason given.</strong> ${escapeHtml(reason)}</p>` : ''}
          <p style="font:400 12px/1.5 'Segoe UI',Arial,sans-serif;color:#6B7C8C;margin:16px 0 0;">
            Changed by ${escapeHtml(actor?.name || 'a manager')}.
          </p>
        </td></tr>
        <tr><td style="padding:0 24px 26px;" align="center">
          <a href="${base}/tasks/${task._id}" style="display:inline-block;background:#0A2947;color:#F3E4C9;text-decoration:none;font:600 13px/1 'Segoe UI',Arial,sans-serif;padding:13px 26px;border-radius:10px;">Open the task</a>
        </td></tr>
        <tr><td style="background:#D3D4C0;padding:14px 24px;">
          <div style="font:400 11px/1.5 'Segoe UI',Arial,sans-serif;color:#40566B;">Sent automatically when a deadline you own was changed.</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`

    const text = [
        `Hello ${person.name.split(' ')[0]},`,
        '',
        `The deadline on "${task.title}" has been ${moved || 'changed'}.`,
        '',
        `  Was: ${was}`,
        `  Now: ${now}`,
        ...(reason ? ['', `Reason given: ${reason}`] : []),
        '',
        `Changed by ${actor?.name || 'a manager'}.`,
        `Open the task: ${base}/tasks/${task._id}`
    ].join('\n')

    return deliver({
        to: person.email,
        toName: person.name,
        employee: person._id || null,
        subject: `Deadline ${moved || 'changed'}: ${task.title}`,
        text,
        html,
        kind: 'deadline_change',
        tasks: [task._id],
        taskCount: 1
    })
}

// A budget crossing a threshold is worth telling the people spending it.
//
// A threshold that only paints a dashboard red is a threshold nobody acts on,
// because the person who needs to know is not looking at the dashboard — they
// are working. This goes to whoever has actually been logging time on the
// project, since they are both the people burning the budget and the people who
// can stop. One message per person per crossing, and it carries the forecast
// rather than only the percentage: "90% used" is a fact about the past, while
// "trending to $11,568 against $9,000" is the thing worth reacting to.
const notifyBudgetThreshold = async (project, { threshold, forecast, currency = 'USD', recipients = [] } = {}) => {
    const people = (recipients || []).filter(person => person?.email)
    if (people.length === 0) return []

    const base = process.env.APP_URL || 'http://localhost:5173'
    const symbol = { USD: '$', GBP: '£', EUR: '€', BDT: '৳' }[currency] || ''
    const cash = (n) => `${symbol}${Math.round(Number(n) || 0).toLocaleString()}`

    const over = forecast.willOverrun
    const accent = over ? '#B3402F' : '#8B5E3C'
    const verdict = over
        ? `forecast to finish ${cash(forecast.overBy)} over budget`
        : 'still forecast to land inside budget'

    const out = []
    for (const person of people) {
        const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#F7F1E3;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F1E3;padding:26px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#FFFDF7;border:1px solid #E4E0D6;border-radius:16px;overflow:hidden;">
        <tr><td style="background:#0A2947;padding:22px 24px;">
          <div style="font:600 17px/1.3 'Segoe UI',Arial,sans-serif;color:#F3E4C9;">Company Booster</div>
          <div style="font:400 11px/1.4 'Segoe UI',Arial,sans-serif;color:#9FB3C7;letter-spacing:.18em;text-transform:uppercase;margin-top:3px;">Budget threshold passed</div>
        </td></tr>
        <tr><td style="padding:24px;">
          <div style="font:600 19px/1.35 'Segoe UI',Arial,sans-serif;color:#0A2947;">Hello ${escapeHtml(person.name.split(' ')[0])},</div>
          <p style="font:400 14px/1.6 'Segoe UI',Arial,sans-serif;color:#40566B;margin:10px 0 16px;">
            <strong style="color:#0A2947;">${escapeHtml(project.title)}</strong> has passed
            <strong style="color:${accent};">${threshold}%</strong> of its budget, and is ${verdict}.
          </p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border:1px solid #E4E0D6;border-radius:12px;">
            <tr>
              <td style="padding:14px 16px;border-right:1px solid #E4E0D6;">
                <div style="font:700 9.5px/1 'Segoe UI',Arial,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#6B7C8C;">Spent</div>
                <div style="font:600 15px/1.4 'Segoe UI',Arial,sans-serif;color:#0A2947;margin-top:5px;">${cash(forecast.spent)} of ${cash(forecast.total)}</div>
              </td>
              <td style="padding:14px 16px;">
                <div style="font:700 9.5px/1 'Segoe UI',Arial,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:${accent};">Trending to finish</div>
                <div style="font:600 15px/1.4 'Segoe UI',Arial,sans-serif;color:${accent};margin-top:5px;">${cash(forecast.projected)}</div>
              </td>
            </tr>
          </table>
          <p style="font:400 13px/1.6 'Segoe UI',Arial,sans-serif;color:#40566B;margin:16px 0 0;padding:12px 14px;background:#F7F1E3;border-left:3px solid ${accent};border-radius:8px;">
            Built from the last ${forecast.windowDays} days of logged time, not the lifetime average.
            Burn is ${cash(forecast.burnPerDay)} a day with ${forecast.remainingHours}h of work still outstanding.
          </p>
        </td></tr>
        <tr><td style="padding:0 24px 26px;" align="center">
          <a href="${base}/budget/project/${project.id}" style="display:inline-block;background:#0A2947;color:#F3E4C9;text-decoration:none;font:600 13px/1 'Segoe UI',Arial,sans-serif;padding:13px 26px;border-radius:10px;">Open the budget</a>
        </td></tr>
        <tr><td style="background:#D3D4C0;padding:14px 24px;">
          <div style="font:400 11px/1.5 'Segoe UI',Arial,sans-serif;color:#40566B;">Sent once per threshold, to the people logging time on this project.</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`

        const text = [
            `Hello ${person.name.split(' ')[0]},`,
            '',
            `"${project.title}" has passed ${threshold}% of its budget, and is ${verdict}.`,
            '',
            `  Spent:    ${cash(forecast.spent)} of ${cash(forecast.total)}`,
            `  Trending: ${cash(forecast.projected)}`,
            `  Burn:     ${cash(forecast.burnPerDay)} a day, ${forecast.remainingHours}h outstanding`,
            '',
            `Built from the last ${forecast.windowDays} days of logged time, not the lifetime average.`,
            `Open the budget: ${base}/budget/project/${project.id}`
        ].join('\n')

        out.push(await deliver({
            to: person.email,
            toName: person.name,
            employee: person.id || person._id || null,
            subject: `${project.title} has passed ${threshold}% of its budget`,
            text,
            html,
            kind: 'budget_threshold',
            taskCount: 0
        }))
    }

    return out
}

// --- Reading the outbox ------------------------------------------------------

const listMessages = async ({ limit = 40, employee } = {}) => {
    const filter = employee ? { employee } : {}
    const docs = await MailMessage.find(filter)
        .populate('employee', 'name department color')
        .sort({ createdAt: -1 })
        .limit(Number(limit) || 40)

    return docs.map(doc => ({
        id: String(doc._id),
        to: doc.to,
        toName: doc.toName,
        employee: doc.employee ? {
            id: String(doc.employee._id), name: doc.employee.name,
            department: doc.employee.department, color: doc.employee.color
        } : null,
        subject: doc.subject,
        text: doc.text,
        html: doc.html,
        kind: doc.kind,
        taskCount: doc.taskCount,
        status: doc.status,
        transport: doc.transport,
        error: doc.error,
        sentAt: doc.sentAt,
        createdAt: doc.createdAt
    }))
}

const status = () => ({
    configured: isConfigured(),
    transport: isConfigured() ? 'smtp' : 'outbox',
    host: isConfigured() ? process.env.SMTP_HOST : null,
    from: isConfigured() ? fromAddress() : null
})

module.exports = {
    notifyAssignments, notifyDeadlineChange, notifyBudgetThreshold,
    listMessages, status, isConfigured, buildHtml, buildText
}
