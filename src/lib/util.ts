import type { Mood } from '../types'

// Identificador único corto y suficiente para una app local.
export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

// ---------- Fechas (trabajamos con cadenas YYYY-MM-DD en hora local) ----------
export function todayISO(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

export function addDays(iso: string, days: number): string {
  const d = parseISO(iso)
  d.setDate(d.getDate() + days)
  return todayISO(d)
}

export function daysBetween(aISO: string, bISO: string): number {
  const a = parseISO(aISO).getTime()
  const b = parseISO(bISO).getTime()
  return Math.round((b - a) / 86400000)
}

export function startOfWeekISO(iso = todayISO()): string {
  const d = parseISO(iso)
  const day = (d.getDay() + 6) % 7 // lunes = 0
  d.setDate(d.getDate() - day)
  return todayISO(d)
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7) // YYYY-MM
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const MESES_LARGO = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']

export function formatDate(iso: string, long = false): string {
  if (!iso) return ''
  const d = parseISO(iso)
  if (long) return `${d.getDate()} de ${MESES_LARGO[d.getMonth()]} de ${d.getFullYear()}`
  return `${d.getDate()} ${MESES[d.getMonth()]}`
}

export function formatDayName(iso: string): string {
  return DIAS[parseISO(iso).getDay()]
}

export function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number)
  return `${MESES[m - 1]} ${String(y).slice(2)}`
}

export function relativeDay(iso: string): string {
  const diff = daysBetween(todayISO(), iso)
  if (diff === 0) return 'Hoy'
  if (diff === 1) return 'Mañana'
  if (diff === -1) return 'Ayer'
  if (diff > 1 && diff <= 7) return `En ${diff} días`
  if (diff < -1 && diff >= -7) return `Hace ${-diff} días`
  return formatDate(iso)
}

// ---------- Números y dinero ----------
export function formatMoney(amount: number, currency = 'GTQ'): string {
  try {
    return new Intl.NumberFormat('es-GT', {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    try {
      return new Intl.NumberFormat('es', { style: 'currency', currency }).format(amount)
    } catch {
      return `${amount.toFixed(2)} ${currency}`
    }
  }
}

export function formatNumber(n: number, decimals = 1): string {
  return new Intl.NumberFormat('es-ES', { maximumFractionDigits: decimals }).format(n)
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

// ---------- Estado de ánimo ----------
export const MOOD_EMOJI: Record<Mood, string> = {
  1: '😢',
  2: '😕',
  3: '😐',
  4: '🙂',
  5: '😄',
}
export const MOOD_LABEL: Record<Mood, string> = {
  1: 'Muy mal',
  2: 'Mal',
  3: 'Normal',
  4: 'Bien',
  5: 'Genial',
}
