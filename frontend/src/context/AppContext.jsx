import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../data/translations';
import { incidentMarkers, activeFleets, nerStates } from '../data/nerData';
import { api } from '../services/api';

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [lang, setLang] = useState('en');
  const [stateFilter, setStateFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('map');
  const [isOnline, setIsOnline] = useState(true);
  const [backendConnected, setBackendConnected] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('ner_theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ner_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Check backend FastAPI server status on mount
  useEffect(() => {
    api.checkHealth().then((health) => {
      if (health && (health.status === 'HEALTHY' || health.status === 'online')) {
        setBackendConnected(true);
        // Sync initial telemetry data from FastAPI backend without stripping frontend model fields
        api.getFleets().then((backendFleets) => {
          if (backendFleets && Array.isArray(backendFleets) && backendFleets.length > 0) {
            setFleets((prevFleets) =>
              prevFleets.map((fleet) => {
                const match = backendFleets.find((b) => (b.vehicle_id || b.id) === fleet.id);
                if (match) {
                  return {
                    ...fleet,
                    lat: match.current_lat || match.lat || fleet.lat,
                    lng: match.current_lng || match.lng || fleet.lng,
                    speedKm: match.speed_kmh !== undefined ? match.speed_kmh : fleet.speedKm,
                    driver: match.driver_name || fleet.driver,
                    phone: match.driver_phone || fleet.phone,
                    payload: match.cargo_type || fleet.payload,
                    destination: match.destination_district || fleet.destination,
                  };
                }
                return fleet;
              })
            );
          }
        });

        // Sync initial incidents from FastAPI backend
        api.getIncidents().then((backendIncidents) => {
          if (backendIncidents && Array.isArray(backendIncidents) && backendIncidents.length > 0) {
            setIncidents((prevIncidents) => {
              const mapped = backendIncidents.map((inc) => ({
                id: inc.id || inc.local_incident_id || `INC-${Date.now()}`,
                title: `${inc.hazard_type || 'HAZARD'} Alert (${inc.district || 'Corridor'})`,
                type: (inc.hazard_type || 'LANDSLIDE').toLowerCase().includes('flood') ? 'flood' : 'landslide',
                severity: inc.severity || 'CRITICAL',
                state: (inc.district || 'assam').toLowerCase(),
                locationName: `${inc.highway_id || 'NH Highway'} - ${inc.district || 'NER'}`,
                lat: inc.lat,
                lng: inc.lng,
                timestamp: inc.offline_timestamp || 'Active',
                reporter: inc.reported_by_badge_id || 'Field Officer',
                description: `Blockage estimated at ${inc.estimated_blockage_pct || 80}%. Clearance time: ${inc.estimated_clearance_hours || 4} hours.`,
                photoUrl: inc.evidence_url || 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80',
                alternateAvailable: true,
                affectedConvoys: []
              }));

              const existingIds = new Set(prevIncidents.map(i => i.id));
              const freshIncidents = mapped.filter(i => !existingIds.has(i.id));
              return [...freshIncidents, ...prevIncidents];
            });
          }
        });
      }
    });
  }, []);

  // Dynamic datasets state
  const [incidents, setIncidents] = useState(() => {
    const saved = localStorage.getItem('ner_incidents');
    return saved ? JSON.parse(saved) : incidentMarkers;
  });

  const [offlineQueue, setOfflineQueue] = useState(() => {
    const saved = localStorage.getItem('ner_offline_queue');
    return saved ? JSON.parse(saved) : [];
  });

  const [fleets, setFleets] = useState(activeFleets);

  const [broadcastAlerts, setBroadcastAlerts] = useState([
    {
      id: "b-101",
      title: "RED ALERT: Heavy Rainfall in Dima Hasao & West Siang",
      type: "warning",
      timestamp: "10 mins ago",
      source: "IMD Guwahati Regional Met Center"
    },
    {
      id: "b-102",
      title: "NH-2 Mao Gate Landslide - BRO Machinery Clearance Underway",
      type: "disruption",
      timestamp: "25 mins ago",
      source: "Border Roads Organisation (BRO)"
    }
  ]);

  // Function to explicitly ping live telemetry to backend & evaluate spatial hazard proximity
  const sendTelemetryPing = async (fleetId) => {
    const targetFleet = fleets.find(f => f.id === fleetId) || fleets[0];
    if (!targetFleet) return null;

    const payload = {
      vehicle_id: targetFleet.id,
      driver_name: targetFleet.driverName || "Ramesh Kalita",
      driver_phone: targetFleet.driverPhone || "+91 98640 11234",
      current_lat: targetFleet.lat,
      current_lng: targetFleet.lng,
      speed_kmh: targetFleet.speedKm || 38.5,
      cargo_type: targetFleet.cargoType || "MEDICINE",
      destination_district: targetFleet.destination || "Silchar / Barak Valley Depot",
      timestamp: new Date().toISOString(),
      heading_degrees: targetFleet.heading || 120.0
    };

    const res = await api.pingTelemetry(payload);
    if (res && res.hazard_in_proximity) {
      setBroadcastAlerts((prev) => [
        {
          id: `ping-alert-${Date.now()}`,
          title: `⚠️ REAL-TIME GPS HAZARD DETECTED: Convoy ${targetFleet.id}`,
          type: "warning",
          timestamp: "JUST NOW",
          source: res.warning_message || "Backend Geodesic Proximity Engine"
        },
        ...prev
      ]);
      setFleets((prev) => prev.map(f => f.id === targetFleet.id ? { ...f, status: 'rerouting' } : f));
    }
    return res;
  };

  // Real-time animated telemetry simulation for fleets + backend stream
  useEffect(() => {
    const interval = setInterval(() => {
      setFleets((prevFleets) => {
        const updated = prevFleets.map((fleet) => {
          if (fleet.speedKm > 0) {
            // Subtle simulated GPS movement along route
            const latDelta = (Math.random() - 0.5) * 0.003;
            const lngDelta = (Math.random() - 0.5) * 0.003;
            return {
              ...fleet,
              lat: +(fleet.lat + latDelta).toFixed(4),
              lng: +(fleet.lng + lngDelta).toFixed(4)
            };
          }
          return fleet;
        });

        // Trigger backend ping for lead medical convoy periodically
        const leadVehicle = updated.find(f => f.id === 'NER-MED-8041') || updated[0];
        if (leadVehicle && isOnline) {
          api.pingTelemetry({
            vehicle_id: leadVehicle.id,
            driver_name: leadVehicle.driverName || "Ramesh Kalita",
            driver_phone: leadVehicle.driverPhone || "+91 98640 11234",
            current_lat: leadVehicle.lat,
            current_lng: leadVehicle.lng,
            speed_kmh: leadVehicle.speedKm || 38.5,
            cargo_type: "MEDICINE",
            destination_district: leadVehicle.destination || "Silchar / Barak Valley Depot",
            timestamp: new Date().toISOString(),
            heading_degrees: 120.0
          }).then((res) => {
            if (res && res.hazard_in_proximity) {
              setBroadcastAlerts((prev) => {
                if (prev.some(a => a.id.startsWith(`lead-prox-`))) return prev;
                return [
                  {
                    id: `lead-prox-${Date.now()}`,
                    title: `⚡ LIVE GPS ALERT: ${res.warning_message}`,
                    type: "warning",
                    timestamp: "JUST NOW",
                    source: "FastAPI Telemetry Proximity Engine (20km Geodesic Check)"
                  },
                  ...prev
                ];
              });
            }
          });
        }

        return updated;
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [isOnline]);

  const t = translations[lang] || translations.en;

  const toggleOnlineStatus = () => {
    const nextStatus = !isOnline;
    setIsOnline(nextStatus);

    // If going back online, auto sync queue after 1.5s delay for realistic UX
    if (nextStatus && offlineQueue.length > 0) {
      setTimeout(() => {
        syncOfflineQueue();
      }, 1200);
    }
  };

  const addIncidentReport = (report) => {
    const newIncident = {
      id: `INC-${Date.now().toString().slice(-4)}`,
      title: report.title,
      type: report.type,
      severity: report.severity,
      state: report.state,
      locationName: report.locationName,
      lat: parseFloat(report.lat),
      lng: parseFloat(report.lng),
      timestamp: "Just Now",
      reporter: report.reporter || "Field Officer (Mobile Upload)",
      description: report.description,
      photoUrl: report.photoUrl || "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80",
      alternateAvailable: true,
      affectedConvoys: []
    };

    if (isOnline) {
      setIncidents((prev) => [newIncident, ...prev]);
      // Also trigger a broadcast alert
      setBroadcastAlerts((prev) => [
        {
          id: `b-${Date.now()}`,
          title: `NEW FIELD REPORT: ${newIncident.title} (${newIncident.locationName})`,
          type: "report",
          timestamp: "Just Now",
          source: report.reporter || "Field Unit"
        },
        ...prev
      ]);
      return { status: 'synced', data: newIncident };
    } else {
      // Offline mode: store in local offline queue
      setOfflineQueue((prev) => [newIncident, ...prev]);
      return { status: 'queued', data: newIncident };
    }
  };

  const syncOfflineQueue = () => {
    if (offlineQueue.length === 0) return;

    setIncidents((prev) => [...offlineQueue, ...prev]);
    setBroadcastAlerts((prev) => [
      {
        id: `b-${Date.now()}`,
        title: `OFFLINE SYNC COMPLETE: ${offlineQueue.length} Field Reports Uploaded to Cloud Server`,
        type: "system",
        timestamp: "Just Now",
        source: "Automated Offline Sync Protocol"
      },
      ...prev
    ]);
    setOfflineQueue([]);
  };

  const triggerSOSAlert = (fleetId, message) => {
    const targetFleet = fleets.find(f => f.id === fleetId);
    const fleetName = targetFleet ? `${targetFleet.id} (${targetFleet.category})` : fleetId;
    
    setBroadcastAlerts((prev) => [
      {
        id: `sos-${Date.now()}`,
        title: `🚨 EMERGENCY SOS DISPATCHED: Convoy ${fleetName}`,
        type: "sos",
        timestamp: "JUST NOW",
        source: `Disaster Cell Vectoring | ${message || 'Urgent Escort Requested'}`
      },
      ...prev
    ]);

    if (targetFleet) {
      setFleets(prev => prev.map(f => f.id === fleetId ? { ...f, status: 'emergency' } : f));
    }
  };

  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('ner_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        if (parsed) return parsed;
      } catch (e) {}
    }
    return {
      id: "NER-CMD-8041",
      name: "Cmdr. R. Gogoi",
      role: "Disaster Logistics Commander",
      hub: "Guwahati Central Depot (Assam)",
      isPublic: false,
      loginTime: "08:00 AM"
    };
  });

  const isAuthenticated = !!user;

  const login = (officerId, role, hub) => {
    const newUser = {
      id: officerId || "NER-CMD-8041",
      name: officerId ? `Officer ${officerId.toUpperCase()}` : "Cmdr. R. Gogoi",
      role: role || "Disaster Logistics Commander",
      hub: hub || "Guwahati Central Depot",
      isPublic: false,
      loginTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setUser(newUser);
    localStorage.setItem('ner_user', JSON.stringify(newUser));
  };

  const loginAsPublic = (name, phone, userType, destinationState) => {
    const publicUser = {
      id: `CITIZEN-${Date.now().toString().slice(-4)}`,
      name: name || (userType === 'Tourist' ? "Tourist Traveler" : "Local Citizen"),
      phone: phone || "+91 Verified",
      role: userType || "Tourist / Traveler",
      hub: destinationState ? `Destination: ${destinationState}` : "NER Public Travel Portal",
      isPublic: true,
      loginTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setUser(publicUser);
    localStorage.setItem('ner_user', JSON.stringify(publicUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('ner_user');
  };

  return (
    <AppContext.Provider
      value={{
        lang,
        setLang,
        t,
        stateFilter,
        setStateFilter,
        activeTab,
        setActiveTab,
        isOnline,
        toggleOnlineStatus,
        incidents,
        offlineQueue,
        addIncidentReport,
        syncOfflineQueue,
        fleets,
        sendTelemetryPing,
        broadcastAlerts,
        triggerSOSAlert,
        nerStates,
        user,
        isAuthenticated,
        login,
        loginAsPublic,
        logout,
        theme,
        setTheme,
        toggleTheme
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

import { useApp } from './useApp';
export { useApp };

