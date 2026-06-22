import { Link } from 'react-router-dom'
import { useDB } from '../store/db'
import { PageHead } from '../components/ui'

const TILES = [
  { to: '/tareas', icon: '📝', label: 'Tareas y agenda', desc: 'Tu lista de pendientes' },
  { to: '/metas', icon: '🎯', label: 'Metas y hábitos', desc: 'Objetivos y constancia' },
  { to: '/salud', icon: '❤️', label: 'Salud y diario', desc: 'Bienestar y reflexión' },
  { to: '/finanzas', icon: '💰', label: 'Finanzas', desc: 'Ingresos y gastos' },
  { to: '/trading', icon: '📈', label: 'Trading', desc: 'Diario de operaciones' },
  { to: '/ajustes', icon: '⚙️', label: 'Ajustes', desc: 'Perfil y copia de seguridad' },
]

export default function More() {
  const db = useDB()
  const counts = {
    tareas: db.tasks.length,
    metas: db.goals.length + db.habits.length,
    salud: db.healthLogs.length + db.journal.length,
    finanzas: db.transactions.length,
    trading: db.trades.length,
  } as Record<string, number>

  return (
    <div className="screen">
      <PageHead title="Más" sub="Todas las secciones" />
      <div className="card" style={{ padding: 4 }}>
        {TILES.map((t, i) => (
          <Link key={t.to} to={t.to} className="tile" style={{ borderBottom: i < TILES.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <span className="tile-ico">{t.icon}</span>
            <div className="grow">
              <div style={{ fontWeight: 600 }}>{t.label}</div>
              <div className="meta">{t.desc}{counts[t.to.slice(1)] ? ` · ${counts[t.to.slice(1)]}` : ''}</div>
            </div>
            <span className="chev">›</span>
          </Link>
        ))}
      </div>
      <p className="muted center" style={{ fontSize: 12, marginTop: 20 }}>Mi Vida · v1.0 · Tus datos se guardan solo en este dispositivo</p>
    </div>
  )
}
