import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './stores/auth.store';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { AIConsultantDrawer } from './components/AIConsultantDrawer';
import { ScenarioRunnerModal } from './components/ScenarioRunnerModal';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { PatientsPage } from './pages/PatientsPage';
import { OTSchedulePage } from './pages/OTSchedulePage';
import { CSSDPage } from './pages/CSSDPage';
import { AlertsPage } from './pages/AlertsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SimulatorPage } from './pages/SimulatorPage';
import { AIConsultantPage } from './pages/AIConsultantPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { SettingsPage } from './pages/SettingsPage';

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [isAIDrawerOpen, setIsAIDrawerOpen] = useState(false);
  const [isScenarioRunnerOpen, setIsScenarioRunnerOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex items-center justify-center text-teal-400 font-semibold text-sm">
        Initializing SmartOT Command Platform...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="h-screen w-screen bg-slate-100 text-slate-900 flex flex-col overflow-hidden select-none">
      {/* Pinned Top Navigation Header */}
      <Navbar
        onOpenAIConsultant={() => setIsAIDrawerOpen(true)}
        onOpenScenarioRunner={() => setIsScenarioRunnerOpen(true)}
      />

      {/* Main Workspace Area with Completely Independent Scrolling Panes */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Independent Side Navigation Rail */}
        <Sidebar
          isExpanded={isSidebarExpanded}
          onToggleExpand={() => setIsSidebarExpanded((prev) => !prev)}
        />

        {/* Independent Center Main Content Viewport with MediwoxPlus Soft Gradient */}
        <main className="flex-1 h-full overflow-y-auto overflow-x-hidden min-w-0 bg-gradient-to-br from-slate-100 via-teal-50/30 to-blue-50/20 p-0 text-slate-900">
          <Routes>
            <Route
              path="/"
              element={
                <DashboardPage
                  onOpenAIConsultant={() => setIsAIDrawerOpen(true)}
                  onOpenScenarioRunner={() => setIsScenarioRunnerOpen(true)}
                />
              }
            />
            <Route path="/patients" element={<PatientsPage />} />
            <Route path="/ot-schedule" element={<OTSchedulePage />} />
            <Route path="/cssd" element={<CSSDPage />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/simulator" element={<SimulatorPage />} />
            <Route path="/ai-consultant" element={<AIConsultantPage />} />
            <Route path="/audit-logs" element={<AuditLogsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/settings/*" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>


      {/* Global AI Operations Consultant Drawer */}
      <AIConsultantDrawer
        isOpen={isAIDrawerOpen}
        onClose={() => setIsAIDrawerOpen(false)}
      />

      {/* Global Scripted Demo Scenario Runner */}
      <ScenarioRunnerModal
        isOpen={isScenarioRunnerOpen}
        onClose={() => setIsScenarioRunnerOpen(false)}
        onOpenAIConsultant={() => setIsAIDrawerOpen(true)}
      />
    </div>
  );
};

export function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;
