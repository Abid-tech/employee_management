const Communication = require("../model/communication")
const PollVote = require("../model/pollVote")


/*
    ADMIN: Create announcement or poll
*/
const HandleCreateCommunication = async (req, res) => {

    try {

        const userId = req.user.userId
        const role = req.user.role

        // Only Admin can create communications
        if (role !== "Admin") {

            return res.status(403).json({
                success: false,
                message: "Only admin can create communications"
            })
        }


        const {
            type,
            title,
            message,
            options,
            expiresAt
        } = req.body


        // Validate type
        if (!["Announcement", "Poll"].includes(type)) {

            return res.status(400).json({
                success: false,
                message: "Invalid communication type"
            })
        }


        // Poll must have options
        if (
            type === "Poll" &&
            (!options || options.length < 2)
        ) {

            return res.status(400).json({
                success: false,
                message: "A poll must have at least two options"
            })
        }


        const communication = await Communication.create({

            type,
            title,
            message,

            options:
                type === "Poll"
                    ? options.map(option => ({
                        text: option,
                        votes: 0
                    }))
                    : [],

            createdBy: userId,

            expiresAt:
                expiresAt || null
        })


        res.status(201).json({

            success: true,

            message:
                "Communication created successfully",

            communication

        })

    } catch (err) {

        console.log(err)

        res.status(500).json({

            success: false,
            message: "Failed to create communication",
            error: err.message

        })
    }
}


/*
    EMPLOYEE: Get all communications
*/
const HandleGetCommunications = async (req, res) => {

    try {

        const communications = await Communication
            .find()
            .populate(
                "createdBy",
                "firstName lastName"
            )
            .sort({
                createdAt: -1
            })


        res.status(200).json({

            success: true,
            communications

        })

    } catch (err) {

        console.log(err)

        res.status(500).json({

            success: false,
            message: "Failed to fetch communications"

        })
    }
}


/*
    EMPLOYEE:
    Vote in a poll
*/
const HandleVotePoll = async (req, res) => {

    try {

        const userId = req.user.userId
        const { id } = req.params
        const { optionId } = req.body


        const poll = await Communication.findById(id)


        if (!poll) {

            return res.status(404).json({

                success: false,
                message: "Poll not found"

            })
        }


        if (poll.type !== "Poll") {

            return res.status(400).json({

                success: false,
                message: "This communication is not a poll"

            })
        }


        // Check whether user already voted
        const existingVote = await PollVote.findOne({

            poll: id,
            user: userId

        })


        if (existingVote) {

            return res.status(400).json({

                success: false,
                message: "You have already voted in this poll"

            })
        }


        // Find selected option
        const selectedOption = poll.options.id(optionId)


        if (!selectedOption) {

            return res.status(400).json({

                success: false,
                message: "Invalid poll option"

            })
        }


        // Create vote
        await PollVote.create({

            poll: id,
            user: userId,
            optionId

        })


        // Increase vote count
        selectedOption.votes += 1


        await poll.save()


        res.status(200).json({

            success: true,
            message: "Vote submitted successfully"

        })

    } catch (err) {

        console.log(err)

        // Duplicate vote protection
        if (err.code === 11000) {

            return res.status(400).json({

                success: false,
                message: "You have already voted in this poll"

            })
        }


        res.status(500).json({

            success: false,
            message: "Failed to submit vote"

        })
    }
}


/*
    ADMIN:
    Get poll results
*/
const HandleGetPollResults = async (req, res) => {

    try {

        const role = req.user.role

        if (role !== "Admin") {

            return res.status(403).json({

                success: false,
                message: "Only admin can view poll results"

            })
        }


        const { id } = req.params


        const poll = await Communication.findById(id)


        if (!poll || poll.type !== "Poll") {

            return res.status(404).json({

                success: false,
                message: "Poll not found"

            })
        }


        const votes = await PollVote
            .find({
                poll: id
            })
            .populate(
                "user",
                "firstName lastName email department"
            )


        res.status(200).json({

            success: true,

            poll,

            votes

        })

    } catch (err) {

        console.log(err)

        res.status(500).json({

            success: false,
            message: "Failed to fetch poll results"

        })
    }
}


module.exports = {
    HandleCreateCommunication,
    HandleGetCommunications,
    HandleVotePoll,
    HandleGetPollResults
}