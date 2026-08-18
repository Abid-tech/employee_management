const express = require('express')
const router = express.Router()
const multer = require('multer')
const { authMiddleware, requireRole } = require('../middleware/authMiddleware')
const {
    getHolidays,
    createHoliday,
    updateHoliday,
    deleteHoliday,
    generateRecurring,
    importCSV,
    checkConflicts,
    flagConflicts,
} = require('../controller/holidayController')

const upload = multer({ storage: multer.memoryStorage() })

// Public
router.get('/', getHolidays)

// Admin-only
router.post('/', authMiddleware, requireRole('Admin'), createHoliday)
router.put('/:id', authMiddleware, requireRole('Admin'), updateHoliday)
router.delete('/:id', authMiddleware, requireRole('Admin'), deleteHoliday)

// 1a - Recurring
router.post('/generate-recurring', authMiddleware, requireRole('Admin'), generateRecurring)

// 1b - CSV import
router.post('/import-csv', authMiddleware, requireRole('Admin'), upload.single('file'), importCSV)

// 1c - Conflict detection
router.post('/check-conflicts', authMiddleware, requireRole('Admin'), checkConflicts)
router.post('/flag-conflicts', authMiddleware, requireRole('Admin'), flagConflicts)

module.exports = router
