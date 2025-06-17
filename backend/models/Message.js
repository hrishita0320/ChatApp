// models/Message.js
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  username: String,
  message: String,
  timestamp: Date,
  id: String
});

const Message = mongoose.model('Message', messageSchema);
module.exports = Message;
