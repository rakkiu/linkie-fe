import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import HomePage from './pages/HomePage';
import EventDetailPage from './pages/EventDetailPage';
import CameraFramePage from './pages/CameraFramePage';
import WishwallPage from './pages/WishwallPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminFanInsightsPage from './pages/admin/AdminFanInsightsPage';
import AdminReportPage from './pages/admin/AdminReportPage';
import AdminCreateEventPage from './pages/admin/AdminCreateEventPage';
import AdminEventsListPage from './pages/admin/AdminEventsListPage';
import WishwallModerationPage from './pages/WishwallModerationPage';
import LedScreenPage from './pages/LedScreenPage';
import EventsPage from './pages/EventsPage';

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user || user.role !== 'admin') {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function StaffRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user || (user.role !== 'admin' && user.role !== 'staff')) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function LedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user || (user.role !== 'admin' && user.role !== 'led')) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return <>{children}</>;
}
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/events/:id" element={<EventDetailPage />} />
          <Route path="/events/:id/camera-frame" element={
            <PrivateRoute><CameraFramePage /></PrivateRoute>
          } />
          <Route path="/events/:id/wishwall" element={
            <PrivateRoute><WishwallPage /></PrivateRoute>
          } />
          <Route path="/events/:id/wishwall/moderation" element={
            <StaffRoute><WishwallModerationPage /></StaffRoute>
          } />
          <Route path="/events/:id/wishwall/led" element={
            <LedRoute><LedScreenPage /></LedRoute>
          } />
          
          {/* Pickers */}
          <Route path="/staff/wishwall" element={
            <StaffRoute><WishwallModerationPage /></StaffRoute>
          } />
          <Route path="/led" element={
            <LedRoute><LedScreenPage /></LedRoute>
          } />

          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          {/* Admin & Staff Routes */}
          <Route path="/admin" element={
            <AdminRoute>
              <AdminDashboardPage />
            </AdminRoute>
          } />
          <Route path="/admin/fan-insights" element={
            <AdminRoute>
              <AdminFanInsightsPage />
            </AdminRoute>
          } />
          <Route path="/admin/report" element={
            <AdminRoute>
              <AdminReportPage />
            </AdminRoute>
          } />
          <Route path="/admin/create-event" element={
            <AdminRoute>
              <AdminCreateEventPage />
            </AdminRoute>
          } />
          <Route path="/admin/events" element={
            <StaffRoute>
              <AdminEventsListPage />
            </StaffRoute>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
