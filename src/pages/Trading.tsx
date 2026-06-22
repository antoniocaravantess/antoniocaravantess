import { useMemo, useState } from 'react'
import { useDB, update } from '../store/db'
import type { Trade, TradeDirection } from '../types'
import { LineChart } from '../components/charts'
import { Empty, Fab, Field, PageHead, Segmented, Sheet, Stat } from '../components/ui'
import { formatDate, formatMoney, formatNumber, monthKey, todayISO, uid } from '../lib/util'
import { convert, rateOf, useFx } from '../store/fx'

type Period = 'mes' | 'todo'

export default function Trading() {
  const db = useDB()
  const cur = db.profile.tradingCurrency || 'USD'
  const mainCur = db.profile.currency || 'GTQ'
  const fx = useFx()
  const rate = rateOf(fx, cur, mainCur)
  // muestra "≈ Q…" con el equivalente en la moneda principal
  const toMain = (amount: number) => {
    const v = convert(fx, amount, cur, mainCur)
    return v == null ? null : formatMoney(v, mainCur)
  }
  const [period, setPeriod] = useState<Period>('todo')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Trade | null>(null)
  const [form, setForm] = useState<Partial<Trade>>({})

  const allByDate = useMemo(() => [...db.trades].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.createdAt - b.createdAt)), [db.trades])

  const thisMonth = monthKey(todayISO())
  const scoped = period === 'mes' ? allByDate.filter((t) => monthKey(t.date) === thisMonth) : allByDate

  const stats = useMemo(() => {
    const n = scoped.length
    const pnl = scoped.reduce((s, t) => s + t.pnl, 0)
    const wins = scoped.filter((t) => t.pnl > 0)
    const losses = scoped.filter((t) => t.pnl < 0)
    const grossWin = wins.reduce((s, t) => s + t.pnl, 0)
    const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0))
    const decided = wins.length + losses.length
    return {
      n,
      pnl,
      winRate: decided ? (wins.length / decided) * 100 : 0,
      profitFactor: grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : 0,
      avgWin: wins.length ? grossWin / wins.length : 0,
      avgLoss: losses.length ? grossLoss / losses.length : 0,
      best: n ? Math.max(...scoped.map((t) => t.pnl)) : 0,
      worst: n ? Math.min(...scoped.map((t) => t.pnl)) : 0,
      wins: wins.length,
      losses: losses.length,
    }
  }, [scoped])

  // Curva de capital sobre TODO el histórico
  const equity = useMemo(() => {
    let bal = db.profile.startingCapital
    const pts = [bal]
    for (const t of allByDate) {
      bal += t.pnl
      pts.push(bal)
    }
    return pts
  }, [allByDate, db.profile.startingCapital])

  const listed = period === 'mes' ? [...scoped].reverse() : [...allByDate].reverse()

  function openNew() {
    setEditing(null)
    setForm({ date: todayISO(), direction: 'long' })
    setOpen(true)
  }
  function openEdit(t: Trade) {
    setEditing(t)
    setForm({ ...t })
    setOpen(true)
  }
  function save() {
    if (!form.symbol?.trim() || form.pnl === undefined || Number.isNaN(Number(form.pnl))) return
    const data = {
      date: form.date || todayISO(),
      symbol: form.symbol!.trim().toUpperCase(),
      direction: (form.direction as TradeDirection) || 'long',
      pnl: Number(form.pnl),
      rMultiple: form.rMultiple !== undefined && form.rMultiple !== null && String(form.rMultiple) !== '' ? Number(form.rMultiple) : undefined,
      strategy: form.strategy?.trim() || undefined,
      notes: form.notes?.trim() || undefined,
    }
    if (editing) {
      update((d) => {
        const t = d.trades.find((x) => x.id === editing.id)
        if (t) Object.assign(t, data)
      })
    } else {
      update((d) => {
        d.trades.push({ id: uid(), createdAt: Date.now(), ...data })
      })
    }
    setOpen(false)
  }
  function remove() {
    if (!editing) return
    update((d) => {
      d.trades = d.trades.filter((t) => t.id !== editing.id)
    })
    setOpen(false)
  }

  return (
    <div className="screen">
      <PageHead title="Trading" sub="Tu diario de operaciones" />

      <Segmented value={period} onChange={setPeriod} options={[{ value: 'mes', label: 'Este mes' }, { value: 'todo', label: 'Histórico' }]} />

      <div className="card mt">
        <div className="muted" style={{ fontSize: 13 }}>Resultado {period === 'mes' ? 'del mes' : 'total'}</div>
        <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.02em', margin: '4px 0 2px' }} className={stats.pnl >= 0 ? 'pos' : 'neg'}>
          {stats.pnl >= 0 ? '+' : '−'}{formatMoney(Math.abs(stats.pnl), cur)}
        </div>
        {toMain(stats.pnl) && (
          <div className="muted" style={{ fontSize: 14, marginBottom: 2 }}>
            ≈ {stats.pnl >= 0 ? '+' : '−'}{toMain(Math.abs(stats.pnl))}
          </div>
        )}
        <div className="muted" style={{ fontSize: 12 }}>
          {stats.n} operacion{stats.n === 1 ? '' : 'es'} · {stats.wins}G / {stats.losses}P
        </div>
        <div className="muted" style={{ fontSize: 11, marginTop: 6 }}>
          {rate != null
            ? `1 ${cur} = ${formatMoney(rate, mainCur)}${fx.source ? ` · ${fx.source}` : ''}${fx.date ? ` ${fx.date}` : ''}`
            : fx.status === 'loading'
              ? 'Obteniendo tipo de cambio…'
              : 'Tipo de cambio no disponible (sin conexión)'}
        </div>
      </div>

      <div className="grid grid-2 mt">
        <Stat label="Win rate" value={`${formatNumber(stats.winRate, 0)}%`} icon="🎯" tone={stats.winRate >= 50 ? 'pos' : undefined} />
        <Stat label="Profit factor" value={stats.profitFactor === Infinity ? '∞' : formatNumber(stats.profitFactor, 2)} icon="⚖️" tone={stats.profitFactor >= 1 ? 'pos' : 'neg'} />
        <Stat label="Ganancia media" value={formatMoney(stats.avgWin, cur)} icon="📗" tone="pos" />
        <Stat label="Pérdida media" value={formatMoney(stats.avgLoss, cur)} icon="📕" tone="neg" />
      </div>

      <div className="card mt">
        <div className="flex between">
          <div className="section-title" style={{ margin: 0 }}>Curva de capital</div>
          <span className="muted" style={{ fontSize: 12 }}>{formatMoney(equity[equity.length - 1], cur)}</span>
        </div>
        <div className="mt">
          {allByDate.length === 0 ? (
            <p className="muted center" style={{ fontSize: 13, padding: 16 }}>Registra operaciones para ver tu evolución.</p>
          ) : (
            <LineChart data={equity} color={equity[equity.length - 1] >= equity[0] ? 'var(--green)' : 'var(--red)'} height={150} />
          )}
        </div>
        {allByDate.length > 0 && toMain(equity[equity.length - 1]) && (
          <div className="muted center" style={{ fontSize: 12, marginTop: 8 }}>
            ≈ {toMain(equity[equity.length - 1])} al cambio actual
          </div>
        )}
      </div>

      <div className="section-title">Operaciones</div>
      <div className="card">
        {listed.length === 0 ? (
          <Empty emoji="📈" title="Sin operaciones" hint="Registra tu primera operación con +" />
        ) : (
          listed.slice(0, 50).map((t) => (
            <div className="item" key={t.id} onClick={() => openEdit(t)} style={{ cursor: 'pointer' }}>
              <div style={{ width: 40, flexShrink: 0, textAlign: 'center' }}>
                <span className={`badge ${t.direction === 'long' ? 'green' : 'red'}`} style={{ fontSize: 10 }}>
                  {t.direction === 'long' ? 'LONG' : 'SHORT'}
                </span>
              </div>
              <div className="grow" style={{ minWidth: 0 }}>
                <div className="title">{t.symbol}</div>
                <div className="meta">{formatDate(t.date)}{t.strategy ? ` · ${t.strategy}` : ''}{t.rMultiple !== undefined ? ` · ${t.rMultiple > 0 ? '+' : ''}${formatNumber(t.rMultiple, 1)}R` : ''}</div>
              </div>
              <div className={t.pnl >= 0 ? 'pos' : 'neg'} style={{ fontWeight: 700 }}>
                {t.pnl >= 0 ? '+' : '−'}{formatMoney(Math.abs(t.pnl), cur)}
              </div>
            </div>
          ))
        )}
      </div>

      <Fab onClick={openNew} />

      <Sheet open={open} onClose={() => setOpen(false)} title={editing ? 'Editar operación' : 'Nueva operación'}>
        <div className="row">
          <Field label="Símbolo">
            <input className="input" autoFocus value={form.symbol || ''} onChange={(e) => setForm({ ...form, symbol: e.target.value })} placeholder="BTC, AAPL, EURUSD…" />
          </Field>
          <Field label="Fecha">
            <input className="input" type="date" value={form.date || ''} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </Field>
        </div>
        <Field label="Dirección">
          <Segmented
            value={form.direction || 'long'}
            onChange={(v) => setForm({ ...form, direction: v })}
            grad
            options={[{ value: 'long', label: '📈 Long' }, { value: 'short', label: '📉 Short' }]}
          />
        </Field>
        <div className="row">
          <Field label={`Resultado (${cur})`}>
            <input className="input" type="number" inputMode="decimal" value={form.pnl ?? ''} onChange={(e) => setForm({ ...form, pnl: e.target.value === '' ? undefined : Number(e.target.value) })} placeholder="Positivo o negativo" />
          </Field>
          <Field label="Múltiplo R (opc.)">
            <input className="input" type="number" inputMode="decimal" value={form.rMultiple ?? ''} onChange={(e) => setForm({ ...form, rMultiple: e.target.value === '' ? undefined : Number(e.target.value) })} placeholder="Ej. 2" />
          </Field>
        </div>
        <Field label="Estrategia (opcional)">
          <input className="input" value={form.strategy || ''} onChange={(e) => setForm({ ...form, strategy: e.target.value })} placeholder="Ej. Ruptura, Pullback…" />
        </Field>
        <Field label="Notas (opcional)">
          <textarea className="input" value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="¿Qué aprendiste de esta operación?" />
        </Field>
        <button className="btn primary block mt" onClick={save}>{editing ? 'Guardar' : 'Registrar operación'}</button>
        {editing && <button className="btn danger block" style={{ marginTop: 10 }} onClick={remove}>Eliminar</button>}
      </Sheet>
    </div>
  )
}
