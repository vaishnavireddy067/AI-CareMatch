import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { caregivers, getRemainingBlockTime } from '../data/caregivers';
import ScoreGauge from '../components/ScoreGauge';
import RadarChart from '../components/RadarChart';
import { saveBooking, sendNotification } from '../services/firebase';
import { useAuth } from '../contexts/auth-context';
import { createSubscription, RECURRENCE_FREQUENCIES } from '../engine/subscriptionEngine';
import { calculateDynamicPricing } from '../engine/dynamicPricingEngine';
import {
  ShieldCheck, ShieldX, MapPin, Star, ArrowLeft, BadgeCheck, Lock,
  IndianRupee, MapPinned, Calendar, Clock, X, CheckCircle, Sparkles, AlertCircle,
  Repeat, Layers, Shield
} from 'lucide-react';

export default function CaregiverProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const patientName = userProfile?.displayName || 'Vaishnavi Reddy';

  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [bookingMode, setBookingMode] = useState('single'); // 'single' | 'recurring'
  const [recurrenceFreq, setRecurrenceFreq] = useState('weekdays');
  const [bookingType, setBookingType] = useState('scheduled'); // 'scheduled' | 'sameday' | 'emergency'
  const [schedDate, setSchedDate] = useState(() => {
    const tomorrow = new Date(Date.now() + 86400000);
    return tomorrow.toISOString().split('T')[0];
  });
  const [schedTime, setSchedTime] = useState('10:00');
  const [durationHours, setDurationHours] = useState(4);
  const [hasSpecialSkill, setHasSpecialSkill] = useState(true);
  const [careNotes, setCareNotes] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingSuccessMsg, setBookingSuccessMsg] = useState('');

  const cg = caregivers.find((c) => c.id === Number(id));

  if (!cg) return (
    <div className="profile-page container" style={{ paddingTop: 120, textAlign: 'center' }}>
      <h2>Caregiver not found</h2>
      <button className="btn-primary" onClick={() => navigate('/search')}>Back to Search</button>
    </div>
  );

  const verifications = [
    { key: 'faceLiveness', label: 'Live Selfie Verification', passed: cg.verification.faceLiveness },
    { key: 'govId', label: 'Government ID', passed: cg.verification.govId },
    { key: 'digilocker', label: 'ID Upload Match', passed: cg.verification.digilocker },
    { key: 'documentOCR', label: 'Document OCR', passed: cg.verification.documentOCR },
    { key: 'policeClearance', label: 'Police Clearance', passed: cg.verification.policeClearance },
    { key: 'referenceCheck', label: 'Reference Check', passed: cg.verification.referenceCheck },
    { key: 'liveSelfie', label: 'AI Face Match', passed: cg.verification.liveSelfie },
    { key: 'medicalScreening', label: 'Medical Professor Screening', passed: cg.verification.medicalScreening },
  ];

  const blockTime = getRemainingBlockTime(cg);

  // Dimension scores for radar
  const scores = {
    proximity: 85,
    availability: Math.round((cg.availability.morning + cg.availability.afternoon + cg.availability.evening + cg.availability.night + cg.availability.weekends) / 5 * 100),
    experience: Math.min(100, Math.round(cg.stats.totalSessions / 3)),
    verification: verifications.filter((v) => v.passed).length * 12.5,
    reliability: Math.round(cg.stats.onTimeRate * 40 + (1 - cg.stats.cancellationRate) * 30 + cg.stats.completionRate * 30),
    budgetFit: 80,
  };

  // Dynamic Pricing Calculation
  const pricingCalc = calculateDynamicPricing({
    baseHourlyRate: cg.pricing || 450,
    durationHours,
    urgency: bookingType,
    hasSpecialSkill: true,
    specialSkillName: cg.specializations?.[0] || 'ADHD / Clinical Support',
    isNightShift: schedTime >= '21:00' || schedTime <= '05:00'
  });

  const selectedFreq = Object.values(RECURRENCE_FREQUENCIES).find(f => f.id === recurrenceFreq) || RECURRENCE_FREQUENCIES.WEEKDAYS;
  const recurringDiscount = selectedFreq.discountPercent;
  const effectiveRecurringRate = Math.round(cg.pricing * (1 - recurringDiscount / 100));
  const recurringMonthlyTotal = effectiveRecurringRate * durationHours * (selectedFreq.daysPerWeek * 4);

  const totalCost = bookingMode === 'recurring' ? recurringMonthlyTotal : pricingCalc.subtotal;

  const handleConfirmBooking = async () => {
    if (bookingMode === 'recurring') {
      const sub = createSubscription({
        caregiver: cg,
        patientName,
        patientId: userProfile?.uniqueId || 'CF-20001',
        careRecipient: 'Diya Reddy (7yo)',
        domain: cg.domain || cg.category,
        frequency: recurrenceFreq,
        timeSlot: `${schedTime} (4 Hrs / shift)`,
        hoursPerShift: durationHours,
        durationMonths: 3,
        notes: careNotes || 'Recurring scheduled care plan'
      });

      await sendNotification({
        type: 'booking',
        targetRole: 'caregiver',
        targetId: cg.uniqueId || `CG-${cg.id}`,
        title: `🔄 New Recurring Care Subscription from ${patientName}`,
        body: `${selectedFreq.name} booked. Monthly billing: ₹${recurringMonthlyTotal.toLocaleString('en-IN')}.`,
      });

      setBookingSuccessMsg(`🎉 Recurring Subscription Activated! ₹${recurringMonthlyTotal.toLocaleString('en-IN')}/mo with ${recurringDiscount}% discount.`);
    } else {
      const newBooking = {
        caregiverId: cg.id,
        caregiverName: cg.name,
        caregiverUniqueId: cg.uniqueId || `CG-${cg.id}`,
        patientName,
        patientUniqueId: userProfile?.uniqueId || 'CF-20001',
        domain: cg.domain || cg.category,
        urgency: bookingType,
        scheduledDate: bookingType === 'scheduled' ? schedDate : 'Today',
        scheduledTime: bookingType === 'scheduled' ? schedTime : 'Immediate Dispatch',
        durationHours,
        totalAmount: totalCost,
        careNotes: careNotes || 'Routine care session with trust validation.',
        status: 'confirmed',
        createdAt: new Date().toISOString(),
      };

      await saveBooking(newBooking);

      await sendNotification({
        type: 'booking',
        targetRole: 'caregiver',
        targetId: cg.uniqueId || `CG-${cg.id}`,
        title: `📅 New Booking Confirmed from ${patientName}`,
        body: `Shift booked for ${bookingType === 'scheduled' ? schedDate + ' at ' + schedTime : 'Immediate Dispatch'} (${durationHours} hours). Payout: ₹${totalCost}.`,
      });

      setBookingSuccessMsg('🎉 Booking Confirmed! Escrow hold created securely.');
    }

    setBookingSuccess(true);
    setTimeout(() => {
      navigate('/dashboard');
    }, 1800);
  };

  return (
    <div className="profile-page">
      <div className="container">
        <button className="back-btn btn-ghost" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} /> Back
        </button>

        <div className="profile-header glass-card">
          <div className="profile-avatar"><img src={cg.photo} alt={cg.name} /></div>
          <div className="profile-info">
            <h1>{cg.name}</h1>
            {cg.uniqueId && <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', fontFamily: 'monospace' }}>ID: {cg.uniqueId}</span>}
            <div className="profile-meta">
              {cg.govVerified && <span className="badge badge-trust"><BadgeCheck size={12} /> Verified</span>}
              {cg.verified && <span className="badge badge-verified"><ShieldCheck size={12} /> Verified</span>}
              <span className="badge" style={{ background: 'rgba(139,92,246,0.12)', color: '#A78BFA', border: '1px solid rgba(139,92,246,0.3)' }}>
                {cg.category === 'child' ? '👶 Child' : cg.category === 'human' ? '🧑 Human' : '🐾 Pet'}
              </span>
              <span className="badge badge-trust">Trust {cg.trustScore}</span>
              {cg.screeningRating && (
                <span className="meta-item">
                  {Array.from({ length: cg.screeningRating }).map((_, i) => <Star key={i} size={12} fill="#F59E0B" color="#F59E0B" />)}
                  <span style={{ marginLeft: 4, fontSize: 'var(--fs-xs)' }}>Screening</span>
                </span>
              )}
              <span className="meta-item"><MapPin size={14} /> {cg.location.name}</span>
              <span className="meta-item"><IndianRupee size={14} /> ₹{cg.pricing}/{cg.pricingUnit} • ₹{cg.dailyCost}/day</span>
              {blockTime && <span className="badge badge-warning"><Lock size={12} /> Active Job — {blockTime} remaining</span>}
            </div>
            <p className="profile-bio">{cg.bio}</p>
          </div>
          <div className="profile-score">
            <ScoreGauge score={cg.trustScore} label="Trust Score" size={100} />
          </div>
        </div>

        <div className="profile-grid">
          <div className="profile-section glass-card">
            <h3>Verification Status</h3>
            <div className="ver-list">
              {verifications.map((v) => (
                <div key={v.key} className={`ver-item ${v.passed ? 'passed' : 'failed'}`}>
                  {v.passed ? <ShieldCheck size={18} /> : <ShieldX size={18} />}
                  <span>{v.label}</span>
                  <span className={`ver-status badge ${v.passed ? 'badge-trust' : 'badge-risk'}`}>
                    {v.passed ? 'Passed' : 'Pending'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="profile-section glass-card">
            <h3>Scoring Dimensions</h3>
            <div className="radar-wrap">
              <RadarChart scores={scores} size={220} />
            </div>
          </div>

          <div className="profile-section glass-card">
            <h3>Performance Stats</h3>
            <div className="stats-list">
              <div className="profile-stat"><span>Total Sessions</span><strong>{cg.stats.totalSessions}</strong></div>
              <div className="profile-stat"><span>On-Time Rate</span><strong>{Math.round(cg.stats.onTimeRate * 100)}%</strong></div>
              <div className="profile-stat"><span>Cancellation Rate</span><strong>{Math.round(cg.stats.cancellationRate * 100)}%</strong></div>
              <div className="profile-stat"><span>Completion Rate</span><strong>{Math.round(cg.stats.completionRate * 100)}%</strong></div>
              <div className="profile-stat"><span>Avg Rating</span><strong>{cg.stats.avgRating} ⭐</strong></div>
            </div>
          </div>

          <div className="profile-section glass-card">
            <h3>Specializations</h3>
            <div className="spec-tags">
              {cg.specializations.map((s) => (
                <span key={s} className="spec-tag">{s}</span>
              ))}
            </div>
          </div>

          <div className="profile-section glass-card full-width">
            <h3>Family Reviews</h3>
            <div className="reviews-list">
              {cg.reviews.map((r, i) => (
                <div key={i} className="review-item">
                  <div className="review-head">
                    <strong>{r.family}</strong>
                    <div className="review-stars">
                      {Array.from({ length: r.rating }).map((_, j) => <Star key={j} size={12} fill="#F59E0B" color="#F59E0B" />)}
                    </div>
                  </div>
                  <p>{r.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Work Location History */}
          {cg.workHistory && cg.workHistory.length > 0 && (
            <div className="profile-section glass-card full-width">
              <h3><MapPinned size={18} style={{ verticalAlign: 'text-bottom' }} /> Work Location History</h3>
              <div className="work-history-list">
                {cg.workHistory.map((w, i) => (
                  <div key={i} className={`work-item ${w.status === 'in-progress' ? 'active' : ''}`}>
                    <div className="work-item-info">
                      <strong><MapPin size={14} /> {w.location}</strong>
                      <span>{w.date} • {w.duration}</span>
                    </div>
                    <span className={`badge ${w.status === 'completed' ? 'badge-trust' : 'badge-warning'}`}>
                      {w.status === 'completed' ? '✅ Completed' : '🟡 In Progress'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="profile-actions">
          <button
            className="btn-primary profile-book-btn"
            onClick={() => setIsBookingOpen(true)}
            disabled={!!blockTime}
          >
            {blockTime ? `Caregiver is on active shift (${blockTime})` : `Book ${cg.name} Now`}
          </button>
        </div>
      </div>

      {/* Booking Modal */}
      {isBookingOpen && (
        <div className="booking-modal-backdrop" onClick={() => !bookingSuccess && setIsBookingOpen(false)}>
          <div className="booking-modal-card glass-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-top">
              <div className="modal-title-wrap">
                <Sparkles size={20} className="modal-icon-sparkle" />
                <h3>{bookingMode === 'recurring' ? 'Recurring Care Subscription Plan' : 'Book Care Session'}</h3>
              </div>
              <button className="close-btn" onClick={() => setIsBookingOpen(false)}><X size={18} /></button>
            </div>

            {bookingSuccess ? (
              <div className="booking-success-view">
                <CheckCircle size={56} color="#10B981" />
                <h3>{bookingSuccessMsg || 'Booking Confirmed!'}</h3>
                <p>Redirecting you to the Family Dashboard...</p>
              </div>
            ) : (
              <div className="booking-form-content">
                {/* Booking Mode Switcher */}
                <div style={{ display: 'flex', gap: '8px', background: 'rgba(0,0,0,0.3)', padding: '4px', borderRadius: 'var(--radius-lg)', marginBottom: '8px' }}>
                  <button
                    type="button"
                    style={{
                      flex: 1, padding: '8px 12px', fontSize: '12px', fontWeight: 600, borderRadius: '8px',
                      background: bookingMode === 'single' ? 'rgba(59, 130, 246, 0.25)' : 'transparent',
                      border: bookingMode === 'single' ? '1px solid #3B82F6' : 'none',
                      color: bookingMode === 'single' ? '#93C5FD' : 'var(--text-secondary)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                    }}
                    onClick={() => setBookingMode('single')}
                  >
                    <Calendar size={14} /> Single Shift
                  </button>
                  <button
                    type="button"
                    style={{
                      flex: 1, padding: '8px 12px', fontSize: '12px', fontWeight: 600, borderRadius: '8px',
                      background: bookingMode === 'recurring' ? 'rgba(139, 92, 246, 0.25)' : 'transparent',
                      border: bookingMode === 'recurring' ? '1px solid #8B5CF6' : 'none',
                      color: bookingMode === 'recurring' ? '#C084FC' : 'var(--text-secondary)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                    }}
                    onClick={() => setBookingMode('recurring')}
                  >
                    <Repeat size={14} /> Recurring Care (Save up to 15%)
                  </button>
                </div>

                <div className="caregiver-summary-pill">
                  <img src={cg.photo} alt={cg.name} className="pill-avatar" />
                  <div>
                    <strong>{cg.name}</strong>
                    <span>{cg.location.name} • Trust: {cg.trustScore}/100 • Base: ₹{cg.pricing}/hr</span>
                  </div>
                </div>

                {bookingMode === 'recurring' ? (
                  <div className="form-field-group">
                    <label className="field-label">Recurrence Schedule</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {Object.values(RECURRENCE_FREQUENCIES).map((f) => (
                        <div
                          key={f.id}
                          style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '10px 12px', borderRadius: '8px',
                            background: recurrenceFreq === f.id ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255,255,255,0.03)',
                            border: recurrenceFreq === f.id ? '1px solid #8B5CF6' : '1px solid var(--border-glass)',
                            cursor: 'pointer'
                          }}
                          onClick={() => setRecurrenceFreq(f.id)}
                        >
                          <div>
                            <strong style={{ fontSize: '12px', color: recurrenceFreq === f.id ? '#fff' : 'var(--text-secondary)', display: 'block' }}>
                              {f.name}
                            </strong>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{f.description}</span>
                          </div>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#34D399', background: 'rgba(16, 185, 129, 0.12)', padding: '2px 8px', borderRadius: '4px' }}>
                            {f.discountPercent}% OFF
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="form-field-group">
                    <label className="field-label">Urgency & Shift Type</label>
                    <div className="urgency-selector">
                      <button
                        type="button"
                        className={`urgency-chip ${bookingType === 'scheduled' ? 'active' : ''}`}
                        onClick={() => setBookingType('scheduled')}
                      >
                        <Calendar size={14} /> Scheduled
                      </button>
                      <button
                        type="button"
                        className={`urgency-chip ${bookingType === 'sameday' ? 'active' : ''}`}
                        onClick={() => setBookingType('sameday')}
                      >
                        <Clock size={14} /> Same Day (+15%)
                      </button>
                      <button
                        type="button"
                        className={`urgency-chip ${bookingType === 'emergency' ? 'active emergency' : ''}`}
                        onClick={() => setBookingType('emergency')}
                      >
                        <AlertCircle size={14} /> Priority SOS (+50%)
                      </button>
                    </div>
                  </div>
                )}

                <div className="form-row-2">
                  <div className="form-field-group">
                    <label className="field-label">{bookingMode === 'recurring' ? 'Plan Start Date' : 'Date'}</label>
                    <input
                      type="date"
                      className="input-field"
                      value={schedDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setSchedDate(e.target.value)}
                    />
                  </div>
                  <div className="form-field-group">
                    <label className="field-label">Shift Start Time</label>
                    <input
                      type="time"
                      className="input-field"
                      value={schedTime}
                      onChange={(e) => setSchedTime(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-field-group">
                  <label className="field-label">Daily Shift Duration: {durationHours} Hours</label>
                  <input
                    type="range"
                    min="1"
                    max="12"
                    value={durationHours}
                    onChange={(e) => setDurationHours(Number(e.target.value))}
                    className="slider-range"
                  />
                  <div className="slider-hints">
                    <span>1 hr</span>
                    <span>4 hrs (Standard)</span>
                    <span>8 hrs (Full Day)</span>
                    <span>12 hrs</span>
                  </div>
                </div>

                <div className="form-field-group">
                  <label className="field-label">Care Instructions & Medical Requirements</label>
                  <textarea
                    className="input-field modal-textarea"
                    rows="2"
                    placeholder="e.g. Needs medication assistance, specific dietary restrictions, allergies..."
                    value={careNotes}
                    onChange={(e) => setCareNotes(e.target.value)}
                  />
                </div>

                {/* Dynamic Price Breakdown Box */}
                <div className="price-breakdown-box">
                  {bookingMode === 'recurring' ? (
                    <>
                      <div className="price-row">
                        <span>Frequency ({selectedFreq.name})</span>
                        <span>{selectedFreq.daysPerWeek * 4} Shifts / Month</span>
                      </div>
                      <div className="price-row">
                        <span>Base Rate vs Discounted Rate</span>
                        <span>₹{cg.pricing} ➔ <strong style={{ color: '#34D399' }}>₹{effectiveRecurringRate}/hr</strong> (-{recurringDiscount}%)</span>
                      </div>
                      <div className="price-row total-row">
                        <strong>Monthly Recurring Subscription</strong>
                        <strong className="total-amount">₹{recurringMonthlyTotal.toLocaleString('en-IN')}/mo</strong>
                      </div>
                    </>
                  ) : (
                    <>
                      {pricingCalc.breakdown.map((item, idx) => (
                        <div key={idx} className="price-row">
                          <span>{item.label}</span>
                          <span>₹{item.amount.toLocaleString('en-IN')}</span>
                        </div>
                      ))}
                      <div className="price-row">
                        <span>Platform Escrow Security</span>
                        <span className="free-badge">INCLUDED (10% SPLIT)</span>
                      </div>
                      <div className="price-row total-row">
                        <strong>Total Escrow Hold</strong>
                        <strong className="total-amount">₹{pricingCalc.subtotal.toLocaleString('en-IN')}</strong>
                      </div>
                    </>
                  )}
                </div>

                <div className="modal-actions">
                  <button className="btn-secondary" onClick={() => setIsBookingOpen(false)}>Cancel</button>
                  <button className="btn-primary confirm-btn" onClick={handleConfirmBooking}>
                    {bookingMode === 'recurring' ? `Subscribe ₹${recurringMonthlyTotal.toLocaleString('en-IN')}/mo` : `Confirm & Hold Escrow ₹${totalCost}`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .profile-page { padding-top: 80px; padding-bottom: var(--space-16); }
        .back-btn { margin-bottom: var(--space-4); display: inline-flex; align-items: center; gap: 6px; }
        .profile-header {
          display: flex; gap: var(--space-6); padding: var(--space-8);
          align-items: flex-start; margin-bottom: var(--space-6);
        }
        .profile-avatar { width: 80px; height: 80px; border-radius: var(--radius-full); overflow: hidden; flex-shrink: 0; }
        .profile-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .profile-info { flex: 1; }
        .profile-info h1 { margin-bottom: var(--space-2); font-size: var(--fs-3xl); }
        .profile-meta { display: flex; flex-wrap: wrap; gap: var(--space-2); align-items: center; margin-bottom: var(--space-3); }
        .meta-item { display: inline-flex; align-items: center; gap: 4px; font-size: var(--fs-sm); color: var(--text-tertiary); }
        .profile-bio { font-size: var(--fs-sm); color: var(--text-secondary); line-height: 1.6; }
        .profile-score { flex-shrink: 0; }
        .profile-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-6); margin-bottom: var(--space-8); }
        .profile-section { padding: var(--space-6); }
        .profile-section h3 { font-size: var(--fs-lg); margin-bottom: var(--space-4); }
        .full-width { grid-column: 1 / -1; }
        .ver-list { display: flex; flex-direction: column; gap: var(--space-3); }
        .ver-item {
          display: flex; align-items: center; gap: var(--space-3); font-size: var(--fs-sm);
        }
        .ver-item.passed { color: var(--trust-green); }
        .ver-item.failed { color: var(--text-muted); }
        .ver-item span:first-of-type { flex: 1; color: var(--text-secondary); }
        .ver-status { font-size: var(--fs-xs); }
        .radar-wrap { display: flex; justify-content: center; }
        .stats-list { display: flex; flex-direction: column; gap: var(--space-3); }
        .profile-stat {
          display: flex; justify-content: space-between; font-size: var(--fs-sm);
          padding: var(--space-2) 0; border-bottom: 1px solid var(--border-glass);
        }
        .profile-stat span { color: var(--text-secondary); }
        .profile-stat strong { color: var(--text-primary); }
        .spec-tags { display: flex; flex-wrap: wrap; gap: var(--space-2); }
        .spec-tag {
          padding: var(--space-1) var(--space-3); background: rgba(79,70,229,0.1);
          border: 1px solid rgba(79,70,229,0.2); border-radius: var(--radius-full);
          font-size: var(--fs-xs); color: var(--primary-400); font-weight: 500;
        }
        .reviews-list { display: flex; flex-direction: column; gap: var(--space-4); }
        .review-item { padding: var(--space-4); background: var(--bg-card); border-radius: var(--radius-lg); }
        .review-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-2); }
        .review-head strong { font-size: var(--fs-sm); }
        .review-stars { display: flex; gap: 2px; }
        .review-item p { font-size: var(--fs-sm); color: var(--text-secondary); }
        .profile-actions { text-align: center; }
        .profile-actions .btn-primary { padding: var(--space-4) var(--space-10); font-size: var(--fs-lg); }
        .work-history-list { display: flex; flex-direction: column; gap: var(--space-3); }
        .work-item { display: flex; justify-content: space-between; align-items: center; padding: var(--space-3); background: var(--bg-card); border-radius: var(--radius-lg); }
        .work-item.active { border: 1px solid rgba(245,158,11,0.3); background: rgba(245,158,11,0.05); }
        .work-item-info { display: flex; flex-direction: column; gap: 2px; }
        .work-item-info strong { display: flex; align-items: center; gap: var(--space-1); font-size: var(--fs-sm); }
        .work-item-info span { font-size: var(--fs-xs); color: var(--text-tertiary); }
        
        /* Modal Styles */
        .booking-modal-backdrop {
          position: fixed; inset: 0; background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(8px); display: flex; align-items: center;
          justify-content: center; z-index: 1000; padding: var(--space-4);
        }
        .booking-modal-card {
          width: 100%; max-width: 520px; padding: var(--space-6);
          border-radius: var(--radius-2xl); background: var(--bg-card);
          border: 1px solid var(--border-glass); box-shadow: 0 20px 40px rgba(0,0,0,0.5);
          animation: slideUpModal 0.25s ease-out;
        }
        @keyframes slideUpModal {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .modal-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-4); }
        .modal-title-wrap { display: flex; align-items: center; gap: var(--space-2); }
        .modal-icon-sparkle { color: var(--primary-400); }
        .close-btn { background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 4px; border-radius: 6px; }
        .close-btn:hover { color: var(--text-primary); }
        .caregiver-summary-pill {
          display: flex; align-items: center; gap: var(--space-3); padding: var(--space-3);
          background: rgba(255,255,255,0.03); border-radius: var(--radius-lg);
          border: 1px solid var(--border-glass); margin-bottom: var(--space-4);
        }
        .pill-avatar { width: 44px; height: 44px; border-radius: 50%; object-fit: cover; }
        .caregiver-summary-pill div { display: flex; flex-direction: column; gap: 2px; }
        .caregiver-summary-pill strong { font-size: var(--fs-sm); color: var(--text-primary); }
        .caregiver-summary-pill span { font-size: var(--fs-xs); color: var(--text-tertiary); }
        .form-field-group { margin-bottom: var(--space-4); }
        .field-label { display: block; font-size: var(--fs-xs); font-weight: 600; color: var(--text-secondary); margin-bottom: var(--space-2); text-transform: uppercase; letter-spacing: 0.5px; }
        .urgency-selector { display: flex; gap: var(--space-2); }
        .urgency-chip {
          flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px;
          padding: var(--space-2) var(--space-3); border-radius: var(--radius-md);
          background: var(--bg-surface); border: 1px solid var(--border-glass);
          color: var(--text-secondary); font-size: var(--fs-xs); font-weight: 500; cursor: pointer;
          transition: all var(--transition-fast);
        }
        .urgency-chip.active {
          background: rgba(79, 70, 229, 0.15); border-color: var(--primary-400); color: var(--primary-300);
        }
        .urgency-chip.emergency.active {
          background: rgba(239, 68, 68, 0.15); border-color: #EF4444; color: #FCA5A5;
        }
        .form-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); }
        .slider-range { width: 100%; accent-color: var(--primary-500); cursor: pointer; }
        .slider-hints { display: flex; justify-content: space-between; font-size: var(--fs-xs); color: var(--text-muted); margin-top: 4px; }
        .modal-textarea { resize: vertical; width: 100%; }
        .price-breakdown-box {
          background: rgba(79, 70, 229, 0.06); border: 1px dashed rgba(79, 70, 229, 0.3);
          border-radius: var(--radius-lg); padding: var(--space-3) var(--space-4); margin-bottom: var(--space-5);
        }
        .price-row { display: flex; justify-content: space-between; font-size: var(--fs-xs); color: var(--text-secondary); margin-bottom: 4px; }
        .free-badge { color: #10B981; font-weight: 600; }
        .total-row { border-top: 1px solid rgba(255,255,255,0.08); padding-top: 6px; margin-top: 6px; margin-bottom: 0; color: var(--text-primary); font-size: var(--fs-sm); }
        .total-amount { color: #60A5FA; font-size: var(--fs-base); }
        .modal-actions { display: flex; gap: var(--space-3); }
        .modal-actions button { flex: 1; padding: var(--space-3); }
        .booking-success-view { display: flex; flex-direction: column; align-items: center; text-align: center; gap: var(--space-3); padding: var(--space-6) 0; }
        
        @media (max-width: 768px) {
          .profile-header { flex-direction: column; align-items: center; text-align: center; }
          .profile-grid { grid-template-columns: 1fr; }
          .form-row-2 { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}

