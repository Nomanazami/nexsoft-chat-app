import React, { useState, useEffect } from 'react';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';
import { X, Search, Check, Users } from 'lucide-react';

const CreateGroupModal = ({ onClose }) => {
  const { createGroupChat } = useChat();
  const { token } = useAuth();
  
  const [groupName, setGroupName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Search users to invite
  useEffect(() => {
    const fetchUsers = async () => {
      if (!token) return;
      setLoadingUsers(true);
      try {
        const res = await fetch(`/api/auth/users?search=${searchTerm}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setUsers(data);
        }
      } catch (err) {
        console.error('Error fetching users for group:', err);
      } finally {
        setLoadingUsers(false);
      }
    };

    const delayDebounce = setTimeout(() => {
      fetchUsers();
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchTerm, token]);

  const handleToggleSelect = (userId) => {
    setSelectedParticipants((prev) => {
      if (prev.includes(userId)) {
        return prev.filter((id) => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!groupName.trim() || selectedParticipants.length === 0) return;

    setSubmitting(true);
    try {
      await createGroupChat(groupName, selectedParticipants);
      onClose();
    } catch (err) {
      console.error('Error creating group chat:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Create Group Chat</h3>
          <button className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleCreate}>
          <div className="modal-body" style={{ gap: '16px' }}>
            {/* Group Name Input */}
            <div className="form-group">
              <label htmlFor="groupName">GROUP NAME</label>
              <input
                id="groupName"
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Enter group subject..."
                style={{ paddingLeft: '14px' }}
                required
              />
            </div>

            {/* Participants Search */}
            <div className="form-group">
              <label>ADD PARTICIPANTS ({selectedParticipants.length} selected)</label>
              <div className="search-bar-container" style={{ marginBottom: '10px' }}>
                <Search className="search-icon" size={16} />
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search users to invite..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ fontSize: '13px', padding: '8px 12px 8px 36px' }}
                />
              </div>

              {/* Checkbox list */}
              <div className="participants-select-list">
                {loadingUsers ? (
                  <div style={{ textAlign: 'center', padding: '10px', fontSize: '12px', color: 'var(--text-muted)' }}>
                    Loading users...
                  </div>
                ) : users.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '10px', fontSize: '12px', color: 'var(--text-muted)' }}>
                    No users found
                  </div>
                ) : (
                  users.map((userItem) => (
                    <div 
                      key={userItem._id}
                      className={`participant-checkbox-item ${selectedParticipants.includes(userItem._id) ? 'selected' : ''}`}
                      onClick={() => handleToggleSelect(userItem._id)}
                      style={{
                        background: selectedParticipants.includes(userItem._id) ? 'rgba(138, 75, 255, 0.1)' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 10px',
                        borderRadius: '8px',
                        marginBottom: '4px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img 
                          src={userItem.avatar} 
                          alt={userItem.username} 
                          style={{ width: '28px', height: '28px', borderRadius: '50%' }} 
                        />
                        <div>
                          <span style={{ fontSize: '13px', fontWeight: '600', display: 'block' }}>{userItem.username}</span>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{userItem.statusMessage || 'Available'}</span>
                        </div>
                      </div>
                      
                      <div 
                        style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '4px',
                          border: '1px solid var(--glass-border)',
                          background: selectedParticipants.includes(userItem._id) ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {selectedParticipants.includes(userItem._id) && <Check size={12} color="white" />}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-primary" 
              disabled={submitting || !groupName.trim() || selectedParticipants.length === 0}
            >
              {submitting ? 'Creating...' : (
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Users size={16} /> Create Group
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateGroupModal;
