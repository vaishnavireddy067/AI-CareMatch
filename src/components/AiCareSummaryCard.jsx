import { Sparkles, CheckCircle, Heart, Shield, Activity, Calendar, FileText } from 'lucide-react';
import { generateWeeklyCareSummary } from '../services/careJournalService';

export default function AiCareSummaryCard({ onOpenJournalHistory }) {
  const summary = generateWeeklyCareSummary();

  return (
    <div className="glass-card ai-care-summary-card">
      <div className="summary-header">
        <div className="summary-badge">
          <Sparkles size={15} color="#A78BFA" />
          <span>AI CARE SYNTHESIS & RECIPIENT DIGEST</span>
        </div>
        <span className="summary-period">{summary.period}</span>
      </div>

      <div className="summary-stats-strip">
        <div className="stat-pill">
          <span className="stat-val green">100%</span>
          <span className="stat-label">Medication Adherence</span>
        </div>
        <div className="stat-pill">
          <span className="stat-val purple">{summary.avgMoodScore}/5.0</span>
          <span className="stat-label">Mood Index</span>
        </div>
        <div className="stat-pill">
          <span className="stat-val blue">{summary.totalHoursLogged} Hrs</span>
          <span className="stat-label">Delivered Care</span>
        </div>
        <div className="stat-pill">
          <span className="stat-val teal">0 Alerts</span>
          <span className="stat-label">Safety Incidents</span>
        </div>
      </div>

      <div className="summary-digest-box">
        <p><strong>Clinical Digest:</strong> {summary.aiCareDigest}</p>
      </div>

      <div className="summary-highlights-list">
        {summary.highlights.map((h, idx) => (
          <div key={idx} className="highlight-item">
            <CheckCircle size={14} color="#10B981" style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{h}</span>
          </div>
        ))}
      </div>

      <div className="summary-footer">
        <button type="button" className="btn-secondary btn-sm" onClick={onOpenJournalHistory}>
          <FileText size={13} /> View Full Session Journal History
        </button>
        <span className="summary-disclaimer">
          🔒 AI synthesizes recorded shift logs without medical diagnosis.
        </span>
      </div>

      <style>{`
        .ai-care-summary-card {
          padding: var(--space-5);
          border-radius: var(--radius-xl);
          border: 1px solid rgba(139, 92, 246, 0.3);
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(15, 23, 42, 0.4) 100%);
          margin-bottom: var(--space-6);
        }
        .summary-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--space-4);
          flex-wrap: wrap;
          gap: var(--space-2);
        }
        .summary-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 700;
          color: #A78BFA;
          letter-spacing: 0.5px;
        }
        .summary-period {
          font-size: 11px;
          color: var(--text-muted);
          background: rgba(255,255,255,0.04);
          padding: 2px 8px;
          border-radius: var(--radius-full);
        }
        .summary-stats-strip {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
          gap: var(--space-3);
          margin-bottom: var(--space-4);
        }
        .stat-pill {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-glass);
          border-radius: var(--radius-lg);
          padding: 10px 12px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .stat-val {
          font-size: var(--fs-lg);
          font-weight: 800;
        }
        .stat-val.green { color: #10B981; }
        .stat-val.purple { color: #A78BFA; }
        .stat-val.blue { color: #60A5FA; }
        .stat-val.teal { color: #2DD4BF; }
        .stat-label {
          font-size: 10px;
          color: var(--text-muted);
          text-transform: uppercase;
          font-weight: 600;
        }
        .summary-digest-box {
          background: rgba(139, 92, 246, 0.1);
          border-left: 3px solid #8B5CF6;
          border-radius: 6px;
          padding: 10px 12px;
          font-size: 12px;
          color: #E2E8F0;
          margin-bottom: var(--space-4);
          line-height: 1.5;
        }
        .summary-highlights-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: var(--space-4);
        }
        .highlight-item {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          font-size: 12px;
          color: var(--text-secondary);
        }
        .summary-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: var(--space-3);
          border-top: 1px solid var(--border-glass);
          flex-wrap: wrap;
          gap: var(--space-2);
        }
        .summary-disclaimer {
          font-size: 11px;
          color: var(--text-tertiary);
        }
      `}</style>
    </div>
  );
}
