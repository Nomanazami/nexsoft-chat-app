const express = require('express');
const router = express.Router();
const { getModels, isMongo } = require('../database');
const authMiddleware = require('../middleware');

// @route   POST /api/chats
// @desc    Create or access a Direct Message (DM) chat
router.post('/', authMiddleware, async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ message: 'User ID is required.' });
  }

  try {
    const { Chat, User } = getModels();

    // 1. Fetch user's non-group chats
    const myChats = await Chat.find({
      isGroup: false,
      participants: req.user._id
    }).populate('participants', 'username avatar email online statusMessage')
      .populate('lastMessage');

    // 2. Look for a chat that has the other user as a participant
    let existingChat = myChats.find(chat => {
      // For mock db, participants might be populated or raw IDs. 
      // We check if any participant matches userId.
      return chat.participants.some(p => {
        const id = p._id ? p._id.toString() : p.toString();
        return id === userId.toString();
      });
    });

    if (existingChat) {
      return res.json(existingChat);
    }

    // 3. Create a new chat if not existing
    const newChatData = {
      name: '',
      isGroup: false,
      participants: [req.user._id, userId]
    };

    const createdChat = await Chat.create(newChatData);
    
    // Fetch and populate the newly created chat
    const populatedChat = await Chat.findById(createdChat._id)
      .populate('participants', 'username avatar email online statusMessage');

    res.status(201).json(populatedChat);
  } catch (error) {
    console.error('Create DM chat error:', error);
    res.status(500).json({ message: 'Server error creating DM chat.' });
  }
});

// @route   POST /api/chats/group
// @desc    Create a Group Chat
router.post('/group', authMiddleware, async (req, res) => {
  const { name, participants } = req.body;

  if (!name || !participants || !Array.isArray(participants) || participants.length === 0) {
    return res.status(400).json({ message: 'Group name and participants are required.' });
  }

  try {
    const { Chat } = getModels();

    // Add creator to participants list
    const allParticipants = [...new Set([...participants, req.user._id.toString()])];

    const newChatData = {
      name,
      isGroup: true,
      participants: allParticipants,
      groupAdmin: req.user._id
    };

    const createdChat = await Chat.create(newChatData);

    const populatedChat = await Chat.findById(createdChat._id)
      .populate('participants', 'username avatar email online statusMessage')
      .populate('groupAdmin', 'username avatar email online statusMessage');

    res.status(201).json(populatedChat);
  } catch (error) {
    console.error('Create group chat error:', error);
    res.status(500).json({ message: 'Server error creating group chat.' });
  }
});

// @route   GET /api/chats
// @desc    Get all chats for the authenticated user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { Chat } = getModels();

    // Find chats that have the authenticated user as participant
    const chats = await Chat.find({ participants: req.user._id })
      .populate('participants', 'username avatar email online statusMessage')
      .populate('groupAdmin', 'username avatar email online statusMessage')
      .populate('lastMessage')
      .sort({ updatedAt: -1 });

    res.json(chats);
  } catch (error) {
    console.error('Fetch chats error:', error);
    res.status(500).json({ message: 'Server error retrieving chats.' });
  }
});

module.exports = router;
