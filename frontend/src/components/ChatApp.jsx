import React, { useEffect, useState, useRef } from 'react';
import { Send, Smile } from 'lucide-react';
import io from 'socket.io-client';
import '../Styles/ChatApp.css';

const socket = io('http://localhost:3001');

const emojis = ['😀', '😂', '😍', '🤔', '👍', '👎', '❤️', '🔥', '💯', '🎉', '😎', '🤩', '😊', '😢', '😮', '🙄', '😴', '🤗', '🤤', '😇'];

function ChatApp() {
  const [username, setUsername] = useState('');
  const [inputName, setInputName] = useState('');
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [theme, setTheme] = useState('light');
  const chatEndRef = useRef(null);
  const emojiPickerRef = useRef(null);

  useEffect(() => {
    const storedTheme = localStorage.getItem('chat-theme');
    if (storedTheme) setTheme(storedTheme);
  }, []);

  useEffect(() => {
    localStorage.setItem('chat-theme', theme);
  }, [theme]);

  useEffect(() => {
    const handleReceiveMessage = (msg) => setChatHistory((prev) => [...prev, msg]);
    const handleChatHistory = (msgs) => setChatHistory(msgs);
    const handleUserConnected = (userList) => setOnlineUsers(new Set(userList));
    const handleUserDisconnected = (userList) => setOnlineUsers(new Set(userList));
    const handleTyping = (user) => setTypingUsers((prev) => (!prev.includes(user) ? [...prev, user] : prev));
    const handleStopTyping = (user) => setTypingUsers((prev) => prev.filter((u) => u !== user));

    socket.on('receive-message', handleReceiveMessage);
    socket.on('chat-history', handleChatHistory);
    socket.on('user-connected', handleUserConnected);
    socket.on('user-disconnected', handleUserDisconnected);
    socket.on('typing', handleTyping);
    socket.on('stop-typing', handleStopTyping);

    return () => {
      socket.off('receive-message', handleReceiveMessage);
      socket.off('chat-history', handleChatHistory);
      socket.off('user-connected', handleUserConnected);
      socket.off('user-disconnected', handleUserDisconnected);
      socket.off('typing', handleTyping);
      socket.off('stop-typing', handleStopTyping);
    };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  useEffect(() => {
    if (username) {
      socket.emit('join', username);
    }
  }, [username]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitials = (name) => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const getUserColor = (name) => {
    const colors = ['#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#6366f1', '#eab308', '#ef4444', '#14b8a6'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const handleJoin = () => {
    if (!inputName.trim()) return;
    setUsername(inputName.trim());
  };

  const handleSend = () => {
    if (message.trim()) {
      socket.emit('send-message', {
        username,
        message: message.trim(),
        timestamp: new Date().toISOString(),
      });
      setMessage('');
      socket.emit('stop-typing', username);
      setShowEmojiPicker(false);
    }
  };

  const handleTyping = () => {
    if (username) {
      socket.emit('typing', username);
      setTimeout(() => socket.emit('stop-typing', username), 1000);
    }
  };

  const handleEmojiSelect = (emoji) => {
    setMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  if (!username) {
    return (
      <div className="join-screen">
        <div className="join-card">
          <div className="join-header">
            <h2>Join the Chat</h2>
            <p>Enter your name to start chatting</p>
          </div>
          <div className="join-form">
            <input
              value={inputName}
              onChange={(e) => setInputName(e.target.value)}
              placeholder="Your name"
              className="join-input"
              onKeyUp={(e) => e.key === 'Enter' && handleJoin()}
            />
            <button onClick={handleJoin} className="join-button">Join Chat</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`chat-app ${theme}`}>
      <div className="chat-container">
        <div className="chat-header">
          <h2>Welcome, {username}!</h2>
          <div className="header-right">
            <div className="status-text">{onlineUsers.size} user(s) online</div>
            <button className="theme-toggle-button" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
              {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
            </button>
          </div>
        </div>

        <div className="chat-main">
          <div className="chat-messages">
            {chatHistory.map((msg, idx) => {
              const isMyMessage = msg.username === username;
              return (
                <div key={idx} className={`message-container ${isMyMessage ? 'my-message' : 'other-message'}`}>
                  <div className="message-avatar" style={{ backgroundColor: getUserColor(msg.username) }}>
                    {getInitials(msg.username)}
                  </div>
                  <div className="message-content">
                    <div className={`message-bubble ${isMyMessage ? 'bubble-mine' : 'bubble-other'}`}>
                      <div className="message-text">{msg.message}</div>
                    </div>
                    <div className="message-time">
                      {new Date(msg.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>

          {typingUsers.filter((u) => u !== username).length > 0 && (
            <div className="typing-indicator">
              <div className="typing-content">
                <div className="typing-dots">
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                </div>
                <span>
                  {typingUsers.filter((u) => u !== username).join(', ')} {typingUsers.length > 1 ? 'are' : 'is'} typing...
                </span>
              </div>
            </div>
          )}

          <div className="message-input-container">
            <div className="message-input-wrapper">
              <div className="input-field-container">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleTyping}
                  onKeyUp={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Type a message..."
                  className="message-input"
                />
                <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="emoji-button">
                  <Smile size={20} />
                </button>
                {showEmojiPicker && (
                  <div ref={emojiPickerRef} className="emoji-picker">
                    {emojis.map((emoji, idx) => (
                      <button key={idx} onClick={() => handleEmojiSelect(emoji)} className="emoji-option">
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={handleSend} className="send-button">
                <Send size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatApp;
