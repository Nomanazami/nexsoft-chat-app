const express = require('express');
const router = express.Router();
const { getModels } = require('../database');
const authMiddleware = require('../middleware');

// @route   POST /api/messages
// @desc    Send a message
router.post('/', authMiddleware, async (req, res) => {
  const { chatId, content } = req.body;

  if (!chatId || !content) {
    return res.status(400).json({ message: 'Chat ID and content are required.' });
  }

  try {
    const { Message, Chat } = getModels();

    // Create message
    const newMessage = await Message.create({
      chat: chatId,
      sender: req.user._id,
      content
    });

    // Update lastMessage field in the chat
    await Chat.findByIdAndUpdate(chatId, {
      lastMessage: newMessage._id
    });

    // Populate sender details for response
    const populatedMessage = await Message.findById(newMessage._id)
      .populate('sender', 'username avatar online statusMessage');

    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error sending message.' });
  }
});

// @route   GET /api/messages/:chatId
// @desc    Get all messages for a chat room
router.get('/:chatId', authMiddleware, async (req, res) => {
  const { chatId } = req.params;

  try {
    const { Message } = getModels();

    const messages = await Message.find({ chat: chatId })
      .populate('sender', 'username avatar online statusMessage')
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    console.error('Fetch messages error:', error);
    res.status(500).json({ message: 'Server error retrieving messages.' });
  }
});

module.exports = router;
