import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { majorCorridors, hubLocations } from '../data/nerData';
import { localizedCorridors, localizedFleets } from '../data/localizedData';
import {
  Layers,
  AlertTriangle,
  Truck,
  CloudRain,
  Navigation,
  ShieldAlert,
  Inbox,
  HelpCircle,
  Info
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Custom SVG Markers
const createSvgIcon = (svgString, color) => {
  return L.divIcon({
    html: `<div style="
      background-color: ${color};
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 12px ${color};
      border: 2px solid white;
    ">${svgString}</div>`,
    className: 'custom-leaflet-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });
};

const truckIcon = createSvgIcon(
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>',
  '#06B6D4'
);

const landslideIcon = createSvgIcon(
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
  '#EF4444'
);

const floodIcon = createSvgIcon(
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path></svg>',
  '#3B82F6'
);

const hubIcon = createSvgIcon(
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M3 21h18"></path><path d="M3 10h18"></path><path d="M5 6l7-3 7 3"></path><path d="M4 10v11"></path><path d="M20 10v11"></path></svg>',
  '#8B5CF6'
);

function MapViewCenter({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.2, easeLinearity: 0.25 });
  }, [center, zoom, map]);
  return null;
}

export const GISMap = () => {
  const { t, lang, stateFilter, incidents, fleets, nerStates, triggerSOSAlert, theme } = useApp();

  const isDark = theme === 'dark';
  
  // Single, 100% reliable free OpenStreetMap tile provider for both Day & Night modes
  const tileUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  const tileSubdomains = "abc";
  const tileAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

  const [showIncidents, setShowIncidents] = useState(true);
  const [showFleets, setShowFleets] = useState(true);
  const [showCorridors, setShowCorridors] = useState(true);
  const [showWeatherOverlay, setShowWeatherOverlay] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [dockTab, setDockTab] = useState('layers');
  const [backendHubs, setBackendHubs] = useState([]);
  const [liveIncidents, setLiveIncidents] = useState([]);
  const [liveWeatherList, setLiveWeatherList] = useState([]);
  const [aiIntelligence, setAiIntelligence] = useState(null);
  const [loadingAi, setLoadingAi] = useState(false);

  useEffect(() => {
    setAiIntelligence(null);
  }, [selectedItem]);

  const handleGenerateAI = async () => {
    if (!selectedItem || selectedItem.type !== 'incident') return;
    setLoadingAi(true);
    setAiIntelligence(null);
    try {
      const res = await api.getIncidentAIIntelligence(selectedItem.data.id, selectedItem.data);
      setAiIntelligence(res);
    } catch (err) {
      setAiIntelligence({
        available: false,
        error_message: err.message || 'Amazon Bedrock connection error.'
      });
    } finally {
      setLoadingAi(false);
    }
  };

  useEffect(() => {
    async function loadNetworkData() {
      const nodes = await api.getNetworkNodes();
      if (nodes && nodes.length > 0) {
        setBackendHubs(nodes);
      }
      const liveIncs = await api.getLiveIncidents();
      if (liveIncs && liveIncs.length > 0) {
        setLiveIncidents(liveIncs);
      }
      const weatherRes = await api.getLiveWeather();
      if (weatherRes && weatherRes.hubs_weather) {
        setLiveWeatherList(weatherRes.hubs_weather);
      }
    }
    loadNetworkData();
  }, []);

  const currentStateObj = nerStates.find((s) => s.id === stateFilter) || nerStates[0];
  
  let activeCenter = [currentStateObj.lat, currentStateObj.lng];
  let activeZoom = currentStateObj.zoom;

  if (selectedItem) {
    if (selectedItem.type === 'corridor' && selectedItem.data.coordinates?.length) {
      activeCenter = selectedItem.data.coordinates[0];
      activeZoom = 8;
    } else if (selectedItem.type === 'incident' && selectedItem.data.lat) {
      activeCenter = [selectedItem.data.lat, selectedItem.data.lng];
      activeZoom = 10;
    } else if (selectedItem.type === 'fleet' && selectedItem.data.lat) {
      activeCenter = [selectedItem.data.lat, selectedItem.data.lng];
      activeZoom = 10;
    }
  }

  const filteredIncidents = incidents.filter(
    (inc) => stateFilter === 'all' || inc.state === stateFilter
  );

  const filteredFleets = fleets.filter(
    (f) => stateFilter === 'all' || f.state === stateFilter
  );

  const filteredCorridors = majorCorridors.filter(
    (c) => stateFilter === 'all' || c.state === stateFilter
  );

  const getCorridorColor = (status) => {
    switch (status) {
      case 'clear': return '#10B981';
      case 'caution': return '#F59E0B';
      case 'blocked': return '#EF4444';
      default: return '#3B82F6';
    }
  };

  return (
    <div className="gis-layout">
      {/* Left Control Panel: Corridor Accessibility & Hazards */}
      <div className="sidebar-panel">
        <div className="glass-panel" style={{ padding: '14px', flex: '0 0 auto', maxHeight: '42%', display: 'flex', flexDirection: 'column' }}>
          <h2 className="section-title" style={{ fontSize: '0.95rem', flexShrink: 0 }}>
            <Layers size={18} color="#3B82F6" />
            {t.accessibilityStatus}
          </h2>

          <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', flex: 1, paddingRight: '2px' }}>
            {filteredCorridors.map((c) => {
              const statusText = c.status === 'blocked' ? (t.pillBlocked || 'BLOCKED') : c.status === 'caution' ? (t.pillCaution || 'CAUTION') : (t.pillClear || 'CLEAR');
              const loc = localizedCorridors[c.id]?.[lang] || {};
              const name = loc.name || c.name;
              const route = loc.route || c.route;
              const activeAlert = loc.alert || c.activeAlert;

              return (
                <div
                  key={c.id}
                  tabIndex={0}
                  role="button"
                  aria-label={`Select corridor ${name}, status ${c.status}`}
                  className={`item-card ${selectedItem?.data?.id === c.id ? 'selected' : ''}`}
                  onClick={() => setSelectedItem({ type: 'corridor', data: c })}
                  onKeyDown={(e) => e.key === 'Enter' && setSelectedItem({ type: 'corridor', data: c })}
                >
                  <div className="item-card-header">
                    <span className="item-card-title" style={{ fontWeight: 800, fontSize: '0.85rem', color: '#2563EB' }}>{name}</span>
                    <span className={`pill ${c.status}`}>{statusText}</span>
                  </div>
                  <p style={{ fontSize: '0.74rem', color: 'var(--color-muted)', marginTop: '4px', lineHeight: 1.35 }}>
                    {route}
                  </p>
                  {activeAlert && (
                    <p style={{ fontSize: '0.72rem', color: '#D97706', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                      <AlertTriangle size={12} /> {activeAlert}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Active Hazards Panel */}
        <div className="glass-panel" style={{ padding: '14px', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
          <h2 className="section-title" style={{ fontSize: '0.95rem', flexShrink: 0 }}>
            <AlertTriangle size={18} color="#EF4444" />
            {t.activeHazards} ({filteredIncidents.length})
          </h2>

          <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto', paddingRight: '2px' }}>
            {filteredIncidents.length === 0 ? (
              <div className="empty-state-box">
                <Inbox size={28} color="#64748B" />
                <span style={{ fontWeight: 600, fontSize: '0.84rem' }}>No Active Hazards</span>
                <span style={{ fontSize: '0.72rem' }}>Selected region is currently clear.</span>
              </div>
            ) : (
              filteredIncidents.map((inc) => {
                const incStatusText = inc.severity?.toLowerCase() === 'critical' ? (t.pillBlocked || 'BLOCKED') : (t.pillCaution || 'CAUTION');
                const isLiveIncident = Boolean(inc.is_live || inc.dynamodb_confirmed || inc.status === 'SYNCED' || inc.status === 'SUBMITTED');

                return (
                  <div
                    key={inc.id}
                    tabIndex={0}
                    role="button"
                    aria-label={`Select hazard ${inc.title}`}
                    className={`item-card ${selectedItem?.data?.id === inc.id ? 'selected' : ''}`}
                    onClick={() => setSelectedItem({ type: 'incident', data: inc })}
                    onKeyDown={(e) => e.key === 'Enter' && setSelectedItem({ type: 'incident', data: inc })}
                  >
                    <div className="item-card-header">
                      <span className="item-card-title" style={{ fontWeight: 800, fontSize: '0.84rem', color: 'var(--color-text)' }}>{inc.title}</span>
                      <span className={`pill ${inc.severity?.toLowerCase() === 'critical' ? 'blocked' : 'caution'}`}>
                        {incStatusText}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '4px', flexWrap: 'wrap' }}>
                      <span className={`pill ${isLiveIncident ? 'blocked' : 'clear'}`} style={{ fontSize: '0.62rem', padding: '2px 6px', fontWeight: 800 }}>
                        {isLiveIncident ? '🔴 LIVE INCIDENT (AWS DynamoDB)' : 'DEMO DATA'}
                      </span>
                      {inc.type && (
                        <span className="pill clear" style={{ fontSize: '0.62rem', padding: '2px 6px' }}>
                          {inc.type}
                        </span>
                      )}
                    </div>

                    <p style={{ fontSize: '0.74rem', color: 'var(--color-muted)', marginTop: '4px' }}>
                      📍 {inc.locationName || inc.location_name}
                    </p>
                    <p style={{ fontSize: '0.72rem', color: 'var(--color-muted)', marginTop: '2px', lineHeight: 1.35 }}>
                      {inc.description}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Main Map Container Box */}
      <div className="map-container-box">
        <MapContainer
          center={activeCenter}
          zoom={activeZoom}
          scrollWheelZoom={true}
          style={{ width: '100%', height: '100%' }}
        >
          <MapViewCenter center={activeCenter} zoom={activeZoom} />
          
          <TileLayer
            key="osm-unified-tiles"
            attribution={tileAttribution}
            url={tileUrl}
            subdomains={tileSubdomains}
            maxZoom={19}
          />

          {showCorridors && filteredCorridors.map((c) => (
            <Polyline
              key={c.id}
              positions={c.coordinates}
              pathOptions={{
                color: getCorridorColor(c.status),
                weight: c.status === 'blocked' ? 5 : 4,
                dashArray: c.status === 'blocked' ? '8, 8' : undefined,
                opacity: 0.85
              }}
              eventHandlers={{
                click: () => setSelectedItem({ type: 'corridor', data: c })
              }}
            >
              <Popup>
                <div style={{ padding: '4px', color: '#F8FAFC' }}>
                  <strong style={{ fontSize: '0.9rem', color: '#38BDF8' }}>{c.name}</strong>
                  <p style={{ fontSize: '0.8rem', margin: '4px 0', color: 'var(--color-muted)' }}>{c.route}</p>
                  <p style={{ fontSize: '0.78rem', color: '#FBBF24', fontWeight: 600 }}>{c.activeAlert}</p>
                </div>
              </Popup>
            </Polyline>
          ))}

          {showIncidents && filteredIncidents.map((inc) => {
            const isLive = Boolean(inc.is_live || inc.dynamodb_confirmed || inc.status === 'SYNCED' || inc.status === 'SUBMITTED');
            const photoSrc = inc.evidence_url || inc.photoUrl;

            return (
              <Marker
                key={inc.id}
                position={[inc.lat, inc.lng]}
                icon={inc.type?.toLowerCase() === 'flood' ? floodIcon : landslideIcon}
                eventHandlers={{
                  click: () => setSelectedItem({ type: 'incident', data: inc })
                }}
              >
                <Popup>
                  <div style={{ color: '#F8FAFC', maxWidth: '240px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <strong style={{ color: '#FF66B2', fontSize: '0.9rem' }}>{inc.title}</strong>
                    </div>

                    <div style={{ marginBottom: '6px' }}>
                      <span className={`pill ${isLive ? 'blocked' : 'clear'}`} style={{ fontSize: '0.6rem', padding: '1px 5px' }}>
                        {isLive ? '🔴 LIVE INCIDENT (AWS)' : 'DEMO DATA'}
                      </span>
                    </div>

                    <p style={{ fontSize: '0.78rem', color: '#E2E8F0', margin: '4px 0' }}>{inc.description}</p>
                    
                    <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '4px' }}>
                      <div>Type: <strong style={{ color: '#FFF' }}>{inc.type || 'HAZARD'}</strong> • Severity: <strong style={{ color: '#EF4444' }}>{inc.severity}</strong></div>
                      <div>GPS: <code>{inc.lat?.toFixed(4)}, {inc.lng?.toFixed(4)}</code></div>
                      <div>Reporter: {inc.reporter || 'Field Unit'}</div>
                      <div>Status: <strong style={{ color: '#34D399' }}>{inc.status || 'ACTIVE'}</strong></div>
                      {inc.timestamp && <div>Time: {new Date(inc.timestamp).toLocaleTimeString()}</div>}
                    </div>

                    {photoSrc && (
                      <div style={{ marginTop: '6px' }}>
                        <img
                          src={photoSrc}
                          alt="Evidence"
                          style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.2)' }}
                        />
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {showFleets && filteredFleets.map((f) => (
            <Marker
              key={f.id}
              position={[f.lat, f.lng]}
              icon={truckIcon}
              eventHandlers={{
                click: () => setSelectedItem({ type: 'fleet', data: f })
              }}
            >
              <Popup>
                <div style={{ color: '#F8FAFC', maxWidth: '240px' }}>
                  <strong style={{ color: '#38BDF8', fontSize: '0.92rem' }}>🚚 {f.id}</strong>
                  <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#FFF' }}>{f.category}</p>
                  <p style={{ fontSize: '0.76rem', color: '#94A3B8' }}>Payload: {f.payload}</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginTop: '6px', background: 'rgba(255,255,255,0.06)', padding: '6px', borderRadius: '6px' }}>
                    <div>Speed: <strong style={{ color: '#00F2FE' }}>{f.speedKm} km/h</strong></div>
                    <div>Temp: <strong style={{ color: f.cargoTempC < 10 ? '#34D399' : '#FBBF24' }}>{f.cargoTempC}°C</strong></div>
                  </div>
                  <p style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: '4px' }}>ETA: {f.eta}</p>
                  <button
                    onClick={() => triggerSOSAlert(f.id, "Emergency assistance requested from live map popup")}
                    className="sos-pulse-btn"
                    style={{
                      marginTop: '8px',
                      width: '100%',
                      minHeight: '36px',
                      border: 'none',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    🚨 Trigger SOS Alert
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}

          {(backendHubs.length > 0 ? backendHubs : hubLocations).map((hub, idx) => (
            <Marker key={hub.id || idx} position={[hub.lat, hub.lng]} icon={hubIcon}>
              <Popup>
                <div style={{ color: '#F8FAFC' }}>
                  <strong style={{ color: '#C084FC' }}>🏬 {hub.name || hub.id}</strong>
                  <p style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '2px' }}>
                    Regional Supply Node ({hub.state}) {hub.elevation_m ? `• ${hub.elevation_m}m Alt` : ''}
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {selectedItem && (
          <div className="map-inspector-banner" role="region" aria-label="Map Inspector Panel">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {selectedItem.type === 'fleet' && <Truck size={22} color="#00F2FE" />}
              {selectedItem.type === 'incident' && <AlertTriangle size={22} color="#FF2E93" />}
              {selectedItem.type === 'corridor' && <Navigation size={22} color="#10B981" />}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: '0.92rem', color: 'var(--color-text)' }}>
                    {selectedItem.type === 'fleet' ? selectedItem.data.id : selectedItem.data.name || selectedItem.data.title}
                  </strong>
                  <span className={`pill ${selectedItem.data.status || selectedItem.data.severity || 'clear'}`}>
                    {selectedItem.type.toUpperCase()} • {selectedItem.data.status || selectedItem.data.severity}
                  </span>

                  {selectedItem.type === 'incident' && (
                    <span className={`pill ${(selectedItem.data.is_live || selectedItem.data.dynamodb_confirmed || selectedItem.data.status === 'SYNCED' || selectedItem.data.status === 'SUBMITTED') ? 'blocked' : 'clear'}`} style={{ fontSize: '0.64rem', fontWeight: 800 }}>
                      {(selectedItem.data.is_live || selectedItem.data.dynamodb_confirmed || selectedItem.data.status === 'SYNCED' || selectedItem.data.status === 'SUBMITTED') ? '🔴 LIVE INCIDENT (AWS DynamoDB)' : 'DEMO DATA'}
                    </span>
                  )}
                </div>

                <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginTop: '2px' }}>
                  {selectedItem.data.route || selectedItem.data.locationName || selectedItem.data.location_name || selectedItem.data.currentLocationName || selectedItem.data.description}
                </p>

                {selectedItem.type === 'incident' && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)', display: 'flex', gap: '12px', marginTop: '4px', flexWrap: 'wrap' }}>
                    <span>📍 GPS: <code>{selectedItem.data.lat?.toFixed(4)}, {selectedItem.data.lng?.toFixed(4)}</code></span>
                    <span>Officer: <strong>{selectedItem.data.reporter || 'Field Unit'}</strong></span>
                    <span>Status: <strong>{selectedItem.data.status || 'ACTIVE'}</strong></span>
                    {(selectedItem.data.evidence_url || selectedItem.data.photoUrl) && (
                      <span style={{ color: '#10B981', fontWeight: 700 }}>📷 S3 Evidence Attached</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {selectedItem.type === 'incident' && (
                <button
                  onClick={handleGenerateAI}
                  disabled={loadingAi}
                  className="btn-primary"
                  style={{
                    background: 'linear-gradient(135deg, #7C3AED 0%, #6366F1 100%)',
                    padding: '6px 14px',
                    fontSize: '0.78rem',
                    width: 'auto',
                    minHeight: '36px',
                    boxShadow: '0 0 10px rgba(124, 58, 237, 0.4)'
                  }}
                >
                  <Sparkles size={14} className={loadingAi ? "animate-spin" : ""} />
                  {loadingAi ? "Analyzing with Amazon Bedrock..." : "AI Intelligence (Bedrock)"}
                </button>
              )}
              {selectedItem.type === 'fleet' && (
                <button
                  onClick={() => triggerSOSAlert(selectedItem.data.id, "Inspector Escort Dispatched")}
                  className="btn-primary sos-pulse-btn"
                  style={{ padding: '6px 14px', fontSize: '0.78rem', width: 'auto', minHeight: '36px' }}
                >
                  <ShieldAlert size={14} /> SOS Escort
                </button>
              )}
              <button
                onClick={() => setSelectedItem(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-muted)',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  minHeight: '36px'
                }}
              >
                Dismiss
              </button>
            </div>

            {/* AI Intelligence Output Block */}
            {selectedItem.type === 'incident' && aiIntelligence && (
              <div style={{
                marginTop: '12px',
                paddingTop: '12px',
                borderTop: '1px solid var(--color-border)',
                gridColumn: '1 / -1',
                width: '100%'
              }}>
                <div style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  background: 'rgba(245, 158, 11, 0.15)',
                  border: '1px solid #F59E0B',
                  color: '#FBBF24',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginBottom: '10px'
                }}>
                  <Info size={14} />
                  <span>{aiIntelligence.disclaimer || "⚠️ AI-Assisted Incident Intelligence — Requires Human Field Officer Verification."}</span>
                </div>

                {aiIntelligence.available === false ? (
                  <div style={{ padding: '10px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #EF4444', borderRadius: '6px', color: '#FCA5A5', fontSize: '0.76rem' }}>
                    ⚠️ {aiIntelligence.error_message || "Amazon Bedrock AI service is unconfigured or unavailable in this environment."}
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px', fontSize: '0.76rem', color: 'var(--color-text)' }}>
                    <div style={{ background: 'var(--color-surface)', padding: '10px', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
                      <strong style={{ color: '#A78BFA', fontSize: '0.78rem' }}>Summary:</strong>
                      <p style={{ margin: '4px 0 0 0', color: 'var(--color-text)', lineHeight: 1.4 }}>{aiIntelligence.summary}</p>
                    </div>

                    <div style={{ background: 'var(--color-surface)', padding: '10px', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
                      <strong style={{ color: '#F87171', fontSize: '0.78rem' }}>Potential Operational Impact:</strong>
                      <p style={{ margin: '4px 0 0 0', color: 'var(--color-text)', lineHeight: 1.4 }}>{aiIntelligence.potential_operational_impact}</p>
                    </div>

                    {aiIntelligence.verification_questions?.length > 0 && (
                      <div style={{ background: 'var(--color-surface)', padding: '10px', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
                        <strong style={{ color: '#FBBF24', fontSize: '0.78rem' }}>Questions to Verify on Ground:</strong>
                        <ul style={{ margin: '4px 0 0 16px', padding: 0, color: 'var(--color-text)', lineHeight: 1.35 }}>
                          {aiIntelligence.verification_questions.map((q, idx) => (
                            <li key={idx}>{q}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {aiIntelligence.suggested_response_actions?.length > 0 && (
                      <div style={{ background: 'var(--color-surface)', padding: '10px', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
                        <strong style={{ color: '#34D399', fontSize: '0.78rem' }}>Suggested Response Actions:</strong>
                        <ul style={{ margin: '4px 0 0 16px', padding: 0, color: 'var(--color-text)', lineHeight: 1.35 }}>
                          {aiIntelligence.suggested_response_actions.map((act, idx) => (
                            <li key={idx}>{act}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Single Unified Map Control Dock (Top Right) */}
        <div className="glass-panel map-overlay-card" style={{ width: '225px', padding: '10px 12px', zIndex: 800 }}>
          {/* Tab Switcher */}
          <div style={{ display: 'flex', gap: '3px', background: 'var(--color-surface)', padding: '3px', borderRadius: '7px', marginBottom: '8px', border: '1px solid var(--color-border)' }}>
            <button
              onClick={() => setDockTab('layers')}
              style={{ flex: 1, padding: '4px 6px', fontSize: '0.7rem', fontWeight: 800, border: 'none', borderRadius: '5px', cursor: 'pointer', background: dockTab === 'layers' ? '#2563EB' : 'transparent', color: dockTab === 'layers' ? '#FFF' : 'var(--color-muted)', transition: 'all 0.15s ease', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
            >
              <Layers size={12} /> {t.gisLayerControls || "Layers"}
            </button>
            <button
              onClick={() => setDockTab('legend')}
              style={{ flex: 1, padding: '4px 6px', fontSize: '0.7rem', fontWeight: 800, border: 'none', borderRadius: '5px', cursor: 'pointer', background: dockTab === 'legend' ? '#2563EB' : 'transparent', color: dockTab === 'legend' ? '#FFF' : 'var(--color-muted)', transition: 'all 0.15s ease', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
            >
              <HelpCircle size={12} /> {t.mapLegendTitle ? "Legend" : "Legend"}
            </button>
          </div>

          {dockTab === 'layers' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div className="overlay-toggle">
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertTriangle size={14} color="#EF4444" /> {t.hazardPins}
                </span>
                <label className="switch">
                  <input type="checkbox" checked={showIncidents} onChange={(e) => setShowIncidents(e.target.checked)} />
                  <span className="slider"></span>
                </label>
              </div>
              <div className="overlay-toggle">
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Truck size={14} color="#06B6D4" /> {t.convoyFleets}
                </span>
                <label className="switch">
                  <input type="checkbox" checked={showFleets} onChange={(e) => setShowFleets(e.target.checked)} />
                  <span className="slider"></span>
                </label>
              </div>
              <div className="overlay-toggle">
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Navigation size={14} color="#10B981" /> {t.highways}
                </span>
                <label className="switch">
                  <input type="checkbox" checked={showCorridors} onChange={(e) => setShowCorridors(e.target.checked)} />
                  <span className="slider"></span>
                </label>
              </div>
              <div className="overlay-toggle">
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CloudRain size={14} color="#3B82F6" /> {t.rainfallOverlay}
                </span>
                <label className="switch">
                  <input type="checkbox" checked={showWeatherOverlay} onChange={(e) => setShowWeatherOverlay(e.target.checked)} />
                  <span className="slider"></span>
                </label>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '0.7rem', color: 'var(--color-text)', paddingTop: '2px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#06B6D4', display: 'inline-block' }}></span>
                <span>{t.legendFleets || "🚚 Active Convoy"}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#EF4444', display: 'inline-block' }}></span>
                <span>{t.legendLandslide || "🚨 Landslide Hazard"}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#3B82F6', display: 'inline-block' }}></span>
                <span>{t.legendFlood || "💧 Flash Flood Alert"}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#8B5CF6', display: 'inline-block' }}></span>
                <span>{t.legendHub || "🏬 Essential Supply Hub"}</span>
              </div>
              <div style={{ height: '1px', background: '#E6DFD3', margin: '2px 0' }}></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '16px', height: '3px', background: '#10B981', borderRadius: '2px', display: 'inline-block' }}></span>
                <span>{t.legendClearRoute || "Clear Highway"}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '16px', height: '3px', background: '#F59E0B', borderRadius: '2px', display: 'inline-block' }}></span>
                <span>{t.legendCautionRoute || "Caution Highway"}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '16px', height: '3px', background: '#EF4444', borderRadius: '2px', display: 'inline-block' }}></span>
                <span>{t.legendBlockedRoute || "Blocked Highway"}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Telemetry & Fleet Sidebar */}
      <div className="sidebar-panel">
        <div className="glass-panel" style={{ padding: '16px', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <h2 className="section-title" style={{ fontSize: '0.95rem', flexShrink: 0 }}>
            <Truck size={18} color="#06B6D4" />
            {t.activeConvoys || "Active Convoys"} ({filteredFleets.length})
          </h2>

          <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto', paddingRight: '2px' }}>
            {filteredFleets.length === 0 ? (
              <div className="empty-state-box">
                <Inbox size={28} color="#64748B" />
                <span style={{ fontWeight: 600, fontSize: '0.84rem' }}>No Convoys Active</span>
              </div>
            ) : (
              filteredFleets.map((f) => {
              const statusText = f.status === 'blocked' || f.status === 'emergency' ? (t.pillBlocked || 'BLOCKED') : f.status === 'delayed' || f.status === 'rerouting' || f.status === 'caution' ? (t.pillCaution || 'CAUTION') : (t.pillClear || 'CLEAR');
              const loc = localizedFleets[f.id]?.[lang] || {};
              const category = loc.category || f.category;
              const locationName = loc.location || f.currentLocationName;

              return (
                <div
                  key={f.id}
                  tabIndex={0}
                  role="button"
                  aria-label={`Select vehicle convoy ${f.id}`}
                  className={`item-card ${selectedItem?.data?.id === f.id ? 'selected' : ''}`}
                  onClick={() => setSelectedItem({ type: 'fleet', data: f })}
                  onKeyDown={(e) => e.key === 'Enter' && setSelectedItem({ type: 'fleet', data: f })}
                  style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}
                >
                  <div className="item-card-header">
                    <span className="item-card-title" style={{ fontWeight: 800, fontSize: '0.88rem', color: '#2563EB' }}>
                      {f.id}
                    </span>
                    <span className={`pill ${f.status === 'emergency' || f.status === 'blocked' ? 'blocked' : f.status === 'delayed' || f.status === 'rerouting' ? 'caution' : 'clear'}`}>
                      {statusText}
                    </span>
                  </div>

                  <p style={{ fontSize: '0.78rem', color: 'var(--color-text)', fontWeight: 700, marginTop: '2px' }}>
                    {category}
                  </p>
                  <p style={{ fontSize: '0.72rem', color: 'var(--color-muted)', lineHeight: 1.3 }}>
                    📍 {locationName}
                  </p>

                  <div className="telemetry-grid">
                    <div className="telemetry-stat">
                      <div className="stat-val">
                        {f.speedKm} <span style={{ fontSize: '0.66rem' }}>{t.kmhUnit || "km/h"}</span>
                      </div>
                      <div className="stat-lbl">{t.speed}</div>
                    </div>
                    <div className="telemetry-stat">
                      <div className="stat-val" style={{ color: f.cargoTempC < 10 ? '#059669' : '#D97706' }}>
                        {f.cargoTempC}°C
                      </div>
                      <div className="stat-lbl">{t.cargoTemp}</div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '0.72rem', color: 'var(--color-muted)', marginTop: '4px', paddingTop: '4px', borderTop: '1px solid #E8E0D2' }}>
                    <div>
                      <div style={{ fontSize: '0.66rem', color: 'var(--color-muted)' }}>{t.eta}:</div>
                      <div style={{ fontWeight: 800, color: f.status === 'delayed' ? '#D97706' : 'var(--color-text)' }}>{f.eta}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.66rem', color: 'var(--color-muted)' }}>{t.driverLine || "Driver"}:</div>
                      <div style={{ fontWeight: 800, color: 'var(--color-text)' }}>{f.driver}</div>
                    </div>
                  </div>
                </div>
              );
            })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
