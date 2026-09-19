/**
 * AI CareMatch — Dynamic Pricing & Cost Breakdown Calculator
 * Transparently calculates pricing based on:
 * - Base rate (caregiver tier)
 * - Domain & specialized clinical skills (ADHD, Dementia, Special Needs +₹100/hr)
 * - Urgency tier (Scheduled 1.0x, Same-Day 1.15x, Urgent 1.3x, Emergency 1.5x)
 * - Time of day (Night shift 10 PM - 6 AM +₹100/hr)
 * - Platform & Escrow processing fee (10%)
 */

export const URGENCY_TIERS = {
  SCHEDULED: { id: 'scheduled', label: 'Advance Scheduled (Next Day+)', multiplier: 1.0, badge: 'Standard Rate' },
  SAME_DAY: { id: 'same_day', label: 'Same-Day Dispatch (Within 6 Hrs)', multiplier: 1.15, badge: '+15% Same Day' },
  URGENT: { id: 'urgent', label: 'Urgent Dispatch (Within 2 Hrs)', multiplier: 1.30, badge: '+30% Priority' },
  EMERGENCY: { id: 'emergency', label: 'Rapid SOS Emergency (Within 30 Mins)', multiplier: 1.50, badge: '+50% Emergency Surge' }
};

export function calculateDynamicPricing({
  baseHourlyRate = 450,
  durationHours = 4,
  urgency = 'scheduled',
  hasSpecialSkill = false,
  specialSkillName = '',
  isNightShift = false,
  isWeekend = false
}) {
  const urgencyConfig = URGENCY_TIERS[urgency.toUpperCase()] || URGENCY_TIERS.SCHEDULED;
  
  let skillSurcharge = 0;
  if (hasSpecialSkill) {
    skillSurcharge = 100; // ₹100/hr for certified clinical skills (ADHD, CPR, Dementia)
  }

  let nightSurcharge = 0;
  if (isNightShift) {
    nightSurcharge = 100; // ₹100/hr for night shift routines
  }

  let weekendSurcharge = 0;
  if (isWeekend) {
    weekendSurcharge = 50;
  }

  const rawHourlyRate = (baseHourlyRate + skillSurcharge + nightSurcharge + weekendSurcharge) * urgencyConfig.multiplier;
  const effectiveHourlyRate = Math.round(rawHourlyRate);
  const subtotal = effectiveHourlyRate * durationHours;
  const platformFee = Math.round(subtotal * 0.10);
  const caregiverEarnings = subtotal - platformFee;

  return {
    baseHourlyRate,
    urgencyMultiplier: urgencyConfig.multiplier,
    urgencyLabel: urgencyConfig.label,
    skillSurcharge,
    specialSkillName: hasSpecialSkill ? (specialSkillName || 'Specialized Clinical Care') : null,
    nightSurcharge,
    weekendSurcharge,
    effectiveHourlyRate,
    durationHours,
    subtotal,
    platformFee,
    caregiverEarnings,
    currency: '₹',
    breakdown: [
      { label: `Base Rate (${durationHours} hrs @ ₹${baseHourlyRate}/hr)`, amount: baseHourlyRate * durationHours },
      ...(hasSpecialSkill ? [{ label: `Special Skill (${specialSkillName || 'Certified Clinical'} @ +₹${skillSurcharge}/hr)`, amount: skillSurcharge * durationHours }] : []),
      ...(isNightShift ? [{ label: `Night Shift Differential (+₹${nightSurcharge}/hr)`, amount: nightSurcharge * durationHours }] : []),
      ...(isWeekend ? [{ label: `Weekend Rate Differential (+₹${weekendSurcharge}/hr)`, amount: weekendSurcharge * durationHours }] : []),
      ...(urgencyConfig.multiplier > 1.0 ? [{ label: `Urgency Dispatch Multiplier (${urgencyConfig.badge})`, amount: Math.round(subtotal - ((baseHourlyRate + skillSurcharge + nightSurcharge + weekendSurcharge) * durationHours)) }] : [])
    ]
  };
}
