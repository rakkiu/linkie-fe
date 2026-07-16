import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import HomePage from './pages/HomePage';
import EventDetailPage from './pages/EventDetailPage';
import CameraFramePage from './pages/CameraFramePage';
import WishwallPage from './pages/WishwallPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminFanInsightsPage from './pages/admin/AdminFanInsightsPage';
import AdminReportPage from './pages/admin/AdminReportPage';
import AdminCreateEventPage from './pages/admin/AdminCreateEventPage';
import AdminEventsListPage from './pages/admin/AdminEventsListPage';
import AdminOrganizersPage from './pages/admin/AdminOrganizersPage';
import AdminPricingRequestsPage from './pages/admin/AdminPricingRequestsPage';
import AdminAuditLogPage from './pages/admin/AdminAuditLogPage';
import TicketListPage from './pages/admin/TicketListPage';
import TicketImportPage from './pages/admin/TicketImportPage';
import WishwallModerationPage from './pages/WishwallModerationPage';
import LedScreenPage from './pages/LedScreenPage';
import EventsPage from './pages/EventsPage';
import PhotoboothPage from './pages/photobooth/PhotoboothPage';
import B2BHomePage from './pages/b2b/B2BHomePage';
import B2BAnalyticsDashboardPage from './pages/b2b/B2BAnalyticsDashboardPage';
import B2BFanInsightsPage from './pages/b2b/B2BFanInsightsPage';
import B2BARFramesPage from './pages/b2b/B2BARFramesPage';
import B2BWishwallPage from './pages/b2b/B2BWishwallPage';
import B2BPhotoboothPage from './pages/b2b/B2BPhotoboothPage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user || user.role !== 'admin') {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function StaffRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user || user.role !== 'staff') {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function LedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user || user.role !== 'led') {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function OrganizerRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user || user.role !== 'organizer') {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}


function AttendeeRoute({ children, allowGuest = false }: { children: React.ReactNode, allowGuest?: boolean }) {
  const { user } = useAuth();
  if (!user) {
    return allowGuest ? <>{children}</> : <Navigate to="/login" replace />;
  }
  if (user.role !== 'user') {
    if (user.role === 'admin') return <Navigate to="/admin/events" replace />;
    if (user.role === 'staff') return <Navigate to="/staff/wishwall" replace />;
    if (user.role === 'led') return <Navigate to="/led" replace />;
    if (user.role === 'organizer') return <Navigate to="/b2b/dashboard" replace />;
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AttendeeRoute allowGuest><HomePage /></AttendeeRoute>} />
          <Route path="/events" element={<AttendeeRoute allowGuest><EventsPage /></AttendeeRoute>} />
          <Route path="/events/:id" element={<AttendeeRoute allowGuest><EventDetailPage /></AttendeeRoute>} />
          <Route path="/events/:id/camera-frame" element={
            <AttendeeRoute><CameraFramePage /></AttendeeRoute>
          } />
          <Route path="/events/:id/photobooth" element={
            <AttendeeRoute><PhotoboothPage /></AttendeeRoute>
          } />
          <Route path="/events/:id/wishwall" element={
            <AttendeeRoute><WishwallPage /></AttendeeRoute>
          } />
          <Route path="/events/:id/wishwall/moderation" element={
            <StaffRoute><WishwallModerationPage /></StaffRoute>
          } />
          <Route path="/events/:id/wishwall/led" element={
            <LedRoute><LedScreenPage /></LedRoute>
          } />
          
          {/* Pickers */}
          <Route path="/staff/events" element={
            <StaffRoute><AdminEventsListPage /></StaffRoute>
          } />
          <Route path="/staff/wishwall" element={
            <StaffRoute><WishwallModerationPage /></StaffRoute>
          } />
          <Route path="/led" element={
            <LedRoute><LedScreenPage /></LedRoute>
          } />

          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/change-password" element={
            <PrivateRoute><ChangePasswordPage /></PrivateRoute>
          } />
          
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
            <AdminRoute>
              <AdminEventsListPage />
            </AdminRoute>
          } />
          <Route path="/admin/tickets" element={
            <AdminRoute>
              <TicketListPage />
            </AdminRoute>
          } />
          <Route path="/admin/tickets/import" element={
            <AdminRoute>
              <TicketImportPage />
            </AdminRoute>
          } />
          <Route path="/admin/organizers" element={
            <AdminRoute>
              <AdminOrganizersPage />
            </AdminRoute>
          } />
          <Route path="/admin/pricing-requests" element={
            <AdminRoute>
              <AdminPricingRequestsPage />
            </AdminRoute>
          } />
          <Route path="/admin/audit-log" element={
            <AdminRoute>
              <AdminAuditLogPage />
            </AdminRoute>
          } />

          {/* B2B Routes */}
          <Route path="/b2b" element={<B2BHomePage />} />
          <Route path="/b2b/dashboard" element={
            <OrganizerRoute>
              <B2BAnalyticsDashboardPage />
            </OrganizerRoute>
          } />
          <Route path="/b2b/fan-insights" element={
            <OrganizerRoute>
              <B2BFanInsightsPage />
            </OrganizerRoute>
          } />
          <Route path="/b2b/ar-frames" element={
            <OrganizerRoute>
              <B2BARFramesPage />
            </OrganizerRoute>
          } />
          <Route path="/b2b/wishwall" element={
            <OrganizerRoute>
              <B2BWishwallPage />
            </OrganizerRoute>
          } />
          <Route path="/b2b/photobooth" element={
            <OrganizerRoute>
              <B2BPhotoboothPage />
            </OrganizerRoute>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
