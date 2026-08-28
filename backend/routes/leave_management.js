const express = require('express')
const router = express.Router()
const {HandleCreateLeave,HandleGetLeave,HandleUpdateStatus} = require('../controller/leave_management')

const authMiddleware = require("../middleware/authMiddleware")

router.get('/',authMiddleware,HandleGetLeave)
router.post('/',authMiddleware,HandleCreateLeave)
router.put('/:id',authMiddleware,HandleUpdateStatus)



module.exports=router;