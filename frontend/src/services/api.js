export const api = {
  // Health check
  checkHealth: async () => {
    return { status: 'online', mode: 'Client-Side Self-Contained' };
  },

  // Fleets Telemetry
  getFleets: async () => {
    return null; // Uses rich local state in AppContext
  },

  // Telemetry Ping
  pingTelemetry: async (telemetryPayload) => {
    return {
      status: "SUCCESS",
      hazard_in_proximity: false,
      warning_message: null,
      reroute_advised: false
    };
  },

  // Live Incidents
  getIncidents: async () => {
    return null; // Uses rich local state in AppContext
  },

  // Upload Evidence Photo
  uploadEvidence: async (formData) => {
    return {
      status: "SUCCESS",
      valid_hazard: true,
      severity: "HIGH",
      confidence_score: 0.92,
      reasoning_summary: "Landslide rockfall verified on mountain corridor."
    };
  },

  // Batch Offline Sync
  syncBatchIncidents: async (batchData) => {
    return { status: "SUCCESS", synced_count: batchData?.incidents?.length || 0 };
  },

  // Dashboard State Readiness
  getStateReadiness: async () => {
    return null;
  },

  // AI Route Calculation
  calculateRoute: async (originNode, destinationNode, cargoType = 'MEDICINE') => {
    return null;
  }
};


