// Escrow Payment Engine & Financial Ledger for AI CareMatch Marketplace
// Manages: Pending -> Escrow Held -> Released to Caregiver / Refunded to Family

const ESCROW_LEDGER_KEY = 'cm_escrow_ledger';
const PLATFORM_FEE_PERCENTAGE = 0.10; // 10% platform trust & safety fee

const INITIAL_ESCROW_TRANSACTIONS = [
  {
    id: 'TXN-901',
    bookingId: 'BK-101',
    patientName: 'Vaishnavi Reddy',
    patientId: 'PT-20001',
    caregiverName: 'Priya Sharma',
    caregiverId: 1,
    grossAmount: 1800,
    platformFee: 180,
    netCaregiverPayout: 1620,
    status: 'held_in_escrow', // 'pending' | 'held_in_escrow' | 'released' | 'refunded'
    paymentMethod: 'UPI (GPay)',
    createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    escrowReleaseAt: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
    note: 'Held in platform trust until 4-hr shift verification completion.',
  },
  {
    id: 'TXN-902',
    bookingId: 'BK-102',
    patientName: 'Rajesh Kumar',
    patientId: 'PT-20003',
    caregiverName: 'Suresh Babu',
    caregiverId: 5,
    grossAmount: 2400,
    platformFee: 240,
    netCaregiverPayout: 2160,
    status: 'released',
    paymentMethod: 'Credit Card (•••• 8821)',
    createdAt: new Date(Date.now() - 28 * 3600 * 1000).toISOString(),
    escrowReleaseAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    note: 'Released upon shift completion and 5-star review submission.',
  },
  {
    id: 'TXN-903',
    bookingId: 'BK-103',
    patientName: 'Meera Sharma',
    patientId: 'PT-20005',
    caregiverName: 'Kavitha Reddy',
    caregiverId: 9,
    grossAmount: 1400,
    platformFee: 140,
    netCaregiverPayout: 1260,
    status: 'released',
    paymentMethod: 'UPI (PhonePe)',
    createdAt: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
    escrowReleaseAt: new Date(Date.now() - 68 * 3600 * 1000).toISOString(),
    note: 'Released upon shift completion.',
  },
];

export function getEscrowLedger() {
  try {
    const stored = JSON.parse(localStorage.getItem(ESCROW_LEDGER_KEY));
    if (stored && stored.length > 0) return stored;
    localStorage.setItem(ESCROW_LEDGER_KEY, JSON.stringify(INITIAL_ESCROW_TRANSACTIONS));
    return INITIAL_ESCROW_TRANSACTIONS;
  } catch {
    return INITIAL_ESCROW_TRANSACTIONS;
  }
}

export function saveEscrowLedger(ledger) {
  try {
    localStorage.setItem(ESCROW_LEDGER_KEY, JSON.stringify(ledger));
  } catch (e) {
    console.warn('Failed to save escrow ledger:', e);
  }
}

// Create Escrow Transaction upon Booking
export function createEscrowHold({ bookingId, patientName, patientId, caregiverName, caregiverId, grossAmount, paymentMethod = 'UPI' }) {
  const ledger = getEscrowLedger();
  const platformFee = Math.round(grossAmount * PLATFORM_FEE_PERCENTAGE);
  const netCaregiverPayout = grossAmount - platformFee;

  const txn = {
    id: `TXN-${Math.floor(100 + Math.random() * 900)}`,
    bookingId,
    patientName,
    patientId,
    caregiverName,
    caregiverId,
    grossAmount,
    platformFee,
    netCaregiverPayout,
    status: 'held_in_escrow',
    paymentMethod,
    createdAt: new Date().toISOString(),
    escrowReleaseAt: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
    note: 'Held safely in platform escrow. Released upon verified check-out.',
  };

  const updated = [txn, ...ledger];
  saveEscrowLedger(updated);
  return txn;
}

// Release Escrow to Caregiver upon Shift Completion
export function releaseEscrowPayment(bookingId) {
  const ledger = getEscrowLedger();
  const updated = ledger.map((txn) => {
    if (txn.bookingId === bookingId && txn.status === 'held_in_escrow') {
      return {
        ...txn,
        status: 'released',
        releasedAt: new Date().toISOString(),
        note: 'Escrow released automatically to caregiver account balance.',
      };
    }
    return txn;
  });
  saveEscrowLedger(updated);
  return updated;
}

// Refund Escrow to Family on Cancellation or Dispute
export function refundEscrowPayment(bookingId, reason = 'Family cancelled booking prior to dispatch') {
  const ledger = getEscrowLedger();
  const updated = ledger.map((txn) => {
    if (txn.bookingId === bookingId && txn.status === 'held_in_escrow') {
      return {
        ...txn,
        status: 'refunded',
        refundedAt: new Date().toISOString(),
        note: `100% Refund credited: ${reason}`,
      };
    }
    return txn;
  });
  saveEscrowLedger(updated);
  return updated;
}

// Platform Revenue Analytics
export function getPlatformFinancialStats() {
  const ledger = getEscrowLedger();
  const totalVolume = ledger.reduce((sum, t) => sum + (t.status !== 'refunded' ? t.grossAmount : 0), 0);
  const heldInEscrow = ledger.filter((t) => t.status === 'held_in_escrow').reduce((sum, t) => sum + t.grossAmount, 0);
  const totalPlatformFees = ledger.filter((t) => t.status === 'released').reduce((sum, t) => sum + t.platformFee, 0);
  const totalCaregiverPayouts = ledger.filter((t) => t.status === 'released').reduce((sum, t) => sum + t.netCaregiverPayout, 0);

  return {
    totalVolume,
    heldInEscrow,
    totalPlatformFees,
    totalCaregiverPayouts,
    transactionCount: ledger.length,
  };
}
