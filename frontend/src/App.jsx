import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ChatProvider } from './context/ChatContext';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import Login from './components/Login';
import Register from './components/Register';

const ChatApp = () => {
  const { user, loading } = useAuth();
  const [authView, setAuthView] = useState('login'); // 'login' or 'register'

  if (loading) {
    return (
      <div 
        style={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100vh',
          gap: '16px',
          color: 'var(--text-main)'
        }}
      >
        <div 
          style={{ 
            width: '40px', 
            height: '40px', 
            border: '3px solid rgba(255,255,255,0.05)',
            borderTopColor: 'var(--primary)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}
        ></div>
        <span style={{ fontSize: '13px', letterSpacing: '1px', opacity: 0.8, fontWeight: '600' }}>CONNECTING SECURELY...</span>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!user) {
    return authView === 'login' 
      ? <Login onToggleAuth={() => setAuthView('register')} /> 
      : <Register onToggleAuth={() => setAuthView('login')} />;
  }

  return (
    <div className="app-container">
      <Sidebar />
      <ChatWindow />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <ChatProvider>
          <ChatApp />
        </ChatProvider>
      </SocketProvider>
    </AuthProvider>
  );
}

