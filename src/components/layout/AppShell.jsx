import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useInstitution } from '../../context/useInstitution'
import NavIcon from '../icons/NavIcon'

const primaryNavigation = [
  { label: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
  { label: 'Öğrenciler', path: '/ogrenciler', icon: 'students' },
  { label: 'Yoklama', path: '/yoklama', icon: 'attendance' },
  { label: 'Mesajlar', path: '/mesajlar', icon: 'messages' },
]

const secondaryNavigation = [
  { label: 'Raporlar', path: '/raporlar', icon: 'reports' },
  { label: 'Eski Öğrenciler', path: '/eski-ogrenciler', icon: 'alumni' },
  { label: 'Veli Notları', path: '/veli-notlari', icon: 'notes' },
  { label: 'Ayarlar', path: '/ayarlar', icon: 'settings' },
]

const allNavigation = [...primaryNavigation, ...secondaryNavigation]

function NavigationLink({ item, onNavigate }) {
  return (
    <NavLink
      to={item.path}
      className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
      onClick={onNavigate}
    >
      <NavIcon name={item.icon} />
      <span>{item.label}</span>
    </NavLink>
  )
}

function AppShell() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { session, logoutInstitution } = useInstitution()
  const [isMoreOpen, setIsMoreOpen] = useState(false)
  const isSecondaryActive = secondaryNavigation.some(
    (item) => item.path === pathname,
  )
  const initials = session?.institutionName?.slice(0, 1).toUpperCase() ?? 'K'

  async function handleLogout() {
    await logoutInstitution()
    navigate('/login')
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">Y</span>
          <span className="brand-copy">
            <strong>Yoklama CRM</strong>
            <small>Kurum paneli</small>
          </span>
        </div>

        <nav className="desktop-navigation" aria-label="Ana menü">
          <span className="nav-label">Menü</span>
          {allNavigation.map((item) => (
            <NavigationLink key={item.path} item={item} />
          ))}
        </nav>

        <button
          className="sidebar-profile"
          type="button"
          onClick={handleLogout}
          aria-label="Kurumdan çıkış yap"
        >
          <span className="avatar">{initials}</span>
          <span>
            <strong>{session?.institutionName}</strong>
            <small>{session?.cityName}</small>
          </span>
          <NavIcon name="logout" size={18} />
        </button>
      </aside>

      <div className="app-content">
        <header className="mobile-header">
          <div className="brand compact">
            <span className="brand-mark">Y</span>
            <span className="brand-copy">
              <strong>{session?.institutionName}</strong>
              <small>{session?.cityName}</small>
            </span>
          </div>
          <button
            className="avatar avatar-button"
            type="button"
            onClick={handleLogout}
            aria-label="Çıkış yap"
          >
            {initials}
          </button>
        </header>

        <main className="page-content">
          <Outlet />
        </main>
      </div>

      {isMoreOpen && (
        <>
          <button
            className="menu-backdrop"
            type="button"
            aria-label="Menüyü kapat"
            onClick={() => setIsMoreOpen(false)}
          />
          <nav className="more-menu" aria-label="Diğer sayfalar">
            <div className="more-menu-heading">
              <strong>Diğer</strong>
              <button type="button" onClick={() => setIsMoreOpen(false)}>
                Kapat
              </button>
            </div>
            {secondaryNavigation.map((item) => (
              <NavigationLink
                key={item.path}
                item={item}
                onNavigate={() => setIsMoreOpen(false)}
              />
            ))}
          </nav>
        </>
      )}

      <nav className="mobile-navigation" aria-label="Mobil menü">
        {primaryNavigation.map((item) => (
          <NavigationLink
            key={item.path}
            item={item}
            onNavigate={() => setIsMoreOpen(false)}
          />
        ))}
        <button
          type="button"
          className={`nav-link more-button${
            isMoreOpen || isSecondaryActive ? ' active' : ''
          }`}
          onClick={() => setIsMoreOpen((current) => !current)}
        >
          <NavIcon name="more" />
          <span>Diğer</span>
        </button>
      </nav>
    </div>
  )
}

export default AppShell
