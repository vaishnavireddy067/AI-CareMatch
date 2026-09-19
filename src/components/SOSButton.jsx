import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Loader, ShieldAlert, PhoneCall, MapPin, X, Volume2, VolumeX, Send } from 'lucide-react';
import { triggerSOS } from '../services/sosService';
import { useAuth } from '../contexts/auth-context';

export default function SOSButton() {
  const { userProfile, role } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [dispatched, setDispatched] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [status, setStatus] = useState('idle'); // idle | sending | sent

  const playSiren = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(550, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(880, ctx.currentTime + 0.25);
      osc.frequency.linearRampToValueAtTime(550, ctx.currentTime + 0.5);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.55);
    } catch (e) {
      console.warn('Audio feedback error', e);
    }
  };

  useEffect(() => {
    let timer;
    if (modalOpen && !dispatched && countdown > 0) {
      playSiren();
      timer = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            handleDispatch();
            return 0;
          }
          playSiren();
          return c - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [modalOpen, dispatched, countdown]);

  const handleOpen = () => {
    setModalOpen(true);
    setCountdown(5);
    setDispatched(false);
  };

  const handleCancel = () => {
    setModalOpen(false);
    setCountdown(5);
    setDispatched(false);
  };

  const handleDispatch = async () => {
    setDispatched(true);
    setStatus('sending');
    const name = userProfile?.displayName || 'Vaishnavi Reddy';
    await triggerSOS(role, name);
    setStatus('sent');
  };

  return (
    <>
      <button
        className="sos-btn"
        onClick={handleOpen}
        title={role === 'caregiver' ? 'SOS — Alert Admin' : 'SOS — Alert Family'}
      >
        <AlertTriangle size={14} />
        <span>SOS</span>
      </button>

      {modalOpen && (
        <div className="sos-modal-overlay" onClick={handleCancel}>
          <div className="sos-modal glass-card" onClick={(e) => e.stopPropagation()}>
            <div className="sos-modal-header">
              <div className="sos-badge">
                <ShieldAlert size={20} />
                <span>EMERGENCY SOS DISPATCH</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  className="sos-icon-btn"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  title={soundEnabled ? 'Mute Siren' : 'Enable Siren'}
                >
                  {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                </button>
                <button type="button" className="sos-icon-btn" onClick={handleCancel}><X size={18} /></button>
              </div>
            </div>

            {!dispatched ? (
              <div className="sos-modal-body">
                <div className="sos-countdown-circle">
                  <span className="sos-num">{countdown}</span>
                  <span className="sos-sub">Auto-Dispatch in</span>
                </div>

                <div className="sos-info-box">
                  <div className="sos-info-row">
                    <MapPin size={16} className="sos-pin" />
                    <div>
                      <strong>GPS Location Broadcast:</strong>
                      <p>17.4156° N, 78.4347° E • Banjara Hills, Hyderabad</p>
                    </div>
                  </div>
                  <div className="sos-info-row">
                    <PhoneCall size={16} className="sos-pin" />
                    <div>
                      <strong>Emergency Dispatch Route:</strong>
                      <p>Family Emergency Contact (+91 98765 43210) & Verified Medical Response Team</p>
                    </div>
                  </div>
                </div>

                <div className="sos-actions">
                  <button type="button" className="btn-primary sos-dispatch-now" onClick={handleDispatch}>
                    <Send size={16} /> Dispatch Immediately
                  </button>
                  <button type="button" className="btn-secondary sos-cancel-btn" onClick={handleCancel}>
                    Cancel Alert
                  </button>
                </div>
              </div>
            ) : (
              <div className="sos-modal-body dispatched">
                <div className="sos-success-icon">
                  <CheckCircle size={48} color="#10B981" />
                </div>
                <h3>🚨 Emergency Alert Dispatched!</h3>
                <p className="sos-success-sub">
                  Live location, medical profile & safety contact details have been sent via Twilio WhatsApp Gateway to emergency contacts.
                </p>

                <div className="sos-dispatched-list">
                  <div className="dispatch-item">
                    <span>✅ Family Emergency Contact</span>
                    <strong>+91 98765 43210 (Notified via WhatsApp)</strong>
                  </div>
                  <div className="dispatch-item">
                    <span>✅ Safety Desk & Admin</span>
                    <strong>Response Unit Alerted (Kondapur Hub)</strong>
                  </div>
                  <div className="dispatch-item">
                    <span>✅ Live Medical Tracker</span>
                    <strong>Active (GPS Track #SOS-HYD-9921)</strong>
                  </div>
                </div>

                <button type="button" className="btn-primary" style={{ width: '100%', marginTop: '16px' }} onClick={handleCancel}>
                  Close & Return to App
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .sos-btn {
          display: flex; align-items: center; gap: 4px;
          padding: 6px 12px; border-radius: 8px;
          background: #EF4444; color: white;
          font-weight: 700; font-size: 12px;
          border: none; cursor: pointer;
          transition: all 0.2s; flex-shrink: 0;
          letter-spacing: 0.5px;
          animation: sos-pulse 2s infinite ease-in-out;
        }
        @keyframes sos-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          50% { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
        }
        .sos-btn:hover { background: #DC2626; transform: scale(1.05); }

        .sos-modal-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.75);
          backdrop-filter: blur(8px);
          display: flex; align-items: center; justify-content: center;
          z-index: 9999; padding: 16px;
        }
        .sos-modal {
          max-width: 480px; width: 100%;
          background: #13111C;
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 20px;
          padding: 24px;
          box-shadow: 0 25px 60px rgba(239, 68, 68, 0.25);
          animation: sos-pop 0.2s ease-out;
        }
        @keyframes sos-pop {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .sos-modal-header {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 20px;
        }
        .sos-badge {
          display: flex; align-items: center; gap: 8px;
          color: #EF4444; font-weight: 800; font-size: 13px;
          letter-spacing: 0.5px;
        }
        .sos-icon-btn {
          background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
          color: #fff; width: 32px; height: 32px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all 0.2s;
        }
        .sos-icon-btn:hover { background: rgba(255,255,255,0.15); }
        .sos-countdown-circle {
          width: 90px; height: 90px;
          border-radius: 50%;
          background: rgba(239, 68, 68, 0.1);
          border: 3px solid #EF4444;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          margin: 0 auto 20px auto;
        }
        .sos-num { font-size: 32px; font-weight: 800; color: #EF4444; line-height: 1; }
        .sos-sub { font-size: 10px; color: #94A3B8; margin-top: 2px; }
        .sos-info-box {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          padding: 14px;
          display: flex; flex-direction: column; gap: 12px;
          margin-bottom: 20px;
        }
        .sos-info-row { display: flex; gap: 10px; align-items: flex-start; }
        .sos-pin { color: #EF4444; flex-shrink: 0; margin-top: 2px; }
        .sos-info-row strong { font-size: 12px; color: #E2E8F0; display: block; margin-bottom: 2px; }
        .sos-info-row p { font-size: 11px; color: #94A3B8; margin: 0; }
        .sos-actions { display: grid; grid-template-columns: 1.4fr 1fr; gap: 10px; }
        .sos-dispatch-now { background: #EF4444 !important; }
        .sos-dispatch-now:hover { background: #DC2626 !important; }
        .sos-cancel-btn { background: rgba(255,255,255,0.06); }
        .sos-modal-body.dispatched { text-align: center; }
        .sos-success-icon { margin-bottom: 12px; }
        .sos-success-sub { font-size: 13px; color: #94A3B8; margin-bottom: 16px; line-height: 1.5; }
        .sos-dispatched-list {
          display: flex; flex-direction: column; gap: 8px;
          background: rgba(16, 185, 129, 0.05);
          border: 1px solid rgba(16, 185, 129, 0.2);
          border-radius: 12px; padding: 12px;
          text-align: left;
        }
        .dispatch-item span { font-size: 11px; color: #10B981; font-weight: 600; display: block; }
        .dispatch-item strong { font-size: 12px; color: #E2E8F0; }
      `}</style>
    </>
  );
}
