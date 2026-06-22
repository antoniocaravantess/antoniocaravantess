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

// Web service oficial del Banco de Guatemala (tipo de cambio de referencia del día).
const BANGUAT_WS = 'https://www.banguat.gob.gt/variables/ws/TipoCambio.asmx/TipoCambioDia'
// Proxies CORS para poder consultar Banguat desde el navegador.
const PROXIES = [
  (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  (u: string) => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
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

function parseBanguat(text: string): { rate: number; date: string | null } | null {
  try {
    const xml = new DOMParser().parseFromString(text, 'text/xml')
    const ref = xml.getElementsByTagName('referencia')[0] || xml.getElementsByTagNameNS('*', 'referencia')[0]
    const fecha = xml.getElementsByTagName('fecha')[0] || xml.getElementsByTagNameNS('*', 'fecha')[0]
    if (!ref || !ref.textContent) return null
    const rate = parseFloat(ref.textContent.trim().replace(',', '.'))
    if (!isFinite(rate) || rate <= 0) return null
    return { rate, date: fecha?.textContent?.trim() || null }
  } catch {
    return null
  }
}

async function fetchBanguat(): Promise<{ rate: number; date: string | null } | null> {
  for (const proxy of PROXIES) {
    try {
      const res = await fetch(proxy(BANGUAT_WS))
      if (!res.ok) continue
      const text = await res.text()
      const parsed = parseBanguat(text)
      if (parsed) return parsed
    } catch {
      /* probar siguiente proxy */
    }
  }
  return null
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
