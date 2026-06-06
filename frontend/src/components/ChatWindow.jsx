import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Send, Smile, ChevronLeft, MessageCircle, Info } from 'lucide-react';

const EMOJIS = ['😀', '😂', '😍', '👍', '🔥', '🎉', '👏', '❤️', '🙌', '✨', '💡', '😎'];

const ChatWindow = () => {
  const { 
    activeChat, 
    messages, 
    messagesLoading, 
    sendMessage, 
    sendTypingStatus, 
    typingUsers, 
    selectChat 
  } = useChat();
  
  const { user } = useAuth();
  const { isUserOnline } = useSocket();

  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const inputRef = useRef(null);
  const pickerRef = useRef(null);

  // Auto-scroll to bottom of messages list
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, typingUsers]);

  // Click outside listener for emoji picker
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    setInputText(e.target.value);

    // Typing logic
    if (!isTyping) {
      setIsTyping(true);
      sendTypingStatus(true);
    }

    // Debounce stop_typing
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      sendTypingStatus(false);
    }, 2000);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    // Send message
    await sendMessage(inputText);
    setInputText('');

    // Stop typing immediately
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    setIsTyping(false);
    sendTypingStatus(false);
    inputRef.current?.focus();
  };

  const handleEmojiClick = (emoji) => {
    setInputText(prev => prev + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  // Helper selectors
  const getChatName = () => {
    if (!activeChat || !user) return '';
    if (activeChat.isGroup) return activeChat.name;
    const other = activeChat.participants.find(p => p._id.toString() !== user._id.toString());
    return other ? other.username : 'Direct Message';
  };

  const getChatAvatar = () => {
    if (!activeChat || !user) return '';
    if (activeChat.isGroup) return `https://api.dicebear.com/7.x/identicon/svg?seed=${activeChat.name}`;
    const other = activeChat.participants.find(p => p._id.toString() !== user._id.toString());
    return other ? other.avatar : '';
  };

  const getChatSubtitle = () => {
    if (!activeChat || !user) return '';
    if (activeChat.isGroup) {
      const names = activeChat.participants.map(p => p.username).join(', ');
      return `${activeChat.participants.length} participants: ${names}`;
    }
    const other = activeChat.participants.find(p => p._id.toString() !== user._id.toString());
    return other && isUserOnline(other._id) ? 'Online' : 'Offline';
  };

  const isOtherUserOnline = () => {
    if (!activeChat || activeChat.isGroup || !user) return false;
    const other = activeChat.participants.find(p => p._id.toString() !== user._id.toString());
    return other ? isUserOnline(other._id) : false;
  };

  const isChatTyping = () => {
    if (!activeChat) return false;
    const chatTyping = typingUsers[activeChat._id] || {};
    // Check if anyone besides us is typing
    const typingIds = Object.keys(chatTyping);
    return typingIds.length > 0;
  };

  const getTypingUsernames = () => {
    if (!activeChat) return [];
    const chatTyping = typingUsers[activeChat._id] || {};
    return Object.values(chatTyping);
  };

  const formatMessageTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Render Welcome Screen
  if (!activeChat) {
    return (
      <div className="chat-window">
        <div className="welcome-screen">
          <div className="welcome-logo">
            <MessageCircle size={44} />
          </div>
          <h3>Select a chat room</h3>
          <p style={{ maxWidth: '380px' }}>
            Choose an existing conversation from the sidebar or search for other registered users to start private DMs and group chats.
          </p>
        </div>
      </div>
    );
  }

  const typingNames = getTypingUsernames();

  return (
    <div className="chat-window">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-header-info">
          {/* Back button on mobile */}
          <button 
            className="icon-btn" 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              marginRight: '8px'
            }}
            onClick={() => selectChat(null)}
            title="Back to Chats"
          >
            <ChevronLeft size={20} />
          </button>
          
          <div className="avatar-wrapper">
            <img src={getChatAvatar()} alt={getChatName()} />
            {isOtherUserOnline() && <span className="status-dot online"></span>}
          </div>
          
          <div className="chat-header-text">
            <h3>{getChatName()}</h3>
            <p className={isOtherUserOnline() ? 'online' : ''}>
              {getChatSubtitle()}
            </p>
          </div>
        </div>

        <button 
          className="icon-btn" 
          title="Chat info"
          onClick={() => {
            if (activeChat.isGroup) {
              alert(`Group Chat: ${activeChat.name}\n\nMembers:\n${activeChat.participants.map(p => `- ${p.username} (${p.statusMessage || 'Available'})`).join('\n')}`);
            } else {
              const other = activeChat.participants.find(p => p._id.toString() !== user._id.toString());
              alert(`User profile: ${other?.username}\nEmail: ${other?.email}\nStatus: ${other?.statusMessage || 'Available'}`);
            }
          }}
        >
          <Info size={18} />
        </button>
      </div>

      {/* Messages feed */}
      <div className="messages-container">
        {messagesLoading ? (
          <div style={{ margin: 'auto', color: 'var(--text-muted)' }}>
            Loading message history...
          </div>
        ) : messages.length === 0 ? (
          <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-light)', maxWidth: '300px' }}>
            <p>No messages yet in this conversation.</p>
            <p style={{ fontSize: '12px', marginTop: '4px' }}>Send a message below to break the ice!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isSent = msg.sender?._id === user?._id;
            const senderName = msg.sender?.username || 'User';

            return (
              <div 
                key={msg._id} 
                className={`message-bubble-wrapper ${isSent ? 'sent' : 'received'}`}
              >
                {/* Show sender name in group chat if it's not sent by user */}
                {!isSent && activeChat.isGroup && (
                  <span className="message-sender-name">{senderName}</span>
                )}
                
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', width: '100%', justifyContent: isSent ? 'flex-end' : 'flex-start' }}>
                  {!isSent && (
                    <img 
                      src={msg.sender?.avatar} 
                      alt={senderName} 
                      style={{ width: '28px', height: '28px', borderRadius: '50%', marginBottom: '4px', flexShrink: 0 }} 
                    />
                  )}
                  <div className="message-bubble">
                    <p style={{ margin: 0 }}>{msg.content}</p>
                    <div className="message-time">
                      {formatMessageTime(msg.createdAt)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Typing Bubble */}
        {isChatTyping() && typingNames.map((name) => (
          <div key={name} className="message-bubble-wrapper received" style={{ marginTop: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="typing-bubble">
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginRight: '6px' }}>{name} is typing</span>
                <div className="typing-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div className="chat-input-bar">
        <form className="chat-input-form" onSubmit={handleFormSubmit}>
          <div className="chat-input-wrapper">
            <input
              ref={inputRef}
              type="text"
              className="chat-input"
              placeholder="Type a message..."
              value={inputText}
              onChange={handleInputChange}
              onFocus={() => sendTypingStatus(inputText.trim().length > 0)}
              onBlur={() => sendTypingStatus(false)}
            />
            
            {/* Emoji Trigger */}
            <div ref={pickerRef}>
              <button 
                type="button" 
                className="input-action-btn"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                title="Insert Emoji"
              >
                <Smile size={20} />
              </button>

              {/* Emoji Popover */}
              {showEmojiPicker && (
                <div className="emoji-popover">
                  {EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className="emoji-btn"
                      onClick={() => handleEmojiClick(emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button 
            type="submit" 
            className="send-btn" 
            disabled={!inputText.trim()}
            title="Send Message"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatWindow;
