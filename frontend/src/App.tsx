import { useState, useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Spin } from 'antd'
import { authApi } from './services/api'
import AppLayout from './components/AppLayout'
import LoginPage from './pages/LoginPage'
import type { User } from './types'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const DeviceManagement = lazy(() => import('./pages/DeviceManagement'))
const AlertManagement = lazy(() => import('./pages/AlertManagement'))
const ConfigManagement = lazy(() => import('./pages/ConfigManagement'))
const Inspection = lazy(() => import('./pages/Inspection'))
const LogAnalysis = lazy(() => import('./pages/LogAnalysis'))
const ChatPage = lazy(() => import('./pages/ChatPage'))
const SystemSettings = lazy(() => import('./pages/SystemSettings'))

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('aiops_token');
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PageLoading() {
  return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}><Spin size="large" /></div>;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('aiops_token');
    if (token) {
      authApi.me()
        .then((res) => setUser(res.data))
        .catch(() => localStorage.removeItem('aiops_token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  if (loading) return <Spin style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }} size="large" />;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage onLogin={setUser} />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <AppLayout user={user} onLogout={() => { localStorage.clear(); setUser(null); }}>
                <Suspense fallback={<PageLoading />}>
                  <Routes>
                    <Route index element={<Dashboard />} />
                    <Route path="devices" element={<DeviceManagement />} />
                    <Route path="alerts" element={<AlertManagement />} />
                    <Route path="configs" element={<ConfigManagement />} />
                    <Route path="inspections" element={<Inspection />} />
                    <Route path="logs" element={<LogAnalysis />} />
                    <Route path="chat" element={<ChatPage />} />
                    <Route path="settings" element={<SystemSettings />} />
                  </Routes>
                </Suspense>
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
