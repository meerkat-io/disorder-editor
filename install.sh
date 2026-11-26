#!/usr/bin/env bash
# Builds the webview, packs the extension into a .vsix and installs it into VS Code.
set -euo pipefail
cd "$(dirname "$0")"

VSIX="disorder-editor-$(node -p "require('./package.json').version").vsix"

# `code` may not be on PATH (VS Code: "Shell Command: Install 'code' command in PATH").
CODE="${CODE_CLI:-$(command -v code || true)}"
if [ -z "$CODE" ] && [ -x "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code" ]; then
  CODE="/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code"
fi
if [ -z "$CODE" ]; then
  echo "VS Code CLI not found. Put 'code' on PATH or set CODE_CLI=/path/to/code." >&2
  exit 1
fi

npm ci --no-audit --no-fund
npm test
npx vsce package --out "$VSIX"   # runs 'npm run build' via vscode:prepublish
"$CODE" --install-extension "$VSIX" --force

echo "Installed $VSIX. Reload VS Code windows (Developer: Reload Window) to use it."
