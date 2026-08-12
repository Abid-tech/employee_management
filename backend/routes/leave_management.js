const express = require('express')
const router = express.Router()
const {HandleCreateLeave,HandleGetLeave,HandleUpdateStatus} = require('../controller/leave_management')


router.get('/',HandleGetLeave)
router.post('/',HandleCreateLeave)
router.put('/:id',HandleUpdateStatus)



module.exports=router;