import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { localizedFleets } from '../data/localizedData';
import {
  Radio,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Send,
  Volume2,
  Megaphone
} from 'lucide-react';

export const AlertCenter = () => {
  const { t, broadcastAlerts, triggerSOSAlert, fleets, lang } = useApp();

  const [selectedFleetId, setSelectedFleetId] = useState(fleets[0]?.id || "NER-MED-8041");
  const [sosReason, setSosReason] = useState("Urgent medical escort required through landslide zone");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [sentBroadcastFeedback, setSentBroadcastFeedback] = useState(false);
  const [sosFeedback, setSosFeedback] = useState(false);
  const [pushedAlertId, setPushedAlertId] = useState(null);

  const handleManualSOS = (e) => {
    e.preventDefault();
    triggerSOSAlert(selectedFleetId, sosReason);
    setSosFeedback(true);
    setTimeout(() => setSosFeedback(false), 4500);
  };

  const handlePushAlert = (id) => {
    setPushedAlertId(id);
    setTimeout(() => setPushedAlertId(null), 3000);
  };

  const handleCustomBroadcast = (e) => {
    e.preventDefault();
    if (!broadcastMessage) return;
    setSentBroadcastFeedback(true);
    setTimeout(() => {
      setSentBroadcastFeedback(false);
      setBroadcastMessage("");
    }, 3000);
  };

  return (
    <div className="planner-grid" style={{ gridTemplateColumns: '1fr 340px' }}>
      {/* Left Alert Feed & Broadcast Hub */}
      <div className="glass-panel" style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexShrink: 0, flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h2 className="section-title">
              <Megaphone size={20} color="#FF2E93" />
              {t.broadcastingAlerts}
            </h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)' }}>
              {t.earlyWarningSub || "Real-time early warning network for transport operators and emergency teams"}
            </p>
          </div>
          <span className="pill blocked" style={{ padding: '4px 12px' }}>
            <Radio size={12} className="sos-pulse-btn" style={{ borderRadius: '50%' }} /> {t.liveFeed || "LIVE FEED"}
          </span>
        </div>

        {/* Live Broadcast Feed Stack */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px', flex: 1, overflowY: 'auto' }}>
          {broadcastAlerts.map((alertItem) => {
            const isSos = alertItem.type === 'sos';
            const isWarning = alertItem.type === 'warning' || alertItem.type === 'disruption';
            const isPushed = pushedAlertId === alertItem.id;

            const localizedTitles = {
              "b-101": {
                en: "RED ALERT: Heavy Rainfall in Dima Hasao & West Siang",
                as: "ৰাঙলী সতৰ্কতা: ডিমা হাছাও আৰু পশ্চিম ছিয়াঙত প্ৰবল বৰষুণ",
                bn: "রেড অ্যালার্ট: ডিমা হাসাও এবং পশ্চিম সিয়াঙে ভারী বৃষ্টিপাত",
                hi: "रेड अलर्ट: डिमा हसाओ एवं पश्चिम सियांग में भारी बारिश",
                mn: "RED ALERT: Dima Hasao ꯑꯃꯁꯨꯡ West Siang ꯗ ꯑꯀꯅꯕ ꯅꯣꯡ ꯆꯨꯕ"
              },
              "b-102": {
                en: "NH-2 Mao Gate Landslide - BRO Machinery Clearance Underway",
                as: "NH-2 মাও গেটত ভূস্খলন - BRO যন্ত্ৰপাতিৰ জৰিয়তে পৰিস্কাৰৰ কাম চলি আছে",
                bn: "NH-2 মাও গেটে পাহাড় ধস - বিআরও যন্ত্রপাতি দিয়ে রাস্তা পরিষ্কার চলছে",
                hi: "NH-2 माओ गेट भूस्खलन - BRO मशीनरी निकासी कार्य प्रगति पर",
                mn: "NH-2 Mao Gate ꯗ ꯂꯩꯕꯥꯛ ꯇꯥꯕ - BRO ꯅꯥ ꯂꯝꯕꯤ ꯁꯦꯡꯕ ꯆꯠꯂꯤ"
              }
            };

            const alertTitle = localizedTitles[alertItem.id]?.[lang] || alertItem.title;

            return (
              <div
                key={alertItem.id}
                className={`alert-banner ${isSos ? 'sos' : isWarning ? 'warning' : 'system'}`}
                style={{ flexWrap: 'wrap', gap: '10px' }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flex: '1 1 200px' }}>
                  {isSos ? (
                    <ShieldAlert size={20} color="#FF2E93" />
                  ) : (
                    <AlertTriangle size={20} color="#F59E0B" />
                  )}
                  <div>
                    <h4 style={{ fontSize: '0.88rem', fontWeight: 800 }}>{alertTitle}</h4>
                    <p style={{ fontSize: '0.74rem', marginTop: '2px', opacity: 0.9 }}>
                      Source: {alertItem.source} • <span style={{ fontWeight: 600 }}>{alertItem.timestamp}</span>
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handlePushAlert(alertItem.id)}
                  className="btn-push-alert"
                  style={{
                    minHeight: '36px',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    background: isPushed ? 'rgba(22, 163, 74, 0.15)' : 'var(--color-surface)',
                    border: isPushed ? '1px solid #10B981' : '1px solid var(--color-border)',
                    color: isPushed ? '#10B981' : 'var(--color-text)',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {isPushed ? (t.pushedSms || '✓ Pushed via SMS') : (t.pushAlert || '📢 Push Alert')}
                </button>
              </div>
            );
          })}
        </div>

        {/* Broadcast Announcement Form */}
        <div className="advisory-panel" style={{ padding: '14px', borderRadius: '10px', flexShrink: 0 }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-text)', marginBottom: '8px' }}>
            <Volume2 size={15} color="#0284C7" style={{ verticalAlign: 'middle' }} /> {t.broadcastAdvisory}
          </h3>

          {sentBroadcastFeedback && (
            <div style={{ padding: '8px 12px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10B981', color: '#065F46', fontSize: '0.76rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={15} /> {t.advisoryBroadcasted || "Advisory broadcasted across all 5 NER languages!"}
            </div>
          )}

          <form onSubmit={handleCustomBroadcast}>
            <div className="form-group">
              <label htmlFor="advisory-input" className="form-label">{t.advisoryMessage || "Advisory Message"}</label>
              <input
                id="advisory-input"
                type="text"
                className="form-input"
                placeholder={t.placeholderAdvisory || "e.g. Weather Alert: Sela Pass closed from 18:00 hrs due to heavy snowfall..."}
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '8px 16px', fontSize: '0.78rem', minHeight: '44px' }}>
              <Send size={14} /> {t.broadcastAdvisoryBtn || "Broadcast Multi-Lingual Advisory"}
            </button>
          </form>
        </div>
      </div>

      {/* Right SOS Emergency Dispatch Control */}
      <div className="sidebar-panel">
        <div className="glass-panel" style={{ padding: '18px', height: '100%', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', flexShrink: 0 }}>
            <ShieldAlert size={22} color="#DC2626" />
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#DC2626' }}>{t.sosDispatch}</h3>
              <p style={{ fontSize: '0.72rem', color: 'var(--color-muted)' }}>{t.emergencyEscalation || "Emergency disaster escalation"}</p>
            </div>
          </div>

          <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: '14px', flexShrink: 0 }}>
            {t.sosSubNotice || "Directly vector military/SDRF escorts and priority BRO clearing teams for stranded medical and essential commodity convoys."}
          </p>

          <form onSubmit={handleManualSOS} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div className="form-group">
              <label htmlFor="sos-fleet-select" className="form-label">{t.targetFleet}</label>
              <select
                id="sos-fleet-select"
                className="form-input"
                value={selectedFleetId}
                onChange={(e) => setSelectedFleetId(e.target.value)}
              >
                {fleets.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.id} — {localizedFleets[f.id]?.[lang]?.category || f.category}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="sos-reason" className="form-label">{t.priorityReason}</label>
              <textarea
                id="sos-reason"
                className="form-input"
                rows={3}
                placeholder={t.placeholderSos || "Urgent medical escort required through landslide zone"}
                value={sosReason}
                onChange={(e) => setSosReason(e.target.value)}
              />
            </div>

            {sosFeedback && (
              <div style={{ padding: '8px 12px', borderRadius: '6px', background: 'rgba(220, 38, 38, 0.12)', border: '1px solid #DC2626', color: '#991B1B', fontSize: '0.76rem', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {t.sosFeedbackText || "🚨 Emergency SOS Vector Dispatched! SDRF & BRO notified."}
              </div>
            )}

            <button type="submit" className="btn-primary sos-pulse-btn" style={{ padding: '12px', marginTop: 'auto', minHeight: '44px' }}>
              <ShieldAlert size={16} />
              {t.sosDispatch}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
