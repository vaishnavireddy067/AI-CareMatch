import { useState } from 'react';
import { X, Sparkles, CheckCircle, Shield, Star, MapPin, Clock, ArrowRight, UserCheck } from 'lucide-react';
import { findCaregiverReplacements } from '../engine/replacementEngine';

export default function ReplacementModal({
  isOpen,
  onClose,
  cancelledCaregiver = { id: 1, name: 'Priya Sharma' },
  bookingData = {},
  onSelectReplacement
}) {
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [reassignedSuccess, setReassignedSuccess] = useState(false);

  if (!isOpen) return null;

  const replacements = findCaregiverReplacements({
    cancelledCaregiverId: cancelledCaregiver.id || 1,
    domain: bookingData.domain || 'child',
    requiredSkills: ['ADHD', 'First Aid'],
    budget: 600,
    locationName: 'Banjara Hills'
  });

  const handleConfirmReassign = (candidate) => {
    setSelectedCandidate(candidate);
    setReassignedSuccess(true);
    if (onSelectReplacement) {
      onSelectReplacement(candidate);
    }
    setTimeout(() => {
      setReassignedSuccess(false);
      onClose();
    }, 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="glass-card replacement-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header-simple">
          <h3>
            <Sparkles size={18} color="#EF4444" />
            <span>AI Caregiver Emergency Auto-Replacement</span>
          </h3>
          <button type="button" className="modal-close-btn" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClose(); }}><X size={18} /></button>
        </div>

        {reassignedSuccess ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-8) 0' }}>
            <CheckCircle size={56} color="#10B981" style={{ margin: '0 auto var(--space-3)' }} />
            <h3>Replacement Confirmed with {selectedCandidate?.caregiver?.name}!</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
              Escrow ₹1,800 transferred smoothly. Caregiver dispatched with ETA {selectedCandidate?.etaMinutes || 20} mins.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-lg)', padding: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: '12px', color: '#F87171' }}>⚠️ Unscheduled Cancellation Detected</strong>
                <span style={{ fontSize: '10px', background: 'rgba(239,68,68,0.2)', padding: '2px 6px', borderRadius: '4px', color: '#FCA5A5' }}>
                  Session #{bookingData.id || 'BK-101'}
                </span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#E2E8F0' }}>
                <strong>{cancelledCaregiver.name}</strong> was unable to fulfill shift due to transit breakdown. AI has scanned & ranked 3 equivalent verified caregivers ready for immediate dispatch.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {replacements.map((cand, idx) => {
                const cg = cand.caregiver;
                return (
                  <div key={cg.id} className="candidate-card glass-card">
                    <div className="cand-top">
                      <div className="cand-avatar">
                        <img src={cg.photo} alt={cg.name} />
                        <span className="cand-rank-badge">#{idx + 1} Best Match</span>
                      </div>
                      <div className="cand-meta">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <h4 style={{ margin: 0, fontSize: '14px' }}>{cg.name}</h4>
                          <span style={{ fontSize: '12px', fontWeight: 800, color: '#10B981' }}>{cand.matchScore}% Match</span>
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {cg.category === 'child' ? '👶 Child Care' : cg.category === 'human' ? '🧑 Elder Care' : '🐾 Pet Care'} • Trust Score: <strong>{cg.trustScore}/100</strong>
                        </span>
                        <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          <span><Clock size={11} /> ETA: <strong>{cand.etaMinutes} mins</strong></span>
                          <span><MapPin size={11} /> {cg.location?.name || 'Banjara Hills'}</span>
                          <span>₹{cg.pricing}/hr</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', margin: '8px 0' }}>
                      {cand.reasons.map((r, rIdx) => (
                        <span key={rIdx} style={{ fontSize: '10px', background: 'rgba(59, 130, 246, 0.12)', color: '#93C5FD', padding: '2px 6px', borderRadius: '4px' }}>
                          ✓ {r}
                        </span>
                      ))}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
                      <button
                        type="button"
                        className="btn-primary btn-sm"
                        style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', border: 'none', width: '100%' }}
                        onClick={() => handleConfirmReassign(cand)}
                      >
                        <UserCheck size={14} /> 1-Click Auto-Reassign (Transfer Escrow)
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <style>{`
          .replacement-modal {
            max-width: 540px;
            width: 100%;
            border-radius: 20px;
            border: 1px solid rgba(239, 68, 68, 0.4);
            background: #140d18;
            padding: 24px;
            box-shadow: 0 25px 80px rgba(0,0,0,0.8);
          }
          .candidate-card {
            padding: 12px;
            border-radius: var(--radius-lg);
            border: 1px solid var(--border-glass);
            background: rgba(255, 255, 255, 0.02);
            transition: all 0.2s;
          }
          .candidate-card:hover {
            border-color: rgba(16, 185, 129, 0.4);
            background: rgba(16, 185, 129, 0.04);
          }
          .cand-top {
            display: flex;
            gap: 12px;
            align-items: center;
          }
          .cand-avatar {
            position: relative;
            width: 52px;
            height: 52px;
            border-radius: 50%;
            flex-shrink: 0;
          }
          .cand-avatar img {
            width: 100%;
            height: 100%;
            border-radius: 50%;
            object-fit: cover;
            border: 2px solid #10B981;
          }
          .cand-rank-badge {
            position: absolute;
            bottom: -4px;
            left: 50%;
            transform: translateX(-50%);
            background: #10B981;
            color: #000;
            font-size: 8px;
            font-weight: 800;
            padding: 1px 4px;
            border-radius: 4px;
            white-space: nowrap;
          }
          .cand-meta {
            flex: 1;
          }
        `}</style>
      </div>
    </div>
  );
}
