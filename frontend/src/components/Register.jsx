import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Lock, UserPlus, AlertCircle } from 'lucide-react';

const PRESET_SEEDS = ['Cookie', 'Jasper', 'Coco', 'Loki', 'Bailey'];

const Register = ({ onToggleAuth }) => {
  const { register, error, clearError } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('');
  const [avatarSeed, setAvatarSeed] = useState(PRESET_SEEDS[0]);
  const [submitting, setSubmitting] = useState(false);

  // When username changes, if 'dynamic' is chosen, it updates the seed
  useEffect(() => {
    if (selectedAvatar === 'dynamic') {
      setAvatarSeed(username || 'default');
    }
  }, [username, selectedAvatar]);

  const handleAvatarSelect = (seed, isDynamic = false) => {
    if (isDynamic) {
      setSelectedAvatar('dynamic');
      setAvatarSeed(username || 'default');
    } else {
      setSelectedAvatar(seed);
      setAvatarSeed(seed);
    }
    clearError();
  };

  const getAvatarUrl = (seed) => {
    return `https://api.dicebear.com/7.x/adventurer/svg?seed=${seed}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !email || !password) return;

    setSubmitting(true);
    const finalAvatarUrl = getAvatarUrl(avatarSeed);
    try {
      await register(username, email, password, finalAvatarUrl);
    } catch (err) {
      console.error('Registration failed:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-header">
          <h2>Create Account</h2>
          <p>Join us and start chatting in real-time</p>
        </div>

        {error && (
          <div className="error-banner" style={{ marginBottom: '20px' }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="username">USERNAME</label>
            <div className="input-wrapper">
              <User className="input-icon" size={18} />
              <input
                id="username"
                type="text"
                placeholder="Choose a username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  clearError();
                }}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">EMAIL ADDRESS</label>
            <div className="input-wrapper">
              <Mail className="input-icon" size={18} />
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearError();
                }}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">PASSWORD</label>
            <div className="input-wrapper">
              <Lock className="input-icon" size={18} />
              <input
                id="password"
                type="password"
                placeholder="Choose a strong password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearError();
                }}
                required
              />
            </div>
          </div>

          <div className="form-group avatar-selector">
            <label>CHOOSE YOUR AVATAR</label>
            <div className="avatar-grid">
              {PRESET_SEEDS.map((seed) => (
                <img
                  key={seed}
                  src={getAvatarUrl(seed)}
                  alt={`avatar-${seed}`}
                  className={`avatar-option ${selectedAvatar === seed || (selectedAvatar === '' && seed === PRESET_SEEDS[0]) ? 'selected' : ''}`}
                  onClick={() => handleAvatarSelect(seed)}
                />
              ))}
              <div 
                className={`avatar-option ${selectedAvatar === 'dynamic' ? 'selected' : ''}`}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontSize: '10px', 
                  fontWeight: '700',
                  color: 'white',
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '50%',
                  textAlign: 'center',
                  border: selectedAvatar === 'dynamic' ? '2px solid var(--primary)' : '2px dashed rgba(255,255,255,0.2)',
                  cursor: 'pointer',
                  width: '50px',
                  height: '50px'
                }}
                onClick={() => handleAvatarSelect(username || 'default', true)}
              >
                {username ? (
                  <img src={getAvatarUrl(username)} alt="dynamic-avatar" style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
                ) : (
                  'Auto'
                )}
              </div>
            </div>
          </div>

          <button type="submit" className="auth-btn" disabled={submitting}>
            {submitting ? 'Creating account...' : (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <UserPlus size={18} /> Register
              </span>
            )}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account? 
          <a href="#" onClick={(e) => {
            e.preventDefault();
            clearError();
            onToggleAuth();
          }}>Login</a>
        </div>
      </div>
    </div>
  );
};

export default Register;
