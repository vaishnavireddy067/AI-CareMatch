/**
 * AI CareMatch — Certification Expiry & Compliance Tracking Service
 * Tracks CPR, First Aid, Government Police Clearance, and Nursing License expiries.
 * Triggers 30-day alerts, 15-day warnings, and automatic booking lockout upon expiry.
 */

export const MOCK_CERTIFICATIONS_COMPLIANCE = [
  {
    caregiverId: 1,
    caregiverName: 'Priya Sharma',
    certName: 'Pediatric CPR & BLS (American Heart Association)',
    certId: 'CPR-2024-9921',
    issuedDate: '2024-06-15',
    expiryDate: '2026-06-15',
    daysRemaining: 12,
    status: 'warning', // 'valid', 'warning', 'urgent', 'expired'
    verificationAuthority: 'Apollo MedSkills Hyderabad'
  },
  {
    caregiverId: 1,
    caregiverName: 'Priya Sharma',
    certName: 'Telangana State Police Clearance Certificate',
    certId: 'PCC-HYD-88210',
    issuedDate: '2025-01-10',
    expiryDate: '2027-01-10',
    daysRemaining: 235,
    status: 'valid',
    verificationAuthority: 'Telangana Police CID Portal'
  },
  {
    caregiverId: 5,
    caregiverName: 'Suresh Babu',
    certName: 'Geriatric Nursing & Mobility Assistance License',
    certId: 'GNC-TS-44102',
    issuedDate: '2023-11-20',
    expiryDate: '2026-05-25',
    daysRemaining: 6,
    status: 'urgent',
    verificationAuthority: 'Indian Nursing Council'
  },
  {
    caregiverId: 9,
    caregiverName: 'Kavitha Reddy',
    certName: 'Canine Behavioral First Responder & First Aid',
    certId: 'K9-AID-3011',
    issuedDate: '2025-08-01',
    expiryDate: '2027-08-01',
    daysRemaining: 438,
    status: 'valid',
    verificationAuthority: 'Pet Care Council India'
  }
];

export function getComplianceRecords() {
  return MOCK_CERTIFICATIONS_COMPLIANCE;
}
