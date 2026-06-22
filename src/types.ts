// Modelos de datos de la aplicación "Mi Vida".
export type ID = string

export interface Profile {
  name: string
  currency: string // moneda principal (p.ej. 'GTQ')
  tradingCurrency: string // moneda de las operaciones de trading (p.ej. 'USD')
  startingCapital: number // capital inicial para la curva de trading (en tradingCurrency)
}

export type ThemeName = 'dark' | 'light'
export interface Settings {
  theme: ThemeName
}

// ---------- Trading ----------
export type TradeDirection = 'long' | 'short'
export interface Trade {
  id: ID
  date: string // YYYY-MM-DD
  symbol: string
  direction: TradeDirection
  pnl: number // resultado neto en la divisa (puede ser negativo)
  rMultiple?: number // múltiplo de riesgo (opcional)
  strategy?: string
  notes?: string
  createdAt: number
}

// ---------- Metas ----------
export type GoalStatus = 'active' | 'done' | 'paused'
export interface Milestone {
  id: ID
  title: string
  done: boolean
}
export interface Goal {
  id: ID
  title: string
  description?: string
  category?: string
  deadline?: string // YYYY-MM-DD
  status: GoalStatus
  milestones: Milestone[]
  createdAt: number
}

// ---------- Hábitos ----------
export type HabitFrequency = 'daily' | 'weekly'
export interface Habit {
  id: ID
  name: string
  emoji?: string
  color?: string
  frequency: HabitFrequency
  targetPerWeek?: number // objetivo semanal cuando frequency = weekly
  archived?: boolean
  createdAt: number
}
export interface HabitLog {
  id: ID
  habitId: ID
  date: string // YYYY-MM-DD
}

// ---------- Tareas ----------
export type Priority = 'low' | 'medium' | 'high'
export interface Task {
  id: ID
  title: string
  done: boolean
  due?: string // YYYY-MM-DD
  priority: Priority
  category?: string
  createdAt: number
  completedAt?: number
}

// ---------- Finanzas ----------
export type TxType = 'income' | 'expense'
export interface Transaction {
  id: ID
  type: TxType
  amount: number // siempre positivo; el signo lo da `type`
  category: string
  date: string // YYYY-MM-DD
  note?: string
  createdAt: number
}

// ---------- Salud y bienestar ----------
export type Mood = 1 | 2 | 3 | 4 | 5
export interface HealthLog {
  id: ID
  date: string // YYYY-MM-DD (uno por día)
  weight?: number
  sleepHours?: number
  water?: number // vasos de agua
  exerciseMinutes?: number
  mood?: Mood
  createdAt: number
}

// ---------- Diario ----------
export interface JournalEntry {
  id: ID
  date: string // YYYY-MM-DD
  title?: string
  body: string
  mood?: Mood
  createdAt: number
}

export interface Database {
  version: number
  profile: Profile
  settings: Settings
  trades: Trade[]
  goals: Goal[]
  habits: Habit[]
  habitLogs: HabitLog[]
  tasks: Task[]
  transactions: Transaction[]
  healthLogs: HealthLog[]
  journal: JournalEntry[]
}
