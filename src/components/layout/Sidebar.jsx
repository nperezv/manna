import { useState, useRef, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../hooks/useTheme'
import './Sidebar.css'

const NAV = [
  { to: '/',            label: 'Inicio',      icon: '⬡' },
  { to: '/ingresos',    label: 'Ingresos',    icon: '↑' },
  { to: '/presupuesto', label: 'Presupuesto', icon: '▦' },
  { to: '/diezmos',     label: 'Diezmos',     icon: '✦' },
  { to: '/gastos',      label: 'Gastos',      icon: '◈' },
  { to: '/ahorro',      label: 'Ahorro',      icon: '◎' },
  { to: '/deudas',      label: 'Deudas',      icon: '⊖' },
  { to: '/consejero',   label: 'Stewie',      icon: '◑' },
]

function UserMenu({ user, family, theme, toggleTheme, onClose, onLogout, navigate }) {
  const go = (path) => { navigate(path); onClose() }

  return (
    <div className="user-menu">
      <div className="um-header">
        <div className="um-avatar">{user?.name?.charAt(0).toUpperCase()}</div>
        <div className="um-info">
          <div className="um-name">{user?.name}</div>
          <div className="um-email">{user?.email}</div>
        </div>
      </div>

      <div className="um-divider"/>

      {/* System config — admin only */}
      {user?.role === 'admin' && (
        <>
          <div className="um-section-label">Configuración del sistema</div>
          <button className="um-item" onClick={() => go('/ajustes')}>
            <span className="um-item-icon">⊛</span>
            <span>Ajustes</span>
          </button>
          <div className="um-divider"/>
        </>
      )}

      {/* Preferences */}
      <div className="um-section-label">Preferencias</div>
      <div className="um-item um-item--toggle" onClick={toggleTheme}>
        <span className="um-item-icon">◑</span>
        <span>Tema</span>
        <div className="um-toggle">
          <div className={`um-toggle-track ${theme === 'dark' ? 'on' : ''}`}>
            <div className="um-toggle-thumb"/>
          </div>
          <span className="um-toggle-label">{theme === 'light' ? 'Claro' : 'Oscuro'}</span>
        </div>
      </div>
      <button className="um-item" onClick={() => go('/perfil')}>
        <span className="um-item-icon">👤</span>
        <span>Mi perfil</span>
      </button>

      <div className="um-divider"/>

      <button className="um-item um-item--danger" onClick={onLogout}>
        <span className="um-item-icon">⎋</span>
        <span>Cerrar sesión</span>
      </button>

      <div className="um-footer">Manna v1.0</div>
    </div>
  )
}

export default function Sidebar() {
  const { family, user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef()

  useEffect(() => {
    if (!menuOpen) return
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  const handleLogout = async () => {
    setMenuOpen(false)
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-logo">
          <span className="sidebar-logo-m">m</span>
        </div>
        <div className="sidebar-brand-text">
          <span className="sidebar-appname">manna</span>
          <span className="sidebar-subtitle">{family?.name || ''}</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {NAV.map(({ to, label, icon }) => (
          <NavLink key={to} to={to} end={to === '/'}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <span className="sidebar-icon">{icon}</span>
            <span className="sidebar-label">{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-user-wrap" ref={menuRef}>
        {menuOpen && (
          <UserMenu user={user} family={family} theme={theme}
            toggleTheme={toggleTheme} onClose={() => setMenuOpen(false)}
            onLogout={handleLogout} navigate={navigate}/>
        )}
        <button className="sidebar-user-btn" onClick={() => setMenuOpen(o => !o)}>
          <div className="sidebar-user-avatar">{user?.name?.charAt(0).toUpperCase()}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.name}</div>
            <div className="sidebar-user-role">{user?.role === 'admin' ? 'Administrador' : 'Miembro'}</div>
          </div>
          <span className="sidebar-user-chevron">⌃</span>
        </button>
      </div>
    </aside>
  )
}
