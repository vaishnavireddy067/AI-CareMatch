import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck, ShieldAlert, BadgeCheck, DollarSign, Activity, Users,
  CheckCircle, XCircle, Clock, AlertTriangle, FileText, ArrowRight,
  TrendingUp, RefreshCw, Eye, Lock, MapPin, IndianRupee, Sparkles, Filter,
  Scale, Calendar, AlertOctagon, UserCheck
} from 'lucide-react';
import { getEscrowLedger, releaseEscrowPayment, refundEscrowPayment, getPlatformFinancialStats } from '../services/paymentService';
import { getIncidents, updateIncidentStatus } from '../services/incidentService';
import { getDisputes, resolveDispute } from '../services/disputeService';
import { getComplianceRecords } from '../services/complianceService';
import { caregivers } from '../data/caregivers';

export default function AdminPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('verification'); // 'verification' | 'escrow' | 'disputes' | 'compliance' | 'incidents' | 'analytics'

  // Verification Queue State
  const [pendingVerifications, setPendingVerifications] = useState([
    {
      id: 'VER-401',
      caregiverId: 10,
      name: 'Ravi Teja',
      category: 'pet',
      location: 'Hitech City',
      docsSubmitted: ['Aadhaar Card OCR', 'Telangana Police Clearance', 'Feline Nutrition Cert'],
      aiRiskScore: 92, // 92% confidence
      status: 'pending_admin',
      submittedAt: 'Today, 11:30 AM',
    },
    {
      id: 'VER-402',
      caregiverId: 11,
      name: 'Divya Prakash',
      category: 'pet',
      location: 'Manikonda',
      docsSubmitted: ['PAN Card OCR', 'Live Face Match Selfie (98%)', 'Canine Behavior Cert'],
      aiRiskScore: 88,
      status: 'pending_admin',
      submittedAt: 'Yesterday, 04:15 PM',
    },
  ]);

  const [escrowLedger, setEscrowLedger] = useState(() => getEscrowLedger());
  const [incidents, setIncidents] = useState(() => getIncidents());
  const [disputes, setDisputes] = useState(() => getDisputes());
  const [complianceRecords, setComplianceRecords] = useState(() => getComplianceRecords());
  const [financialStats, setFinancialStats] = useState(() => getPlatformFinancialStats());

  const handleApproveCaregiver = (id) => {
    setPendingVerifications(prev => prev.map(v => v.id === id ? { ...v, status: 'approved' } : v));
  };

  const handleRejectCaregiver = (id) => {
    setPendingVerifications(prev => prev.map(v => v.id === id ? { ...v, status: 'rejected' } : v));
  };

  const handleReleaseEscrow = (bookingId) => {
    const updated = releaseEscrowPayment(bookingId);
    setEscrowLedger(updated);
    setFinancialStats(getPlatformFinancialStats());
  };

  const handleRefundEscrow = (bookingId) => {
    const updated = refundEscrowPayment(bookingId, 'Admin manual override refund');
    setEscrowLedger(updated);
    setFinancialStats(getPlatformFinancialStats());
  };

  const handleResolveIncident = (incidentId) => {
    const updated = updateIncidentStatus(incidentId, 'resolved', 'Admin resolved & confirmed safety clearance with family.');
    setIncidents(updated);
  };

  const handleAdjudicateDispute = (disputeId, decision, notes) => {
    const updated = resolveDispute(disputeId, decision, notes);
    setDisputes(updated);
  };

  return (
    <div className="admin-page">
      <div className="container">
        {/* Admin Header */}
        <div className="admin-header glass-card">
          <div className="admin-title-row">
            <div className="admin-badge-icon">
              <ShieldCheck size={32} color="#10B981" />
            </div>
            <div>
              <h1>AI CareMatch <span className="gradient-text">Operations & Trust Console</span></h1>
              <p className="admin-sub">
                Enterprise Trust Control, Human-in-the-loop Document Auditing, Escrow Financial Ledger & SOS Command
              </p>
            </div>
          </div>

          <div className="admin-quick-stats">
            <div className="quick-stat">
              <span>Escrow Held</span>
              <strong>₹{financialStats.heldInEscrow.toLocaleString('en-IN')}</strong>
            </div>
            <div className="quick-stat">
              <span>Platform Revenue</span>
              <strong>₹{financialStats.totalPlatformFees.toLocaleString('en-IN')}</strong>
            </div>
            <div className="quick-stat">
              <span>Pending Verifications</span>
              <strong style={{ color: '#F59E0B' }}>{pendingVerifications.filter(v => v.status === 'pending_admin').length}</strong>
            </div>
            <div className="quick-stat">
              <span>Active Incidents</span>
              <strong style={{ color: incidents.some(i => i.status === 'investigating') ? '#EF4444' : '#10B981' }}>
                {incidents.filter(i => i.status === 'investigating' || i.status === 'open').length}
              </strong>
            </div>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="admin-tabs-bar glass-card">
          <button
            className={`admin-tab-btn ${activeTab === 'verification' ? 'active' : ''}`}
            onClick={() => setActiveTab('verification')}
          >
            <BadgeCheck size={16} /> Verification Queue ({pendingVerifications.filter(v => v.status === 'pending_admin').length})
          </button>
          <button
            className={`admin-tab-btn ${activeTab === 'escrow' ? 'active' : ''}`}
            onClick={() => setActiveTab('escrow')}
          >
            <DollarSign size={16} /> Escrow & Ledger
          </button>
          <button
            className={`admin-tab-btn ${activeTab === 'disputes' ? 'active' : ''}`}
            onClick={() => setActiveTab('disputes')}
          >
            <Scale size={16} /> Dispute Evidence Locker ({disputes.filter(d => d.status === 'under_review').length})
          </button>
          <button
            className={`admin-tab-btn ${activeTab === 'compliance' ? 'active' : ''}`}
            onClick={() => setActiveTab('compliance')}
          >
            <AlertOctagon size={16} /> Certification Expiry & Audit ({complianceRecords.filter(c => c.status === 'warning' || c.status === 'urgent').length})
          </button>
          <button
            className={`admin-tab-btn ${activeTab === 'incidents' ? 'active' : ''}`}
            onClick={() => setActiveTab('incidents')}
          >
            <ShieldAlert size={16} /> Incident & SOS
          </button>
          <button
            className={`admin-tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            <TrendingUp size={16} /> Supply Analytics
          </button>
        </div>

        {/* ── TAB 1: Human-in-the-Loop Verification Queue ── */}
        {activeTab === 'verification' && (
          <div className="admin-tab-content animate-fade-in">
            <div className="content-head">
              <h2>🪪 Human-in-the-Loop (HITL) Accreditation Queue</h2>
              <p>Review AI-scanned documents, face-match hashes, and police clearance before granting the verified accreditation badge.</p>
            </div>

            <div className="verifications-list">
              {pendingVerifications.map((item) => (
                <div key={item.id} className={`verification-card glass-card ${item.status}`}>
                  <div className="ver-card-top">
                    <div className="ver-user-info">
                      <div className="ver-avatar">
                        <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&size=80&background=4f46e5&color=fff&bold=true&format=svg`} alt={item.name} />
                      </div>
                      <div>
                        <h3>{item.name} <span className="cat-pill">{item.category === 'child' ? '👶 Child Care' : item.category === 'human' ? '🧑 Elder Care' : '🐾 Pet Care'}</span></h3>
                        <span className="ver-meta"><MapPin size={13} /> {item.location}, Hyderabad • Submitted: {item.submittedAt}</span>
                      </div>
                    </div>
                    <div className="ai-score-pill">
                      <Sparkles size={14} color="#10B981" />
                      <span>AI Pre-check: <strong>{item.aiRiskScore}% Confident</strong></span>
                    </div>
                  </div>

                  <div className="ver-docs-grid">
                    {item.docsSubmitted.map((doc, idx) => (
                      <div key={idx} className="doc-chip">
                        <FileText size={13} color="#818CF8" />
                        <span>{doc}</span>
                        <BadgeCheck size={14} color="#10B981" />
                      </div>
                    ))}
                  </div>

                  <div className="ver-actions">
                    {item.status === 'pending_admin' ? (
                      <>
                        <button className="btn-primary btn-sm" onClick={() => handleApproveCaregiver(item.id)}>
                          <CheckCircle size={14} /> Approve & Grant Verified Badge
                        </button>
                        <button className="btn-secondary btn-sm" style={{ color: '#F87171' }} onClick={() => handleRejectCaregiver(item.id)}>
                          <XCircle size={14} /> Reject / Request Additional Proof
                        </button>
                      </>
                    ) : item.status === 'approved' ? (
                      <span className="badge badge-trust"><CheckCircle size={14} /> Approved & Active in Search</span>
                    ) : (
                      <span className="badge badge-risk"><XCircle size={14} /> Rejected by Admin</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB 2: Escrow & Financial Ledger ── */}
        {activeTab === 'escrow' && (
          <div className="admin-tab-content animate-fade-in">
            <div className="content-head">
              <h2>💳 Marketplace Escrow & Financial Ledger</h2>
              <p>Real-time ledger of funds held in platform trust, automatic 4-hour releases, and refund transaction logs.</p>
            </div>

            <div className="ledger-table-wrap glass-card">
              <table className="ledger-table">
                <thead>
                  <tr>
                    <th>TXN ID</th>
                    <th>Booking</th>
                    <th>Family / Patient</th>
                    <th>Caregiver</th>
                    <th>Gross</th>
                    <th>Platform Fee (10%)</th>
                    <th>Payout (90%)</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {escrowLedger.map((txn) => (
                    <tr key={txn.id}>
                      <td><code>{txn.id}</code></td>
                      <td><strong>{txn.bookingId}</strong></td>
                      <td>{txn.patientName}</td>
                      <td>{txn.caregiverName}</td>
                      <td><strong>₹{txn.grossAmount}</strong></td>
                      <td style={{ color: '#10B981' }}>₹{txn.platformFee}</td>
                      <td style={{ color: '#60A5FA' }}>₹{txn.netCaregiverPayout}</td>
                      <td>
                        <span className={`badge ${txn.status === 'released' ? 'badge-trust' : txn.status === 'held_in_escrow' ? 'badge-warning' : 'badge-risk'}`}>
                          {txn.status === 'held_in_escrow' ? '🔒 Held in Escrow' : txn.status === 'released' ? '✅ Released' : '↩️ Refunded'}
                        </span>
                      </td>
                      <td>
                        {txn.status === 'held_in_escrow' && (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn-primary btn-xs" onClick={() => handleReleaseEscrow(txn.bookingId)}>Release</button>
                            <button className="btn-ghost btn-xs" style={{ color: '#F87171' }} onClick={() => handleRefundEscrow(txn.bookingId)}>Refund</button>
                          </div>
                        )}
                        {txn.status !== 'held_in_escrow' && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Settled</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB 3: Dispute Resolution & Evidence Locker ── */}
        {activeTab === 'disputes' && (
          <div className="admin-tab-content animate-fade-in">
            <div className="content-head">
              <h2>⚖️ Marketplace Dispute Resolution & Forensic Evidence Locker</h2>
              <p>Adjudicate contested care shifts by reviewing GPS geofence timestamps, digital care journals, and escrow holdings.</p>
            </div>

            <div className="disputes-list" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {disputes.map((dsp) => {
                const isResolved = dsp.status !== 'under_review';
                return (
                  <div key={dsp.id} className="glass-card" style={{ padding: 'var(--space-5)', borderRadius: 'var(--radius-xl)', border: isResolved ? '1px solid var(--border-glass)' : '1px solid rgba(239, 68, 68, 0.35)', background: isResolved ? 'rgba(255,255,255,0.02)' : 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(15, 23, 42, 0.4) 100%)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', background: 'rgba(239,68,68,0.2)', color: '#F87171' }}>
                            CASE #{dsp.id}
                          </span>
                          <h3 style={{ margin: 0, fontSize: '15px' }}>Dispute: {dsp.reason}</h3>
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          Booking: <strong>{dsp.bookingId}</strong> • Disputed Escrow: <strong style={{ color: '#FBBF24' }}>₹{dsp.disputedAmount}</strong> • Raised by: <strong>{dsp.raisedByName}</strong>
                        </span>
                      </div>
                      <span className={`badge ${isResolved ? 'badge-trust' : 'badge-risk'}`}>
                        {isResolved ? `✅ Resolved (${dsp.status})` : '⚠️ Under Review'}
                      </span>
                    </div>

                    {/* Forensic Evidence Locker Grid */}
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-glass)', fontSize: '12px', margin: '8px 0', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
                      <div>
                        <span style={{ color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase', display: 'block' }}>GPS Check-In:</span>
                        <strong style={{ color: '#34D399' }}>{dsp.evidence.gpsCheckInTime}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase', display: 'block' }}>GPS Departure Check-Out:</span>
                        <strong style={{ color: '#F87171' }}>{dsp.evidence.gpsCheckOutTime}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase', display: 'block' }}>Scheduled End Time:</span>
                        <span>{dsp.evidence.scheduledEndTime}</span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase', display: 'block' }}>Forensic Finding:</span>
                        <span style={{ color: '#E2E8F0' }}>{dsp.evidence.disputeNotes}</span>
                      </div>
                    </div>

                    {isResolved ? (
                      <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '8px 12px', borderRadius: '6px', fontSize: '12px', color: '#34D399' }}>
                        <strong>Adjudication Result:</strong> {dsp.adminResolution?.notes}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginTop: '4px' }}>
                        <button
                          type="button"
                          className="btn-primary btn-sm"
                          style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', border: 'none' }}
                          onClick={() => handleAdjudicateDispute(dsp.id, 'resolved_split', 'Partial Refund (50% Client / 50% Caregiver Payout for delivered hours)')}
                        >
                          <Scale size={13} /> Grant Partial Settlement (50% Split)
                        </button>
                        <button
                          type="button"
                          className="btn-secondary btn-sm"
                          style={{ color: '#60A5FA' }}
                          onClick={() => handleAdjudicateDispute(dsp.id, 'resolved_refund', 'Full Refund of ₹1,800 returned to Family Escrow')}
                        >
                          Full Client Refund
                        </button>
                        <button
                          type="button"
                          className="btn-ghost btn-sm"
                          onClick={() => handleAdjudicateDispute(dsp.id, 'resolved_payout', 'Dispute Dismissed. Caregiver payout released')}
                        >
                          Dismiss & Release Payout
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── TAB 4: Certification Expiry & Compliance Monitoring ── */}
        {activeTab === 'compliance' && (
          <div className="admin-tab-content animate-fade-in">
            <div className="content-head">
              <h2>🔏 Caregiver Certification Expiry & Legal Compliance Manager</h2>
              <p>Automated tracking of CPR, Police Verifications, and Nursing Licenses with progressive countdown enforcement (30d alert, 15d warning, 7d booking lockout).</p>
            </div>

            <div className="compliance-table-wrap glass-card" style={{ padding: 'var(--space-4)', borderRadius: 'var(--radius-xl)' }}>
              <table className="ledger-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr>
                    <th>Caregiver</th>
                    <th>Credential / License</th>
                    <th>Cert ID</th>
                    <th>Verification Board</th>
                    <th>Expiry Date</th>
                    <th>Time Remaining</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {complianceRecords.map((c, idx) => {
                    const isUrgent = c.status === 'urgent';
                    const isWarning = c.status === 'warning';
                    return (
                      <tr key={idx}>
                        <td><strong>{c.caregiverName}</strong></td>
                        <td>{c.certName}</td>
                        <td><code>{c.certId}</code></td>
                        <td>{c.verificationAuthority}</td>
                        <td>{c.expiryDate}</td>
                        <td>
                          <strong style={{ color: isUrgent ? '#EF4444' : isWarning ? '#F59E0B' : '#10B981' }}>
                            {c.daysRemaining} days remaining
                          </strong>
                        </td>
                        <td>
                          <span className={`badge ${isUrgent ? 'badge-risk' : isWarning ? 'badge-warning' : 'badge-trust'}`}>
                            {isUrgent ? '🔴 Urgent Lock' : isWarning ? '🟡 15-Day Alert' : '🟢 Verified Valid'}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn-secondary btn-xs"
                            onClick={() => alert(`Renewal reminder dispatched to ${c.caregiverName} via WhatsApp & Email.`)}
                          >
                            Send Notice
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB 3: Incident Management & SOS ── */}
        {activeTab === 'incidents' && (
          <div className="admin-tab-content animate-fade-in">
            <div className="content-head">
              <h2>🚨 Incident Management & Emergency Dispatch</h2>
              <p>Track emergency alerts, complaints, assigned investigations, and official resolution logs.</p>
            </div>

            <div className="incidents-list">
              {incidents.map((inc) => (
                <div key={inc.id} className={`incident-card glass-card ${inc.severity}`}>
                  <div className="inc-top">
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className={`severity-tag ${inc.severity}`}>{inc.severity.toUpperCase()}</span>
                        <h3>{inc.type} — #{inc.id}</h3>
                      </div>
                      <span className="inc-meta">Reported by <strong>{inc.reporterName}</strong> ({inc.reporterRole}) • Location: {inc.location}</span>
                    </div>
                    <span className={`badge ${inc.status === 'resolved' ? 'badge-trust' : 'badge-warning'}`}>
                      {inc.status === 'resolved' ? '✅ Resolved' : '🔍 Investigating'}
                    </span>
                  </div>

                  <p className="inc-desc">{inc.description}</p>

                  <div className="audit-trail-box">
                    <strong>Audit Trail & Logs:</strong>
                    <ul>
                      {inc.auditTrail.map((log, idx) => (
                        <li key={idx}>
                          <code>{log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : 'Recent'}</code> — {log.action}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="inc-actions">
                    {inc.status !== 'resolved' && (
                      <button className="btn-primary btn-sm" onClick={() => handleResolveIncident(inc.id)}>
                        <CheckCircle size={14} /> Mark Incident as Resolved & Notify Family
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB 4: Platform Supply Analytics ── */}
        {activeTab === 'analytics' && (
          <div className="admin-tab-content animate-fade-in">
            <div className="content-head">
              <h2>📊 Hyderabad Marketplace Analytics</h2>
              <p>Domain distribution, average caregiver trust benchmarks, and regional coverage.</p>
            </div>

            <div className="analytics-grid-3">
              <div className="stat-box glass-card">
                <span className="stat-label">Total Verified Caregivers</span>
                <h2>12 Active Pros</h2>
                <span className="stat-sub">👶 4 Child • 🧑 4 Elder • 🐾 4 Pet</span>
              </div>
              <div className="stat-box glass-card">
                <span className="stat-label">Average Platform Trust Score</span>
                <h2 style={{ color: '#10B981' }}>89.4 / 100</h2>
                <span className="stat-sub">Top tier in Telangana healthcare</span>
              </div>
              <div className="stat-box glass-card">
                <span className="stat-label">On-Time Session Rate</span>
                <h2 style={{ color: '#60A5FA' }}>98.6%</h2>
                <span className="stat-sub">Zero unaddressed safety complaints</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .admin-page { padding-top: 88px; padding-bottom: var(--space-16); min-height: 100vh; }
        .admin-header {
          padding: var(--space-6); border-radius: var(--radius-2xl);
          margin-bottom: var(--space-6); background: radial-gradient(circle at top left, rgba(16,185,129,0.08), rgba(15,13,26,0.95));
          border: 1px solid rgba(16,185,129,0.25);
        }
        .admin-title-row { display: flex; align-items: center; gap: var(--space-4); margin-bottom: var(--space-6); }
        .admin-badge-icon { width: 56px; height: 56px; border-radius: var(--radius-xl); background: rgba(16,185,129,0.12); display: flex; align-items: center; justify-content: center; border: 1px solid rgba(16,185,129,0.3); }
        .admin-sub { font-size: var(--fs-sm); color: var(--text-secondary); margin-top: 2px; }
        .admin-quick-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-4); }
        .quick-stat { padding: var(--space-3) var(--space-4); background: rgba(0,0,0,0.3); border-radius: var(--radius-lg); border: 1px solid var(--border-glass); display: flex; flex-direction: column; gap: 2px; }
        .quick-stat span { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
        .quick-stat strong { font-size: var(--fs-xl); color: var(--text-primary); }
        .admin-tabs-bar { display: flex; gap: var(--space-2); padding: 6px; border-radius: var(--radius-xl); margin-bottom: var(--space-6); background: rgba(15,13,26,0.7); flex-wrap: wrap; }
        .admin-tab-btn {
          display: flex; align-items: center; gap: 8px; padding: 10px 18px; border-radius: var(--radius-lg);
          background: transparent; border: none; color: var(--text-secondary); font-size: var(--fs-sm);
          font-weight: 600; cursor: pointer; transition: all 0.2s;
        }
        .admin-tab-btn:hover { color: var(--text-primary); }
        .admin-tab-btn.active { background: rgba(16,185,129,0.15); color: #34D399; border: 1px solid rgba(16,185,129,0.3); }
        .content-head { margin-bottom: var(--space-5); }
        .content-head h2 { font-size: var(--fs-2xl); margin-bottom: 4px; }
        .content-head p { font-size: var(--fs-sm); color: var(--text-secondary); }
        .verifications-list, .incidents-list { display: flex; flex-direction: column; gap: var(--space-4); }
        .verification-card, .incident-card { padding: var(--space-5); border-radius: var(--radius-xl); display: flex; flex-direction: column; gap: var(--space-3); }
        .ver-card-top, .inc-top { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: var(--space-3); }
        .ver-user-info { display: flex; align-items: center; gap: var(--space-3); }
        .ver-avatar { width: 48px; height: 48px; border-radius: 50%; overflow: hidden; }
        .ver-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .cat-pill { font-size: 11px; padding: 2px 8px; border-radius: var(--radius-full); background: rgba(79,70,229,0.15); color: #A78BFA; }
        .ver-meta, .inc-meta { font-size: var(--fs-xs); color: var(--text-tertiary); display: flex; align-items: center; gap: 4px; margin-top: 2px; }
        .ai-score-pill { display: flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: var(--radius-full); background: rgba(16,185,129,0.12); color: #34D399; font-size: var(--fs-xs); border: 1px solid rgba(16,185,129,0.25); }
        .ver-docs-grid { display: flex; flex-wrap: wrap; gap: var(--space-2); }
        .doc-chip { display: flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: var(--radius-md); background: rgba(0,0,0,0.3); border: 1px solid var(--border-glass); font-size: var(--fs-xs); }
        .ver-actions, .inc-actions { display: flex; gap: var(--space-3); margin-top: var(--space-2); }
        .ledger-table-wrap { overflow-x: auto; padding: var(--space-4); border-radius: var(--radius-xl); }
        .ledger-table { width: 100%; border-collapse: collapse; font-size: var(--fs-sm); }
        .ledger-table th { text-align: left; padding: var(--space-3); color: var(--text-muted); font-size: 11px; text-transform: uppercase; border-bottom: 1px solid var(--border-glass); }
        .ledger-table td { padding: var(--space-3); border-bottom: 1px solid rgba(255,255,255,0.04); color: var(--text-secondary); }
        .btn-xs { padding: 4px 8px; font-size: 11px; }
        .severity-tag { padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; }
        .severity-tag.critical { background: rgba(239,68,68,0.2); color: #F87171; border: 1px solid rgba(239,68,68,0.3); }
        .severity-tag.medium { background: rgba(245,158,11,0.2); color: #FBBF24; border: 1px solid rgba(245,158,11,0.3); }
        .audit-trail-box { background: rgba(0,0,0,0.3); padding: var(--space-3); border-radius: var(--radius-md); font-size: var(--fs-xs); }
        .audit-trail-box ul { list-style: none; margin-top: 4px; display: flex; flex-direction: column; gap: 3px; }
        .audit-trail-box code { color: #818CF8; }
        .analytics-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-4); }
        .stat-box { padding: var(--space-6); border-radius: var(--radius-xl); text-align: center; display: flex; flex-direction: column; gap: 6px; }
        .stat-label { font-size: var(--fs-xs); color: var(--text-muted); text-transform: uppercase; font-weight: 600; }
        @media (max-width: 768px) {
          .admin-quick-stats, .analytics-grid-3 { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
