import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { exportData, importData, resetData, update, useDB } from '../store/db'
import { rateOf, refreshFx, useFx } from '../store/fx'
import { Field, PageHead, Segmented } from '../components/ui'
import { formatMoney } from '../lib/util'

const CURRENCIES = ['GTQ', 'USD', 'EUR', 'MXN', 'HNL', 'NIO', 'CRC', 'GBP', 'ARS', 'COP', 'CLP', 'PEN', 'BRL', 'CHF']

export default function Settings() {
  const db = useDB()
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState('')
  const fx = useFx()
  const tradingCur = db.profile.tradingCurrency || 'USD'
  const rate = rateOf(fx, tradingCur, db.profile.currency)
  const updatedAt = fx.fetchedAt
    ? new Date(fx.fetchedAt).toLocaleString('es-GT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : null

  function setProfile(p: Partial<typeof db.profile>) {
    update((d) => Object.assign(d.profile, p))
  }

  function doExport() {
    const blob = new Blob([exportData()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mi-vida-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setMsg('✓ Copia descargada')
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const res = importData(String(reader.result))
      setMsg(res.ok ? '✓ Datos importados correctamente' : `Error: ${res.error}`)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  function doReset() {
    if (confirm('¿Seguro que quieres borrar TODOS tus datos? Esta acción no se puede deshacer. Te recomendamos exportar una copia antes.')) {
      resetData()
      setMsg('Datos borrados')
    }
  }

  return (
    <div className="screen">
      <PageHead title="Ajustes" />

      <div className="section-title" style={{ marginTop: 0 }}>Tu perfil</div>
      <div className="card">
        <Field label="Tu nombre">
          <input className="input" value={db.profile.name} onChange={(e) => setProfile({ name: e.target.value })} placeholder="¿Cómo te llamas?" />
        </Field>
        <div className="row">
          <Field label="Moneda principal">
            <select className="select" value={db.profile.currency} onChange={(e) => setProfile({ currency: e.target.value })}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Moneda de trading">
            <select className="select" value={tradingCur} onChange={(e) => setProfile({ tradingCurrency: e.target.value })}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label={`Capital inicial de trading (${tradingCur})`}>
          <input className="input" type="number" inputMode="decimal" value={db.profile.startingCapital || ''} onChange={(e) => setProfile({ startingCapital: Number(e.target.value) || 0 })} placeholder="0" />
        </Field>
        <p className="muted" style={{ fontSize: 12.5, margin: '2px 0 0' }}>
          {tradingCur === db.profile.currency
            ? 'La moneda de trading y la principal son la misma; no se hace conversión.'
            : rate != null
              ? `Tipo de cambio${fx.source ? ` (${fx.source})` : ''}: 1 ${tradingCur} = ${formatMoney(rate, db.profile.currency)}${fx.date ? ` · ${fx.date}` : ''}${updatedAt ? ` · sync ${updatedAt}` : ''}. Se actualiza al abrir la app.`
              : fx.status === 'loading'
                ? 'Obteniendo el tipo de cambio…'
                : 'No se pudo obtener el tipo de cambio (revisa tu conexión).'}
          {' '}
          <button className="btn ghost sm" style={{ padding: '2px 8px', marginLeft: 4 }} onClick={() => refreshFx()}>Actualizar</button>
        </p>
      </div>

      <div className="section-title">Apariencia</div>
      <div className="card">
        <Field label="Tema">
          <Segmented
            value={db.settings.theme}
            onChange={(t) => update((d) => (d.settings.theme = t))}
            options={[
              { value: 'dark', label: '🌙 Oscuro' },
              { value: 'light', label: '☀️ Claro' },
            ]}
          />
        </Field>
      </div>

      <div className="section-title">Copia de seguridad</div>
      <div className="card">
        <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
          Tus datos se guardan únicamente en este dispositivo. Exporta una copia con regularidad para no perderlos y poder pasarlos a otro móvil.
        </p>
        <div className="row">
          <button className="btn" onClick={doExport}>⬇️ Exportar</button>
          <button className="btn" onClick={() => fileRef.current?.click()}>⬆️ Importar</button>
        </div>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onFile} />
        <button className="btn danger block" style={{ marginTop: 12 }} onClick={doReset}>🗑️ Borrar todos los datos</button>
        {msg && <p className="center mt" style={{ fontSize: 13, color: 'var(--green)' }}>{msg}</p>}
      </div>

      <div className="section-title">Instalar en el móvil</div>
      <div className="card">
        <p className="muted" style={{ marginTop: 0, fontSize: 13.5, lineHeight: 1.5 }}>
          <strong style={{ color: 'var(--text)' }}>iPhone:</strong> abre esta web en Safari, pulsa el botón <em>Compartir</em> y elige <em>«Añadir a pantalla de inicio»</em>.<br />
          <strong style={{ color: 'var(--text)' }}>Android:</strong> ábrela en Chrome, menú <em>⋮</em> y <em>«Instalar app»</em>.
        </p>
        <p className="muted" style={{ fontSize: 13.5 }}>Una vez instalada se abre a pantalla completa y funciona sin conexión, como una app normal.</p>
      </div>

      <button className="btn ghost block" style={{ marginTop: 18 }} onClick={() => navigate('/')}>← Volver al inicio</button>
    </div>
  )
}
