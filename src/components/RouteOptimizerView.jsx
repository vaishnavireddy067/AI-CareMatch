import { useState } from 'react';
import { MapPin, Navigation, Clock, IndianRupee, Sparkles, CheckCircle, AlertTriangle, ArrowRight, Shield } from 'lucide-react';
import { MOCK_CAREGIVER_DAILY_ROUTE, analyzeRouteSchedule } from '../engine/routeOptimizer';

export default function RouteOptimizerView() {
  const [route, setRoute] = useState(MOCK_CAREGIVER_DAILY_ROUTE);
  const analysis = analyzeRouteSchedule(route);

  return (
    <div className="glass-card route-optimizer-card">
      <div className="optimizer-header">
        <div className="header-left">
          <Navigation size={18} color="#10B981" />
          <h3>Caregiver Schedule & Daily Route Optimizer</h3>
        </div>
        <span className="efficiency-pill">
          <Sparkles size={13} /> {analysis.optimizationScore}% Route Efficiency Score
        </span>
      </div>

      <div className="metrics-summary-bar">
        <div className="route-stat">
          <span className="val">{analysis.totalDistanceKm} km</span>
          <span className="lbl">Total Transit</span>
        </div>
        <div className="route-stat">
          <span className="val">{analysis.totalTravelMins} mins</span>
          <span className="lbl">Travel Time</span>
        </div>
        <div className="route-stat">
          <span className="val">{analysis.totalCareHours} Hrs</span>
          <span className="lbl">On-Duty Care</span>
        </div>
        <div className="route-stat">
          <span className="val green">₹{analysis.totalEarnings.toLocaleString('en-IN')}</span>
          <span className="lbl">Day Gross Earnings</span>
        </div>
      </div>

      {/* AI Traffic & Buffer Optimization Digest */}
      <div className="ai-route-digest">
        <Sparkles size={16} color="#34D399" style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <strong>AI Smart Routing Recommendation:</strong>
          <p>{analysis.aiRecommendation}</p>
        </div>
      </div>

      {/* Sequenced Route Stops Timeline */}
      <div className="stops-timeline">
        {route.map((stop, idx) => {
          const isJob = stop.stopType === 'job';
          return (
            <div key={idx} className={`stop-item ${isJob ? 'job-stop' : 'base-stop'}`}>
              <div className="stop-marker">
                <span className="stop-num">{stop.order}</span>
                {idx < route.length - 1 && <div className="stop-line" />}
              </div>
              <div className="stop-details glass-card">
                <div className="stop-top-row">
                  <div>
                    <h4 className="stop-title">
                      {isJob ? `Shift #${stop.jobId}: ${stop.clientName}` : stop.title}
                    </h4>
                    <span className="stop-addr"><MapPin size={11} /> {stop.address}</span>
                  </div>
                  {isJob && (
                    <span className="stop-payout">₹{stop.payout}</span>
                  )}
                </div>

                <div className="stop-meta-tags">
                  <span className="time-tag"><Clock size={11} /> {stop.timeWindow}</span>
                  {stop.serviceType && <span className="service-tag">{stop.serviceType}</span>}
                </div>

                {stop.travelTimeToNextMins > 0 && (
                  <div className="transit-leg-box">
                    <Navigation size={12} color="#60A5FA" />
                    <span>Next transit to Stop {stop.order + 1}: <strong>{stop.travelTimeToNextMins} mins</strong> ({stop.distanceToNextKm} km)</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        .route-optimizer-card {
          padding: var(--space-6);
          border-radius: var(--radius-xl);
          border: 1px solid rgba(16, 185, 129, 0.3);
          background: linear-gradient(135deg, rgba(6, 78, 59, 0.12) 0%, rgba(15, 23, 42, 0.5) 100%);
          margin-bottom: var(--space-8);
        }
        .optimizer-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--space-4);
          flex-wrap: wrap;
          gap: var(--space-2);
        }
        .header-left {
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }
        .header-left h3 {
          margin: 0;
          font-size: var(--fs-base);
        }
        .efficiency-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(16, 185, 129, 0.15);
          color: #34D399;
          border: 1px solid rgba(16, 185, 129, 0.3);
          padding: 4px 10px;
          border-radius: var(--radius-full);
          font-size: 11px;
          font-weight: 700;
        }
        .metrics-summary-bar {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
          gap: var(--space-3);
          margin-bottom: var(--space-4);
        }
        .route-stat {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-glass);
          border-radius: var(--radius-md);
          padding: 8px 12px;
          display: flex;
          flex-direction: column;
        }
        .route-stat .val { font-size: var(--fs-base); font-weight: 800; }
        .route-stat .val.green { color: #10B981; }
        .route-stat .lbl { font-size: 10px; color: var(--text-muted); text-transform: uppercase; font-weight: 600; }
        .ai-route-digest {
          background: rgba(16, 185, 129, 0.08);
          border-left: 3px solid #10B981;
          border-radius: 6px;
          padding: 10px 12px;
          display: flex;
          gap: 10px;
          font-size: 12px;
          color: #E2E8F0;
          margin-bottom: var(--space-5);
        }
        .ai-route-digest p { margin: 2px 0 0; color: var(--text-secondary); }
        .stops-timeline {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }
        .stop-item {
          display: flex;
          gap: var(--space-4);
          align-items: flex-start;
          position: relative;
        }
        .stop-marker {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex-shrink: 0;
          width: 28px;
        }
        .stop-num {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: #10B981;
          color: #000;
          font-size: 11px;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2;
        }
        .stop-line {
          width: 2px;
          height: 100%;
          min-height: 50px;
          background: rgba(16, 185, 129, 0.3);
          margin-top: 4px;
        }
        .stop-details {
          flex: 1;
          padding: var(--space-4);
          border-radius: var(--radius-lg);
        }
        .stop-top-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 4px;
        }
        .stop-title { margin: 0 0 2px; font-size: 13px; }
        .stop-addr { font-size: 11px; color: var(--text-muted); display: flex; align-items: center; gap: 4px; }
        .stop-payout { font-size: 13px; font-weight: 700; color: #10B981; }
        .stop-meta-tags {
          display: flex;
          gap: var(--space-2);
          margin-top: 6px;
          flex-wrap: wrap;
        }
        .time-tag { font-size: 10px; background: rgba(255,255,255,0.06); padding: 2px 6px; border-radius: 4px; color: #E2E8F0; display: flex; align-items: center; gap: 3px; }
        .service-tag { font-size: 10px; background: rgba(59, 130, 246, 0.12); color: #93C5FD; padding: 2px 6px; border-radius: 4px; }
        .transit-leg-box {
          margin-top: 8px;
          padding: 6px 10px;
          background: rgba(59, 130, 246, 0.06);
          border-radius: 6px;
          font-size: 11px;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          gap: 6px;
        }
      `}</style>
    </div>
  );
}
