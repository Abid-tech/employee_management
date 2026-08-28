// Meetings, resources and asset management.
//
// This is Prohor_Part's module, moved here whole from the server.js it was
// written in. Two things changed and nothing else:
//
//   * its eight `import` lines became `require`, because every other file in
//     this backend is CommonJS and `"type": "module"` in package.json would
//     break the other twenty;
//   * the app setup, the Mongoose connection and the listen call at either end
//     were dropped, since server.js already does all three. What is left is
//     wrapped in mount(app, io) and handed the app and the Socket.IO server it
//     used to create for itself.
//
// The routes, the schemas, the signalling and the handlers inside are untouched,
// so this file still reads as its author wrote it.

const mongoose = require('mongoose')
const multer = require('multer')
const { Resend } = require('resend')

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

const EMAIL_FROM =
  process.env.EMAIL_FROM || 'onboarding@resend.dev'

module.exports = function mount(app, io) {

// ============================================================================
// EMAIL SERVICE
// ============================================================================

async function sendEmail({
  to,
  subject,
  html,
}) {
  try {
    if (!resend || !process.env.RESEND_API_KEY) {
      console.warn(
        '[EMAIL] RESEND_API_KEY is missing. Email was not sent.'
      )

      return {
        success: false,
        error: 'RESEND_API_KEY is missing',
      }
    }

    const { data, error } =
      await resend.emails.send({
        from: EMAIL_FROM,
        to: [to],
        subject,
        html,
      })

    if (error) {
      console.error(
        '[EMAIL] Resend error:',
        error
      )

      return {
        success: false,
        error,
      }
    }

    console.log(
      `[EMAIL] Sent successfully to ${to}`
    )

    console.log(
      `[EMAIL] Message ID: ${data?.id}`
    )

    return {
      success: true,
      data,
    }
  } catch (error) {
    console.error(
      '[EMAIL] Failed:',
      error
    )

    return {
      success: false,
      error: error.message,
    }
  }
}

// ============================================================================
// EMAIL TEST
// ============================================================================

app.post(
  '/api/email/test',
  async (req, res) => {
    try {
      const {
        to,
      } = req.body

      if (!to) {
        return res.status(400).json({
          success: false,
          message:
            'Recipient email is required',
        })
      }

      const result =
        await sendEmail({
          to,

          subject:
            'Employee Management System - Test Email',

          html: `
            <div style="
              font-family: Arial, sans-serif;
              max-width: 600px;
              margin: auto;
              padding: 30px;
              border: 1px solid #ddd;
              border-radius: 10px;
            ">

              <h2>
                Email Integration Successful
              </h2>

              <p>
                This is a test email from the
                Employee Management System.
              </p>

              <p>
                Your Resend API integration is
                working correctly.
              </p>

              <hr />

              <p style="color: #777;">
                Employee Management System
              </p>

            </div>
          `,
        })

      if (!result.success) {
        return res.status(500).json({
          success: false,
          message:
            'Email could not be sent',
          error:
            result.error,
        })
      }

      res.json({
        success: true,
        message:
          'Email sent successfully',
        emailId:
          result.data?.id,
      })
    } catch (error) {
      console.error(
        'Email test error:',
        error
      )

      res.status(500).json({
        success: false,
        message:
          'Failed to send test email',
      })
    }
  }
)

// ============================================================================
// MEETING SCHEMAS
// ============================================================================

const participantSchema =
  new mongoose.Schema(
    {
      socketId: {
        type: String,
        default: null,
      },

      userId: {
        type: String,
        default: null,
      },

      name: {
        type: String,
        required: true,
      },

      role: {
        type: String,
        enum: [
          'host',
          'participant',
        ],
        default: 'participant',
      },

      micOn: {
        type: Boolean,
        default: true,
      },

      cameraOn: {
        type: Boolean,
        default: true,
      },

      joinedAt: {
        type: Date,
        default: null,
      },

      leftAt: {
        type: Date,
        default: null,
      },
    },
    {
      _id: false,
    }
  )

const messageSchema =
  new mongoose.Schema(
    {
      id: {
        type: String,
        required: true,
      },

      socketId: {
        type: String,
        default: null,
      },

      userId: {
        type: String,
        default: null,
      },

      sender: {
        type: String,
        required: true,
      },

      role: {
        type: String,
        default: 'participant',
      },

      message: {
        type: String,
        required: true,
      },

      timestamp: {
        type: Date,
        default: Date.now,
      },
    },
    {
      _id: false,
    }
  )

const meetingSchema =
  new mongoose.Schema({
    meetingId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    title: {
      type: String,
      default: 'Untitled Meeting',
    },

    description: {
      type: String,
      default: '',
    },

    scheduledDate: {
      type: String,
      default: '',
    },

    scheduledTime: {
      type: String,
      default: '',
    },

    duration: {
      type: Number,
      default: 60,
    },

    camera: {
      type: Boolean,
      default: true,
    },

    microphone: {
      type: Boolean,
      default: true,
    },

    access: {
      type: String,
      enum: [
        'anyone',
        'restricted',
      ],
      default: 'anyone',
    },

    participantLimit: {
      type: Number,
      default: 50,
    },

    status: {
      type: String,
      enum: [
        'scheduled',
        'active',
        'ended',
      ],
      default: 'scheduled',
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },

    startedAt: {
      type: Date,
      default: null,
    },

    endedAt: {
      type: Date,
      default: null,
    },

    participants: {
      type: [participantSchema],
      default: [],
    },

    messages: {
      type: [messageSchema],
      default: [],
    },
  })

const Meeting =
  mongoose.models.Meeting ||
  mongoose.model(
    'Meeting',
    meetingSchema
  )

// ============================================================================
// RESOURCE SCHEMA
// ============================================================================

const resourceSchema =
  new mongoose.Schema(
    {
      name: {
        type: String,
        required: true,
        trim: true,
      },

      type: {
        type: String,
        enum: [
          'file',
          'folder',
          'link',
        ],
        required: true,
      },

      mimeType: {
        type: String,
        default: null,
      },

      size: {
        type: Number,
        default: 0,
      },

      gridFsId: {
        type:
          mongoose.Schema.Types.ObjectId,
        default: null,
      },

      url: {
        type: String,
        default: null,
      },

      description: {
        type: String,
        default: '',
      },

      parentId: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: 'Resource',
        default: null,
      },

      access: {
        roles: {
          type: [String],
          enum: [
            'admin',
            'employee',
          ],
          default: [
            'employee',
          ],
        },

        users: {
          type: [String],
          default: [],
        },
      },

      createdAt: {
        type: Date,
        default: Date.now,
      },
    },

    {
      collection: 'resources',
    }
  )

