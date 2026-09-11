import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  AlertTriangle,
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCircle2,
  Database,
  Camera,
  FileText
} from 'lucide-react';

export const FieldReporter = () => {
  const {
    t,
    isOnline,
    addIncidentReport,
    offlineQueue,
    syncOfflineQueue,
    nerStates
  } = useApp();

  const [title, setTitle] = useState('');
  const [type, setType] = useState('landslide');
  const [severity, setSeverity] = useState('high');
  const [state, setState] = useState('assam');
  const [locationName, setLocationName] = useState('');
  const [lat, setLat] = useState('26.1433');
  const [lng, setLng] = useState('91.7898');
  const [reporter, setReporter] = useState('Inspector R. Gogoi (BRO Division)');
  const [description, setDescription] = useState('');

  const [photoPreview, setPhotoPreview] = useState("https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80");
  const [submitFeedback, setSubmitFeedback] = useState(null);

  const handlePhotoSelect = () => {
    const photos = [
      "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1508873696983-2df515122519?auto=format&fit=crop&w=600&q=80"
    ];
    const random = photos[Math.floor(Math.random() * photos.length)];
    setPhotoPreview(random);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!title || !locationName) {
      alert("Please fill in the incident title and location name.");
      return;
    }

    const report = {
      title,
      type,
      severity,
      state,
      locationName,
      lat,
      lng,
      reporter,
      description: description || "No additional comments provided.",
      photoUrl: photoPreview
    };

    const res = addIncidentReport(report);
    setSubmitFeedback(res);

    setTitle('');
    setLocationName('');
    setDescription('');

    setTimeout(() => {
      setSubmitFeedback(null);
    }, 4000);
  };

  return (
    <div className="planner-grid" style={{ gridTemplateColumns: '1fr 340px' }}>
      {/* Left Form Panel */}
      <div className="glass-panel" style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexShrink: 0, flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h2 className="section-title">
              <AlertTriangle size={20} color="#F59E0B" />
              {t.submitReport}
            </h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)' }}>
              {t.reporterSub || "Geo-tagged field inputs for landslide, flood, and road damage updates"}
            </p>
          </div>

          <div className={`status-badge ${isOnline ? 'online' : 'offline'}`}>
            {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
            {isOnline ? (t.onlineUpload || "Online Upload") : (t.offlineLocalQueue || "Offline Local Queue")}
          </div>
        </div>

        {submitFeedback && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              marginBottom: '14px',
              background: submitFeedback.status === 'synced' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
              border: submitFeedback.status === 'synced' ? '1px solid #10B981' : '1px solid #F59E0B',
              color: submitFeedback.status === 'synced' ? '#34D399' : '#FBBF24',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              flexShrink: 0
            }}
          >
            <CheckCircle2 size={18} />
            <div>
              <strong style={{ fontSize: '0.86rem' }}>
                {submitFeedback.status === 'synced'
                  ? (t.fieldReportUploaded || 'Field Report Uploaded to Central Server!')
                  : (t.savedToOfflineQueue || 'Saved to Local Offline Queue!')}
              </strong>
              <p style={{ fontSize: '0.75rem' }}>
                {submitFeedback.status === 'synced'
                  ? (t.advisoryBroadcasted || 'Broadcast notification & GIS map pin updated in real time.')
                  : (t.offlineNotice || 'Report stored safely in local buffer. Will auto-sync when network returns.')}
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            <div className="form-group">
              <label htmlFor="report-title" className="form-label">{t.incidentHeadline || "Incident Headline / Title *"}</label>
              <input
                id="report-title"
                type="text"
                className="form-input"
                placeholder={t.placeholderHeadline || "e.g. Landslide on NH-27 KM 184"}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="hazard-type" className="form-label">{t.hazardCategory || "Hazard Category"}</label>
              <select
                id="hazard-type"
                className="form-input"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="landslide">🌋 {t.landslideRisk || "Landslide / Rockfall"}</option>
                <option value="flood">🌊 {t.floodAlert || "Flash Flood / River Inundation"}</option>
                <option value="bridge_out">🌉 {t.roadDamage || "Bridge Damage / Washout"}</option>
                <option value="road_damage">🛣 {t.roadDamage || "Road Sinking / Subsidence"}</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
            <div className="form-group">
              <label htmlFor="severity-scale" className="form-label">{t.severityScale || "Severity Scale"}</label>
              <select
                id="severity-scale"
                className="form-input"
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
              >
                <option value="critical">🔴 {t.blocked || "Critical (Total Blockade)"}</option>
                <option value="high">🟠 {t.caution || "High (Single Lane / Heavy Risk)"}</option>
                <option value="medium">🟡 {t.clear || "Medium (Slow Moving)"}</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="state-select-report" className="form-label">{t.selectState}</label>
              <select
                id="state-select-report"
                className="form-input"
                value={state}
                onChange={(e) => setState(e.target.value)}
              >
                {nerStates.filter(s => s.id !== 'all').map((s) => (
                  <option key={s.id} value={s.id}>
                    {(t.stateNames && t.stateNames[s.id]) || s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="location-name" className="form-label">{t.locationLandmark || "Location / Landmark *"}</label>
              <input
                id="location-name"
                type="text"
                className="form-input"
                placeholder={t.placeholderLocation || "e.g. Sonapur Tunnel Section"}
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            <div className="form-group">
              <label htmlFor="geo-lat" className="form-label">{t.geoLat || "Geo-Latitude (GPS)"}</label>
              <input
                id="geo-lat"
                type="text"
                className="form-input"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="geo-lng" className="form-label">{t.geoLng || "Geo-Longitude (GPS)"}</label>
              <input
                id="geo-lng"
                type="text"
                className="form-input"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="reporter-details" className="form-label">{t.reporterDetails || "Reporter Details (Officer / Agency)"}</label>
            <input
              id="reporter-details"
              type="text"
              className="form-input"
              value={reporter}
              onChange={(e) => setReporter(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="incident-desc" className="form-label">{t.detailedDesc || "Detailed Description & Clearance Notes"}</label>
            <textarea
              id="incident-desc"
              className="form-input"
              rows={2}
              placeholder={t.placeholderDesc || "Describe debris volume, deployed BRO machinery, estimated clearance time..."}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t.photoEvidence}</label>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
              <img
                src={photoPreview}
                alt="Incident Preview"
                style={{ width: '90px', height: '55px', borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--color-border)' }}
              />
              <button
                type="button"
                onClick={handlePhotoSelect}
                style={{
                  minHeight: '44px',
                  padding: '8px 14px',
                  borderRadius: '6px',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text)',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Camera size={16} /> {t.capturePhoto}
              </button>
            </div>
          </div>

          <button type="submit" className="btn-primary" style={{ marginTop: 'auto', minHeight: '44px' }}>
            <FileText size={16} />
            {isOnline ? (t.submitReportBtn || "Submit Live Geo-Tagged Report") : (t.saveOfflineBtn || "Save to Offline Queue (No Network)")}
          </button>
        </form>
      </div>

      {/* Right Sidebar: Offline Queue */}
      <div className="sidebar-panel">
        <div className="glass-panel" style={{ padding: '16px', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexShrink: 0 }}>
            <h3 className="section-title" style={{ fontSize: '0.92rem' }}>
              <Database size={16} color="#F59E0B" />
              {t.offlineBuffer}
            </h3>
            <span className="pill caution">{offlineQueue.length} {t.pendingCount || "Pending"}</span>
          </div>

          <p style={{ fontSize: '0.74rem', color: 'var(--color-muted)', marginBottom: '12px', flexShrink: 0 }}>
            {t.offlineNotice || "Reports submitted in remote zero-connectivity zones are preserved locally in IndexedDB/LocalStorage."}
          </p>

          <button
            onClick={syncOfflineQueue}
            disabled={offlineQueue.length === 0 || !isOnline}
            className="btn-primary"
            style={{
              background: isOnline ? 'linear-gradient(135deg, #059669 0%, #10B981 100%)' : '#334155',
              boxShadow: 'none',
              opacity: offlineQueue.length === 0 ? 0.6 : 1,
              flexShrink: 0,
              minHeight: '44px'
            }}
          >
            <RefreshCw size={15} />
            {t.syncNow}
          </button>

          <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto' }}>
            {offlineQueue.length > 0 ? (
              offlineQueue.map((item, idx) => (
                <div key={idx} className="item-card" style={{ borderLeft: '3px solid #B45309' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--color-text)' }}>{item.title}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)' }}>📍 {item.locationName}</div>
                  <div style={{ fontSize: '0.68rem', color: '#FBBF24', marginTop: '3px' }}>{t.savedToOfflineQueue || "Saved locally: Pending Sync"}</div>
                </div>
              ))
            ) : (
              <div style={{ padding: '16px', textAlign: 'center', color: 'var(--color-muted)', fontSize: '0.76rem', background: 'var(--color-surface)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                {t.noOfflinePending || "No pending offline reports. All field inputs are synced with the cloud."}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
