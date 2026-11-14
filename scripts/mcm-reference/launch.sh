#!/bin/bash
# Launch the prepared original with the recorded live-capture configuration.
set -euo pipefail
if [[ $# != 1 ]]; then
  echo 'Usage: bash scripts/mcm-reference/launch.sh /absolute/reference-directory' >&2
  exit 2
fi
reference_root="$(cd "$1" && pwd)"
export WINEPREFIX="$reference_root/prefix"
export WINEDEBUG="${WINEDEBUG:--all}"
export MVK_CONFIG_LOG_LEVEL="${MVK_CONFIG_LOG_LEVEL:-0}"
# Successful captures disabled threaded rendering and CoreAudio while
# investigating startup faults; match mcm-healthy-replay-validation.json.
export WINEDLLOVERRIDES="${WINEDLLOVERRIDES:-ddraw,d3dimm=b;winecoreaudio.drv=}"
export WINE_D3D_CONFIG="${WINE_D3D_CONFIG:-renderer=gl,csmt=0}"
wine_binary="${MCM_WINE:-/Applications/Wine Stable.app/Contents/Resources/wine/bin/wine}"
[[ -f "$reference_root/prefix/system.reg" ]] || { echo 'Initialize the dedicated prefix first; see README.' >&2; exit 1; }
cd "$reference_root/game"
# A bare mcm.exe name crashes this build while stripping argv[0]'s last backslash.
exec "$wine_binary" "Z:${PWD//\//\\}\\mcm.exe"
