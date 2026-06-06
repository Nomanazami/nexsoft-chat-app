import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';

const ChatContext = createContext();

export const useChat = () => useContext(ChatContext);

export const ChatProvider = ({ children }) => {
  const { token, user } = useAuth();
  const { socket } = useSocket();

  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatsLoading, setChatsLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [typingUsers, setTypingUsers] = useState({}); // { [chatId]: { [userId]: username } }
  const [unreadCounts, setUnreadCounts] = useState({}); // { [chatId]: count }

  // Use refs to access latest state inside socket event listeners
  const activeChatRef = useRef(activeChat);
  const chatsRef = useRef(chats);

  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  useEffect(() => {
    chatsRef.current = chats;
  }, [chats]);

  // Fetch all chats
  const fetchChats = useCallback(async () => {
    if (!token) return;
    setChatsLoading(true);
    try {
      const res = await fetch('/api/chats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setChats(data);
      }
    } catch (err) {
      console.error('Error fetching chats:', err);
    } finally {
      setChatsLoading(false);
    }
  }, [token]);

  // Fetch messages for a specific chat
  const fetchMessages = useCallback(async (chatId) => {
    if (!token || !chatId) return;
    setMessagesLoading(true);
    try {
      const res = await fetch(`/api/messages/${chatId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setMessagesLoading(false);
    }
  }, [token]);

  // Fetch chats on mount / login
  useEffect(() => {
    if (token) {
      fetchChats();
    } else {
      setChats([]);
      setActiveChat(null);
      setMessages([]);
      setUnreadCounts({});
      setTypingUsers({});
    }
  }, [token, fetchChats]);

  // Select/activate a chat room
  const selectChat = useCallback((chat) => {
    const prevChat = activeChatRef.current;
    
    if (prevChat && socket) {
      socket.emit('leave_chat', prevChat._id);
    }

    if (!chat) {
      setActiveChat(null);
      setMessages([]);
      return;
    }

    setActiveChat(chat);
    
    // Clear unread count locally
    setUnreadCounts(prev => ({
      ...prev,
      [chat._id]: 0
    }));

    if (socket) {
      socket.emit('join_chat', chat._id);
    }

    fetchMessages(chat._id);
  }, [socket, fetchMessages]);

  // Send message
  const sendMessage = async (content) => {
    const chat = activeChatRef.current;
    if (!token || !chat || !content.trim()) return;

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ chatId: chat._id, content })
      });

      if (res.ok) {
        const messageData = await res.json();
        
        // Append locally
        setMessages(prev => [...prev, messageData]);

        // Emit through socket
        if (socket) {
          socket.emit('new_message', messageData);
        }

        // Update chats list locally (set as lastMessage, pull to top)
        updateLocalChatLastMessage(chat._id, messageData);
      }
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  // Create or access DM chat
  const createOrAccessChat = async (userId) => {
    if (!token) return;
    try {
      const res = await fetch('/api/chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId })
      });

      if (res.ok) {
        const chatData = await res.json();
        
        // Add to chat list if not already there
        setChats(prev => {
          const exists = prev.some(c => c._id === chatData._id);
          if (!exists) {
            return [chatData, ...prev];
          }
          return prev;
        });

        // Set active
        selectChat(chatData);
        return chatData;
      }
    } catch (err) {
      console.error('Error creating DM chat:', err);
    }
  };

  // Create group chat
  const createGroupChat = async (name, participantIds) => {
    if (!token) return;
    try {
      const res = await fetch('/api/chats/group', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name, participants: participantIds })
      });

      if (res.ok) {
        const groupChatData = await res.json();
        
        // Prepend to chats list
        setChats(prev => [groupChatData, ...prev]);

        // Set active
        selectChat(groupChatData);
        return groupChatData;
      }
    } catch (err) {
      console.error('Error creating group chat:', err);
    }
  };

  // Emit typing status
  const sendTypingStatus = (isTyping) => {
    const chat = activeChatRef.current;
    if (!socket || !chat || !user) return;

    if (isTyping) {
      socket.emit('typing', {
        chatId: chat._id,
        userId: user._id,
        username: user.username
      });
    } else {
      socket.emit('stop_typing', {
        chatId: chat._id,
        userId: user._id
      });
    }
  };

  // Helper: Update chat item lastMessage, moves it to top of list
  const updateLocalChatLastMessage = useCallback((chatId, lastMsg) => {
    setChats(prevChats => {
      const chatIndex = prevChats.findIndex(c => c._id === chatId);
      if (chatIndex === -1) {
        // If not in local chats list, reload list from backend
        fetchChats();
        return prevChats;
      }

      const updatedChats = [...prevChats];
      const targetChat = {
        ...updatedChats[chatIndex],
        lastMessage: lastMsg,
        updatedAt: new Date().toISOString()
      };

      // Remove from current position and prepend to top
      updatedChats.splice(chatIndex, 1);
      return [targetChat, ...updatedChats];
    });
  }, [fetchChats]);

  // Set up socket event listeners
  useEffect(() => {
    if (!socket) return;

    // Handler for new messages received
    const handleMessageReceived = (message) => {
      const active = activeChatRef.current;
      const msgChatId = message.chat._id ? message.chat._id.toString() : message.chat.toString();

      if (active && active._id === msgChatId) {
        // If active chat is current chat, append message to feed
        setMessages(prev => {
          // Prevent duplicate messages if any
          if (prev.some(m => m._id === message._id)) return prev;
          return [...prev, message];
        });
      } else {
        // If active chat is not this chat, increment unread badge
        setUnreadCounts(prev => ({
          ...prev,
          [msgChatId]: (prev[msgChatId] || 0) + 1
        }));
      }

      // Update the last message in chat sidebar item and pull to top
      updateLocalChatLastMessage(msgChatId, message);
    };

    // Handler for messages received notifications (for sidebar updates)
    const handleMessageNotification = (message) => {
      const active = activeChatRef.current;
      const msgChatId = message.chat._id ? message.chat._id.toString() : message.chat.toString();

      if (!active || active._id !== msgChatId) {
        setUnreadCounts(prev => ({
          ...prev,
          [msgChatId]: (prev[msgChatId] || 0) + 1
        }));
      }
      
      updateLocalChatLastMessage(msgChatId, message);
    };

    // Handler for typing
    const handleTyping = ({ chatId, userId, username }) => {
      if (user && userId === user._id) return; // Ignore self typing

      setTypingUsers(prev => {
        const chatTyping = prev[chatId] || {};
        return {
          ...prev,
          [chatId]: {
            ...chatTyping,
            [userId]: username
          }
        };
      });
    };

    // Handler for stop typing
    const handleStopTyping = ({ chatId, userId }) => {
      setTypingUsers(prev => {
        const chatTyping = { ...(prev[chatId] || {}) };
        delete chatTyping[userId];
        return {
          ...prev,
          [chatId]: chatTyping
        };
      });
    };

    socket.on('message_received', handleMessageReceived);
    socket.on('message_received_notification', handleMessageNotification);
    socket.on('typing', handleTyping);
    socket.on('stop_typing', handleStopTyping);

    return () => {
      socket.off('message_received', handleMessageReceived);
      socket.off('message_received_notification', handleMessageNotification);
      socket.off('typing', handleTyping);
      socket.off('stop_typing', handleStopTyping);
    };
  }, [socket, user, updateLocalChatLastMessage]);

  const value = {
    chats,
    activeChat,
    messages,
    chatsLoading,
    messagesLoading,
    typingUsers,
    unreadCounts,
    fetchChats,
    selectChat,
    sendMessage,
    createOrAccessChat,
    createGroupChat,
    sendTypingStatus
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};
