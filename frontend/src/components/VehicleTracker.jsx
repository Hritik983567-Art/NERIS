import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { localizedFleets, localizedVehicles, localizedPayloads, localizedLocations } from '../data/localizedData';
import {
  Truck,
  Thermometer,
  Gauge,
  Fuel,
  Clock,
  Phone,
  ShieldAlert,
  Navigation,
  User,
  Inbox
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export const VehicleTracker = () => {
  const { fleets, stateFilter, triggerSOSAlert, sendTelemetryPing, t, lang } = useApp();

  const filteredFleets = fleets.filter(
    (f) => stateFilter === 'all' || f.state === stateFilter
  );

  const [selectedFleet, setSelectedFleet] = useState(filteredFleets[0] || fleets[0]);
  const [callingDriver, setCallingDriver] = useState(false);
  const [pingingBackend, setPingingBackend] = useState(false);
  const [pingResponse, setPingResponse] = useState(null);

  const handleLivePing = async () => {
    if (!selectedFleet) return;
    setPingingBackend(true);
    setPingResponse(null);
    try {
      const res = await sendTelemetryPing(selectedFleet.id);
      setPingResponse(res || { status: "SUCCESS", hazard_in_proximity: false });
    } catch (err) {
      console.error(err);
    } finally {
      setPingingBackend(false);
    }
  };

  const getVehName = (name) => localizedVehicles[name]?.[lang] || name;
  const getPayName = (name) => localizedPayloads[name]?.[lang] || name;
  const getLocName = (name) => localizedLocations[name]?.[lang] || name;

  return (
    <div className="planner-grid" style={{ gridTemplateColumns: '360px 1fr' }}>
      {/* Fleet List Sidebar */}
      <div className="glass-panel" style={{ padding: '16px', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <h2 className="section-title" style={{ marginBottom: '14px', flexShrink: 0 }}>
          <Truck size={20} color="var(--color-primary)" />
          {t.activeConvoys || "Active Convoys"} ({filteredFleets.length})
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto' }}>
          {filteredFleets.length === 0 ? (
            <div className="empty-state-box">
              <Inbox size={32} color="#64748B" />
              <span style={{ fontWeight: 600, fontSize: '0.86rem' }}>{t.noActiveFleets || "No Active Fleets"}</span>
              <span style={{ fontSize: '0.75rem' }}>{t.noConvoysDispatched || "No convoys are currently dispatched in the selected state."}</span>
            </div>
          ) : (
            filteredFleets.map((f) => {
              const isSelected = selectedFleet?.id === f.id;
              const statusText = f.status === 'emergency' || f.status === 'blocked' ? (t.pillBlocked || 'BLOCKED') : f.status === 'delayed' || f.status === 'rerouting' ? (t.pillCaution || 'CAUTION') : (t.pillClear || 'CLEAR');
              const loc = localizedFleets[f.id]?.[lang] || {};
              const category = loc.category || f.category;
              const locationName = loc.location || f.currentLocationName;

              return (
                <div
                  key={f.id}
                  tabIndex={0}
                  role="button"
                  aria-label={`Select convoy vehicle ${f.id}`}
                  className={`item-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => setSelectedFleet(f)}
                  onKeyDown={(e) => e.key === 'Enter' && setSelectedFleet(f)}
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

      {/* Selected Fleet Telemetry Inspector */}
      {selectedFleet ? (
        <div className="glass-panel" style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          {/* Header Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '14px', borderBottom: '1px solid var(--color-border)', flexShrink: 0, flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#2563EB' }}>{selectedFleet.id}</h2>
                <span className={`pill ${selectedFleet.status === 'emergency' || selectedFleet.status === 'blocked' ? 'blocked' : selectedFleet.status === 'delayed' || selectedFleet.status === 'rerouting' ? 'caution' : 'clear'}`}>
                  {selectedFleet.status === 'emergency' || selectedFleet.status === 'blocked' ? (t.blocked || 'Blocked') : selectedFleet.status === 'delayed' || selectedFleet.status === 'rerouting' ? (t.caution || 'Caution') : (t.clear || 'Clear')}
                </span>
              </div>
              <p style={{ fontSize: '0.84rem', color: 'var(--color-text)', fontWeight: 600, marginTop: '2px' }}>
                {localizedFleets[selectedFleet.id]?.[lang]?.category || selectedFleet.category} — ({getVehName(selectedFleet.vehicleType)})
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={handleLivePing}
                disabled={pingingBackend}
                style={{
                  padding: '8px 14px',
                  fontSize: '0.8rem',
                  borderRadius: '8px',
                  background: pingingBackend ? 'rgba(59, 130, 246, 0.3)' : 'rgba(37, 99, 235, 0.12)',
                  border: '1px solid #2563EB',
                  color: '#2563EB',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Navigation size={15} /> {pingingBackend ? 'Streaming GPS to Backend...' : '⚡ Stream Live GPS Ping'}
              </button>
              <button
                onClick={() => triggerSOSAlert(selectedFleet.id, "Driver requested priority escort & emergency clearance")}
                className="btn-primary sos-pulse-btn"
                style={{ width: 'auto', padding: '8px 16px', fontSize: '0.8rem', minHeight: '44px' }}
              >
                <ShieldAlert size={16} /> {t.triggerSosEscort || "Trigger SOS Escort"}
              </button>
            </div>
          </div>

          {pingResponse && (
            <div style={{
              marginTop: '12px',
              padding: '10px 14px',
              borderRadius: '8px',
              background: pingResponse.hazard_in_proximity ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
              border: pingResponse.hazard_in_proximity ? '1px solid #EF4444' : '1px solid #10B981',
              color: pingResponse.hazard_in_proximity ? '#DC2626' : '#059669',
              fontSize: '0.8rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span>
                {pingResponse.hazard_in_proximity 
                  ? `🚨 ${pingResponse.warning_message || 'Active hazard within 20km! Reroute advised.'}` 
                  : `✅ GPS Telemetry Ingested: Position verified safe on corridor. Speed ${selectedFleet.speedKm} km/h.`}
              </span>
              {pingResponse.recommended_detour_node && (
                <span style={{ fontSize: '0.74rem', background: '#DC2626', color: '#FFF', padding: '2px 8px', borderRadius: '4px' }}>
                  Detour: {pingResponse.recommended_detour_node}
                </span>
              )}
            </div>
          )}

          {/* Telemetry Metric Cards Grid */}
          <div className="stats-cards-row" style={{ marginTop: '14px', flexShrink: 0 }}>
            <div className="glass-panel stat-box">
              <div className="stat-box-icon" style={{ background: 'rgba(0, 242, 254, 0.15)' }}>
                <Gauge size={20} color="#00F2FE" />
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)', textTransform: 'uppercase', fontWeight: 700 }}>{t.vehicleSpeed}</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#2563EB' }}>
                  {selectedFleet.speedKm} <span style={{ fontSize: '0.75rem' }}>{t.kmhUnit || "km/h"}</span>
                </div>
              </div>
            </div>

            <div className="glass-panel stat-box">
              <div className="stat-box-icon" style={{ background: 'rgba(16, 185, 129, 0.15)' }}>
                <Thermometer size={20} color="#10B981" />
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)', textTransform: 'uppercase', fontWeight: 700 }}>{t.cargoTemp}</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: selectedFleet.cargoTempC < 10 ? '#34D399' : '#FBBF24' }}>
                  {selectedFleet.cargoTempC}°C
                </div>
              </div>
            </div>

            <div className="glass-panel stat-box">
              <div className="stat-box-icon" style={{ background: 'rgba(245, 158, 11, 0.15)' }}>
                <Fuel size={20} color="#F59E0B" />
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)', textTransform: 'uppercase', fontWeight: 700 }}>{t.fuelLevel}</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#FBBF24' }}>
                  {selectedFleet.fuelPercent}%
                </div>
              </div>
            </div>

            <div className="glass-panel stat-box">
              <div className="stat-box-icon" style={{ background: 'rgba(168, 85, 247, 0.15)' }}>
                <Clock size={20} color="#A855F7" />
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)', textTransform: 'uppercase', fontWeight: 700 }}>{t.eta}</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-text)' }}>
                  {selectedFleet.eta}
                </div>
              </div>
            </div>
          </div>

          {/* Route & Driver Telemetry Panel */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px', marginTop: '14px', flexShrink: 0 }}>
            <div style={{ padding: '14px', borderRadius: '10px', background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <h3 style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
                <Navigation size={13} style={{ verticalAlign: 'middle' }} /> {t.routeVector}
              </h3>
              <p style={{ fontSize: '0.8rem', marginBottom: '3px' }}>
                {t.origin}: <strong style={{ color: 'var(--color-text)' }}>{getLocName(selectedFleet.origin)}</strong>
              </p>
              <p style={{ fontSize: '0.8rem', marginBottom: '3px' }}>
                {t.destination}: <strong style={{ color: 'var(--color-text)' }}>{getLocName(selectedFleet.destination)}</strong>
              </p>
              <p style={{ fontSize: '0.8rem', marginBottom: '3px' }}>
                {t.currentPos || "Current Pos"}: <strong style={{ color: '#2563EB' }}>{localizedFleets[selectedFleet.id]?.[lang]?.location || selectedFleet.currentLocationName}</strong> ({selectedFleet.lat}, {selectedFleet.lng})
              </p>
              <p style={{ fontSize: '0.78rem', color: 'var(--color-dim)' }}>
                {t.cargoType}: <strong style={{ color: 'var(--color-text)' }}>{getPayName(selectedFleet.payload)}</strong>
              </p>
            </div>

            <div style={{ padding: '14px', borderRadius: '10px', background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <h3 style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
                <User size={13} style={{ verticalAlign: 'middle' }} /> {t.driverLine}
              </h3>
              <p style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '3px' }}>
                👤 {selectedFleet.driver}
              </p>
              <p style={{ fontSize: '0.8rem', color: '#2563EB', marginBottom: '6px' }}>
                📞 {selectedFleet.phone}
              </p>
              <button
                onClick={() => {
                  setCallingDriver(true);
                  setTimeout(() => setCallingDriver(false), 4500);
                }}
                style={{
                  minHeight: '36px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  background: callingDriver ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.15)',
                  border: callingDriver ? '1px solid #10B981' : '1px solid #3B82F6',
                  color: callingDriver ? '#059669' : 'var(--color-primary)',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Phone size={14} /> {callingDriver ? (t.radioLinked || 'Radio Linked...') : t.radioCall}
              </button>
              {callingDriver && (
                <div style={{ marginTop: '8px', padding: '6px 8px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#059669', fontSize: '0.72rem', fontWeight: 600 }}>
                  🎙️ {t.connectingSatellite || "Connecting satellite channel to"} {selectedFleet.driver}...
                </div>
              )}
            </div>
          </div>

          {/* Telemetry Sensor Graph */}
          <div style={{ marginTop: '14px', padding: '14px', borderRadius: '10px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', flex: 1, minHeight: '180px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-muted)', textTransform: 'uppercase', marginBottom: '8px', flexShrink: 0 }}>
              {t.telemetryTrend} ({t.speedVsTemp || "Speed vs Cargo Temperature"})
            </h3>
            <div style={{ width: '100%', flex: 1, minHeight: '140px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={selectedFleet?.telemetryHistory || []}>
                  <XAxis dataKey="time" stroke="var(--color-dim)" fontSize={11} />
                  <YAxis stroke="var(--color-dim)" fontSize={11} />
                  <Tooltip contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
                  <Line type="monotone" dataKey="speed" stroke="#2563EB" strokeWidth={2} name={`${t.speed} (${t.kmhUnit || "km/h"})`} />
                  <Line type="monotone" dataKey="temp" stroke="#10B981" strokeWidth={2} name={`${t.cargoTemp} (°C)`} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-panel empty-state-box" style={{ height: '100%' }}>
          <Inbox size={48} color="#64748B" />
          <h3 style={{ color: 'var(--color-text)' }}>{t.selectConvoyPrompt || "Select a Convoy to View Real-Time Telemetry"}</h3>
        </div>
      )}
    </div>
  );
};
