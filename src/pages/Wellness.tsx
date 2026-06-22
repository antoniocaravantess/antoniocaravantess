import { useMemo, useState } from 'react'
import { useDB, update } from '../store/db'
import type { HealthLog, JournalEntry, Mood } from '../types'
import { LineChart } from '../components/charts'
import { Empty, Fab, Field, MoodPicker, PageHead, Segmented, Sheet, Stat } from '../components/ui'
import { MOOD_EMOJI, formatDate, formatNumber, startOfWeekISO, todayISO, uid } from '../lib/util'

type Tab = 'salud' | 'diario'

export default function Wellness() {
  const [tab, setTab] = useState<Tab>('salud')
  return (
    <div className="screen">
      <PageHead title="Salud y diario" sub="Cuida tu cuerpo y tu mente" />
      <Segmented
        value={tab}
        onChange={setTab}
        grad
        options={[
          { value: 'salud', label: '❤️ Salud' },
          { value: 'diario', label: '📔 Diario' },
        ]}
      />
      {tab === 'salud' ? <HealthTab /> : <JournalTab />}
    </div>
  )
}

function HealthTab() {
  const db = useDB()
  const today = todayISO()
  const weekStart = startOfWeekISO()
  const log = db.healthLogs.find((l) => l.date === today)

  function patch(p: Partial<HealthLog>) {
    update((d) => {
      let l = d.healthLogs.find((x) => x.date === today)
      if (!l) {
        l = { id: uid(), date: today, createdAt: Date.now() }
        d.healthLogs.push(l)
      }
      Object.assign(l, p)
    })
  }

  const weightSeries = useMemo(
    () =>
      [...db.healthLogs]
        .filter((l) => typeof l.weight === 'number')
        .sort((a, b) => (a.date < b.date ? -1 : 1))
        .slice(-14)
        .map((l) => l.weight as number),
    [db.healthLogs],
  )

  const last7 = db.healthLogs.filter((l) => l.date > todayISO(new Date(Date.now() - 7 * 86400000)))
  const sleepVals = last7.filter((l) => typeof l.sleepHours === 'number').map((l) => l.sleepHours as number)
  const avgSleep = sleepVals.length ? sleepVals.reduce((a, b) => a + b, 0) / sleepVals.length : 0
  const exerciseWeek = db.healthLogs.filter((l) => l.date >= weekStart).reduce((s, l) => s + (l.exerciseMinutes || 0), 0)

  const water = log?.water || 0

  return (
    <div className="mt stack">
      <div className="grid grid-3">
        <Stat label="💧 Agua hoy" value={`${water}`} />
        <Stat label="😴 Sueño 7d" value={avgSleep ? `${formatNumber(avgSleep, 1)}h` : '—'} />
        <Stat label="🏃 Ejer. sem." value={`${exerciseWeek}m`} />
      </div>

      <div className="card">
        <div className="section-title" style={{ marginTop: 0 }}>Registro de hoy</div>

        <Field label="¿Cómo te sientes?">
          <MoodPicker value={log?.mood} onChange={(m) => patch({ mood: m })} />
        </Field>

        <Field label="Agua (vasos)">
          <div className="flex" style={{ gap: 12 }}>
            <button className="btn" onClick={() => patch({ water: Math.max(0, water - 1) })} style={{ width: 48 }}>−</button>
            <div style={{ flex: 1, textAlign: 'center', fontSize: 22, fontWeight: 700 }}>{water} 💧</div>
            <button className="btn" onClick={() => patch({ water: water + 1 })} style={{ width: 48 }}>+</button>
          </div>
        </Field>

        <div className="row">
          <Field label="Peso (kg)">
            <input className="input" type="number" inputMode="decimal" value={log?.weight ?? ''} onChange={(e) => patch({ weight: e.target.value === '' ? undefined : Number(e.target.value) })} placeholder="—" />
          </Field>
          <Field label="Sueño (h)">
            <input className="input" type="number" inputMode="decimal" value={log?.sleepHours ?? ''} onChange={(e) => patch({ sleepHours: e.target.value === '' ? undefined : Number(e.target.value) })} placeholder="—" />
          </Field>
        </div>
        <Field label="Ejercicio (min)">
          <input className="input" type="number" inputMode="numeric" value={log?.exerciseMinutes ?? ''} onChange={(e) => patch({ exerciseMinutes: e.target.value === '' ? undefined : Number(e.target.value) })} placeholder="0" />
        </Field>
      </div>

      {weightSeries.length >= 2 && (
        <div className="card">
          <div className="section-title" style={{ marginTop: 0 }}>Evolución del peso</div>
          <LineChart data={weightSeries} color="var(--cyan)" height={130} />
          <div className="flex between meta mt">
            <span>{formatNumber(weightSeries[0], 1)} kg</span>
            <span className={weightSeries[weightSeries.length - 1] <= weightSeries[0] ? 'pos' : 'neg'}>
              {weightSeries[weightSeries.length - 1] - weightSeries[0] >= 0 ? '+' : ''}
              {formatNumber(weightSeries[weightSeries.length - 1] - weightSeries[0], 1)} kg
            </span>
            <span>{formatNumber(weightSeries[weightSeries.length - 1], 1)} kg</span>
          </div>
        </div>
      )}
    </div>
  )
}

