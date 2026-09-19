/**
 * AI CareMatch — Marketplace Dispute & Evidence Locker Service
 * Manages family/caregiver disputes, aggregates forensic session evidence
 * (GPS logs, check-in timestamps, digital journal, escrow hold), and provides admin adjudication.
 */

const STORAGE_KEY_DISPUTES = 'cm_marketplace_disputes';

export const INITIAL_DISPUTES = [
  {
    id: 'DSP-701',
    bookingId: 'BK-105',
    raisedBy: 'patient',
    raisedByName: 'Ramesh Varma',
    respondentName: 'Anil Kumar (Caregiver)',
    category: 'session_duration',
    reason: 'Caregiver left 35 minutes before scheduled shift conclusion without sign-off.',
    disputedAmount: 1800,
    escrowStatus: 'held_in_escrow',
    status: 'under_review', // 'under_review', 'resolved_refund', 'resolved_payout', 'resolved_split'
    createdAt: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
    evidence: {
      gpsCheckInTime: '03:02 PM (Banjara Hills Geofence OK)',
      gpsCheckOutTime: '06:25 PM (Premature departure logged)',
      scheduledEndTime: '07:00 PM',
      journalSubmitted: true,
      chatLogsCount: 4,
      disputeNotes: 'GPS beacon recorded geofence exit at 6:25 PM. Family provided door sensor logs.'
    },
    adminResolution: null
  }
];

export function getDisputes() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_DISPUTES);
    if (!saved) {
      localStorage.setItem(STORAGE_KEY_DISPUTES, JSON.stringify(INITIAL_DISPUTES));
      return INITIAL_DISPUTES;
    }
    return JSON.parse(saved);
  } catch {
    return INITIAL_DISPUTES;
  }
}

export function resolveDispute(disputeId, resolutionType, resolutionNotes) {
  const current = getDisputes();
  const updated = current.map(dsp => {
    if (dsp.id === disputeId) {
      return {
        ...dsp,
        status: resolutionType,
        adminResolution: {
          resolvedAt: new Date().toISOString(),
          decision: resolutionType,
          notes: resolutionNotes,
          adjudicator: 'Admin Superuser (Trust & Safety Board)'
        }
      };
    }
    return dsp;
  });
  localStorage.setItem(STORAGE_KEY_DISPUTES, JSON.stringify(updated));
  return updated;
}
