#!/data/data/com.termux/files/usr/bin/bash
# Ray 3D office — serves the baked 3D bundle + /api shim + second-brain viewer on :8082 (LAN only).
# Guarded: the Termux boot script only starts this if it isn't already running.
export HOME="/data/data/com.termux/files/home"
export PATH="$HOME/.local/bin:/data/data/com.termux/files/usr/bin:$PATH"
cd "$HOME/ray-office" || exit 1
export PORT=8082
export OFFICE_STATE="$HOME/ray-office/office-state.json"
export BRAIN_DIR="$HOME/ray-office/brain"
export VAULT_DIR="$HOME/ray-office/vault"
exec node serve-office.mjs >> "$HOME/ray-office/server.log" 2>&1
