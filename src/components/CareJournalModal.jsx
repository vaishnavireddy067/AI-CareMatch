import { useState } from 'react';
import { X, FileText, CheckCircle, Heart, Activity, AlertTriangle, Sparkles, Smile, Meh, Frown } from 'lucide-react';
import { saveCareJournalEntry } from '../services/careJournalService';

export default function CareJournalModal({ isOpen, onClose, isCaregiver = false, bookingData = {}, onSaved }) {
  const [mood, setMood] = useState('😊 Happy & Energetic');
  const [moodScore, setMoodScore] = useState(5);
  const [meals, setMeals] = useState('Healthy snack and 400ml water supervised.');
  const [meds, setMeds] = useState('Afternoon prescribed routine medication administered on time.');
  const [medAdherent, setMedAdherent] = useState(true);
  const [activities, setActivities] = useState('Focus exercises, reading, and sensory therapy routine completed.');
  const [vitals, setVitals] = useState('Pulse: 78 bpm • Temperature: 98.6°F');
  const [notes, setNotes] = useState('Shift went very smoothly with excellent recipient cooperation.');
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const entry = {
      bookingId: bookingData.id || 'BK-101',
      caregiverId: bookingData.caregiverId || 1,
      caregiverName: bookingData.caregiverName || 'Priya Sharma',
      careRecipient: bookingData.careRecipient || 'Diya Reddy (7yo)',
      category: bookingData.domain || 'child',
      mood,
      moodScore,
      mealsConsumed: meals,
      medicationGiven: meds,
      medicationAdherent: medAdherent,
      activitiesCompleted: activities,
      vitals,
      caregiverNotes: notes,
      incidentsReported: 'None'
    };

    saveCareJournalEntry(entry);
    setSavedSuccess(true);
    if (onSaved) onSaved(entry);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1500);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="glass-card journal-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header-simple">
          <h3>
            <FileText size={18} color="#8B5CF6" />
            <span>Digital Care Session Journal</span>
          </h3>
          <button type="button" className="modal-close-btn" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClose(); }}><X size={18} /></button>
        </div>

        {savedSuccess ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-8) 0' }}>
            <CheckCircle size={56} color="#10B981" style={{ margin: '0 auto var(--space-3)' }} />
            <h3>Care Journal Entry Saved & Synced!</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
              Family portal and AI health summary updated with this shift report.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div style={{ padding: 'var(--space-3)', background: 'rgba(139, 92, 246, 0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
              <strong style={{ fontSize: '13px', color: '#A78BFA' }}>
                Shift: {bookingData.caregiverName || 'Priya Sharma'} ➔ {bookingData.careRecipient || 'Diya Reddy'}
              </strong>
              <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>
                Session #{bookingData.id || 'BK-101'} • Log recorded directly into permanent encrypted care history
              </p>
            </div>

            {/* Recipient Mood Rating */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                Care Recipient Mood & State:
              </label>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                {[
                  { label: '😊 Energetic', score: 5 },
                  { label: '🙂 Calm', score: 4 },
                  { label: '😐 Neutral', score: 3 },
                  { label: '😟 Agitated', score: 2 }
                ].map((item) => (
                  <button
                    key={item.score}
                    type="button"
                    style={{
                      flex: 1, padding: '8px 4px', fontSize: '11px', borderRadius: '8px',
                      background: moodScore === item.score ? 'rgba(139, 92, 246, 0.25)' : 'rgba(255,255,255,0.03)',
                      border: moodScore === item.score ? '1px solid #8B5CF6' : '1px solid var(--border-glass)',
                      color: moodScore === item.score ? '#fff' : 'var(--text-secondary)',
                      cursor: 'pointer'
                    }}
                    onClick={() => { setMood(item.label); setMoodScore(item.score); }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Medication Adherence */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
              <div>
                <strong style={{ fontSize: '12px', display: 'block' }}>Prescribed Medication Administered</strong>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Confirmed exact dosage as per Care Plan</span>
              </div>
              <input
                type="checkbox"
                checked={medAdherent}
                onChange={(e) => setMedAdherent(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: '#10B981' }}
              />
            </div>

            {/* Meals & Hydration */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                Meals & Hydration Log
              </label>
              <input
                className="input-field"
                value={meals}
                onChange={(e) => setMeals(e.target.value)}
                placeholder="e.g. Healthy lunch, 500ml water"
              />
            </div>

            {/* Activities Completed */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                Routine & Activities Delivered
              </label>
              <input
                className="input-field"
                value={activities}
                onChange={(e) => setActivities(e.target.value)}
                placeholder="e.g. Mobility exercises, homework, sensory walk"
              />
            </div>

            {/* Vitals or Observations */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                Vitals & Clinical Observations
              </label>
              <input
                className="input-field"
                value={vitals}
                onChange={(e) => setVitals(e.target.value)}
                placeholder="e.g. BP: 120/80, SpO2: 99%, Normal"
              />
            </div>

            {/* Additional Notes */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                Caregiver Shift Notes for Family
              </label>
              <textarea
                className="input-field"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special behavioral notes or instructions..."
              />
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
              <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" style={{ flex: 1, background: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)', border: 'none' }}>
                Submit Care Log
              </button>
            </div>
          </form>
        )}

        <style>{`
          .journal-modal {
            max-width: 500px;
            width: 100%;
            border-radius: 20px;
            border: 1px solid rgba(139, 92, 246, 0.3);
            background: #12101E;
            padding: 24px;
            box-shadow: 0 25px 80px rgba(0,0,0,0.7);
          }
        `}</style>
      </div>
    </div>
  );
}
