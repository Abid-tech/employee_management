import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import {
  useNavigate,
  useParams,
} from 'react-router-dom'

import { io } from 'socket.io-client'

import './MeetingParticipant.css'

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  'http://localhost:5001'

const API_URL =
  import.meta.env.VITE_API_URL ||
  'http://localhost:5001'

// ============================================================================
// MAIN
// ============================================================================

function MeetingParticipant() {

  const navigate =
    useNavigate()

  const { meetingId } =
    useParams()

  // ========================================================================
  // REFS
  // ========================================================================

  const localVideoRef =
    useRef(null)

  const remoteVideoRef =
    useRef(null)

  const localStreamRef =
    useRef(null)

  const remoteStreamRef =
    useRef(null)

  const socketRef =
    useRef(null)

  const peerConnectionsRef =
    useRef(new Map())

  const pendingIceRef =
    useRef(new Map())

  // ========================================================================
  // MEETING
  // ========================================================================

  const [meeting, setMeeting] =
    useState(null)

  const [meetingLoading, setMeetingLoading] =
    useState(true)

  const [meetingError, setMeetingError] =
    useState('')

  // ========================================================================
  // NAME
  // ========================================================================

  const [participantName, setParticipantName] =
    useState(() =>
      localStorage.getItem(
        'meetingParticipantName'
      ) || ''
    )

  const [nameSubmitted, setNameSubmitted] =
    useState(() =>
      Boolean(
        localStorage.getItem(
          'meetingParticipantName'
        )
      )
    )

  // ========================================================================
  // MEDIA
  // ========================================================================

  const [micOn, setMicOn] =
    useState(true)

  const [cameraOn, setCameraOn] =
    useState(true)

  const [mediaReady, setMediaReady] =
    useState(false)

  const [mediaError, setMediaError] =
    useState('')

  // ========================================================================
  // SOCKET
  // ========================================================================

  const [connected, setConnected] =
    useState(false)

  const [socketError, setSocketError] =
    useState('')

  // ========================================================================
  // REMOTE HOST
  // ========================================================================

  const [remoteParticipant, setRemoteParticipant] =
    useState(null)

  // ========================================================================
  // CHAT
  // ========================================================================

  const [messages, setMessages] =
    useState([])

  const [message, setMessage] =
    useState('')

  // ========================================================================
  // UI
  // ========================================================================

  const [chatOpen, setChatOpen] =
    useState(true)

  const [
    participantsOpen,
    setParticipantsOpen,
  ] = useState(true)

  const [elapsedSeconds, setElapsedSeconds] =
    useState(0)

  // ========================================================================
  // LOAD MEETING
  // ========================================================================

  useEffect(() => {

    let cancelled = false

    async function loadMeeting() {

      if (!meetingId) {

        setMeetingError(
          'Meeting ID is missing.'
        )

        setMeetingLoading(false)

        return
      }

      try {

        setMeetingLoading(true)

        const response =
          await fetch(
            `${API_URL}/api/meetings/${meetingId}`
          )

        const data =
          await response.json()

        if (!response.ok) {

          throw new Error(
            data.message ||
            'Meeting not found.'
          )

        }

        if (cancelled) {
          return
        }

        setMeeting(
          data.meeting
        )

        setMicOn(
          data.meeting.microphone ??
          true
        )

        setCameraOn(
          data.meeting.camera ??
          true
        )

        if (
          Array.isArray(
            data.meeting.messages
          )
        ) {

          setMessages(
            data.meeting.messages.map(
              (item) => ({
                id:
                  item.id,

                sender:
                  item.sender,

                initials:
                  getInitials(
                    item.sender
                  ),

                time:
                  formatMessageTime(
                    item.timestamp
                  ),

                text:
                  item.message,

                role:
                  item.role,

                timestamp:
                  item.timestamp,
              })
            )
          )

        }

      } catch (error) {

        console.error(
          'Participant meeting fetch error:',
          error
        )

        if (!cancelled) {

          setMeetingError(
            error.message ||
            'Unable to load meeting.'
          )

        }

      } finally {

        if (!cancelled) {
          setMeetingLoading(false)
        }

      }

    }

    loadMeeting()

    return () => {
      cancelled = true
    }

  }, [
    meetingId,
  ])

  // ========================================================================
  // TIMER
  // ========================================================================

  useEffect(() => {

    const timer =
      setInterval(() => {

        setElapsedSeconds(
          (current) =>
            current + 1
        )

      }, 1000)

    return () =>
      clearInterval(timer)

  }, [])

  const duration =
    useMemo(() => {

      const minutes =
        Math.floor(
          elapsedSeconds / 60
        )

      const seconds =
        elapsedSeconds % 60

      return `${String(
        minutes
      ).padStart(2, '0')}:${String(
        seconds
      ).padStart(2, '0')}`

    }, [
      elapsedSeconds,
    ])

  // ========================================================================
  // NAME SUBMIT
  // ========================================================================

  const handleNameSubmit =
    (event) => {

      event.preventDefault()

      const trimmed =
        participantName.trim()

      if (!trimmed) {
        return
      }

      localStorage.setItem(
        'meetingParticipantName',
        trimmed
      )

      setParticipantName(
        trimmed
      )

      setNameSubmitted(
        true
      )

    }

  // ========================================================================
  // LOCAL MEDIA
  // ========================================================================

  useEffect(() => {

    if (
      meetingLoading ||
      !meeting ||
      !nameSubmitted
    ) {
      return
    }

    let mounted = true

    async function startMedia() {

      try {

        setMediaError('')

        if (
          !navigator.mediaDevices ||
          !navigator.mediaDevices.getUserMedia
        ) {

          setMediaError(
            'Your browser does not support camera and microphone access.'
          )

          return
        }

        const stream =
          await navigator.mediaDevices.getUserMedia(
            {
              video: true,
              audio: true,
            }
          )

        if (!mounted) {

          stream
            .getTracks()
            .forEach(
              (track) =>
                track.stop()
            )

          return
        }

        localStreamRef.current =
          stream

        const videoTrack =
          stream.getVideoTracks()[0]

        const audioTrack =
          stream.getAudioTracks()[0]

        if (videoTrack) {

          videoTrack.enabled =
            meeting.camera ??
            true

          setCameraOn(
            videoTrack.enabled
          )

        }

        if (audioTrack) {

          audioTrack.enabled =
            meeting.microphone ??
            true

          setMicOn(
            audioTrack.enabled
          )

        }

        setMediaReady(true)

      } catch (error) {

        console.error(
          'Participant media error:',
          error
        )

        if (
          error.name ===
          'NotAllowedError'
        ) {

          setMediaError(
            'Camera and microphone permission was denied.'
          )

        } else if (
          error.name ===
          'NotFoundError'
        ) {

          setMediaError(
            'No camera or microphone was found.'
          )

        } else {

          setMediaError(
            'Unable to access your camera and microphone.'
          )

        }

      }

    }

    startMedia()

    return () => {

      mounted = false

      if (
        localStreamRef.current
      ) {

        localStreamRef.current
          .getTracks()
          .forEach(
            (track) =>
              track.stop()
          )

        localStreamRef.current =
          null

      }

    }

  }, [
    meetingLoading,
    meeting,
    nameSubmitted,
  ])

  // ========================================================================
  // ATTACH LOCAL VIDEO
  // ========================================================================

  useEffect(() => {

    if (
      !localVideoRef.current ||
      !localStreamRef.current
    ) {
      return
    }

    localVideoRef.current.srcObject =
      localStreamRef.current

    localVideoRef.current
      .play()
      .catch(() => {})

  }, [
    mediaReady,
  ])

  // ========================================================================
  // ATTACH REMOTE VIDEO
  // ========================================================================

  useEffect(() => {

    if (
      !remoteVideoRef.current ||
      !remoteStreamRef.current
    ) {
      return
    }

    console.log(
      '[PARTICIPANT UI] Attaching remote host stream'
    )

    remoteVideoRef.current.srcObject =
      remoteStreamRef.current

    remoteVideoRef.current
      .play()
      .catch((error) => {

        console.warn(
          '[PARTICIPANT UI] Remote video play warning:',
          error
        )

      })

  }, [
    remoteParticipant?.stream,
  ])

  // ========================================================================
  // CREATE PEER CONNECTION
  // ========================================================================

  const createPeerConnection =
    async (
      remoteSocketId,
      createOffer = false
    ) => {

      const existing =
        peerConnectionsRef.current.get(
          remoteSocketId
        )

      if (existing) {
        return existing
      }

      const socket =
        socketRef.current

      if (
        !socket ||
        !localStreamRef.current
      ) {

        console.error(
          '[PARTICIPANT WEBRTC] Socket or local stream missing'
        )

        return null
      }

      console.log(
        '[PARTICIPANT WEBRTC] Creating peer connection:',
        remoteSocketId
      )

      const peerConnection =
        new RTCPeerConnection({
          iceServers: [
            {
              urls:
                'stun:stun.l.google.com:19302',
            },
          ],
        })

      peerConnectionsRef.current.set(
        remoteSocketId,
        peerConnection
      )

      // --------------------------------------------------------------------
      // PARTICIPANT TRACKS
      // --------------------------------------------------------------------

      localStreamRef.current
        .getTracks()
        .forEach(
          (track) => {

            peerConnection.addTrack(
              track,
              localStreamRef.current
            )

          }
        )

      // --------------------------------------------------------------------
      // REMOTE HOST TRACKS
      // --------------------------------------------------------------------

      peerConnection.ontrack =
        (event) => {

          console.log(
            '[PARTICIPANT WEBRTC] Remote track received:',
            event.track.kind,
            remoteSocketId
          )

          let remoteStream =
            event.streams?.[0]

          if (!remoteStream) {

            remoteStream =
              remoteStreamRef.current ||
              new MediaStream()

            const exists =
              remoteStream
                .getTracks()
                .some(
                  (track) =>
                    track.id ===
                    event.track.id
                )

            if (!exists) {

              remoteStream.addTrack(
                event.track
              )

            }

          }

          remoteStreamRef.current =
            remoteStream

          setRemoteParticipant(
            (current) => {

              const base =
                current || {
                  socketId:
                    remoteSocketId,

                  name:
                    'Meeting Host',

                  role:
                    'host',

                  micOn:
                    true,

                  cameraOn:
                    true,
                }

              return {
                ...base,

                socketId:
                  remoteSocketId,

                stream:
                  remoteStream,
              }

            }
          )

        }

      // --------------------------------------------------------------------
      // ICE
      // --------------------------------------------------------------------

      peerConnection.onicecandidate =
        (event) => {

          if (
            !event.candidate
          ) {
            return
          }

          socket.emit(
            'webrtc:ice-candidate',
            {
              target:
                remoteSocketId,

              candidate:
                event.candidate,
            }
          )

        }

      // --------------------------------------------------------------------
      // CONNECTION STATE
      // --------------------------------------------------------------------

      peerConnection.onconnectionstatechange =
        () => {

          console.log(
            '[PARTICIPANT WEBRTC]',
            remoteSocketId,
            'state:',
            peerConnection.connectionState
          )

          if (
            peerConnection.connectionState ===
              'failed' ||
            peerConnection.connectionState ===
              'closed'
          ) {

            remoteStreamRef.current =
              null

            setRemoteParticipant(
              null
            )

          }

        }

      // --------------------------------------------------------------------
      // PARTICIPANT DOES NOT CREATE OFFER
      // --------------------------------------------------------------------

      if (createOffer) {

        const offer =
          await peerConnection.createOffer()

        await peerConnection.setLocalDescription(
          offer
        )

        socket.emit(
          'webrtc:offer',
          {
            target:
              remoteSocketId,

            offer,
          }
        )

      }

      return peerConnection

    }

  // ========================================================================
  // SOCKET + WEBRTC
  // ========================================================================

  useEffect(() => {

    if (
      !mediaReady ||
      !meeting ||
      !meetingId ||
      !nameSubmitted
    ) {
      return
    }

    const socket =
      io(SOCKET_URL)

    socketRef.current =
      socket

    // ======================================================================
    // CONNECT
    // ======================================================================

    socket.on(
      'connect',
      () => {

        console.log(
          'Participant socket connected:',
          socket.id
        )

        setConnected(true)

        socket.emit(
          'meeting:join',
          {
            meetingId,

            name:
              participantName,

            userId:
              null,

            role:
              'participant',

            micOn,

            cameraOn,
          }
        )

      }
    )

    // ======================================================================
    // ERROR
    // ======================================================================

    socket.on(
      'meeting:error',
      (error) => {

        console.error(
          'Participant meeting error:',
          error
        )

        setSocketError(
          error.message ||
          'Unable to join meeting.'
        )

      }
    )

    // ======================================================================
    // EXISTING USERS
    // ======================================================================

    socket.on(
      'meeting:existing-users',
      (users) => {

        console.log(
          '[PARTICIPANT] Existing users:',
          users
        )

        const host =
          users.find(
            (user) =>
              user.role ===
              'host'
          )

        if (!host) {
          return
        }

        setRemoteParticipant(
          {
            ...host,

            stream:
              null,
          }
        )

      }
    )

    // ======================================================================
    // USER JOINED
    // ======================================================================

    socket.on(
      'meeting:user-joined',
      (user) => {

        console.log(
          '[PARTICIPANT] User joined:',
          user
        )

        if (
          user.role ===
          'host'
        ) {

          setRemoteParticipant(
            {
              ...user,

              stream:
                null,
            }
          )

        }

      }
    )

    // ======================================================================
    // USER LEFT
    // ======================================================================

    socket.on(
      'meeting:user-left',
      ({
        socketId,
        role,
      }) => {

        console.log(
          '[PARTICIPANT] User left:',
          socketId
        )

        const peerConnection =
          peerConnectionsRef.current.get(
            socketId
          )

        if (peerConnection) {

          peerConnection.close()

          peerConnectionsRef.current.delete(
            socketId
          )

        }

        if (
          remoteParticipant?.socketId ===
            socketId ||
          role === 'host'
        ) {

          remoteStreamRef.current =
            null

          setRemoteParticipant(
            null
          )

          if (
            remoteVideoRef.current
          ) {

            remoteVideoRef.current.srcObject =
              null

          }

        }

      }
    )

    // ======================================================================
    // CHAT
    // ======================================================================

    socket.on(
      'meeting:chat-message',
      (chatMessage) => {

        console.log(
          '[PARTICIPANT] Chat:',
          chatMessage
        )

        setMessages(
          (current) => {

            if (
              current.some(
                (item) =>
                  item.id ===
                  chatMessage.id
              )
            ) {

              return current

            }

            return [
              ...current,

              {
                id:
                  chatMessage.id,

                sender:
                  chatMessage.sender,

                initials:
                  getInitials(
                    chatMessage.sender
                  ),

                time:
                  formatMessageTime(
                    chatMessage.timestamp
                  ),

                text:
                  chatMessage.message,

                role:
                  chatMessage.role,

                timestamp:
                  chatMessage.timestamp,
              },
            ]

          }
        )

      }
    )

    // ======================================================================
    // MEDIA STATE
    // ======================================================================

    socket.on(
      'meeting:media-state',
      (mediaState) => {

        if (
          remoteParticipant?.socketId !==
          mediaState.socketId
        ) {
          return
        }

        setRemoteParticipant(
          (current) =>
            current
              ? {
                  ...current,

                  micOn:
                    mediaState.micOn,

                  cameraOn:
                    mediaState.cameraOn,
                }
              : current
        )

      }
    )

    // ======================================================================
    // OFFER
    // ======================================================================

    socket.on(
      'webrtc:offer',
      async ({
        sender,
        offer,
      }) => {

        try {

          console.log(
            '[PARTICIPANT WEBRTC] Offer received from:',
            sender
          )

          let peerConnection =
            peerConnectionsRef.current.get(
              sender
            )

          if (!peerConnection) {

            peerConnection =
              await createPeerConnection(
                sender,
                false
              )

          }

          await peerConnection.setRemoteDescription(
            new RTCSessionDescription(
              offer
            )
          )

          const pending =
            pendingIceRef.current.get(
              sender
            ) || []

          for (
            const candidate of pending
          ) {

            try {

              await peerConnection.addIceCandidate(
                new RTCIceCandidate(
                  candidate
                )
              )

            } catch {}

          }

          pendingIceRef.current.delete(
            sender
          )

          const answer =
            await peerConnection.createAnswer()

          await peerConnection.setLocalDescription(
            answer
          )

          socket.emit(
            'webrtc:answer',
            {
              target:
                sender,

              answer,
            }
          )

          console.log(
            '[PARTICIPANT WEBRTC] Answer sent to:',
            sender
          )

        } catch (error) {

          console.error(
            '[PARTICIPANT WEBRTC] Offer error:',
            error
          )

        }

      }
    )

    // ======================================================================
    // ANSWER
    // ======================================================================

    socket.on(
      'webrtc:answer',
      async ({
        sender,
        answer,
      }) => {

        try {

          const peerConnection =
            peerConnectionsRef.current.get(
              sender
            )

          if (!peerConnection) {
            return
          }

          await peerConnection.setRemoteDescription(
            new RTCSessionDescription(
              answer
            )
          )

        } catch (error) {

          console.error(
            '[PARTICIPANT WEBRTC] Answer error:',
            error
          )

        }

      }
    )

    // ======================================================================
    // ICE
    // ======================================================================

    socket.on(
      'webrtc:ice-candidate',
      async ({
        sender,
        candidate,
      }) => {

        if (!candidate) {
          return
        }

        const peerConnection =
          peerConnectionsRef.current.get(
            sender
          )

        if (
          !peerConnection ||
          !peerConnection.remoteDescription
        ) {

          const pending =
            pendingIceRef.current.get(
              sender
            ) || []

          pending.push(
            candidate
          )

          pendingIceRef.current.set(
            sender,
            pending
          )

          return

        }

        try {

          await peerConnection.addIceCandidate(
            new RTCIceCandidate(
              candidate
            )
          )

        } catch (error) {

          console.error(
            '[PARTICIPANT WEBRTC] ICE error:',
            error
          )

        }

      }
    )

    // ======================================================================
    // DISCONNECT
    // ======================================================================

    socket.on(
      'disconnect',
      () => {

        console.log(
          '[PARTICIPANT] Socket disconnected'
        )

        setConnected(false)

      }
    )

    // ======================================================================
    // CLEANUP
    // ======================================================================

    return () => {

      socket.emit(
        'meeting:leave'
      )

      socket.disconnect()

      peerConnectionsRef.current.forEach(
        (peerConnection) => {
          peerConnection.close()
        }
      )

      peerConnectionsRef.current.clear()

      pendingIceRef.current.clear()

      remoteStreamRef.current =
        null

      socketRef.current =
        null

    }

  }, [
    mediaReady,
    meetingId,
    nameSubmitted,
  ])

  // ========================================================================
  // MICROPHONE
  // ========================================================================

  const toggleMicrophone =
    () => {

      const stream =
        localStreamRef.current

      if (!stream) {
        return
      }

      const audioTrack =
        stream.getAudioTracks()[0]

      if (!audioTrack) {
        return
      }

      audioTrack.enabled =
        !audioTrack.enabled

      setMicOn(
        audioTrack.enabled
      )

      socketRef.current?.emit(
        'meeting:media-state',
        {
          meetingId,

          micOn:
            audioTrack.enabled,

          cameraOn,
        }
      )

    }

  // ========================================================================
  // CAMERA
  // ========================================================================

  const toggleCamera =
    () => {

      const stream =
        localStreamRef.current

      if (!stream) {
        return
      }

      const videoTrack =
        stream.getVideoTracks()[0]

      if (!videoTrack) {
        return
      }

      videoTrack.enabled =
        !videoTrack.enabled

      setCameraOn(
        videoTrack.enabled
      )

      socketRef.current?.emit(
        'meeting:media-state',
        {
          meetingId,

          micOn,

          cameraOn:
            videoTrack.enabled,
        }
      )

    }

  // ========================================================================
  // CHAT
  // ========================================================================

  const sendMessage =
    (event) => {

      event.preventDefault()

      const trimmed =
        message.trim()

      if (!trimmed) {
        return
      }

      if (
        !socketRef.current ||
        !socketRef.current.connected
      ) {

        console.warn(
          'Participant socket is not connected.'
        )

        return

      }

      socketRef.current.emit(
        'meeting:chat-message',
        {
          meetingId,

          message:
            trimmed,
        }
      )

      setMessage('')

    }

  // ========================================================================
  // LEAVE
  // ========================================================================

  const leaveMeeting =
    () => {

      const confirmed =
        window.confirm(
          'Leave this meeting?'
        )

      if (!confirmed) {
        return
      }

      if (
        localStreamRef.current
      ) {

        localStreamRef.current
          .getTracks()
          .forEach(
            (track) =>
              track.stop()
          )

      }

      socketRef.current?.emit(
        'meeting:leave'
      )

      socketRef.current?.disconnect()

      navigate('/')

    }

  // ========================================================================
  // LOADING
  // ========================================================================

  if (meetingLoading) {

    return (
      <main className="participant-meeting-page">

        <div className="participant-main-placeholder">

          <div className="participant-main-avatar">
            M
          </div>

          <span>
            Loading meeting...
          </span>

        </div>

      </main>
    )

  }

  // ========================================================================
  // ERROR
  // ========================================================================

  if (meetingError) {

    return (
      <main className="participant-meeting-page">

        <div className="participant-main-placeholder">

          <div className="participant-main-avatar">
            !
          </div>

          <span>
            {meetingError}
          </span>

          <button
            type="button"
            onClick={() =>
              navigate('/')
            }
          >
            Go back
          </button>

        </div>

      </main>
    )

  }

  // ========================================================================
  // NAME SCREEN
  // ========================================================================

  if (!nameSubmitted) {

    return (
      <main className="participant-meeting-page">

        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '30px',
          }}
        >

          <form
            onSubmit={
              handleNameSubmit
            }
            style={{
              width: '100%',
              maxWidth: '420px',
              padding: '32px',
              borderRadius: '16px',
              background: '#fff',
              boxShadow:
                '0 20px 60px rgba(0,0,0,.15)',
            }}
          >

            <h2>
              Join Meeting
            </h2>

            <p>
              {meeting?.title ||
                'Meeting'}
            </p>

            <label>
              Your name
            </label>

            <input
              value={
                participantName
              }
              onChange={
                (event) =>
                  setParticipantName(
                    event.target.value
                  )
              }
              placeholder="Enter your name"
              autoFocus
              style={{
                width: '100%',
                padding: '12px',
                marginTop: '8px',
                marginBottom: '16px',
              }}
            />

            <button
              type="submit"
              style={{
                width: '100%',
                padding: '12px',
                cursor: 'pointer',
              }}
            >
              Join meeting
            </button>

          </form>

        </div>

      </main>
    )

  }

  const meetingTitle =
    meeting?.title ||
    'Meeting'

  // ========================================================================
  // RENDER
  // ========================================================================

  return (
    <main className="participant-meeting-page">

      {/* ================================================================
          HEADER
      ================================================================ */}

      <header className="participant-header">

        <div className="participant-header-left">

          <div className="participant-logo">
            M
          </div>

          <div>

            <div className="participant-title-row">

              <h1>
                {meetingTitle}
              </h1>

              <span className="participant-live">
                <span />
                LIVE
              </span>

            </div>

            <span className="participant-duration">
              {duration} · Meeting ID {meetingId}
            </span>

          </div>

        </div>

        <div className="participant-header-status">

          <span
            className={`connection-dot ${
              connected
                ? 'connected'
                : 'disconnected'
            }`}
          />

          {connected
            ? 'Connected'
            : 'Connecting...'}

        </div>

      </header>

      {socketError && (

        <div
          style={{
            padding: '10px 20px',
            textAlign: 'center',
          }}
        >
          {socketError}
        </div>

      )}

      {/* ================================================================
          CONTENT
      ================================================================ */}

      <section className="participant-meeting-content">

        <div className="participant-video-stage">

          {/* ============================================================
              REMOTE HOST
          ============================================================ */}

          <div className="participant-main-video">

            <video
              ref={
                remoteVideoRef
              }
              autoPlay
              playsInline
              className={`remote-video ${
                remoteParticipant?.stream
                  ? ''
                  : 'video-hidden'
              }`}
            />

            {!remoteParticipant?.stream && (

              <div className="participant-main-placeholder">

                <div className="participant-main-avatar">
                  MH
                </div>

                <span>
                  {remoteParticipant
                    ? 'Connecting to host...'
                    : 'Waiting for the host...'}
                </span>

              </div>

            )}

            <div className="participant-main-label">

              <span className="speaking-indicator" />

              {remoteParticipant?.name ||
                'Meeting Host'}

              <span className="host-tag">
                HOST
              </span>

            </div>

          </div>

          {/* ============================================================
              LOCAL PARTICIPANT
          ============================================================ */}

          <div className="participant-video-grid">

            <div className="participant-video-card you-card">

              <video
                ref={
                  localVideoRef
                }
                autoPlay
                muted
                playsInline
                className={`participant-local-video ${
                  cameraOn
                    ? ''
                    : 'video-hidden'
                }`}
              />

              {mediaError && (

                <div className="participant-card-off">

                  <div className="participant-card-avatar">
                    {getInitials(
                      participantName
                    )}
                  </div>

                  <span>
                    {mediaError}
                  </span>

                </div>

              )}

              {!cameraOn && !mediaError && (

                <div className="participant-card-off">

                  <div className="participant-card-avatar">
                    {getInitials(
                      participantName
                    )}
                  </div>

                  <span>
                    Camera off
                  </span>

                </div>

              )}

              <div className="participant-card-name">

                {participantName}

                {!micOn && (

                  <span>
                    🔇
                  </span>

                )}

              </div>

            </div>

          </div>

          {/* ============================================================
              CONTROLS
          ============================================================ */}

          <div className="participant-controls">

            <div className="participant-control-group">

              <button
                type="button"
                className={`participant-control ${
                  !micOn
                    ? 'off'
                    : ''
                }`}
                onClick={
                  toggleMicrophone
                }
              >

                <span>
                  {micOn
                    ? '🎙'
                    : '🔇'}
                </span>

                {micOn
                  ? 'Mute'
                  : 'Unmute'}

              </button>

              <button
                type="button"
                className={`participant-control ${
                  !cameraOn
                    ? 'off'
                    : ''
                }`}
                onClick={
                  toggleCamera
                }
              >

                <span>
                  {cameraOn
                    ? '▣'
                    : '▧'}
                </span>

                {cameraOn
                  ? 'Camera'
                  : 'Camera off'}

              </button>

              <button
                type="button"
                className={`participant-control ${
                  participantsOpen
                    ? 'active'
                    : ''
                }`}
                onClick={() =>
                  setParticipantsOpen(
                    !participantsOpen
                  )
                }
              >

                <span>
                  ♙
                </span>

                People

              </button>

              <button
                type="button"
                className={`participant-control ${
                  chatOpen
                    ? 'active'
                    : ''
                }`}
                onClick={() =>
                  setChatOpen(
                    !chatOpen
                  )
                }
              >

                <span>
                  ▱
                </span>

                Chat

              </button>

            </div>

            <button
              type="button"
              className="leave-meeting-button"
              onClick={
                leaveMeeting
              }
            >
              Leave
            </button>

          </div>

        </div>

        {/* ================================================================
            SIDEBAR
        ================================================================ */}

        <aside className="participant-sidebar">

          {participantsOpen && (

            <section className="participant-sidebar-panel people-panel">

              <div className="participant-sidebar-heading">

                <div>

                  <h2>
                    Participants
                  </h2>

                  <span>
                    {remoteParticipant
                      ? '2 people'
                      : '1 person'}
                  </span>

                </div>

                <button
                  type="button"
                  onClick={() =>
                    setParticipantsOpen(
                      false
                    )
                  }
                  className="participant-close-button"
                >
                  ×
                </button>

              </div>

              <div className="participant-list">

                {remoteParticipant && (

                  <div className="participant-list-row">

                    <div className="person-avatar">
                      {getInitials(
                        remoteParticipant.name ||
                        'Meeting Host'
                      )}
                    </div>

                    <div className="person-info">

                      <strong>
                        {remoteParticipant.name ||
                          'Meeting Host'}
                      </strong>

                      <span>
                        Host
                      </span>

                    </div>

                    <div className="person-status">

                      {remoteParticipant.micOn
                        ? '🎙'
                        : '🔇'}

                    </div>

                  </div>

                )}

                <div className="participant-list-row">

                  <div className="person-avatar">

                    {getInitials(
                      participantName
                    )}

                  </div>

                  <div className="person-info">

                    <strong>
                      {participantName}
                    </strong>

                    <span>
                      Participant
                    </span>

                  </div>

                  <div className="person-status">

                    {micOn
                      ? '🎙'
                      : '🔇'}

                    <small>
                      YOU
                    </small>

                  </div>

                </div>

              </div>

            </section>

          )}

          {/* ============================================================
              CHAT
          ============================================================ */}

          {chatOpen && (

            <section className="participant-sidebar-panel participant-chat-panel">

              <div className="participant-sidebar-heading">

                <div>

                  <h2>
                    Meeting chat
                  </h2>

                  <span>
                    Messages are visible to everyone
                  </span>

                </div>

                <button
                  type="button"
                  onClick={() =>
                    setChatOpen(false)
                  }
                  className="participant-close-button"
                >
                  ×
                </button>

              </div>

              <div className="participant-chat-messages">

                {messages.map(
                  (item) => (

                    <div
                      className={`participant-chat-message ${
                        item.sender ===
                        participantName
                          ? 'own'
                          : ''
                      }`}
                      key={
                        item.id
                      }
                    >

                      <div className="participant-chat-avatar">

                        {item.initials}

                      </div>

                      <div className="participant-chat-body">

                        <div className="participant-chat-meta">

                          <strong>
                            {item.sender}
                          </strong>

                          <span>
                            {item.time}
                          </span>

                        </div>

                        <p>
                          {item.text}
                        </p>

                      </div>

                    </div>

                  )
                )}

              </div>

              <form
                className="participant-chat-composer"
                onSubmit={
                  sendMessage
                }
              >

                <input
                  value={message}
                  onChange={
                    (event) =>
                      setMessage(
                        event.target.value
                      )
                  }
                  placeholder="Write a message..."
                  aria-label="Write a message"
                />

                <button
                  type="submit"
                  aria-label="Send message"
                >
                  ➤
                </button>

              </form>

            </section>

          )}

          {!participantsOpen &&
            !chatOpen && (

            <div className="participant-sidebar-empty">

              <span>
                ☰
              </span>

              <strong>
                Meeting panel hidden
              </strong>

              <p>
                Open People or Chat using
                the controls below.
              </p>

              <div>

                <button
                  type="button"
                  onClick={() =>
                    setParticipantsOpen(
                      true
                    )
                  }
                >
                  People
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setChatOpen(
                      true
                    )
                  }
                >
                  Chat
                </button>

              </div>

            </div>

          )}

        </aside>

      </section>

    </main>
  )
}

// ============================================================================
// HELPERS
// ============================================================================

function getInitials(
  name = 'Participant'
) {

  return name
    .split(' ')
    .map(
      (word) =>
        word[0]
    )
    .join('')
    .slice(0, 2)
    .toUpperCase()

}

function formatMessageTime(
  timestamp
) {

  if (!timestamp) {
    return ''
  }

  return new Date(
    timestamp
  ).toLocaleTimeString(
    [],
    {
      hour: '2-digit',
      minute: '2-digit',
    }
  )

}

export default MeetingParticipant