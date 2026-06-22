import { useEffect } from 'react'
import { NavLink, Route, Routes } from 'react-router-dom'
import { useDB } from './store/db'
import { ensureFx, refreshFx } from './store/fx'
import Dashboard from './pages/Dashboard'
import Trading from './pages/Trading'
import Goals from './pages/Goals'
import Tasks from './pages/Tasks'
import Finance from './pages/Finance'
import Wellness from './pages/Wellness'
import More from './pages/More'
import Settings from './pages/Settings'

const NAV = [
  { to: '/', icon: '🏠', label: 'Inicio', end: true },
  { to: '/metas', icon: '🎯', label: 'Metas' },
  { to: '/trading', icon: '📈', label: 'Trading' },
  { to: '/finanzas', icon: '💰', label: 'Finanzas' },
  { to: '/mas', icon: '⋯', label: 'Más' },
]

export default function App() {
  const db = useDB()

  useEffect(() => {
    document.documentElement.dataset.theme = db.settings.theme
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', db.settings.theme === 'light' ? '#f4f6fb' : '#0b1020')
  }, [db.settings.theme])

  useEffect(() => {
    ensureFx()
    // Mantener el tipo de cambio fresco: al volver a la app y al reconectar.
    const onVisible = () => {
      if (document.visibilityState === 'visible') ensureFx()
    }
    const onOnline = () => refreshFx()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    window.addEventListener('online', onOnline)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
      window.removeEventListener('online', onOnline)
    }
  }, [])

  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/metas" element={<Goals />} />
        <Route path="/trading" element={<Trading />} />
        <Route path="/finanzas" element={<Finance />} />
        <Route path="/tareas" element={<Tasks />} />
        <Route path="/salud" element={<Wellness />} />
        <Route path="/mas" element={<More />} />
        <Route path="/ajustes" element={<Settings />} />
        <Route path="*" element={<Dashboard />} />
      </Routes>

      <nav className="bottom-nav">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => (isActive ? 'active' : '')}>
            <span className="ico">{n.icon}</span>
            <span>{n.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
