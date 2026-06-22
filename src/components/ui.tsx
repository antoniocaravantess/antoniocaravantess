import { useEffect, type ReactNode } from 'react'
import type { Mood } from '../types'
import { MOOD_EMOJI, MOOD_LABEL } from '../lib/util'

/** Hoja inferior modal (bottom sheet). */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="handle" />
        {title && <h2>{title}</h2>}
        {children}
      </div>
    </div>
  )
}

export function PageHead({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {sub && <div className="sub">{sub}</div>}
      </div>
      {action}
    </div>
  )
}

export function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  )
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  grad,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
  grad?: boolean
}) {
  return (
    <div className="segment">
      {options.map((o) => (
        <button
          key={o.value}
          className={value === o.value ? (grad ? 'on grad' : 'on') : ''}
          onClick={() => onChange(o.value)}
          type="button"
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Empty({ emoji, title, hint }: { emoji: string; title: string; hint?: string }) {
  return (
    <div className="empty">
      <div className="emoji">{emoji}</div>
      <p style={{ fontWeight: 600, color: 'var(--text)' }}>{title}</p>
      {hint && <p style={{ fontSize: 13 }}>{hint}</p>}
    </div>
  )
}

export function Stat({ label, value, icon, tone }: { label: string; value: ReactNode; icon?: string; tone?: 'pos' | 'neg' }) {
  return (
    <div className="stat">
      <div className="label">
        {icon && <span>{icon}</span>}
        {label}
      </div>
      <div className={`value${tone ? ' ' + tone : ''}`}>{value}</div>
    </div>
  )
}

export function Progress({ value }: { value: number }) {
  return (
    <div className="progress">
      <span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  )
}

export function Fab({ onClick }: { onClick: () => void }) {
  return (
    <button className="fab" onClick={onClick} aria-label="Añadir">
      +
    </button>
  )
}

export function MoodPicker({ value, onChange }: { value?: Mood; onChange: (m: Mood) => void }) {
  return (
    <div className="flex between" style={{ gap: 6 }}>
      {([1, 2, 3, 4, 5] as Mood[]).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          title={MOOD_LABEL[m]}
          style={{
            flex: 1,
            fontSize: 26,
            padding: '8px 0',
            borderRadius: 12,
            border: '1px solid var(--border)',
            background: value === m ? 'var(--card-2)' : 'transparent',
            filter: value && value !== m ? 'grayscale(0.7) opacity(0.55)' : 'none',
            transform: value === m ? 'scale(1.08)' : 'none',
            transition: 'all .15s',
          }}
        >
          {MOOD_EMOJI[m]}
        </button>
      ))}
    </div>
  )
}
