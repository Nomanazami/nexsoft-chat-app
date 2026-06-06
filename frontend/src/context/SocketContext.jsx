import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [onlineUserIds, setOnlineUserIds] = useState(new Set());

  useEffect(() => {
    if (!user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      setOnlineUserIds(new Set());
      return;
    }

    // Connect to backend via proxy (resolves to relative URL)
    const newSocket = io({
      autoConnect: true,
      reconnectionAttempts: 5
    });

    newSocket.on('connect', () => {
      console.log('🔌 WebSocket Connected:', newSocket.id);
      newSocket.emit('setup', user);
    });

    newSocket.on('setup_acknowledged', (onlineIds) => {
      setOnlineUserIds(new Set(onlineIds));
    });

    newSocket.on('user_status_changed', ({ userId, online }) => {
      setOnlineUserIds((prev) => {
        const updated = new Set(prev);
        if (online) {
          updated.add(userId);
        } else {
          updated.delete(userId);
        }
        return updated;
      });
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user]);

  const isUserOnline = (userId) => {
    if (!userId) return false;
    return onlineUserIds.has(userId.toString());
  };

  const value = {
    socket,
    onlineUserIds,
    isUserOnline
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
