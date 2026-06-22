// Consulta el tipo de cambio de referencia del Banco de Guatemala (Banguat) y lo
// guarda en public/banguat.json. Se ejecuta en GitHub Actions (servidor, sin CORS).
import { writeFileSync, mkdirSync } from 'node:fs'

const WS = 'https://www.banguat.gob.gt/variables/ws/TipoCambio.asmx'
const soap = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <TipoCambioDia xmlns="http://www.banguat.gob.gt/variables/ws/" />
  </soap:Body>
</soap:Envelope>`

const res = await fetch(WS, {
  method: 'POST',
  headers: {
    'Content-Type': 'text/xml; charset=utf-8',
    SOAPAction: 'http://www.banguat.gob.gt/variables/ws/TipoCambioDia',
  },
  body: soap,
})
if (!res.ok) throw new Error('HTTP ' + res.status)
const xml = await res.text()

const ref = xml.match(/<referencia>([\d.,]+)<\/referencia>/i)?.[1]
const fecha = xml.match(/<fecha>([^<]+)<\/fecha>/i)?.[1]
if (!ref) {
  console.error(xml.slice(0, 800))
  throw new Error('No se encontró <referencia> en la respuesta de Banguat')
}

const referencia = parseFloat(ref.replace(',', '.'))
if (!Number.isFinite(referencia) || referencia <= 0) throw new Error('Referencia inválida: ' + ref)

mkdirSync('public', { recursive: true })
const out = { referencia, fecha: fecha?.trim() || null, source: 'Banguat', updatedAt: new Date().toISOString() }
writeFileSync('public/banguat.json', JSON.stringify(out, null, 2) + '\n')
console.log('OK', out)
