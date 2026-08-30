import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import {
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom'

import { io } from 'socket.io-client'

import { API_BASE } from '../../lib/api_base'

import './MeetingHost.css'

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  'http://localhost:9505'

// Same base as the rest of the app: relative in development so Vite proxies it,
// VITE_API_URL in production.
const API_URL = API_BASE

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function MeetingHost() {

  const navigate = useNavigate()
  const location = useLocation()
  const { meetingId } = useParams()

  // ========================================================================
  // REFS
  // ========================================================================

  const localVideoRef =
    useRef(null)

  const socketRef =
    useRef(null)

  const localStreamRef =
    useRef(null)

  const peerConnectionsRef =
    useRef(new Map())

  const pendingIceRef =
    useRef(new Map())

  // ========================================================================
  // MEETING
  // ========================================================================

  const [meeting, setMeeting] =
    useState(location.state || null)

  const [meetingLoading, setMeetingLoading] =
    useState(true)

  const [meetingError, setMeetingError] =
    useState('')

  const meetingTitle =
    meeting?.title ||
    'Untitled Meeting'

  // ========================================================================
  // MEDIA
  // ========================================================================

  const [micOn, setMicOn] =
    useState(
      location.state?.microphone ??
      true
    )

  const [cameraOn, setCameraOn] =
    useState(
      location.state?.camera ??
      true
    )

  const [mediaReady, setMediaReady] =
    useState(false)

  const [mediaError, setMediaError] =
    useState('')

  // ========================================================================
  // CONNECTION
  // ========================================================================

  const [connected, setConnected] =
    useState(false)

  const [
    meetingErrorFromSocket,
    setMeetingErrorFromSocket,
  ] = useState('')

  // ========================================================================
  // PARTICIPANTS
  // ========================================================================

  const [
    remoteParticipants,
    setRemoteParticipants,
  ] = useState([])

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

  const [
    screenSharing,
    setScreenSharing,
  ] = useState(false)

  const [
    showMeetingInfo,
    setShowMeetingInfo,
  ] = useState(false)

  const [copied, setCopied] =
    useState(false)

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
          'Meeting fetch error:',
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

  }, [meetingId])

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
  // LOCAL CAMERA + MICROPHONE
  // ========================================================================

  useEffect(() => {

    if (
      meetingLoading ||
      !meeting
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
          'Host media error:',
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
          '[HOST WEBRTC] Socket or local stream missing'
        )

        return null
      }

      console.log(
        '[HOST WEBRTC] Creating peer connection:',
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
      // HOST TRACKS
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
      // PARTICIPANT TRACKS
      // --------------------------------------------------------------------

      peerConnection.ontrack =
        (event) => {

          console.log(
            '[HOST WEBRTC] Remote track received:',
            event.track.kind,
            remoteSocketId
          )

          let remoteStream =
            event.streams?.[0]

          if (!remoteStream) {

            remoteStream =
              new MediaStream()

            remoteStream.addTrack(
              event.track
            )

          }

          setRemoteParticipants(
            (current) =>
              current.map(
                (participant) =>
                  participant.socketId ===
                  remoteSocketId
                    ? {
                        ...participant,

                        stream:
                          remoteStream,
                      }
                    : participant
              )
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
            '[HOST WEBRTC]',
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

            removeRemoteParticipant(
              remoteSocketId
            )

          }

        }

      // --------------------------------------------------------------------
      // CREATE OFFER
      // --------------------------------------------------------------------

      if (createOffer) {

        console.log(
          '[HOST WEBRTC] Creating offer for:',
          remoteSocketId
        )

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

        console.log(
          '[HOST WEBRTC] Offer sent to:',
          remoteSocketId
        )

      }

      return peerConnection

    }

  // ========================================================================
  // REMOVE PARTICIPANT
  // ========================================================================

  const removeRemoteParticipant =
    (socketId) => {

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

      pendingIceRef.current.delete(
        socketId
      )

      setRemoteParticipants(
        (current) =>
          current.filter(
            (participant) =>
              participant.socketId !==
              socketId
          )
      )

    }

  // ========================================================================
  // SOCKET + WEBRTC
  // ========================================================================

  useEffect(() => {

    if (
      !mediaReady ||
      !meeting ||
      !meetingId
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
          'Host socket connected:',
          socket.id
        )

        setConnected(true)

        socket.emit(
          'meeting:join',
          {
            meetingId,

            name:
              'Host',

            userId:
              null,

            role:
              'host',

            micOn,

            cameraOn,
          }
        )

      }
    )

    // ======================================================================
    // SOCKET ERROR
    // ======================================================================

    socket.on(
      'meeting:error',
      (error) => {

        console.error(
          'Host meeting error:',
          error
        )

        setMeetingErrorFromSocket(
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
          '[HOST] Existing users:',
          users
        )

        users.forEach(
          (user) => {

            if (
              user.socketId ===
              socket.id
            ) {
              return
            }

            setRemoteParticipants(
              (current) => {

                if (
                  current.some(
                    (item) =>
                      item.socketId ===
                      user.socketId
                  )
                ) {
                  return current
                }

                return [
                  ...current,

                  {
                    ...user,

                    stream:
                      null,
                  },
                ]

              }
            )

          }
        )

      }
    )

    // ======================================================================
    // USER JOINED
    // ======================================================================

    socket.on(
      'meeting:user-joined',
      async (user) => {

        console.log(
          '[HOST] User joined:',
          user
        )

        if (
          user.socketId ===
          socket.id
        ) {
          return
        }

        setRemoteParticipants(
          (current) => {

            if (
              current.some(
                (item) =>
                  item.socketId ===
                  user.socketId
              )
            ) {

              return current

            }

            return [
              ...current,

              {
                ...user,

                stream:
                  null,
              },
            ]

          }
        )

        if (
          user.role ===
          'participant'
        ) {

          await createPeerConnection(
            user.socketId,
            true
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
      }) => {

        console.log(
          '[HOST] User left:',
          socketId
        )

        removeRemoteParticipant(
          socketId
        )

      }
    )

    // ======================================================================
    // CHAT
    // ======================================================================

    socket.on(
      'meeting:chat-message',
      (chatMessage) => {

        console.log(
          '[HOST] Chat:',
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

        setRemoteParticipants(
          (current) =>
            current.map(
              (participant) =>
                participant.socketId ===
                mediaState.socketId
                  ? {
                      ...participant,

                      micOn:
                        mediaState.micOn,

                      cameraOn:
                        mediaState.cameraOn,
                    }
                  : participant
            )
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
            '[HOST WEBRTC] Offer received from:',
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

        } catch (error) {

          console.error(
            '[HOST WEBRTC] Offer error:',
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

          console.log(
            '[HOST WEBRTC] Answer received from:',
            sender
          )

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

        } catch (error) {

          console.error(
            '[HOST WEBRTC] Answer error:',
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
            '[HOST WEBRTC] ICE error:',
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
          '[HOST] Socket disconnected'
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

      socketRef.current =
        null

    }

  }, [
    mediaReady,
    meetingId,
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
  // SCREEN SHARE
  // ========================================================================

  const toggleScreenShare =
    async () => {

      if (screenSharing) {

        setScreenSharing(false)

        return

      }

      try {

        const screenStream =
          await navigator.mediaDevices.getDisplayMedia(
            {
              video: true,
            }
          )

        const screenTrack =
          screenStream.getVideoTracks()[0]

        if (!screenTrack) {
          return
        }

        peerConnectionsRef.current.forEach(
          (peerConnection) => {

            const sender =
              peerConnection
                .getSenders()
                .find(
                  (item) =>
                    item.track?.kind ===
                    'video'
                )

            if (sender) {

              sender.replaceTrack(
                screenTrack
              )

            }

          }
        )

        setScreenSharing(true)

        screenTrack.onended =
          () => {

            const cameraTrack =
              localStreamRef.current
                ?.getVideoTracks()[0]

            peerConnectionsRef.current.forEach(
              (peerConnection) => {

                const sender =
                  peerConnection
                    .getSenders()
                    .find(
                      (item) =>
                        item.track?.kind ===
                        'video'
                    )

                if (
                  sender &&
                  cameraTrack
                ) {

                  sender.replaceTrack(
                    cameraTrack
                  )

                }

              }
            )

            setScreenSharing(false)

          }

      } catch (error) {

        console.error(
          'Screen share error:',
          error
        )

        setScreenSharing(false)

      }

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
          'Socket is not connected.'
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
  // COPY LINK
  // ========================================================================

  const copyMeetingLink =
    async () => {

      const link =
        `${window.location.origin}/meeting/${meetingId}`

      try {

        await navigator.clipboard.writeText(
          link
        )

        setCopied(true)

        setTimeout(
          () =>
            setCopied(false),
          1800
        )

      } catch (error) {

        console.error(
          'Could not copy meeting link:',
          error
        )

      }

    }

  // ========================================================================
  // END MEETING
  // ========================================================================

  const endMeeting =
    () => {

      const confirmed =
        window.confirm(
          'End this meeting for everyone?'
        )

      if (!confirmed) {
        return
      }

      if (
        socketRef.current
      ) {

        socketRef.current.emit(
          'meeting:leave'
        )

        socketRef.current.disconnect()

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

        localStreamRef.current =
          null

      }

      peerConnectionsRef.current.forEach(
        (connection) =>
          connection.close()
      )

      peerConnectionsRef.current.clear()

      navigate(
        '/meeting/create'
      )

    }

  // ========================================================================
  // LOADING
  // ========================================================================

  if (meetingLoading) {

    return (
      <main className="host-meeting-page">

        <div className="camera-off-content">

          <div className="host-avatar-large">
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
      <main className="host-meeting-page">

        <div className="camera-off-content">

          <div className="host-avatar-large">
            !
          </div>

          <span>
            {meetingError}
          </span>

          <button
            type="button"
            onClick={() =>
              navigate(
                '/meeting/create'
              )
            }
          >
            Go back
          </button>

        </div>

      </main>
    )

  }

  // ========================================================================
  // RENDER
  // ========================================================================

  return (
    <main className="host-meeting-page">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="host-meeting-header">

        <div className="meeting-header-left">

          <div className="meeting-logo-mark">
            M
          </div>

          <div>

            <div className="meeting-title-line">

              <h1>
                {meetingTitle}
              </h1>

              <span className="live-badge">
                <span />
                LIVE
              </span>

            </div>

            <span className="meeting-duration">
              {duration} · Meeting ID {meetingId}
            </span>

          </div>

        </div>

        <div className="meeting-header-actions">

          <span className="host-connection-status">

            <span
              className={
                connected
                  ? 'connection-dot connected'
                  : 'connection-dot'
              }
            />

            {connected
              ? 'Connected'
              : 'Connecting...'}

          </span>

          <button
            type="button"
            className="header-button"
            onClick={() =>
              setShowMeetingInfo(
                !showMeetingInfo
              )
            }
          >

            <span>
              ⓘ
            </span>

            Meeting info

          </button>

          <button
            type="button"
            className="header-button"
            onClick={
              copyMeetingLink
            }
          >

            <span>
              ↗
            </span>

            {copied
              ? 'Copied'
              : 'Copy link'}

          </button>

        </div>

        {showMeetingInfo && (

          <div className="meeting-info-popover">

            <span className="popover-label">
              MEETING INFORMATION
            </span>

            <strong>
              {meetingTitle}
            </strong>

            <p>
              {meeting.description ||
                'No meeting description provided.'}
            </p>

            <div className="info-line">

              <span>
                Access
              </span>

              <b>
                {meeting.access ===
                'restricted'
                  ? 'Restricted'
                  : 'Anyone with link'}
              </b>

            </div>

            <div className="info-line">

              <span>
                Limit
              </span>

              <b>
                {meeting.participantLimit ||
                  '50'}{' '}
                participants
              </b>

            </div>

          </div>

        )}

      </header>

      {/* =====================================================
          CONTENT
      ===================================================== */}

      <section className="host-meeting-content">

        <div className="video-stage">

          {/* =================================================
              HOST VIDEO
          ================================================= */}

          <div
            className={`main-video ${
              !cameraOn
                ? 'camera-off'
                : ''
            }`}
          >

            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className={`local-video ${
                !cameraOn
                  ? 'video-hidden'
                  : ''
              }`}
            />

            {!cameraOn && (

              <div className="camera-off-content">

                <div className="host-avatar-large small">
                  PR
                </div>

                <span>
                  Your camera is off
                </span>

              </div>

            )}

            {mediaError && (

              <div className="media-error-message">
                {mediaError}
              </div>

            )}

            <div className="video-name-tag">

              <span className="speaking-dot" />

              You

              <span className="host-label">
                HOST
              </span>

              {!micOn && (

                <span className="muted-label">
                  MIC OFF
                </span>

              )}

            </div>

          </div>

          {/* =================================================
              PARTICIPANT VIDEOS
          ================================================= */}

          <div className="participant-preview-grid">

            {remoteParticipants.length === 0 && (

              <div className="small-video-card">

                <div className="small-video-background">

                  <div className="participant-avatar">
                    P
                  </div>

                </div>

                <div className="small-video-name">
                  Waiting for participant...
                </div>

              </div>

            )}

            {remoteParticipants.map(
              (participant) => (

                <RemoteParticipantVideo
                  key={
                    participant.socketId
                  }
                  participant={
                    participant
                  }
                />

              )
            )}

          </div>

          {/* =================================================
              CONTROLS
          ================================================= */}

          <div className="meeting-controls">

            <div className="control-group">

              <button
                type="button"
                className={`meeting-control ${
                  !micOn
                    ? 'off'
                    : ''
                }`}
                onClick={
                  toggleMicrophone
                }
              >

                <span className="control-icon">
                  {micOn
                    ? '🎙'
                    : '🔇'}
                </span>

                <span>
                  {micOn
                    ? 'Mute'
                    : 'Unmute'}
                </span>

              </button>

              <button
                type="button"
                className={`meeting-control ${
                  !cameraOn
                    ? 'off'
                    : ''
                }`}
                onClick={
                  toggleCamera
                }
              >

                <span className="control-icon">
                  {cameraOn
                    ? '▣'
                    : '▧'}
                </span>

                <span>
                  {cameraOn
                    ? 'Camera'
                    : 'Camera off'}
                </span>

              </button>

              <button
                type="button"
                className={`meeting-control ${
                  screenSharing
                    ? 'active'
                    : ''
                }`}
                onClick={
                  toggleScreenShare
                }
              >

                <span className="control-icon">
                  ▤
                </span>

                <span>
                  {screenSharing
                    ? 'Stop share'
                    : 'Share screen'}
                </span>

              </button>

              <button
                type="button"
                className={`meeting-control ${
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

                <span className="control-icon">
                  ♙
                </span>

                <span>
                  People
                </span>

              </button>

              <button
                type="button"
                className={`meeting-control ${
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

                <span className="control-icon">
                  ▱
                </span>

                <span>
                  Chat
                </span>

              </button>

            </div>

            <button
              type="button"
              className="leave-meeting-button"
              onClick={
                endMeeting
              }
            >
              End meeting
            </button>

          </div>

        </div>

        {/* =====================================================
            SIDEBAR
        ===================================================== */}

        <aside className="meeting-sidebar">

          {participantsOpen && (

            <section className="sidebar-panel people-panel">

              <div className="sidebar-heading">

                <div>

                  <h2>
                    Participants
                  </h2>

                  <span>
                    {remoteParticipants.length + 1}{' '}
                    people
                  </span>

                </div>

                <button
                  type="button"
                  className="close-sidebar-button"
                  onClick={() =>
                    setParticipantsOpen(
                      false
                    )
                  }
                >
                  ×
                </button>

              </div>

              <div className="participant-list">

                <div className="participant-list-row">

                  <div className="person-avatar">
                    PR
                  </div>

                  <div className="person-info">

                    <strong>
                      You
                    </strong>

                    <span>
                      Host
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

                {remoteParticipants.map(
                  (participant) => (

                    <div
                      className="participant-list-row"
                      key={
                        participant.socketId
                      }
                    >

                      <div className="person-avatar">

                        {getInitials(
                          participant.name
                        )}

                      </div>

                      <div className="person-info">

                        <strong>
                          {participant.name}
                        </strong>

                        <span>
                          Participant
                        </span>

                      </div>

                      <div className="person-status">

                        {participant.micOn
                          ? '🎙'
                          : '🔇'}

                      </div>

                    </div>

                  )
                )}

              </div>

            </section>

          )}

          {chatOpen && (

            <section className="sidebar-panel chat-panel">

              <div className="sidebar-heading">

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
                  className="close-sidebar-button"
                  onClick={() =>
                    setChatOpen(false)
                  }
                >
                  ×
                </button>

              </div>

              <div className="chat-messages">

                {messages.map(
                  (item) => (

                    <div
                      className={`chat-message ${
                        item.sender ===
                        'Host'
                          ? 'own-message'
                          : ''
                      }`}
                      key={
                        item.id
                      }
                    >

                      <div className="chat-avatar">

                        {item.initials}

                      </div>

                      <div className="chat-message-body">

                        <div className="chat-message-meta">

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
                className="chat-composer"
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

            <div className="sidebar-empty">

              <span>
                ☰
              </span>

              <strong>
                Meeting panel hidden
              </strong>

              <p>
                Use People or Chat below
                to open a panel.
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
// REMOTE PARTICIPANT VIDEO
// ============================================================================

function RemoteParticipantVideo({
  participant,
}) {

  const videoRef =
    useRef(null)

  useEffect(() => {

    if (
      !videoRef.current ||
      !participant.stream
    ) {
      return
    }

    console.log(
      '[HOST UI] Attaching participant stream:',
      participant.name
    )

    videoRef.current.srcObject =
      participant.stream

    videoRef.current
      .play()
      .catch(() => {})

  }, [
    participant.stream,
  ])

  return (

    <div
      className={`small-video-card ${
        participant.stream
          ? 'speaking'
          : ''
      }`}
    >

      <video
        ref={videoRef}
        autoPlay
        playsInline
        className={`remote-participant-video ${
          participant.stream
            ? ''
            : 'video-hidden'
        }`}
      />

      {!participant.stream && (

        <div className="small-video-background">

          <div className="participant-avatar">

            {getInitials(
              participant.name
            )}

          </div>

        </div>

      )}

      <div className="small-video-name">

        {participant.name}

        {!participant.micOn && (

          <span>
            MIC OFF
          </span>

        )}

      </div>

    </div>

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

export default MeetingHost