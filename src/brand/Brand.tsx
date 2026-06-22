import { useEffect, useState } from 'react'

/**
 * Logotipo "Mi Vida" como texto con relleno dorado. Usa la tipografía condensada
 * que la app ya carga (Saira Condensed / Bahnschrift), así se ve nítido a cualquier
 * tamaño y correcto en todos los dispositivos.
 */
export function BrandWordmark() {
  return (
    <span className="brand-logo gold-text">
      Mi <b>Vida</b>
    </span>
  )
}

/** Splash de marca: aparece al arrancar la app y se desvanece solo (~1.7s). */
export function BrandSplash() {
  const [gone, setGone] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setGone(true), 1750)
    return () => clearTimeout(t)
  }, [])
  if (gone) return null
  return (
    <div className="splash" aria-hidden>
      <div className="splash-mark">
        <span className="mi gold-text">MI</span>
        <span className="vida gold-text">VIDA</span>
      </div>
    </div>
  )
}

/** Barra superior con el logo dorado y una acción opcional a la derecha. */
export function TopBar({ onSettings }: { onSettings?: () => void }) {
  return (
    <header className="topbar">
      <BrandWordmark />
      {onSettings && (
        <button className="topbar__settings" onClick={onSettings} aria-label="Ajustes">
          ⚙️
        </button>
      )}
    </header>
  )
}
