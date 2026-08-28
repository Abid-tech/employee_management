const express = require("express")

const router = express.Router()

const authMiddleware =
    require("../middleware/authMiddleware")

const {
    HandleCreateCommunication,
    HandleGetCommunications,
    HandleVotePoll,
    HandleGetPollResults
} = require("../controller/communication")


// Get announcements and polls
router.get(
    "/",
    authMiddleware,
    HandleGetCommunications
)


// Admin creates announcement/poll
router.post(
    "/",
    authMiddleware,
    HandleCreateCommunication
)


// Employee votes
router.post(
    "/:id/vote",
    authMiddleware,
    HandleVotePoll
)


// Admin gets poll results
router.get(
    "/:id/results",
    authMiddleware,
    HandleGetPollResults
)


module.exports = router