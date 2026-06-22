import { useMemo, useState } from 'react'
import { useDB, update } from '../store/db'
import type { Goal, GoalStatus, Habit, HabitFrequency } from '../types'
import { Empty, Fab, Field, PageHead, Progress, Segmented, Sheet } from '../components/ui'
import { addDays, parseISO, relativeDay, startOfWeekISO, todayISO, uid } from '../lib/util'

type Tab = 'metas' | 'habitos'
const HABIT_COLORS = ['#5b8cff', '#34d399', '#fbbf24', '#f472b6', '#22d3ee', '#8b5cf6', '#f87171']
const EMOJIS = ['💪', '📚', '🏃', '🧘', '💧', '🥗', '😴', '🚭', '✍️', '🎯', '💻', '🎸']

export default function Goals() {
  const [tab, setTab] = useState<Tab>('metas')
  return (
    <div className="screen">
      <PageHead title="Metas y hábitos" sub="Define tu rumbo y construye constancia" />
      <Segmented
        value={tab}
        onChange={setTab}
        grad
        options={[
          { value: 'metas', label: '🎯 Metas' },
          { value: 'habitos', label: '🔁 Hábitos' },
        ]}
      />
      {tab === 'metas' ? <GoalsTab /> : <HabitsTab />}
    </div>
  )
}

// ---------------- Metas ----------------
function goalProgress(g: Goal): number {
  if (g.status === 'done') return 100
  if (g.milestones.length === 0) return g.status === 'active' ? 0 : 0
  return Math.round((g.milestones.filter((m) => m.done).length / g.milestones.length) * 100)
}

