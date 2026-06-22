import { useSyncExternalStore } from 'react'
import type { Database } from '../types'

const KEY = 'mi-vida:db'
const VERSION = 1

function defaultDB(): Database {
  return {
    version: VERSION,
    profile: { name: '', currency: 'GTQ', tradingCurrency: 'USD', startingCapital: 0 },
    settings: { theme: 'dark' },
    trades: [],
    goals: [],
    habits: [],
    habitLogs: [],
    tasks: [],
    transactions: [],
    healthLogs: [],
    journal: [],
  }
}

// Asegura que un objeto cargado tenga todas las claves esperadas.
function normalize(raw: unknown): Database {
  const base = defaultDB()
  if (!raw || typeof raw !== 'object') return base
  const r = raw as Partial<Database>
  return {
    ...base,
    ...r,
    version: VERSION,
    profile: { ...base.profile, ...(r.profile || {}) },
    settings: { ...base.settings, ...(r.settings || {}) },
    trades: r.trades ?? [],
    goals: r.goals ?? [],
    habits: r.habits ?? [],
    habitLogs: r.habitLogs ?? [],
    tasks: r.tasks ?? [],
    transactions: r.transactions ?? [],
    healthLogs: r.healthLogs ?? [],
    journal: r.journal ?? [],
  }
}

function load(): Database {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return defaultDB()
    return normalize(JSON.parse(raw))
  } catch {
    return defaultDB()
  }
}

let db: Database = load()
const listeners = new Set<() => void>()

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(db))
  } catch (e) {
    console.error('No se pudo guardar', e)
  }
  listeners.forEach((l) => l())
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

function getSnapshot() {
  return db
}

/** Hook principal: devuelve toda la base de datos (reactiva). */
export function useDB(): Database {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

/** Aplica una mutación inmutable sobre la base de datos y persiste. */
export function update(mutator: (d: Database) => void) {
  const next: Database = structuredClone(db)
  mutator(next)
  db = next
  persist()
}

export function setDB(next: Database) {
  db = normalize(next)
  persist()
}

export function getDB(): Database {
  return db
}

// ---------- Copia de seguridad ----------
export function exportData(): string {
  return JSON.stringify(db, null, 2)
}

export function importData(json: string): { ok: boolean; error?: string } {
  try {
    const parsed = JSON.parse(json)
    setDB(parsed)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

export function resetData() {
  setDB(defaultDB())
}
