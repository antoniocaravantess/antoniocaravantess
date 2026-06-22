import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { exportData, importData, resetData, update, useDB } from '../store/db'
import { Field, PageHead, Segmented } from '../components/ui'

const CURRENCIES = ['EUR', 'USD', 'GBP', 'MXN', 'ARS', 'COP', 'CLP', 'PEN', 'BRL', 'CHF']

export default function Settings() {
  const db = useDB()
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState('')

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
          <Field label="Moneda">
            <select className="select" value={db.profile.currency} onChange={(e) => setProfile({ currency: e.target.value })}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Capital inicial (trading)">
            <input className="input" type="number" inputMode="decimal" value={db.profile.startingCapital || ''} onChange={(e) => setProfile({ startingCapital: Number(e.target.value) || 0 })} placeholder="0" />
          </Field>
        </div>
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
