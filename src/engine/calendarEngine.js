// Calendar Engine & Conflict-Free Slot Validation for AI CareMatch
// Prevents double-booking overlapping hours for caregivers and enforces the 4-Hour Dedicated Lock

// Parse time like "15:00" or "03:00 PM" into minutes from midnight
function parseTimeToMinutes(timeStr) {
  if (!timeStr) return 600; // default 10:00 AM
  if (timeStr.includes(':')) {
    const parts = timeStr.split(':');
    let hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1].slice(0, 2), 10) || 0;
    if (timeStr.toLowerCase().includes('pm') && hours < 12) hours += 12;
    if (timeStr.toLowerCase().includes('am') && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }
  return 600;
}

/**
 * Check if a requested slot conflicts with existing confirmed bookings for a caregiver
 * @param {Array} existingBookings - Current bookings list
 * @param {number|string} caregiverId - Target caregiver
 * @param {string} requestedDate - Format: "YYYY-MM-DD" or "Today"
 * @param {string} requestedTime - Format: "HH:MM"
 * @param {number} durationHours - Shift duration
 * @returns {Object} { hasConflict: boolean, conflictingBooking: Object | null, message: string }
 */
export function checkSlotConflict(existingBookings = [], caregiverId, requestedDate, requestedTime, durationHours = 4) {
  if (!existingBookings || existingBookings.length === 0) {
    return { hasConflict: false, conflictingBooking: null, message: 'Slot available' };
  }

  const reqDateNorm = requestedDate || 'Today';
  const reqStartMin = parseTimeToMinutes(requestedTime);
  const reqEndMin = reqStartMin + (durationHours * 60);

  for (const b of existingBookings) {
    // Only check confirmed/active bookings for the same caregiver
    if (b.caregiverId === Number(caregiverId) && b.status === 'confirmed') {
      const bDateNorm = b.scheduledDate || (b.shiftDate?.includes('Today') ? 'Today' : b.shiftDate?.split(',')[0]);
      
      // If same date
      if (bDateNorm === reqDateNorm || reqDateNorm === 'Today' || bDateNorm === 'Today') {
        const bStartMin = parseTimeToMinutes(b.scheduledTime || '15:00');
        const bDuration = b.durationHours || 4;
        const bEndMin = bStartMin + (bDuration * 60);

        // Check time overlap: StartA < EndB && EndA > StartB
        if (reqStartMin < bEndMin && reqEndMin > bStartMin) {
          const startFmt = `${Math.floor(bStartMin / 60).toString().padStart(2, '0')}:${(bStartMin % 60).toString().padStart(2, '0')}`;
          const endFmt = `${Math.floor(bEndMin / 60).toString().padStart(2, '0')}:${(bEndMin % 60).toString().padStart(2, '0')}`;
          return {
            hasConflict: true,
            conflictingBooking: b,
            message: `Caregiver already has an active dedicated shift on ${bDateNorm} from ${startFmt} to ${endFmt}. Please choose an alternate slot or caregiver.`,
          };
        }
      }
    }
  }

  return { hasConflict: false, conflictingBooking: null, message: 'Slot available' };
}

/**
 * Validates 4-Hour Dedicated Lockout rule
 */
export function getRemainingLockoutMinutes(caregiverActiveJob) {
  if (!caregiverActiveJob || !caregiverActiveJob.blockExpiresAt) return 0;
  const expiry = new Date(caregiverActiveJob.blockExpiresAt).getTime();
  const now = Date.now();
  const diffMin = Math.round((expiry - now) / 60000);
  return diffMin > 0 ? diffMin : 0;
}
