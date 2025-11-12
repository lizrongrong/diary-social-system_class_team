const express = require('express')
const router = express.Router()
const messageController = require('../controllers/messageController')
const { authMiddleware } = require('../middleware/auth')

// List recent conversations (summary)
router.get('/', authMiddleware, messageController.getConversations)

// Get messages between current user and :otherId
router.get('/:otherId/messages', authMiddleware, messageController.getMessagesWith)

// Send a message to otherId
router.post('/:otherId/messages', authMiddleware, messageController.sendMessageTo)

module.exports = router
