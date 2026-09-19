import { useState, useEffect } from 'react';
import { X, Heart, Shield, Check, Plus, Trash2, Activity, User, Phone, Sparkles } from 'lucide-react';

export default function CarePlanModal({ isOpen, plan, initialPlan, onClose, onSave }) {
  const activePlan = initialPlan || plan;

  const defaultState = {
    memberName: '',
    relationship: 'Child',
    careCategory: 'child',
    diagnosis: '',
    primaryNeeds: '',
    medications: [{ name: '', dosage: '', time: '' }],
    dietaryRestrictions: '',
    emergencyContact: '',
    preferredSkills: '',
    notes: '',
  };

  const [formData, setFormData] = useState(defaultState);

  useEffect(() => {
    if (activePlan) {
      setFormData(activePlan);
    } else {
      setFormData(defaultState);
    }
  }, [activePlan, isOpen]);

  if (!isOpen) return null;

  const handleMedChange = (index, field, value) => {
    const updated = [...formData.medications];
    updated[index][field] = value;
    setFormData({ ...formData, medications: updated });
  };

  const addMedRow = () => {
    setFormData({
      ...formData,
      medications: [...formData.medications, { name: '', dosage: '', time: '' }]
    });
  };

  const removeMedRow = (index) => {
    const updated = formData.medications.filter((_, i) => i !== index);
    setFormData({ ...formData, medications: updated });
  };

  const handleClose = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    onClose();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.memberName.trim()) return;

    const skillsArray = typeof formData.preferredSkills === 'string'
      ? formData.preferredSkills.split(',').map(s => s.trim()).filter(Boolean)
      : formData.preferredSkills;

    onSave({
      ...formData,
      preferredSkills: skillsArray,
      medications: formData.medications.filter(m => m.name.trim()),
    });
    onClose();
  };

  return (
    <div className="modal-overlay animate-fade-in" onClick={handleClose}>
      <div className="care-plan-modal glass-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-top">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Activity size={22} color="#10B981" />
            <h3>{activePlan?.id ? 'Edit Structured Care Plan' : 'Create New Family Care Plan'}</h3>
          </div>
          <button type="button" className="modal-close-btn" onClick={handleClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="care-plan-form">
          <div className="form-row-2">
            <div className="form-group">
              <label>Family Member / Pet Name</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Diya Reddy or Srinivas Reddy"
                value={formData.memberName}
                onChange={(e) => setFormData({ ...formData, memberName: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Relationship / Category</label>
              <select
                className="input-field"
                value={formData.careCategory}
                onChange={(e) => setFormData({ ...formData, careCategory: e.target.value })}
              >
                <option value="child">👶 Child Care</option>
                <option value="human">🧑 Adult / Elder Care</option>
                <option value="pet">🐾 Pet Care</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Diagnosis & Health Conditions</label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. ADHD (Inattentive), Dementia, Post-op recovery, Asthma..."
              value={formData.diagnosis}
              onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Primary Care & Routine Needs</label>
            <textarea
              className="input-field"
              rows="2"
              placeholder="Describe daily activities, mobility assistance, bedtime routines..."
              value={formData.primaryNeeds}
              onChange={(e) => setFormData({ ...formData, primaryNeeds: e.target.value })}
            />
          </div>

          {/* Medication Schedule */}
          <div className="medication-section">
            <div className="med-header">
              <label>💊 Medication Schedule & Vitals Checklist</label>
              <button type="button" className="btn-ghost btn-sm" onClick={addMedRow}>
                <Plus size={13} /> Add Medicine
              </button>
            </div>
            {formData.medications.map((med, idx) => (
              <div key={idx} className="med-row">
                <input
                  type="text"
                  className="input-field"
                  placeholder="Medicine Name (e.g. Donepezil 5mg)"
                  value={med.name}
                  onChange={(e) => handleMedChange(idx, 'name', e.target.value)}
                />
                <input
                  type="text"
                  className="input-field"
                  placeholder="Dosage (e.g. 1 Tab)"
                  value={med.dosage}
                  onChange={(e) => handleMedChange(idx, 'dosage', e.target.value)}
                />
                <input
                  type="text"
                  className="input-field"
                  placeholder="Time (e.g. 08:30 PM)"
                  value={med.time}
                  onChange={(e) => handleMedChange(idx, 'time', e.target.value)}
                />
                {formData.medications.length > 1 && (
                  <button type="button" className="btn-ghost btn-icon-del" onClick={() => removeMedRow(idx)}>
                    <Trash2 size={14} color="#F87171" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label>Dietary Restrictions & Allergies</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Gluten-free, Peanut allergy, Low-sodium"
                value={formData.dietaryRestrictions}
                onChange={(e) => setFormData({ ...formData, dietaryRestrictions: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Emergency Contact & Phone</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Vaishnavi (+91 98480 22338)"
                value={formData.emergencyContact}
                onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Preferred Caregiver Specializations (comma-separated)</label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. ADHD behavioral support, First Aid CPR, Patient Communication"
              value={Array.isArray(formData.preferredSkills) ? formData.preferredSkills.join(', ') : formData.preferredSkills}
              onChange={(e) => setFormData({ ...formData, preferredSkills: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Special Calming Instructions & Notes</label>
            <textarea
              className="input-field"
              rows="2"
              placeholder="e.g. Give 5-min warning before transitions, likes instrumental music..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={handleClose}>Cancel</button>
            <button type="submit" className="btn-primary">
              <Check size={16} /> Save & Link to Matching Engine
            </button>
          </div>
        </form>

        <style>{`
          .care-plan-modal {
            max-width: 620px; width: 100%; max-height: 90vh; overflow-y: auto;
            padding: var(--space-6); border-radius: var(--radius-2xl);
            background: var(--bg-card); border: 1px solid var(--border-glass);
            box-shadow: 0 25px 50px rgba(0,0,0,0.6);
          }
          .modal-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-4); }
          .care-plan-form { display: flex; flex-direction: column; gap: var(--space-4); }
          .form-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); }
          .form-group { display: flex; flex-direction: column; gap: 4px; }
          .form-group label { font-size: var(--fs-xs); font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; }
          .medication-section { background: rgba(255,255,255,0.02); border: 1px dashed var(--border-glass); border-radius: var(--radius-lg); padding: var(--space-3); display: flex; flex-direction: column; gap: var(--space-2); }
          .med-header { display: flex; justify-content: space-between; align-items: center; font-size: var(--fs-xs); font-weight: 600; color: var(--text-primary); }
          .med-row { display: grid; grid-template-columns: 2fr 1.2fr 1.2fr auto; gap: var(--space-2); align-items: center; }
          .btn-icon-del { padding: 6px; cursor: pointer; }
          .modal-actions { display: flex; gap: var(--space-3); margin-top: var(--space-3); }
          .modal-actions button { flex: 1; padding: var(--space-3); }
          @media (max-width: 640px) {
            .form-row-2 { grid-template-columns: 1fr; }
            .med-row { grid-template-columns: 1fr; }
          }
        `}</style>
      </div>
    </div>
  );
}
