// server.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const Message = require('./models/Message'); // ensure Message model exists

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_ORIGIN || 'https://chatapp-frontend-t0wg.onrender.com',
    methods: ['GET', 'POST']
  },
  pingInterval: 10000,
  pingTimeout: 5000
});

app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

const socketUserMap = new Map();

io.on('connection', (socket) => {
  console.log(`🟢 Connected: ${socket.id}`);

  socket.on('join', async (username) => {
    socket.username = username;
    socketUserMap.set(socket.id, username);
    io.emit('user-connected', Array.from(socketUserMap.values()));

    const last50 = await Message.find().sort({ timestamp: -1 }).limit(50).lean();
    socket.emit('chat-history', last50.reverse());
  });

  socket.on('send-message', async ({ username, message, timestamp }) => {
  const socketUsername = socketUserMap.get(socket.id);
  const finalUsername = username || socketUsername; // Use provided username or fallback
  
  if (!finalUsername || !message?.trim()) return;

  const msgObj = {
    id: uuidv4(),
    username: finalUsername,
    message: message.trim(),
    timestamp: timestamp || new Date()
  };

  await Message.create(msgObj);
  io.emit('receive-message', msgObj);
});
  socket.on('typing', (username) => {
    socket.broadcast.emit('typing', username);
  });

  socket.on('stop-typing', (username) => {
    socket.broadcast.emit('stop-typing', username);
  });

  socket.on('disconnect', () => {
    const username = socketUserMap.get(socket.id);
    socketUserMap.delete(socket.id);
    io.emit('user-disconnected', Array.from(socketUserMap.values()));
    console.log(`🔴 Disconnected: ${username}`);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
