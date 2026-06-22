import { useMemo, useState } from 'react'
import { useDB, update } from '../store/db'
import type { Transaction, TxType } from '../types'
import { BarChart, Donut } from '../components/charts'
import { Empty, Fab, Field, PageHead, Segmented, Sheet, Stat } from '../components/ui'
import { formatDate, formatMoney, monthKey, monthLabel, todayISO, uid } from '../lib/util'

const PALETTE = ['#5b8cff', '#34d399', '#fbbf24', '#f472b6', '#22d3ee', '#8b5cf6', '#f87171', '#a3e635', '#fb923c']
const EXPENSE_CATS = ['Comida', 'Hogar', 'Transporte', 'Ocio', 'Salud', 'Compras', 'Suscripciones', 'Otros']
const INCOME_CATS = ['Salario', 'Inversiones', 'Freelance', 'Regalo', 'Otros']

function colorFor(cat: string): string {
  let h = 0
  for (let i = 0; i < cat.length; i++) h = (h * 31 + cat.charCodeAt(i)) >>> 0
  return PALETTE[h % PALETTE.length]
}

export default function Finance() {
  const db = useDB()
  const cur = db.profile.currency
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [form, setForm] = useState<Partial<Transaction>>({})
  const thisMonth = monthKey(todayISO())

  const txs = useMemo(() => [...db.transactions].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt - a.createdAt)), [db.transactions])

  const monthTx = txs.filter((t) => monthKey(t.date) === thisMonth)
  const income = monthTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expense = monthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const balance = income - expense

  const byCat = useMemo(() => {
    const m: Record<string, number> = {}
    for (const t of monthTx) if (t.type === 'expense') m[t.category] = (m[t.category] || 0) + t.amount
    return Object.entries(m)
      .map(([label, value]) => ({ label, value, color: colorFor(label) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)
  }, [monthTx])

  const last6 = useMemo(() => {
    const months: string[] = []
    const d = new Date()
    for (let i = 5; i >= 0; i--) {
      const dd = new Date(d.getFullYear(), d.getMonth() - i, 1)
      months.push(`${dd.getFullYear()}-${String(dd.getMonth() + 1).padStart(2, '0')}`)
    }
    return months.map((mk) => {
      const exp = db.transactions.filter((t) => t.type === 'expense' && monthKey(t.date) === mk).reduce((s, t) => s + t.amount, 0)
      return { label: monthLabel(mk).split(' ')[0], value: exp }
    })
  }, [db.transactions])

  function openNew() {
    setEditing(null)
    setForm({ type: 'expense', date: todayISO(), category: 'Comida' })
    setOpen(true)
  }
  function openEdit(t: Transaction) {
    setEditing(t)
    setForm({ ...t })
    setOpen(true)
  }
  function save() {
    const amount = Number(form.amount)
    if (!amount || amount <= 0 || !form.category) return
    if (editing) {
      update((d) => {
        const t = d.transactions.find((x) => x.id === editing.id)
        if (t) Object.assign(t, { type: form.type, amount, category: form.category!, date: form.date || todayISO(), note: form.note?.trim() || undefined })
      })
    } else {
      update((d) => {
        d.transactions.push({
          id: uid(),
          type: (form.type as TxType) || 'expense',
          amount,
          category: form.category!,
          date: form.date || todayISO(),
          note: form.note?.trim() || undefined,
          createdAt: Date.now(),
        })
      })
    }
    setOpen(false)
  }
  function remove() {
    if (!editing) return
    update((d) => {
      d.transactions = d.transactions.filter((t) => t.id !== editing.id)
    })
    setOpen(false)
  }

  const cats = form.type === 'income' ? INCOME_CATS : EXPENSE_CATS

  return (
    <div className="screen">
      <PageHead title="Finanzas" sub={`Resumen de ${monthLabel(thisMonth)}`} />

      <div className="card">
        <div className="muted" style={{ fontSize: 13 }}>Balance del mes</div>
        <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.02em', margin: '4px 0 14px' }} className={balance >= 0 ? 'pos' : 'neg'}>
          {balance >= 0 ? '' : '−'}{formatMoney(Math.abs(balance), cur)}
        </div>
        <div className="grid grid-2">
          <Stat label="Ingresos" value={formatMoney(income, cur)} icon="↘️" tone="pos" />
          <Stat label="Gastos" value={formatMoney(expense, cur)} icon="↗️" tone="neg" />
        </div>
      </div>

      {byCat.length > 0 && (
        <div className="card mt">
          <div className="section-title" style={{ marginTop: 0 }}>Gastos por categoría</div>
          <Donut data={byCat} centerValue={formatMoney(expense, cur).replace(/[^\d.,€$]/g, '').slice(0, 7)} centerLabel="gastado" />
        </div>
      )}

      <div className="card mt">
        <div className="section-title" style={{ marginTop: 0 }}>Gastos últimos 6 meses</div>
        <BarChart data={last6.map((m) => ({ ...m, color: 'var(--grad)' }))} />
      </div>

      <div className="section-title">Movimientos recientes</div>
      <div className="card">
        {txs.length === 0 ? (
          <Empty emoji="💸" title="Sin movimientos" hint="Registra tus ingresos y gastos con +" />
        ) : (
          txs.slice(0, 30).map((t) => (
            <div className="item" key={t.id} onClick={() => openEdit(t)} style={{ cursor: 'pointer' }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: colorFor(t.category) + '33', color: colorFor(t.category), display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>
                {t.category.slice(0, 1)}
              </div>
              <div className="grow" style={{ minWidth: 0 }}>
                <div className="title truncate">{t.category}</div>
                <div className="meta">{formatDate(t.date)}{t.note ? ` · ${t.note}` : ''}</div>
              </div>
              <div className={t.type === 'income' ? 'pos' : 'neg'} style={{ fontWeight: 700 }}>
                {t.type === 'income' ? '+' : '−'}{formatMoney(t.amount, cur)}
              </div>
            </div>
          ))
        )}
      </div>

      <Fab onClick={openNew} />

      <Sheet open={open} onClose={() => setOpen(false)} title={editing ? 'Editar movimiento' : 'Nuevo movimiento'}>
        <Segmented
          value={form.type || 'expense'}
          onChange={(v) => setForm({ ...form, type: v, category: v === 'income' ? 'Salario' : 'Comida' })}
          grad
          options={[
            { value: 'expense', label: '↗️ Gasto' },
            { value: 'income', label: '↘️ Ingreso' },
          ]}
        />
        <Field label="Importe">
          <input className="input" type="number" inputMode="decimal" autoFocus value={form.amount ?? ''} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} placeholder="0,00" style={{ fontSize: 24, fontWeight: 700 }} />
        </Field>
        <Field label="Categoría">
          <div className="chips">
            {cats.map((c) => (
              <button key={c} type="button" className={`chip${form.category === c ? ' on' : ''}`} onClick={() => setForm({ ...form, category: c })}>
                {c}
              </button>
            ))}
          </div>
        </Field>
        <div className="row">
          <Field label="Fecha">
            <input className="input" type="date" value={form.date || ''} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </Field>
        </div>
        <Field label="Nota (opcional)">
          <input className="input" value={form.note || ''} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Detalle del movimiento" />
        </Field>
        <button className="btn primary block mt" onClick={save}>{editing ? 'Guardar' : 'Añadir'}</button>
        {editing && <button className="btn danger block" style={{ marginTop: 10 }} onClick={remove}>Eliminar</button>}
      </Sheet>
    </div>
  )
}