function GoalsTab() {
  const db = useDB()
  const [open, setOpen] = useState(false)
  const [detail, setDetail] = useState<Goal | null>(null)
  const [form, setForm] = useState<Partial<Goal>>({})
  const [newMs, setNewMs] = useState('')

  const goals = [...db.goals].sort((a, b) => {
    const order = { active: 0, paused: 1, done: 2 }
    if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status]
    return (a.deadline || '9999') < (b.deadline || '9999') ? -1 : 1
  })

  const current = detail ? db.goals.find((g) => g.id === detail.id) || null : null

  function openNew() {
    setForm({ status: 'active' })
    setOpen(true)
  }
  function create() {
    if (!form.title?.trim()) return
    update((d) => {
      d.goals.push({
        id: uid(),
        title: form.title!.trim(),
        description: form.description?.trim() || undefined,
        category: form.category?.trim() || undefined,
        deadline: form.deadline || undefined,
        status: 'active',
        milestones: [],
        createdAt: Date.now(),
      })
    })
    setOpen(false)
  }
  function setStatus(id: string, status: GoalStatus) {
    update((d) => {
      const g = d.goals.find((x) => x.id === id)
      if (g) g.status = status
    })
  }
  function toggleMs(goalId: string, msId: string) {
    update((d) => {
      const g = d.goals.find((x) => x.id === goalId)
      const m = g?.milestones.find((x) => x.id === msId)
      if (m) m.done = !m.done
    })
  }
  function addMs(goalId: string) {
    if (!newMs.trim()) return
    update((d) => {
      const g = d.goals.find((x) => x.id === goalId)
      g?.milestones.push({ id: uid(), title: newMs.trim(), done: false })
    })
    setNewMs('')
  }
  function removeMs(goalId: string, msId: string) {
    update((d) => {
      const g = d.goals.find((x) => x.id === goalId)
      if (g) g.milestones = g.milestones.filter((m) => m.id !== msId)
    })
  }
  function removeGoal(id: string) {
    update((d) => {
      d.goals = d.goals.filter((g) => g.id !== id)
    })
    setDetail(null)
  }

  return (
    <>
      <div className="mt stack">
        {goals.length === 0 ? (
          <div className="card">
            <Empty emoji="🎯" title="Aún no tienes metas" hint="¿Qué quieres lograr? Pulsa + para empezar" />
          </div>
        ) : (
          goals.map((g) => {
            const p = goalProgress(g)
            return (
              <div className="card" key={g.id} onClick={() => setDetail(g)} style={{ cursor: 'pointer' }}>
                <div className="flex between">
                  <div className="grow" style={{ minWidth: 0 }}>
                    <div className="flex" style={{ gap: 8 }}>
                      <span className="title" style={{ fontWeight: 700 }}>{g.title}</span>
                      {g.status === 'done' && <span className="badge green">Completada</span>}
                      {g.status === 'paused' && <span className="badge amber">En pausa</span>}
                    </div>
                    {g.category && <div className="meta">{g.category}</div>}
                  </div>
                  <span style={{ fontWeight: 800 }}>{p}%</span>
                </div>
                <div className="mt">
                  <Progress value={p} />
                </div>
                <div className="flex between meta" style={{ marginTop: 8 }}>
                  <span>{g.milestones.length > 0 ? `${g.milestones.filter((m) => m.done).length}/${g.milestones.length} pasos` : 'Sin pasos'}</span>
                  {g.deadline && <span>📅 {relativeDay(g.deadline)}</span>}
                </div>
              </div>
            )
          })
        )}
      </div>

      <Fab onClick={openNew} />

      {/* Crear meta */}
      <Sheet open={open} onClose={() => setOpen(false)} title="Nueva meta">
        <Field label="Meta">
          <input className="input" autoFocus value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ej. Ahorrar 5.000 €" />
        </Field>
        <Field label="Descripción (opcional)">
          <textarea className="input" value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="¿Por qué es importante para ti?" />
        </Field>
        <div className="row">
          <Field label="Categoría">
            <input className="input" value={form.category || ''} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Salud, Dinero…" />
          </Field>
          <Field label="Fecha objetivo">
            <input className="input" type="date" value={form.deadline || ''} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
          </Field>
        </div>
        <button className="btn primary block mt" onClick={create}>Crear meta</button>
      </Sheet>

      {/* Detalle de meta */}
      <Sheet open={!!current} onClose={() => setDetail(null)} title={current?.title}>
        {current && (
          <>
            {current.description && <p className="muted" style={{ marginTop: -6 }}>{current.description}</p>}
            <div className="flex between mt mb">
              <span className="muted">Progreso</span>
              <span style={{ fontWeight: 800 }}>{goalProgress(current)}%</span>
            </div>
            <Progress value={goalProgress(current)} />

            <div className="section-title">Pasos</div>
            {current.milestones.length === 0 && <p className="muted" style={{ fontSize: 13 }}>Divide tu meta en pasos pequeños y alcanzables.</p>}
            {current.milestones.map((m) => (
              <div className="item" key={m.id}>
                <button className={`check${m.done ? ' on' : ''}`} onClick={() => toggleMs(current.id, m.id)}>✓</button>
                <div className="grow title" style={{ textDecoration: m.done ? 'line-through' : 'none', opacity: m.done ? 0.55 : 1, fontWeight: 500 }}>{m.title}</div>
                <button className="btn ghost sm" onClick={() => removeMs(current.id, m.id)}>✕</button>
              </div>
            ))}
            <div className="row mt">
              <input className="input" value={newMs} onChange={(e) => setNewMs(e.target.value)} placeholder="Añadir paso…" onKeyDown={(e) => e.key === 'Enter' && addMs(current.id)} style={{ flex: 3 }} />
              <button className="btn" onClick={() => addMs(current.id)} style={{ flex: 1 }}>Añadir</button>
            </div>

            <div className="section-title">Estado</div>
            <Segmented
              value={current.status}
              onChange={(s) => setStatus(current.id, s)}
              options={[
                { value: 'active', label: 'Activa' },
                { value: 'paused', label: 'Pausa' },
                { value: 'done', label: 'Lograda' },
              ]}
            />
            <button className="btn danger block" style={{ marginTop: 18 }} onClick={() => removeGoal(current.id)}>Eliminar meta</button>
          </>
        )}
      </Sheet>
    </>
  )
}

// ---------------- Hábitos ----------------
function last7(): string[] {
  const today = todayISO()
  return Array.from({ length: 7 }, (_, i) => addDays(today, i - 6))
}
function streakOf(logs: Set<string>): number {
  let s = 0
  let day = todayISO()
  // si hoy no está marcado, empezamos a contar desde ayer
  if (!logs.has(day)) day = addDays(day, -1)
  while (logs.has(day)) {
    s++
    day = addDays(day, -1)
  }
  return s
}

