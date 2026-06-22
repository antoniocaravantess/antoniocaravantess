import { useMemo, useState } from 'react'
import { useDB, update } from '../store/db'
import type { Priority, Task } from '../types'
import { Empty, Fab, Field, PageHead, Segmented, Sheet } from '../components/ui'
import { relativeDay, todayISO, uid } from '../lib/util'

type Filter = 'hoy' | 'prox' | 'todas' | 'hechas'

const PRIO: Record<Priority, { label: string; color: string }> = {
  high: { label: 'Alta', color: 'var(--red)' },
  medium: { label: 'Media', color: 'var(--amber)' },
  low: { label: 'Baja', color: 'var(--cyan)' },
}

export default function Tasks() {
  const db = useDB()
  const [filter, setFilter] = useState<Filter>('hoy')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)
  const [form, setForm] = useState<Partial<Task>>({})

  const tasks = db.tasks
  const today = todayISO()

  const filtered = useMemo(() => {
    const list = [...tasks].sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1
      const da = a.due || '9999'
      const dbb = b.due || '9999'
      if (da !== dbb) return da < dbb ? -1 : 1
      return b.createdAt - a.createdAt
    })
    switch (filter) {
      case 'hoy':
        return list.filter((t) => !t.done && (!t.due || t.due <= today))
      case 'prox':
        return list.filter((t) => !t.done && t.due && t.due > today)
      case 'hechas':
        return list.filter((t) => t.done)
      default:
        return list.filter((t) => !t.done)
    }
  }, [tasks, filter, today])

  const pendingToday = tasks.filter((t) => !t.done && (!t.due || t.due <= today)).length

  function openNew() {
    setEditing(null)
    setForm({ priority: 'medium', due: today })
    setOpen(true)
  }
  function openEdit(t: Task) {
    setEditing(t)
    setForm({ ...t })
    setOpen(true)
  }
  function save() {
    if (!form.title?.trim()) return
    if (editing) {
      update((d) => {
        const t = d.tasks.find((x) => x.id === editing.id)
        if (t) Object.assign(t, { title: form.title!.trim(), due: form.due || undefined, priority: form.priority || 'medium', category: form.category?.trim() || undefined })
      })
    } else {
      update((d) => {
        d.tasks.push({
          id: uid(),
          title: form.title!.trim(),
          done: false,
          due: form.due || undefined,
          priority: (form.priority as Priority) || 'medium',
          category: form.category?.trim() || undefined,
          createdAt: Date.now(),
        })
      })
    }
    setOpen(false)
  }
  function toggle(t: Task) {
    update((d) => {
      const x = d.tasks.find((i) => i.id === t.id)
      if (x) {
        x.done = !x.done
        x.completedAt = x.done ? Date.now() : undefined
      }
    })
  }
  function remove() {
    if (!editing) return
    update((d) => {
      d.tasks = d.tasks.filter((t) => t.id !== editing.id)
    })
    setOpen(false)
  }

  return (
    <div className="screen">
      <PageHead title="Tareas" sub={pendingToday ? `${pendingToday} pendiente${pendingToday > 1 ? 's' : ''} para hoy` : '¡Sin pendientes hoy! 🎉'} />

      <Segmented
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'hoy', label: 'Hoy' },
          { value: 'prox', label: 'Próximas' },
          { value: 'todas', label: 'Todas' },
          { value: 'hechas', label: 'Hechas' },
        ]}
      />

      <div className="card mt">
        {filtered.length === 0 ? (
          <Empty emoji="✅" title="Nada por aquí" hint="Pulsa + para añadir una tarea" />
        ) : (
          filtered.map((t) => (
            <div className="item" key={t.id}>
              <button className={`check${t.done ? ' on' : ''}`} onClick={() => toggle(t)}>
                ✓
              </button>
              <div className="grow" onClick={() => openEdit(t)} style={{ cursor: 'pointer' }}>
                <div className="title" style={{ textDecoration: t.done ? 'line-through' : 'none', opacity: t.done ? 0.55 : 1 }}>
                  {t.title}
                </div>
                <div className="meta flex" style={{ gap: 8 }}>
                  <span style={{ color: PRIO[t.priority].color }}>● {PRIO[t.priority].label}</span>
                  {t.due && <span>· {relativeDay(t.due)}</span>}
                  {t.category && <span>· {t.category}</span>}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <Fab onClick={openNew} />

      <Sheet open={open} onClose={() => setOpen(false)} title={editing ? 'Editar tarea' : 'Nueva tarea'}>
        <Field label="¿Qué hay que hacer?">
          <input className="input" autoFocus value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ej. Llamar al banco" />
        </Field>
        <div className="row">
          <Field label="Fecha límite">
            <input className="input" type="date" value={form.due || ''} onChange={(e) => setForm({ ...form, due: e.target.value })} />
          </Field>
          <Field label="Prioridad">
            <select className="select" value={form.priority || 'medium'} onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })}>
              <option value="high">Alta</option>
              <option value="medium">Media</option>
              <option value="low">Baja</option>
            </select>
          </Field>
        </div>
        <Field label="Categoría (opcional)">
          <input className="input" value={form.category || ''} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Ej. Trabajo, Casa, Personal" />
        </Field>
        <button className="btn primary block mt" onClick={save}>
          {editing ? 'Guardar cambios' : 'Añadir tarea'}
        </button>
        {editing && (
          <button className="btn danger block" style={{ marginTop: 10 }} onClick={remove}>
            Eliminar
          </button>
        )}
      </Sheet>
    </div>
  )
}
