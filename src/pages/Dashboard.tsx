import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useDB, update } from '../store/db'
import { goalProgress } from './Goals'
import { Progress } from '../components/ui'
import { convert, useFx } from '../store/fx'
import { formatMoney, monthKey, todayISO, uid } from '../lib/util'

function greeting(): string {
  const h = new Date().getHours()
  if (h < 6) return 'Buenas noches'
  if (h < 13) return 'Buenos días'
  if (h < 21) return 'Buenas tardes'
  return 'Buenas noches'
}

export default function Dashboard() {
  const db = useDB()
  const cur = db.profile.currency
  const tradingCur = db.profile.tradingCurrency || 'USD'
  const fx = useFx()
  const today = todayISO()
  const thisMonth = monthKey(today)

  const tasksToday = db.tasks.filter((t) => !t.done && (!t.due || t.due <= today)).sort((a, b) => (a.due || '0') < (b.due || '0') ? -1 : 1)
  const doneToday = db.tasks.filter((t) => t.done && t.completedAt && todayISO(new Date(t.completedAt)) === today).length

  const habitDone = useMemo(() => new Set(db.habitLogs.filter((l) => l.date === today).map((l) => l.habitId)), [db.habitLogs, today])
  const habits = db.habits.filter((h) => !h.archived)
  const habitsDoneCount = habits.filter((h) => habitDone.has(h.id)).length

  const monthTx = db.transactions.filter((t) => monthKey(t.date) === thisMonth)
  const monthBalance = monthTx.reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0)

  const monthTrades = db.trades.filter((t) => monthKey(t.date) === thisMonth)
  const monthPnl = monthTrades.reduce((s, t) => s + t.pnl, 0)

  const activeGoals = db.goals.filter((g) => g.status === 'active').sort((a, b) => goalProgress(b) - goalProgress(a)).slice(0, 3)

  function toggleTask(id: string) {
    update((d) => {
      const t = d.tasks.find((x) => x.id === id)
      if (t) {
        t.done = !t.done
        t.completedAt = t.done ? Date.now() : undefined
      }
    })
  }
  function toggleHabit(id: string) {
    update((d) => {
      const ex = d.habitLogs.find((l) => l.habitId === id && l.date === today)
      if (ex) d.habitLogs = d.habitLogs.filter((l) => !(l.habitId === id && l.date === today))
      else d.habitLogs.push({ id: uid(), habitId: id, date: today })
    })
  }

  const name = db.profile.name.trim()
  const dateLabel = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })

  const isEmpty =
    db.tasks.length === 0 &&
    db.goals.length === 0 &&
    db.habits.length === 0 &&
    db.trades.length === 0 &&
    db.transactions.length === 0 &&
    db.healthLogs.length === 0 &&
    db.journal.length === 0

  // Primer arranque: bienvenida centrada a pantalla completa (sin huecos vacíos).
  if (isEmpty) {
    return (
      <div className="screen screen-center">
        <div className="center" style={{ maxWidth: 340 }}>
          <div style={{ fontSize: 56 }}>🚀</div>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: '12px 0 6px' }}>
            {greeting()}{name ? `, ${name.split(' ')[0]}` : ''}
          </h1>
          <p className="muted" style={{ marginTop: 0, fontSize: 15.5, lineHeight: 1.5 }}>
            Bienvenido a <strong className="gold-text">Mi Vida</strong>. Empieza creando una meta, un hábito o registrando tu primera operación.
          </p>
          <div className="flex" style={{ gap: 10, justifyContent: 'center', marginTop: 20, flexWrap: 'wrap' }}>
            <Link to="/metas" className="btn primary">🎯 Crear meta</Link>
            <Link to="/tareas" className="btn">📝 Tarea</Link>
            <Link to="/trading" className="btn">📈 Trading</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="screen">
      <div className="page-head">
        <div>
          <h1>{greeting()}{name ? `, ${name.split(' ')[0]}` : ''}</h1>
          <div className="sub" style={{ textTransform: 'capitalize' }}>{dateLabel}</div>
        </div>
      </div>

      {/* Resumen rápido */}
      <div className="grid grid-2">
        <Link to="/finanzas" className="stat" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="label">💰 Balance del mes</div>
          <div className={`value sm ${monthBalance >= 0 ? 'pos' : 'neg'}`}>{monthBalance >= 0 ? '' : '−'}{formatMoney(Math.abs(monthBalance), cur)}</div>
        </Link>
        <Link to="/trading" className="stat" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="label">📈 Trading del mes</div>
          <div className={`value sm ${monthPnl >= 0 ? 'pos' : 'neg'}`}>{monthPnl >= 0 ? '+' : '−'}{formatMoney(Math.abs(monthPnl), tradingCur)}</div>
          {(() => {
            const m = convert(fx, monthPnl, tradingCur, cur)
            return m == null ? null : (
              <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>≈ {monthPnl >= 0 ? '+' : '−'}{formatMoney(Math.abs(m), cur)}</div>
            )
          })()}
        </Link>
      </div>

      {/* Tareas de hoy */}
      <div className="flex between" style={{ margin: '22px 4px 10px' }}>
        <span className="section-title" style={{ margin: 0 }}>Hoy</span>
        <Link to="/tareas" className="muted" style={{ fontSize: 13, textDecoration: 'none' }}>Ver tareas →</Link>
      </div>
      <div className="card">
        {tasksToday.length === 0 ? (
          <div className="flex" style={{ gap: 10, color: 'var(--muted)' }}>
            <span style={{ fontSize: 22 }}>{doneToday > 0 ? '🎉' : '☀️'}</span>
            <span>{doneToday > 0 ? `¡${doneToday} tarea${doneToday > 1 ? 's' : ''} completada${doneToday > 1 ? 's' : ''} hoy!` : 'No tienes tareas pendientes para hoy.'}</span>
          </div>
        ) : (
          tasksToday.slice(0, 5).map((t) => (
            <div className="item" key={t.id}>
              <button className="check" onClick={() => toggleTask(t.id)}>✓</button>
              <div className="grow title">{t.title}</div>
              {t.priority === 'high' && <span className="badge red">Alta</span>}
            </div>
          ))
        )}
      </div>

      {/* Hábitos de hoy */}
      {habits.length > 0 && (
        <>
          <div className="flex between" style={{ margin: '22px 4px 10px' }}>
            <span className="section-title" style={{ margin: 0 }}>Hábitos · {habitsDoneCount}/{habits.length}</span>
            <Link to="/metas" className="muted" style={{ fontSize: 13, textDecoration: 'none' }}>Ver todo →</Link>
          </div>
          <div className="card">
            <div className="chips">
              {habits.map((h) => {
                const on = habitDone.has(h.id)
                return (
                  <button key={h.id} type="button" className="chip" onClick={() => toggleHabit(h.id)} style={{ background: on ? h.color : 'var(--surface)', color: on ? '#04121f' : 'var(--muted)', borderColor: on ? h.color : 'var(--border-strong)', fontWeight: 600 }}>
                    {on ? '✓ ' : ''}{h.emoji} {h.name}
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* Metas activas */}
      {activeGoals.length > 0 && (
        <>
          <div className="flex between" style={{ margin: '22px 4px 10px' }}>
            <span className="section-title" style={{ margin: 0 }}>Tus metas</span>
            <Link to="/metas" className="muted" style={{ fontSize: 13, textDecoration: 'none' }}>Ver todo →</Link>
          </div>
          <div className="card stack">
            {activeGoals.map((g) => (
              <div key={g.id}>
                <div className="flex between" style={{ marginBottom: 6 }}>
                  <span className="truncate" style={{ fontWeight: 600 }}>{g.title}</span>
                  <span className="muted" style={{ fontSize: 13 }}>{goalProgress(g)}%</span>
                </div>
                <Progress value={goalProgress(g)} />
              </div>
            ))}
          </div>
        </>
      )}

      {/* Onboarding suave */}
      {db.tasks.length === 0 && db.goals.length === 0 && db.habits.length === 0 && db.trades.length === 0 && (
        <div className="card mt center" style={{ padding: 24 }}>
          <div style={{ fontSize: 38 }}>🚀</div>
          <p style={{ fontWeight: 700, marginBottom: 4 }}>¡Bienvenido a Mi Vida!</p>
          <p className="muted" style={{ fontSize: 14, marginTop: 0 }}>Empieza creando una meta, un hábito o registrando tu primera operación.</p>
          <div className="flex" style={{ gap: 10, justifyContent: 'center', marginTop: 14, flexWrap: 'wrap' }}>
            <Link to="/metas" className="btn sm primary">🎯 Crear meta</Link>
            <Link to="/trading" className="btn sm">📈 Trading</Link>
            <Link to="/ajustes" className="btn sm">⚙️ Ajustes</Link>
          </div>
        </div>
      )}
    </div>
  )
}
