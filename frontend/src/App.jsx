import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./contexts/ThemeContext";
import Header from "./components/layout/Header";
import Dashboard from "./pages/Dashboard";
import Analytics from "./pages/Analytics";
import HowItWorks from "./pages/HowItWorks";
import DistrictLookup from "./pages/DistrictLookup";

export default function App() {
  return (
    <ThemeProvider>
      <Router>
        <Header />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/district-lookup" element={<DistrictLookup />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}
