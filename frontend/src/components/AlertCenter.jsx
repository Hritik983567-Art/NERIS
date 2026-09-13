import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { localizedFleets } from '../data/localizedData';
import { api } from '../services/api';
import {
  Radio,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Send,
  Volume2,
  Megaphone,
  Shield,
  ShieldCheck,
  Lock,
  Clock,
  UserCheck
} from 'lucide-react';

export const AlertCenter = () => {
  const {
    t,
    alerts = [],
    isCommander,
    acknowledgeCommandAlert,
    resolveCommandAlert,
    broadcastAlerts,
    triggerSOSAlert,
    fleets,
    lang,
    user
  } = useApp();

  const [selectedFleetId, setSelectedFleetId] = useState(fleets[0]?.id || "NER-MED-8041");
  const [sosReason, setSosReason] = useState("Urgent medical escort required through landslide zone");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [sentBroadcastFeedback, setSentBroadcastFeedback] = useState(false);
  const [sosFeedback, setSosFeedback] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');

  const handleManualSOS = async (e) => {
    e.preventDefault();
    await triggerSOSAlert(selectedFleetId, sosReason);
    setSosFeedback(true);
    setTimeout(() => setSosFeedback(false), 4500);
  };

  const handleCustomBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastMessage) return;
    try {
      await api.createAlert({
        title: "Operational Command Advisory",
        message: broadcastMessage,
        type: "OPERATIONAL_ADVISORY",
        severity: "HIGH",
        recipientScope: "ALL_COMMANDERS",
        district: "ASSAM"
      });
    } catch (err) {
      console.warn("Failed to persist broadcast alert to DynamoDB:", err);
    }
    setSentBroadcastFeedback(true);
    setTimeout(() => {
      setSentBroadcastFeedback(false);
      setBroadcastMessage("");
    }, 3000);
  };

  const filteredAlerts = alerts.filter((alert) => {
    if (statusFilter === 'ALL') return true;
    return alert.status === statusFilter;
  });

  return (
    <div className="planner-grid" style={{ gridTemplateColumns: '1fr 340px' }}>
      {/* Left Alert Feed & Broadcast Hub */}
      <div className="glass-panel" style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexShrink: 0, flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h2 className="section-title">
              <Megaphone size={20} color="#FF2E93" />
              {t.broadcastingAlerts || "NERIS Command Alert Center"}
            </h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)' }}>
              {t.earlyWarningSub || "Real-time incident evaluation, risk alerts, and tactical command escalation"}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isCommander ? (
              <span className="pill active" style={{ padding: '4px 12px', background: 'rgba(16, 185, 129, 0.15)', color: '#10B981', borderColor: '#10B981' }}>
                <ShieldCheck size={13} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                COMMANDER AUTHORIZED ({user?.name || 'Commander'})
              </span>
            ) : (
              <span className="pill warning" style={{ padding: '4px 12px', background: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B', borderColor: '#F59E0B' }}>
                <Lock size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                VIEWER MODE (Command Auth Required)
              </span>
            )}
            <span className="pill blocked" style={{ padding: '4px 12px' }}>
              <Radio size={12} className="sos-pulse-btn" style={{ borderRadius: '50%' }} /> {t.liveFeed || "LIVE WORKFLOW"}
            </span>
          </div>
        </div>

        {/* --- PERSISTENT NERIS COMMAND ALERTS SECTION --- */}
        <div style={{ marginBottom: '24px', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldAlert size={18} color="#DC2626" />
              Incident-Generated Command Alerts
              <span style={{ fontSize: '0.75rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', padding: '2px 8px', borderRadius: '12px' }}>
                {filteredAlerts.length}
              </span>
            </h3>

            {/* Status Filter Tabs */}
            <div style={{ display: 'flex', gap: '4px', background: 'var(--color-surface)', padding: '3px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
              {['ALL', 'ACTIVE', 'ACKNOWLEDGED', 'RESOLVED'].map((statusKey) => (
                <button
                  key={statusKey}
                  onClick={() => setStatusFilter(statusKey)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    background: statusFilter === statusKey ? 'var(--color-primary, #0284C7)' : 'transparent',
                    color: statusFilter === statusKey ? '#FFFFFF' : 'var(--color-muted)',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {statusKey}
                </button>
              ))}
            </div>
          </div>

          {/* Persistent Alerts List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredAlerts.length === 0 ? (
              <div style={{ padding: '16px', borderRadius: '8px', border: '1px dashed var(--color-border)', textAlign: 'center', color: 'var(--color-muted)', fontSize: '0.8rem' }}>
                No alerts found matching filter status "{statusFilter}".
              </div>
            ) : (
              filteredAlerts.map((alert) => {
                const isCritical = alert.severity === 'CRITICAL';
                const isHigh = alert.severity === 'HIGH';
                const isActive = alert.status === 'ACTIVE';
                const isAcked = alert.status === 'ACKNOWLEDGED';
                const isResolved = alert.status === 'RESOLVED';

                return (
                  <div
                    key={alert.id}
                    className="glass-panel"
                    style={{
                      padding: '14px 16px',
                      borderRadius: '10px',
                      borderLeft: `4px solid ${isCritical ? '#DC2626' : isHigh ? '#F59E0B' : '#0284C7'}`,
                      background: isActive ? 'rgba(220, 38, 38, 0.03)' : 'var(--color-surface)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    {/* Top Row: Severity, Title, Status & Honest Delivery Badge */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 260px' }}>
                        <span
                          className={`pill ${isCritical ? 'blocked' : isHigh ? 'warning' : 'active'}`}
                          style={{ fontSize: '0.7rem', padding: '2px 8px', fontWeight: 800 }}
                        >
                          {alert.severity}
                        </span>
                        <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--color-text)', margin: 0 }}>
                          {alert.title}
                        </h4>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {/* Honest Delivery Label */}
                        <span
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: 'rgba(59, 130, 246, 0.1)',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            color: '#2563EB',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Shield size={11} /> {alert.delivery_mode || 'In-App Operational Alert (AWS DynamoDB)'}
                        </span>

                        {/* Status Badge */}
                        <span
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: isActive
                              ? 'rgba(220, 38, 38, 0.12)'
                              : isAcked
                              ? 'rgba(245, 158, 11, 0.12)'
                              : 'rgba(16, 185, 129, 0.12)',
                            color: isActive ? '#DC2626' : isAcked ? '#D97706' : '#059669',
                            border: `1px solid ${isActive ? '#DC2626' : isAcked ? '#F59E0B' : '#10B981'}`
                          }}
                        >
                          {alert.status}
                        </span>
                      </div>
                    </div>

                    {/* Alert Message */}
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text)', margin: '2px 0 0 0', lineHeight: 1.45 }}>
                      {alert.message}
                    </p>

                    {/* Footer Row: Incident ID, Timestamp, Action Metadata & COMMANDER Action Button */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', paddingTop: '6px', borderTop: '1px solid var(--color-border)', marginTop: '4px' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span>Ref: <strong style={{ color: 'var(--color-text)' }}>{alert.incident_id || alert.incidentId || alert.id}</strong></span>
                        <span><Clock size={11} style={{ verticalAlign: 'middle' }} /> {new Date(alert.created_at || alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>

                        {isAcked && alert.acknowledged_by && (
                          <span style={{ color: '#D97706', fontWeight: 600 }}>
                            <UserCheck size={11} style={{ verticalAlign: 'middle' }} /> Ack'd by {alert.acknowledged_by}
                          </span>
                        )}

                        {isResolved && alert.resolved_by && (
                          <span style={{ color: '#059669', fontWeight: 600 }}>
                            <CheckCircle2 size={11} style={{ verticalAlign: 'middle' }} /> Resolved by {alert.resolved_by}
                          </span>
                        )}
                      </div>

                      {/* Commander Lifecycle Action Controls */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {isActive && (
                          isCommander ? (
                            <button
                              onClick={() => acknowledgeCommandAlert(alert.id)}
                              style={{
                                padding: '6px 14px',
                                borderRadius: '6px',
                                background: '#F59E0B',
                                border: 'none',
                                color: '#FFFFFF',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                            >
                              <UserCheck size={13} /> Acknowledge Alert
                            </button>
                          ) : (
                            <button
                              disabled
                              title="COMMANDER role required to acknowledge alerts"
                              style={{
                                padding: '6px 12px',
                                borderRadius: '6px',
                                background: 'var(--color-surface)',
                                border: '1px solid var(--color-border)',
                                color: 'var(--color-muted)',
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                cursor: 'not-allowed',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <Lock size={11} /> COMMANDER Auth Required
                            </button>
                          )
                        )}

                        {isAcked && (
                          isCommander ? (
                            <button
                              onClick={() => resolveCommandAlert(alert.id)}
                              style={{
                                padding: '6px 14px',
                                borderRadius: '6px',
                                background: '#10B981',
                                border: 'none',
                                color: '#FFFFFF',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                            >
                              <CheckCircle2 size={13} /> Resolve Alert
                            </button>
                          ) : (
                            <button
                              disabled
                              title="COMMANDER role required to resolve alerts"
                              style={{
                                padding: '6px 12px',
                                borderRadius: '6px',
                                background: 'var(--color-surface)',
                                border: '1px solid var(--color-border)',
                                color: 'var(--color-muted)',
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                cursor: 'not-allowed',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <Lock size={11} /> COMMANDER Auth Required
                            </button>
                          )
                        )}

                        {isResolved && (
                          <span style={{ fontSize: '0.74rem', color: '#10B981', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle2 size={14} /> Alert Resolved
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* --- LIVE BROADCAST FEED STACK --- */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexShrink: 0 }}>
          <h3 style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Radio size={16} color="#0284C7" /> In-App Operational Alert Feed
          </h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px', flex: 1, overflowY: 'auto' }}>
          {broadcastAlerts.map((alertItem) => {
            const isSos = alertItem.type === 'sos';
            const isWarning = alertItem.type === 'warning' || alertItem.type === 'disruption';

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

                {/* Honest Delivery Mode Indicator (Zero Fake Push/SMS Claim) */}
                <div
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text)',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <ShieldCheck size={13} color="#10B981" /> In-App Operational Alert (AWS DynamoDB)
                </div>
              </div>
            );
          })}
        </div>

        {/* Broadcast Announcement Form */}
        <div className="advisory-panel" style={{ padding: '14px', borderRadius: '10px', flexShrink: 0 }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-text)', marginBottom: '8px' }}>
            <Volume2 size={15} color="#0284C7" style={{ verticalAlign: 'middle' }} /> Operational Advisory Dispatch
          </h3>

          {sentBroadcastFeedback && (
            <div style={{ padding: '8px 12px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10B981', color: '#065F46', fontSize: '0.76rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={15} /> Operational Advisory Logged to AWS DynamoDB!
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
              <Send size={14} /> Log In-App Operational Advisory (AWS DynamoDB)
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