function HabitsTab() {
  const db = useDB()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<Partial<Habit>>({})
  const days = last7()
  const today = todayISO()
  const weekStart = startOfWeekISO()

  const logsByHabit = useMemo(() => {
    const map: Record<string, Set<string>> = {}
    for (const l of db.habitLogs) {
      ;(map[l.habitId] ||= new Set()).add(l.date)
    }
    return map
  }, [db.habitLogs])

  const habits = db.habits.filter((h) => !h.archived)

  function toggle(habitId: string, date: string) {
    update((d) => {
      const exists = d.habitLogs.find((l) => l.habitId === habitId && l.date === date)
      if (exists) d.habitLogs = d.habitLogs.filter((l) => !(l.habitId === habitId && l.date === date))
      else d.habitLogs.push({ id: uid(), habitId, date })
    })
  }
  function openNew() {
    setForm({ frequency: 'daily', emoji: '💪', color: HABIT_COLORS[0], targetPerWeek: 5 })
    setOpen(true)
  }
  function create() {
    if (!form.name?.trim()) return
    update((d) => {
      d.habits.push({
        id: uid(),
        name: form.name!.trim(),
        emoji: form.emoji || '✅',
        color: form.color || HABIT_COLORS[0],
        frequency: (form.frequency as HabitFrequency) || 'daily',
        targetPerWeek: form.frequency === 'weekly' ? form.targetPerWeek || 3 : undefined,
        createdAt: Date.now(),
      })
    })
    setOpen(false)
  }
  function archive(id: string) {
    update((d) => {
      const h = d.habits.find((x) => x.id === id)
      if (h) h.archived = true
    })
  }

  return (
    <>
      <div className="mt stack">
        {habits.length === 0 ? (
          <div className="card">
            <Empty emoji="🔁" title="Sin hábitos todavía" hint="Los pequeños hábitos diarios crean grandes cambios" />
          </div>
        ) : (
          habits.map((h) => {
            const logs = logsByHabit[h.id] || new Set<string>()
            const streak = streakOf(logs)
            const weekCount = [...logs].filter((d) => d >= weekStart).length
            return (
              <div className="card" key={h.id}>
                <div className="flex between">
                  <div className="flex" style={{ gap: 10, minWidth: 0 }}>
                    <span style={{ fontSize: 22 }}>{h.emoji}</span>
                    <div style={{ minWidth: 0 }}>
                      <div className="title truncate">{h.name}</div>
                      <div className="meta">
                        {h.frequency === 'weekly' ? `${weekCount}/${h.targetPerWeek} esta semana` : 'Cada día'}
                      </div>
                    </div>
                  </div>
                  <span className="badge amber" onClick={() => archive(h.id)} title="Archivar (mantener pulsado)">
                    🔥 {streak}
                  </span>
                </div>
                <div className="flex between mt" style={{ gap: 6 }}>
                  {days.map((d) => {
                    const on = logs.has(d)
                    const isToday = d === today
                    return (
                      <button
                        key={d}
                        onClick={() => toggle(h.id, d)}
                        style={{
                          flex: 1,
                          aspectRatio: '1',
                          maxWidth: 42,
                          borderRadius: 10,
                          border: isToday ? `2px solid ${h.color}` : '1px solid var(--border)',
                          background: on ? h.color : 'var(--surface)',
                          color: on ? '#04121f' : 'var(--faint)',
                          fontSize: 11,
                          fontWeight: 700,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <span style={{ fontSize: 9, opacity: 0.8 }}>{['L', 'M', 'X', 'J', 'V', 'S', 'D'][(parseISO(d).getDay() + 6) % 7]}</span>
                        <span>{Number(d.slice(8))}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}
      </div>

      <Fab onClick={openNew} />

      <Sheet open={open} onClose={() => setOpen(false)} title="Nuevo hábito">
        <Field label="Nombre del hábito">
          <input className="input" autoFocus value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej. Hacer ejercicio" />
        </Field>
        <Field label="Icono">
          <div className="chips">
            {EMOJIS.map((e) => (
              <button key={e} type="button" className={`chip${form.emoji === e ? ' on' : ''}`} onClick={() => setForm({ ...form, emoji: e })} style={{ fontSize: 18 }}>
                {e}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Color">
          <div className="chips">
            {HABIT_COLORS.map((c) => (
              <button key={c} type="button" onClick={() => setForm({ ...form, color: c })} style={{ width: 32, height: 32, borderRadius: '50%', background: c, border: form.color === c ? '3px solid var(--text)' : '2px solid var(--border)' }} />
            ))}
          </div>
        </Field>
        <Field label="Frecuencia">
          <Segmented
            value={form.frequency || 'daily'}
            onChange={(f) => setForm({ ...form, frequency: f })}
            options={[
              { value: 'daily', label: 'Diario' },
              { value: 'weekly', label: 'Semanal' },
            ]}
          />
        </Field>
        {form.frequency === 'weekly' && (
          <Field label={`Veces por semana: ${form.targetPerWeek || 3}`}>
            <input type="range" min={1} max={7} value={form.targetPerWeek || 3} onChange={(e) => setForm({ ...form, targetPerWeek: Number(e.target.value) })} style={{ width: '100%' }} />
          </Field>
        )}
        <button className="btn primary block mt" onClick={create}>Crear hábito</button>
        <p className="muted center" style={{ fontSize: 12, marginTop: 12 }}>Consejo: toca la 🔥 de un hábito para archivarlo.</p>
      </Sheet>
    </>
  )
}

// Reutilizado por el panel de inicio
export { goalProgress }
