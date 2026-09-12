const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');
const IS_PROD_MODE = import.meta.env.PROD || import.meta.env.MODE === 'production';

if (IS_PROD_MODE) {
  console.info(`[NERIS PRODUCTION FRONTEND] Operating in PRODUCTION mode using API Base URL: ${API_BASE_URL}`);
} else {
  console.info(`[NERIS DEVELOPMENT FRONTEND] Operating in DEVELOPMENT mode using API Base URL: ${API_BASE_URL}`);
}


const getAuthHeaders = (extraHeaders = {}) => {
  const token = localStorage.getItem('cognito_token');
  const headers = { ...extraHeaders };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export const api = {
  // Amazon Cognito Login & Session
  loginCognito: async (username, password, role = 'COMMANDER') => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, role })
      });
      const data = await res.json();
      if (!res.ok) {
        return { status: 'FAILED', error: data.detail || 'Authentication failed' };
      }
      if (data.access_token) {
        localStorage.setItem('cognito_token', data.access_token);
        if (data.user) {
          localStorage.setItem('cognito_user', JSON.stringify(data.user));
        }
      }
      return data;
    } catch (err) {
      return { status: 'FAILED', error: err.message };
    }
  },

  getMe: async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      return null;
    }
  },

  checkHealth: async () => {
    try {
      const res = await fetch('/api/health');
      if (!res.ok) {
        const fallback = await fetch('/health');
        if (!fallback.ok) throw new Error('Health check failed');
        return await fallback.json();
      }
      return await res.json();
    } catch (err) {
      return { status: 'offline', error: err.message };
    }
  },

  // Tab 1: GIS Network Hubs & Edges
  getNetworkNodes: async (state = null) => {
    try {
      const url = state ? `${API_BASE_URL}/network/nodes?state=${encodeURIComponent(state)}` : `${API_BASE_URL}/network/nodes`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch network nodes');
      return await res.json();
    } catch (err) {
      console.warn('Backend network nodes unavailable, using local map hubs:', err.message);
      return null;
    }
  },

  getNetworkEdges: async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/network/edges`);
      if (!res.ok) throw new Error('Failed to fetch network edges');
      return await res.json();
    } catch (err) {
      console.warn('Backend network edges unavailable:', err.message);
      return null;
    }
  },

  getNetworkOverview: async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/network/overview`);
      if (!res.ok) throw new Error('Failed to fetch network overview');
      return await res.json();
    } catch (err) {
      console.warn('Backend network overview unavailable:', err.message);
      return null;
    }
  },

  // Fleets Telemetry & Simulation
  getFleets: async (state = null) => {
    try {
      const url = state ? `${API_BASE_URL}/telemetry/active-fleet?state=${encodeURIComponent(state)}` : `${API_BASE_URL}/telemetry/active-fleet`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch active fleet');
      return await res.json();
    } catch (err) {
      console.warn('Backend API unavailable, using local mock state:', err.message);
      return null;
    }
  },

  getSimulatedTelemetry: async (state = null) => {
    try {
      const url = state ? `${API_BASE_URL}/telemetry/simulation?state=${encodeURIComponent(state)}` : `${API_BASE_URL}/telemetry/simulation`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch simulated telemetry');
      return await res.json();
    } catch (err) {
      console.warn('Backend simulation unavailable:', err.message);
      return null;
    }
  },

  // Telemetry Ping & Fleet Tracking
  pingTelemetry: async (telemetryPayload) => {
    try {
      const res = await fetch(`${API_BASE_URL}/fleet/telemetry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(telemetryPayload)
      });
      if (!res.ok) throw new Error('Telemetry ping failed');
      return await res.json();
    } catch (err) {
      return null;
    }
  },

  getFleetVehicles: async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/fleet`);
      if (!res.ok) throw new Error('Failed to fetch active fleet');
      return await res.json();
    } catch (err) {
      return null;
    }
  },

  getFleetVehicleById: async (vehicleId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/fleet/${encodeURIComponent(vehicleId)}`);
      if (!res.ok) throw new Error('Failed to fetch vehicle state');
      return await res.json();
    } catch (err) {
      return null;
    }
  },

  // Live Incidents (AWS DynamoDB)
  getIncidents: async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/incidents`);
      if (!res.ok) throw new Error('Failed to fetch live incidents');
      return await res.json();
    } catch (err) {
      console.warn('Backend API unavailable for live incidents:', err.message);
      return null;
    }
  },

  createIncident: async (incidentPayload) => {
    try {
      const res = await fetch(`${API_BASE_URL}/incidents`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(incidentPayload)
      });
      const data = await res.json();
      if (!res.ok) {
        return { status: 'FAILED', error: data.detail || 'Failed to persist in DynamoDB', dynamodb_confirmed: false };
      }
      return data;
    } catch (err) {
      console.warn('Backend API error creating incident in DynamoDB:', err.message);
      return { status: 'FAILED', error: err.message, dynamodb_confirmed: false };
    }
  },

  // Upload Evidence Photo to Amazon S3
  uploadEvidence: async (formData) => {
    try {
      const res = await fetch(`${API_BASE_URL}/incidents/upload-evidence`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData
      });
      const data = await res.json();
      if (!res.ok) {
        return { status: 'FAILED', error: data.detail || 'S3 evidence upload failed', s3_confirmed: false };
      }
      return data;
    } catch (err) {
      console.warn('Backend Amazon S3 evidence upload failed:', err.message);
      return { status: 'FAILED', error: err.message, s3_confirmed: false };
    }
  },

  // Amazon Bedrock AI Incident Intelligence
  getIncidentAIIntelligence: async (incidentId, payload = null) => {
    try {
      const res = await fetch(`${API_BASE_URL}/incidents/${encodeURIComponent(incidentId)}/ai-intelligence`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload || {})
      });
      if (!res.ok) {
        return { available: false, error_message: 'Amazon Bedrock AI service returned an error.' };
      }
      return await res.json();
    } catch (err) {
      return { available: false, error_message: err.message };
    }
  },

  // Batch Offline Sync
  syncBatchIncidents: async (batchData) => {
    try {
      const res = await fetch(`${API_BASE_URL}/incidents/batch-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batchData)
      });
      if (!res.ok) throw new Error('Batch sync failed');
      return await res.json();
    } catch (err) {
      return null;
    }
  },

  // Dashboard State Readiness
  getStateReadiness: async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/dashboard/state-readiness`);
      if (!res.ok) throw new Error('Failed to fetch state readiness');
      return await res.json();
    } catch (err) {
      return null;
    }
  },

  // AI Terrain & Disaster-Aware Route Computation
  calculateRoute: async (originNode, destinationNode, cargoType = 'MEDICINE', weightTons = 12.0, weather = 'MONSOON_STORM', vehicleType = 'HEAVY_CONVOY') => {
    try {
      const res = await fetch(`${API_BASE_URL}/routes/compute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: originNode,
          destination: destinationNode,
          origin_node: originNode,
          destination_node: destinationNode,
          vehicleType: vehicleType,
          cargoType: cargoType,
          cargo_type: cargoType,
          convoy_weight_tons: weightTons,
          weather_condition: weather
        })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ detail: 'Failed to compute route' }));
        throw new Error(errData.detail || 'Failed to compute route');
      }
      return await res.json();
    } catch (err) {
      console.warn('Backend route computation error:', err.message);
      return { error: err.message };
    }
  },

  // Real-Time Web Intelligence & Weather
  getLiveNews: async (state = null, refresh = false) => {
    try {
      let url = `${API_BASE_URL}/external/news?refresh=${refresh}`;
      if (state && state !== 'all') {
        url += `&state=${encodeURIComponent(state)}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch external news');
      return await res.json();
    } catch (err) {
      console.warn('External news feed unavailable:', err.message);
      return { is_available: false, records: [], error_message: err.message };
    }
  },

  getLiveWeather: async (refresh = false) => {
    try {
      const res = await fetch(`${API_BASE_URL}/external/weather?refresh=${refresh}`);
      if (!res.ok) throw new Error('Failed to fetch external weather');
      return await res.json();
    } catch (err) {
      console.warn('External weather feed unavailable:', err.message);
      return { is_available: false, records: [], error_message: err.message };
    }
  },

  getLiveIncidents: async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/external/disasters`);
      if (!res.ok) throw new Error('Failed to fetch external disaster alerts');
      return await res.json();
    } catch (err) {
      console.warn('External disaster alerts unavailable:', err.message);
      return { is_available: false, records: [], error_message: err.message };
    }
  },

  // Central External Provider Adapters Gateway
  getExternalNews: async (state = null, refresh = false) => {
    try {
      let url = `${API_BASE_URL}/external/news?refresh=${refresh}`;
      if (state && state !== 'all') url += `&state=${encodeURIComponent(state)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch external news');
      return await res.json();
    } catch (err) {
      return { is_available: false, records: [], error_message: err.message };
    }
  },

  getExternalWeather: async (state = null, refresh = false) => {
    try {
      let url = `${API_BASE_URL}/external/weather?refresh=${refresh}`;
      if (state && state !== 'all') url += `&state=${encodeURIComponent(state)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch external weather');
      return await res.json();
    } catch (err) {
      return { is_available: false, records: [], error_message: err.message };
    }
  },

  getExternalDisasters: async (state = null, refresh = false) => {
    try {
      let url = `${API_BASE_URL}/external/disasters?refresh=${refresh}`;
      if (state && state !== 'all') url += `&state=${encodeURIComponent(state)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch external disasters');
      return await res.json();
    } catch (err) {
      return { is_available: false, records: [], error_message: err.message };
    }
  },

  getExternalGovtNotices: async (state = null, refresh = false) => {
    try {
      let url = `${API_BASE_URL}/external/govt-notices?refresh=${refresh}`;
      if (state && state !== 'all') url += `&state=${encodeURIComponent(state)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch external govt notices');
      return await res.json();
    } catch (err) {
      return { is_available: false, records: [], error_message: err.message };
    }
  },

  getExternalRoadConditions: async (state = null, refresh = false) => {
    try {
      let url = `${API_BASE_URL}/external/road-conditions?refresh=${refresh}`;
      if (state && state !== 'all') url += `&state=${encodeURIComponent(state)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch external road conditions');
      return await res.json();
    } catch (err) {
      return { is_available: false, records: [], error_message: err.message };
    }
  },

  getExternalAllRecords: async (state = null, refresh = false) => {
    try {
      let url = `${API_BASE_URL}/external/all-records?refresh=${refresh}`;
      if (state && state !== 'all') url += `&state=${encodeURIComponent(state)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch external records');
      return await res.json();
    } catch (err) {
      return { is_available: false, records: [], error_message: err.message };
    }
  },

  // Dedicated NERIS News Feed API Endpoints
  getNewsFeed: async ({ category = null, location = null, severity = null, q = '', sortBy = 'relevance', isDemo = false, refresh = false } = {}) => {
    try {
      const params = new URLSearchParams();
      if (category && category !== 'all' && category !== 'ALL') params.append('category', category);
      if (location && location !== 'all' && location !== 'ALL' && location !== 'ALL NER') params.append('location', location);
      if (severity && severity !== 'all' && severity !== 'ALL') params.append('severity', severity);
      if (q && q.trim() !== '') params.append('q', q.trim());
      if (sortBy) params.append('sort_by', sortBy);
      if (isDemo) params.append('is_demo', 'true');
      if (refresh) params.append('refresh', 'true');

      const url = `/api/news?${params.toString()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('Failed to fetch NERIS news feed backend API:', err.message);
      return { status: 'ERROR', is_live_available: false, is_cached: false, articles: [], error: err.message };
    }
  },

  getNewsArticleById: async (id) => {
    try {
      const res = await fetch(`/api/news/${encodeURIComponent(id)}`);
      if (!res.ok) throw new Error(`Failed to fetch article ${id}`);
      return await res.json();
    } catch (err) {
      console.warn('Failed to fetch article by ID:', err.message);
      return null;
    }
  },

  getNewsCategories: async () => {
    try {
      const res = await fetch('/api/news/categories');
      if (!res.ok) throw new Error('Failed to fetch categories');
      return await res.json();
    } catch (err) {
      return { categories: [] };
    }
  },

  getNewsLocations: async () => {
    try {
      const res = await fetch('/api/news/locations');
      if (!res.ok) throw new Error('Failed to fetch locations');
      return await res.json();
    } catch (err) {
      return { locations: [] };
    }
  },

  getArticleAISummary: async (id) => {
    try {
      const res = await fetch(`/api/news/${encodeURIComponent(id)}/ai-summary`, { method: 'POST' });
      if (!res.ok) throw new Error('AI summary generation failed');
      return await res.json();
    } catch (err) {
      console.warn('AI summary service error:', err.message);
      return { article_id: id, ai_summary: 'AI summary currently unavailable.', disclaimer: 'AI-generated summary — verify with original source.' };
    }
  },

  convertToUnverifiedReport: async (id) => {
    try {
      const res = await fetch(`/api/news/${encodeURIComponent(id)}/convert-to-unverified-report`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to convert article to unverified report');
      return await res.json();
    } catch (err) {
      console.warn('Operational report conversion error:', err.message);
      return null;
    }
  },

  // Dedicated Persistent Alerts & Risk Evaluation Workflow
  getAlerts: async (status = null) => {
    try {
      const url = status ? `/api/alerts?status=${encodeURIComponent(status)}` : `/api/alerts`;
      const res = await fetch(url);
      if (!res.ok) {
        const fallback = await fetch(status ? `${API_BASE_URL}/alerts?status=${encodeURIComponent(status)}` : `${API_BASE_URL}/alerts`);
        if (!fallback.ok) throw new Error('Failed to fetch alerts');
        return await fallback.json();
      }
      return await res.json();
    } catch (err) {
      console.warn('Backend alerts endpoint unavailable:', err.message);
      return null;
    }
  },

  createAlert: async (alertPayload) => {
    try {
      const res = await fetch(`/api/alerts`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(alertPayload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to create alert');
      return data;
    } catch (err) {
      console.warn('Backend alert creation error:', err.message);
      return null;
    }
  },

  updateAlertStatus: async (alertId, newStatus, commanderId = 'Commander', notes = null) => {
    try {
      const res = await fetch(`/api/alerts/${encodeURIComponent(alertId)}`, {
        method: 'PATCH',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ status: newStatus, commander_id: commanderId, notes })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to update alert status');
      return data;
    } catch (err) {
      console.warn('Backend alert status update error:', err.message);
      return null;
    }
  },

  evaluateIncidentRisk: async (incidentData) => {
    try {
      const res = await fetch(`/api/alerts/evaluate-incident`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(incidentData)
      });
      if (!res.ok) throw new Error('Incident risk evaluation failed');
      return await res.json();
    } catch (err) {
      console.warn('Backend risk evaluation error:', err.message);
      return null;
    }
  },

  acknowledgeAlert: async (alertId, acknowledgedBy = 'Commander') => {
    try {
      const res = await fetch(`/api/alerts/${encodeURIComponent(alertId)}/acknowledge`, {
        method: 'PATCH',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ action_by: acknowledgedBy })
      });
      if (!res.ok) throw new Error('Failed to acknowledge alert');
      return await res.json();
    } catch (err) {
      console.warn('Alert acknowledge error:', err.message);
      return null;
    }
  },

  resolveAlert: async (alertId, resolvedBy = 'Commander') => {
    try {
      const res = await fetch(`/api/alerts/${encodeURIComponent(alertId)}/resolve`, {
        method: 'PATCH',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ action_by: resolvedBy })
      });
      if (!res.ok) throw new Error('Failed to resolve alert');
      return await res.json();
    } catch (err) {
      console.warn('Alert resolve error:', err.message);
      return null;
    }
  }
};
