// Incident Management & Safety Audit Log Service for AI CareMatch

const INCIDENTS_KEY = 'cm_safety_incidents';

export const INITIAL_INCIDENTS = [
  {
    id: 'INC-701',
    severity: 'critical', // 'low' | 'medium' | 'high' | 'critical'
    type: 'SOS Emergency Alert',
    reporterName: 'Vaishnavi Reddy',
    reporterRole: 'patient',
    targetCaregiver: 'Priya Sharma (CG-10001)',
    location: 'Banjara Hills, Road No. 12',
    description: 'Patient pressed Emergency SOS button during late evening shift. Dispatched Rapid Alert via Twilio WhatsApp.',
    status: 'investigating', // 'open' | 'investigating' | 'resolved' | 'dismissed'
    assignedAdmin: 'Senior Safety Officer (Ramesh K.)',
    auditTrail: [
      { timestamp: '2026-05-18T18:45:00Z', action: 'SOS Signal Triggered via Navbar Quick Trigger' },
      { timestamp: '2026-05-18T18:45:02Z', action: 'Automated WhatsApp Alert Dispatched to 2 Family Contacts' },
      { timestamp: '2026-05-18T18:48:10Z', action: 'Admin assigned & connected with Caregiver on-site' },
    ],
    createdAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
  },
  {
    id: 'INC-702',
    severity: 'medium',
    type: 'Delay / Late Arrival',
    reporterName: 'Deepak Menon',
    reporterRole: 'patient',
    targetCaregiver: 'Ravi Teja (CG-10010)',
    location: 'Hitech City, Hyderabad',
    description: 'Caregiver arrived 25 minutes late due to heavy traffic. Shift extended by 30 mins to compensate.',
    status: 'resolved',
    assignedAdmin: 'Operations Desk',
    auditTrail: [
      { timestamp: '2026-05-15T09:30:00Z', action: 'Complaint filed by client' },
      { timestamp: '2026-05-15T09:40:00Z', action: 'Traffic log verified via GPS' },
      { timestamp: '2026-05-15T10:00:00Z', action: 'Caregiver granted 30-min extension & fee adjusted' },
    ],
    createdAt: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
  },
];

export function getIncidents() {
  try {
    const stored = JSON.parse(localStorage.getItem(INCIDENTS_KEY));
    if (stored && stored.length > 0) return stored;
    localStorage.setItem(INCIDENTS_KEY, JSON.stringify(INITIAL_INCIDENTS));
    return INITIAL_INCIDENTS;
  } catch {
    return INITIAL_INCIDENTS;
  }
}

export function saveIncidents(incidents) {
  try {
    localStorage.setItem(INCIDENTS_KEY, JSON.stringify(incidents));
  } catch (e) {
    console.warn('Failed to save incidents:', e);
  }
}

export function createIncident({ severity, type, reporterName, reporterRole, targetCaregiver, location, description }) {
  const incidents = getIncidents();
  const newIncident = {
    id: `INC-${Math.floor(700 + Math.random() * 200)}`,
    severity,
    type,
    reporterName,
    reporterRole,
    targetCaregiver,
    location,
    description,
    status: 'open',
    assignedAdmin: 'Duty Safety Lead',
    auditTrail: [
      { timestamp: new Date().toISOString(), action: `Incident logged with ${severity.toUpperCase()} severity.` }
    ],
    createdAt: new Date().toISOString(),
  };

  const updated = [newIncident, ...incidents];
  saveIncidents(updated);
  return newIncident;
}

export function updateIncidentStatus(id, newStatus, resolutionNote = '') {
  const incidents = getIncidents();
  const updated = incidents.map(inc => {
    if (inc.id === id) {
      return {
        ...inc,
        status: newStatus,
        auditTrail: [
          ...inc.auditTrail,
          { timestamp: new Date().toISOString(), action: `Status updated to ${newStatus.toUpperCase()}. Note: ${resolutionNote || 'No notes'}` }
        ]
      };
    }
    return inc;
  });
  saveIncidents(updated);
  return updated;
}