resourceSchema.index({
  name: 'text',
  description: 'text',
})

resourceSchema.index({
  parentId: 1,
  type: 1,
})

const Resource =
  mongoose.models.Resource ||
  mongoose.model(
    'Resource',
    resourceSchema
  )

// ============================================================================
// ASSET SCHEMA
// ============================================================================
//
// This is the NEW part.
//
// Collection:
// employee_management -> assets
//
// Existing user collection:
// employee_management -> user
//
// Assets can be assigned to a real employee using assignedToUserId.
// We also keep assignedTo and department so the existing frontend works.
//

const assetSchema =
  new mongoose.Schema(
    {
      name: {
        type: String,
        required: true,
        trim: true,
      },

      assetId: {
        type: String,
        required: true,
        unique: true,
        trim: true,
      },

      category: {
        type: String,
        enum: [
          'Laptop',
          'Monitor',
          'Printer',
          'Phone',
          'Other',
        ],
        default: 'Other',
      },

      status: {
        type: String,
        enum: [
          'Available',
          'Assigned',
          'Maintenance',
        ],
        default: 'Available',
      },

      assignedTo: {
        type: String,
        default: 'Unassigned',
      },

      assignedToUserId: {
        type: String,
        default: null,
      },

      assignedToEmail: {
        type: String,
        default: null,
      },

      department: {
        type: String,
        default: '—',
      },

      createdAt: {
        type: Date,
        default: Date.now,
      },

      updatedAt: {
        type: Date,
        default: Date.now,
      },
    },

    {
      collection: 'assets',
    }
  )

assetSchema.index({
  assignedToUserId: 1,
})

assetSchema.index({
  assignedToEmail: 1,
})

assetSchema.index({
  category: 1,
  status: 1,
})

const Asset =
  mongoose.models.Asset ||
  mongoose.model(
    'Asset',
    assetSchema
  )

// ============================================================================
// USER MODEL
// ============================================================================
//
// This module used to declare its own User schema against a collection named
// "user". Two things were wrong with that once the branches came together:
// registering a second 'User' model threw OverwriteModelError against the one
// model/user.js already compiles, and "user" is empty in Atlas — the accounts
// are in "users", which is where the shared model reads. So the asset screens
// were listing employees from an empty collection.
//
// Using the shared model fixes both, and the fields this module reads
// (firstName, lastName, email, department, role) are all on it.
//

const User = require('../model/user')

// ============================================================================
// MULTER
// ============================================================================

const upload =
  multer({
    storage:
      multer.memoryStorage(),

    limits: {
      fileSize:
        25 * 1024 * 1024,
    },

    fileFilter: (
      req,
      file,
      callback
    ) => {
      const allowedTypes = [
        'application/pdf',

        'application/msword',

        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',

        'application/vnd.ms-powerpoint',

        'application/vnd.openxmlformats-officedocument.presentationml.presentation',

        'application/vnd.ms-excel',

        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',

        'text/plain',

        'image/jpeg',

        'image/png',

        'image/webp',

        'application/zip',
      ]

      if (
        !allowedTypes.includes(
          file.mimetype
        )
      ) {
        return callback(
          new Error(
            'Unsupported file type.'
          )
        )
      }

      callback(
        null,
        true
      )
    },
  })

// ============================================================================
// GRIDFS
// ============================================================================

function getResourceBucket() {
  return new mongoose.mongo.GridFSBucket(
    mongoose.connection.db,
    {
      bucketName:
        'resources',
    }
  )
}

// ============================================================================
// RESOURCE ACCESS
// ============================================================================

function parseAccess(value) {
  if (!value) {
    return {
      roles: [
        'employee',
      ],
      users: [],
    }
  }

  try {
    const parsed =
      typeof value ===
      'string'
        ? JSON.parse(value)
        : value

    const roles =
      Array.isArray(
        parsed.roles
      )
        ? parsed.roles.filter(
            (role) =>
              [
                'admin',
                'employee',
              ].includes(
                role
              )
          )
        : [
            'employee',
          ]

    const users =
      Array.isArray(
        parsed.users
      )
        ? parsed.users.map(
            String
          )
        : []

    return {
      roles,
      users,
    }
  } catch {
    return {
      roles: [
        'employee',
      ],
      users: [],
    }
  }
}

function resourceIsVisible(
  resource,
  viewerRole
) {
  if (
    viewerRole ===
    'admin'
  ) {
    return true
  }

  return (
    resource.access?.roles?.includes(
      'employee'
    ) ||
    resource.access?.users
      ?.length > 0
  )
}

function buildResourceQuery(
  req
) {
  const {
    search = '',
    type = 'all',
    parentId = 'root',
  } = req.query

  const query = {}

  if (
    type !== 'all'
  ) {
    query.type =
      type
  }

  if (
    parentId === 'root' ||
    !parentId
  ) {
    query.parentId =
      null
  } else if (
    mongoose.Types.ObjectId.isValid(
      parentId
    )
  ) {
    query.parentId =
      parentId
  } else {
    query.parentId =
      null
  }

  if (
    search.trim()
  ) {
    query.$text = {
      $search:
        search.trim(),
    }
  }

  return query
}

