// Genera los iconos PNG de la PWA sin dependencias externas (solo zlib de Node).
// Dibuja un cuadrado con degradado azul→violeta y una flecha/gráfica ascendente
// blanca que simboliza progreso y crecimiento.
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '..', 'public')
mkdirSync(outDir, { recursive: true })

// ---- CRC32 para los chunks PNG ----
const crcTable = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()
function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crc])
}
function encodePNG(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  // raw rows con filtro 0
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride)
  }
  const idat = deflateSync(raw, { level: 9 })
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))])
}

// ---- Dibujo ----
function lerp(a, b, t) { return a + (b - a) * t }
function blend(buf, w, x, y, r, g, b, a) {
  if (x < 0 || y < 0 || x >= w || y >= w) return
  const i = (y * w + x) * 4
  const ia = a / 255
  buf[i] = Math.round(lerp(buf[i], r, ia))
  buf[i + 1] = Math.round(lerp(buf[i + 1], g, ia))
  buf[i + 2] = Math.round(lerp(buf[i + 2], b, ia))
  buf[i + 3] = Math.max(buf[i + 3], a)
}
function disc(buf, w, cx, cy, radius, r, g, b) {
  const r0 = Math.floor(cx - radius - 1), r1 = Math.ceil(cx + radius + 1)
  const c0 = Math.floor(cy - radius - 1), c1 = Math.ceil(cy + radius + 1)
  for (let y = c0; y <= c1; y++) {
    for (let x = r0; x <= r1; x++) {
      const d = Math.hypot(x - cx, y - cy)
      const a = Math.max(0, Math.min(1, radius - d + 0.5)) * 255
      if (a > 0) blend(buf, w, x, y, r, g, b, a)
    }
  }
}
function thickLine(buf, w, x0, y0, x1, y1, radius, r, g, b) {
  const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0))
  for (let s = 0; s <= steps; s++) {
    const t = s / steps
    disc(buf, w, lerp(x0, x1, t), lerp(y0, y1, t), radius, r, g, b)
  }
}

function makeIcon(size, { rounded }) {
  const buf = Buffer.alloc(size * size * 4)
  const radius = rounded ? size * 0.22 : 0
  // degradado vertical azul (#4f7cff) -> violeta (#8b5cf6)
  for (let y = 0; y < size; y++) {
    const t = y / size
    const cr = Math.round(lerp(79, 139, t))
    const cg = Math.round(lerp(124, 92, t))
    const cb = Math.round(lerp(255, 246, t))
    for (let x = 0; x < size; x++) {
      // esquinas redondeadas
      let inside = true
      if (rounded) {
        const rx = Math.min(x, size - 1 - x)
        const ry = Math.min(y, size - 1 - y)
        if (rx < radius && ry < radius) {
          inside = Math.hypot(radius - rx, radius - ry) <= radius
        }
      }
      if (inside) {
        const i = (y * size + x) * 4
        buf[i] = cr; buf[i + 1] = cg; buf[i + 2] = cb; buf[i + 3] = 255
      }
    }
  }
  // gráfica ascendente blanca dentro de la zona segura
  const m = size * 0.26
  const pts = [
    [m, size * 0.66],
    [size * 0.42, size * 0.5],
    [size * 0.56, size * 0.58],
    [size - m, size * 0.32],
  ]
  const lw = size * 0.045
  for (let i = 0; i < pts.length - 1; i++) {
    thickLine(buf, size, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], lw, 255, 255, 255)
  }
  for (const [px, py] of pts) disc(buf, size, px, py, lw * 1.25, 255, 255, 255)
  // punta de flecha en el último punto
  const [ex, ey] = pts[pts.length - 1]
  thickLine(buf, size, ex, ey, ex - size * 0.12, ey, lw, 255, 255, 255)
  thickLine(buf, size, ex, ey, ex, ey + size * 0.12, lw, 255, 255, 255)
  return encodePNG(size, size, buf)
}

const targets = [
  ['icon-192.png', 192, { rounded: true }],
  ['icon-512.png', 512, { rounded: true }],
  ['maskable-512.png', 512, { rounded: false }],
  ['apple-touch-icon.png', 180, { rounded: false }],
]
for (const [name, size, opts] of targets) {
  writeFileSync(join(outDir, name), makeIcon(size, opts))
  console.log('✓', name)
}

// favicon SVG
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#4f7cff"/><stop offset="1" stop-color="#8b5cf6"/>
  </linearGradient></defs>
  <rect width="512" height="512" rx="112" fill="url(#g)"/>
  <polyline points="133,338 215,256 287,297 379,164" fill="none" stroke="#fff"
    stroke-width="26" stroke-linecap="round" stroke-linejoin="round"/>
  <polyline points="379,164 317,164 379,226" fill="none" stroke="#fff"
    stroke-width="26" stroke-linecap="round" stroke-linejoin="round" transform="translate(0,0)"/>
</svg>`
writeFileSync(join(outDir, 'favicon.svg'), favicon)
console.log('✓ favicon.svg')
