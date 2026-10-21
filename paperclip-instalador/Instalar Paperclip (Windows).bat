<# :
@echo off
rem Instalador de Paperclip para Windows. Solo haz doble clic.
powershell -NoProfile -ExecutionPolicy Bypass -Command "iex ([IO.File]::ReadAllText('%~f0'))"
echo.
pause
exit /b
#>

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$NodeDir = Join-Path $env:LOCALAPPDATA 'paperclip-node'
$Url = 'http://localhost:3100'

function Paso($t) { Write-Host "`n==> $t" -ForegroundColor Cyan }
function Ok($t)   { Write-Host "    OK $t" -ForegroundColor Green }

Write-Host '==============================================='
Write-Host '  Instalando Paperclip - no cierres esta ventana'
Write-Host '==============================================='

# 1. Node.js 24 (solo para tu usuario, sin permisos de administrador)
Paso '1/4 Revisando Node.js'
$env:Path = "$NodeDir;$env:USERPROFILE\.local\bin;$env:Path"
$needNode = $true
if (Get-Command node -ErrorAction SilentlyContinue) {
  $v = [version](node -p "process.versions.node")
  if ($v -ge [version]'24.11.0') { $needNode = $false; Ok "Node.js v$v ya esta instalado" }
}
if ($needNode) {
  $arch = if ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64') { 'arm64' } else { 'x64' }
  $base = 'https://nodejs.org/dist/latest-v24.x'
  $line = (Invoke-WebRequest "$base/SHASUMS256.txt" -UseBasicParsing).Content -split "`n" |
    Where-Object { $_ -match "node-v[0-9.]+-win-$arch\.zip$" } | Select-Object -First 1
  $sum, $file = $line.Trim() -split '\s+'
  $zip = Join-Path $env:TEMP $file
  Write-Host "    Descargando $file ..."
  Invoke-WebRequest "$base/$file" -OutFile $zip -UseBasicParsing
  if ((Get-FileHash $zip -Algorithm SHA256).Hash.ToLower() -ne $sum.ToLower()) { throw 'La descarga de Node.js esta corrupta. Vuelve a intentar.' }
  $tmp = Join-Path $env:TEMP 'paperclip-node-extract'
  if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
  Expand-Archive $zip -DestinationPath $tmp
  if (Test-Path $NodeDir) { Remove-Item $NodeDir -Recurse -Force }
  Move-Item (Get-ChildItem $tmp | Select-Object -First 1).FullName $NodeDir
  Remove-Item $zip, $tmp -Recurse -Force
  Ok "Node.js $(node -v) instalado"
}
# Dejar Node en el PATH del usuario para el futuro
$userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
if ($userPath -notlike "*paperclip-node*") {
  [Environment]::SetEnvironmentVariable('Path', "$NodeDir;$userPath", 'User')
}

# 2. Claude Code (el "cerebro" de tus agentes)
Paso '2/4 Revisando Claude Code'
if (Get-Command claude -ErrorAction SilentlyContinue) { Ok 'Claude Code ya esta instalado' }
else {
  try { Invoke-RestMethod https://claude.ai/install.ps1 | Invoke-Expression; Ok 'Claude Code instalado' }
  catch { Write-Host '    Aviso: no se pudo instalar Claude Code ahora; puedes conectarlo despues.' -ForegroundColor Yellow }
}

# 3. Icono en el Escritorio para abrir Paperclip cuando quieras
Paso '3/4 Creando icono "Paperclip" en tu Escritorio'
$launcher = Join-Path ([Environment]::GetFolderPath('Desktop')) 'Paperclip.bat'
@"
@echo off
title Paperclip - deja esta ventana abierta
set "PATH=$NodeDir;%USERPROFILE%\.local\bin;%PATH%"
start "" /b cmd /c "timeout /t 25 >nul & start $Url"
npx -y paperclipai@latest run
"@ | Set-Content -Path $launcher -Encoding ASCII
Ok 'Icono creado'

# 4. Configurar y arrancar Paperclip
Paso '4/4 Instalando y arrancando Paperclip (tarda unos minutos)'
Start-Job -ScriptBlock {
  param($u)
  for ($i = 0; $i -lt 180; $i++) {
    try { Invoke-WebRequest "$u/api/health" -UseBasicParsing -TimeoutSec 2 | Out-Null; Start-Process $u; return } catch { Start-Sleep 2 }
  }
} -ArgumentList $Url | Out-Null

Write-Host ''
Write-Host "Paperclip se abrira solo en tu navegador: $Url" -ForegroundColor Green
Write-Host 'Deja esta ventana abierta mientras lo uses.'
Write-Host 'La proxima vez solo haz doble clic en el icono "Paperclip" del Escritorio.'
Write-Host ''
npx -y paperclipai@latest onboard --yes
