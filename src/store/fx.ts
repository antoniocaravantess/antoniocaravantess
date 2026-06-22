// Tipo de cambio en vivo. Fuente principal: Banco de Guatemala (Banguat),
// tipo de cambio de referencia oficial USD→GTQ. Como su web service no permite
// llamadas directas desde el navegador (CORS), se accede mediante un proxy público.
// Si Banguat no responde, se usa una cotización de mercado de respaldo.
import { useSyncExternalStore } from 'react'

export interface FxState {
  rates: Record<string, number> | null // valor de 1 USD en cada moneda (claves en minúscula)
  date: string | null // fecha del tipo de cambio
  source: string | null // 'Banguat' o 'mercado'
  fetchedAt: number
  status: 'idle' | 'loading' | 'ok' | 'error'
}

const KEY = 'mi-vida:fx'
const MAX_AGE = 30 * 60 * 1000 // refrescar como mucho cada 30 minutos

// Cotización de mercado (respaldo, todas las monedas): gratuita, sin clave y con CORS.
const MARKET_SOURCES = [
  'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json',
  'https://latest.currency-api.pages.dev/v1/currencies/usd.json',
]

function load(): FxState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const c = JSON.parse(raw)
      if (c && c.rates) return { rates: c.rates, date: c.date ?? null, source: c.source ?? null, fetchedAt: c.fetchedAt ?? 0, status: 'ok' }
    }
  } catch {
    /* ignore */
  }
  return { rates: null, date: null, source: null, fetchedAt: 0, status: 'idle' }
}

let state: FxState = load()
const listeners = new Set<() => void>()
function emit() {
  listeners.forEach((l) => l())
}
function set(patch: Partial<FxState>) {
  state = { ...state, ...patch }
  emit()
}

async function fetchMarket(): Promise<{ rates: Record<string, number>; date: string | null } | null> {
  for (const url of MARKET_SOURCES) {
    try {
      const res = await fetch(url)
      if (!res.ok) continue
      const json = await res.json()
      if (json.usd && typeof json.usd === 'object') return { rates: json.usd, date: (json.date as string) ?? null }
    } catch {
      /* probar siguiente */
    }
  }
  return null
}

// El tipo oficial de Banguat se publica como archivo en el propio sitio
// (lo genera a diario una acción de GitHub), así que se lee desde el mismo
// origen y de forma fiable, sin proxies ni problemas de CORS.
async function fetchBanguat(): Promise<{ rate: number; date: string | null } | null> {
  try {
    const url = `${import.meta.env.BASE_URL}banguat.json`
    const res = await fetch(url, { cache: 'no-cache' })
    if (!res.ok) return null
    const j = await res.json()
    const rate = Number(j.referencia)
    if (!Number.isFinite(rate) || rate <= 0) return null
    return { rate, date: j.fecha || null }
  } catch {
    return null
  }
}

async function refresh() {
  if (state.status === 'loading') return
  set({ status: 'loading' })
  const [market, banguat] = await Promise.all([fetchMarket(), fetchBanguat()])

  let rates: Record<string, number> | null = market?.rates ? { ...market.rates } : state.rates ? { ...state.rates } : null
  let date = market?.date ?? state.date
  let source: string | null = market ? 'mercado' : state.source

  // El tipo oficial de Banguat tiene prioridad para el quetzal.
  if (banguat) {
    rates = { ...(rates || {}), gtq: banguat.rate }
    date = banguat.date
    source = 'Banguat'
  }

  if (rates) {
    const next = { rates, date, source, fetchedAt: Date.now() }
    try {
      localStorage.setItem(KEY, JSON.stringify(next))
    } catch {
      /* ignore */
    }
    set({ ...next, status: 'ok' })
  } else {
    set({ status: state.rates ? 'ok' : 'error' })
  }
}

/** Descarga los tipos si no hay o están caducados. Llamar al iniciar la app. */
export function ensureFx() {
  if (!state.rates || Date.now() - state.fetchedAt > MAX_AGE) refresh()
}

/** Fuerza una nueva descarga del tipo de cambio. */
export function refreshFx() {
  refresh()
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}
function snapshot() {
  return state
}

export function useFx(): FxState {
  return useSyncExternalStore(subscribe, snapshot, snapshot)
}

/** Convierte un importe entre dos monedas usando los tipos respecto al USD. */
export function convert(fx: FxState, amount: number, from: string, to: string): number | null {
  if (from.toLowerCase() === to.toLowerCase()) return amount
  if (!fx.rates) return null
  const rf = from.toLowerCase() === 'usd' ? 1 : fx.rates[from.toLowerCase()]
  const rt = to.toLowerCase() === 'usd' ? 1 : fx.rates[to.toLowerCase()]
  if (!rf || !rt) return null
  return (amount * rt) / rf
}

/** Tipo de cambio 1 `from` = X `to`. */
export function rateOf(fx: FxState, from: string, to: string): number | null {
  return convert(fx, 1, from, to)
}
