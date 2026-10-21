#!/bin/bash
# Instalador de Paperclip para Mac.
# Doble clic (o clic derecho > Abrir la primera vez). No pide contraseña de administrador.
set -euo pipefail

NODE_DIR="$HOME/.paperclip-node"
PAPERCLIP_URL="http://localhost:3100"

paso() { printf '\n\033[1;36m==> %s\033[0m\n' "$1"; }
ok()   { printf '\033[1;32m    ✓ %s\033[0m\n' "$1"; }

clear 2>/dev/null || true
echo "==============================================="
echo "   Instalando Paperclip — no cierres esta ventana"
echo "==============================================="

# 1. Node.js 24 (local para tu usuario, sin sudo)
node_ok() {
  command -v node >/dev/null 2>&1 || return 1
  local v; v="$(node -p 'process.versions.node')"
  local major="${v%%.*}" rest="${v#*.}"; local minor="${rest%%.*}"
  [ "$major" -gt 24 ] || { [ "$major" -eq 24 ] && [ "$minor" -ge 11 ]; }
}

export PATH="$NODE_DIR/bin:$HOME/.local/bin:$PATH"
paso "1/4 Revisando Node.js"
if node_ok; then
  ok "Node.js $(node -v) ya está instalado"
else
  case "$(uname -s)-$(uname -m)" in
    Darwin-arm64)  plat="darwin-arm64" ;;
    Darwin-x86_64) plat="darwin-x64" ;;
    Linux-x86_64)  plat="linux-x64" ;;
    Linux-aarch64) plat="linux-arm64" ;;
    *) echo "Sistema no soportado: $(uname -s) $(uname -m)"; exit 1 ;;
  esac
  base="https://nodejs.org/dist/latest-v24.x"
  line="$(curl -fsSL "$base/SHASUMS256.txt" | grep -E "node-v[0-9.]+-$plat\.tar\.gz$")"
  sum="${line%% *}"; file="${line##* }"
  tmp="$(mktemp -d)"
  echo "    Descargando $file ..."
  curl -fsSL "$base/$file" -o "$tmp/$file"
  echo "$sum  $tmp/$file" | shasum -a 256 -c - >/dev/null
  rm -rf "$NODE_DIR"; mkdir -p "$NODE_DIR"
  tar -xzf "$tmp/$file" -C "$NODE_DIR" --strip-components=1
  rm -rf "$tmp"
  ok "Node.js $(node -v) instalado en $NODE_DIR"
fi

# Dejar Node y ~/.local/bin en el PATH para futuras terminales
for rc in "$HOME/.zprofile" "$HOME/.bash_profile"; do
  if ! grep -q "paperclip-node" "$rc" 2>/dev/null; then
    printf '\n# Paperclip\nexport PATH="$HOME/.paperclip-node/bin:$HOME/.local/bin:$PATH"\n' >> "$rc"
  fi
done

# 2. Claude Code (el "cerebro" que usarán tus agentes)
paso "2/4 Revisando Claude Code"
if command -v claude >/dev/null 2>&1; then
  ok "Claude Code ya está instalado"
else
  if curl -fsSL https://claude.ai/install.sh | bash; then
    ok "Claude Code instalado"
  else
    echo "    ⚠ No se pudo instalar Claude Code ahora; Paperclip igual funciona y puedes conectarlo después."
  fi
fi

# 3. Paperclip
paso "3/4 Instalando y configurando Paperclip (tarda unos minutos)"
if [ "$(uname -s)" = "Darwin" ]; then
  # Queda como servicio: arranca solo cada vez que prendes la Mac.
  # Si el servicio no se pudiera instalar, onboard se queda corriendo aquí mismo.
  npx -y paperclipai@latest onboard --yes --install-service &
else
  npx -y paperclipai@latest onboard --yes --no-install-service &
fi

# Ícono en el Escritorio para abrir Paperclip cuando quieras
LAUNCHER="$HOME/Desktop/Paperclip.command"
mkdir -p "$HOME/Desktop"
cat > "$LAUNCHER" <<'EOF'
#!/bin/bash
export PATH="$HOME/.paperclip-node/bin:$HOME/.local/bin:$PATH"
URL="http://localhost:3100"
if ! curl -sf -o /dev/null "$URL/api/health"; then
  echo "Encendiendo Paperclip... (deja esta ventana abierta)"
  npx -y paperclipai@latest run &
  for _ in $(seq 1 90); do curl -sf -o /dev/null "$URL/api/health" && break; sleep 2; done
  open "$URL"; wait
else
  open "$URL"
fi
EOF
chmod +x "$LAUNCHER"
ok "Ícono 'Paperclip' creado en tu Escritorio"

# 4. Abrir en el navegador
paso "4/4 Abriendo Paperclip"
for _ in $(seq 1 120); do
  curl -sf -o /dev/null "$PAPERCLIP_URL/api/health" && break
  sleep 2
done
if command -v open >/dev/null 2>&1; then open "$PAPERCLIP_URL"; fi

echo
echo "==============================================="
echo "  ✅ Listo. Paperclip está en: $PAPERCLIP_URL"
echo "  Guárdalo en favoritos. Arranca solo al prender la Mac."
echo "==============================================="
echo
if command -v claude >/dev/null 2>&1; then
  echo "Último paso (una sola vez): conectar tu cuenta de Claude."
  echo "Inicia sesión en el navegador que se abre; al terminar escribe /exit y ENTER."
  read -r -p "Presiona ENTER para empezar... " _ || true
  claude || true
fi

if launchctl list 2>/dev/null | grep -q "ing.paperclip.paperclipai"; then
  echo
  echo "Todo listo. Ya puedes cerrar esta ventana: Paperclip sigue funcionando."
else
  echo
  echo "Deja esta ventana abierta mientras uses Paperclip."
  echo "La próxima vez solo haz doble clic en el ícono 'Paperclip' del Escritorio."
  wait || true
fi
