import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useApp } from '../context/AppContext';
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
                const incStatusText = inc.severity === 'critical' ? (t.pillBlocked || 'BLOCKED') : (t.pillCaution || 'CAUTION');

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
                      <span className={`pill ${inc.severity === 'critical' ? 'blocked' : 'caution'}`}>
                        {incStatusText}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.74rem', color: 'var(--color-muted)', marginTop: '3px' }}>
                      📍 {inc.locationName}
                    </p>
                    <p style={{ fontSize: '0.72rem', color: 'var(--color-muted)', marginTop: '3px', lineHeight: 1.35 }}>
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

          {showIncidents && filteredIncidents.map((inc) => (
            <Marker
              key={inc.id}
              position={[inc.lat, inc.lng]}
              icon={inc.type === 'flood' ? floodIcon : landslideIcon}
              eventHandlers={{
                click: () => setSelectedItem({ type: 'incident', data: inc })
              }}
            >
              <Popup>
                <div style={{ color: '#F8FAFC', maxWidth: '220px' }}>
                  <strong style={{ color: '#FF66B2', fontSize: '0.9rem' }}>{inc.title}</strong>
                  <p style={{ fontSize: '0.78rem', marginTop: '4px', color: '#E2E8F0' }}>{inc.description}</p>
                  <p style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: '4px' }}>
                    Reporter: {inc.reporter}
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}

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

          {hubLocations.map((hub, idx) => (
            <Marker key={idx} position={[hub.lat, hub.lng]} icon={hubIcon}>
              <Popup>
                <div style={{ color: '#F8FAFC' }}>
                  <strong style={{ color: '#C084FC' }}>🏬 {hub.name}</strong>
                  <p style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '2px' }}>Regional Supply Node ({hub.state})</p>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <strong style={{ fontSize: '0.92rem', color: 'var(--color-text)' }}>
                    {selectedItem.type === 'fleet' ? selectedItem.data.id : selectedItem.data.name || selectedItem.data.title}
                  </strong>
                  <span className={`pill ${selectedItem.data.status || selectedItem.data.severity || 'clear'}`}>
                    {selectedItem.type.toUpperCase()} • {selectedItem.data.status || selectedItem.data.severity}
                  </span>
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginTop: '2px' }}>
                  {selectedItem.data.route || selectedItem.data.locationName || selectedItem.data.currentLocationName || selectedItem.data.description}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