// ============================================================================
// MEETING HELPERS
// ============================================================================

const meetings =
  new Map()

function generateMeetingId() {
  return Math.random()
    .toString(36)
    .substring(
      2,
      10
    )
}

function getTimestamp() {
  return new Date()
    .toISOString()
}

function getMeeting(
  meetingId
) {
  if (
    !meetings.has(
      meetingId
    )
  ) {
    meetings.set(
      meetingId,
      {
        users:
          new Map(),
      }
    )
  }

  return meetings.get(
    meetingId
  )
}

function getPublicUser(
  user
) {
  return {
    socketId:
      user.socketId,

    meetingId:
      user.meetingId,

    name:
      user.name,

    userId:
      user.userId,

    role:
      user.role,

    micOn:
      user.micOn,

    cameraOn:
      user.cameraOn,

    joinedAt:
      user.joinedAt,
  }
}

// ============================================================================
// HEALTH CHECK
// ============================================================================

app.get(
  '/',
  (req, res) => {
    res.json({
      success: true,

      message:
        'Meeting server is running',

      timestamp:
        getTimestamp(),
    })
  }
)

// ============================================================================
// MEETING API
// ============================================================================

// CREATE MEETING

app.post(
  '/api/meetings',
  async (
    req,
    res
  ) => {
    try {
      const {
        title,
        description,
        date,
        time,
        duration,
        camera,
        microphone,
        access,
        participantLimit,
      } = req.body

      let meetingId

      do {
        meetingId =
          generateMeetingId()
      } while (
        await Meeting.exists({
          meetingId,
        })
      )

      const meeting =
        await Meeting.create({
          meetingId,

          title:
            title ||
            'Untitled Meeting',

          description:
            description ||
            '',

          scheduledDate:
            date || '',

          scheduledTime:
            time || '',

          duration:
            Number(
              duration
            ) || 60,

          camera:
            typeof camera ===
            'boolean'
              ? camera
              : true,

          microphone:
            typeof microphone ===
            'boolean'
              ? microphone
              : true,

          access:
            access ||
            'anyone',

          participantLimit:
            Number(
              participantLimit
            ) || 50,

          status:
            'scheduled',
        })

      console.log(
        `[DB] Meeting created: ${meetingId}`
      )

      res.status(201).json({
        success: true,

        meeting: {
          meetingId:
            meeting.meetingId,

          title:
            meeting.title,

          description:
            meeting.description,

          scheduledDate:
            meeting.scheduledDate,

          scheduledTime:
            meeting.scheduledTime,

          duration:
            meeting.duration,

          camera:
            meeting.camera,

          microphone:
            meeting.microphone,

          access:
            meeting.access,

          participantLimit:
            meeting.participantLimit,

          status:
            meeting.status,

          createdAt:
            meeting.createdAt,
        },
      })
    } catch (error) {
      console.error(
        'Create meeting error:',
        error
      )

      res.status(500).json({
        success: false,
        message:
          'Failed to create meeting',
      })
    }
  }
)

// GET MEETING

app.get(
  '/api/meetings/:meetingId',
  async (
    req,
    res
  ) => {
    try {
      const meeting =
        await Meeting.findOne({
          meetingId:
            req.params.meetingId,
        })

      if (!meeting) {
        return res.status(
          404
        ).json({
          success: false,
          message:
            'Meeting not found',
        })
      }

      res.json({
        success: true,
        meeting,
      })
    } catch (error) {
      console.error(
        'Get meeting error:',
        error
      )

      res.status(500).json({
        success: false,
        message:
          'Failed to get meeting',
      })
    }
  }
)

// START MEETING

app.post(
  '/api/meetings/:meetingId/start',
  async (
    req,
    res
  ) => {
    try {
      const meeting =
        await Meeting.findOneAndUpdate(
          {
            meetingId:
              req.params.meetingId,
          },

          {
            status:
              'active',

            startedAt:
              new Date(),
          },

          {
            new: true,
          }
        )

      if (!meeting) {
        return res.status(
          404
        ).json({
          success: false,
          message:
            'Meeting not found',
        })
      }

      console.log(
        `[DB] Meeting started: ${meeting.meetingId}`
      )

      res.json({
        success: true,
        meeting,
      })
    } catch (error) {
      console.error(
        'Start meeting error:',
        error
      )

      res.status(500).json({
        success: false,
        message:
          'Failed to start meeting',
      })
    }
  }
)

// END MEETING

app.post(
  '/api/meetings/:meetingId/end',
  async (
    req,
    res
  ) => {
    try {
      const meeting =
        await Meeting.findOneAndUpdate(
          {
            meetingId:
              req.params.meetingId,
          },

          {
            status:
              'ended',

            endedAt:
              new Date(),
          },

          {
            new: true,
          }
        )

      if (!meeting) {
        return res.status(
          404
        ).json({
          success: false,
          message:
            'Meeting not found',
        })
      }

      console.log(
        `[DB] Meeting ended: ${meeting.meetingId}`
      )

      res.json({
        success: true,
        meeting,
      })
    } catch (error) {
      console.error(
        'End meeting error:',
        error
      )

      res.status(500).json({
        success: false,
        message:
          'Failed to end meeting',
      })
    }
  }
)

// ============================================================================
// RESOURCE API
// ============================================================================

// GET RESOURCES

