import { useState } from 'react';
import { X, Sparkles, Sliders, IndianRupee, MapPin, Users, Star, ArrowRight } from 'lucide-react';
import { simulateWhatIf } from '../engine/whatIfEngine';

export default function WhatIfSimulatorModal({ isOpen, onClose, initialBudget = 500, initialRadius = 5, domain = 'child' }) {
  const [budget, setBudget] = useState(initialBudget);
  const [radius, setRadius] = useState(initialRadius);

  if (!isOpen) return null;

  const simulation = simulateWhatIf({
    baseBudget: initialBudget,
    targetBudget: budget,
    baseRadiusKm: initialRadius,
    targetRadiusKm: radius,
    domain
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="glass-card what-if-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header-simple">
          <h3>
            <Sparkles size={18} color="#A78BFA" />
            <span>AI CareMatch Sensitivity Simulator (What-If)</span>
          </h3>
          <button type="button" className="modal-close-btn" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClose(); }}><X size={18} /></button>
        </div>

        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 var(--space-4)' }}>
          Tweak your budget and geographical range parameters to immediately simulate candidate availability and discover newly unlocked caregiver tiers in real-time.
        </p>

        {/* Sliders Box */}
        <div className="controls-box glass-card">
          <div className="slider-group">
            <div className="slider-label-row">
              <span className="lbl"><IndianRupee size={13} /> Max Hourly Rate:</span>
              <strong className="val">₹{budget}/hr</strong>
            </div>
            <input
              type="range"
              min="300"
              max="900"
              step="50"
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              className="range-input"
            />
            <div className="slider-ticks">
              <span>₹300/hr</span>
              <span>₹500 (Base)</span>
              <span>₹700</span>
              <span>₹900/hr</span>
            </div>
          </div>

          <div className="slider-group">
            <div className="slider-label-row">
              <span className="lbl"><MapPin size={13} /> Search Radius (Banjara Hills):</span>
              <strong className="val">{radius} km</strong>
            </div>
            <input
              type="range"
              min="3"
              max="25"
              step="1"
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="range-input"
            />
            <div className="slider-ticks">
              <span>3 km (Local)</span>
              <span>10 km (Suburbs)</span>
              <span>25 km (Greater Hyd)</span>
            </div>
          </div>
        </div>

        {/* Real-Time Simulation Result Callout */}
        <div className="simulation-result-strip">
          <div className="sim-counter">
            <span className="count-val">{simulation.simulatedCount}</span>
            <span className="count-lbl">Available Matches</span>
          </div>
          <div className="sim-delta">
            {simulation.deltaCount > 0 ? (
              <span className="delta-badge positive">
                +{simulation.deltaCount} New Caregivers Unlocked!
              </span>
            ) : simulation.deltaCount < 0 ? (
              <span className="delta-badge negative">
                {simulation.deltaCount} Fewer Matches
              </span>
            ) : (
              <span className="delta-badge neutral">Baseline Matches</span>
            )}
          </div>
        </div>

        {/* AI Analytical Insights */}
        <div className="insights-box">
          <strong style={{ fontSize: '11px', color: '#A78BFA', textTransform: 'uppercase' }}>
            Simulation Insights:
          </strong>
          <ul>
            {simulation.insights.map((ins, idx) => (
              <li key={idx}>{ins}</li>
            ))}
          </ul>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-4)' }}>
          <button type="button" className="btn-primary" style={{ width: '100%' }} onClick={onClose}>
            Apply Simulated Filters to Search
          </button>
        </div>

        <style>{`
          .what-if-modal {
            max-width: 500px;
            width: 100%;
            border-radius: 20px;
            border: 1px solid rgba(139, 92, 246, 0.4);
            background: #110d1e;
            padding: 24px;
            box-shadow: 0 25px 80px rgba(0,0,0,0.8);
          }
          .controls-box {
            padding: var(--space-4);
            border-radius: var(--radius-lg);
            display: flex;
            flex-direction: column;
            gap: var(--space-4);
            margin-bottom: var(--space-4);
          }
          .slider-group {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }
          .slider-label-row {
            display: flex;
            justify-content: space-between;
            font-size: 12px;
          }
          .slider-label-row .lbl {
            color: var(--text-secondary);
            display: flex;
            align-items: center;
            gap: 4px;
          }
          .slider-label-row .val {
            color: #A78BFA;
            font-size: 13px;
          }
          .range-input {
            width: 100%;
            accent-color: #8B5CF6;
            cursor: pointer;
          }
          .slider-ticks {
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            color: var(--text-muted);
          }
          .simulation-result-strip {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: rgba(139, 92, 246, 0.12);
            border: 1px solid rgba(139, 92, 246, 0.3);
            border-radius: var(--radius-lg);
            padding: 12px 16px;
            margin-bottom: var(--space-4);
          }
          .sim-counter {
            display: flex;
            flex-direction: column;
          }
          .count-val {
            font-size: var(--fs-2xl);
            font-weight: 800;
            color: #fff;
          }
          .count-lbl {
            font-size: 10px;
            color: var(--text-muted);
            text-transform: uppercase;
            font-weight: 600;
          }
          .delta-badge {
            font-size: 12px;
            font-weight: 700;
            padding: 4px 10px;
            border-radius: var(--radius-full);
          }
          .delta-badge.positive {
            background: rgba(16, 185, 129, 0.2);
            color: #34D399;
            border: 1px solid #10B981;
          }
          .delta-badge.negative {
            background: rgba(239, 68, 68, 0.2);
            color: #F87171;
          }
          .delta-badge.neutral {
            background: rgba(255,255,255,0.06);
            color: var(--text-secondary);
          }
          .insights-box {
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid var(--border-glass);
            border-radius: var(--radius-md);
            padding: 10px 14px;
            font-size: 11px;
          }
          .insights-box ul {
            margin: 4px 0 0;
            padding-left: 16px;
            color: var(--text-secondary);
            display: flex;
            flex-direction: column;
            gap: 2px;
          }
        `}</style>
      </div>
    </div>
  );
}
