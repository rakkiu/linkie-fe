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

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user || user.role !== 'admin') {
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
          <Route path="/events/:id" element={<EventDetailPage />} />
          <Route path="/events/:id/camera-frame" element={
            <PrivateRoute><CameraFramePage /></PrivateRoute>
          } />
          <Route path="/events/:id/wishwall" element={
            <PrivateRoute><WishwallPage /></PrivateRoute>
          } />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          {/* Admin Routes */}
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
            <AdminRoute>
              <AdminEventsListPage />
            </AdminRoute>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
