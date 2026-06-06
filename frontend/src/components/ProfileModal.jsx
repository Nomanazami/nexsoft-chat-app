import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Save, Edit2 } from 'lucide-react';

const PRESET_SEEDS = ['Cookie', 'Jasper', 'Coco', 'Loki', 'Bailey', 'Shadow', 'Sasha', 'Gizmo'];

const ProfileModal = ({ onClose }) => {
  const { user, updateProfile } = useAuth();
  const [statusMessage, setStatusMessage] = useState(user?.statusMessage || 'Available');
  const [avatarSeed, setAvatarSeed] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const getAvatarUrl = (seed) => {
    return `https://api.dicebear.com/7.x/adventurer/svg?seed=${seed}`;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const finalAvatarUrl = avatarSeed 
      ? getAvatarUrl(avatarSeed) 
      : user.avatar; // Keep current if not selected

    try {
      await updateProfile(finalAvatarUrl, statusMessage);
      onClose();
    } catch (err) {
      console.error('Error updating profile:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Edit Profile</h3>
          <button className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave}>
          <div className="modal-body profile-modal-details">
            {/* Avatar Preview */}
            <div style={{ position: 'relative' }}>
              <img 
                src={avatarSeed ? getAvatarUrl(avatarSeed) : user.avatar} 
                alt="profile-avatar" 
                className="profile-modal-avatar"
              />
              <span 
                style={{ 
                  position: 'absolute', 
                  bottom: '0', 
                  right: '0',
                  background: 'var(--primary)',
                  padding: '6px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.4)'
                }}
              >
                <Edit2 size={12} color="white" />
              </span>
            </div>

            {/* Avatar Grid Selection */}
            <div className="form-group" style={{ width: '100%' }}>
              <label>SELECT A NEW AVATAR</label>
              <div 
                className="avatar-grid" 
                style={{ 
                  gridTemplateColumns: 'repeat(4, 1fr)', 
                  maxHeight: '120px', 
                  overflowY: 'auto',
                  border: '1px solid var(--glass-border)',
                  padding: '10px',
                  borderRadius: '10px',
                  background: 'rgba(0,0,0,0.1)'
                }}
              >
                {PRESET_SEEDS.map((seed) => (
                  <img
                    key={seed}
                    src={getAvatarUrl(seed)}
                    alt={`avatar-${seed}`}
                    className={`avatar-option ${avatarSeed === seed ? 'selected' : ''}`}
                    onClick={() => setAvatarSeed(seed)}
                    style={{ width: '42px', height: '42px' }}
                  />
                ))}
                {/* Seed customize option */}
                <div 
                  className={`avatar-option ${avatarSeed && !PRESET_SEEDS.includes(avatarSeed) ? 'selected' : ''}`}
                  onClick={() => {
                    const customSeed = prompt('Enter a seed keyword to generate a custom avatar:');
                    if (customSeed) setAvatarSeed(customSeed.trim());
                  }}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontSize: '10px', 
                    color: 'white',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '50%',
                    border: '2px dashed rgba(255,255,255,0.2)',
                    width: '42px',
                    height: '42px',
                    cursor: 'pointer'
                  }}
                >
                  Custom
                </div>
              </div>
            </div>

            {/* Status Input */}
            <div className="form-group" style={{ width: '100%' }}>
              <label htmlFor="statusMessage">STATUS MESSAGE</label>
              <input
                id="statusMessage"
                type="text"
                value={statusMessage}
                onChange={(e) => setStatusMessage(e.target.value)}
                placeholder="What is on your mind?"
                style={{ paddingLeft: '14px' }}
                maxLength={40}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : (
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Save size={16} /> Save Changes
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileModal;
