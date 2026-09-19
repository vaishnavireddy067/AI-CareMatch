// CaregiverMap — Google Maps cab-booking style component
// Uses direct script loading (compatible with all versions)
import { useEffect, useRef, useState } from 'react';

const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY;
const isConfigured = MAPS_KEY && !MAPS_KEY.includes('your-');

const DEFAULT_CENTER = { lat: 17.4400, lng: 78.4489 };

function loadGoogleMaps(apiKey) {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.maps) {
      resolve(window.google.maps);
      return;
    }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google.maps);
    script.onerror = () => reject(new Error('Google Maps failed to load'));
    document.head.appendChild(script);
  });
}

export default function CaregiverMap({ caregivers = [], userLocation = null, selectedId = null, onSelectCaregiver }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const userMarkerRef = useRef(null);
  const routeRendererRef = useRef(null);
  const userCircleRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [userPos, setUserPos] = useState(userLocation || DEFAULT_CENTER);
  const [gm, setGm] = useState(null);
  const [mapError, setMapError] = useState(null);

  // Get user's real location
  useEffect(() => {
    if (!userLocation && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setUserPos(DEFAULT_CENTER),
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, [userLocation]);

  // Load Google Maps script & initialize
  useEffect(() => {
    if (!isConfigured || !mapRef.current || mapLoaded) return;

    loadGoogleMaps(MAPS_KEY).then((maps) => {
      setGm(maps);
      const map = new maps.Map(mapRef.current, {
        center: userPos,
        zoom: 13,
        styles: [
          { elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
          { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1a2e' }] },
          { elementType: 'labels.text.fill', stylers: [{ color: '#8b8fa3' }] },
          { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2a2a4a' }] },
          { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9ca5b3' }] },
          { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1626' }] },
          { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
          { featureType: 'transit', stylers: [{ visibility: 'off' }] },
        ],
        disableDefaultUI: true,
        zoomControl: true,
      });
      mapInstanceRef.current = map;
      setMapLoaded(true);
    }).catch((err) => {
      console.error('Map error:', err);
      setMapError('Google Maps failed to load. Check API key and billing.');
    });
  }, [mapLoaded, userPos]);

  // Add markers
  useEffect(() => {
    if (!mapLoaded || !gm || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    // Clear old user marker when position updates
    if (userMarkerRef.current) {
      userMarkerRef.current.setMap(null);
      userMarkerRef.current = null;
    }
    if (userCircleRef.current) {
      userCircleRef.current.setMap(null);
      userCircleRef.current = null;
    }

    // User marker — always re-create at latest position
    if (userPos) {
      userMarkerRef.current = new gm.Marker({
        position: userPos, map,
        icon: { path: gm.SymbolPath.CIRCLE, scale: 10, fillColor: '#4F46E5', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 3 },
        title: 'Your Location', zIndex: 200,
      });
      // Accuracy ring around user
      userCircleRef.current = new gm.Circle({ map, center: userPos, radius: 300, fillColor: '#4F46E5', fillOpacity: 0.1, strokeColor: '#4F46E5', strokeOpacity: 0.3, strokeWeight: 1 });
      // Re-center map on user
      map.panTo(userPos);
    }

    // Caregiver markers
    caregivers.forEach((cg) => {
      const isSel = cg.id === selectedId;
      const marker = new gm.Marker({
        position: { lat: cg.location.lat, lng: cg.location.lng }, map, title: cg.name,
        icon: { path: gm.SymbolPath.CIRCLE, scale: isSel ? 14 : 10, fillColor: cg.govVerified ? '#10B981' : '#F59E0B', fillOpacity: 0.9, strokeColor: isSel ? '#818CF8' : '#fff', strokeWeight: isSel ? 3 : 2 },
        zIndex: isSel ? 100 : 1,
      });

      const info = new gm.InfoWindow({
        content: `<div style="font-family:Inter,sans-serif;padding:8px;min-width:180px;color:#1a1a2e">
          <strong>${cg.name}</strong>
          <div style="font-size:11px;color:#666;margin:4px 0">${cg.govVerified ? '🏛️ Verified' : '⏳ Pending'} • ${cg.domain === 'child' ? '👶 Child' : cg.domain === 'human' ? '🧑 Human' : '🐾 Pet'}</div>
          <div style="font-size:12px">⭐ Trust: ${cg.trustScore}/100 • ₹${cg.dailyCost}/day</div>
          <div style="font-size:11px;color:#666">${cg.specializations.slice(0, 3).join(', ')}</div>
        </div>`,
      });

      marker.addListener('click', () => { info.open(map, marker); onSelectCaregiver?.(cg.id); });
      if (isSel) { info.open(map, marker); map.panTo({ lat: cg.location.lat, lng: cg.location.lng }); }
      markersRef.current.push(marker);
    });
  }, [caregivers, gm, mapLoaded, onSelectCaregiver, selectedId, userPos]);

  // Route to selected caregiver
  useEffect(() => {
    if (!mapLoaded || !gm || !selectedId || !userPos) return;
    const map = mapInstanceRef.current;
    const cg = caregivers.find(c => c.id === selectedId);
    if (!cg) return;

    if (routeRendererRef.current) routeRendererRef.current.setMap(null);

    const renderer = new gm.DirectionsRenderer({
      map, suppressMarkers: true,
      polylineOptions: { strokeColor: '#818CF8', strokeOpacity: 0.8, strokeWeight: 4 },
    });
    routeRendererRef.current = renderer;

    new gm.DirectionsService().route({
      origin: userPos,
      destination: { lat: cg.location.lat, lng: cg.location.lng },
      travelMode: gm.TravelMode.DRIVING,
    }, (result, status) => { if (status === 'OK') renderer.setDirections(result); });
  }, [caregivers, gm, mapLoaded, selectedId, userPos]);

  if (!isConfigured || mapError) {
    return (
      <div className="interactive-radar-map glass-card">
        <div className="radar-header">
          <div className="radar-title">
            <span className="radar-live-dot" />
            <strong>Hyderabad Live Proximity Radar</strong>
          </div>
          <span className="radar-badge">Interactive Visual Map</span>
        </div>

        <div className="radar-viewport">
          <div className="radar-grid-lines" />
          <div className="radar-ring ring-1"><span className="ring-label">2 km</span></div>
          <div className="radar-ring ring-2"><span className="ring-label">5 km</span></div>
          <div className="radar-ring ring-3"><span className="ring-label">10 km</span></div>
          <div className="radar-ring ring-4"><span className="ring-label">15 km</span></div>
          <div className="radar-sweep" />

          {/* User Location Center Marker */}
          <div className="radar-user-center" title="Your Location (Hyderabad Hub)">
            <div className="user-pulse" />
            <div className="user-dot">📍</div>
            <span className="user-label">You</span>
          </div>

          {/* Caregiver Location Pins positioned by lat/lng relative to center */}
          {caregivers.map((cg) => {
            const isSel = cg.id === selectedId;
            // Center is approx 17.4400, 78.4489. Scale to percentage (50% is center)
            const dLat = (cg.location.lat - 17.4400) * 800;
            const dLng = (cg.location.lng - 78.4489) * 800;
            const topPct = Math.max(12, Math.min(88, 50 - dLat));
            const leftPct = Math.max(10, Math.min(90, 50 + dLng));

            return (
              <div
                key={cg.id}
                className={`radar-cg-pin ${isSel ? 'selected' : ''} ${cg.govVerified ? 'verified' : ''}`}
                style={{ top: `${topPct}%`, left: `${leftPct}%` }}
                onClick={() => onSelectCaregiver?.(cg.id)}
              >
                <div className="pin-avatar">
                  <img src={cg.photo} alt={cg.name} />
                </div>
                <div className="pin-tooltip">
                  <strong>{cg.name}</strong>
                  <span>{cg.location.name} • ₹{cg.dailyCost}/day</span>
                  <span className="tooltip-score">⭐ Trust {cg.trustScore}/100</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="map-legend">
          <span className="legend-item"><span className="legend-dot green" /> Verified Caregiver</span>
          <span className="legend-item"><span className="legend-dot purple" /> You (Search Origin)</span>
          <span className="legend-item"><span className="legend-dot amber" /> Click pin to view details</span>
        </div>

        <style>{`
          .interactive-radar-map {
            border-radius: var(--radius-xl);
            overflow: hidden;
            border: 1px solid var(--border-glass);
            background: radial-gradient(circle at center, #16152B 0%, #0B0A14 100%);
            padding: var(--space-4);
            display: flex;
            flex-direction: column;
            gap: var(--space-3);
          }
          .radar-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0 var(--space-2);
          }
          .radar-title {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: var(--fs-sm);
            color: var(--text-primary);
          }
          .radar-live-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #10B981;
            box-shadow: 0 0 8px #10B981;
            animation: radarBlink 1.5s infinite;
          }
          @keyframes radarBlink {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.4; transform: scale(0.8); }
          }
          .radar-badge {
            font-size: var(--fs-xs);
            color: var(--primary-300);
            background: rgba(79, 70, 229, 0.15);
            padding: 2px 8px;
            border-radius: var(--radius-full);
            border: 1px solid rgba(79, 70, 229, 0.3);
          }
          .radar-viewport {
            position: relative;
            width: 100%;
            height: 380px;
            border-radius: var(--radius-lg);
            overflow: hidden;
            border: 1px solid rgba(255,255,255,0.06);
            background: #0D0C18;
          }
          .radar-grid-lines {
            position: absolute;
            inset: 0;
            background-image: 
              linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
            background-size: 40px 40px;
          }
          .radar-ring {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            border-radius: 50%;
            border: 1px dashed rgba(79, 70, 229, 0.25);
            pointer-events: none;
          }
          .ring-1 { width: 90px; height: 90px; }
          .ring-2 { width: 180px; height: 180px; }
          .ring-3 { width: 270px; height: 270px; }
          .ring-4 { width: 350px; height: 350px; }
          .ring-label {
            position: absolute;
            top: -8px;
            left: 50%;
            transform: translateX(-50%);
            background: #0D0C18;
            padding: 0 4px;
            font-size: 9px;
            color: rgba(255,255,255,0.3);
          }
          .radar-sweep {
            position: absolute;
            top: 50%;
            left: 50%;
            width: 180px;
            height: 180px;
            transform-origin: top left;
            background: conic-gradient(from 0deg, rgba(79, 70, 229, 0.2) 0deg, transparent 60deg);
            border-radius: 50%;
            animation: sweepRotate 6s linear infinite;
            pointer-events: none;
          }
          @keyframes sweepRotate {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .radar-user-center {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            display: flex;
            flex-direction: column;
            align-items: center;
            z-index: 10;
          }
          .user-pulse {
            position: absolute;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: rgba(79, 70, 229, 0.3);
            animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
          }
          @keyframes ping {
            75%, 100% { transform: scale(2); opacity: 0; }
          }
          .user-dot { font-size: 18px; filter: drop-shadow(0 0 6px rgba(79,70,229,0.8)); }
          .user-label { font-size: 10px; color: var(--primary-300); font-weight: 600; margin-top: -2px; }
          .radar-cg-pin {
            position: absolute;
            transform: translate(-50%, -50%);
            cursor: pointer;
            z-index: 20;
            transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          }
          .pin-avatar {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            border: 2px solid #F59E0B;
            overflow: hidden;
            background: #1E1B4B;
            box-shadow: 0 4px 10px rgba(0,0,0,0.5);
            transition: transform 0.2s ease;
          }
          .radar-cg-pin.verified .pin-avatar { border-color: #10B981; }
          .radar-cg-pin.selected .pin-avatar {
            border-color: #818CF8;
            transform: scale(1.3);
            box-shadow: 0 0 15px rgba(129, 140, 248, 0.8);
          }
          .pin-avatar img { width: 100%; height: 100%; object-fit: cover; }
          .pin-tooltip {
            display: none;
            position: absolute;
            bottom: calc(100% + 8px);
            left: 50%;
            transform: translateX(-50%);
            background: rgba(15, 13, 26, 0.95);
            backdrop-filter: blur(12px);
            border: 1px solid var(--border-glass);
            padding: 6px 10px;
            border-radius: var(--radius-md);
            white-space: nowrap;
            flex-direction: column;
            gap: 2px;
            pointer-events: none;
            box-shadow: 0 8px 20px rgba(0,0,0,0.6);
            z-index: 50;
          }
          .pin-tooltip strong { font-size: 11px; color: var(--text-primary); }
          .pin-tooltip span { font-size: 10px; color: var(--text-secondary); }
          .tooltip-score { color: #F59E0B !important; font-weight: 600; }
          .radar-cg-pin:hover .pin-tooltip,
          .radar-cg-pin.selected .pin-tooltip { display: flex; }
          .radar-cg-pin:hover { z-index: 40; }
          .map-legend {
            display: flex;
            flex-wrap: wrap;
            gap: var(--space-4);
            justify-content: center;
            font-size: var(--fs-xs);
            color: var(--text-tertiary);
            padding-top: var(--space-1);
          }
          .legend-item { display: flex; align-items: center; gap: 6px; }
          .legend-dot { width: 8px; height: 8px; border-radius: 50%; }
          .legend-dot.green { background: #10B981; }
          .legend-dot.amber { background: #F59E0B; }
          .legend-dot.purple { background: #4F46E5; }
        `}</style>
      </div>
    );
  }

  return (
    <div className="caregiver-map">
      <div ref={mapRef} className="map-container" />
      <div className="map-legend">
        <span className="legend-item"><span className="legend-dot green" /> Verified</span>
        <span className="legend-item"><span className="legend-dot amber" /> Pending</span>
        <span className="legend-item"><span className="legend-dot purple" /> You</span>
      </div>
      <style>{`
        .caregiver-map{position:relative;border-radius:var(--radius-xl);overflow:hidden;border:1px solid var(--border-glass)}
        .map-container{width:100%;height:400px}
        .map-legend{position:absolute;bottom:12px;left:12px;display:flex;gap:var(--space-3);background:rgba(15,13,26,0.85);backdrop-filter:blur(10px);padding:var(--space-2) var(--space-3);border-radius:var(--radius-full);border:1px solid var(--border-glass);font-size:var(--fs-xs)}
        .legend-item{display:flex;align-items:center;gap:4px;color:var(--text-secondary)}
        .legend-dot{width:8px;height:8px;border-radius:50%}
        .legend-dot.green{background:#10B981}.legend-dot.amber{background:#F59E0B}.legend-dot.purple{background:#4F46E5}
        @media(max-width:768px){.map-container{height:300px}}
      `}</style>
    </div>
  );
}

