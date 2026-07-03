import { useState, useEffect } from "react";
import RouteInput from "../components/route/RouteInput";
import RouteResults from "../components/route/RouteResults";
import MapView from "../components/map/MapView";
import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import {
  ShieldAlert, Loader2, Navigation, Play, Square,
  ShieldCheck, Map, Clock, Trash2, ChevronRight
} from "lucide-react";

const RECENT_ROUTES_KEY = "saferoute_recent";

function getRecentRoutes() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_ROUTES_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveRecentRoute(source, destination) {
  const existing = getRecentRoutes();
  const newEntry = { source, destination, ts: Date.now() };
  const filtered = existing.filter(
    (r) => !(r.source === source && r.destination === destination)
  );
  const updated = [newEntry, ...filtered].slice(0, 5);
  localStorage.setItem(RECENT_ROUTES_KEY, JSON.stringify(updated));
}

export default function Dashboard() {
  const [source, setSource] = useState("");
  const [destination, setDestination] = useState("");
  const [stopover, setStopover] = useState("");

  const [routeResult, setRouteResult] = useState(null);
  const [selectedRouteId, setSelectedRouteId] = useState(1);
  const [loading, setLoading] = useState(false);
  const { theme } = useTheme();
  const { user } = useAuth();

  // Navigation simulation states
  const [isSimulating, setIsSimulating] = useState(false);
  const [simIdx, setSimIdx] = useState(0);
  const [simAlerts, setSimAlerts] = useState([]);

  // Recent routes
  const [recentRoutes, setRecentRoutes] = useState(getRecentRoutes());
  const [showRecent, setShowRecent] = useState(false);

  const activeRoute =
    routeResult?.routes?.find((r) => r.route_id === selectedRouteId) ||
    routeResult?.routes?.[0];

  const handleRouteResult = (result) => {
    setRouteResult(result);
    setSelectedRouteId(1);
    setIsSimulating(false);
    setSimIdx(0);
    setSimAlerts([]);
    if (source && destination && result) {
      saveRecentRoute(source, destination);
      setRecentRoutes(getRecentRoutes());
    }
  };

  const clearRecentRoutes = () => {
    localStorage.removeItem(RECENT_ROUTES_KEY);
    setRecentRoutes([]);
  };

  // Run simulation timeline
  useEffect(() => {
    if (!isSimulating || !activeRoute) return;

    const interval = setInterval(() => {
      setSimIdx((prev) => {
        const next = prev + 1;
        if (next >= activeRoute.districts.length) {
          setIsSimulating(false);
          clearInterval(interval);
          return prev;
        }

        const nextDistrict = activeRoute.districts[next];
        const newAlert = {
          name: nextDistrict.name,
          risk: nextDistrict.risk_level,
          tip: nextDistrict.advisories?.[0] || "Maintain standard navigation safety precautions.",
          time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
        };
        setSimAlerts((prevAlerts) => [newAlert, ...prevAlerts]);

        if ("speechSynthesis" in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(
            `Entering ${nextDistrict.name} district. Risk level is ${nextDistrict.risk_level}.`
          );
          utterance.rate = 1.05;
          window.speechSynthesis.speak(utterance);
        }

        return next;
      });
    }, 4500);

    return () => clearInterval(interval);
  }, [isSimulating, activeRoute]);

  const startSimulation = () => {
    if (!activeRoute || activeRoute.districts.length === 0) return;
    setSimIdx(0);
    setSimAlerts([
      {
        name: activeRoute.districts[0].name,
        risk: activeRoute.districts[0].risk_level,
        tip: "Trip navigation started. Safe travels!",
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      },
    ]);
    setIsSimulating(true);

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(
        `Navigation simulation started. Departing from ${activeRoute.districts[0].name}.`
      );
      window.speechSynthesis.speak(utterance);
    }
  };

  const stopSimulation = () => {
    setIsSimulating(false);
    window.speechSynthesis?.cancel();
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar for Input and Results */}
      <div className="dashboard-sidebar">
        {/* Personalized welcome */}
        {user && !routeResult && !loading && (
          <div className="dashboard-welcome">
            <div className="welcome-inner">
              <div className="welcome-avatar">
                <span>
                  {user.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)}
                </span>
              </div>
              <div>
                <p className="welcome-greeting">
                  Welcome back, <strong>{user.name.split(" ")[0]}</strong> 👋
                </p>
                <p className="welcome-sub">
                  {user.travelerType === "solo_female"
                    ? "Solo Female safety mode is active"
                    : "Standard safety mode — 46 districts monitored"}
                </p>
              </div>
            </div>
          </div>
        )}

        <RouteInput
          source={source}
          setSource={setSource}
          destination={destination}
          setDestination={setDestination}
          stopover={stopover}
          setStopover={setStopover}
          onRouteResult={handleRouteResult}
          onLoading={setLoading}
        />

        {/* Recent routes */}
        {!routeResult && !loading && recentRoutes.length > 0 && (
          <div className="recent-routes-panel">
            <div className="recent-header">
              <div className="recent-title-wrap">
                <Clock size={13} />
                <span className="recent-title">Recent Routes</span>
              </div>
              <button
                className="recent-clear-btn"
                onClick={clearRecentRoutes}
                title="Clear history"
              >
                <Trash2 size={12} />
              </button>
            </div>
            <div className="recent-list">
              {recentRoutes.map((r, i) => (
                <button
                  key={i}
                  className="recent-item"
                  onClick={() => {
                    setSource(r.source);
                    setDestination(r.destination);
                  }}
                >
                  <div className="recent-route-info">
                    <span className="recent-src">{r.source}</span>
                    <ChevronRight size={12} className="recent-arrow" />
                    <span className="recent-dst">{r.destination}</span>
                  </div>
                  <span className="recent-time">
                    {new Date(r.ts).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="sidebar-loader">
            <Loader2 className="spin" size={24} />
            <p>Analyzing routes &amp; predicting risks...</p>
          </div>
        ) : routeResult ? (
          <>
            {/* Simulation controls widget */}
            <div className="simulation-widget">
              <div className="sim-widget-header">
                <Navigation size={15} className="pulse-icon" />
                <h4>Safe Navigation Assistant</h4>
              </div>
              <div className="sim-controls">
                {!isSimulating ? (
                  <button className="sim-btn start" onClick={startSimulation}>
                    <Play size={13} fill="currentColor" />
                    <span>Start Navigation</span>
                  </button>
                ) : (
                  <button className="sim-btn stop" onClick={stopSimulation}>
                    <Square size={13} fill="currentColor" />
                    <span>Stop Navigation</span>
                  </button>
                )}
              </div>

              {isSimulating && activeRoute && (
                <div className="simulation-status">
                  <div className="sim-current-district">
                    <span className="label">Current Location</span>
                    <span className="value">{activeRoute.districts[simIdx].name}</span>
                    <span
                      className={`risk-badge risk-${activeRoute.districts[simIdx].risk_level.toLowerCase()}`}
                    >
                      {activeRoute.districts[simIdx].risk_level}
                    </span>
                  </div>

                  <div className="sim-alerts-panel">
                    <span className="sim-alerts-title">Navigation Alerts</span>
                    <div className="sim-alerts-list">
                      {simAlerts.map((alert, idx) => (
                        <div
                          key={idx}
                          className={`sim-alert-card risk-${alert.risk.toLowerCase()}`}
                        >
                          <div className="alert-card-header">
                            <span className="alert-time">{alert.time}</span>
                            <span className="alert-location">
                              Entering {alert.name}
                            </span>
                          </div>
                          <p className="alert-text">{alert.tip}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <RouteResults
              routeData={routeResult}
              selectedRouteId={selectedRouteId}
              onSelectRoute={setSelectedRouteId}
            />
          </>
        ) : (
          <div className="sidebar-empty">
            <div className="empty-icon-wrap">
              <Map size={24} />
            </div>
            <h3>Ready to Navigate Safely</h3>
            <p>
              Enter source &amp; destination districts, or click any point on the map
              to begin AI-powered route analysis.
            </p>
          </div>
        )}
      </div>

      {/* Main Map View */}
      <div className="dashboard-main">
        <MapView
          routeData={routeResult}
          selectedRouteId={selectedRouteId}
          theme={theme}
          onSelectSource={setSource}
          onSelectDestination={setDestination}
          simulating={isSimulating}
          simIdx={simIdx}
        />
      </div>
    </div>
  );
}
