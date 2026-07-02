import { useState, useEffect } from "react";
import RouteInput from "../components/route/RouteInput";
import RouteResults from "../components/route/RouteResults";
import MapView from "../components/map/MapView";
import { useTheme } from "../contexts/ThemeContext";
import { ShieldAlert, Loader2, Navigation, AlertCircle, Play, Square, Volume2 } from "lucide-react";

export default function Dashboard() {
  const [source, setSource] = useState("");
  const [destination, setDestination] = useState("");
  const [stopover, setStopover] = useState("");
  
  const [routeResult, setRouteResult] = useState(null);
  const [selectedRouteId, setSelectedRouteId] = useState(1);
  const [loading, setLoading] = useState(false);
  const { theme } = useTheme();

  // Navigation simulation states
  const [isSimulating, setIsSimulating] = useState(false);
  const [simIdx, setSimIdx] = useState(0);
  const [simAlerts, setSimAlerts] = useState([]);

  const activeRoute = routeResult?.routes?.find((r) => r.route_id === selectedRouteId) || routeResult?.routes?.[0];

  const handleRouteResult = (result) => {
    setRouteResult(result);
    setSelectedRouteId(1); // Reset to recommended route
    setIsSimulating(false); // Reset simulation
    setSimIdx(0);
    setSimAlerts([]);
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

        // Generate alert for next district
        const nextDistrict = activeRoute.districts[next];
        const newAlert = {
          name: nextDistrict.name,
          risk: nextDistrict.risk_level,
          tip: nextDistrict.advisories?.[0] || "Maintain standard navigation safety precautions.",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        };
        setSimAlerts((prevAlerts) => [newAlert, ...prevAlerts]);

        // Optional Voice Assistant simulation (Web Speech API)
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
    }, 4500); // Step every 4.5 seconds

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
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      }
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
                    <span className={`risk-badge risk-${activeRoute.districts[simIdx].risk_level.toLowerCase()}`}>
                      {activeRoute.districts[simIdx].risk_level}
                    </span>
                  </div>

                  {/* Real-time Alerts list */}
                  <div className="sim-alerts-panel">
                    <span className="sim-alerts-title">Navigation Alerts</span>
                    <div className="sim-alerts-list">
                      {simAlerts.map((alert, idx) => (
                        <div key={idx} className={`sim-alert-card risk-${alert.risk.toLowerCase()}`}>
                          <div className="alert-card-header">
                            <span className="alert-time">{alert.time}</span>
                            <span className="alert-location">Entering {alert.name}</span>
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
            <ShieldAlert size={36} />
            <h3>No Route Active</h3>
            <p>
              Click any district point on the map to set Source/Destination, or search using intermediate stopovers.
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
