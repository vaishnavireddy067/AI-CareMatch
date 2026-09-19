/**
 * AI CareMatch — Recurring Care & Subscription Engine
 * Supports Daily, Weekdays (Mon-Fri), Weekly, and Monthly care schedules
 * with automatic shift generation, discount rules, pause/resume, and renewal lifecycle.
 */

const STORAGE_KEY_SUBSCRIPTIONS = 'cm_active_subscriptions';

export const RECURRENCE_FREQUENCIES = {
  DAILY: {
    id: 'daily',
    name: 'Daily Care (All 7 Days)',
    daysPerWeek: 7,
    discountPercent: 15,
    description: 'Continuous daily care with guaranteed dedicated caregiver lock'
  },
  WEEKDAYS: {
    id: 'weekdays',
    name: 'Mon – Fri Weekday Routine',
    daysPerWeek: 5,
    discountPercent: 12,
    description: 'Perfect for working parents & weekday office schedules'
  },
  WEEKLY_SELECT: {
    id: 'weekly',
    name: 'Weekly Fixed Shifts (3 Days/wk)',
    daysPerWeek: 3,
    discountPercent: 8,
    description: 'Scheduled multi-day weekly support (e.g. Mon, Wed, Fri)'
  },
  WEEKEND: {
    id: 'weekend',
    name: 'Weekend Respite Care (Sat & Sun)',
    daysPerWeek: 2,
    discountPercent: 5,
    description: 'Dedicated weekend assistance and companionship'
  }
};

const INITIAL_SUBSCRIPTIONS = [
  {
    id: 'SUB-401',
    patientName: 'Vaishnavi Reddy',
    patientId: 'CF-20001',
    careRecipient: 'Diya Reddy (7yo, Child Care)',
    caregiverId: 1,
    caregiverName: 'Priya Sharma',
    domain: 'child',
    frequency: 'weekdays',
    frequencyName: 'Mon – Fri Weekday Routine (4 PM – 8 PM)',
    timeSlot: '04:00 PM — 08:00 PM',
    hoursPerShift: 4,
    hourlyRate: 450,
    discountPercent: 12,
    effectiveHourlyRate: 396,
    shiftsPerMonth: 20,
    monthlyTotal: 31680,
    status: 'active', // 'active', 'paused', 'cancelled'
    autoRenew: true,
    startDate: '2026-05-01',
    nextBillingDate: '2026-06-01',
    completedShiftsCount: 14,
    totalPlannedShifts: 20,
    notes: 'ADHD focus therapy and evening study supervision.'
  }
];

export function getSubscriptions() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_SUBSCRIPTIONS);
    if (!saved) {
      localStorage.setItem(STORAGE_KEY_SUBSCRIPTIONS, JSON.stringify(INITIAL_SUBSCRIPTIONS));
      return INITIAL_SUBSCRIPTIONS;
    }
    return JSON.parse(saved);
  } catch {
    return INITIAL_SUBSCRIPTIONS;
  }
}

export function createSubscription({
  caregiver,
  patientName = 'Vaishnavi Reddy',
  patientId = 'CF-20001',
  careRecipient = 'Diya Reddy',
  domain = 'child',
  frequency = 'weekdays',
  timeSlot = '04:00 PM — 08:00 PM',
  hoursPerShift = 4,
  startDate = new Date().toISOString().split('T')[0],
  durationMonths = 3,
  notes = ''
}) {
  const current = getSubscriptions();
  const freqConfig = Object.values(RECURRENCE_FREQUENCIES).find(f => f.id === frequency) || RECURRENCE_FREQUENCIES.WEEKDAYS;
  
  const baseRate = caregiver.pricing || 450;
  const discount = freqConfig.discountPercent;
  const effectiveRate = Math.round(baseRate * (1 - discount / 100));
  const shiftsPerMonth = freqConfig.daysPerWeek * 4;
  const monthlyTotal = effectiveRate * hoursPerShift * shiftsPerMonth;

  const newSub = {
    id: `SUB-${Date.now().toString().slice(-4)}`,
    patientName,
    patientId,
    careRecipient,
    caregiverId: caregiver.id,
    caregiverName: caregiver.name,
    domain: domain || caregiver.domain || caregiver.category,
    frequency,
    frequencyName: `${freqConfig.name} (${timeSlot})`,
    timeSlot,
    hoursPerShift,
    hourlyRate: baseRate,
    discountPercent: discount,
    effectiveHourlyRate: effectiveRate,
    shiftsPerMonth,
    monthlyTotal,
    status: 'active',
    autoRenew: true,
    startDate,
    durationMonths,
    nextBillingDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    completedShiftsCount: 0,
    totalPlannedShifts: shiftsPerMonth * durationMonths,
    notes
  };

  const updated = [newSub, ...current];
  localStorage.setItem(STORAGE_KEY_SUBSCRIPTIONS, JSON.stringify(updated));
  return newSub;
}

export function toggleSubscriptionStatus(subscriptionId, targetStatus) {
  const current = getSubscriptions();
  const updated = current.map(sub => {
    if (sub.id === subscriptionId) {
      return { ...sub, status: targetStatus };
    }
    return sub;
  });
  localStorage.setItem(STORAGE_KEY_SUBSCRIPTIONS, JSON.stringify(updated));
  return updated;
}

export function toggleAutoRenew(subscriptionId) {
  const current = getSubscriptions();
  const updated = current.map(sub => {
    if (sub.id === subscriptionId) {
      return { ...sub, autoRenew: !sub.autoRenew };
    }
    return sub;
  });
  localStorage.setItem(STORAGE_KEY_SUBSCRIPTIONS, JSON.stringify(updated));
  return updated;
}
