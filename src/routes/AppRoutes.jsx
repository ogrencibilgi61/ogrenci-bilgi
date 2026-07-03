import { Navigate, Route, Routes } from 'react-router-dom'
import AppShell from '../components/layout/AppShell'
import AlumniPage from '../pages/AlumniPage'
import AttendancePage from '../pages/AttendancePage'
import DashboardPage from '../pages/DashboardPage'
import LoginPage from '../pages/LoginPage'
import MessagesPage from '../pages/MessagesPage'
import ReportsPage from '../pages/ReportsPage'
import SettingsPage from '../pages/SettingsPage'
import StudentsPage from '../pages/StudentsPage'

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/ogrenciler" element={<StudentsPage />} />
        <Route path="/yoklama" element={<AttendancePage />} />
        <Route path="/mesajlar" element={<MessagesPage />} />
        <Route path="/raporlar" element={<ReportsPage />} />
        <Route path="/eski-ogrenciler" element={<AlumniPage />} />
        <Route path="/ayarlar" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default AppRoutes
