const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getModels, isMongo } = require('../database');
const authMiddleware = require('../middleware');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_chat_jwt_key_123!';

// @route   POST /api/auth/register
// @desc    Register a new user
router.post('/register', async (req, res) => {
  const { username, email, password, avatar } = req.body;

  try {
    const { User } = getModels();

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Please enter all fields.' });
    }

    // Check if user exists (email or username)
    let userByEmail = await User.findOne({ email });
    if (userByEmail) {
      return res.status(400).json({ message: 'Email is already registered.' });
    }

    let userByUsername = await User.findOne({ username });
    if (userByUsername) {
      return res.status(400).json({ message: 'Username is already taken.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create User
    const newUser = await User.create({
      username,
      email,
      password: hashedPassword,
      avatar: avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${username}`,
      online: false,
      statusMessage: 'Available'
    });

    // Sign JWT
    const token = jwt.sign({ id: newUser._id }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token,
      user: {
        _id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        avatar: newUser.avatar,
        statusMessage: newUser.statusMessage,
        online: newUser.online
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error during registration.' });
  }
});

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const { User } = getModels();

    if (!email || !password) {
      return res.status(400).json({ message: 'Please enter all fields.' });
    }

    // Check for user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    // Sign JWT
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        statusMessage: user.statusMessage,
        online: user.online
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login.' });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user details
router.get('/me', authMiddleware, async (req, res) => {
  res.json(req.user);
});

// @route   GET /api/auth/users
// @desc    Get all users (excluding self) with search filter
router.get('/users', authMiddleware, async (req, res) => {
  const search = req.query.search || '';
  try {
    const { User } = getModels();
    let users;

    if (isMongo()) {
      // MongoDB Query
      const query = {
        _id: { $ne: req.user._id }
      };
      if (search) {
        query.$or = [
          { username: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ];
      }
      users = await User.find(query).select('-password');
    } else {
      // Mock DB Query (filtered in memory)
      const allUsers = await User.find({ _id: { $ne: req.user._id } });
      users = allUsers.filter(u => {
        const matchesSearch = !search || 
          u.username.toLowerCase().includes(search.toLowerCase()) || 
          u.email.toLowerCase().includes(search.toLowerCase());
        return matchesSearch;
      }).map(u => {
        const copy = { ...u };
        delete copy.password;
        return copy;
      });
    }

    res.json(users);
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ message: 'Server error retrieving users.' });
  }
});

// @route   PUT /api/auth/profile
// @desc    Update user profile (avatar, status message)
router.put('/profile', authMiddleware, async (req, res) => {
  const { avatar, statusMessage } = req.body;
  try {
    const { User } = getModels();

    const updateFields = {};
    if (avatar !== undefined) updateFields.avatar = avatar;
    if (statusMessage !== undefined) updateFields.statusMessage = statusMessage;

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updateFields },
      { new: true }
    );

    const userObj = updatedUser.toObject ? updatedUser.toObject() : { ...updatedUser };
    delete userObj.password;

    res.json(userObj);
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Server error updating profile.' });
  }
});

module.exports = router;
