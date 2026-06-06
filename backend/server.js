require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { connectDB, getModels } = require('./database');

const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chats');
const messageRoutes = require('./routes/messages');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(cors({
  origin: '*', // Allow all origins for development
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes mapping
app.use('/api/auth', authRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/messages', messageRoutes);

// Root test endpoint
app.get('/', (req, res) => {
  res.send('Chat application backend server running...');
});

// Create HTTP server
const server = http.createServer(app);

// Configure Socket.io
const io = new Server(server, {
  pingTimeout: 60000,
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Real-Time Online Status Tracking
// Maps userId string -> Set of socketId strings (handling multiple tab connections)
const onlineUsers = new Map();
// Maps socketId -> userId string
const socketToUser = new Map();

io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  // Setup connection mapping
  socket.on('setup', async (userData) => {
    if (!userData || !userData._id) return;
    const userId = userData._id.toString();

    socket.join(userId); // Join personal user room for private targeted events
    socketToUser.set(socket.id, userId);

    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    const userSockets = onlineUsers.get(userId);
    const isFirstConnection = userSockets.size === 0;
    userSockets.add(socket.id);

    console.log(`👤 User Setup: ${userData.username} (${userId}) | Active sockets: ${userSockets.size}`);

    // If first connection (was offline), mark online in DB and broadcast
    if (isFirstConnection) {
      try {
        const { User } = getModels();
        await User.findByIdAndUpdate(userId, { online: true });
        // Broadcast online status to all users
        io.emit('user_status_changed', { userId, online: true });
        console.log(`🟢 User ${userData.username} is now ONLINE`);
      } catch (err) {
        console.error('Error setting user online:', err);
      }
    }

    // Acknowledge setup with list of currently online user IDs
    socket.emit('setup_acknowledged', Array.from(onlineUsers.keys()));
  });

  // Join Chat Room
  socket.on('join_chat', (chatId) => {
    socket.join(chatId);
    console.log(`🚪 Socket ${socket.id} joined room: ${chatId}`);
  });

  // Leave Chat Room
  socket.on('leave_chat', (chatId) => {
    socket.leave(chatId);
    console.log(`🚪 Socket ${socket.id} left room: ${chatId}`);
  });

  // Typing Indicators
  socket.on('typing', (data) => {
    // data: { chatId, userId, username }
    if (!data.chatId) return;
    socket.in(data.chatId).emit('typing', data);
  });

  socket.on('stop_typing', (data) => {
    // data: { chatId, userId }
    if (!data.chatId) return;
    socket.in(data.chatId).emit('stop_typing', data);
  });

  // New Message Relay
  socket.on('new_message', (message) => {
    // message: populated Message document containing .chat (object/ID)
    if (!message || !message.chat) return;
    
    const chatId = message.chat._id ? message.chat._id.toString() : message.chat.toString();
    const participants = message.chat.participants || [];
    
    // Broadcast to the chat room
    socket.in(chatId).emit('message_received', message);

    // Also send to each participant's personal room for sidebar updates/notifications
    participants.forEach((p) => {
      const pId = p._id ? p._id.toString() : p.toString();
      if (pId !== message.sender._id.toString()) {
        socket.in(pId).emit('message_received_notification', message);
      }
    });
  });

  // Disconnect
  socket.on('disconnect', async () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
    const userId = socketToUser.get(socket.id);
    
    if (userId) {
      socketToUser.delete(socket.id);
      const userSockets = onlineUsers.get(userId);
      
      if (userSockets) {
        userSockets.delete(socket.id);
        
        // If no more active socket connections, mark user offline
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          console.log(`🔴 User ${userId} has no active connections. Setting OFFLINE.`);
          
          try {
            const { User } = getModels();
            await User.findByIdAndUpdate(userId, { online: false });
            // Broadcast offline status to all users
            io.emit('user_status_changed', { userId, online: false });
          } catch (err) {
            console.error('Error setting user offline:', err);
          }
        }
      }
    }
  });
});

// Start Server and connect to Database
const startServer = async () => {
  await connectDB();
  server.listen(PORT, () => {
    console.log(`🚀 Server running on port http://localhost:${PORT}`);
  });
};

startServer();
