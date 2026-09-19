import { useState, useEffect } from 'react';
import {
  Clock, MapPin, CheckCircle, ShieldCheck, AlertCircle, Phone, Lock,
  Activity, Check, Sparkles, Navigation, DollarSign
} from 'lucide-react';
import { releaseEscrowPayment } from '../services/paymentService';

export default function LiveSessionTracker({ session, isCaregiver = false, onSessionCompleted }) {
  const [isCheckedIn, setIsCheckedIn] = useState(() => {
    return localStorage.getItem(`cm_checkin_${session?.id}`) === 'true';
  });
  const [checkInTime, setCheckInTime] = useState(() => {
    return localStorage.getItem(`cm_checkin_time_${session?.id}`) || '06:02 PM';
  });
  const [checklist, setChecklist] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(`cm_checklist_${session?.id}`));
      return saved || [
        { id: 1, label: 'GPS Geofence Verified at Premises (Banjara Hills)', completed: true },
        { id: 2, label: 'Identity Safety Pass Scanned & Matched', completed: true },
        { id: 3, label: 'Administer Scheduled Medication (Donepezil / Omega-3)', completed: false },
        { id: 4, label: 'Activity Session & Sensory Routine Support', completed: true },
        { id: 5, label: 'Evening Nutrition & Vitals Check (BP / Heart Rate)', completed: false },
      ];
    } catch {
      return [];
    }
  });

  const [geofenceStatus, setGeofenceStatus] = useState('verified'); // 'verifying' | 'verified'
  const [isCompleted, setIsCompleted] = useState(false);

  const toggleChecklistItem = (id) => {
    const updated = checklist.map(item => item.id === id ? { ...item, completed: !item.completed } : item);
    setChecklist(updated);
    localStorage.setItem(`cm_checklist_${session?.id}`, JSON.stringify(updated));
  };

  const handleCheckIn = () => {
    const nowStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    setIsCheckedIn(true);
    setCheckInTime(nowStr);
    localStorage.setItem(`cm_checkin_${session?.id}`, 'true');
    localStorage.setItem(`cm_checkin_time_${session?.id}`, nowStr);
  };

  const handleCheckOutAndComplete = () => {
    setIsCompleted(true);
    if (session?.bookingId) {
      releaseEscrowPayment(session.bookingId);
    }
    onSessionCompleted?.(session);
  };

  return (
    <div className="live-session-tracker glass-card">
      <div className="tracker-top">
        <div className="tracker-header-left">
          <span className="live-pulsing-badge">
            <span className="pulse-circle" /> LIVE SHIFT IN PROGRESS
          </span>
          <h3>{session?.caregiverName || 'Priya Sharma'} ➔ {session?.patientName || 'Diya Reddy'}</h3>
          <p className="tracker-sub">
            Shift Slot: <strong>06:00 PM — 10:00 PM</strong> • Banjara Hills, Hyderabad
          </p>
        </div>

        <div className="tracker-timer-box">
          <Clock size={22} color="#818CF8" />
          <div>
            <span className="timer-count">2h 45m remaining</span>
            <span className="timer-label">4-Hour Dedicated Lock</span>
          </div>
        </div>
      </div>

      <div className="geofence-banner">
        <div className="geofence-item">
          <MapPin size={16} color="#10B981" />
          <span><strong>Geofence Status:</strong> {geofenceStatus === 'verified' ? '🟢 Verified on-site within 15m radius' : '🟡 Locating...'}</span>
        </div>
        <div className="geofence-item">
          <ShieldCheck size={16} color="#60A5FA" />
          <span><strong>Check-in Time:</strong> {isCheckedIn ? checkInTime : 'Pending Arrival'}</span>
        </div>
      </div>

      {/* Routine Task Checklist */}
      <div className="checklist-box">
        <h4>📋 Real-time Care Routine & Vitals Checklist</h4>
        <div className="checklist-items">
          {checklist.map((item) => (
            <div
              key={item.id}
              className={`checklist-item ${item.completed ? 'checked' : ''}`}
              onClick={() => isCaregiver && toggleChecklistItem(item.id)}
            >
              <div className={`checkbox-custom ${item.completed ? 'active' : ''}`}>
                {item.completed && <Check size={12} color="#fff" />}
              </div>
              <span className="checklist-text">{item.label}</span>
              {item.completed && <span className="completed-tag">Done</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="tracker-actions">
        {!isCheckedIn ? (
          <button className="btn-primary" onClick={handleCheckIn}>
            <Navigation size={16} /> Caregiver Geofence Check-In (6:00 PM)
          </button>
        ) : isCaregiver ? (
          <button className="btn-primary" style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }} onClick={handleCheckOutAndComplete}>
            <CheckCircle size={16} /> Complete Shift & Check-Out (10:00 PM) ➔ Release Escrow ₹{session?.payout || 1800}
          </button>
        ) : (
          <div className="family-live-monitoring">
            <ShieldCheck size={18} color="#10B981" />
            <span>Family Monitoring Live. Escrow of ₹{session?.rate || 1800} is held securely in platform trust.</span>
          </div>
        )}
      </div>

      <style>{`
        .live-session-tracker {
          padding: var(--space-6); border-radius: var(--radius-2xl);
          background: radial-gradient(circle at top left, rgba(79,70,229,0.12), rgba(15,13,26,0.95));
          border: 1px solid rgba(79,70,229,0.3); margin-bottom: var(--space-6);
        }
        .tracker-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-4); flex-wrap: wrap; gap: var(--space-3); }
        .live-pulsing-badge {
          display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px;
          border-radius: var(--radius-full); background: rgba(16,185,129,0.15);
          color: #34D399; font-size: 11px; font-weight: 700; border: 1px solid rgba(16,185,129,0.3);
          margin-bottom: var(--space-2);
        }
        .pulse-circle { width: 7px; height: 7px; border-radius: 50%; background: #10B981; animation: ping 1.5s infinite; }
        .tracker-header-left h3 { font-size: var(--fs-xl); margin-bottom: 2px; }
        .tracker-sub { font-size: var(--fs-xs); color: var(--text-tertiary); }
        .tracker-timer-box {
          display: flex; align-items: center; gap: var(--space-3); padding: var(--space-3) var(--space-4);
          background: rgba(0,0,0,0.4); border-radius: var(--radius-xl); border: 1px solid var(--border-glass);
        }
        .timer-count { display: block; font-size: var(--fs-base); font-weight: 700; color: #818CF8; }
        .timer-label { font-size: 11px; color: var(--text-muted); }
        .geofence-banner {
          display: flex; gap: var(--space-6); padding: var(--space-3) var(--space-4);
          background: rgba(255,255,255,0.02); border-radius: var(--radius-lg);
          border: 1px solid var(--border-glass); margin-bottom: var(--space-4); flex-wrap: wrap;
        }
        .geofence-item { display: flex; align-items: center; gap: 6px; font-size: var(--fs-xs); color: var(--text-secondary); }
        .checklist-box { margin-bottom: var(--space-4); }
        .checklist-box h4 { font-size: var(--fs-sm); font-weight: 600; margin-bottom: var(--space-3); color: var(--text-primary); }
        .checklist-items { display: flex; flex-direction: column; gap: var(--space-2); }
        .checklist-item {
          display: flex; align-items: center; gap: var(--space-3); padding: var(--space-2) var(--space-3);
          border-radius: var(--radius-md); background: rgba(0,0,0,0.25); border: 1px solid var(--border-glass);
          font-size: var(--fs-xs); cursor: pointer; transition: all 0.2s;
        }
        .checklist-item.checked { background: rgba(16,185,129,0.06); border-color: rgba(16,185,129,0.25); }
        .checkbox-custom {
          width: 18px; height: 18px; border-radius: 4px; border: 1px solid var(--border-glass);
          display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.05);
        }
        .checkbox-custom.active { background: #10B981; border-color: #10B981; }
        .checklist-text { flex: 1; color: var(--text-secondary); }
        .checklist-item.checked .checklist-text { color: var(--text-primary); text-decoration: line-through opacity; }
        .completed-tag { font-size: 10px; color: #10B981; font-weight: 600; }
        .tracker-actions { display: flex; justify-content: flex-end; }
        .family-live-monitoring { display: flex; align-items: center; gap: 8px; font-size: var(--fs-xs); color: var(--text-secondary); }
      `}</style>
    </div>
  );
}
