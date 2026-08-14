import { Navigate, Route, Routes } from 'react-router-dom'
import AppShell from '../components/layout/AppShell'
import { useInstitution } from '../context/useInstitution'
import AdminAddInstitutionPage from '../pages/AdminAddInstitutionPage'
import AdminInstitutionsPage from '../pages/AdminInstitutionsPage'
import AdminLoginPage from '../pages/AdminLoginPage'
import AdminOldInstitutionsPage from '../pages/AdminOldInstitutionsPage'
import AdminPanelPage from '../pages/AdminPanelPage'
import AdminRegionalManagerPage from '../pages/AdminRegionalManagerPage'
import AlumniPage from '../pages/AlumniPage'
import AttendancePage from '../pages/AttendancePage'
import DashboardPage from '../pages/DashboardPage'
import LoginPage from '../pages/LoginPage'
import MessagesPage from '../pages/MessagesPage'
import ReportsPage from '../pages/ReportsPage'
import SettingsPage from '../pages/SettingsPage'
import StudentsPage from '../pages/StudentsPage'
import ParentNotesPage from '../pages/ParentNotesPage'

function ProtectedRoute() {
  const { isAuthLoading, session } = useInstitution()

  if (isAuthLoading) {
    return (
      <main className="login-page">
        <section className="login-panel">
          <div className="brand login-brand">
            <span className="brand-mark">Y</span>
            <span className="brand-copy">
              <strong>Yoklama CRM</strong>
              <small>Oturum kontrol ediliyor</small>
            </span>
          </div>
          <p className="form-note">Giriş bilgileri kontrol ediliyor...</p>
        </section>
      </main>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <AppShell />
}

function RequireAdmin({ children }) {
  const { isAdmin } = useInstitution()

  if (!isAdmin) {
    return <Navigate to="/admin/login" replace />
  }

  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route
        path="/admin"
        element={
          <RequireAdmin>
            <AdminPanelPage />
          </RequireAdmin>
        }
      >
        <Route index element={<Navigate to="/admin/kurumlar" replace />} />
        <Route path="kurumlar" element={<AdminInstitutionsPage />} />
        <Route path="kurum-ekle" element={<AdminAddInstitutionPage />} />
        <Route path="eski-kurumlar" element={<AdminOldInstitutionsPage />} />
        <Route path="bolge-idarecisi" element={<AdminRegionalManagerPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/ogrenciler" element={<StudentsPage />} />
        <Route path="/yoklama" element={<AttendancePage />} />
        <Route path="/mesajlar" element={<MessagesPage />} />
        <Route path="/raporlar" element={<ReportsPage />} />
        <Route path="/eski-ogrenciler" element={<AlumniPage />} />
        <Route path="/veli-notlari" element={<ParentNotesPage />} />
        <Route path="/ayarlar" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default AppRoutes
