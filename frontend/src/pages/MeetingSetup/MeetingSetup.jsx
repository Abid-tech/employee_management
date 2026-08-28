import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './MeetingSetup.css'

const API_URL =
  import.meta.env.VITE_API_URL ||
  'http://localhost:5001'

function MeetingSetup() {
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [duration, setDuration] = useState('60')
  const [camera, setCamera] = useState(true)
  const [microphone, setMicrophone] = useState(true)
  const [access, setAccess] = useState('anyone')
  const [participantLimit, setParticipantLimit] = useState('50')

  const [link, setLink] = useState('')
  const [meetingId, setMeetingId] = useState('')

  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  // ========================================================================
  // CREATE MEETING IN MONGODB
  // ========================================================================

  const createMeeting = async () => {
    if (creating) {
      return
    }

    setCreating(true)
    setError('')

    try {
      const response = await fetch(
        `${API_URL}/api/meetings`,
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json',
          },

          body: JSON.stringify({
            title:
              title.trim() ||
              'Untitled Meeting',

            description:
              description.trim(),

            date,

            time,

            duration:
              Number(duration),

            camera,

            microphone,

            access,

            participantLimit:
              Number(participantLimit),
          }),
        }
      )

      const data =
        await response.json()

      if (!response.ok) {
        throw new Error(
          data.message ||
          'Failed to create meeting.'
        )
      }

      if (
        !data.meeting ||
        !data.meeting.meetingId
      ) {
        throw new Error(
          'Server did not return a meeting ID.'
        )
      }

      const newMeetingId =
        data.meeting.meetingId

      console.log(
        '[MeetingSetup] MongoDB meeting created:',
        newMeetingId
      )

      setMeetingId(
        newMeetingId
      )

      /*
       * This is now the REAL meeting link.
       *
       * Do NOT use meet.example.com because
       * that is only a dummy domain.
       */
      const meetingLink =
        `${window.location.origin}/meeting/${newMeetingId}`

      setLink(
        meetingLink
      )

      return newMeetingId

    } catch (err) {

      console.error(
        '[MeetingSetup] Create meeting error:',
        err
      )

      setError(
        err.message ||
        'Unable to create meeting.'
      )

      return null

    } finally {

      setCreating(false)
    }
  }

  // ========================================================================
  // GENERATE LINK
  // ========================================================================

  const generateMeetingLink =
    async () => {

      if (meetingId) {
        return
      }

      await createMeeting()
    }

  // ========================================================================
  // START MEETING
  // ========================================================================

  const handleStartMeeting =
    async () => {

      /*
       * If a meeting hasn't been created yet,
       * create it first.
       */
      let currentMeetingId =
        meetingId

      if (!currentMeetingId) {

        currentMeetingId =
          await createMeeting()

        if (!currentMeetingId) {
          return
        }
      }

      /*
       * Mark meeting as active in MongoDB.
       */
      try {

        const response =
          await fetch(
            `${API_URL}/api/meetings/${currentMeetingId}/start`,
            {
              method: 'POST',

              headers: {
                'Content-Type':
                  'application/json',
              },
            }
          )

        const data =
          await response.json()

        if (!response.ok) {
          throw new Error(
            data.message ||
            'Failed to start meeting.'
          )
        }

      } catch (err) {

        console.error(
          '[MeetingSetup] Start meeting error:',
          err
        )

        setError(
          err.message ||
          'Unable to start meeting.'
        )

        return
      }

      /*
       * IMPORTANT:
       *
       * We now navigate using the ID
       * that actually exists in MongoDB.
       */
      navigate(
        `/meeting/${currentMeetingId}/host`
      )
    }

  // ========================================================================
  // COPY LINK
  // ========================================================================

  const copyMeetingLink =
    async () => {

      if (!link) {
        return
      }

      try {

        await navigator.clipboard.writeText(
          link
        )

        console.log(
          'Meeting link copied.'
        )

      } catch (err) {

        console.error(
          'Unable to copy meeting link:',
          err
        )
      }
    }

  // ========================================================================
  // RENDER
  // ========================================================================

  return (
    <main className="meeting-setup-page">

      <section className="meeting-setup-card">

        <div className="meeting-setup-heading">

          <div>

            <span className="meeting-eyebrow">
              MEETING ROOM
            </span>

            <h1>
              Create a meeting
            </h1>

            <p>
              Set up your meeting before inviting participants.
            </p>

          </div>

          <div className="meeting-step">
            01 / 03
          </div>

        </div>

        <div className="meeting-form">

          {/* ================================================================
              TITLE
          ================================================================ */}

          <div className="form-field full-width">

            <label htmlFor="meeting-title">
              Meeting title
            </label>

            <input
              id="meeting-title"
              value={title}
              onChange={(e) =>
                setTitle(e.target.value)
              }
              placeholder="e.g. Weekly Project Discussion"
            />

          </div>

          {/* ================================================================
              DESCRIPTION
          ================================================================ */}

          <div className="form-field full-width">

            <label htmlFor="meeting-description">
              Description
            </label>

            <textarea
              id="meeting-description"
              value={description}
              onChange={(e) =>
                setDescription(
                  e.target.value
                )
              }
              placeholder="What will this meeting be about?"
              rows="3"
            />

          </div>

          {/* ================================================================
              DATE / TIME / DURATION
          ================================================================ */}

          <div className="form-grid three-columns">

            <div className="form-field">

              <label htmlFor="meeting-date">
                Date
              </label>

              <input
                id="meeting-date"
                type="date"
                value={date}
                onChange={(e) =>
                  setDate(e.target.value)
                }
              />

            </div>

            <div className="form-field">

              <label htmlFor="meeting-time">
                Time
              </label>

              <input
                id="meeting-time"
                type="time"
                value={time}
                onChange={(e) =>
                  setTime(e.target.value)
                }
              />

            </div>

            <div className="form-field">

              <label htmlFor="meeting-duration">
                Duration
              </label>

              <select
                id="meeting-duration"
                value={duration}
                onChange={(e) =>
                  setDuration(
                    e.target.value
                  )
                }
              >

                <option value="30">
                  30 minutes
                </option>

                <option value="60">
                  1 hour
                </option>

                <option value="90">
                  1 hour 30 minutes
                </option>

                <option value="120">
                  2 hours
                </option>

                <option value="180">
                  3 hours
                </option>

              </select>

            </div>

          </div>

          {/* ================================================================
              SETTINGS
          ================================================================ */}

          <div className="settings-section">

            <div className="settings-section-heading">

              <div>

                <h2>
                  Meeting settings
                </h2>

                <p>
                  Choose the default audio and video state.
                </p>

              </div>

            </div>

            {/* CAMERA */}

            <div className="toggle-row">

              <div className="setting-info">

                <span className="setting-icon">
                  ◉
                </span>

                <div>

                  <strong>
                    Camera
                  </strong>

                  <span>
                    Start the meeting with your camera{' '}
                    {camera
                      ? 'on'
                      : 'off'}
                    .
                  </span>

                </div>

              </div>

              <button
                type="button"
                className={`switch ${
                  camera
                    ? 'active'
                    : ''
                }`}
                onClick={() =>
                  setCamera(
                    !camera
                  )
                }
                aria-label="Toggle camera"
                aria-pressed={camera}
              >

                <span />

              </button>

            </div>

            {/* MICROPHONE */}

            <div className="toggle-row">

              <div className="setting-info">

                <span className="setting-icon">
                  ◉
                </span>

                <div>

                  <strong>
                    Microphone
                  </strong>

                  <span>
                    Start the meeting with your microphone{' '}
                    {microphone
                      ? 'on'
                      : 'off'}
                    .
                  </span>

                </div>

              </div>

              <button
                type="button"
                className={`switch ${
                  microphone
                    ? 'active'
                    : ''
                }`}
                onClick={() =>
                  setMicrophone(
                    !microphone
                  )
                }
                aria-label="Toggle microphone"
                aria-pressed={microphone}
              >

                <span />

              </button>

            </div>

          </div>

          {/* ================================================================
              ACCESS
          ================================================================ */}

          <div className="form-grid access-grid">

            <div className="form-field">

              <label>
                Meeting access
              </label>

              <div className="access-options">

                <button
                  type="button"
                  className={`access-option ${
                    access === 'anyone'
                      ? 'selected'
                      : ''
                  }`}
                  onClick={() =>
                    setAccess(
                      'anyone'
                    )
                  }
                >

                  <span className="radio-dot" />

                  <span>

                    <strong>
                      Anyone with the link
                    </strong>

                    <small>
                      Anyone who has the meeting link can join.
                    </small>

                  </span>

                </button>

                <button
                  type="button"
                  className={`access-option ${
                    access === 'restricted'
                      ? 'selected'
                      : ''
                  }`}
                  onClick={() =>
                    setAccess(
                      'restricted'
                    )
                  }
                >

                  <span className="radio-dot" />

                  <span>

                    <strong>
                      Restricted
                    </strong>

                    <small>
                      Only invited participants can join.
                    </small>

                  </span>

                </button>

              </div>

            </div>

            {/* PARTICIPANT LIMIT */}

            <div className="form-field">

              <label htmlFor="participant-limit">
                Participant limit
              </label>

              <select
                id="participant-limit"
                value={
                  participantLimit
                }
                onChange={(e) =>
                  setParticipantLimit(
                    e.target.value
                  )
                }
              >

                <option value="10">
                  10 participants
                </option>

                <option value="25">
                  25 participants
                </option>

                <option value="50">
                  50 participants
                </option>

                <option value="100">
                  100 participants
                </option>

              </select>

            </div>

          </div>

          {/* ================================================================
              MEETING LINK
          ================================================================ */}

          <div className="meeting-link-box">

            <div>

              <span className="link-label">
                MEETING LINK
              </span>

              <strong>
                {link ||
                  'Generate a link when you are ready'}
              </strong>

            </div>

            <div
              style={{
                display: 'flex',
                gap: '8px',
              }}
            >

              {link && (

                <button
                  type="button"
                  className="secondary-button"
                  onClick={
                    copyMeetingLink
                  }
                >
                  Copy
                </button>

              )}

              <button
                type="button"
                className="secondary-button"
                onClick={
                  generateMeetingLink
                }
                disabled={creating}
              >

                {creating
                  ? 'Creating...'
                  : link
                    ? 'Created'
                    : 'Generate link'}

              </button>

            </div>

          </div>

          {/* ================================================================
              ERROR
          ================================================================ */}

          {error && (

            <div
              style={{
                padding: '12px 16px',
                borderRadius: '8px',
                background: '#ffeaea',
                color: '#b00020',
                marginTop: '12px',
              }}
            >
              {error}
            </div>

          )}

          {/* ================================================================
              ACTIONS
          ================================================================ */}

          <div className="setup-actions">

            <button
              type="button"
              className="secondary-button cancel-button"
              onClick={() =>
                navigate('/')
              }
              disabled={creating}
            >
              Cancel
            </button>

            <button
              type="button"
              className="primary-button"
              onClick={
                handleStartMeeting
              }
              disabled={creating}
            >

              {creating
                ? 'Creating meeting...'
                : 'Start meeting'}

              {!creating && (
                <span>
                  →
                </span>
              )}

            </button>

          </div>

        </div>

      </section>

    </main>
  )
}

export default MeetingSetup