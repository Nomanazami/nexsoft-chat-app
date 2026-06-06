import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { useSocket } from '../context/SocketContext';
import { Search, LogOut, Users, MessageSquare, Plus } from 'lucide-react';
import ProfileModal from './ProfileModal';
import CreateGroupModal from './CreateGroupModal';

const Sidebar = () => {
  const { user, logout, token } = useAuth();
  const { 
    chats, 
    activeChat, 
    selectChat, 
    createOrAccessChat, 
    chatsLoading, 
    unreadCounts, 
    typingUsers 
  } = useChat();
  const { isUserOnline } = useSocket();

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showResultsOverlay, setShowResultsOverlay] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);

  const overlayRef = useRef(null);

  // Search users API
  useEffect(() => {
    const searchUsers = async () => {
      if (!searchTerm.trim() || !token) {
        setSearchResults([]);
        setShowResultsOverlay(false);
        return;
      }
      setSearching(true);
      try {
        const res = await fetch(`/api/auth/users?search=${searchTerm}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
          setShowResultsOverlay(true);
        }
      } catch (err) {
        console.error('Error searching users:', err);
      } finally {
        setSearching(false);
      }
    };

    const delayDebounce = setTimeout(() => {
      searchUsers();
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [searchTerm, token]);

  // Click outside listener for search overlay
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (overlayRef.current && !overlayRef.current.contains(event.target)) {
        setShowResultsOverlay(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchResultClick = async (clickedUserId) => {
    setSearchTerm('');
    setShowResultsOverlay(false);
    await createOrAccessChat(clickedUserId);
  };

  const getChatName = (chat) => {
    if (!chat || !user) return 'Chat';
    if (chat.isGroup) return chat.name;
    const other = chat.participants.find(p => p._id.toString() !== user._id.toString());
    return other ? other.username : 'Direct Message';
  };

  const getChatAvatar = (chat) => {
    if (!chat || !user) return '';
    if (chat.isGroup) return `https://api.dicebear.com/7.x/identicon/svg?seed=${chat.name}`;
    const other = chat.participants.find(p => p._id.toString() !== user._id.toString());
    return other ? other.avatar : '';
  };

  const isChatOnline = (chat) => {
    if (!chat || chat.isGroup || !user) return false;
    const other = chat.participants.find(p => p._id.toString() !== user._id.toString());
    return other ? isUserOnline(other._id) : false;
  };

  const getChatStatusText = (chat) => {
    if (!chat || chat.isGroup || !user) return '';
    const other = chat.participants.find(p => p._id.toString() !== user._id.toString());
    return other ? other.statusMessage : '';
  };

  const formatTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const isChatTyping = (chatId) => {
    const chatTyping = typingUsers[chatId];
    if (!chatTyping) return false;
    return Object.keys(chatTyping).length > 0;
  };

  const getTypingText = (chatId) => {
    const chatTyping = typingUsers[chatId] || {};
    const usernames = Object.values(chatTyping);
    if (usernames.length === 1) return `${usernames[0]} is typing...`;
    if (usernames.length > 1) return 'People are typing...';
    return '';
  };

  return (
    <div className={`sidebar ${activeChat ? 'hidden' : ''}`}>
      {/* User profile and header actions */}
      <div className="sidebar-header">
        <div className="user-profile-bar">
          <div className="user-info" onClick={() => setShowProfileModal(true)}>
            <div className="avatar-wrapper">
              <img src={user?.avatar} alt={user?.username} />
              <span className={`status-dot online`}></span>
            </div>
            <div className="user-details">
              <h4>{user?.username}</h4>
              <p>{user?.statusMessage || 'Available'}</p>
            </div>
          </div>

          <div className="sidebar-actions">
            <button 
              className="icon-btn" 
              title="New Group Chat"
              onClick={() => setShowGroupModal(true)}
            >
              <Users size={18} />
            </button>
            <button 
              className="icon-btn" 
              title="Logout" 
              onClick={logout}
              style={{ color: 'var(--danger)' }}
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>

        {/* User Search Bar */}
        <div className="search-bar-container" ref={overlayRef}>
          <Search className="search-icon" size={18} />
          <input
            type="text"
            className="search-input"
            placeholder="Search users to chat..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          {/* Search Dropdown Overlay */}
          {showResultsOverlay && (
            <div className="search-results-overlay">
              {searching ? (
                <div style={{ textAlign: 'center', padding: '15px', fontSize: '13px', color: 'var(--text-muted)' }}>
                  Searching users...
                </div>
              ) : searchResults.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '15px', fontSize: '13px', color: 'var(--text-muted)' }}>
                  No users found
                </div>
              ) : (
                searchResults.map((userItem) => (
                  <div 
                    key={userItem._id} 
                    className="search-result-item"
                    onClick={() => handleSearchResultClick(userItem._id)}
                  >
                    <div className="search-result-user">
                      <img 
                        src={userItem.avatar} 
                        alt={userItem.username} 
                        className="search-result-avatar" 
                      />
                      <div className="search-result-name">
                        <h5>{userItem.username}</h5>
                        <p>{userItem.statusMessage || 'Available'}</p>
                      </div>
                    </div>
                    {isUserOnline(userItem._id) && (
                      <span 
                        style={{ 
                          width: '8px', 
                          height: '8px', 
                          borderRadius: '50%', 
                          background: 'var(--accent)' 
                        }}
                      ></span>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Chat Room List */}
      <div className="chat-list">
        {chatsLoading && chats.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
            Loading conversations...
          </div>
        ) : chats.length === 0 ? (
          <div className="chat-item-placeholder">
            <MessageSquare size={36} style={{ marginBottom: '12px', opacity: 0.3 }} />
            <p>No active chats yet.</p>
            <p style={{ fontSize: '12px', marginTop: '4px' }}>Search a user above to start messaging!</p>
          </div>
        ) : (
          chats.map((chat) => {
            const isSelected = activeChat?._id === chat._id;
            const isOnline = isChatOnline(chat);
            const chatName = getChatName(chat);
            const chatAvatar = getChatAvatar(chat);
            const unreadCount = unreadCounts[chat._id] || 0;
            const typing = isChatTyping(chat._id);

            return (
              <div
                key={chat._id}
                className={`chat-item ${isSelected ? 'active' : ''}`}
                onClick={() => selectChat(chat)}
              >
                <div className="avatar-wrapper">
                  <img src={chatAvatar} alt={chatName} />
                  {isOnline && <span className="status-dot online"></span>}
                </div>

                <div className="chat-item-details">
                  <div className="chat-item-meta">
                    <span className="chat-item-name">{chatName}</span>
                    <span className="chat-item-time">
                      {formatTime(chat.lastMessage?.createdAt || chat.updatedAt)}
                    </span>
                  </div>

                  <div className="chat-item-last">
                    {typing ? (
                      <span className="chat-item-typing">{getTypingText(chat._id)}</span>
                    ) : (
                      <span className="chat-item-message">
                        {chat.lastMessage ? (
                          <>
                            {chat.lastMessage.sender?._id === user?._id ? 'You: ' : ''}
                            {chat.lastMessage.content}
                          </>
                        ) : (
                          <span style={{ fontStyle: 'italic', opacity: 0.7 }}>
                            {chat.isGroup ? 'Group created' : getChatStatusText(chat) || 'No messages yet'}
                          </span>
                        )}
                      </span>
                    )}

                    {unreadCount > 0 && (
                      <span className="chat-item-unread">{unreadCount}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modals */}
      {showProfileModal && (
        <ProfileModal onClose={() => setShowProfileModal(false)} />
      )}
      {showGroupModal && (
        <CreateGroupModal onClose={() => setShowGroupModal(false)} />
      )}
    </div>
  );
};

export default Sidebar;
