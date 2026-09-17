import { Navigate, Route, Routes } from "react-router-dom";

import { Navbar } from "./components/Navbar";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AirportsPage } from "./pages/AirportsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { FlightDetailPage } from "./pages/FlightDetailPage";
import { FlightsPage } from "./pages/FlightsPage";
import { GroupsPage } from "./pages/GroupsPage";
import { LoginPage } from "./pages/LoginPage";
import { MapPage } from "./pages/MapPage";

export function App() {
  return (
    <div className="flex h-dvh flex-col">
      <Navbar />
      <main className="flex-1 overflow-hidden">
        <Routes>
          <Route path="/" element={<MapPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <div className="h-full overflow-y-auto">
                  <DashboardPage />
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/groups"
            element={
              <ProtectedRoute>
                <div className="h-full overflow-y-auto">
                  <GroupsPage />
                </div>
              </ProtectedRoute>
            }
          />
          <Route path="/flights" element={<div className="h-full overflow-y-auto"><FlightsPage /></div>} />
          <Route path="/flights/:flightId" element={<FlightDetailPage />} />
          <Route
            path="/airports"
            element={
              <ProtectedRoute>
                <div className="h-full overflow-y-auto">
                  <AirportsPage />
                </div>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
