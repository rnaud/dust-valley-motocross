# Original runtime status — November 13, 2026

## Current verified state

A fresh original session now executes healthy player physics under Wine 11.
The November 13 run used builtin DirectDraw/Direct3D, OpenGL, `csmt=0`, and
`winecoreaudio.drv=` to isolate audio. It completed two 400-frame controlled
acceleration/release passes with identical motion, transform and engine state.
A starting partial checkpoint is now preserved with the full trace in
[healthy replay evidence](mcm-healthy-replay-validation.json). All 1,600 boundary
records have normal state zero and finite motion/transforms. Four inherited
words still differ, so this is not whole-allocation or recovered-port parity.
Visual rendering and physical keyboard control have not been revalidated in
this new session; its verified achievement is live original simulation/capture.

The previous session had exited. Relaunches with the existing OpenGL settings
were intermittent: one fault was captured during Wine's 3-D framebuffer format
probe, while other launches reached the menu. Native UI callbacks advanced
SinglePlayer (`0x64`), Quarry (`0x65`), event Next (`0x104`), course Next (`0xd3`)
and rider Start (`0xd0`). Course Next failed twice at `0x7bf2123d`, reading
`0x4dc9`, on worker thread `0x134`, distinct from main thread `0x124`.
With CoreAudio disabled, the same sequence reached gameplay and capture.
This narrows the compatibility investigation; one successful audio-isolated
session does not prove a reliable startup fix or identify the worker conclusively.

In that successful session, Windows PID 292/main thread 296 contains PDM at
`0x051c89f8` (AI flag zero, controller `0x01932000`) and SAGE at `0x051f7250`
(AI flag one, null controller). These addresses must be rechecked before use.
After capture, the process was alive, no debugger was attached, and all four
telemetry hooks plus menu breakpoint `0x433841` had their original bytes.
The retained parent launcher keeps the game alive. Do not restart it merely
because desktop capture is unavailable.

Source, logs and full captures for this attempt are preserved locally under
`player-validation/healthy-replay-2026-11-13/` in the reference directory.
The committed compressed fixture includes all 1,600 records and the 21-block
starting checkpoint. Opponents, world, rider allocation and globals remain
outside that partial checkpoint; these gaps matter for recovered initialization.

## Earlier verified gameplay milestone

**The original was playable under Wine 11/Rosetta.** The unmodified executable
loads the main menu and Yuma Sand Dunes practice, renders the course/rider/HUD,
and responds to keyboard throttle. The working configuration uses builtin
DirectDraw, OpenGL, a virtual desktop and a 256 MB reported-video-memory cap.
Three live captures provide **300 scheduler comparisons, zero differences**,
plus raw 4096-byte snapshots of two bike objects. At that initial milestone, player identity and controlled replay were still unknown;
the follow-up below records their subsequent validation. Full force/integration
parity remains unvalidated.

Follow-up: [player telemetry](mcm-player-telemetry.md) identifies PDM through the
local-input branch and records two controlled 400-frame acceleration/release runs.
Motion and captured engine state repeat exactly; four inherited bike words remain
unexplained. The recovered digital throttle helper matches 2,495 live calls.
This is partial validated recovery, not complete physics parity.

## Installed environment and preserved files

- macOS 27.2.1, Apple Silicon (M5 Pro), Rosetta installed through Apple's
  `softwareupdate`.
- Wine 11.0, upstream macOS package `11.0_1`, installed at
  `/Applications/Wine Stable.app`. Commands are linked in `/opt/homebrew/bin`.
- Archive SHA-256:
  `b50dc50ec7f41d58b115a6b685d4d1315ba3c797bd3aa0f49213f2703cb82388`, verified
  against Homebrew's published cask metadata before extraction.
