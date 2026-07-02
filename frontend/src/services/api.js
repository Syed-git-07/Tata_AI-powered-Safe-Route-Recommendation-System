const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const handleResponse = async (res) => {
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "API Error");
  return data;
};

export const api = {
  health: () => fetch(`${API_BASE}/health`).then(handleResponse),

  getDistricts: () => fetch(`${API_BASE}/districts`).then(handleResponse),

  predictDistrict: (district) =>
    fetch(`${API_BASE}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ district }),
    }).then(handleResponse),

  findSafeRoute: (source, destination, preferences = {}) =>
    fetch(`${API_BASE}/safe-route`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source, destination, ...preferences }),
    }).then(handleResponse),

  getDistrictRisk: () =>
    fetch(`${API_BASE}/district-risk`).then(handleResponse),

  getCrimeDashboard: () =>
    fetch(`${API_BASE}/crime-dashboard`).then(handleResponse),
};