app.get(
  '/api/resources',
  async (
    req,
    res
  ) => {
    try {
      const viewerRole =
        req.query.role ===
        'admin'
          ? 'admin'
          : 'employee'

      const resources =
        await Resource.find(
          buildResourceQuery(
            req
          )
        ).sort({
          type: 1,
          name: 1,
        })

      const visible =
        resources.filter(
          (
            resource
          ) =>
            resourceIsVisible(
              resource,
              viewerRole
            )
        )

      res.json({
        success: true,
        role:
          viewerRole,
        resources:
          visible,
      })
    } catch (error) {
      console.error(
        'List resources error:',
        error
      )

      res.status(500).json({
        success: false,
        message:
          'Failed to load resources',
      })
    }
  }
)

// CREATE FOLDER

app.post(
  '/api/resources/folders',
  async (
    req,
    res
  ) => {
    try {
      const {
        name,
        parentId = null,
        access,
      } = req.body

      if (
        !name?.trim()
      ) {
        return res.status(
          400
        ).json({
          success: false,
          message:
            'Folder name is required',
        })
      }

      const folder =
        await Resource.create({
          name:
            name.trim(),

          type:
            'folder',

          parentId:
            parentId || null,

          access:
            parseAccess(
              access
            ),
        })

      res.status(201).json({
        success: true,
        resource:
          folder,
      })
    } catch (error) {
      console.error(
        'Create folder error:',
        error
      )

      res.status(500).json({
        success: false,
        message:
          'Failed to create folder',
      })
    }
  }
)

// CREATE LINK

app.post(
  '/api/resources/links',
  async (
    req,
    res
  ) => {
    try {
      const {
        name,
        url,
        description = '',
        parentId = null,
        access,
      } = req.body

      if (
        !name?.trim() ||
        !url?.trim()
      ) {
        return res.status(
          400
        ).json({
          success: false,
          message:
            'Name and URL are required',
        })
      }

      try {
        new URL(url)
      } catch {
        return res.status(
          400
        ).json({
          success: false,
          message:
            'Invalid URL',
        })
      }

      const resource =
        await Resource.create({
          name:
            name.trim(),

          type:
            'link',

          url:
            url.trim(),

          description,

          parentId:
            parentId || null,

          access:
            parseAccess(
              access
            ),
        })

      res.status(201).json({
        success: true,
        resource,
      })
    } catch (error) {
      console.error(
        'Create link error:',
        error
      )

      res.status(500).json({
        success: false,
        message:
          'Failed to create link',
      })
    }
  }
)

// UPLOAD FILE

app.post(
  '/api/resources/upload',
  upload.single(
    'file'
  ),
  async (
    req,
    res
  ) => {
    try {
      if (!req.file) {
        return res.status(
          400
        ).json({
          success: false,
          message:
            'File is required',
        })
      }

      const access =
        parseAccess(
          req.body.access
        )

      const parentId =
        req.body.parentId ||
        null

      const bucket =
        getResourceBucket()

      const gridFsId =
        new mongoose.Types.ObjectId()

      const stream =
        bucket.openUploadStreamWithId(
          gridFsId,

          req.file.originalname,

          {
            contentType:
              req.file.mimetype,

            metadata: {
              originalName:
                req.file.originalname,
            },
          }
        )

      stream.on(
        'error',
        (error) => {
          console.error(
            'GridFS upload error:',
            error
          )

          if (
            !res.headersSent
          ) {
            res.status(
              500
            ).json({
              success: false,
              message:
                'Failed to upload file',
            })
          }
        }
      )

      stream.on(
        'finish',
        async () => {
          try {
            const resource =
              await Resource.create({
                name:
                  req.file
                    .originalname,

                type:
                  'file',

                mimeType:
                  req.file
                    .mimetype,

                size:
                  req.file.size,

                gridFsId,

                parentId,

                access,
              })

            res.status(
              201
            ).json({
              success: true,
              resource,
            })
          } catch (error) {
            console.error(
              'Resource metadata error:',
              error
            )

            res.status(
              500
            ).json({
              success: false,
              message:
                'File uploaded but metadata could not be saved',
            })
          }
        }
      )

      stream.end(
        req.file.buffer
      )
    } catch (error) {
      console.error(
        'Upload error:',
        error
      )

      res.status(500).json({
        success: false,
        message:
          error.message ||
          'Failed to upload file',
      })
    }
  }
)

// UPDATE ACCESS

app.patch(
  '/api/resources/:id/access',
  async (
    req,
    res
  ) => {
    try {
      const access =
        parseAccess(
          req.body
        )

      const resource =
        await Resource.findByIdAndUpdate(
          req.params.id,

          {
            access,
          },

          {
            new: true,
          }
        )

      if (!resource) {
        return res.status(
          404
        ).json({
          success: false,
          message:
            'Resource not found',
        })
      }

      res.json({
        success: true,
        resource,
      })
    } catch (error) {
      console.error(
        'Access update error:',
        error
      )

      res.status(500).json({
        success: false,
        message:
          'Failed to update access',
      })
    }
  }
)

// DOWNLOAD FILE

app.get(
  '/api/resources/:id/download',
  async (
    req,
    res
  ) => {
    try {
      const resource =
        await Resource.findById(
          req.params.id
        )

      if (
        !resource ||
        resource.type !==
          'file'
      ) {
        return res.status(
          404
        ).json({
          success: false,
          message:
            'File not found',
        })
      }

      const viewerRole =
        req.query.role ===
        'admin'
          ? 'admin'
          : 'employee'

      if (
        !resourceIsVisible(
          resource,
          viewerRole
        )
      ) {
        return res.status(
          403
        ).json({
          success: false,
          message:
            'You do not have access to this file',
        })
      }

      const bucket =
        getResourceBucket()

      res.set(
        'Content-Type',

        resource.mimeType ||
          'application/octet-stream'
      )

      res.set(
        'Content-Disposition',

        `attachment; filename="${encodeURIComponent(
          resource.name
        )}"`
      )

      const stream =
        bucket.openDownloadStream(
          resource.gridFsId
        )

      stream.on(
        'error',
        (error) => {
          console.error(
            'Download error:',
            error
          )

          if (
            !res.headersSent
          ) {
            res.status(
              404
            ).json({
              success: false,
              message:
                'File data not found',
            })
          }
        }
      )

      stream.pipe(
        res
      )
    } catch (error) {
      console.error(
        'Download endpoint error:',
        error
      )

      res.status(500).json({
        success: false,
        message:
          'Failed to download file',
      })
    }
  }
)