function JournalTab() {
  const db = useDB()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<JournalEntry | null>(null)
  const [form, setForm] = useState<Partial<JournalEntry>>({})

  const entries = [...db.journal].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt - a.createdAt))

  function openNew() {
    setEditing(null)
    setForm({ date: todayISO(), mood: 3 })
    setOpen(true)
  }
  function openEdit(e: JournalEntry) {
    setEditing(e)
    setForm({ ...e })
    setOpen(true)
  }
  function save() {
    if (!form.body?.trim()) return
    const data = { date: form.date || todayISO(), title: form.title?.trim() || undefined, body: form.body!.trim(), mood: form.mood as Mood | undefined }
    if (editing) {
      update((d) => {
        const e = d.journal.find((x) => x.id === editing.id)
        if (e) Object.assign(e, data)
      })
    } else {
      update((d) => {
        d.journal.push({ id: uid(), createdAt: Date.now(), ...data })
      })
    }
    setOpen(false)
  }
  function remove() {
    if (!editing) return
    update((d) => {
      d.journal = d.journal.filter((e) => e.id !== editing.id)
    })
    setOpen(false)
  }

  return (
    <>
      <div className="mt stack">
        {entries.length === 0 ? (
          <div className="card">
            <Empty emoji="📔" title="Tu diario está vacío" hint="Escribe cómo te ha ido el día con +" />
          </div>
        ) : (
          entries.map((e) => (
            <div className="card" key={e.id} onClick={() => openEdit(e)} style={{ cursor: 'pointer' }}>
              <div className="flex between">
                <div className="flex" style={{ gap: 8 }}>
                  {e.mood && <span style={{ fontSize: 20 }}>{MOOD_EMOJI[e.mood]}</span>}
                  <strong>{e.title || formatDate(e.date, true)}</strong>
                </div>
                <span className="meta">{formatDate(e.date)}</span>
              </div>
              <p className="muted" style={{ margin: '8px 0 0', fontSize: 14, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {e.body}
              </p>
            </div>
          ))
        )}
      </div>

      <Fab onClick={openNew} />

      <Sheet open={open} onClose={() => setOpen(false)} title={editing ? 'Editar entrada' : 'Nueva entrada'}>
        <div className="row">
          <Field label="Fecha">
            <input className="input" type="date" value={form.date || ''} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </Field>
        </div>
        <Field label="¿Cómo te sientes?">
          <MoodPicker value={form.mood as Mood | undefined} onChange={(m) => setForm({ ...form, mood: m })} />
        </Field>
        <Field label="Título (opcional)">
          <input className="input" value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Un titular para tu día" />
        </Field>
        <Field label="¿Qué quieres recordar?">
          <textarea className="input" autoFocus value={form.body || ''} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Escribe libremente…" style={{ minHeight: 140 }} />
        </Field>
        <button className="btn primary block mt" onClick={save}>{editing ? 'Guardar' : 'Guardar entrada'}</button>
        {editing && <button className="btn danger block" style={{ marginTop: 10 }} onClick={remove}>Eliminar</button>}
      </Sheet>
    </>
  )
}
