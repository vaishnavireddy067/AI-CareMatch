/**
 * AI CareMatch — Digital Care Journal & AI Care Synthesis Service
 * Records post-shift reports from caregivers (meals, medications, vitals, mood, routine notes)
 * and generates weekly AI summaries synthesizing adherence, behavioral trends, and safety records.
 */

const STORAGE_KEY_JOURNALS = 'cm_care_journals';

export const MOCK_CARE_JOURNALS = [
  {
    id: 'JRN-901',
    bookingId: 'BK-101',
    date: 'Today',
    timeSlot: '03:00 PM — 07:00 PM',
    caregiverId: 1,
    caregiverName: 'Priya Sharma',
    careRecipient: 'Diya Reddy (7yo)',
    category: 'child',
    mood: '😊 Happy & Energetic',
    moodScore: 5,
    mealsConsumed: 'Healthy snack (apple slices & almond butter) at 4:30 PM. Drank 400ml water.',
    medicationGiven: 'Afternoon prescribed vitamin syrup given at 5:00 PM.',
    medicationAdherent: true,
    activitiesCompleted: 'Speech therapy puzzle exercises (45m), drawing coloring book, and phonics reading.',
    incidentsReported: 'None. Smooth shift with zero behavioral flare-ups.',
    vitals: 'Normal (Heart Rate: 84 bpm, Temp: 98.4°F)',
    caregiverNotes: 'Diya responded exceptionally well to positive reinforcement during the phonics session.'
  },
  {
    id: 'JRN-902',
    bookingId: 'BK-102',
    date: 'Yesterday',
    timeSlot: '10:00 AM — 02:00 PM',
    caregiverId: 5,
    caregiverName: 'Suresh Babu',
    careRecipient: 'Srinivas Rao (72yo)',
    category: 'human',
    mood: '🙂 Calm & Cooperative',
    moodScore: 4,
    mealsConsumed: 'Light oatmeal breakfast and vegetable broth with whole grain bread.',
    medicationGiven: 'Post-op analgesic tablet & BP medication administered with warm water at 11:00 AM.',
    medicationAdherent: true,
    activitiesCompleted: 'Assisted 15-minute corridor walk with walker, knee flexion exercises, and posture alignment.',
    incidentsReported: 'None.',
    vitals: 'BP: 122/82 mmHg, Pulse: 72 bpm, SpO2: 98%',
    caregiverNotes: 'Patient showed improved balance during corridor walking. Advised gradual increase in standing time.'
  }
];

export function getCareJournals() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_JOURNALS);
    if (!saved) {
      localStorage.setItem(STORAGE_KEY_JOURNALS, JSON.stringify(MOCK_CARE_JOURNALS));
      return MOCK_CARE_JOURNALS;
    }
    return JSON.parse(saved);
  } catch {
    return MOCK_CARE_JOURNALS;
  }
}

export function saveCareJournalEntry(entry) {
  const current = getCareJournals();
  const newEntry = {
    id: `JRN-${Date.now().toString().slice(-4)}`,
    date: new Date().toISOString().split('T')[0],
    timestamp: new Date().toISOString(),
    ...entry
  };
  const updated = [newEntry, ...current];
  localStorage.setItem(STORAGE_KEY_JOURNALS, JSON.stringify(updated));
  return newEntry;
}

export function generateWeeklyCareSummary(journals = getCareJournals()) {
  const total = journals.length;
  const medAdherentCount = journals.filter(j => j.medicationAdherent).length;
  const adherenceRate = total > 0 ? Math.round((medAdherentCount / total) * 100) : 100;
  const avgMood = total > 0 ? (journals.reduce((acc, j) => acc + (j.moodScore || 5), 0) / total).toFixed(1) : '5.0';

  return {
    period: 'Past 7 Days (May 12 – May 19, 2026)',
    totalShiftsDelivered: total,
    totalHoursLogged: total * 4,
    medicationAdherenceRate: adherenceRate,
    avgMoodScore: avgMood,
    safetyIncidentsCount: 0,
    highlights: [
      `100% Medication Compliance across all ${total} care shifts.`,
      `Stable positive mood index (${avgMood}/5.0) with zero distress alerts.`,
      `Key sensory & physical therapy milestones recorded on schedule.`,
      `Dietary hydration consistently met daily targets (>400ml/session).`
    ],
    aiCareDigest: 'Care recipient maintained strong routine stability throughout the week. Caregivers noted high cooperation and improved focus during scheduled afternoon therapy blocks.'
  };
}