// DELETE RESOURCE

app.delete(
  '/api/resources/:id',
  async (
    req,
    res
  ) => {
    try {
      const resource =
        await Resource.findById(
          req.params.id
        )

      if (!resource) {
        return res.status(
          404
        ).json({
          success: false,
          message:
            'Resource not found',
        })
      }

      if (
        resource.type ===
        'folder'
      ) {
        const childCount =
          await Resource.countDocuments({
            parentId:
              resource._id,
          })

        if (
          childCount > 0
        ) {
          return res.status(
            400
          ).json({
            success: false,
            message:
              'Folder is not empty',
          })
        }
      }

      if (
        resource.type ===
          'file' &&
        resource.gridFsId
      ) {
        try {
          const bucket =
            getResourceBucket()

          await bucket.delete(
            resource.gridFsId
          )
        } catch (error) {
          console.warn(
            'GridFS object could not be deleted:',
            error.message
          )
        }
      }

      await resource.deleteOne()

      res.json({
        success: true,
        message:
          'Resource deleted',
      })
    } catch (error) {
      console.error(
        'Delete resource error:',
        error
      )

      res.status(500).json({
        success: false,
        message:
          'Failed to delete resource',
      })
    }
  }
)

// ============================================================================
// ASSET API
// ============================================================================
//
// ADMIN:
//   GET    /api/assets
//   POST   /api/assets
//   PUT    /api/assets/:id
//   DELETE /api/assets/:id
//
// EMPLOYEE:
//   GET    /api/assets/my/:userId
//
// USERS:
//   GET    /api/assets/employees
//
// ============================================================================

// ----------------------------------------------------------------------------
// GET ALL EMPLOYEES
// ----------------------------------------------------------------------------

app.get(
  '/api/assets/employees',
  async (
    req,
    res
  ) => {
    try {
      const employees =
        await User.find({
          role: {
            $regex:
              /^employee$/i,
          },
        })
          .select(
            'firstName lastName email phone department role'
          )
          .sort({
            firstName: 1,
          })

      res.json({
        success: true,
        employees,
      })
    } catch (error) {
      console.error(
        'Get employees error:',
        error
      )

      res.status(500).json({
        success: false,
        message:
          'Failed to load employees',
      })
    }
  }
)

// ----------------------------------------------------------------------------
// GET ALL ASSETS
// ----------------------------------------------------------------------------

app.get(
  '/api/assets',
  async (
    req,
    res
  ) => {
    try {
      const {
        search = '',
        category = 'All',
        status = 'All',
      } = req.query

      const query = {}

      if (
        search.trim()
      ) {
        query.$or = [
          {
            name: {
              $regex:
                search.trim(),
              $options:
                'i',
            },
          },

          {
            assetId: {
              $regex:
                search.trim(),
              $options:
                'i',
            },
          },

          {
            assignedTo: {
              $regex:
                search.trim(),
              $options:
                'i',
            },
          },

          {
            department: {
              $regex:
                search.trim(),
              $options:
                'i',
            },
          },
        ]
      }

      if (
        category !==
        'All'
      ) {
        query.category =
          category
      }

      if (
        status !==
        'All'
      ) {
        query.status =
          status
      }

      const assets =
        await Asset.find(
          query
        ).sort({
          createdAt:
            -1,
        })

      res.json({
        success: true,
        assets,
      })
    } catch (error) {
      console.error(
        'Get assets error:',
        error
      )

      res.status(500).json({
        success: false,
        message:
          'Failed to load assets',
      })
    }
  }
)

// ----------------------------------------------------------------------------
// GET SINGLE ASSET
// ----------------------------------------------------------------------------

app.get(
  '/api/assets/:id',
  async (
    req,
    res
  ) => {
    try {
      const asset =
        await Asset.findById(
          req.params.id
        )

      if (!asset) {
        return res.status(
          404
        ).json({
          success: false,
          message:
            'Asset not found',
        })
      }

      res.json({
        success: true,
        asset,
      })
    } catch (error) {
      console.error(
        'Get asset error:',
        error
      )

      res.status(500).json({
        success: false,
        message:
          'Failed to load asset',
      })
    }
  }
)

// ----------------------------------------------------------------------------
// GET EMPLOYEE'S ASSETS
// ----------------------------------------------------------------------------

app.get(
  '/api/assets/my/:userId',
  async (
    req,
    res
  ) => {
    try {
      const userId =
        String(
          req.params.userId
        )

      const user =
        await User.findById(
          userId
        ).select(
          'firstName lastName email department role'
        )

      if (!user) {
        return res.status(
          404
        ).json({
          success: false,
          message:
            'Employee not found',
        })
      }

      const assets =
        await Asset.find({
          assignedToUserId:
            userId,
        }).sort({
          createdAt:
            -1,
        })

      res.json({
        success: true,

        employee: user,

        assets,
      })
    } catch (error) {
      console.error(
        'Get employee assets error:',
        error
      )

      res.status(500).json({
        success: false,
        message:
          'Failed to load your assets',
      })
    }
  }
)

// ----------------------------------------------------------------------------
// CREATE ASSET
// ----------------------------------------------------------------------------

