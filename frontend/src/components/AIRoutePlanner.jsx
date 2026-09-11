import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { calculateAIRoutes } from '../data/nerData';
import { localizedVehicles, localizedPayloads, localizedLocations } from '../data/localizedData';
import {
  Navigation,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Send,
  CloudRain,
  Activity
} from 'lucide-react';

export const AIRoutePlanner = () => {
  const { t, lang } = useApp();

  const [origin, setOrigin] = useState("Guwahati Central Depot (Assam)");
  const [destination, setDestination] = useState("Tawang District Hospital (Arunachal Pradesh)");
  const [commodity, setCommodity] = useState("Life-Saving Vaccines & Insulin (Cold-Chain)");
  const [vehicleType, setVehicleType] = useState("Refrigerated 10T Truck");

  const [routeResult, setRouteResult] = useState(() =>
    calculateAIRoutes(origin, destination, commodity)
  );

  const [loading, setLoading] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState("route-ai-safe");
  const [dispatchSuccess, setDispatchSuccess] = useState(false);

  const handleCalculate = (e) => {
    e.preventDefault();
    setLoading(true);
    setDispatchSuccess(false);

    setTimeout(() => {
      const result = calculateAIRoutes(origin, destination, commodity);
      setRouteResult(result);
      setLoading(false);
    }, 650);
  };

  const handleDispatchConvoy = () => {
    setDispatchSuccess(true);
    setTimeout(() => {
      setDispatchSuccess(false);
    }, 4000);
  };

  const getLocName = (name) => localizedLocations[name]?.[lang] || name;
  const getVehName = (name) => localizedVehicles[name]?.[lang] || name;
  const getPayName = (name) => localizedPayloads[name]?.[lang] || name;

  return (
    <div className="planner-grid">
      {/* Left Input Form Panel */}
      <div className="glass-panel" style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <h2 className="section-title" style={{ marginBottom: '16px', flexShrink: 0 }}>
          <Sparkles size={20} color="#00F2FE" />
          {t.aiRoutePlannerEngine || t.navRoutePlanner}
        </h2>

        <form onSubmit={handleCalculate} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div className="form-group">
            <label htmlFor="origin-select" className="form-label">{t.origin}</label>
            <select
              id="origin-select"
              className="form-input"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
            >
              <option value="Guwahati Central Depot (Assam)">{getLocName("Guwahati Central Depot (Assam)")}</option>
              <option value="Shillong Police Bazar / Hub (Meghalaya)">{getLocName("Shillong Police Bazar / Hub (Meghalaya)")}</option>
              <option value="Siliguri / Bagdogra Transit Point (WB-Sikkim Entry)">{getLocName("Siliguri / Bagdogra Transit Point (WB-Sikkim Entry)")}</option>
              <option value="Tezpur Brahmaputra Bridge Checkpoint (Assam)">{getLocName("Tezpur Brahmaputra Bridge Checkpoint (Assam)")}</option>
              <option value="Silchar FCI Hub (Assam)">{getLocName("Silchar FCI Hub (Assam)")}</option>
              <option value="Dimapur Railhead Yard (Nagaland)">{getLocName("Dimapur Railhead Yard (Nagaland)")}</option>
              <option value="Agartala Multi-Modal Hub (Tripura)">{getLocName("Agartala Multi-Modal Hub (Tripura)")}</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="destination-select" className="form-label">{t.destination}</label>
            <select
              id="destination-select"
              className="form-input"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
            >
              <option value="Tawang District Hospital (Arunachal Pradesh)">{getLocName("Tawang District Hospital (Arunachal Pradesh)")}</option>
              <option value="Kaziranga National Park Safari Highway (Assam)">{getLocName("Kaziranga National Park Safari Highway (Assam)")}</option>
              <option value="Cherrapunji & Dawki Border Circuit (Meghalaya)">{getLocName("Cherrapunji & Dawki Border Circuit (Meghalaya)")}</option>
              <option value="Gangtok & Nathu La Pass Circuit (Sikkim)">{getLocName("Gangtok & Nathu La Pass Circuit (Sikkim)")}</option>
              <option value="Imphal & Loktak Lake Tourist Circuit (Manipur)">{getLocName("Imphal & Loktak Lake Tourist Circuit (Manipur)")}</option>
              <option value="Lunglei Remote Buffer Depot (Mizoram)">{getLocName("Lunglei Remote Buffer Depot (Mizoram)")}</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="cargo-select" className="form-label">{t.cargoType}</label>
            <select
              id="cargo-select"
              className="form-input"
              value={commodity}
              onChange={(e) => setCommodity(e.target.value)}
            >
              <option value="Life-Saving Vaccines & Insulin (Cold-Chain)">{getPayName("Life-Saving Vaccines & Insulin (Cold-Chain)")}</option>
              <option value="Fortified Food Grains & Rice (FCI Supply)">{getPayName("Fortified Food Grains & Rice (FCI Supply)")}</option>
              <option value="Liquid Medical Oxygen (Cryogenic Tanker)">{getPayName("Liquid Medical Oxygen (Cryogenic Tanker)")}</option>
              <option value="Bridge & Road Heavy Steel Girders">{getPayName("Bridge & Road Heavy Steel Girders")}</option>
              <option value="Petroleum & Diesel Fuel Supply">{getPayName("Petroleum & Diesel Fuel Supply")}</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="vehicle-select" className="form-label">{t.vehicleTypeLabel || "Fleet Transport Vehicle"}</label>
            <select
              id="vehicle-select"
              className="form-input"
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
            >
              <option value="Refrigerated 10T Truck">{getVehName("Refrigerated 10T Truck")}</option>
              <option value="Heavy Multi-Axle Carrier 25T">{getVehName("Heavy Multi-Axle Carrier 25T")}</option>
              <option value="Hazardous Cryogenic Tanker">{getVehName("Hazardous Cryogenic Tanker")}</option>
              <option value="4x4 All-Terrain Convoy Vehicle">{getVehName("4x4 All-Terrain Convoy Vehicle")}</option>
            </select>
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ marginTop: '10px' }}
          >
            {loading ? (
              <span>{t.runningMlModel || "Running ML Terrain & Disruption Model..."}</span>
            ) : (
              <>
                <Sparkles size={18} />
                {t.calculateRoute}
              </>
            )}
          </button>
        </form>

        <div style={{ marginTop: '20px', padding: '12px 14px', borderRadius: '10px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', flexShrink: 0 }}>
          <h4 style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--color-muted)', marginBottom: '6px', fontWeight: 800 }}>
            <Activity size={14} color="#00F2FE" style={{ verticalAlign: 'middle' }} /> {t.aiPredictionParams || "AI Prediction Parameters"}
          </h4>
          <ul style={{ fontSize: '0.76rem', color: 'var(--color-muted)', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '4px', paddingLeft: 0 }}>
            <li>• {t.paramImdRadar || "Real-time IMD Weather Radar Feed"}</li>
            <li>• {t.paramSlopeIncline || "Slope Incline & Historical Landslide Index"}</li>
            <li>• {t.paramGeoReports || "Geo-tagged Field Incident Reports from PWD/BRO"}</li>
            <li>• {t.paramColdChainReserve || "Cold-Chain Battery & Fuel Reserve Estimation"}</li>
          </ul>
        </div>
      </div>

      {/* Right Results Panel */}
      <div className="glass-panel" style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexShrink: 0 }}>
          <div>
            <h2 className="section-title">
              <Navigation size={20} color="#10B981" />
              {t.aiRouteRecs}
            </h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginTop: '2px' }}>
              {t.origin}: <strong style={{ color: 'var(--color-text)' }}>{getLocName(routeResult.origin)}</strong> ➔ {t.destination}: <strong style={{ color: 'var(--color-text)' }}>{getLocName(routeResult.destination)}</strong>
            </p>
          </div>
          <span className={`pill ${routeResult.aiRiskIndex > 50 ? 'caution' : 'clear'}`} style={{ fontSize: '0.8rem', padding: '4px 10px' }}>
            {t.aiRiskScoreLabel || "AI Risk Score"}: {routeResult.aiRiskIndex}/100
          </span>
        </div>

        {/* Live Weather Forecast Bar */}
        <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(0, 242, 254, 0.08)', border: '1px solid rgba(0, 242, 254, 0.25)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          <CloudRain size={20} color="#00F2FE" />
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#2563EB' }}>{t.liveWeatherStatus || "Live Corridor Weather Status"}</div>
            <div style={{ fontSize: '0.76rem', color: 'var(--color-text)' }}>
              {routeResult.aiRiskIndex > 50 ? (t.heavyRainfall || routeResult.weatherAlert) : routeResult.weatherAlert}
            </div>
          </div>
        </div>

        {/* Route Stack or Skeleton Loader */}
        {loading ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="skeleton-card" style={{ height: '110px' }} />
            <div className="skeleton-card" style={{ height: '110px' }} />
            <div className="skeleton-card" style={{ height: '110px' }} />
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {routeResult.routes.map((r) => {
              const isRecommended = r.id === 'route-ai-safe';
              const isSelected = selectedRouteId === r.id;
              const routeStatusText = r.status === 'blocked' ? (t.blocked || 'Blocked') : r.status === 'caution' ? (t.caution || 'Caution') : (t.clear || 'Clear');

              const routeName = r.id === 'route-primary' ? (t.primaryHighwayCorridor || r.name) : r.id === 'route-ai-safe' ? (t.aiOptimizedSafeRoute || r.name) : (t.emergencyTacticalDetour || r.name);
              const routeVia = r.id === 'route-primary' ? (t.viaDirectNationalHighway || r.via) : r.id === 'route-ai-safe' ? (t.viaAllWeatherTunnel || r.via) : (t.viaSecondaryStateHighway || r.via);
              const routeQuality = r.id === 'route-primary' ? (t.pavedHighwaySlopes || r.roadQuality) : r.id === 'route-ai-safe' ? (t.reinforcedRidgeRoad || r.roadQuality) : (t.viaSecondaryStateHighway || r.roadQuality);

              const riskText = r.landslideRisk.includes("78%") ? (t.probHigh || r.landslideRisk) : (t.probLow || r.landslideRisk);

              return (
                <div
                  key={r.id}
                  tabIndex={0}
                  role="button"
                  aria-label={`Route option ${routeName}`}
                  className={`route-card ${isRecommended ? 'recommended' : ''}`}
                  style={{
                    borderColor: isSelected ? 'var(--color-primary)' : undefined,
                    cursor: 'pointer'
                  }}
                  onClick={() => setSelectedRouteId(r.id)}
                  onKeyDown={(e) => e.key === 'Enter' && setSelectedRouteId(r.id)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.95rem', color: isRecommended ? '#10B981' : 'var(--color-text)' }}>
                        {routeName}
                      </span>
                      {isRecommended && (
                        <span className="pill clear" style={{ background: '#10B981', color: '#FFF' }}>
                          <ShieldCheck size={12} /> {t.bestSlaSafest || "BEST SLA SAFEST"}
                        </span>
                      )}
                    </div>
                    <span className={`pill ${r.status}`}>{routeStatusText}</span>
                  </div>

                  <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginTop: '4px' }}>
                    {t.viaLabel || "Via"}: {routeVia}
                  </p>

                  <div className="telemetry-grid" style={{ marginTop: '10px' }}>
                    <div className="telemetry-stat">
                      <div className="stat-val">{r.distanceKm} <span style={{ fontSize: '0.7rem' }}>{t.kmUnit || "km"}</span></div>
                      <div className="stat-lbl">{t.distance}</div>
                    </div>
                    <div className="telemetry-stat">
                      <div className="stat-val" style={{ color: '#FBBF24' }}>{r.estimatedTime}</div>
                      <div className="stat-lbl">{t.duration}</div>
                    </div>
                    <div className="telemetry-stat">
                      <div className="stat-val" style={{ color: r.safetyScore > 80 ? '#34D399' : '#FF66B2' }}>
                        {r.safetyScore}%
                      </div>
                      <div className="stat-lbl">{t.safetyIndex}</div>
                    </div>
                    <div className="telemetry-stat">
                      <div className="stat-val" style={{ fontSize: '0.82rem', color: 'var(--color-text)' }}>{riskText}</div>
                      <div className="stat-lbl">{t.disruptionRisk}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--color-border)' }}>
                    <span style={{ fontSize: '0.74rem', color: 'var(--color-muted)' }}>
                      🛠 {routeQuality}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDispatchConvoy();
                      }}
                      className="btn-primary"
                      style={{ width: 'auto', padding: '6px 14px', fontSize: '0.76rem', minHeight: '36px' }}
                    >
                      <Send size={13} /> {t.dispatchConvoy}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {dispatchSuccess && (
          <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.2)', border: '1px solid #10B981', color: '#34D399', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            <CheckCircle2 size={18} />
            <div>
              <strong style={{ fontSize: '0.86rem' }}>{t.dispatchVectorized || "Convoy Dispatch Command Vectorized!"}</strong>
              <p style={{ fontSize: '0.75rem' }}>{t.gpsTelemetryActive || "GPS telemetry channel active. Corridor monitoring initiated."}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
