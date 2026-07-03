import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
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
  const [isMoreOpen, setIsMoreOpen] = useState(false)
  const { pathname } = useLocation()
  const isSecondaryActive = secondaryNavigation.some(
    (item) => item.path === pathname,
  )

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">Ö</span>
          <span className="brand-copy">
            <strong>Öğrenci Bilgi</strong>
            <small>Yönetim Paneli</small>
          </span>
        </div>

        <nav className="desktop-navigation" aria-label="Ana menü">
          <span className="nav-label">Menü</span>
          {allNavigation.map((item) => (
            <NavigationLink key={item.path} item={item} />
          ))}
        </nav>

        <div className="sidebar-profile">
          <span className="avatar">M</span>
          <span>
            <strong>Müdür</strong>
            <small>Yönetici</small>
          </span>
          <NavIcon name="logout" size={18} />
        </div>
      </aside>

      <div className="app-content">
        <header className="mobile-header">
          <div className="brand compact">
            <span className="brand-mark">Ö</span>
            <strong>Öğrenci Bilgi</strong>
          </div>
          <span className="avatar">M</span>
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