app.post(
  '/api/assets',
  async (
    req,
    res
  ) => {
    try {
      const {
        name,
        assetId,
        category,
        status,
        assignedToUserId,
        assignedTo,
        department,
      } = req.body

      if (
        !name?.trim() ||
        !assetId?.trim()
      ) {
        return res.status(
          400
        ).json({
          success: false,
          message:
            'Asset name and asset ID are required',
        })
      }

      const existing =
        await Asset.findOne({
          assetId:
            assetId.trim(),
        })

      if (existing) {
        return res.status(
          409
        ).json({
          success: false,
          message:
            'Asset ID already exists',
        })
      }

      let employee =
        null

      if (
        assignedToUserId
      ) {
        employee =
          await User.findById(
            assignedToUserId
          )

        if (!employee) {
          return res.status(
            404
          ).json({
            success: false,
            message:
              'Assigned employee not found',
          })
        }
      }

      let finalAssignedTo =
        'Unassigned'

      let finalDepartment =
        department?.trim() ||
        '—'

      let finalEmail =
        null

      let finalUserId =
        null

      let finalStatus =
        status ||
        'Available'

      if (employee) {
        finalUserId =
          String(
            employee._id
          )

        finalEmail =
          employee.email

        finalAssignedTo =
          `${employee.firstName || ''} ${
            employee.lastName || ''
          }`.trim()

        finalDepartment =
          employee.department ||
          finalDepartment

        finalStatus =
          'Assigned'
      } else if (
        assignedTo?.trim()
      ) {
        finalAssignedTo =
          assignedTo.trim()

        if (
          finalStatus ===
          'Available'
        ) {
          finalStatus =
            'Assigned'
        }
      }

      const asset =
        await Asset.create({
          name:
            name.trim(),

          assetId:
            assetId.trim(),

          category:
            category ||
            'Other',

          status:
            finalStatus,

          assignedTo:
            finalAssignedTo,

          assignedToUserId:
            finalUserId,

          assignedToEmail:
            finalEmail,

          department:
            finalDepartment,

          createdAt:
            new Date(),

          updatedAt:
            new Date(),
        })

      // Send email when assigned to an employee.
      if (
        employee?.email
      ) {
        await sendEmail({
          to:
            employee.email,

          subject:
            `Asset Assigned: ${asset.name}`,

          html: `
            <div style="
              font-family: Arial, sans-serif;
              max-width: 600px;
              margin: auto;
              padding: 30px;
            ">

              <h2>
                Company Asset Assigned
              </h2>

              <p>
                Hello ${
                  employee.firstName ||
                  'Employee'
                },
              </p>

              <p>
                A company asset has been assigned to you.
              </p>

              <table style="
                border-collapse: collapse;
                width: 100%;
                margin-top: 20px;
              ">

                <tr>
                  <td style="
                    padding: 8px;
                    border: 1px solid #ddd;
                    font-weight: bold;
                  ">
                    Asset
                  </td>

                  <td style="
                    padding: 8px;
                    border: 1px solid #ddd;
                  ">
                    ${asset.name}
                  </td>
                </tr>

                <tr>
                  <td style="
                    padding: 8px;
                    border: 1px solid #ddd;
                    font-weight: bold;
                  ">
                    Asset ID
                  </td>

                  <td style="
                    padding: 8px;
                    border: 1px solid #ddd;
                  ">
                    ${asset.assetId}
                  </td>
                </tr>

                <tr>
                  <td style="
                    padding: 8px;
                    border: 1px solid #ddd;
                    font-weight: bold;
                  ">
                    Category
                  </td>

                  <td style="
                    padding: 8px;
                    border: 1px solid #ddd;
                  ">
                    ${asset.category}
                  </td>
                </tr>

                <tr>
                  <td style="
                    padding: 8px;
                    border: 1px solid #ddd;
                    font-weight: bold;
                  ">
                    Department
                  </td>

                  <td style="
                    padding: 8px;
                    border: 1px solid #ddd;
                  ">
                    ${asset.department}
                  </td>
                </tr>

              </table>

              <p style="
                margin-top: 25px;
                color: #777;
              ">
                Employee Management System
              </p>

            </div>
          `,
        })
      }

      res.status(
        201
      ).json({
        success: true,
        message:
          'Asset created successfully',
        asset,
      })
    } catch (error) {
      console.error(
        'Create asset error:',
        error
      )

      if (
        error.code ===
        11000
      ) {
        return res.status(
          409
        ).json({
          success: false,
          message:
            'Asset ID already exists',
        })
      }

      res.status(500).json({
        success: false,
        message:
          'Failed to create asset',
      })
    }
  }
)

// ----------------------------------------------------------------------------
// UPDATE ASSET
// ----------------------------------------------------------------------------

app.put(
  '/api/assets/:id',
  async (
    req,
    res
  ) => {
    try {
      const {
        name,
        assetId,
        category,
        status,
        assignedToUserId,
        assignedTo,
        department,
      } = req.body

      const asset =
        await Asset.findById(
          req.params.id
        )

      if (!asset) {
        return res.status(
          404
        ).json({
          success: false,
          message:
            'Asset not found',
        })
      }

      if (
        !name?.trim() ||
        !assetId?.trim()
      ) {
        return res.status(
          400
        ).json({
          success: false,
          message:
            'Asset name and asset ID are required',
        })
      }

      const duplicate =
        await Asset.findOne({
          assetId:
            assetId.trim(),

          _id: {
            $ne:
              asset._id,
          },
        })

      if (duplicate) {
        return res.status(
          409
        ).json({
          success: false,
          message:
            'Asset ID already exists',
        })
      }

      let employee =
        null

      if (
        assignedToUserId
      ) {
        employee =
          await User.findById(
            assignedToUserId
          )

        if (!employee) {
          return res.status(
            404
          ).json({
            success: false,
            message:
              'Assigned employee not found',
          })
        }
      }

      if (employee) {
        asset.assignedToUserId =
          String(
            employee._id
          )

        asset.assignedToEmail =
          employee.email

        asset.assignedTo =
          `${employee.firstName || ''} ${
            employee.lastName || ''
          }`.trim()

        asset.department =
          employee.department ||
          department?.trim() ||
          '—'

        asset.status =
          'Assigned'
      } else {
        asset.assignedToUserId =
          null

        asset.assignedToEmail =
          null

        asset.assignedTo =
          assignedTo?.trim() ||
          'Unassigned'

        asset.department =
          department?.trim() ||
          '—'

        asset.status =
          status ||
          'Available'
      }

      asset.name =
        name.trim()

      asset.assetId =
        assetId.trim()

      asset.category =
        category ||
        'Other'

      asset.updatedAt =
        new Date()

      await asset.save()

      res.json({
        success: true,
        message:
          'Asset updated successfully',
        asset,
      })
    } catch (error) {
      console.error(
        'Update asset error:',
        error
      )

      res.status(500).json({
        success: false,
        message:
          'Failed to update asset',
      })
    }
  }
)

