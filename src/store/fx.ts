// Tipo de cambio en vivo. Descarga los tipos respecto al dólar (USD) desde una
// API gratuita y los cachea en localStorage para funcionar también sin conexión.
import { useSyncExternalStore } from 'react'

export interface FxState {
  rates: Record<string, number> | null // valor de 1 USD en cada moneda (claves en minúscula)
  date: string | null // fecha del tipo de cambio
  fetchedAt: number // momento en que se descargó
  status: 'idle' | 'loading' | 'ok' | 'error'
}

const KEY = 'mi-vida:fx'
const MAX_AGE = 6 * 60 * 60 * 1000 // refrescar como mucho cada 6 horas

// API gratuita, sin clave y con CORS (con respaldo).
const SOURCES = [
  'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json',
  'https://latest.currency-api.pages.dev/v1/currencies/usd.json',
]

function load(): FxState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const c = JSON.parse(raw)
      if (c && c.rates) return { rates: c.rates, date: c.date ?? null, fetchedAt: c.fetchedAt ?? 0, status: 'ok' }
    }
  } catch {
    /* ignore */
  }
  return { rates: null, date: null, fetchedAt: 0, status: 'idle' }
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

async function refresh() {
  if (state.status === 'loading') return
  set({ status: 'loading' })
  for (const url of SOURCES) {
    try {
      const res = await fetch(url)
      if (!res.ok) continue
      const json = await res.json()
      const rates = json.usd as Record<string, number> | undefined
      if (rates && typeof rates === 'object') {
        const next = { rates, date: (json.date as string) ?? null, fetchedAt: Date.now() }
        try {
          localStorage.setItem(KEY, JSON.stringify(next))
        } catch {
          /* ignore */
        }
        set({ ...next, status: 'ok' })
        return
      }
    } catch {
      /* probar siguiente fuente */
    }
  }
  // si ya teníamos tipos cacheados, los conservamos
  set({ status: state.rates ? 'ok' : 'error' })
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
