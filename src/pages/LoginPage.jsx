import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/auth-context';
import { Shield, Mail, Lock, User, Briefcase, Heart, Eye, EyeOff, ArrowRight, AlertTriangle } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, signup, isAuthenticated } = useAuth();

  const [mode, setMode] = useState('signup'); // default to signup or login
  const [role, setRole] = useState('caregiver'); // 'patient' or 'caregiver' (caregiver selected in screenshot)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // If already logged in, redirect safely via useEffect
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  if (isAuthenticated) {
    return null;
  }

  const friendlyError = (err) => {
    if (!err) return 'Something went wrong. Please try again.';
    const code = typeof err === 'object' ? err.code : err;
    const map = {
      'auth/email-already-in-use': 'An account with this email already exists. Try logging in.',
      'auth/invalid-email': 'Please enter a valid email address.',
      'auth/weak-password': 'Password must be at least 6 characters.',
      'auth/user-not-found': 'No account found with this email. Please click "Sign Up" below.',
      'auth/wrong-password': 'Incorrect password. Please try again.',
      'auth/invalid-credential': 'Invalid email or password. Please try again.',
      'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
    };
    if (code && map[code]) return map[code];
    if (typeof err === 'object' && err.message && !err.message.includes('Firebase')) {
      return err.message;
    }
    return 'Something went wrong. Please try again.';
  };

  const handleQuickDemo = async (demoRole) => {
    setError('');
    setSubmitting(true);
    try {
      const demoEmail = demoRole === 'caregiver' ? 'caregiver@carematch.com' : 'parent@carematch.com';
      await login(demoEmail, '123456');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (mode === 'signup') {
        if (!displayName.trim()) { setError('Please enter your full name.'); setSubmitting(false); return; }
        if (password.length < 6) { setError('Password must be at least 6 characters.'); setSubmitting(false); return; }
        await signup(email, password, role, displayName.trim());
      } else {
        await login(email, password);
      }
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        {/* Left — branding panel */}
        <div className="login-brand-panel">
          <div className="login-brand-content">
            <div className="login-logo">
              <Shield className="shield-icon" size={32} />
              <span className="logo-text">
                <span className="text-white">AI </span>
                <span className="text-amber">CareMatch</span>
              </span>
            </div>
            <h2>Trust-Based Caregiver Intelligence</h2>
            <p>Securely access your personalized dashboard. Your data, your privacy — always protected.</p>
            <div className="login-features">
              <div className="login-feature">
                <Lock size={16} className="feature-icon" />
                <span>End-to-end encrypted profiles</span>
              </div>
              <div className="login-feature">
                <Shield size={16} className="feature-icon" />
                <span>Role-based access control</span>
              </div>
              <div className="login-feature">
                <Heart size={16} className="feature-icon" />
                <span>Verified caregiver community</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right — form panel */}
        <div className="login-form-panel">
          <div className="login-form-inner">
            <h1 className="auth-title">{mode === 'login' ? 'Welcome Back' : 'Create Account'}</h1>
            <p className="login-subtitle">
              {mode === 'login'
                ? 'Sign in to access your personalized dashboard'
                : 'Join AI CareMatch — choose your role below'}
            </p>

            {/* Role selector (signup only) */}
            {mode === 'signup' && (
              <div className="role-selector">
                <button
                  type="button"
                  className={`role-card ${role === 'patient' ? 'active' : ''}`}
                  onClick={() => setRole('patient')}
                >
                  <div className="role-icon patient-icon">
                    <User size={20} />
                  </div>
                  <strong className="role-title">I'm a Patient</strong>
                  <span className="role-desc">Find & book trusted caregivers</span>
                </button>
                <button
                  type="button"
                  className={`role-card ${role === 'caregiver' ? 'active' : ''}`}
                  onClick={() => setRole('caregiver')}
                >
                  <div className="role-icon caregiver-icon">
                    <Briefcase size={20} />
                  </div>
                  <strong className="role-title">I'm a Caregiver</strong>
                  <span className="role-desc">Get verified & receive jobs</span>
                </button>
              </div>
            )}

            {/* Error banner */}
            {error && (
              <div className="login-error">
                <AlertTriangle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="login-form">
              {mode === 'signup' && (
                <div className="input-group">
                  <label htmlFor="displayName">Full Name</label>
                  <div className="input-wrap">
                    <User size={18} className="input-icon" />
                    <input
                      id="displayName"
                      type="text"
                      placeholder="Enter your full name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      required
                      autoComplete="name"
                    />
                  </div>
                </div>
              )}

              <div className="input-group">
                <label htmlFor="email">Email Address</label>
                <div className="input-wrap">
                  <Mail size={18} className="input-icon" />
                  <input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="password">Password</label>
                <div className="input-wrap">
                  <Lock size={18} className="input-icon" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={mode === 'signup' ? '••••••••••' : 'Enter your password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button type="submit" className="login-submit-btn" disabled={submitting}>
                {submitting ? (
                  <span className="login-spinner" />
                ) : (
                  <>
                    <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            {/* Mode toggle */}
            <div className="login-mode-toggle">
              {mode === 'login' ? (
                <p>Don't have an account? <button type="button" onClick={() => { setMode('signup'); setError(''); }}>Sign Up</button></p>
              ) : (
                <p>Already have an account? <button type="button" onClick={() => { setMode('login'); setError(''); }}>Sign In</button></p>
              )}
            </div>

            {/* Quick Demo Section */}
            <div className="quick-demo-section">
              <div className="quick-demo-divider">
                <span>⚡ 1-CLICK DEMO LOGIN</span>
              </div>
              <div className="quick-demo-buttons">
                <button
                  type="button"
                  className="quick-demo-btn patient"
                  onClick={() => handleQuickDemo('patient')}
                  disabled={submitting}
                >
                  <User size={14} />
                  <span>Demo Patient</span>
                </button>
                <button
                  type="button"
                  className="quick-demo-btn caregiver"
                  onClick={() => handleQuickDemo('caregiver')}
                  disabled={submitting}
                >
                  <Briefcase size={14} />
                  <span>Demo Caregiver</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .login-page {
          min-height: calc(100vh - 64px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px 16px;
          background: #0c0a15;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        .login-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          max-width: 920px;
          width: 100%;
          border-radius: 24px;
          overflow: hidden;
          background: #141124;
          border: 1px solid rgba(255, 255, 255, 0.07);
          box-shadow: 0 25px 80px -10px rgba(0, 0, 0, 0.7);
        }

        /* ── Left Brand Panel ── */
        .login-brand-panel {
          position: relative;
          padding: 48px 40px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          background: #19162e;
          border-right: 1px solid rgba(255, 255, 255, 0.05);
        }

        .login-brand-content {
          position: relative;
          z-index: 1;
        }

        .login-logo {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 28px;
        }

        .shield-icon {
          color: #6366f1;
          filter: drop-shadow(0 0 8px rgba(99, 102, 241, 0.5));
        }

        .logo-text {
          font-size: 24px;
          font-weight: 700;
          letter-spacing: -0.5px;
          font-family: 'Outfit', sans-serif;
        }

        .text-white {
          color: #ffffff;
        }

        .text-amber {
          color: #fbbf24;
        }

        .login-brand-panel h2 {
          font-size: 26px;
          font-weight: 700;
          color: #ffffff;
          line-height: 1.3;
          margin: 0 0 16px 0;
          font-family: 'Outfit', sans-serif;
        }

        .login-brand-panel p {
          color: #94a3b8;
          font-size: 14px;
          line-height: 1.6;
          margin: 0 0 32px 0;
        }

        .login-features {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .login-feature {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 14px;
          color: #cbd5e1;
        }

        .feature-icon {
          color: #6366f1;
          flex-shrink: 0;
        }

        /* ── Right Form Panel ── */
        .login-form-panel {
          padding: 44px 40px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          background: #141124;
        }

        .login-form-inner {
          width: 100%;
        }

        .auth-title {
          font-size: 28px;
          font-weight: 700;
          color: #ffffff;
          margin: 0 0 6px 0;
          font-family: 'Outfit', sans-serif;
        }

        .login-subtitle {
          color: #94a3b8;
          font-size: 13.5px;
          margin: 0 0 24px 0;
        }

        /* ── Role Selector ── */
        .role-selector {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
          margin-bottom: 22px;
        }

        .role-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 18px 12px;
          border-radius: 16px;
          border: 1.5px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.02);
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .role-card:hover {
          border-color: rgba(99, 102, 241, 0.4);
          background: rgba(255, 255, 255, 0.04);
        }

        .role-card.active {
          border-color: #6366f1;
          background: rgba(99, 102, 241, 0.08);
          box-shadow: 0 0 0 1px #6366f1, 0 8px 20px -4px rgba(99, 102, 241, 0.25);
        }

        .role-icon {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 12px;
        }

        .patient-icon {
          background: rgba(59, 130, 246, 0.12);
          color: #60a5fa;
        }

        .caregiver-icon {
          background: rgba(16, 185, 129, 0.12);
          color: #34d399;
        }

        .role-title {
          font-size: 14px;
          font-weight: 600;
          color: #ffffff;
          margin-bottom: 4px;
        }

        .role-desc {
          font-size: 11.5px;
          color: #64748b;
          line-height: 1.3;
        }

        /* ── Error Banner ── */
        .login-error {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 14px;
          border-radius: 10px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.25);
          color: #f87171;
          font-size: 13px;
          margin-bottom: 18px;
        }

        /* ── Form Inputs ── */
        .login-form {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .input-group label {
          font-size: 13px;
          font-weight: 500;
          color: #94a3b8;
        }

        .input-wrap {
          display: flex;
          align-items: center;
          background: #0d0a1a;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 0 14px;
          height: 48px;
          transition: all 0.2s ease;
        }

        .input-wrap:focus-within {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
          background: #110e20;
        }

        .input-icon {
          color: #64748b;
          flex-shrink: 0;
          margin-right: 10px;
        }

        .input-wrap input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          color: #ffffff;
          font-size: 14px;
          font-family: inherit;
        }

        .input-wrap input::placeholder {
          color: #475569;
        }

        .password-toggle {
          background: none;
          border: none;
          color: #64748b;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.15s ease;
        }

        .password-toggle:hover {
          color: #94a3b8;
        }

        /* ── Submit Button ── */
        .login-submit-btn {
          width: 100%;
          height: 48px;
          border-radius: 12px;
          background: #6366f1;
          color: #ffffff;
          font-size: 15px;
          font-weight: 600;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 6px;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 14px rgba(99, 102, 241, 0.35);
        }

        .login-submit-btn:hover {
          background: #5457e5;
          box-shadow: 0 6px 20px rgba(99, 102, 241, 0.45);
          transform: translateY(-1px);
        }

        .login-submit-btn:active {
          transform: translateY(0);
        }

        .login-submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .login-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* ── Mode Toggle ── */
        .login-mode-toggle {
          text-align: center;
          margin-top: 18px;
        }

        .login-mode-toggle p {
          font-size: 13.5px;
          color: #94a3b8;
          margin: 0;
        }

        .login-mode-toggle button {
          background: none;
          border: none;
          color: #818cf8;
          font-weight: 600;
          cursor: pointer;
          padding: 0 4px;
          text-decoration: underline;
          font-size: 13.5px;
          font-family: inherit;
          transition: color 0.15s ease;
        }

        .login-mode-toggle button:hover {
          color: #a5b4fc;
        }

        /* ── Quick Demo ── */
        .quick-demo-section {
          margin-top: 20px;
          padding-top: 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .quick-demo-divider {
          text-align: center;
          color: #64748b;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.5px;
        }

        .quick-demo-buttons {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .quick-demo-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          height: 36px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #cbd5e1;
        }

        .quick-demo-btn.patient {
          border-color: rgba(59, 130, 246, 0.25);
          color: #93c5fd;
        }

        .quick-demo-btn.patient:hover {
          background: rgba(59, 130, 246, 0.1);
        }

        .quick-demo-btn.caregiver {
          border-color: rgba(16, 185, 129, 0.25);
          color: #6ee7b7;
        }

        .quick-demo-btn.caregiver:hover {
          background: rgba(16, 185, 129, 0.1);
        }

        /* ── Responsive ── */
        @media (max-width: 800px) {
          .login-container {
            grid-template-columns: 1fr;
          }
          .login-brand-panel {
            display: none;
          }
          .login-form-panel {
            padding: 32px 24px;
          }
          .role-selector {
            grid-template-columns: 1fr 1fr;
          }
        }
      `}</style>
    </div>
  );
}