// ----------------------------------------------------------------------------
// DELETE ASSET
// ----------------------------------------------------------------------------

app.delete(
  '/api/assets/:id',
  async (
    req,
    res
  ) => {
    try {
      const asset =
        await Asset.findByIdAndDelete(
          req.params.id
        )

      if (!asset) {
        return res.status(
          404
        ).json({
          success: false,
          message:
            'Asset not found',
        })
      }

      res.json({
        success: true,
        message:
          'Asset deleted successfully',
      })
    } catch (error) {
      console.error(
        'Delete asset error:',
        error
      )

      res.status(500).json({
        success: false,
        message:
          'Failed to delete asset',
      })
    }
  }
)

// ============================================================================
// SOCKET.IO
// ============================================================================

io.on(
  'connection',
  (socket) => {
    console.log(
      `Socket connected: ${socket.id}`
    )

    // ========================================================================
    // JOIN MEETING
    // ========================================================================

    socket.on(
      'meeting:join',

      async ({
        meetingId,
        name,
        userId = null,
        role =
          'participant',
        micOn = true,
        cameraOn = true,
      }) => {
        try {
          if (
            !meetingId
          ) {
            socket.emit(
              'meeting:error',
              {
                message:
                  'Meeting ID is missing.',
              }
            )

            return
          }

          const databaseMeeting =
            await Meeting.findOne({
              meetingId,
            })

          if (
            !databaseMeeting
          ) {
            console.warn(
              `[${meetingId}] Join rejected: meeting does not exist`
            )

            socket.emit(
              'meeting:error',
              {
                code:
                  'MEETING_NOT_FOUND',

                message:
                  'Meeting does not exist. Please check the meeting link.',
              }
            )

            return
          }

          const meeting =
            getMeeting(
              meetingId
            )

          if (
            meeting.users.size >=
            databaseMeeting.participantLimit
          ) {
            socket.emit(
              'meeting:error',
              {
                code:
                  'MEETING_FULL',

                message:
                  'This meeting has reached its participant limit.',
              }
            )

            return
          }

          const user = {
            socketId:
              socket.id,

            meetingId,

            name:
              name ||
              (
                role ===
                'host'
                  ? 'Host'
                  : 'Participant'
              ),

            userId,

            role,

            micOn,

            cameraOn,

            joinedAt:
              getTimestamp(),
          }

          socket.meetingId =
            meetingId

          socket.meetingUser =
            user

          meeting.users.set(
            socket.id,
            user
          )

          socket.join(
            meetingId
          )

          databaseMeeting.participants.push({
            socketId:
              socket.id,

            userId,

            name:
              user.name,

            role,

            micOn,

            cameraOn,

            joinedAt:
              new Date(),
          })

          if (
            databaseMeeting.status ===
            'scheduled'
          ) {
            databaseMeeting.status =
              'active'

            databaseMeeting.startedAt =
              new Date()
          }

          await databaseMeeting.save()

          const existingUsers =
            Array.from(
              meeting.users.values()
            )
              .filter(
                (
                  existingUser
                ) =>
                  existingUser.socketId !==
                  socket.id
              )
              .map(
                getPublicUser
              )

          socket.emit(
            'meeting:existing-users',
            existingUsers
          )

          socket
            .to(
              meetingId
            )
            .emit(
              'meeting:user-joined',
              getPublicUser(
                user
              )
            )

          io.to(
            meetingId
          ).emit(
            'meeting:participant-count',
            meeting.users.size
          )

          console.log(
            `[${meetingId}] ${user.name} joined as ${user.role}`
          )

          console.log(
            `[${meetingId}] Users: ${meeting.users.size}`
          )
        } catch (error) {
          console.error(
            'Join meeting error:',
            error
          )

          socket.emit(
            'meeting:error',
            {
              message:
                'Failed to join the meeting.',
            }
          )
        }
      }
    )

    // ========================================================================
    // CHAT
    // ========================================================================

    socket.on(
      'meeting:chat-message',

      async ({
        meetingId,
        message,
      }) => {
        try {
          const user =
            socket.meetingUser

          if (!user) {
            return
          }

          if (
            !meetingId ||
            meetingId !==
              socket.meetingId
          ) {
            return
          }

          const trimmedMessage =
            String(
              message || ''
            ).trim()

          if (
            !trimmedMessage
          ) {
            return
          }

          const chatMessage = {
            id:
              `${socket.id}-${Date.now()}`,

            meetingId,

            socketId:
              socket.id,

            userId:
              user.userId,

            sender:
              user.name,

            role:
              user.role,

            message:
              trimmedMessage,

            timestamp:
              getTimestamp(),
          }

          await Meeting.findOneAndUpdate(
            {
              meetingId,
            },

            {
              $push: {
                messages: {
                  id:
                    chatMessage.id,

                  socketId:
                    chatMessage.socketId,

                  userId:
                    chatMessage.userId,

                  sender:
                    chatMessage.sender,

                  role:
                    chatMessage.role,

                  message:
                    chatMessage.message,

                  timestamp:
                    new Date(
                      chatMessage.timestamp
                    ),
                },
              },
            }
          )

          io.to(
            meetingId
          ).emit(
            'meeting:chat-message',
            chatMessage
          )

          console.log(
            `[${meetingId}] CHAT ${user.name}: ${trimmedMessage}`
          )
        } catch (error) {
          console.error(
            'Chat error:',
            error
          )
        }
      }
    )

    // ========================================================================
    // MEDIA STATE
    // ========================================================================

    socket.on(
      'meeting:media-state',

      ({
        meetingId,
        micOn,
        cameraOn,
      }) => {
        const user =
          socket.meetingUser

        if (!user) {
          return
        }

        if (
          !meetingId ||
          meetingId !==
            socket.meetingId
        ) {
          return
        }

        if (
          typeof micOn ===
          'boolean'
        ) {
          user.micOn =
            micOn
        }

        if (
          typeof cameraOn ===
          'boolean'
        ) {
          user.cameraOn =
            cameraOn
        }

        const mediaState = {
          meetingId,

          socketId:
            socket.id,

          userId:
            user.userId,

          name:
            user.name,

          role:
            user.role,

          micOn:
            user.micOn,

          cameraOn:
            user.cameraOn,

          timestamp:
            getTimestamp(),
        }

        socket
          .to(
            meetingId
          )
          .emit(
            'meeting:media-state',
            mediaState
          )
      }
    )

    // ========================================================================
    // WEBRTC OFFER
    // ========================================================================

    socket.on(
      'webrtc:offer',

      ({
        target,
        offer,
      }) => {
        if (
          !target ||
          !offer
        ) {
          return
        }

        io.to(
          target
        ).emit(
          'webrtc:offer',
          {
            sender:
              socket.id,

            offer,
          }
        )

        console.log(
          `[WEBRTC] OFFER ${socket.id} -> ${target}`
        )
      }
    )

    // ========================================================================
    // WEBRTC ANSWER
    // ========================================================================

    socket.on(
      'webrtc:answer',

      ({
        target,
        answer,
      }) => {
        if (
          !target ||
          !answer
        ) {
          return
        }

        io.to(
          target
        ).emit(
          'webrtc:answer',
          {
            sender:
              socket.id,

            answer,
          }
        )

        console.log(
          `[WEBRTC] ANSWER ${socket.id} -> ${target}`
        )
      }
    )

    // ========================================================================
    // WEBRTC ICE
    // ========================================================================

    socket.on(
      'webrtc:ice-candidate',

      ({
        target,
        candidate,
      }) => {
        if (
          !target ||
          !candidate
        ) {
          return
        }

        io.to(
          target
        ).emit(
          'webrtc:ice-candidate',
          {
            sender:
              socket.id,

            candidate,
          }
        )
      }
    )

    // ========================================================================
    // LEAVE
    // ========================================================================

    socket.on(
      'meeting:leave',

      async () => {
        await removeUserFromMeeting(
          socket
        )
      }
    )

    // ========================================================================
    // DISCONNECT
    // ========================================================================

    socket.on(
      'disconnect',

      async (
        reason
      ) => {
        console.log(
          `Socket disconnected: ${socket.id} (${reason})`
        )

        await removeUserFromMeeting(
          socket
        )
      }
    )
  }
)

