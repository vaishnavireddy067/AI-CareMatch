// Structured Family Care Plans for AI CareMatch
// Links multiple family members (Child, Aging Parents, Pets) to dedicated care instructions

const CARE_PLANS_KEY = 'cm_family_care_plans';

export const INITIAL_CARE_PLANS = [
  {
    id: 'PLAN-01',
    familyId: 'PT-20001',
    memberName: 'Diya Reddy',
    relationship: 'Daughter (7yo)',
    careCategory: 'child',
    diagnosis: 'ADHD (Inattentive type) & Mild Sensory Sensitivity',
    primaryNeeds: 'After-school supervision, visual routine guidance, calming focus activities',
    medications: [
      { name: 'Omega-3 Supplement', dosage: '1 capsule', time: '04:00 PM with snack' },
    ],
    dietaryRestrictions: 'Gluten-sensitive, No artificial red food coloring',
    emergencyContact: 'Vaishnavi Reddy (+91 98480 22338)',
    preferredSkills: ['ADHD Behavioral Support', 'Pediatric First Aid', 'Patience & Calm Communication'],
    notes: 'Responds best when given a 5-minute verbal countdown before transitioning between tasks.',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'PLAN-02',
    familyId: 'PT-20001',
    memberName: 'Srinivas Reddy',
    relationship: 'Father (74yo)',
    careCategory: 'human',
    diagnosis: 'Early Stage Alzheimer\'s & Hypertension',
    primaryNeeds: 'Mobility companionship, blood pressure monitoring, memory stimulation walks',
    medications: [
      { name: 'Amlodipine (5mg)', dosage: '1 tablet', time: '09:00 AM after breakfast' },
      { name: 'Donepezil (5mg)', dosage: '1 tablet', time: '08:30 PM before bedtime' },
    ],
    dietaryRestrictions: 'Low-sodium, Diabetic-friendly (No added sugar)',
    emergencyContact: 'Rajesh Reddy (+91 98480 22339)',
    preferredSkills: ['Dementia & Memory Care', 'Vitals Monitoring', 'Fall Prevention Assistance'],
    notes: 'Prefers listening to classical instrumental music during evening walks. Keep walking sticks nearby.',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'PLAN-03',
    familyId: 'PT-20001',
    memberName: 'Simba',
    relationship: 'Golden Retriever (3yo)',
    careCategory: 'pet',
    diagnosis: 'Mild Separation Anxiety & Sensitive Stomach',
    primaryNeeds: 'Evening outdoor fetch, feeding routine, leash behavioral guidance',
    medications: [],
    dietaryRestrictions: 'Grain-free kibble only; avoid poultry scraps',
    emergencyContact: 'Dr. Rao (Veterinary Hospital, Banjara Hills: +91 98765 00011)',
    preferredSkills: ['Large Dog Handling', 'Leash Training', 'Positive Reinforcement'],
    notes: 'Loves belly rubs after walks. Keep gate latched securely at all times.',
    updatedAt: new Date().toISOString(),
  },
];

export function getFamilyCarePlans() {
  try {
    const stored = JSON.parse(localStorage.getItem(CARE_PLANS_KEY));
    if (stored && stored.length > 0) return stored;
    localStorage.setItem(CARE_PLANS_KEY, JSON.stringify(INITIAL_CARE_PLANS));
    return INITIAL_CARE_PLANS;
  } catch {
    return INITIAL_CARE_PLANS;
  }
}

export function saveCarePlan(plan) {
  const plans = getFamilyCarePlans();
  let updated;
  if (plan.id) {
    updated = plans.map(p => p.id === plan.id ? { ...p, ...plan, updatedAt: new Date().toISOString() } : p);
  } else {
    const newPlan = {
      ...plan,
      id: `PLAN-0${plans.length + 1}`,
      updatedAt: new Date().toISOString(),
    };
    updated = [newPlan, ...plans];
  }
  localStorage.setItem(CARE_PLANS_KEY, JSON.stringify(updated));
  return updated;
}
