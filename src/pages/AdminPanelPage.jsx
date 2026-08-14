import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useInstitution } from '../context/useInstitution'

function AdminPanelPage() {
  const navigate = useNavigate()
  const { logoutAdmin } = useInstitution()

  function handleLogout() {
    logoutAdmin()
    navigate('/admin/login')
  }

  return (
    <main className="admin-page">
      <header className="admin-topbar">
        <div className="brand compact">
          <span className="brand-mark">A</span>
          <span className="brand-copy">
            <strong>Idareci</strong>
            <small>Yoklama CRM</small>
          </span>
        </div>

        <nav className="admin-nav" aria-label="Admin sayfalari">
          <NavLink className="admin-nav-link" to="/admin/kurumlar">
            Bilgiler
          </NavLink>
          <NavLink className="admin-nav-link" to="/admin/kurum-ekle">
            Ekle
          </NavLink>
          <NavLink className="admin-nav-link" to="/admin/eski-kurumlar">
            Eski
          </NavLink>
          <NavLink className="admin-nav-link" to="/admin/bolge-idarecisi">
            Bolge
          </NavLink>
        </nav>

        <button
          className="ghost-button compact-button admin-logout"
          type="button"
          onClick={handleLogout}
        >
          Cikis
        </button>
      </header>

      <Outlet />
    </main>
  )
}

export default AdminPanelPage