// ============================================================================
// REMOVE USER FROM MEETING
// ============================================================================

async function removeUserFromMeeting(
  socket
) {
  const meetingId =
    socket.meetingId

  const user =
    socket.meetingUser

  if (
    !meetingId ||
    !user
  ) {
    return
  }

  const meeting =
    meetings.get(
      meetingId
    )

  if (!meeting) {
    return
  }

  if (
    !meeting.users.has(
      socket.id
    )
  ) {
    return
  }

  meeting.users.delete(
    socket.id
  )

  socket.leave(
    meetingId
  )

  try {
    const databaseMeeting =
      await Meeting.findOne({
        meetingId,
      })

    if (
      databaseMeeting
    ) {
      const participant =
        databaseMeeting.participants.find(
          (
            item
          ) =>
            item.socketId ===
            socket.id
        )

      if (
        participant
      ) {
        participant.leftAt =
          new Date()

        await databaseMeeting.save()
      }
    }
  } catch (error) {
    console.error(
      'Participant DB update error:',
      error
    )
  }

  io.to(
    meetingId
  ).emit(
    'meeting:user-left',
    {
      meetingId,

      socketId:
        socket.id,

      userId:
        user.userId,

      name:
        user.name,

      role:
        user.role,

      timestamp:
        getTimestamp(),
    }
  )

  io.to(
    meetingId
  ).emit(
    'meeting:participant-count',
    meeting.users.size
  )

  console.log(
    `[${meetingId}] ${user.name} left`
  )

  if (
    meeting.users.size ===
    0
  ) {
    meetings.delete(
      meetingId
    )

    console.log(
      `[${meetingId}] In-memory meeting removed`
    )
  }

  socket.meetingId =
    null

  socket.meetingUser =
    null
}

// ============================================================================
// MULTER ERROR HANDLER
// ============================================================================

app.use(
  (
    error,
    req,
    res,
    next
  ) => {
    if (
      error instanceof
      multer.MulterError
    ) {
      return res.status(
        400
      ).json({
        success: false,
        message:
          error.message,
      })
    }

    if (
      error &&
      error.message ===
        'Unsupported file type.'
    ) {
      return res.status(
        400
      ).json({
        success: false,
        message:
          'Unsupported file type. Allowed: PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, TXT, JPG, PNG, WEBP and ZIP.',
      })
    }

    next(error)
  }
)

}
