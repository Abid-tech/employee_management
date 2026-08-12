const { google } = require('googleapis')

// Reads credentials from environment variables.
// If any are missing, sync is silently skipped (the app works fine without it).
function getCalendarClient() {
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
    const key = process.env.GOOGLE_PRIVATE_KEY
    const calendarId = process.env.GOOGLE_CALENDAR_ID

    if (!email || !key || !calendarId) {
        return null
    }

    // The private key comes from .env with literal \n — replace them with real newlines
    const privateKey = key.replace(/\\n/g, '\n')

    const auth = new google.auth.JWT(email, null, privateKey, [
        'https://www.googleapis.com/auth/calendar',
    ])

    return { calendar: google.calendar({ version: 'v3', auth }), calendarId }
}

// Build the event body that Google Calendar expects
function buildEventBody(holiday) {
    const dateStr = new Date(holiday.date).toISOString().slice(0, 10)

    return {
        summary: holiday.name,
        description: holiday.description || `${holiday.type} holiday`,
        start: { date: dateStr },
        end: { date: dateStr },
    }
}

// Create a new event on the shared company calendar.
// Returns the Google event ID so we can update/delete it later.
async function createCalendarEvent(holiday) {
    const client = getCalendarClient()
    if (!client) {
        console.log('[Google Calendar] Credentials not set — skipping create sync')
        return ''
    }

    try {
        const res = await client.calendar.events.insert({
            calendarId: client.calendarId,
            requestBody: buildEventBody(holiday),
        })
        console.log('[Google Calendar] Created event:', res.data.id)
        return res.data.id
    } catch (err) {
        console.error('[Google Calendar] Failed to create event:', err.message)
        return ''
    }
}

// Update an existing event on the shared company calendar.
async function updateCalendarEvent(googleEventId, holiday) {
    if (!googleEventId) return

    const client = getCalendarClient()
    if (!client) {
        console.log('[Google Calendar] Credentials not set — skipping update sync')
        return
    }

    try {
        await client.calendar.events.update({
            calendarId: client.calendarId,
            eventId: googleEventId,
            requestBody: buildEventBody(holiday),
        })
        console.log('[Google Calendar] Updated event:', googleEventId)
    } catch (err) {
        console.error('[Google Calendar] Failed to update event:', err.message)
    }
}

// Delete an event from the shared company calendar.
async function deleteCalendarEvent(googleEventId) {
    if (!googleEventId) return

    const client = getCalendarClient()
    if (!client) {
        console.log('[Google Calendar] Credentials not set — skipping delete sync')
        return
    }

    try {
        await client.calendar.events.delete({
            calendarId: client.calendarId,
            eventId: googleEventId,
        })
        console.log('[Google Calendar] Deleted event:', googleEventId)
    } catch (err) {
        console.error('[Google Calendar] Failed to delete event:', err.message)
    }
}

module.exports = { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent }
