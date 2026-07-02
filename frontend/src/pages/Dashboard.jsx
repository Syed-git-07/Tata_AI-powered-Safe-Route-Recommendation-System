import { useState } from "react";
import RouteInput from "../components/route/RouteInput";
import RouteResults from "../components/route/RouteResults";
import MapView from "../components/map/MapView";
import { useTheme } from "../contexts/ThemeContext";
import { ShieldAlert, Loader2 } from "lucide-react";

export default function Dashboard() {
  const [source, setSource] = useState("");
  const [destination, setDestination] = useState("");
  
  const [routeResult, setRouteResult] = useState(null);
  const [selectedRouteId, setSelectedRouteId] = useState(1);
  const [loading, setLoading] = useState(false);
  const { theme } = useTheme();

  const handleRouteResult = (result) => {
    setRouteResult(result);
    setSelectedRouteId(1); // Reset to recommended route
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
          onRouteResult={handleRouteResult}
          onLoading={setLoading}
        />

        {loading ? (
          <div className="sidebar-loader">
            <Loader2 className="spin" size={24} />
            <p>Analyzing routes &amp; predicting risks...</p>
          </div>
        ) : routeResult ? (
          <RouteResults
            routeData={routeResult}
            selectedRouteId={selectedRouteId}
            onSelectRoute={setSelectedRouteId}
          />
        ) : (
          <div className="sidebar-empty">
            <ShieldAlert size={36} />
            <h3>No Route Active</h3>
            <p>
              Click any district point on the map to set Source/Destination, or type names in the search panel.
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
        />
      </div>
    </div>
  );
}
