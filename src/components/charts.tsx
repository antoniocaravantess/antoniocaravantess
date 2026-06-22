// Gráficos SVG ligeros, sin dependencias externas.

export function LineChart({
  data,
  height = 140,
  color = 'var(--primary)',
  area = true,
}: {
  data: number[]
  height?: number
  color?: string
  area?: boolean
}) {
  const W = 300
  const H = height
  const pad = 6
  if (data.length === 0) return <div className="muted center" style={{ padding: 20 }}>Sin datos</div>
  const min = Math.min(...data, 0 in data ? data[0] : 0)
  const max = Math.max(...data)
  const lo = Math.min(...data)
  const hi = max
  const range = hi - lo || 1
  const n = data.length
  const x = (i: number) => (n === 1 ? W / 2 : pad + (i * (W - pad * 2)) / (n - 1))
  const y = (v: number) => H - pad - ((v - lo) / range) * (H - pad * 2)
  const pts = data.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const areaPath = `M ${x(0).toFixed(1)},${(H - pad).toFixed(1)} L ${pts.split(' ').join(' L ')} L ${x(n - 1).toFixed(1)},${(H - pad).toFixed(1)} Z`
  const zeroY = lo < 0 && hi > 0 ? y(0) : null
  void min
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none">
      <defs>
        <linearGradient id="lc" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {zeroY !== null && (
        <line x1="0" y1={zeroY} x2={W} y2={zeroY} stroke="var(--border-strong)" strokeWidth="1" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
      )}
      {area && <path d={areaPath} fill="url(#lc)" />}
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      {n === 1 && <circle cx={x(0)} cy={y(data[0])} r="3.5" fill={color} />}
    </svg>
  )
}

export function BarChart({
  data,
  height = 150,
}: {
  data: { label: string; value: number; color?: string }[]
  height?: number
}) {
  if (data.length === 0) return <div className="muted center" style={{ padding: 20 }}>Sin datos</div>
  const max = Math.max(...data.map((d) => d.value), 1)
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height }}>
        {data.map((d, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
            <div
              style={{
                width: '100%',
                maxWidth: 38,
                height: `${(d.value / max) * 100}%`,
                minHeight: d.value > 0 ? 4 : 0,
                background: d.color || 'var(--grad)',
                borderRadius: '8px 8px 4px 4px',
                transition: 'height .4s ease',
              }}
            />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        {data.map((d, i) => (
          <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 11, color: 'var(--faint)' }}>
            {d.label}
          </div>
        ))}
      </div>
    </div>
  )
}

export function Donut({
  data,
  size = 150,
  thickness = 22,
  centerLabel,
  centerValue,
}: {
  data: { label: string; value: number; color: string }[]
  size?: number
  thickness?: number
  centerLabel?: string
  centerValue?: string
}) {
  const total = data.reduce((s, d) => s + d.value, 0)
  const r = (size - thickness) / 2
  const c = size / 2
  const circ = 2 * Math.PI * r
  let offset = 0
  return (
    <div className="flex" style={{ gap: 18, alignItems: 'center' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
        <circle cx={c} cy={c} r={r} fill="none" stroke="var(--surface)" strokeWidth={thickness} />
        {total > 0 &&
          data.map((d, i) => {
            const len = (d.value / total) * circ
            const el = (
              <circle
                key={i}
                cx={c}
                cy={c}
                r={r}
                fill="none"
                stroke={d.color}
                strokeWidth={thickness}
                strokeDasharray={`${len} ${circ - len}`}
                strokeDashoffset={-offset}
                transform={`rotate(-90 ${c} ${c})`}
                strokeLinecap="butt"
              />
            )
            offset += len
            return el
          })}
        {centerValue && (
          <text x={c} y={c - 2} textAnchor="middle" fontSize="17" fontWeight="800" fill="var(--text)">
            {centerValue}
          </text>
        )}
        {centerLabel && (
          <text x={c} y={c + 15} textAnchor="middle" fontSize="10" fill="var(--muted)">
            {centerLabel}
          </text>
        )}
      </svg>
      <div className="grow" style={{ minWidth: 0 }}>
        {data.map((d, i) => (
          <div key={i} className="flex between" style={{ marginBottom: 7 }}>
            <div className="flex" style={{ gap: 8, minWidth: 0 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: d.color, flexShrink: 0 }} />
              <span className="truncate" style={{ fontSize: 13 }}>{d.label}</span>
            </div>
            <span style={{ fontSize: 13, fontWeight: 600 }}>
              {total > 0 ? Math.round((d.value / total) * 100) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