- Homebrew disabled the Wine cask for failing Gatekeeper checks. Installation used
  the [upstream manual package route](https://github.com/Gcenx/macOS_Wine_builds).
  No global Gatekeeper setting was disabled.
- `mingw-w64` 14.0.0_3 installed through Homebrew to build the helper oracle.
- GStreamer was not installed: its Homebrew cask is also disabled. Whether that
  affects this game's later media playback has not been established.
- Reference installation, prefix, manifests, raw helper outputs and diagnostics:
  `/Users/anf/Library/Application Support/Dust Valley/mcm-reference`.
  Initial experiments used `/tmp/mcm-reference`; logs retain those paths.
- Source: `/Users/anf/Downloads/Motocross_Madness`, 853 files hashed before running.
  `manifest.json` records pristine asset hashes; `runtime-manifest.json` records
  final wrapper/config hashes and attempt results. Original installations were
  not modified. Game executables and assets are excluded from the repository.

## Launch findings

A bare `mcm.exe` command crashes at `0x43358b`: startup strips a backslash from
its launch name without checking for a missing delimiter. A full Windows path
resolves that crash. Importing the supplied registry file into the **32-bit**
registry view resolves the subsequent installation-error dialog.

| Configuration | Observed result |
|---|---|
| Wine builtin DirectDraw without memory cap | No 3-D acceleration hardware dialog |
| Wine Vulkan renderer | Same dialog; maximum reported feature level 9_3 |
| Supplied dgVoodoo 2.87 family with Wine D3D11 | Required feature level unavailable |
| Supplied wrapper / upstream dgVoodoo 2.87.6 + macOS DXVK | Device and swapchain creation succeeds; access violation inside DDraw |
| dgVoodoo 2.79.3 + macOS DXVK | Resolution tests progress; later crash in graphics hooks |
| dgVoodoo 2.63 + macOS DXVK | Black window with watermark renders; mode enumeration progresses to 1024×768, then stalls |
| Same, dgVoodoo VRAM reduced from 256 MB to 16 MB | Still no verified menu; thread-context sampling also stalls |
| Builtin DirectDraw + OpenGL + MCM desktop + Wine VideoMemorySize=256 | Main menu and playable Yuma Sand Dunes event; live scheduler capture succeeds |

## Resolved startup blocker

The debugger traced failure to the signed buffer-budget comparison at
`0x492bdb`. The original copies available video memory from its DirectDraw caps
into device offset `0x33c` (`0x491da1–0x491ded`), then subtracts a depth-buffer
budget. With the modern adapter, the observed comparison had EDI=`0xfff69fff`
(negative), ECX=`0x0012c000` (required bytes). Thus it rejected even 640×480×16
before creating the primary surface. Every eligible mode failed, and
`0x467090–0x467097` cleared the adapter's acceleration flag. The resulting
“no 3-D acceleration hardware” dialog was misleading.

Setting `HKCU\Software\Wine\Direct3D\VideoMemorySize` to string `256` changed
EDI to `0x0ff6a000`. The same unmodified initialization then returned success
and reached the main loop at `0x4337cf`. Standard modes including 640×480 and
800×600 are present in the MCM virtual desktop. The working launch explicitly
sets `WINE_D3D_CONFIG=renderer=gl` and `WINEDLLOVERRIDES=ddraw,d3dimm=b`.
[Wine's memory override is documented by CodeWeavers](https://support.codeweavers.com/en_US/video/manually-set-videomemorysize).

The earlier dgVoodoo/DXVK DLLs remain in the isolated copy but are bypassed by
the builtin DirectDraw override. They are not required by this working path.
`OmitDriverCheck` remains zero; no game-code bypass is used. Installation and
registry changes affect only the dedicated copy/prefix. Source game files and
physics instructions are unchanged (temporary debugger breakpoints are restored).

Reproduce with the initialized reference prefix; for a fresh prefix import
`scripts/mcm-reference/graphics.reg` as explained in the harness README:

```sh
bash scripts/mcm-reference/launch.sh \
  "$HOME/Library/Application Support/Dust Valley/mcm-reference"
```

Menu path: Single Player → Stunt Quarry → Practice → Yuma Sand Dunes →
select rider/bike → Start. Default keyboard throttle/brake are Up/Down;
steering is Left/Right; W/S shifts rider weight. F3 pauses/resumes.

Stop that isolated prefix with `WINEPREFIX="…/mcm-reference/prefix" wineserver -k`.
Do not kill unrelated Wine prefixes. Use `prepare.py` for a fresh hashed copy;
see the harness README for installation and registry prerequisites.

## Validation that did complete

The [helper report](mcm-helper-validation.json) records 134,242 original-instruction
comparisons with zero differences: 130,052 lookup-square-root cases and 4,190
scheduler cases. Both x87 control words 0x027f and 0x037f were tested. The harness
maps the exact executable, applies its PE relocation table, and executes the
original routines with controlled inputs. It patches only a private-memory exit
jump after the scheduler slice. It does not replace those routines with C math.

122 representative synthetic original outputs remain in regression fixtures.
These synthetic comparisons are separate from the new live observations.

## Live observations and remaining gate

[Live report](mcm-live-validation.json): 600 boundary records, 300 paired scheduler
executions, two bike objects, zero differing dt/carry/iteration outputs. The actual
physics scheduler uses x87 control word `0x027f` in all captured records. Observed
frame deltas span approximately 0.012–0.149 seconds across the three captures.
The debugger slows execution; these are observed instrumented deltas, not normal
frame-rate measurements or a repeatability claim.

The checked-in `capture-live.c` was separately compiled with warnings enabled
and validated on 60 of those paired observations. It restores breakpoints and
detaches, leaving the event running. `compare-live.mjs` rejects incomplete or
mispaired captures and reports raw-bit differences. Scalar observations are
checked into `tests/fixtures/mcm/live-scheduler-wine11.json`; full raw dumps,
diagnostic source/executables, logs and screenshots are preserved locally in
`mcm-reference/live-validation/`.

The 4096-byte object snapshots include changing bike state, but pointer targets,
contact geometry and complete input histories are missing. Player versus AI
addresses were not yet identified in those initial captures. These are scheduler-before/after boundaries,
not integration-before/after boundaries. Next: map those state fields and the
full update boundary, capture synchronized input/contact state, then establish
repeatable stationary, acceleration and throttle-release fixtures. Native
Windows numerical equivalence also remains untested.


## Latest restart regression

After the player/engine captures and helper validation, the experimental live
force probe produced no records and the reference process exited. Subsequent
launches initially exposed a black/hidden game window. Setting the dedicated
prefix's `Direct3D\renderer` to `gl` (to agree with the launch environment)
restored a visible OpenGL window but a fresh run faulted in Wine/WoW64 at
`0x7bf2123d`, reading `0x00004dc9`, before returning to playable practice.
This restart regression remains unresolved; the earlier successful gameplay and
captured telemetry are preserved, but the current session is not playable.
The crash detail is preserved locally as `player-validation/mcm-gl-crash.txt`.
No physics parity claim relies on this failed run.


## Clean-prefix isolation

[Experiment report](mcm-startup-regression-validation.json): a fresh Wine 11
prefix with the 32-bit game registration, OpenGL and 256 MB cap reproduced the
hidden/black-window state after the original video-memory test. Restoring the
pristine PDM profile did not resolve it; the backed-up profile was restored.
Giving the game a normal Win32 window frame also did not expose a usable menu.
Without the Wine Explorer Desktop setting, the original instead displays its
no-3-D-acceleration dialog. These results narrow the next investigation to the
display path; they do not establish its exact cause.

The installed bundle contains no `winex11` driver. A historical
[package-maintainer report](https://github.com/Gcenx/macOS_Wine_builds/issues/16)
states that virtual desktops require X11 rather than the macOS driver. Its age
means it is supporting context, not direct proof of Wine 11 behavior. Do not
assume that adding XQuartz alone would help a bundle without an X11 driver.
No currently playable replacement configuration has been verified.


## Locked-session finding and retained launcher

A subsequent `CGSessionCopyCurrentDictionary` check returned
`CGSSessionScreenIsLocked = 1`. Earlier hidden-window and screenshot failures
were not controlled for this condition, so they cannot by themselves establish
a Wine rendering failure. The no-acceleration dialog and recorded crash are real
observations, but the graphics-path diagnosis remains provisional.

Replaying the original debugger-assisted launch passes the memory check at
`0x492bdb` and reaches menu entry `0x4337cf`. Keeping its parent process alive
with `WaitForSingleObject` leaves game PID 284/main thread 288 alive in the
persistent reference prefix. The temporary launcher is `/tmp/mcm-parent-probe.exe`;
source, executable and logs are preserved under
`player-validation/startup-regression/`. Native window ID 2176 is reported as
onscreen, but macOS capture failed while locked and Win32 BitBlt returned black.
These are session identifiers and must be rechecked before use. The user has
been asked to unlock the Mac; visual gameplay is not yet revalidated. Do not
terminate/restart this live session merely because capture is unavailable.

The follow-up hardware-watchpoint attempt on the four differing words produced
no writer records and timed out without a usable debug break. It supplies no
classification evidence. A subsequent read confirmed all debug registers were
zero, the process remained alive with no debugger attached, and instruction
bytes at all five temporary hook locations were intact.
