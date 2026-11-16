# Motocross Madness physics parity roadmap

## Current status — November 15, 2026

**Full physics parity is not achieved.** Expanded rider-collision comparison now exposes 76 shared-grid link mismatches in the latest eight-frame fixture, starting before its first separate rider tick. Existing bike/substep checks still pass; they do not prove complete collision-world parity. The previously failing scene trajectory (38 bike / 28 visual DWORDs) now passes its modeled bike/visual checks after correcting the base-component transform used by airborne control. The retained recovery wrapper has also been corrected against the original recovery corpus. Historical milestone descriptions below preserve what was known at those commits; their old “next work” paragraphs are not the current task list.

| Area | Current evidence | Still required |
| --- | --- | --- |
| Retained AI bike physics | Sixteen captures pass modeled bike/substep checks across 108 frames and 6,458 observed substep boundaries, complete bike bodies and twelve component words per boundary. An eight-frame run starts during an active trick and validates retained rider animation, visible bike/rider draw rectangles, LOD selection and mesh-cache writes. Two subsequent runs validate batched particle observation. The previously failing scene trajectory also passes. | Longer, normal-rate trajectories; uncovered controller modes and interactions. |
| Recovery orientation | Retained wrapper matches 327 pinned-original synthetic cases over four calls each, including graphs, animation and orientation scratch. | Live complete crash/recovery sequences in the surrounding world. |
| Player acceleration and throttle release | One 400-frame crash/throttle-release capture matches the modeled physics words; shared visual/particle differences remain. | A separate negative-steering run still diverges at frame 38 (41 physics differences) without observed caller scratch; finish the world inputs and prove sustained repeatability without reseeding. |
| Shared world and scheduling | Separate rider, dust-emitter, spray-emitter and shared-pool ticks, scene-position-query prefix, and draw rectangle/LOD/cache updates are connected in native replay. Camera matrices and draw scheduling remain captured stage inputs. | Remaining scene update/scheduler logic, camera producers, shared-particle writers and other actors. Full rider-collider/entry/pair assertions expose shared-grid ordering differences. A separate all-actor grid trace matches every grid cell and entry across 78 calls with external geometry/order; those other actors must still be evolved by the retained world simulation. Particle-pool mismatches remain explicit. |
| Observation quality | Read-only batching and buffered record output reduce observation cost; the latest eight-frame capture has intervals 0.092, 1.197, then 0.668–0.727 seconds. Same-boundary individual-read audit passes. | Further reduce overhead; validate at normal frame timing. |
| Preview | Uses the shared recovered runtime; desktop/touch startup and driving checks pass for the airborne-control fix. | Continued gameplay validation across jumps, collisions, recovery, maps and input modes; a playable preview is not proof of parity. |

There is no measured completion percentage yet. The user-requested planning estimate is approximately 70% (rough range 60–80%), not a coverage score: the remaining world/order dependencies can reveal additional errors. Green regression tests prove their stated boundaries, not complete gameplay equivalence.

## Historical milestones

## Scene-object rider query connected; later physics divergence retained (2026-11-15)

The shared frame runtime now derives the scene object's initial gate inputs and ownership from an atomic AI-entry environment. `scene-rider-position.js` implements the original `422f50..422fad` prefix: owner enabled gate, world disabled gate, live bike exclusion flag, then `bike+874 -> rider+fc` world-position resolution. The queried joint and recursive parent-cache chain come from the retained graph. Observed query targets, callers and output position are assertions only. Later visibility/state transitions and the complete application scheduler remain unconnected.

Added optional `MCM_AI_SCENE_OBJECT` observation with guarded entry `422f50` and post-position `422fad` hooks. The same initial environment captures the scene allocation and both gate chains; every invocation records gate values and the native position result. The first attempt timed out with zero qualifying frames and independently restored/detached cleanly. A subsequent capture completed eight bike boundaries plus rider and scene events; all eleven hook bytes were independently restored and the debugger detached. The original was never restarted.

The maintained `ai-frame-scene-wine11.json.br` **does not pass whole-sequence physics parity**. Scene gates, the four-node resolver chain, position result, rider/child state and particle pool match. Bike body and all captured visual/animation state match through the second entry/controller/steering boundaries, resolving the earlier inter-frame joint-cache mismatch. At the second frame tail, 38 bike DWORDs and 28 transform DWORDs diverge. Strict analysis still throws at `bike+4f0`; the explicitly requested `diagnosticBody` mode reports every discrepancy without changing state. Tests preserve this failing parity case, reject altered scene inputs/targets/outputs, and do not classify a green regression suite as a full parity pass.

The actual incoming intervals are approximately 0.604 and 24.779 seconds; capture overhead remains a limitation. A separate temporary observed-drive-scratch diagnostic did not remove this divergence and is not a runtime option. Next work is finer substep/component observation to locate the first physics difference, plus the remaining scene visibility/world scheduling and shared-particle writers. Preview player handling is unchanged.


## Separate AI rider tick and identified scene-query writer (2026-11-15)

The consecutive AI diagnostic can now connect the existing recovered rider tick to the same bike/animation/collision objects, initialized once at the first bike entry. Read-only hooks at `40e990` and `40f99c` record its real timestep, child allocation, full shared particle pool, rider allocation, visual graph and collision observations. A separate optional `4b6930` hook records external world-transform query targets/callers; these observations are diagnostic evidence and never select model writes.

Two maintained two-frame captures match all eight bike-body/RNG boundaries and the separate rider's before/after allocations and child state (5,000 bytes). A grounded contact exposed the missing float `bike+6b4` front-load radius in the raw/semantic bridge; it is now included, with full-body original comparison. One capture retains 376 shared-particle DWORD differences across its two rider boundaries from external activity; another matches the entire captured pool and particle allocations. Neither silently imports those external changes. Collision snapshots are captured but not yet asserted by this sequence diagnostic.

The remaining 153 visual DWORD differences are now localized to three joint world caches after the rider tick. Original execution identifies `422fad` as the position-query caller, inside the scene-object update at `422f50`, followed by recursive parent resolution at `4b6956`. Disassembly `422f95..422fad` confirms selection of `bike+874 -> rider+fc`, before the visibility query. The scene-object gates and invocation order still need to be connected to the shared world runtime; recorded query nodes are not used as replacement commands. Negative tests retain that distinction and reject mixed rider capture IDs, altered rider/child outputs and missing ticks.

Evidence: `ai-frame-rider-wine11.json.br` (eight restored hooks), `ai-frame-rider-callers-wine11.json.br` (nine), and extended capture/archive/verifier/sequence tools. Every native capture independently confirmed restored bytes and debugger detachment. An earlier natural capture began mid-trick and remains diagnostic-only because the initializer rejects that state. Capture overhead is still large (second intervals about 33.781 and 24.810 seconds); normal-rate trajectory parity remains unproved. Preview player handling is unchanged. Next: connect the scene-object query's real gates/order, shared particle/world writers, and reduce observation overhead.


## Consecutive AI frame diagnostic (2026-11-15)

A new natural two-frame capture initializes the model once and carries computed state through both frames, including the final saved-position stores between them. All eight entry/controller/steering/tail bike-body boundaries match (26,176 bytes), as do the observed shared RNG states with two draws. The first frame executes two substeps and the second eleven. No later body, graph, RNG, or stack observation is imported into the model.

This is **not a passing whole-world trajectory**. `analyze-ai-frame-sequence.mjs` preserves 156 visual DWORD differences: 40 at the second entry, 40 after its controller, 40 after steering, and 36 at its tail. They are confined to captured world matrices and cache-valid flags (+c4 through +104); local transforms and animation records compare exactly. The four nodes belong to the rider hierarchy (root, body and two probe joints). Native rider position/previous-position words (+40..+54) also change between frames. The writer/order responsible for those cache changes is still unverified, so the diagnostic reports them instead of refreshing the model from the second entry. Tests reject corrupted second-frame body/RNG outputs and retain the visual mismatch explicitly.

The incoming intervals are approximately 35 ms and **24.283 seconds**, including capture overhead. This evidence does not establish normal-rate continuous driving. Next work must reduce observation overhead and capture/execute the intervening rider, renderer and world updates in their actual order. The six guarded observation sites were independently verified restored and the original detached. Raw evidence and hashes are retained in `ai-frame-sequence-wine11.json.br`. The public preview's player handling is unchanged.


## Connected AI dispatch through the frame tail (2026-11-15)

The retained frame driver now invokes the executable AI controller when a caller supplies a validated same-entry AI environment. Without that environment the existing `pending-controller` guard remains. `retained-ai-controller.js` synchronizes the original raw AI fields with live semantic bike state, preserves float bit-carriers and shared animation bounds, and uses the existing transform graph, trick resources, actor positions and RNG. Diagnostic body projection copies computed state without mutating the runtime. Unknown semantic fields fail explicitly instead of silently disappearing from comparison.

The original AI call returns through `4a56d9` into common steering at `4a57c0`. Steering therefore runs after a completed AI controller, while unexecuted/pending controller callers retain their guard. An optional frame-tail observer corresponds to `4ad0e1`, after the return gating but before the final three saved-position stores. It does not replace the existing before-return or return boundaries.

Added read-only same-entry capture of route nodes/table, player and both actor lists, race/settings words, route-loaded state, lookahead/margin and allocation accounting. The extended observer adds guarded non-CALL hooks at `4a56d9` and `4a5991`; the latter's observation normalizes the already-pushed reset argument in its stack copy only. All six hook bytes were independently verified restored and the debugger detached after each capture. `MCM_AI_GROUNDED` selects an observed grounded starting frame without changing state or input.

Two maintained original captures now pass end to end from one initialization each: one airborne frame (33 ms incoming delta) and one grounded frame (39 ms). Each executes two physics substeps and matches three boundaries—controller return, common steering, and frame tail. Per frame, 4,198,424 compared bytes cover the complete bike body, captured visual/animation allocations, observed engine prefix, rider allocation, three emitters, acceleration filter and envelope. Each has 78 visual-allocation boundary records (including the rider proxy). The airborne frame consumes one shared RNG draw; the grounded frame consumes none. The grounded steering rate matches the original nonzero value, approximately 22.690975. Native output corruption, altered steering scratch, mismatched capture identity and conflicting actor snapshots are rejected.

Evidence: `ai-frame-dispatch-wine11.json.br`, `ai-frame-grounded-wine11.json.br`, `analyze-ai-frame.mjs`, the extended capture/archive/verifier tools, and dispatch regression tests. Intermediate native observations are assertions only; no per-stage state is loaded into the model. AI effect-query counts/outputs are not independently hooked and are excluded from parity assertions; emitter/filter outputs are compared. The earlier raw `v1` dispatch capture separately matched controller and steering but lacked the tail resources and is not a full-frame fixture.

This establishes two independent initialized AI frames through the observed tail, not a retained multi-frame trajectory or complete whole-world parity. Final saved-position stores have existing isolated/player coverage but are after this capture's tail boundary. Next work is retained AI/rider/world evolution and ordering across successive frames, followed by remaining nearby/racing/scripted behavior and the known longer player/world replay divergence. The public preview still uses the player controller; this milestone does not claim changed preview handling or full parity.


## Natural AI frame-entry initialization (2026-11-15)

Added `MCM_OBSERVE_AI` to the existing frame observer. It selects a specific AI bike, rejects scripted inputs/timing, checkpoint import/restoration and alternate hook layouts, and captures entry resources without changing simulation state. The four guarded sites remain scheduler entry `4a54b6`, frame tail `4ad0e1`, action boundary `4ad5a2` and RNG `4bf195`. RNG observation establishes the actual thread-local state before starting a frame capture; it never substitutes the scripted seed. `verify-ai-frame.c` independently checks all four restored instructions and detached status.

The pinned original produced two observed scheduler-entry/frame-tail pairs for bike `0x51f7598`, with matching entry checkpoint, collision world, environment and animation resources. The tail boundary precedes the final saved-position copy at `4ad0e1..4ad10d`; it is not an after-return snapshot. All 32 bike/rider trick pointers are included before selection. The animation loader reconstructs 69 shared records and 2,313 linked frames. The four observed RNG draws and every frame-boundary RNG state follow one computed stream. The second frame's long elapsed interval reflects debugger/export overhead and remains unchanged in the fixture; these observations are not a claim of representative realtime cadence.

The retained bootstrap now accepts the explicit `ai-frame-entry` boundary, requires an AI bike, preserves its control words, disables player device queries, and connects real trick resources. Its actor transforms, bike state, bounds and animation objects share the existing runtime identities. Tests reject mixed capture boundaries, player relabeling and missing animation resources. The driver still returns `pending-controller` before any substep or RNG draw: this milestone validates initialization and evidence integrity, **not full-frame output parity**.

Evidence: reproducible `archive-ai-frame.mjs`, maintained observer/exporter/verifier, `ai-frame-wine11.json.br` with hashes of all seven original capture files and cleanup evidence, and `tests/mcm-ai-frame.test.js`. Next: capture the route/controller environment at this same frame entry, connect the executable controller to these shared objects, and compare frame/controller boundaries before expanding to retained multi-actor evolution. Preview handling is unchanged; full parity remains incomplete.


## Executable mode-0 AI controller runtime (2026-11-15)

`src/physics/mcm/ai-controller.js` now composes the recovered controller as an executable runtime routine. Its mutable inputs are bike/proxy/envelope DataViews, route nodes, transform/bounds graphs and animation resources. Terrain queries, actor/player bodies, shared RNG, heap policy and allocation accounting are explicit environment dependencies. It has no capture-row or Node/Buffer dependency. It computes entry, targeting, guidance, avoidance/allocation, jump/trick, steering, landing/pitch, throttle and final motion in original order. Modes other than zero and nearby interaction remain explicitly guarded.

The separate validator filters the maintained 159-call original capture down to controller entry/exit, world/actor resources, route and RNG observations. No intermediate control, motion, trick or contact snapshots feed this runtime. All 520,248 bike-body bytes, 1,272 graph-node records, proxy/envelope/bounds updates, one successful trick and 92 shared RNG draws match. Entry graph/animation mutations and output body/graph/RNG corruption are rejected. Empty-route behavior preserves every byte except throttle/brake. A loader-boundary test checks the original ordering: increment/wrap `c44` before the loader, then clear controls after it returns (disassembly `46d27b`, `46d2ee`, `46d300`).

This is complete **per-call** runtime comparison within the captured mode-0 domain, not retained whole-world proof. Controller-entry body and graph snapshots still supply outer-frame changes; route flags and shared RNG persist across calls. Heap pointer identity/global heap state remain environment boundaries. Ground-only unused scratch and inactive race progress are not claimed as stack parity. No new native capture was needed; pinned executable/hash and all 28 restored-hook/detach records are checked in the existing fixture.

Current remaining work: connect the runtime to the frame driver's shared bike, animation and graph identities; supply real AI world/actor initialization; validate retained AI plus rider/contact evolution without per-call body/graph snapshots; finish uncovered nearby/race/scripted paths and existing player/world replay divergences. `retained-frame.js` still returns `pending-controller` for AI/scripted contexts until that connection is validated. Preview handling is unchanged. Full physics parity is not complete.


## AI route-controller modes 1 and 2 (2026-11-15)

Extended `0x46d707..0x46dac1` targeting and `0x46dac1..0x46dec6` guidance beyond mode 0. Seven target outputs and six guidance outputs match 16,384 repeated intact original executions (4,096 per block/mode), while the original mode-0 fixtures remain unchanged and passing. Targeting preserves mode-1 flag-driven advancement and mode-2 route-gap rewinds. A rewind updates target/index but deliberately retains the pre-rewind successor and headings, matching original output. The loop detector includes the flag because a mode-1 one-node route can revisit the same index after consuming its advance flag.

Mode-1 guidance consumes the caller's scene direction, selects signed near/far offsets and lowers the speed limit to 80 for nearby sharp turns. The original overwrites the aim-X scratch slot with its heading difference in that branch; the reported six-word stage result preserves that reuse. Mode-2 guidance reads its speed limit from route word5. The live analyzers pass captured modes and route word5; mode 1 requires an explicit direction table and fails if it is absent. No direction is inferred from output.

Evidence: expanded target/guidance models and maintained oracle/case generators, `ai-route-modes-wine11.json.br`, `tests/mcm-ai-route-modes.test.js` and the unchanged mode-0 comparisons. New mode coverage is isolated original execution, not live racing-scene or whole-controller proof. Full frame dispatch remains guarded pending controller integration, external events and graph/allocation effects. Preview handling is unchanged.

## Constructed AI lookahead input (2026-11-15)

Recovered constructor `0x4a3289..0x4a32db`: global lookahead is `f32(worldHeight * 16)`, then body `b5c` is computed from that stored float and the constructor's signed-integer argument (previously stored as float at `EBP-7c`). Both outputs match 4,096 repeated intact original executions, including signed zero and varied finite world heights/integer arguments. The argument's semantic meaning is not inferred from its numeric value. The original default data values 48/24 are not proof of immutable globals: lookahead has this constructor writer.

Where explicit world configuration is available, the guidance/avoidance/lookahead/pitch/throttle replay chain now computes lookahead and asserts every observed global against it. The Dunes configuration (world height three) matches all 256 live guidance calls; altered world height or captured global fails. Older standalone diagnostics without configuration retain their explicitly observed initial-global boundary. The companion `b5c` output has isolated constructor coverage only; its constructor argument is not yet reconstructed from live scene setup.

Evidence: `ai-initial-parameters.js`, maintained original oracle/case generator, native fixture and `tests/mcm-ai-initial-parameters.test.js`. This removes one observed input in the configured replay, but does not establish full construction, retained controller/frame integration or full physics parity. Preview handling is unchanged.

## AI contact-response event connection (2026-11-15)

Added before/after `0x4a6c01..0x4a6eac` observations alongside AI calls and complete motion graphs. The existing recovered `updateMcmContactResponse` matches 2,901 live substeps: eleven body fields, component angle/rate, four scratch values and full captured graph bytes. Chronological controller replay now asserts the retained latch against each contact entry and applies the computed contact result. All 256 AI calls match, with 150 throttle/turning updates and no braking or low-speed boosts. No observed output is injected as a replacement state.

Coverage limit: this capture has **zero contact-driven latch changes**. It validates contact-response execution and the event connection, but does not reproduce the older graph capture's call-160 latch clear. That older trace still rejects the missing external event. A preceding writer trace identified actual landing clears at `0x4a6e38`, but lacked the routine entry inputs; those writer values are not substituted into replay. A changing-latch live contact example remains required.

All twenty-eight hooks were independently verified restored and the debugger detached. The fixture projects contact rows to the observed body words and stack inputs consumed by the checker, preserving complete component/graph records and all other rows; it records both raw-trace and projected hashes. The projection is reproducible with `archive-ai-contact-events.mjs`. Evidence includes maintained capture/verification scripts, `analyze-ai-contact-events.mjs`, `tests/mcm-ai-contact-events.test.js` and the live fixture. Outer contact queries/pose remain observed inputs; retained whole-frame AI integration, graph changes outside these stages and full physics parity remain unfinished. Preview handling is unchanged.

## Live AI motion transform graphs (2026-11-15)

Captured complete before/after motion-stage graphs for 256 calls in the existing Wine process: eight nodes per call, 2,048 node records, 163 turning updates and 457 cache invalidations. The recovered motion routine matches all node bytes, including local/world matrices, child cache flags and untouched fields, plus fourteen body outputs. This capture contains no low-speed boosts. All nineteen guarded hooks were independently verified restored with no debugger attached. The first attempt timed out with zero calls because the window was minimized; cleanup was verified, then the same process was restored and captured without restart.

Computed upstream controller outputs now drive the actual captured graphs for the first 160 calls. The full retained replay correctly fails at call 160: `b4c` changes from one at exit159 to zero at entry160, alongside an `820` clear outside the controller. That external trick-latch clear is not yet modeled; a regression preserves the rejection. All 256 motion stages pass when their incoming commands/graphs are explicit observed boundaries. This is stage-local graph parity, not retained whole-controller or whole-world parity. No state reseeding or weakened guard was introduced.

Evidence: maintained `capture-ai-motion-graph.c`/`verify-ai-motion-graph.c`, `analyze-ai-motion-graph.mjs`, graph-aware `analyze-ai-motion.mjs`, native live fixture and regression tests. Next: identify and compute the external latch-clear event and retain actual graphs through trick/nearby interactions and whole-frame dispatch. Preview handling remains unchanged.

## AI race handicap (2026-11-15)

Recovered `0x46d535..0x46d707`: signed lap/route progress differences with integer wrap, progress normalization using the original signed float-bits gate, route-distance comparisons against the other actor, clamping and the body `ba8` speed scale. All three outputs match 8,192 repeated intact original executions, with synthetic route tables, inactive/active race branches and finite inputs. Native evidence caught and corrected premature float rounding in the final scale expression; the original retains double precision between stores.

The 256-call mode-0 capture verifies unit scale at the intermediate and final body states. Its inactive progress scratch is uninitialized by this block and remains an explicit captured entry boundary; this is not a computed active-race live trace. Landing and pitch replay now consume the recovered block's results. The live analyzer rejects active races because this capture lacks the other actor's route table. Tests reject modified progress and scale. Evidence: `ai-race-handicap.js`, maintained native oracle/case generator, `analyze-ai-race-handicap.mjs`, native fixture and three regression tests.

Full parity still requires active-race live route/graph capture, controller integration with retained motion, actual transform and trick/nearby graphs, allocator accounting and natural whole-world replay. Keep AI frame dispatch guards. Preview handling is unchanged.

## AI startup and optional route data (2026-11-15)

Recovered `0x46d240..0x46d3c2` startup and `0x46bdc0` optional `.aid` loading. Startup preserves empty-route braking, low-byte jump-counter increment and wraparound, target selection before index clamping, race flags, mode-specific steering coefficients, pitch and velocity heading. The loader preserves sequential actor selection despite the file's validated actor index, signed actor-limit clamping, and partial DWORD writes on truncated reads. The attempted-load flag is set even when loading fails. Both blocks match 4,096 cases each, repeated against the pinned original executable. Startup executes the real loader; only host file IO is substituted. Valid memory/table and finite floating-point inputs remain the oracle domain.

The established-world capture matches eight computed startup values and retains the jump counter across 256 calls, including one increment. Lookahead consumes computed mode coefficients; landing/trick replay consumes the computed race flag. Changed stage values or counter reseeding fail. The live route-data loaded flag is an explicit initial boundary, not observed evidence of first-load behavior; isolated executions cover that behavior. Evidence: `ai-entry.js`, `ai-route-data.js`, their maintained oracle/case generators, `analyze-ai-entry.mjs`, `tests/mcm-ai-entry.test.js`, and `ai-entry-wine11.json.br`.

Still open: retained whole-controller integration, handicap/race producers, allocator accounting, actual live transform and trick/nearby graphs, external event scheduling and natural whole-world replay. Per-call pose inputs remain captured. Keep AI dispatch guards; preview handling is unchanged. Full physics parity is not established.

## AI throttle, brake and direct motion outputs (2026-11-15)

Recovered `0x470174..0x4703c2` throttle/brake decisions, lateral-speed and route-boundary limits, turn-rate adjustment and the mode-1 pitch override. Recovered `0x4703c2..0x470553` direct velocity/axis rotation, original `0x4b7000` normalization and graph invalidation, low-speed forward boost, speed recomputation, output-history fields and packed jump-flag clearing. The motion helper accepts a caller-owned transform graph. Five throttle outputs match 8,192 repeated original cases; all 49 motion/body/root-matrix/cache outputs match 4,096 repeated cases. The original orientation callee is intact, with synthetic root/child/sibling graphs and varied cache flags. Coverage is finite and does not establish every exceptional x87 value.

The mode-0 live chain now computes throttle/brake/pitch and checks all fourteen final motion fields across 256 calls: 139 throttle-on decisions, three braking decisions and 148 turning updates. Inputs include recovered pitch, route guidance, avoidance, lookahead and jump-modified vertical velocity. The earlier minimum-speed-limit clamp is reconstructed and asserted at its boundary. Tampered throttle, velocity, normalized axes or packed flags fail. This capture has **zero low-speed boosts**; that branch has isolated original coverage only. The live capture also lacks the AI root graph: the body-only analyzer uses an inert local transform solely for body-axis normalization and makes no live root-matrix/cache claim. All graph outputs are checked by the isolated oracle.

Evidence: `ai-throttle.js`, `ai-motion.js`, both native oracles/generators, `analyze-ai-throttle.mjs`, `analyze-ai-motion.mjs`, `tests/mcm-ai-final-controls.test.js` and its native fixture. Per-call pose, startup/race/handicap inputs, full trick/nearby event graphs, live transform graphs, retained motion and natural whole-world replay remain unfinished. The recovered blocks are not yet a complete replacement for AI frame dispatch; keep its guards. Preview handling is unchanged, and full physics parity remains unproven.


## Retained mode-0 AI pitch command (2026-11-15)

Recovered speed-based pitch adjustment `0x46f69e..0x46f824` and contact/airborne/route-jump pitch control `0x46f911..0x470174`. The latter also computes the handicap-dependent turn multiplier. Preserves signed-bit speed/timestep gates, distinct float stores and multiplication order, landing-angle deadband, route projection, snap/rate limits and asymmetric bit clamps. All outputs match 12,288 repeated intact original executions (4,096 base cases and 8,192 later-control cases), with finite inputs and no substituted callees in either block.

The live analyzer consumes computed jump/landing outputs from the retained replay, recovered lookahead and avoidance, route segment geometry and a pitch angle derived from entry orientation. It initializes `6ec` once, carries each computed result, checks stage entries and matches all 256 full-controller pitch exits. The recovered frame-input crash branch processes 156 captured crash events. **Pitch is already zero at these events in this fixture**, so deleting them does not change pitch outputs; the earlier steering regression remains the evidence that missing crash events are observable. Altered retained pitch entries, output commands and timestep boundaries fail the new checks. Turn multiplier output is proven by isolated execution, not yet by a live downstream observer.

Evidence: `ai-pitch-control.js`, both native oracles/generators, `analyze-ai-pitch-control.mjs`, `tests/mcm-ai-pitch-control.test.js` and native fixture. `replayAiLandingPitch` exposes copied computed results so the command analyzer does not seed landing pitch from observed exits. Live validation remains mode 0 with per-call pose, race/handicap configuration, crash occurrence and external random scheduling as boundaries. The later mode-1 pitch override, throttle/brake decisions, direct velocity/orientation updates, full trick/nearby graphs, retained motion and natural whole-world replay remain unfinished. Preview handling is unchanged; full parity is not established.


## Retained AI jump state through terrain-normal landing pitch (2026-11-15)

Recovered `0x46f824..0x46f911`: the airborne/latch/time gates, projected query position, original smooth terrain-normal query, heading-relative landing pitch, signed-bit pitch cap and latch write. Both output words match 4,096 repeated original executions on Dunes, including bypass cases. The oracle retains original terrain parsing and normal lookup, with the existing host allocation/stdio and renderer-initialization substitutions. Its wrapper reserves sufficient scratch space through `esp+0xb0`.

The live chain initializes eight jump-state fields once (`b44,b64,b68,b40,b18,b20,b4c,b38`) and retains computed results across 256 controller calls. Landing targets, nearest route and category come from the recovered route/lookahead chain. Pose and other body inputs come from the earlier controller-entry snapshot and are asserted unchanged at jump entry. Computed vertical velocity feeds landing pitch. All nine body outputs match full-controller exits; all eight retained fields match subsequent entries. Sixteen computed terrain-normal queries resolve the former sequence-5 latch/pitch mismatch. Two selected tricks, thirteen rejected attempts and all 127 AI draws remain matched. Reseeding the entry latch, altering an exit pitch or suppressing a landing query fails validation.

Evidence: `ai-landing-pitch.js`, oracle/generator, `analyze-ai-landing-pitch.mjs`, `tests/mcm-ai-landing-pitch.test.js` and native fixture. Reuses the independently cleaned seventeen-hook live capture. Per-call pose/velocity, race/handicap/scratch inputs, external random-consumer scheduling and difficulty-zero eligibility remain boundaries; complete trick event graphs, nearby interaction, remaining longitudinal commands, retained AI motion and natural whole-world replay are not established. This milestone does not change preview handling or prove full physics parity.


## Automatic trick selection and observed AI dispatch (2026-11-15)

Recovered complete selector `0x49d6a0`: six flight-time thresholds, all three selection banks (including the empty-bank fallback), original nearest-even integer conversion, selected trick and optional randomized startup delay. Uses the pinned executable's trick and duration tables and the shared thread random stream. Five output words match 4,096 repeated original executions, including failed selections that preserve outputs and draw no random values. The oracle keeps original random arithmetic and substitutes only the CRT thread-pointer lookup.

The mode-0 stage-local diagnostic now predicts all 127 AI draws in the captured 138-draw thread stream, rejecting unmodeled AI draws. Across 256 calls it checks all nine jump body fields, flight time, delay, selected animation and startup flag. It predicts two successful tricks and thirteen rejected attempts; the intervening dispatch now explains the `b4c` differences excluded from the prior jump-only diagnostic. Route word9 values are initialized from the captured route and carried through computed jump clears. Selected animation, trick flag, RNG-consumer tampering and extra unmodeled AI draws fail tests.

Evidence: `ai-trick-select.js`, oracle/generator, `analyze-ai-trick-select.mjs`, `tests/mcm-ai-trick-select.test.js` and its native fixture, reusing the independently cleaned seventeen-hook live capture. Scope remains **observed stage inputs**, not retained whole-controller simulation. The live fixture has difficulty zero, so nearby-interaction dispatch is absent; full trick-start animation/event-graph side effects are not reconstructed by this analyzer. A strict retained-state experiment fails at sequence 5 because the later landing-pitch block changes `b64`/`b68` after sequence 4's steering stage. Those observed values are not used to claim retained parity. Next: recover `0x46f824..0x46f911` terrain-normal landing pitch and the remaining longitudinal controls, then join retained AI motion and natural world replay. Preview handling is unchanged.


## AI airborne state and flight-time calculation (2026-11-15)

Recovered `0x46f0a4..0x46f41a`: airborne-entry latches and route pointer, initial trick flag, projected landing distance, capped vertical-velocity correction, route word9 clearing, flight-time estimate and conditional random draws. All fourteen output words (including both route flags, random state and draw count) match 4,096 repeated isolated original executions. Finite cases cover ground/air transitions, modes 0/1/2, route categories, handicap branches and velocity limits. The oracle substitutes only the CRT thread-pointer lookup at the random entry; original random arithmetic and state stores execute unchanged.

The mode-0 live diagnostic checks eight body fields and flight time across 256 calls, predicting 123 jump-block draws within a shared 138-draw thread stream. Random state is initialized once; other consumers advance the same stream at captured call boundaries. This is **stage-local validation**, using observed body/stack inputs, not retained whole-controller parity. The later steering snapshot follows trick dispatch, which changes `b4c`; that field is checked in the isolated oracle but excluded from the later live boundary. No claim of full live jump-state parity is made. All seventeen capture hooks were independently restored and the debugger detached.

Evidence: `ai-jump-state.js`, the original-code oracle, deterministic cases, `analyze-ai-jump-state.mjs`, and `tests/mcm-ai-jump-state.test.js` with `ai-jump-state-wine11.json.br`. Changed velocity, flight time, random state and missing observations fail. Next: recover automatic trick selection `0x49d6a0` and dispatch `0x46f41a..0x46f4c4`, then join retained state and computed lookahead inputs. Longitudinal controls, retained AI motion and natural whole-world replay remain open. Preview control is unchanged; full physics parity is not established.


## Final AI steering command retained through crash clears (2026-11-15)

Recovered steering smoothing `0x46f4ea..0x46f69e`, including the signed-bit timestep gate, asymmetric native clamps, snap/decay paths, rounding boundaries and absolute-angle output. Both output words match 4,096 repeated original executions with varied finite angles, current commands and zero/negative/positive timesteps.

The live chain now computes route selection, guidance, avoidance/airborne differences, landing lookahead and final steering across 256 AI calls. Steering is initialized once and retained. All stage entries, output commands and full-controller exits match, including 14 lookahead steering changes. The capture contains 156 actual AI crash-input clears at `0x4a58b3`; the analyzer applies the existing `prepareMcmFrameInput` crash branch, checking each prior value and the computed zero. Removing clears fails the retained-entry check; changed clear values, timestep snapshots and output words also fail. No steering output or intermediate steering difference is injected.

Evidence: `ai-steering-control.js`, oracle/generator and `analyze-ai-steering-control.mjs`, `tests/mcm-ai-steering-control.test.js`, and `ai-steering-control-wine11.json.br`. All seventeen live hooks were independently verified restored with no debugger attached. Crash occurrence/timing, per-call poses and the outer-frame schedule remain captured boundaries; this is not a complete retained AI-frame simulation. Jump-state/RNG/trick behavior, longitudinal/throttle controls, allocator effects, retained motion and whole-world replay remain unfinished. Preview control is unchanged.


## Complete AI route/jump lookahead (2026-11-15)

Recovered `0x46eb14..0x46f0a4`: the five-node lookahead, route wrapping and category decisions, projected landing target, both terrain-query sites, landing-distance calculation, speed limit/jump flag updates and the conditional steering override. All eight checked output words match 4,096 repeated executions of the intact original block on the original Dunes terrain. The oracle keeps original terrain-node parsing and height queries; only the existing course loader's host allocation/stdio and renderer initialization substitutions remain.

The retained live reconstruction matches 256 calls, including 102 computed terrain queries, 33 projected-target changes and 15 steering overrides. Target coordinates and jump flag are initialized once, then carried forward and checked at subsequent entries and full-controller exits. The 15 previously unexplained steering changes now match before final smoothing. Targets, terrain heights and steering outputs are not injected from observations. Tests reject altered outputs, reseeded targets, changed terrain and changed configuration. All fourteen capture hooks were independently verified restored with no debugger attached.

Evidence: `ai-lookahead.js`, oracle/generator and `analyze-ai-lookahead.mjs`, `tests/mcm-ai-lookahead.test.js`, and `ai-lookahead-wine11.json.br`. The Dunes asset hash matches the original course used by the oracle. Live coverage uses mode-0 launch coefficients, supplied margin 24 and world `+0x18bc` value 3; the global configuration producer is not recovered here. Native generated coverage is finite. Jump-state/RNG/trick behavior after `0x46f0a4`, final controls, allocator effects, retained AI motion and the longer world replay remain open. Preview control is unchanged; full parity is not established.


## Ground and airborne steering differences joined (2026-11-15)

Recovered heading override `0x46dec6..0x46df48` and airborne steering difference `0x46e9f0..0x46eb14`. The override uses the retained target's segment heading, nearest-segment threshold and computed lateral error. The airborne path selects between target and velocity heading using route category, lateral velocity and the original wrapped-angle tests. Both intact regions match 8,192 repeated original executions (4,096 per branch, finite inputs).

The live analyzer joins retained target selection, route guidance, heading override and either the complete avoidance scan or airborne branch. All 64 heading and steering-difference outputs match: 36 ground and 28 airborne calls. Velocity heading is derived from earlier bike velocity, not seeded from intermediate stack memory. Ground scans now compute preceding overrides rather than reject them. Changed observed headings, airborne outputs and missing observations are rejected. All eleven live hooks were independently verified restored with no debugger attached.

Evidence: `ai-heading.js`, oracle/generator and `analyze-ai-steering-difference.mjs`, `tests/mcm-ai-heading.test.js`, and `ai-heading-wine11.json.br`. Live override enable is zero in this capture; isolated cases cover enabled and disabled behavior. Final steering/throttle outputs, subsequent route/jump lookahead, allocator effects, retained AI motion and whole-world replay remain unfinished. This does not change preview control or establish full physics parity.


## AI avoidance scan and steering difference (2026-11-15)

Recovered the complete scan at `0x46e340..0x46e9c7`: alternating candidate offsets, wrapped heading cones, player and actor records, self exclusion, route-category obstacles, persistent avoidance flags, speed fallback and final steering difference. Preserved the original second-list behavior: identity pointers advance while the first avoidance record is reused. The isolated oracle executes the intact scan, including both actor loops and route traversal, before allocator cleanup.

All five output words match 4,096 repeated original executions. Finite coverage includes 2,863 adjusted offsets and 1,215 speed fallbacks; final flags are 0 in 1,233 cases, 1 in 1,703 and 2 in 1,160. A 64-call live capture also matches all 40 eligible scans across 30 retained route-target advances; 24 calls skip avoidance. Live scans are unobstructed. Their range derives from entry bike `+0x6a4`, threshold from the recovered nearest segment, target from retained guidance, and records from earlier actor inputs. Intermediate snapshots are assertions. All nine live hooks were independently verified restored with no debugger attached.

Evidence: `ai-avoidance-scan.js`, oracle/generator/analyzer in `scripts/mcm-reference/`, `tests/mcm-ai-avoidance-scan.test.js`, and `ai-avoidance-scan-wine11.json.br`. Negative tests reject changed scan outputs, intermediate inputs and unsupported preceding heading overrides. Exceptional-value scan coverage, allocator effects, alternate heading/airborne branches, downstream steering/throttle control, retained AI motion and the longer whole-world replay remain open. This module does not yet change preview control or prove full physics parity.


## Live AI avoidance records joined to guidance (2026-11-15)

A 64-call original capture now joins nearest-route selection, retained target advancement (21 advances), guidance and avoidance record preparation. The recovered calculations match all written fields in 114 records: 57 inactive player records and 57 active self-actor records. Seven calls skip avoidance through the original `+0x4bc` eligibility branch. Input pose/velocity/radius and actor identities come from earlier captures; output-time body snapshots are assertions. Inactive angle slots are not interpreted as outputs, and their preservation remains covered by the isolated original-code oracle.

The regression rejects altered output words, changed body inputs, missing actor entries and changed eligibility. All seven guarded live hooks were independently verified restored with no debugger attached. Evidence: `analyze-ai-avoidance-record.mjs`, `tests/mcm-ai-avoidance-record.test.js`, and `ai-avoidance-live-wine11.json.br`.

This live scene contains no second-list actors and no active player obstacle. The self entry is excluded by the later scan. Actual obstacle-induced steering, the full scan, allocator behavior, retained AI motion and the longer world replay remain open. No preview handling change or full-parity claim.


## AI avoidance record preparation (2026-11-15)

Recovered pairwise avoidance records in the player region `0x46df56..0x46e060` and both actor-list regions `0x46e0a9..0x46e1ac` and `0x46e214..0x46e317`. Each record carries eligibility, distance (or squared distance while inactive), heading, relative speed squared plus one, and angular half-width. Inactive records preserve the two inherited angle slots. The implementation preserves the distinct player/actor comparison rules identified in the native instructions.

All five words match 12,288 isolated original executions (4,096 per region), repeated with identical output. Finite test inputs cover active/inactive records, coincident bikes, exact radius equality, zero and negative radius, and distinct inherited angle values. Evidence: `tests/mcm-ai-avoidance-record.test.js`, `ai-avoidance-record-wine11.json.br`, and the oracle/generator alongside the other reference tools. No live debugger was attached for this milestone.

Live record capture, exceptional-value execution coverage, list allocation/count/eligibility behavior, heading overrides, the subsequent avoidance-angle scan, steering/throttle outputs and retained AI motion remain open. These helpers are not connected to preview control. Full physics parity remains unproven.


## AI target guidance joined to retained selection (2026-11-15)

Recovered mode-0 guidance at `0x46dac1..0x46dec6`: original square-root lookup distance, route-offset/lookahead interpolation, aim heading with coincident-point fallback, speed-limit value and signed lateral error using the correct nearest-segment side. The current target and nearest segment remain distinct. All six words match 4,096 intact original executions, including direct/interpolated targets, category-8 bypass and degenerate nearest segments. Repeat native output is identical.

A new 64-call capture joins computed nearest segments and retained target selection through six advances into guidance; all six output words match each call. The lookahead setting is initialized once, then later snapshots are assertions. Mutated output bits, route offsets and later lookahead values are rejected. All four guarded live hooks are independently verified restored and no debugger remains. Evidence: `tests/mcm-ai-route-guidance.test.js`, `ai-route-guidance-wine11.json.br`, and the oracle, generator and analyzer in `scripts/mcm-reference/`.

Per-call bike pose, heading and remaining controller inputs are still boundaries; the initial lookahead producer is not recovered here. Other modes fail explicitly. Subsequent heading overrides, nearby-actor avoidance, steering/throttle outputs and retained AI motion/rider simulation remain open. This is not full controller or whole-physics parity, and preview handling is unchanged.


## Retained AI target advancement (2026-11-15)

Recovered the complete mode-0 target-selection loop at `0x46d707..0x46dac1`, including nearest/reference-index reconciliation, height and wrapped-angle tests, multi-node advancement, wraparound, reset of the target flag and both heading outputs. All seven output words match 4,096 original executions (1,902 advancing cases, including 848 multi-node cases); a repeated native execution is identical. No generated cases were discarded.

A new 64-call live capture matches every output word and includes 11 advances on the 603-node route. The analyzer computes nearest nodes and retains target index/flag across all calls, checking both subsequent entries and full-controller exits. Altered native heading bits and reseeded target indices are rejected. All three live hooks were independently verified restored with no debugger attached.

Evidence: `tests/mcm-ai-route-target.test.js`, `ai-route-target-wine11.json.br`, `analyze-ai-route-target.mjs`, and the isolated oracle/generator alongside it. Bike position, heading, reference index and BB8 still come from each captured entry; this does not yet retain the AI's motion. Modes other than 0 fail explicitly. Competitive race adjustments, distance/lateral-error production, obstacle/actor avoidance, steering/throttle outputs and complete AI motion/rider integration remain open. Preview handling is unchanged; full parity is not established.


## AI route-segment setup recovered (2026-11-15)

Extended the recovered AI search through `0x46d535`: next and previous route nodes (including wraparound), unrefined inverse segment length, half-speed scalar and both node-class flags. The contiguous original region matches all eight output words in 4,096 isolated executions; a second execution is identical. Four live controller calls on the original 603-node route also match all eight words. Independent cleanup confirms all three guarded hooks restored and no debugger attached.

The original calls `0x4017e0`, which returns the inverse-square-root table seed without refinement. The shared math module now exposes that seed separately while preserving the existing two-refinement lookup for its other callers. Tests cover duplicate/zero-length segments, first/last-node wraparound, class values, NaNs and infinities; empty routes and missing neighbor memory are rejected at this boundary. Evidence: `tests/mcm-ai-route-segment.test.js`, `ai-route-segment-wine11.json.br`, and `scripts/mcm-reference/ai-route-segment-oracle.c` with the deterministic generator alongside it.

This closes segment setup only. Race-state adjustments beginning at `0x46d535`, steering/throttle outputs, retained AI motion/rider updates and the unmodeled actor in the longer world replay remain open. No preview handling change or full-parity claim.


## AI route selection recovered (2026-11-15)

The natural scene-query replay now reaches another rider's visibility writes, which the retained player-only model correctly rejects. Read-only native identity checks link AI bike `0x51f7598` to render rider `0x5218220`. The AI controller remains explicitly unsupported; accepting that actor without recovering its simulation would hide the dependency.

Recovered nearest-route selection at `0x46d3c2..0x46d439`. All 4,096 isolated original executions match the recovered output bytes, and a second native execution is identical. Coverage includes empty lists, 1–32 nodes, duplicate coordinates, the initial distance cutoff, signed zero, infinities and NaNs. Native `FCOM` tests C0 alone, so unordered comparisons replace the minimum too; ordinary JavaScript `<` was incorrect in 600 generated cases. Four independently captured live controller entries also match selected pointer, list index and distance bits on the original 603-node route. The three live hooks were restored and the debugger detached.

Evidence: `tests/mcm-ai-route-nearest.test.js`, `ai-route-nearest-wine11.json.br`, `scripts/mcm-reference/ai-route-nearest-oracle.c`, and the deterministic `generateAiRouteNearestCases()` export in `ai-route-nearest-cases.mjs`. The oracle consumes its `input` buffer and emits three DWORDs per case; the fixture contains native outputs, hashes and complete live records. This validates route selection only. Segment choice, steering/throttle generation, AI motion/rider updates and joining the second actor into retained visibility remain open. No preview handling change or full-parity claim.


## Terrain traversal derived from top-level queries (2026-11-15)

The retained terrain-writer replay now requires the original map and computes clipping, recursive node selection, crossing points, visit order and stack depth from each top-level segment. Captured child coordinates, levels, shifts, stack addresses and merged points are assertions only. Five top-level queries derive all 12 visits / 501 compared words in the existing controlled fixture; its five bike frames / four rider ticks still match with zero physics differences and no observed scratch substitution. Negative tests reject altered child coordinates, stack depth, node shift, missing top-level queries, missing maps and changed terrain bounds/scale.

This removes the recursive invocation-input boundary from the previous milestone. Top-level invocation timing, camera/segment endpoints, the caller stack address, other terrain stack stores and continuous world scheduling remain external. The older natural scene divergence and long steering failure are still open. Preview handling is unchanged.

## Terrain-query merged-point stack writer (2026-11-15)

Recovered the completed crossing-array stores in original `0x48e4c0`: its third recursive frame can overlap the caller word later read by bike physics. The `0x40ded0` vector constructors perform no initialization, so shorter later queries preserve unused slots. A controlled native scene query validates 12 splits / 501 float words in the retained interval. Its 29th point writes `1093338000` at `0x22f038`; a later shorter query leaves that value intact. The computed stores feed five bike frames / four rider ticks with zero physics differences and no observed scratch substitutions. Removing terrain writes fails frame 3 (`1063596045` versus `1093338000`).

The fixture deliberately changes one visibility-query segment, then restores both input vectors with readback verification. All 291 hooks are restored and no debugger remains. It proves this writer, not reproduction of the older natural scene divergence or the 400-frame steering failure. Recursive invocation inputs, node metadata, other terrain stack stores, and continuous world scheduling remain boundaries. The repository capture wrapper records natural queries without these diagnostic overrides. Preview handling is unchanged.

Evidence: `tests/mcm-terrain-merged-stores.test.js`, `terrain-merged-world-writers-wine11.json.br`, and `scripts/mcm-reference/capture-terrain-stack.c`.

## Live cache insertion and renderer writes joined (2026-11-15)

A completed 42-frame capture validates 235 computed program selections, two computed pixel-tree insertions, 2,341 pixel-cache comparisons and 3,210 program-cache comparisons. Both misses lead to 16 sampler formats and 32 overlapping saves. The same capture's modeled writes feed 42 bike frames / 41 rider ticks with zero physics differences and zero observed scratch substitutions, including negative steering and two throttle-release frames. All 278 hooks restored and debugger absent. Allocation/GL IDs, initial graphics state, inherited seed producers and full scheduling remain boundaries. The older 400-frame failure and an active `422f50` scene-child writer observed in a separate capture remain unresolved. Preview handling is unchanged. See `mcm-fixed-pixel-recovery.md`.

## Shader cache insertion recovered (2026-11-15)

The intact pinned Wine insertion routine matches 32,768 attempts / 2,129,920 words, including all parent/child links, color flags, roots and 3,087 duplicate keys; native repeat output is identical. This supplies the tree-update mechanism needed after the observed pixel-cache miss. Live integration still needs initial parent/color metadata and explicit allocation/compiled-ID boundaries. The existing strict rejection of unexplained cache changes remains enabled. Full physics parity and the older steering failure remain open; preview handling is unchanged.

## Retained fixed shader caches (2026-11-15)

The vertex and pixel analyzers now initialize each cache once, then compare later snapshots against retained nodes and topology. The five-frame fixture retains six vertex nodes and 4,726 pixel nodes; unexplained mutations to unused nodes are rejected too. Full suite: 627 tests passed. Longer capture has exposed a pixel-cache creation miss at frame 23 and missing formatter callback evidence; neither is silently accepted. Cache creation and the older frame-38 steering failure remain open. Capture tooling now supports an explicit record-count override and buffered diagnostics, with byte-identical isolated I/O validation. Preview handling is unchanged.

## Joined fixed-function program selection (2026-11-15)

The existing five-frame native trace now drives all six program-cache key words from computed fixed-function shader IDs and retained prior selection. All 28 final lookups / 407 comparisons / 28 returned programs match, including 16 retained vertex IDs and 27 subsequent selected-program entries. Initial cache contents and graphics inputs remain boundaries. Unsupported programmable or changed middle-stage paths fail explicitly. This closes a validation-chain boundary, not the older frame-38 steering divergence. See `mcm-fixed-pixel-recovery.md`.

## Pixel descriptor joined to live shader selection — 2026-11-15

The complete fixed-function pixel builder matches 8,192 intact native cases / 1,081,344 bytes, including inherited output bytes. A five-frame trace predicts 28 descriptors, 291 cache comparisons and 28 pixel program IDs. Its 12 computed vertex descriptors also provide 528 bytes of pixel-buffer input. All 257 hooks restored and debugger absent. See `mcm-fixed-pixel-recovery.md`. State producers, remaining seed bytes, cache creation and full scheduling remain boundaries; the older frame-38 failure is open. Preview handling is unchanged.

## Vertex descriptor connected to live cache selection — 2026-11-15

A completed five-frame capture computes all 12 native descriptors, follows 24 cache comparisons and predicts 12 selected vertex IDs in the final program key. Input/descriptor/selected-ID mutations are rejected; all 253 hooks restored and debugger absent. See `mcm-shader-key-recovery.md`. The sample has no creation misses; cache contents, graphics-state production and pixel descriptors remain boundaries. The older steering failure remains open.

## Fixed-function vertex descriptor recovered — 2026-11-15

The intact vertex descriptor builder matches 8,192 native cases / 360,448 bytes, with byte-identical repeat output. This is the fixed-function path observed in early live shader-key frames. Separately, programmable variant scans match 4,096 native cases with shader creation explicitly bounded; these helpers are not observed in the early live sample. See `mcm-shader-key-recovery.md`. Descriptor inputs, pixel descriptor, cache creation and live integration remain open; preview handling is unchanged.

## Shader program cache eligibility recovered — 2026-11-15

The intact six-word comparator matches 4,096 native cases. A completed 42-frame capture predicts all 363 cache lookups / 5,432 comparisons: 362 hits and one miss. Retaining the returned creation explains the next snapshot's growth from 4,032 to 4,033 entries; later snapshots verify membership rather than reseeding it. Only the predicted miss runs sampler setup, with eight sampler formats. All 242 hooks restored and debugger absent. See `mcm-shader-program-cache-recovery.md`. Key production, topology/insertion, allocation and full scheduling remain boundaries; the older steering failure remains open and preview handling is unchanged.

## Sampler mapping producer recovered — 2026-11-15

The intact mapping producer and modern range helper match 4,096 native cases / 12,288 words, including byte truncation, unsigned overflow and the compute-offset equality rule. The binding model now derives its ranges by default. The live null-shader path derives eight formats and validates the returned context-map pointer; deleting a complete format call is rejected. The 42-bike / 41-rider retained comparison remains clean. See `mcm-shader-sampler-map-recovery.md`. Shader-cache scheduling, map/capability state and the old frame-38 steering failure remain open; preview handling is unchanged.

## Live sampler saves joined to world replay — 2026-11-15

The 270-site capture verifies eight sampler-name formats, 24 output callbacks and 16 computed zero saves. Joining them to ordered world writes closes this capture's interval-23 failure: 41 next-bike checks pass, and retained physics matches 42 bike / 41 rider updates with zero modeled physics differences and zero observed scratch substitution. A separate intact sampler-binding oracle matches 4,096 cases, including read timing and format-before-location-query ordering. See `mcm-shader-sampler-format-recovery.md` and `mcm-shader-sampler-bindings-recovery.md`. Shader-cache scheduling, mapping production and the older frame-38 steering failure remain open; preview handling is unchanged.

## Sampler formatter stack save recovered in isolation — 2026-11-15

The pinned sampler-name formatter now has a computed register-save address/value model matching 480 intact native cases across four stack alignments, three prefixes and unsigned indices through ffffffff; repeat output is byte-identical. Its predicted save lands on the original physics input slot at the observed alignment. Live path confirmation, shader eligibility and continuous writer ordering remain outstanding. See `mcm-shader-sampler-format-recovery.md`. No preview handling change or full parity claim.

## Program-selection nested writers isolated — 2026-11-15

A completed 519-site capture reproduces two overwrite sequences among 8,236 indexed windows: the `e1460` call leaves the C-runtime memcpy return address, then `ec5e0` writes zero. Both sequences are preserved in a regression fixture, and cleanup verifies all hooks restored with no debugger. Sampler-name formatting is the next candidate to validate; the exact zero instruction, eligibility and continuous scheduling remain unresolved. See `mcm-indexed-submit-recovery.md`. Preview handling is unchanged.

## Shader program-selection overwrite isolated — 2026-11-15

A completed 232-site trace checks 8,338 indexed draws and isolates one zero overwrite to the program-selection call `dc5fc → d3120`. All hooks were restored and debugger detachment verified. Later world writers replace this value in this sample, so its next-bike checks pass; older failing fixtures remain unresolved. The exact internal store and eligibility are the next tracing target. Dense renderer observations now refresh the capture watchdog, preventing a false inactivity stop. See `mcm-indexed-submit-recovery.md`. Preview handling is unchanged.

## Indexed submission eligibility recovered — 2026-11-15

The gate leading into the unresolved indexed-draw window now matches 4,096 isolated native cases / 57,344 words. It preserves index-buffer eligibility, argument order, retained state-pointer timing and the separate immediate-context checks around lock/emission/unlock. A deeper trace reproduces two zero overwrites among 8,256 indexed draws, isolating both to the shader-state callback reached at backend `62a4f`. The exact store and its eligibility remain unresolved; the negative fixture still rejects interval 22. The backend and continuous scheduling remain external. See `mcm-indexed-submit-recovery.md`. This does not close the intermittent overwrite or change preview handling.

## Copy saves joined; indexed-draw overwrite exposed — 2026-11-15

The ordered writer diagnostic now validates and incorporates computed host-copy register saves. A fresh 42-frame trace checks 1,874 such calls and matches the first eight next-bike intervals. Interval 8 then exposes a later zero overwrite inside the indexed-draw/mutex-return window, after the last modeled matrix write. The exact negative result is retained, not injected as an input. All 176 hooks restored and debugger absent. See `mcm-upload-copy-recovery.md`. The previous pointer-carry mismatch and older steering failure remain open; preview handling is unchanged.

## Scene traversal and an additional stack writer — 2026-11-15

Recovered original child traversal (4,681 native cases / 84,258 words), retained scene hierarchy, and actor-wrapper scheduling from the world entry. The short scene sample checks 198 callback entries/returns and six actor application addresses. Unknown callback bodies remain boundaries. See `mcm-scene-traversal-recovery.md`.

A longer combined trace exposes another unresolved carry: predicted heap handle `00110000`, actual pointer `0022f0b8`. The negative fixture preserves that failure. Traced the host upload memcpy register-save mechanism: 612 isolated native cases and 194 live copy calls match computed save addresses/values. Integration into ordered world writes is next; neither this trace nor the older frame-38 mismatch is closed. See `mcm-upload-copy-recovery.md`. Preview handling remains unchanged.

## Actor graphics stack addresses derived — 2026-11-15

The indexed-draw call path now computes all 52 actor state-application ESP values in the combined capture. The recovered child traversal also computes 82 nested wrapper positions from 82 root boundaries. A separate six-application native call-stack capture verifies the intermediate Wine frame pointers and return addresses. The same 41 computed next-bike writes and 42-frame physics replay still match; captured actor application ESP is now only a comparison output. See `mcm-indexed-draw-stack-recovery.md`.

Root wrappers and 8,334 non-actor application stack positions remain boundaries, alongside invocation order, prepared graphics state, camera/font/allocator inputs. The old frame-38 failure remains open; preview handling is unchanged.

## Computed world writes connected to retained physics — 2026-11-15

The combined 42-frame capture now predicts all 41 next-bike scratch values from ordered invocation/stage inputs. HUD refresh/line stores, SSE gates/values, binding gates/CALL writes and resource staging/heap writes are checked together. An explicit modeled-world replay applies the computed stores between updates: 42 bike frames / 41 rider ticks, zero modeled physics differences, 881,090 visual differences, zero observed scratch inputs. Negative tests reject altered observations and missing player invocations. See `mcm-world-writers-recovery.md`.

Draw ordering, stack positions, prepared graphics state, camera/font/allocator boundaries remain inputs. This does not close the older frame-38 failure or prove sustained throttle-release parity; the capture contains only two released-throttle frames. The next integration is recovered invocation scheduling and retained graphics state. Preview handling remains unchanged.

## Binding gates connected to stack writes — 2026-11-15

Recovered the original shader-disable gate subgraph, with generated-shader paths exposed as unmodeled boundaries. An isolated native oracle matches 4,096 cases / 32,768 words, covering all 128 dirty/shader/declaration/adapter combinations. In the five-frame live capture, prepared state inputs predict all 36 commands across 871 applications. State-application entry ESP now predicts producer/handler ESP and all 36 CALL-store addresses, including four bike scratch overlaps. Actual handler locations and store values are comparison outputs, not model inputs. All 174 observation sites restored; debugger absent. See `mcm-render-binding-gates-recovery.md`.

This is progress toward ordered world-write prediction, not full physics parity. Continuous state preparation, other binding producer paths and the old frame-38 mismatch remain open. Preview handling is unchanged by this milestone.

Retained visibility connection: [42-frame physics-to-culling regression](mcm-moving-visibility-recovery.md), 82 computed bike/rider visibility decisions and 24 SSE values match. Camera/world matrices remain stage inputs; one later-writer interval and all visual differences are preserved. Full world ordering and the older frame-38 failure remain open.

Binding CALL writes: [return-address store recovered and live-validated](mcm-render-binding-recovery.md), 4,096 native cases / 45,056 words and 38 live handlers including four bike-slot overlaps. Producer eligibility and final world ordering remain open; preview handling is unchanged.

Exact HUD writer: [USER32 measured-line store identified and validated](mcm-hud-line-store-recovery.md), 4,096 native cases / 20,480 words and six live instruction-level triplets with zero differences. HUD scheduling, layout inputs and later world writes still need joining to retained physics; the frame-38 failure remains open.

Upload backend effects: [register heaps recovered and live-validated](mcm-render-register-heap-recovery.md), 2,048 intact native command-chain cases / 3,950,592 output words plus 192 live transitions with zero differences. Whole-world ordering and the frame-38 mismatch remain open; preview handling is unchanged.

Upload follow-up dispatch: [command 33 recovered](mcm-render-upload-invalidation-recovery.md), 4,096 isolated native cases / 49,152 output words with zero differences. Live backend callbacks are identified; their effects and whole-world ordering remain open. Preview handling is unchanged.

State upload resource selection: [cached/created resources and follow-up commands recovered](mcm-render-resource-upload-recovery.md), 4,096 isolated cases and 192 live upload-to-heap-store chains with zero differences. The subsequent command handler, resource lifecycle and world ordering remain open; preview handling is unchanged.

Resource staging: [sizing through actual cleanup memory writes recovered](mcm-render-staging-recovery.md), 4,096 isolated map cases and 222 live resource-to-heap-store chains with zero differences. Allocation addresses and heap handle remain environment inputs. State-upload resource setup, submission policy and world scheduling remain open; preview handling is unchanged.

Update command and cleanup: [producer serialization and free predicate recovered](mcm-render-command-recovery.md), 4,096 isolated cases and 191 live commands with zero differences. Per-thread debugger step tracking fixes the observed concurrent-hook crash. Resource staging/allocation and full scratch scheduling remain open; preview handling is unchanged.

Auxiliary upload gates: [three later families recovered](mcm-render-auxiliary-uploads-recovery.md), 871 native applications / 44 uploads with zero gate, order or descriptor differences. The 256-byte branch has static coverage only. Payloads, other upload families and free conditions remain open; follow-up capture single-step exits also require diagnosis.

Viewport upload arithmetic: [pinned SSE matrix recovered](mcm-render-upload-recovery.md#viewport-matrix-arithmetic), 14,096 isolated native cases / 225,536 output words plus 12 live uploads / 192 words with zero differences. Other upload/free gates and shared-world scheduling remain unvalidated; preview handling is unchanged.

Transform-upload gate: [both vertex paths recovered](mcm-render-upload-recovery.md), 868 native applications / 16 uploads / 852 skips with zero gate or source-address differences. Other uploads, frees and world visibility remain open.

Latest renderer-scratch finding: [particle cleanup heap store](mcm-render-heap-recovery.md). The exact ntdll store, derived stack address and next-bike-frame carry are verified for four frees in one draw. Upload/visibility gates and the older frame-38 divergence remain unresolved; preview handling is unchanged.

Latest milestone: [moving render capture](mcm-moving-render-recovery.md). One controlled 400-frame negative-steering run matches retained bike/rider source fields both at update return (17,600 words) and actual drawing (17,556 words). All modeled physics comparisons pass in this new starting state. The older frame-38 failure remains open. The same run exposes 59 scratch changes after the final observed renderer store and 10 frames with multiple stores; the idle last-writer result cannot be generalized. Shared-world/particle mismatches remain reported.

Previous milestone: [retained wrapper sources](mcm-render-sources-recovery.md). The draw wrapper reads **local +0x84**, not cached world +0xc4. Recovered local matrices and animation bounds match 400 positive-steering bike samples plus one rider sample (8,822 words). Negative steering still produces 12 matrix-word differences at frame 38. This is update-return source coverage, not a joined moving render replay.

Previous milestone: [wrapper matrix product](mcm-wrapper-product-recovery.md). All 8,192 native cases / 131,072 words match. A fresh live trace computes 236 wrapper matrices from recovered camera state, then all 240 bounds decisions, 59 rider stack writes and 58 following bike-entry checks. Four startup products are explicitly counted as warmup. Stored node-local matrices, animated bounds producers, remaining draw scheduling and frame-38 steering are still open. Preview handling is unchanged.

Previous milestone: [projected screen bounds](mcm-projected-bounds-recovery.md). All 8,192 intact native cases / 311,296 words match. The live chain now computes all 240 bounds decisions before rider dispatch; matrix/bounds producers and the remaining draw stack are still open, as is frame-38 steering.

Previous milestone: [player-rider draw dispatch](mcm-node-draw-recovery.md). All 625 native dispatcher cases match. A fresh trace links 59 stack stores to the player rider, verifies 120 recursive child depths and 118 computed camera visibility states. Projected-bounds arithmetic, the remaining draw stack and steering replay are still open.

Previous milestone: [retained renderer dirty state](mcm-render-dirty-recovery.md) predicts 286 products and 4,507 skips across 4,793 apply calls, including all 59 physics-stack overlaps. Original draw scheduling and the frame-38 mismatch remain open.

Previous milestone: [fog restoration and original model world submissions](mcm-render-gates-recovery.md). Native 4,096 cases / 274,432 words match; live 59 render-to-next-update restorations and 59 derived-world scratch products match. Draw scheduling and the frame-38 steering divergence remain open.

## Computed camera reaches the exact physics-stack renderer write

Submission-time clip reset matches **4,096 native cases / 274,432 words**. A fresh neutral-input capture bridges the recovered camera to **59 view/projection submission pairs, 59 pinned Wine products, 59 exact writes to player scratch `0x22f038`, and 58 following bike-entry values**. No observed camera matrix or scratch output is supplied to the calculation. This captured path uses an identity world transform and no surface clears; the analyzer rejects other states. All 22 hooks were restored and detachment verified. See `mcm-camera-submission-recovery.md` and validation report.

Submission resets far clipping from the observed 768 to original default 100000, then rebuilds projection. The later restoration is now covered by the fog milestone above; the render/world/HUD/AI schedule remains open. Next connect those gates and replay controlled negative steering without observed scratch. The known frame-38 mismatch and full parity remain unresolved; preview handling is unchanged.

## Camera matrices connected to the retained live chain

Complete original `0x47a670` matrix arithmetic matches **4,096 cases / 266,240 words**, including zero-FOV exceptional outputs. A fresh 60-frame camera-left-held capture matches all four matrices and screen scale (3,900 additional words) from the recovered pose/FOV, with matrix state retained between frames. All fourteen hooks were restored and detachment verified. See `mcm-camera-matrices-recovery.md` and validation report.

Next trace matrix submission/cache gates and renderer stack-writer ordering, then retry the frame-38 steering divergence without observed scratch inputs. Mode/FOV/viewport transitions and whole-world parity remain open. Preview handling is unchanged.

## FOV filter and live refresh-counter continuity recovered

The original seventh filter, FOV setter and update-counter prefix match **4,096 cases / 32,768 words**. A fresh 60-frame camera-left-held capture extends the camera chain through FOV and update return, now retaining the refresh counter without per-frame telemetry reseeding. All fourteen hooks were restored and detachment verified. Mode-transition/FOV controls and remaining camera/view updates are still outside this coverage; the analyzer rejects control-state changes. See `mcm-chase-fov-recovery.md` and its validation report. Preview handling is unchanged; full physics parity remains open.

## Final camera pose and bike/rider node fields recovered

Original finalization matches **2,048 cases / 63,488 words**. A fresh 60-frame capture matches computed eye/target through the final native pose, roll and node fields (1,860 additional words), with pose/flags/nodes retained between frames. **Refresh-counter continuity remains outside this claim**: the analyzer explicitly supplies that counter at source entry because the later camera update and FOV setter also write it. All eleven hooks were restored and debugger detachment verified. See `mcm-chase-finalize-recovery.md` and validation report.

Next: mode transitions, seventh-filter FOV, full camera update and renderer scheduling, then resolve the frame-38 steering discrepancy. Preview handling is unchanged.

## Camera bounds and terrain clearance recovered (2026-11-15)

The retained camera validation now reaches `0x47d945`: original world bounds, an intact native terrain query, ground clearance, negative-pitch correction and scene-specific height caps. **8,192 course cases / 49,152 words match** across Canyon and Dunes, including corrective branches. A fresh 60-frame capture also matches all ground-query and clearance outputs with retained controller state. Live coverage is the ordinary world gate with no correction; special/corrective branches remain isolated-oracle coverage. All ten hooks were restored and debugger detachment verified. See `mcm-chase-clearance-validation.json` and recovery notes.

Next: active-camera pose/roll and bike/rider visibility, final setters, view/render scheduling and the frame-38 steering mismatch. Preview handling is unchanged.

## Post-smoothing reset and overrides recovered (2026-11-15)

The retained camera path now extends through `0x47d71f`. Mode-6 transitions reset all six filter values/times while preserving bounds; the override flag selects raw eye/target values with the original previous-target exception. **864 native cases / 27,648 words match.** A fresh 60-frame nine-boundary capture matches **720 spatial, 3,120 downstream and 1,920 post-block words** with state retained between frames. Live coverage is pass-through only; reset/override branches are isolated-oracle coverage. All nine hooks were restored and debugger detachment verified. See `mcm-chase-post-smoothing-validation.json` and its recovery notes.

World bounds, terrain clearance, final camera/view/render ordering and the frame-38 negative-steering mismatch remain open. Preview handling is unchanged.

## Joined initialized chase controller (2026-11-15)

Source, backup restoration, the pre-input yaw gate, base, controls, heading and smoothing now run as one retained production controller. A fresh entry oracle matches **2,560 cases / 15,360 words**. Previously collected held-left captures (legacy `idle`/`pulse` labels) match **190 frames / 9,880 downstream words / 2,280 spatial words**, including a within-frame yaw threshold crossing that verifies gate-before-controls ordering. Camera/filter/target state is retained rather than reseeded per control entry. See `mcm-chase-controller-validation.json` and `mcm-chase-controller-recovery.md`.

First initialization, alternate paths, post-smoothing/view/render ordering and the known negative-steering scratch mismatch remain open. This milestone does not change preview handling or establish whole-world parity.

## Original terrain textures connected (2026-11-15)

All 33 maps now use original indexed terrain textures on coarse ground and dense sand surfaces. Visual inspection exposed and corrected the file layout: all base images precede all half-size images. The original loader confirms this grouping. All 507 tests and public desktop/touch checks passed for the shipped texture milestone. Scenery, scene lighting, exact starts, renderer fidelity and rider weld processing remain open in `mcm-assets-port-status.md`.

## Original terrain and rider preview milestone (2026-11-14)

The preview now offers **33 original terrain files, 12 rider skins and 12 bike liveries**. The original 7-part bike and 15-part rider meshes bind to the recovered articulated component graph without mutating physics transforms or cache flags. Imported terrains preserve physical banks, hierarchy, normals and scale. Non-dunes selections use recovered reset alignment at a central practice spawn, the original course-type event value, and the scene's declared shadow-light target.

All 33 terrains passed 30-frame acceleration startup checks; desktop/touch selector and control checks passed. The full suite passed 504 tests; focused asset tests passed after the course-type connection. This is not a complete scene or physics port: terrain texture placement, scenery, original race layouts/starts, welded rider vertices and whole-world native comparisons remain. See `mcm-assets-port-status.md` for the asset tally and `mcm-original-assets-validation.json` for this milestone's evidence. User-requested map/rider work remains active alongside physics parity.

## Normal chase input controls recovered (2026-11-14)

Original `0x47b52a..0x47c30c` now has a recovered control step for normal chase modes, including inactive-camera handling, modes 3/6 reset flags, keyboard pitch/yaw/distance controls, joystick POV and modifier-gated buttons, native angle limits/wrapping and the camera-field/109 multiplier. Fixed-target mode 5 and free-camera controls explicitly remain unsupported.

The native oracle executes the original keyboard, POV and button readers without return-value shims. **8,192 cases / 32,768 retained control updates match all 196,608 words**, covering seven modes, all 256 eight-key combinations, radius thresholds, five timestep values, joystick availability/POV values, button states and modifier gates. These retained histories execute the control block alone, not intervening downstream camera updates.

Live idle capture matches **40 updates / 240 words**. A separate one-second OS camera-key pulse matches **160 updates / 960 words**, including **111 updates with changed camera angles**, key-up and key-down frames. The key was released, both original instructions restored, and debugger detachment verified. Live coverage is mode 0 without a joystick; each live control entry supplies current state, so this does not prove full-controller retention. See `mcm-chase-controls-validation.json`.

Next: connect initialization/backup restoration and these controls to the retained spatial/heading chain, then complete the view/render scratch-writer sequence. Input polling, alternate camera paths, world scheduling and the negative-steering dependency remain open. Preview handling is unchanged.

## Source and base construction bridged into retained camera state (2026-11-14)

Original source selection/normalization at `0x47b107..0x47b1fe` and base prediction at `0x47b452..0x47b4e5` now have recovered helpers. Source preserves the signed speed-bit threshold, velocity sign gate and zero-vector fallback. Base preserves the signed timestep clamp, previous-target branch and different X/Y/Z rounding boundaries. Isolated native execution matches **3,072/3,072 source words across 768 cases** and **6,144/6,144 base words across 1,536 cases**.

A six-boundary live capture checks both computed values at their native exits and again at heading entry in the same frame, then feeds those computed values into the retained heading chain. **30 frames match 360 spatial words and 1,560 downstream words**. The previous computed target persists and matches all 29 later base entries. Regression checks reject corrupted boundary outputs, reordered or missing stages, and changed retained target/filter state. All six original instructions were restored and debugger detachment verified. See `mcm-chase-spatial-validation.json`.

This bridges separated blocks; intervening initialization, backup restoration and camera input controls remain unmodeled. Raw bike direction/velocity/node position still come from observations, and live coverage is mode 0 only. Whole-world scheduling, alternate camera branches and the negative-steering scratch mismatch remain open. Preview handling is unchanged. Next: recover the intervening controller gates and multiplier before claiming a continuous retained camera controller.

## Heading and enable gates connected through actual active dispatch (2026-11-14)

Original `0x47c30c..0x47c3e6` now derives angle, heading and enable from camera yaw, bike/controller fields, rider conditions and multiplier. The dispatcher preserves fixed-target, alternate-eye and rider-position branches; those remain unrecovered and are rejected instead of silently using active chase. Mode 4's original camera-settings writes are retained.

Direct native comparison matches **6,144/6,144 words across 2,048 gate combinations**. The actual native active path from `0x47c30c` through `0x47d606` matches **508,032/508,032 words across 10,368 updates**, covering modes 0/1/2/4/6/7 with enable true, including 288 resets. No intermediate branch jumps are patched. A live mode-0 capture matches **80 updates / 4,160 words**, retaining camera, settings, axis and filters. Corrupting captured heading/angle/enable locals does not affect the comparison. See `mcm-chase-heading-validation.json`.

This establishes active dispatch, not alternate-mode parity or full controller reachability. Earlier source/base/control construction and multiplier remain supplied; whole-world scheduling, alternate branches, terrain/camera collision and the negative-steering scratch dependency remain open. Preview handling is unchanged.

## Velocity-derived camera factor recovered (2026-11-14)

Original `0x47c685..0x47c7d2` now computes the camera target-distance factor from velocity projection, camera angles/radius, control gate, original denominators and the upstream multiplier. The factor is computed before the retained active-eye/reset/offset/smoothing chain; the captured factor is no longer consumed.

A direct native boundary oracle matches **3,840/3,840 words across 1,280 cases**, including ±5 speed boundaries and adjacent floats, zero/negative denominators, signed zero, clamp conditions and **281 invalid-result words with exact native NaN bits**. Direct outputs prevent downstream bypass branches from hiding factor differences. The combined chain matches **622,080/622,080 words across 13,824 updates**, and the live mode-0 path matches **80 updates / 3,760 words**. Tests deliberately corrupt the captured factor to verify it is ignored, and reject changes to the actual upstream multiplier. See `mcm-chase-factor-validation.json`.

Earlier heading/source/base/control construction and whole-world camera scheduling remain supplied or unmodeled. Alternate paths, runtime exceptional/trig coverage, terrain/camera collision and scratch-writer ordering remain incomplete. Preview handling and the negative-steering mismatch are unchanged.

## Active eye construction and filter-reset gates joined (2026-11-14)

The active path from `0x47c7d2` now computes eye position from two runtime rotations and base/distance, applies eye-filter reset gates, updates camera state, then enters the validated offset/target/smoothing chain through `0x47d606`. It preserves the signed integer speed-bit comparison, strict coordinate-distance thresholds, reset flag behavior, crash scaling, and mode-6 camera-update bypass.

An isolated native oracle matches **622,080/622,080 words across 13,824 retained updates in 3,456 cases**, including **384 filter resets**. Cases cross eight modes, three actor types, both control gates, reset/crash states, three speed patterns and three eye geometries. A live capture matches **80 updates / 3,760 words**, retaining and checking camera state, axis and filters between entries. This live mode-0 sequence has no resets; reset evidence comes from isolated native execution. All hooks were restored and debugger detachment passed. See `mcm-chase-active-validation.json`.

Earlier source/base/heading/control construction and alternate eye paths remain supplied or unmodeled. Full controller reachability, live reset transitions, terrain/camera collision and the negative-steering scratch dependency remain unresolved. No preview handling change is claimed.

## Offset-to-smoothing controller chain recovered (2026-11-14)

Original `0x47d166..0x47d606` now joins offset rotation, target construction, filter initialization and retained smoothing. Mode 3 adds the original bank rotation. Mode 5 and the disabled gate preserve the upstream target and bypass construction. The shared mutable axis is retained; its original initializer `0x47e310` establishes `[0, 1, 0]`.

A native oracle matches **256,000/256,000 words across 6,400 updates in 640 cases**, covering eight modes, four actor types, both initialization states, both gate states and five timestep groups. This includes 2,800 active and 3,600 bypass updates. A guarded live capture matches **80 consecutive updates / 3,120 words**, including computed targets, shared axis, records and smoothed outputs. Filters and axis are seeded once; subsequent native entries must equal retained state. The live case only covers mode 0 and existing filters. Probe restoration and debugger detachment passed. See `mcm-chase-offset-validation.json`.

Earlier source/base/eye/angle/factor/distance construction, terrain/camera collision, live branch transitions and whole-controller evolution remain. The known negative-steering scratch mismatch is still open; this milestone does not change preview handling.

## Runtime camera-offset rotation recovered (2026-11-14)

The upstream camera call `0x4bcb90` resolves through IAT `0x5278b8` to the pinned `d3drm.dll` export `D3DRMVectorRotate` (RVA `0x1fd0`). Its 416 loaded instruction bytes match the pinned DLL after relocation. This routine normalizes the caller's axis in place, performs two float32 quaternion products, and normalizes the result; zero-length normalization returns `[1, 0, 0]`. It is distinct from the game's x87 matrix rotation.

The recovered helper matches **9,216/9,216 native words across 1,024 cases**, including mutated axis and unchanged source vector, zero vectors/axes, scales from `1e-4` to `1e4`, and finite angles up to 500,000 radians in magnitude. General trig-library equivalence, exceptional inputs, caller gates and retained upstream controller evolution remain unproven. Next: connect `0x47d166..0x47d211`, preserving mode-5/null gates and mode-3 bank rotation. Preview handling and the negative-steering mismatch remain unchanged. Evidence: `mcm-runtime-vector-rotation-validation.json`.

## Chase target preparation and initialization recovered (2026-11-14)

Original `0x47d211..0x47d477` now constructs the target with the original float32 stores, mode-6 scale, vertical offset, and actor-dependent six-filter initialization. A full cross-product of eight modes, four actor types, initialized/uninitialized records, and five timestep groups matches **9,920/9,920 native words across 320 cases**. Running preparation and smoothing together through `0x47d606`, retaining records between steps, matches **118,400/118,400 words across 3,200 updates**.

A guarded two-breakpoint capture of the running original matches **80 consecutive updates / 2,880 words**, including computed targets and retained filter outputs, with 480 short-timestep component updates and two actual gradual changes. The live case covers existing filters, mode 0 and actor type 3; initialization is verified by isolated native execution. All hooks were restored and debugger detachment checked. See `mcm-chase-preparation-validation.json`.

Earlier base/offset/eye/factor construction, distance evolution, terrain/camera collision and controller gates still use supplied native inputs. The next step is to recover those upstream dependencies and retain the controller through the validated camera-to-renderer path. This does **not** close the negative-steering scratch-lifetime mismatch or change preview handling.

## Retained chase-camera smoothing recovered (2026-11-14)

Original `0x47d477..0x47d606` now updates the six persistent camera filters with the original comparison, division, addition order, and float32 stores. The upper/lower fields are preserved but are not clamps in this block. An isolated native oracle matches **124,800/124,800 words across 4,160 updates in 192 cases**, including repeated histories, short/negative/zero timesteps, zero/negative time constants, and signed invalid-result NaNs. Float32 record storage is required: ordinary JavaScript arrays can canonicalize a negative NaN during representation changes.

A two-breakpoint live probe reduces timing overhead. Retaining the filters from a single initialization matches **40 idle updates / 1,200 words**, then **160 updates / 4,800 words** in a separate synchronized OS throttle-pulse capture. All live updates have timesteps below their filter time constants; the latter includes six actual gradual component changes. This is filter-stage validation with supplied targets/deltas, **not whole-bike acceleration parity or retained chase-controller input construction**. The earlier unsynchronized pulse attempt had no moving values and is not counted as motion validation. Upstream eye/target construction, terrain/camera collision, mode gates, and initialization remain. No preview handling change or closure of negative steering is claimed. See `mcm-chase-smoothing-validation.json`.

## Camera target-point update recovered (2026-11-14)

Original `0x47a3d0` now derives camera forward/up from eye and target, preserving the exact-equality early return, vertical-direction special case, original inverse-square-root normalization, validity flags, and refresh-counter wraparound. An isolated full-function oracle with immediate-mode camera state matches **14,000/14,000 words across 1,000 cases**, including 100 unchanged-target cases. The original setter's audio-listener globals and nonzero `camera+0x140` retained-mode forwarding remain outside the modeled output.

A native ten-frame trace verifies the chase camera's actual virtual target resolves to this routine. **Nine calls / 126 words** match, and their computed values feed **54 subsequent views / 864 words**. The same capture validates nine view submissions and 27 downstream renderer products (432 words); leading observations without initialized provenance are counted separately. Thus the target-to-view-to-renderer expression path is validated with observed chase inputs. **Eye position, roll, and target points still come from native observations, not a retained chase-controller implementation.** The next source is original chase routine `0x47b0c0`, which supplies the eye/roll setter at `0x47d9dd` and target call at `0x47d9f1`. No preview handling change or closure of the negative-steering mismatch is claimed. See `mcm-camera-target-validation.json`.

## Original camera matrix expression recovered (2026-11-14)

Original `0x475760` is now recovered separately from the renderer's SSE multiply. Its input is **ten** floats: eye, forward, up, and roll. The original independently normalizes forward/up with its table inverse-square-root, keeps their cross product unscaled, and optionally composes a roll rotation using x87 operation order. An isolated oracle executes the full original function and matches **15,856/15,856 words across 991 cases**, including signed-zero roll, parallel/zero vectors, broad direction magnitudes, and large finite roll angles.

A ten-frame native capture validates **56 view calculations / 896 words**, then retains their computed outputs through **nine actual view submissions** and **41 renderer products / 656 words**. Three leading products precede a reconstructed view and are explicitly excluded. This connects the recovered expression to the actual rendering path, but **the camera inputs and world setters remain observed inputs**. The camera controller, render ordering/gates, and other stack writers still need retention before the negative-steering mismatch can be closed. Preview handling is unchanged. See `mcm-view-matrix-validation.json` and the native fixture; all probe instructions were restored and debugger detachment verified.

## Stateblock matrix expression recovered (2026-11-14)

The final float writer in the observed third indexed draw is now identified: Wine `wined3d` RVA `0xc308b`, `movhps %xmm4,0x8(%eax)`. Stateblock application calls helper RVA `0x7f5a0`, which multiplies the matrices at state offsets `0x2c94` and `0x6c14` into its local array. Output word 2 overlaps player scratch `0x22f038`. A ten-frame capture contains 30 products; the recovered SSE arithmetic matches **480/480 output words** from the input matrices. Nine initialized overlapping stores were observed immediately before/after the instruction and remained unchanged through their original draw returns. Frame zero had no identified player scratch and is not counted as an overlapping-store observation.

This closes the instruction/expression question for that path, superseding the unknown-final-writer statement in the preceding milestone. The matrix routine is kept separate from the original game's x87 composer because SSE rounds each operation to binary32. It is **not connected to retained physics yet**: the original transform state, render gates, ordering, and other writers must be derived from retained world state first. The negative-steering mismatch remains. No recorded outputs are injected and preview handling is unchanged. Evidence: `mcm-stateblock-product-validation.json`; raw matrices, store boundaries, and output words are retained in the regression fixture.

## Draw inputs and Wine stateblock boundary (2026-11-14)

Captured 60 indexed draws with complete vertex/index arrays: the observed batches contain 12/24, 280/894, and 247/738 vertices/indices. The retained scratch word never matches an aligned input vertex word. A separate version-guarded capture resolves `DDRAW!DrawIndexedPrimitive` through Wine's device wrappers to `wined3d_device_apply_stateblock`; all 12 initialized calls change the word across stateblock application. The first uninitialized capture prefix is explicitly excluded. All indices, stack cleanup and caller identities are validated.

The stateblock function reserves a large local stack frame that overlaps the bike's reused slot. A candidate direct store writes an intermediate integer 1; the final retained float is still not attributed to an instruction or input expression. An earlier intermediate probe also observed one later indexed-submission write, so stateblock application must not be treated as the only possible writer. The next target is the final local writer and the stateblock inputs/gates. No observed scratch is injected; negative steering remains mismatched. See `mcm-draw-stateblock-validation.json` and the archived intermediate probes.

## Safe renderer call capture (2026-11-14)

The failed deep probe was reproduced in an isolated process: single-stepping a direct x86 `CALL` under this host's Wine 11 decrements ESP by eight bytes instead of four, displacing the matrix-copy argument. The same uninstrumented copy passes; indirect-call and preceding-MOV hooks each pass 100 copies. New renderer probes reject direct-call hooks, and the old unvalidated force probe now refuses its unsupported hook before attaching. Do not compensate by editing the game's stack.

A corrected native capture using adjacent non-CALL instructions completes 20 frames. Its 80 matrix reads, 80 transform calls, and 80 visibility calls preserve the watched slot; all 40 calls through `0x44ff5f -> 0x4465b0` change it. Recursive rendering propagates these writes. The exact internal draw writer and render gates remain to be recovered. `mcm-render-matrix-validation.json` preserves the capture, debugger controls, and clean-detachment evidence. This does not change the negative-steering mismatch or preview physics.

## Renderer caller-stack writes (2026-11-14)

The follow-up capture identifies `0x467fc8 -> 0x467a90` after world updates as another real writer to the reused bike slot: all 40 observed calls changed it. Inside that call, `0x467c55 -> 0x4206c0` traverses rendering children through `0x4206f6`. A detailed capture validates 19 complete frames and 1,292 paired child calls; changed leaf calls include `0x446220`, `0x44faf0`, `0x43b3a0`, and `0x422f50`. Instrumentation changes timing and active render paths: the outer capture retained float-like words while the detailed capture ended with integer/pointer-like words. Neither a HUD-only zero reset nor one constant renderer value is supported. The next step is recovering the internal writing instructions and their native render gates, then capturing the same dependencies with controlled negative steering. See `mcm-render-stack-validation.json`. These are observed dependencies, not integrated physics fixes.

## Ordered world stack capture (2026-11-14)

A combined native capture now records true bike function entry, pre-scheduler and exit boundaries for player/AI, HUD clock updates, and DrawText calls. Across 200 updates, the retained HUD clock matches 1,200 words and predicts all ten refreshes (20 drawing calls, six nonzero scratch clears). All 199 observed HUD-to-next-player intervals overwrite the scratch word again before true bike entry; the bike prologue itself preserves it in this sample. Therefore a HUD-only reset would not reproduce this live session. The next target is the caller interval between HUD completion and player function entry. This is evidence capture, not a fix for the negative-steering mismatch or full parity. See `mcm-world-stack-order-validation.json`; two regression tests validate the native sequence and reject incomplete/contradictory captures.

Written November 12, 2026, against the current Dust Valley implementation.

## Current tally — November 14, 2026

This section is the current status. The original planning checkboxes and dated entries below are historical evidence, not a current completion tally. Update this section when a milestone changes the connected path or its validation boundary. A routine is not finished merely because it has been translated: distinguish isolated native checks, connected replay, and playable-preview integration. Do not re-port validated routines without a failing case or new branch evidence.

**Planning estimate: approximately 60% overall, with roughly ±15 percentage points of uncertainty.** This is an engineering estimate of remaining work, not measured simulation equivalence or a percentage of native instructions. Core recovery is farther along than continuous validation and preview integration. Finite passing fixtures do not establish 100% equivalence.

| Workstream | Current state | Remaining exit condition |
|---|---|---|
| Runnable reference and telemetry | Done for the pinned original installation: Wine gameplay, player identification, deterministic inputs, raw state capture, oracle harness | Preserve evidence and extend capture dependencies when a new branch requires them |
| Numeric and geometry foundations | Substantial native-validated coverage: original float behavior, math, transforms, terrain traversal and contact queries | Validate additional branches exposed by new scenarios |
| Bike update core | Engine/drivetrain, suspension, tire/contact forces, braking, controls, integration, collisions and frame-end paths recovered and tested; connected original frame return exists | Retain all required shared state across long real riding histories |
| Separate rider/crash path | Crash animation, terrain probes, first ground transition and free-rider ground motion shipped. Active particles, crossfade, airborne completion and settled contact-animation ticks are native-validated and shipped | Recovery pair/callback restoration now connected and live-validated; broader crash and interaction scenarios remain |
| Continuous original comparison | Five 400-call histories now cover delayed throttle, immediate-throttle crash/recovery, upright short-pulse release, upright braking and positive steering. Opposite steering retains an explicit frame-38 failure. All visual/pool differences remain reported | Upright short-pulse acceleration/coast-down and brake application/release now covered; add steering/jump and broader brake histories and shared-world scheduling/effects without injecting observed state |
| Scenario coverage | Isolated and live fixtures exist; 458 regression tests including steering and an explicit caller-scratch boundary | Steering/braking/jumps/landing/crash/reset, other-rider/obstacle interactions, all intended bike/settings/terrain cases |
| Playable MCM preview | Connected recovered bike/rider/pool runtime drives the site preview on original dunes terrain; desktop and touch acceptance passes; optional sand modifies native terrain samples | Broader riding stability, native rider animation rendering, shared-world/AI state and known steering scratch lifetime remain incomplete |
| Shipping | Validated milestones pushed to main; reference, retained-rider, ground-contact and free-rider deployments succeeded | Continue tests/build/deployment verification for each milestone |

**Next queue (in order):** resolve the native caller-stack lifetime exposed by opposite steering (see below); expand controlled steering/braking/jump and interaction scenarios; connect remaining shared-world updates and close branch/settings/scenario gaps; integrate the validated core into preview and repeat the same acceptance traces there. Shared-world state may expose further dependencies, so this is not a claim that every remaining routine is already enumerated.

Recent evidence: [complete retained crash-and-release history](mcm-live-retained-rider-release-validation.json), [retained rider prefix](mcm-live-retained-rider-prefix-validation.json), [ground transition](mcm-live-rider-ground-transition-validation.json), [free-rider motion](mcm-live-free-rider-tick-validation.json). Active rider particles match 160 native cases (2,782,560 words); complete live ticks 121 and 122 each match 283,386 words after correcting premature rounding of horizontal drag.

### Connected playable preview — November 14

The site now selects `recovered-core` when MCM preview starts, in both Free Ride and the circuit. It initializes from the accepted steering checkpoint, uses the complete original dunes physics terrain, and advances recovered bike, rider and shared particle routines. Cannon does not advance the preview bike. Controls, a metres/feet coordinate adapter, wheel transforms/radii, pause/photo/restart and native automatic crash recovery are connected. The original native starting point is preserved; manual recovery restarts that checkpoint. Unsupported dependencies pause with a visible error instead of switching simulators.

Desktop and touch browser checks pass: backend selection, straight gas-only riding, throttle release, keyboard steering directions, reset, sand-enabled touch riding, pause/photo and return to classic. The actual playable adapter matches all **8,400 native motion words across the 400-frame positive-steering history** when supplied its recorded inputs and world clocks. The test samples bike return before separate rider collisions; those collisions may legitimately change bike velocity afterward. A second test proves sand displacement reaches native height queries and does not leak into a fresh hardpack ride. The display height optimization agrees with the native height query across 2,000 basin samples.

The compressed initialization/terrain asset is about 6.7 MB and loads only on first preview entry. Rebuild it with `node scripts/mcm-reference/build-preview-scene.mjs /path/to/dunes.trn`. `node scripts/preview-smoke.mjs` now runs the connected-core browser checks. Sand is a Dust Valley extension, not original-game parity. Captured other actors/shared-world state, caller-stack lifetime, procedural rider visuals and untested branches still prevent a full-parity claim. In particular, the original start is in a bowl and sustained throttle can crash; this is visible in the original traces too.

### Historical browser integration prerequisite — November 14

Before the connected-preview milestone above, the deployed preview passed desktop and touch smoke tests but still used the assisted simulation. Its served bundle matched the local build; recent native milestones had not changed its handling.

Captured frame initialization now uses browser-native byte views and a pure animation asset loader. `node scripts/mcm-reference/browser-core-smoke.mjs` executes a complete captured first frame in real Chrome without Node polyfills and compares 176 bike fields, all 22 stage names and the return result against Node. This is a browser portability check, **not a playable integration or long-running browser parity claim**. The retained native replay regressions remain the physics evidence. Next: share retained rider/pool initialization, validate continuous browser histories, then connect terrain, inputs and rendering to the playable preview.

### Continuous browser runtime — November 14

`captured-frame-runtime.mjs` now shares retained initialization and bike/rider/pool update entry points. The native retained comparator uses the same initialization and external tick methods. `run-captured-history.mjs` accepts an initial checkpoint and subsequent controls/timing only; observed outputs are not simulation inputs.

`node scripts/mcm-reference/browser-retained-smoke.mjs` validates short throttle pulse/release, braking, positive steering and crash/recovery in Chrome: **400 bike frames per scenario**, zero browser-versus-Node snapshot differences and **33,600 original position/orientation/velocity/angular-velocity/acceleration words** with zero differences. The negative-steering check deliberately stops after frame 38 and preserves **12 motion-word differences at that frame** (the broader native comparator reports 41 modeled-physics differences). This confirms the known blocker survives browser execution; it does not resolve it. Particle rendering, complete shared-world state and playable-preview integration remain incomplete. The browser histories use captured terrain coverage and initialization, not a freely navigable game world.

### HUD stack writer identified — November 14

[Read-only native call-boundary evidence](mcm-hud-draw-text-stack-validation.json) now identifies `USER32!DrawTextA` at original call `0x423f52` (IAT `0x527870`) as a writer of the reused bike-stack word at `0x0022f038` / player ESP+0x54. Across 20 HUD refreshes, all 40 recorded row-draw calls return with zero there; five entered with a nonzero value. The word survives setup and formatting before the first draw. It lies 2,448 bytes below the caller ESP at the call instruction, or 2,444 bytes below callee entry.

A separate Wine helper, using the captured text/rectangle/flags and caller alignment with its own Arial font/DC, clears the corresponding sentinel word and writes as deep as 3,976 bytes below the pre-argument stack top. This is supporting API stack-footprint evidence, not an exact original font/DC or trajectory oracle. Eight guarded probe sites were restored and debugger detachment verified. The committed fixture preserves the raw rows and the isolated stack bytes.

**Next:** capture and retain the outer HUD clock/order alongside the player history, then model the verified caller-side effects and other stack writers. Do not insert a frame-number-based reset or use observed scratch words as default input. The negative-steering regression still fails at frame 38; the internal Wine write instruction is not yet identified.

### Steering and caller-stack boundary — November 14

A [recorded positive quarter-scale steering trace](mcm-live-retained-steering-validation.json) completes 400 bike calls, 399 rider ticks and 399 pool ticks with **zero modeled-physics differences**. Throttle runs for frames 0–39, steering for 20–69, then both release. The trace exercises heading/lean changes, neutral release, and crash states 1 and 2. Its 842,655 bike/frame words and 16,248,876 external words include 9,832,174 reported visual differences. The initial prototype omitted steering metadata; the accepted capture reruns the experiment with explicit per-frame steering words. Missing/inconsistent input is rejected, and removing steering is detected at frame 20.

The **opposite direction is not complete**. The [fully retained comparison](mcm-live-negative-steering-boundary.json) matches through frame 37 and reports 41 modeled-physics differences at frame 38. Native caller stack **ESP+0x54** is zero on that entry and remains zero through return while the rear wheel is airborne; the replay retains an earlier nonzero drive-force scratch value. Original 0x4ac379 consumes this word and chooses the -0.087 lean correction. This is a lifetime/shared-world dependency, not evidence to replace already validated steering math.

An explicit [observed-caller-input diagnostic](mcm-live-negative-steering-observed-drive-validation.json) supplies only that entry scratch word for each frame and then matches all 400 bike calls (842,676 words), with zero modeled-physics differences. It records `callerScratchMode: observed-input` and 400 observed scratch words. **This is conditional physics validation, not fully retained world/stack parity.** Default replay never enables it or silently repairs a mismatch. The regression retains both the failing fully retained boundary and the successful conditional audit.

Player and AI native updates use the same stack base. A focused 40-frame trace confirms other-bike reuse but only 7 of 39 next-player entries equal the preceding AI exit word; additional writers/lifetime effects remain unresolved. The temporary data-watchpoint experiment produced no write notifications, so it does not establish provenance. Software-breakpoint sampling narrows the zero write to after pool aging returns and before particle drawing starts; the next bike entry already contains zero. An instruction-stepping follow-up ended the reference process without identifying the writer; that failed diagnostic is archived separately. The original was relaunched with the recorded `renderer=gl,csmt=0`/audio-isolated configuration, returned to dunes practice, produced eight fresh boundary records, and passed an 18-location hook/debugger cleanup check. Next work must identify/model the actual intervening writes or explicitly delimit the original's uninitialized-stack dependency. It must not claim that input substitution closes full parity. Native captures and harnesses are archived under `player-validation/steering-2026-11-14`.

### HUD refresh clock recovered and live-validated — November 14

Recovered the scheduling portion **0x423b63..0x423bc9** in `hud-refresh-clock.js`: float32 elapsed-time accumulation, the original signed-bit half-second threshold, frame-counter wrap, enabled gating and milliseconds-per-frame calculation/reset. The refresh callback observes the previous timing statistic before it is updated. This models scheduling only; the graphics call and its inherited stack effects remain unimplemented.

[131 isolated native cases](mcm-hud-refresh-clock-validation.json), including three retained 400-update histories, match **1,328 updates / 5,312 words**, with 3,235 changed words and zero differences. A separate live capture retains the clock from one initialization across **80 updates / 480 words**, also with zero differences. Its four predicted refreshes include one observed nonzero-to-zero change in the bike scratch slot during refresh. No clock output or scratch word is injected into the retained simulation.

The new bounded live capture writes only debugger control context and restores its three breakpoints. A minimized-window attempt ended with no records; restoring the window allowed the successful capture. A finalized four-update smoke capture and 42 instruction-site checks leave the original running with no attached debugger. All 454 tests, the production build, and ARM/x64 clock regressions pass. These clocks are not yet connected to the retained bike runner or playable preview.

An isolated check of the original CRT floating formatter (`0x4be9a0`, after its native `0x4be6a0` initializer) reaches only 1,040 bytes below its arguments for the tested FPS string/values. It does not reach the relevant deeper slot in that call layout. This rules out that tested formatting call, not all formatting paths or graphics APIs. The exact nested HUD writer and fresh-session inactive animation-pointer handling remain open. Evidence is archived under `player-validation/hud-clock-2026-11-14`.

### Caller-stack writer narrowed to HUD refresh — November 14

[Three new native boundary captures](mcm-native-caller-stack-lifetime.json) each complete 40 bike calls and narrow the external zero write to the timed HUD refresh called at **0x423b98 → 0x423a10**. The scratch word at `0x0022f038` (bike entry `ESP+0x54`) survives particle aging and the child updates inside `0x423b50`, then changes from `0x4306a684` to zero between instruction boundaries `0x423b69` and `0x423bff`. This interval's only call is the HUD refresh. Its gates are the original owner timer reaching 0.5 and nonzero `world+0x6f4`. Rendering-related scheduling is therefore a real physics dependency through reused stack storage; it must not be dismissed as visual-only state.

The exact nested writer is still unknown. A deeper graphics-path probe ended with access violation `0xc0000005` after two boundary records; it is explicitly excluded from successful evidence. The original was restored to dunes practice and checked at all 41 probe sites, with no debugger attached. The capture harness now logs unhandled exception addresses/parameters and process exit codes so future failures retain useful evidence.

These fresh-session probes deliberately omit animation export after an unreadable retained frame pointer was found in the new session (proxy `+0x1c` held `0x3e31d0c8`). That loader/export dependency remains to be investigated, not silently repaired. The probes establish call ordering and stack writes, not additional accepted trajectory comparisons. The default opposite-steering regression remains failing at frame 38. Next: identify the nested HUD writer and capture its timer/gates alongside world scheduling; account for AI reuse; then validate the retained negative-steering path without entry-word injection. Native evidence is archived under `player-validation/caller-stack-hud-2026-11-14`.

### Shared-particle aging and ordering milestone — November 14

Recovered original pool update **0x43b200**, including age/size/position/velocity updates, the original float32 spill order, expiration and pointer-slot swaps. Its replacement-slot skip behavior is preserved. [96 isolated native cases](mcm-particle-pool-tick-validation.json) match 1,824,096 words (28,951 changed). [399 independently captured live calls](mcm-live-particle-pool-validation.json) match 7,999,551 words (82,751 changed). Each independent call is initialized from its observed inputs; it is not a retained-world claim.

The [retained shared-pool replay](mcm-live-retained-pool-validation.json) now executes all 399 pool ticks with their **own captured deltas and event order**, alongside 400 bike calls and 399 rider ticks. Modeled physics still has zero differences. Pool/rider state is initialized once; pre-pool snapshots are excluded from the retained fixture and are never injected. Deleted world events are rejected. This checks 842,700 bike/frame words and 16,248,876 external words, retaining 9,258,639 visual differences, including 9,255,300 particle/pool differences. Those totals include wider captures and additional comparison boundaries and cannot be compared directly with prior difference counts.

Native particle allocations are **72 bytes**, proved by allocation at 0x43ac5e. Previous captures retained only the first 68 bytes, excluding a rendering pointer at +0x44; they remain supported explicitly as partial emitter captures. New capture/replay uses stable allocation identities separately from the mutable slot order. Original draw routine **0x43b3a0** changes screen-space fields, sorting and rendering buffers; its inputs/outputs and other emitters remain unconnected. That is the next shared-pool boundary, not a reason to re-port validated pool aging. Preview integration is unchanged.

### Retained rider collider coverage — November 14

Extended opt-in validation now checks 36 additional native collider words per bike update: matrix, extents, local/world centers, three contact vectors, radius and squared radius. Both the upright pulse and crash/recovery traces match these additional **14,400 words each** over 400 updates. The live loader now reads the initial squared radius rather than leaving it absent until the first external rider tick. Corrupting one native squared-radius bit is detected. Full grid/list state and other world allocations remain outside this check.

### Active braking milestone — November 14

The [upright brake-pulse comparison](mcm-live-retained-brake-pulse-validation.json) completes all 400 bike calls and 399 rider ticks with **zero modeled-physics differences**, including 842,562 bike/frame words and 7,850,325 external words. Throttle is active at frames 0–19, brake at 20–79, and both released thereafter. The original stays uncrashed. Brake ramps by the original float32 0.2 to 1 and releases through 0.5 to 0; speed reaches 0.123368 at frame 60, compared with 8.056390 in the coast-only scenario at the same frame.

The capture overrides only the original action-5 result at 0x4a5c8a for the player and records each requested brake response. The retained runner consumes these responses without changing recovered brake math; missing or inconsistent responses fail explicitly. A delayed brake onset is detected at frame 20. All 6,524,072 visual differences remain reported (6,520,493 shared particle words). This validates this terrain/input history, not all braking situations or complete world equivalence. No preview handling changes are included.

### Upright acceleration/release milestone — November 14

The [upright short-pulse comparison](mcm-live-retained-short-pulse-validation.json) completes 400 bike calls and 399 external rider ticks with **zero modeled-physics differences**. Throttle is applied for frames 0–19 and released for frames 20–399; the original remains uncrashed throughout. Speed reaches 17.533607 in original units at frame 19, falls to 17.444256 on the first released update, and ends at 0.008914. This is a rolling terrain scenario, not an isolated flat-ground drag measurement. A deliberately delayed release is detected at frame 20.

A second independently restored native run reproduces **all 16,000 declared physical/input/timing words** over the 400 frames. The [repeatability report](mcm-live-short-pulse-repeat-validation.json) lists every compared field and retains all 400 position/velocity/speed samples. The recovered runner also matches the second run's modeled physics. This establishes repeatability for these measured fields, not the complete world.

The first pulse run checks 842,580 bike/frame words and 7,850,325 external words. Its 6,346,860 visual differences (6,343,698 in the particle pool) remain explicit; the repeated run has different shared visual state. ARM and x64 replay tests pass. Preview still uses the assisted hybrid and is not changed by these capture/validation milestones.

### Recovery milestone — November 14

The [retained recovery comparison](mcm-live-retained-recovery-validation.json) now completes all 400 bike updates and 399 external rider ticks, including the crash at frame 54 and recovery at frame 246, with **zero modeled-physics differences**. It checks 842,700 bike/frame words and 7,850,325 external rider/child/pool words. All **6,222,982 visual differences** remain visible, including 6,219,630 shared particle-pool differences. These counts are scenario-specific, not an equivalence percentage.

Connected existing reset selection/pose routines using atomically captured mode/settings, player/AI counts, observer-bike identity and original 0x459e90 enumeration order. The 0x40fbb0 restoration reinstates both pair entries and normal rider callbacks; four corresponding native words are now checked after every bike update. A corrupted recovery callback is detected at frame 246. Missing enumeration memory fails explicitly. The new connector supports the captured mode-0/single-player layout; other modes and multi-player enumeration remain explicit unsupported boundaries. Other-bike positions are retained from the initial actor graph; this does not validate their independent world updates or avoidance against moving opponents.

This milestone changes the comparison harness, not preview handling. Healthy non-crashing acceleration/coast-down, shared-world scheduling/effects, broader input/settings/terrain scenarios and complete preview integration remain open.

## Historical baseline and detailed milestone log

## Objective and honest starting point

Reproduce the supplied Motocross Madness build's simulation: the same initial state, terrain, settings, input sequence and elapsed-time sequence should produce matching motion and gameplay events.

**We currently have an adaptation, not a recovered physics engine.** We recovered several constants and parts of a few routines, then implemented them inside our existing Cannon-based simulation. The 74 passing tests establish that our game behaves acceptably under those tests. They do not establish agreement with Motocross Madness. The original now runs under Wine; 300 live scheduler comparisons pass, and raw bike-object snapshots are captured. Complete input/contact/integration traces and repeatability remain outstanding, so there is no defensible percentage-complete estimate.

Our target executable is SHA-256 `e02c8d16d3de24c11345b9fa71498b14f71d2ae9e674649bb673dcbd770b0f1b`. Both local copies have that hash. Select one complete installation as the reference and record its data files and settings too: matching executable hashes alone do not establish matching runtime conditions.

Supporting material:

- [Recovered binary evidence and implementation notes](motocross-madness-reverse-engineering.md)
- [Machine-readable initializer evidence](mcm-binary-evidence.json)
- [Current adaptation measurements](mcm-handling-measurements.json)
- [Isolated scheduler and square-root recovery](mcm-core-recovery.md) — 134,242 synthetic original-instruction comparisons pass under Wine/Rosetta; 300 live scheduler comparisons also pass; full physics parity outstanding
- [Reference runtime status](mcm-runtime-status.md) — playable practice event; signed video-memory overflow resolved
- Inspection tool: `scripts/inspect-mcm.py`
- Current benchmark: `scripts/handling-benchmark.mjs`

Current milestone: [player identification and controlled replay](mcm-player-telemetry.md)
now supplies repeatable acceleration/release observations. Two 400-frame runs match
in motion and captured engine state, with four unexplained inherited words still
reported. The digital throttle translation matches 2,495 live helper calls. The
original-versus-port whole-bike comparator remains outstanding.

## What “100%” must mean

| Target | What it establishes | How we can claim it |
|---|---|---|
| Similar feel | Riding is subjectively convincing | Side-by-side playtesting; useful but not physics parity |
| Behavioral equivalence within stated tolerances | Recorded trajectories and events agree across a defined test matrix | Published errors, conditions, coverage and known exceptions |
| Exact simulation equivalence | All relevant state transitions and numerical results match the target build under the same conditions | Recover the full simulation path, match numerical semantics, and validate it against the executable; a finite set of tests alone cannot prove equivalence for every possible input |

Target exact simulation equivalence, and report intermediate progress as measured behavioral equivalence. Do not relabel a small error threshold as “100%.” If bit-for-bit state equality is required, explicitly include floating-point precision, operation order, helper approximations and scheduling in scope. Equivalent rendered poses alone are insufficient.

First cover the local player's bike in single-player, all available bike/power and suspension settings, and indoor/outdoor behavior. Then cover interactions with other riders, obstacles, crashes, resets and boundary behavior. If we exclude multiplayer-specific physics branches or another mode, say so in the final parity claim. Network transport, graphics, sound assets and UI reproduction are separate from physics unless they feed simulation state or timing.

## Current approximation inventory

Every item below needs either original-code evidence and validation or removal from the parity implementation.

| Area | What we currently do | Unresolved parity work |
|---|---|---|
| Solver | Cannon rigid body, contact impulses and solver iterations | Original integration, contact resolution and update order |
| Timing | Fixed 120 Hz | Original nominal 20 ms scheduling, short-frame fallback, iteration cap and elapsed-time handling |
| Units | SI conversion and gravity 9.81 | Original units, actual gravity path and rounding; 32.2 ft/s² converts to 9.81456 m/s², not exactly 9.81 |
| Body | 183.7 kg total, scaled hand-authored inertia and box collider | Center of mass, actual inertia, shape hierarchy and rider/body coupling |
| Wheels | 2.15 m wheelbase, 0.61 m radii | Original axle positions, separate radii, steering axis and suspension geometry |
| Suspension | Recovered coefficients applied to scalar ray compression/velocity | Original vector inputs, extra force term, geometry, load share and limits |
| Suspension safeguards | 30 kN clamp, nonnegative support, bank-independent ray direction, seam retries | Determine whether any corresponding behavior exists in the original |
| Steering | Bike Lab balance-steer law, our yaw feedback, speed blending and slope compensation | Original input-to-handlebar and input-to-orientation calculations |
| Lean | 40° target, rate-limited target filter, torque-based tracking | Original correction acts on orientation with conditional gating; matching a target rate is not the same algorithm |
| Traction | Pacejka-style lateral curve and combined grip ellipse | Original longitudinal/lateral forces, slip and load calculation |
| Wheel speed | Road speed plus artificial throttle spin | Determine original wheel rotational dynamics and engine feedback; ours is not an independently integrated wheel inertia model |
| Drivetrain | First recovered torque curve with chosen overall ratios | Original reduction composition, all curves, RPM coupling, shift predicates and launch behavior |
| Engine adaptations | 5750 RPM clutch floor, 4200 RPM downshift, 250 ms anti-hunting delay, 0.92 efficiency, RPM smoothing | Recover or eliminate each of these assumptions |
| Braking | 1200 N front / 700 N rear, lean-based reduction, rear engine brake up to 100 N | Original brake distribution, wheel locking, coast-down and engine braking |
| Drag | Quadratic horizontal drag plus Cannon linear/angular damping | Original force law, affected axes, thresholds and dissipative terms |
| Rider assists | Anti-flip torque, roll PD controller, synthetic gyroscopic damping and foot support | Original equivalents, including whether some are absent |
| Air control | Custom pitch, roll and yaw torques | Original airborne input, wheel reaction and momentum behavior |
| Crashes | Custom contact/up-vector/impact conditions | Original complete decision tree, timers, rider separation and recovery |
| Extras | Regenerating boost and 1.35× engine force | Disable in parity mode unless an equivalent is established in the target build |
| Terrain | Procedural heightfield and selected sphere obstacles | Original terrain sampling, normals, collision shapes and material properties |

## Phase 0 — Establish a runnable reference and preserve the baseline

- [ ] Get the target build running in an environment that supports both execution and inspection. Confirm launch, controls, loading, clock behavior and stable gameplay before choosing the debugger/instrumentation workflow.
- [ ] Record executable and physics-relevant asset hashes, settings, selected bike, mode, track, input device, compatibility wrappers and runtime environment. Do not assume the two folders' extra wrappers have no timing effects.
- [ ] Keep a pristine reference installation. Make experiments in a separate copy with a change log.
- [ ] Record several identical-start runs. Measure whether the original repeats exactly, and identify randomness, timers or external state if it does not.
- [ ] Preserve today's adaptation as a separate behavior/profile. Do not keep changing the current game while losing the only reproducible baseline.
- [ ] Resolve development access for Git writes, local servers and original-game execution/debugging. These were blocked or unavailable in this session; they are execution prerequisites, not physics problems.

**Exit condition:** the original is runnable, its configuration is pinned, and a repeated input sequence can be captured reproducibly enough to investigate discrepancies.

## Phase 1 — Build the original-game measurement harness

This is the highest-priority missing capability. Another set of guessed constants will not substitute for it.

- [ ] Locate the live player-bike object and distinguish it from AI/network bike objects.
- [ ] Find the actual simulation-step entry/exit and determine which state is authoritative versus used only for rendering or HUD display.
- [ ] Recover the complete mutable state needed to restart a simulation: transforms, velocities, wheel/contact history, engine state, accumulators, filters, crash state, random state and relevant globals. Position and velocity alone are not a full checkpoint.
- [ ] Capture pre-step inputs and state plus post-step outputs, indexed by simulation step, frame and time. Capture raw numeric representations where practical as well as readable values.
- [ ] Inject repeatable controls at the same point the original consumes them. Record input device processing separately from normalized simulation controls.
- [ ] Record each substep's actual dt, not just video timestamps or display FPS.
- [ ] Add controlled initial states and test geometry. Prefer loading an authored test track through the original's supported content path, if feasible; otherwise instrument state at a known location and record the exact geometry used.
- [ ] Measure instrumentation overhead and check that logging does not change the dt sequence or behavior. Keep an uninstrumented comparison run.

Required trace fields, as they become understood: chassis position/orientation and linear/angular velocity; front/rear contacts, normals, contact points and penetration; suspension displacement/velocity/force; tire force and wheel angular speed; handlebar angle; rider/lean state; throttle/brake; gear/RPM/shift state; total force/torque; airborne/crash/reset events; settings and seed.

**Exit condition:** replayable original-game fixtures with known initial state, inputs, geometry and time sequence. Videos supplement these traces; they cannot replace internal-state comparison for exact parity.

## Phase 2 — Recover the simulation call graph and numeric foundations

- [ ] Import the executable into a decompiler/disassembler, create a named analysis project, and retain the existing address-based evidence.
- [ ] Trace outward from the bike update and each known constructor. Identify all simulation callees and globals, including generic vector/matrix math, terrain queries, input processing and crash handling.
- [ ] Recover object layouts and field types. Track every relevant field's readers, writers, initialization, units and lifetime. Treat previous analyst-assigned names as hypotheses until confirmed.
- [ ] Recover coordinate axes, handedness, orientation representation, angle units and matrix/quaternion multiplication order.
- [ ] Recover update order: input, controller, engine, contact queries, forces, integration, collision correction, crashes and render state. Establish whether a force uses this step's contacts or cached contacts from the previous step.
- [ ] Resolve nominal 20 ms scheduling, short-frame fallback, 10-iteration cap, remainder handling, pauses, stalls and long-frame behavior. Test boundaries on either side of each scheduling branch.
- [ ] Resolve scalar storage precision, x87 intermediates/control settings, rounding, integer conversions, clamp comparisons and custom math helpers. Compare their results directly on representative and threshold inputs.
- [ ] Choose the implementation strategy from evidence: a dedicated translated physics core is the likely route if Cannon cannot reproduce original transitions. Keep rendering separate. A WebAssembly core is an option to evaluate, not a guarantee of x87-equivalent arithmetic.

Useful starting addresses from the current investigation:

| Address | Investigation lead |
|---|---|
| `0x4a1ff0` | Bike setup and initialized fields |
| `0x4a54b6–0x4a5548` | Step scheduling and fallback |
| `0x49ef90` | Drivetrain initialization |
| `0x4b11e0–0x4b1315` | Suspension force helper |
| `0x4ac335–0x4ac50e` | Lean candidate, clamp and rate logic |
| `0x4a832c–0x4a83f0` | Partly understood traction scaling |
| `0x4016c0` | Custom magnitude/math helper |

**Exit condition:** a documented simulation dependency graph, state layout, unit map, scheduler and tested math primitives. No claim that changing our update rate to 50 Hz alone achieves this.

## Phase 3 — Recover geometry, terrain and contact mechanics

- [ ] Determine which bike/model data contributes to physics and which is visual-only. Extract physical measurements and transforms without confusing animation geometry with collision geometry.
- [ ] Recover wheelbase, wheel radii, steering-axis geometry, fork direction, swingarm pivot, suspension rest pose, limits and motion ratios.
- [ ] Recover separate bike/rider masses, center of mass, inertia tensor and any change caused by rider movement or stunts.
- [ ] Recover terrain coordinate scale, height decoding, sample spacing, triangle selection, interpolation, normals, seams and out-of-bounds behavior.
- [ ] Recover contact generation: rays, spheres or other primitives; number of samples; query direction; contact persistence; contact offsets; static versus moving surfaces.
- [ ] Recover collision response: restitution, friction, penetration correction, impulse ordering, iterations and any separate handling for chassis versus wheels/rider.
- [ ] Recreate matching diagnostic surfaces in both engines: flat, constant incline, cross-slope, sharp crest, step, tabletop, repeated whoops and obstacle contact. Confirm sampled heights/normals before comparing vehicle forces.

**Exit condition:** identical geometric queries produce matching contacts and normals; body parameters are recovered rather than visually estimated. The same controls on different terrain cannot establish physics parity.

## Phase 4 — Complete suspension recovery

- [ ] Trace both callers of the recovered spring/damper helper and establish every argument, including the extra scalar term.
- [ ] Resolve displacement vector versus scalar compression, velocity-vector magnitude versus axial velocity, force direction and attachment point.
- [ ] Resolve front/rear load sharing, preload, travel stops, extension behavior, bottoming, rebound, force limits and one-wheel support.
- [ ] Recover how suspension settings modify runtime coefficients and whether player, AI or mode branches differ.
- [ ] Port the original helper and its calling geometry together. Do not retain our 30 kN ceiling, bank-independent rays or scalar simplification in exact mode without evidence.
- [ ] Compare force outputs before whole-bike trajectories: static sag, slow compression/rebound, just below/above damping thresholds, maximum travel, one-wheel landing and hard impact.

**Exit condition:** matching force vectors and moments for matching states, followed by matching sag and landing trajectories. Correct coefficient values alone are insufficient.

## Phase 5 — Complete drivetrain, wheel, traction and braking recovery

- [ ] Decode and independently verify all three power curves, boundary handling and interpolation; recover settings/mode selection.
- [ ] Trace every use of the outdoor/indoor ratio entries and the 0.8333 factor. Resolve overall reduction, wheel circumference, speed units and the meaning of the sixth-gear sentinel.
- [ ] Recover engine RPM evolution, wheel/engine coupling, inertia if present, launch behavior, throttle filtering, limiter and any artificial minimum RPM.
- [ ] Recover the exact upshift/downshift predicates, shift-band randomness if applicable, minimum-speed gates and how the 50 ms shift affects engine output and state.
- [ ] Determine whether wheel angular speed is a simulated state, derived value or hybrid in the original. Reproduce its feedback to forces; do not invent a more realistic wheel model if the original uses a shortcut.
- [ ] Trace the 45 ft/s traction-floor path, including why a state is zeroed in the inspected branch. Identify when it runs and whether it scales thrust, lateral forces or both.
- [ ] Recover surface friction, slip angle/ratio treatment, static/kinetic transitions, combined braking/cornering demand and load transfer.
- [ ] Recover braking distribution, low-speed clamping, reverse/backward behavior, wheel lock, engine braking and coast-down.
- [ ] Recover aerodynamic/rolling drag, angular damping, top-speed constraints and their interaction with slope and airborne state.
- [ ] Remove our chosen gear reductions, clutch floor, anti-hunting delay, efficiency, RPM response rates and boost from exact mode unless validated.

**Exit condition:** engine, gear, wheel, force and velocity traces agree during launches, shifts, partial throttle, coast-down, braking, hills, wheel lift and relanding. Matching 0–60 alone can conceal compensating errors across multiple systems.

## Phase 6 — Recover steering, balance and rider input

- [ ] Recover keyboard and analog input mappings, deadzones, scaling, saturation, smoothing and input sampling times.
- [ ] Resolve the complete lean candidate expression, including the unidentified lateral state and multiplier, the approximately 0.087 rad branch, 40° clamp and 96/120°/s branch conditions.
- [ ] Identify exactly what the lean correction changes: orientation, angular velocity, torque or a combination, and how contact conditions gate it.
- [ ] Recover handlebar steering limits and dynamics, speed dependence, lean-to-yaw coupling, slopes and banked terrain behavior.
- [ ] Recover neutral/release behavior, left/right reversals, stationary balancing and any rider-foot or low-speed assistance.
- [ ] Recover rider weight-shift effects on center of mass, suspension loading, pitch and takeoff. Separate visible rider motion from physical input.
- [ ] Replace the Bike Lab controller, our yaw correction, bank target filter, anti-flip torque and synthetic gyroscopic/foot support with recovered behavior where they differ.

**Exit condition:** matching response to input steps, ramps, releases and reversals at several speeds and slopes. A matching steady turn radius does not prove matching transient behavior.

## Phase 7 — Recover airborne motion, landings, crashes and recovery

- [ ] Recover airborne detection and transitions for zero, one and two contacts. Distinguish contact loss from a gameplay airtime event.
- [ ] Recover airborne throttle/brake, steering and forward/back rider effects, damping, spin limits and wheel reaction behavior, including any nonphysical assistance.
- [ ] Verify whether lateral air input changes only orientation or also velocity. Our existing ballistic-flight test is an assumption about our model, not original-game evidence.
- [ ] Recover touchdown ordering, impact-speed calculation, force/impulse distribution and any landing-specific correction or grace period.
- [ ] Trace the complete crash decision tree: angle frames, acceleration/deceleration calculation, contact conditions, thresholds, rider collision and timers. Initialized 70°/85° values do not establish the whole rule.
- [ ] Recover crashes and rider separation through their physical end state, then remount/reset location, orientation, velocities and cleared/preserved histories.
- [ ] Inspect wheelies, stoppies, stunts, terrain boundaries and exceptional launch/respawn behavior. Include any simulation-affecting branches in scope, even when they look like arcade exceptions.

**Exit condition:** matching trajectories and event sequences for a landing-angle/speed matrix, one-wheel touches, slips, deliberate crashes and recovery. Do not preserve our generous “never wipe out in this test” rules if the reference actually crashes.

## Phase 8 — Modes, tuning and other-body interactions

- [ ] Test indoor/outdoor differences, every power curve and suspension/traction settings at defaults, extremes and intermediate values.
- [ ] Exercise player-versus-AI/object contacts and moving surfaces where the target supports them. Identify special collision or force branches.
- [ ] Determine whether game mode, difficulty, assists or network role affect the player's physical update. Verify rather than infer from UI names.
- [ ] Include relevant state initialization, race start, pause/resume and reset paths. Scope purely AI decision-making separately from bike physics.

**Exit condition:** a coverage matrix that names tested variants and explicit exclusions. One bike on one flat track is not whole-game physics parity.

## Phase 9 — Differential validation and integration

Build a harness that runs the original and our parity core from equivalent fixtures and finds the **first divergent step and field**. Compare inputs, dt and contacts before blaming force equations. Compare each recovered helper independently before long runs amplify a tiny discrepancy.

| Fixture family | Required comparisons |
|---|---|
| Idle / slopes | Equilibrium pose, sag, contact loads, creep, rollback |
| Launch / shifts | RPM, gear changes, wheel speed, torque, acceleration, shift duration |
| Coast / brakes | Force histories, stopping distance, speed decay, lockup and backward motion |
| Steering | Handlebar, roll/yaw, turn radius, reversal delay, slip and release |
| Ramps / whoops | Contact sequence, suspension forces, takeoff pose/velocity, flight and touchdown |
| Air inputs | Orientation and angular velocity together with linear trajectory |
| Crash / recovery | Exact discrete transitions, timing and full reset state |
| Obstacles / boundaries | Contact ordering, impulses, resulting motion and exception paths |
| Timing variations | Same frame-time sequence at 30/50/60/120 FPS equivalents, jitter, stalls and dt boundary cases |
| Settings / modes | All supported engine/suspension/traction variants and applicable gameplay branches |

- [ ] Check raw numerical equality where representations are comparable. Otherwise define semantic mappings and report absolute/relative errors for each field. Do not hide rounding or time shifts in the comparator.
- [ ] For approximate parity, set tolerances from measured reference repeatability and an explicit product decision. Record max error, accumulated drift and event timing; do not rely on averages alone.
- [ ] Preserve contact/no-contact, gear, crash and reset event agreement separately from continuous errors.
- [ ] Add held-out courses and input sequences not used for implementation, plus generated boundary cases and valid randomized scenarios. Keep failures reproducible with seeds/checkpoints.
- [ ] Run long-duration tests to detect drift, energy injection, state leakage and divergence after repeated recoveries.
- [ ] Integrate the parity core behind a small input/state interface. Rendering interpolation must not feed back into physics. Audit existing `sync`/wheel transform calls, which can mutate Cannon contact flags, before treating them as presentation-only.
- [ ] Align camera, rider pose, suspension animation, wheel spin and audio afterward so correct physics is not perceived through misleading presentation. These are separate acceptance checks.
- [ ] Validate the chosen browser/platform targets and performance without silently skipping simulation steps. In exact mode, preserve the original scheduler's semantics even when another behavior would be smoother.

**Exit condition:** reproducible original-versus-port reports, known coverage, no unexplained divergence in accepted fixtures, and an honest equivalence claim. A universal exact-equivalence claim additionally requires sufficient analysis of all relevant branches and numeric semantics; passing a large replay suite alone is not a proof.

## Concrete implementation backlog and ordering

These are proposed deliverables, not files or capabilities already implemented.

| Order | Work package | Deliverable / acceptance gate |
|---|---|---|
| 1 | Reference runtime and manifest | A pinned original installation that runs and repeats |
| 2 | Trace and input replay | Original pre/post-step fixtures with dt and full initial state |
| 3 | State layout and call graph | Typed fields, units, dependencies and function evidence map |
| 4 | Scheduler, math and integration | Helper-level comparisons and matching free-motion steps |
| 5 | Geometry, terrain and contacts | Matching queries and collision inputs |
| 6 | Suspension | Matching force vectors, sag and drop fixtures |
| 7 | Engine, wheels, grip and brakes | Matching force/state traces through launch, shifts and stops |
| 8 | Steering and rider | Matching steady and transient cornering |
| 9 | Air, landing, crash and reset | Matching trajectories and discrete event paths |
| 10 | Variants and interactions | Mode/settings/collision coverage matrix |
| 11 | Browser integration and acceptance | Differential regression suite, performance and presentation checks |

Investigations can overlap after the harness exists, but validation must respect these dependencies. Geometry errors must not be compensated for with grip changes; scheduler errors must not be compensated for with damping changes.

Suggested project structure: an independent `src/physics/mcm/` core; a reference-fixture schema with version, initial state, inputs, frame/substep timing, geometry/settings hashes and expected outputs; a differential runner under `scripts/`; and regression fixtures/tests grouped by subsystem. Keep original executables and raw asset dumps out of the shipped game. Maintain an evidence entry for every recovered function linking its address, interpretation, callers, numeric behavior and validating fixture.

## First work session

1. Make the original runnable and record the environment/settings manifest.
2. Find the player update boundary and enough state fields to capture a stationary bike, straight acceleration and throttle release.
3. Record an input/time trace, repeat it, and establish reference repeatability.
4. Capture the equivalent Dust Valley run and identify the first divergence rather than comparing only endpoint speed.
5. Use that result to prioritize the first translated subsystem. Expand state capture before guessing at hidden state.

Do not start by further tuning our arbitrary gear ratios or steering gains. The most valuable next deliverable is **the original-game trace/replay harness**. Until that exists, we can improve the adaptation, but we cannot measure how close it is to exact parity. Estimate implementation time after the reference runtime, instrumentation and first function-level comparisons are working; those are the largest current uncertainties.

### Milestone delivery

Publish each validated milestone to `origin/main` (user instruction, 2026-11-12).
Before publishing, run the repository tests and production build, inspect the
staged changes, and preserve the original-execution reports and regression
fixtures relevant to that milestone. Use normal fast-forward pushes and reconcile
new upstream commits if necessary. A shipped milestone does not imply full parity.

The first recovery milestone includes player identification and repeatable
original acceleration/release telemetry, isolated recovered physics modules,
original-execution comparison harnesses, and terrain sample hierarchy recovery.
Validation: 114 tests pass and the production build succeeds. The recovered core
is not yet integrated into the playable simulation; continuous terrain queries,
full update sequencing, and whole-bike original-versus-port trajectories remain
required before claiming complete physics parity.

The continuous terrain **height-only** query (`0x411340`, null normal output)
now has an independent translation and original-execution harness. All 40,000
synthetic cases match point output bits under x87 control word `0x027f`; see
`mcm-terrain-height-validation.json`. This covers alternating triangles,
round-to-nearest-even cell selection, negative coordinate clamping, hierarchical
samples, missing tiles and null roots. Retained original fixtures provide a
regression check. Continuous normal interpolation, actual course data and the
connection to whole-bike contact updates remain outstanding. This result is
scoped helper evidence, not a complete physics equivalence claim.

Smooth continuous terrain normals (`0x411340`, normalMode 0) now match all output
bits in 40,000 synthetic original-executable comparisons, repeated with identical
input/output hashes. See `mcm-terrain-normal-validation.json` and the retained
regression fixtures. The implementation preserves the differing intermediate
stores across branches and the even-cell branch that weights corner n01 while
the corresponding height plane uses h11. Synthetic corner normals have positive
Y components; degenerate/cancelling normals are not covered by this claim.
Face-normal mode, course-data recovery, and whole-bike integration remain open.

Geometric face normals (`0x411340`, normalMode 1) now match all six point/normal
output words in 40,000 original-executable cases. The oracle invokes the original
up-vector initializer `0x412910`; omitting it leaves a zero vector in the isolated
loader and incorrectly suppresses normal orientation. The translation preserves
`0x401820`'s rounded length followed by reciprocal normalization, triangle order,
and signed zero after orientation. See `mcm-terrain-face-normal-validation.json`.
These remain synthetic tile tests; actual course data and complete bike-step
comparisons are still required.

Actual TRN v2 sample-bank data is now accessible through the recovered prefix
reader and LZW decoder (`scripts/mcm-reference/terrain-data.mjs`). Across all 35
installed `.trn` files, 28,415 compressed blocks (including five synthetic cases)
match original `0x427a90` output bytes and 32 trailing guard bytes with zero
differences. Original course streams emit one extra byte beyond the nominal
output size; the decoder retains it for validation, and data consumers must use
the nominal prefix. The report records each source file's hash and bank count;
no course assets are committed. Synthetic original-execution fixtures cover
literal, dictionary, width-change and reset behavior.

The loader evidence is `0x410260` (TRN header/prefix), `0x404230` (optional palette)
and `0x44ea00` (sample banks: 512, 580 and 4,624 nominal bytes). Each final bank
block holds 289 16-byte height/normal records. Dunes has 882 banks, height scale
0.01171875 and the following resource section starts at byte 4,042,586. Parsing
those resources and the tile hierarchy remains necessary to map world coordinates
to the correct banks. This is not yet a full course loader or whole-bike parity.

Runtime recheck: the existing original process was alive but a read-only scan
found zero objects with the previously validated bike vtable. macOS remained
locked. No live course-state or new whole-bike capture is claimed from this check.

Actual course hierarchies and world-coordinate terrain queries are now recovered.
Across all 35 installed courses, the original `0x48a2f0` deserializer agrees on
169,376 node records (bias, scale, level, shift, bank reference and all 256 child
links), followed by 140,000 matching point/normal queries through original
`0x411340`. Queries alternate smooth and face modes and include outside-course
coordinates. See `mcm-terrain-course-validation.json` for individual source hashes,
node/query counts and raw input/output hashes. All comparisons have zero differences.

The hierarchy oracle replaces stdio, allocation, child construction and renderer
initialization with host services. It supplies the root offset, decoded banks and
scales from the recovered prefix parser; those prefix calculations are not an
independent full-game-loader comparison. The original node deserialization,
absolute child-offset seeks, recursive traversal and terrain-query machine code
execute intact. A synthetic hierarchy regression checks offset resolution,
world-coordinate scaling and cycle rejection without committing original assets.

Every supplied course uses world-to-grid `float32(1/3)` and height scale
0.01171875. Dunes has 12,594 nodes starting at file byte 5,353,326. Course sample
banks can now feed the isolated recovered terrain query, but the connected bike
update and original-versus-port whole-bike trajectories remain outstanding.

A connected contact-probe sequence is now recovered: original block
`0x4a6a25..0x4a6c01`, point transform `0x4b8660`, and continuous terrain queries.
Across all 35 courses, 420,000 executions match all 23 output words (transformed
points, sampled points, normals, depths and three contact selectors), with zero
differences. Another 12,000 synthetic flat-course cases match; retained original
outputs provide asset-free regression fixtures. See
`mcm-contact-probes-validation.json` and `contact-probes-wine11.json`.

The block first tests bike-local `+0x630` through the transform referenced by
component `+0x8ec`, then tests `+0x63c` only if the first is above the surface.
It always tests `+0x648` through bike transform `+0x434`. The first pair uses a
zero depth threshold, the third uses float32(-0.3) feet. A no-hit pair preserves
the incoming selector; the upstream caller must supply its actual initial state.
The oracle executes this entire instruction range intact and captures its stack
outputs. Inputs use varied affine transforms and synthetic local points over
actual terrain; these are not captured whole-bike configurations. Upstream gates,
subsequent response, suspension sequencing and complete bike-step parity remain
unimplemented/unvalidated by this milestone.

The suspension response caller block `0x4a72b5..0x4a73e2` now matches 36,000
original executions across both signs of supplied contact height: 20,572 active
updates, 15,428 skipped updates, and 3,722 active travel-limit cases. All 23 output
words match exactly. This connects the previously recovered contact geometry and
component travel update to the caller's gates, height reduction, contact-point
translation, response flag and skipped-path history resets. Unassigned scratch
outputs are preserved on the skipped path, as in the original. See
`mcm-suspension-response-validation.json` and retained original fixtures.

The comparison enters after the caller has selected this suspension branch.
Direction, surface normal and contact height are supplied inputs, and the
component transform has no parent. Upstream geometry construction, other response
branches, subsequent force application and full bike integration remain outside
this result. It does not establish end-to-end suspension or whole-bike parity.

The rotating suspension response caller `0x4a7b33..0x4a7c46` now matches all 33
output words in 36,000 original executions: 21,818 active, 14,182 skipped,
5,146 active travel-limit and 3,116 active zero-cross-product cases. This preserves
the original contact geometry, component matrix updates, caller gates, remaining
height and point corrections, and skipped-path travel-history reset. See
`mcm-rotating-response-validation.json` and retained original fixtures.

As with the preceding response branch, geometry and initial scratch outputs are
supplied, upstream branch selection is assumed, and the transform is isolated.
The engine drive-force call immediately following this block (`0x4a7c46`) and the
subsequent force/moment sequence are not included. These response comparisons do
not yet establish connected wheel-contact or whole-bike trajectory parity.

The paired suspension-force caller `0x4a9bbf..0x4a9d5c` now matches 36,000
original executions, including both original `0x4b11e0` calls. All four response
activation combinations have 9,000 cases each; all 12 force/damping output words
match. See `mcm-suspension-forces-validation.json` and retained fixtures.
The caller passes response **travel** (`stack+0x23c` / `+0x238`) as the helper's
compression argument, supplies distinct coefficients and mass shares, and adds
extra stiffness only to the second response. Inactive responses clear force but
preserve the damping scratch vector. These details now have an explicit adapter
in `suspension-forces.js` rather than relying on matching property names.
The oracle supplies response outputs; intervening upstream sequencing and the
subsequent force/torque accumulation remain outside this validation.

The force/torque assembly block `0x4aa77d..0x4aa959` now matches 36,000
original executions across all 13 output words. See
`mcm-paired-force-torque-validation.json`. It adds the two supplied forces in
original float-store order, crosses each with its arm, inverse-rotates the
moments, clips opposite local pitch signs, and preserves the resulting bike
scratch vectors at `+0x540` and `+0x54c`. Both clips mutate the same `+0x8bc`
counter sequentially: the second can reset an increment from the first.
Control comparisons preserve the original signed/unsigned bit tests at ±0.9.
Fixtures include zero forces, boundary controls, and counter overflow.
This oracle supplies assembled forces and valid cached world matrices; earlier
force construction, cache resolution, the following third force contribution,
and complete bike integration remain outside this milestone.

The connected force assembly through angular integration sequence
`0x4aa77d..0x4aaf02` now matches 36,000 original executions across 40 output
words (`mcm-force-angular-validation.json`). This extends the paired-force
milestone through the third force/torque contribution, pivot-history copy,
contact transform correction, inertia selection, opposing acceleration, and
angular velocity integration. The third contact-torque helper can reset angular
velocity X before damping. Its flag is the same front-contact flag subsequently
read by contact correction, rather than an independent input. Opposing torque
uses the corrected transform, while force moments use the preceding transform.
All four state/contact combinations and changed-transform cases are retained in
fixtures. This uses supplied assembled forces, geometry and flags with a root
transform. Upstream force construction, parented correction, linear integration,
and complete bike trajectories are not established by this milestone.

The following force-to-linear-motion block `0x4aaf02..0x4ab49e` now matches
40,000 original executions across 20 output words
(`mcm-force-linear-validation.json`). It stores acceleration from force and
inverse mass, then stores delta velocity before integration. Between those
operations it computes a cross-product/asin steering fallback, updates or decays
`+0x6d8/+0x6dc/+0x6e0`, and chooses the rotation used downstream. The port preserves
signed bit comparisons, float stores, nearest-even counter conversion, sign
crossing resets, and the freeze gate. Fixtures exercise generated correction,
decay, nonzero fallback, and frozen motion. The field meanings remain partly
unresolved; tests supply finite geometry and positive `+0x8cc` values. This block
is not yet joined to the force/angular adapter, and downstream rotation, earlier
force construction, and complete original-versus-port trajectories remain open.

A selectable **MCM preview** handling profile now exposes the recovered digital
throttle, automatic gear helper, captured player engine tables, drive-force helper,
and suspension-force helper in the browser. Select it under Handling, then start
Free ride or Desert circuit. It runs at 20 ms and disables boost; its circuit
results do not update classic leaderboards or ghosts. Reset restores the engine
and deterministic random seed. Free ride starts immediately without race lights.

This is explicitly a hybrid preview, not whole-bike parity: the engine timer/call
sequencing and chassis-speed coupling are browser adapters, and Cannon still
supplies chassis integration, contacts, grip, rider balance, brakes and crashes.
The independently recovered angular/linear caller blocks are not substituted
into Cannon's integration. They still need a complete original-state adapter.
The preview lets the recovered parts be played without misrepresenting that gap.

The force/angular and force/linear blocks are now joined in
`updateMcmForceMotion`, validated against continuous original execution from
`0x4aa77d` through `0x4ab49e`. All 60 output words match in 36,000 cases
(`mcm-force-motion-validation.json`). Shared timestep, contact flags and inertia
have one input source, accumulated forces feed linear acceleration, and the third
local torque scratch vector is preserved into the steering-fallback branch.
Fixtures cover all eight state/contact/both combinations, nonzero fallback and
frozen motion. This closes the adapter gap between those two previously isolated
blocks. Inputs still supply the assembled forces and geometry, and the root
transform limitation remains. Downstream rotation application and complete bike
trajectories remain unverified; the playable preview still uses Cannon chassis
integration until the complete original-state adapter is recovered.

The connected sequence now extends through wheel updates, translation assignment
and pivoted body rotation, ending at `0x4ab7fd`. All 98 final output words match
in 36,000 original executions (`mcm-motion-transform-validation.json`): 31,926
applied body rotations, 4,074 skipped rotations, 1,402 free-engine-spin cases,
6,000 state-2 wheel-damping cases, 7,713 field-driven damping cases and 6,601
preserved wheel transforms. Wheel increments, local matrices and cache flags are
included. Original `0x49e7b0/0x49e7f0` wheel calls remain in the oracle.
The two wheel components retain their original array order (`+0x8dc`, `+0x8e0`).
The body translation is replaced with the integrated position before rotating
around its saved pivot. Final matrix translation can therefore differ from the
bike position fields; both are compared independently. Tests use isolated root
transforms and supplied upstream forces/geometry. Later rider/crash branches,
parent/child cache propagation and whole-bike trajectories remain outstanding.

The following controller velocity handoff `0x4ab7fd..0x4ab99f` now has a
connected 36,000-case comparison (`mcm-motion-controller-validation.json`), with
zero differences across 104 final words. The state-zero path exits at `0x4abb30`
before its separate orientation logic. Active controller flags trigger copies to
controller `+0x70/+0x7c`. Transition kind 2 optionally copies another bike's linear
velocity; kinds 4 and 7 add `min(abs(bikeVelocityY),35)` to copied vertical velocity
and retain full angular velocity. Other kinds scale angular velocity by 0.75.
Inactive gates preserve both controller vectors. Coverage includes 18,005 skipped,
3,602 other-bike, 7,198 vertical-increment and 7,195 damped handoffs. The broader
meaning of transition kinds and controller flags remains unresolved. This is not
validation of collisions with another rider: that velocity is supplied. Following
orientation correction and rider/crash behavior remain outside the comparison.

The nonzero-state orientation branch following controller handoff is now joined
through `0x4ac6cd`. Its connected 36,000-case oracle matches all 107 final words
(`mcm-state-orientation-validation.json`), including 3,599 both-contact corrections,
3,002 front-only corrections and 29,399 skipped corrections. The both-contact path
adds normals with float stores, uses the original inverse-square-root helper,
stores its reciprocal estimate to float, and inverse-rotates the normalized sum
before rotating around the saved pivot. The front-only path rotates around the
initialized Y axis using a negated angle. Cases straddle the original `0.001f`
threshold and verify preserved scratch/axis fields when skipped.
State-zero still exits before its distinct branch at `0x4abb30`. Normals in this
oracle have positive Y so their sum is nonzero, transforms are isolated roots,
and upstream forces/geometry are supplied. Degenerate normal sums, state-zero
orientation, subsequent rider/crash handling and whole-bike trajectories remain
outside this evidence. The playable preview has not adopted this partial core.

The initial state-zero control path `0x4abb30..0x4abef9` now matches 40,000
original executions across 16 output words
(`mcm-state-zero-control-validation.json`). This preserves limited/activation
gates, control-vector construction, scalar modifiers, conditional velocity
normalization and lateral deflection, speed recomputation, and 0.9 angular
velocity damping. Both axial and oblique velocities are tested around the
alignment thresholds, with both signs of the deflection multiplier. Inputs use
positive speed and a supplied component forward axis. This block is currently
isolated; its later timer/orientation code and its connection to the preceding
motion sequence still need recovery. Field labels retain unresolved semantics;
this result does not establish whole-bike trajectories or update the playable
preview's chassis behavior.

The active state-zero path now extends through `0x4ac17b`, including its
`+0xc6c/+0xc70/+0xc74/+0xc78` timer, sign, accumulator and phase state, normalized
control-vector rotation and pivot at `+0x66c`. All 38 output words match across
40,000 original executions (`mcm-state-zero-rotation-validation.json`). Fixtures
include inactive gates, phase/sign transitions, zero vectors and applied rotations.
Later `0x4a4b60` contact/event handling and the alternate state-zero path are not
included; this remains a supplied-state comparison rather than a whole-bike replay.

The shared oracle's bike buffer was expanded from `0x900` to the original `0xcc8`
allocation after compiler bounds diagnostics exposed access to the late fields.
The preceding state-zero-control oracle was rerun with the corrected buffer: all
40,000 cases still match, with the exact same result-file hash as before. Its
report and fixtures now record the corrected loader hash. New timer evidence uses
only the corrected allocation. A stack-relative operand error in the first
rotation translation was caught by the differential run and corrected before
retaining these passing fixtures.

The alternate state-zero alignment path `0x4ac1f7..0x4ac5c5` now matches 40,000
original executions across 32 output words
(`mcm-state-zero-alignment-validation.json`). It includes mask gates, optional
normal-axis pivot rotation and angular damping, construction of the correction
target, its minimum/maximum adjustments, directional rate limiting and the second
contact-axis pivot rotation. The maximum limit compares the magnitude saved
**before** the minimum correction is applied; the port preserves this ordering.
Fixtures span all four mask values, threshold-adjacent angles, both signs, cache
preservation and zero secondary axes. These are supplied-state root-transform
cases. This branch and the preceding active path still need the common
`0x4a4b60` contact/event helper, then full sequencing and trajectory comparison.

The common event **decision** function `0x4a4d70..0x4a52b9` now matches
48,000 original executions across 14 return/state/call-count words
(`mcm-event-decision-validation.json`). The recovered function preserves branch
priority, launch velocities, input-triggered events, suppression and other-bike
pointer clearing, animation-dependent flag changes, counter/angle/contact gates,
collision direction classification, and speed-change checks. All ten emitted
reason codes appear in the original results. Threshold-adjacent values and negative
zero are included; fixture input bit patterns preserve negative zero through JSON.
The input query and two random draws are supplied at their call boundaries, with
call counts and query arguments checked. This validates finite supplied state and
positive collision speeds; it does not validate the input subsystem or RNG here.
The caller `0x4a4b60` still needs its event setup, transform reparenting and rider
controller calls recovered before this decision joins the complete update. This
is not a whole-bike trajectory or playable-mode parity claim.

The rider-controller event entry `0x40fa10..0x40fbac`, called by the common
bike event setup, now matches 32,000 original executions across ten output words
(`mcm-rider-event-validation.json`). It selects an explicit/default event, chooses
three table entries, sets the two activation flags and copies linear velocity to
the previous-velocity field. Selection uses a binary32 store followed by x87
nearest-even integer conversion. An empty first group skips its random draw and
selects zero; the second and third groups always draw. Tests cover every event
kind 0–7 with both draw counts, group sizes up to five, zero/max random values,
and rounding boundaries. Event records and random draws are supplied inputs;
this does not yet recover live controller data or subsequent rider motion. The
remaining event wrapper includes transform extraction/reparenting and bike-field
setup, which must be connected before whole-update validation.

The event orientation call pair `0x4b7640` then `0x4b7270` now matches 32,000
original executions across 56 output words
(`mcm-event-orientation-validation.json`). This corrects the earlier provisional
“reparenting” description: these calls extract world forward/up axes and set
orientation; they do not change parent pointers. The port preserves the original
cross-product ordering, binary32 inverse-square-root stores, local translation,
and cache invalidation. Cases exercise root sources and sources parented to the
root target, all eight parent/cache combinations, and nonorthogonal finite axes.
Local matrices, both world caches, scratch axes and final valid flags are checked.
Parented targets and degenerate axes remain outside this recovered entry's scope;
it explicitly rejects a parented target. The subsequent `0x4309d0` operation
copies object bounds and dispatches virtual child callbacks. That dispatch and
the full event wrapper still need connected validation before whole-bike parity
can be claimed.

The connected event wrapper `0x4a4b60` now matches 48,000 original executions
across 104 output words (`mcm-event-transition-validation.json`). The harness
executes its real decision, orientation, bounds-copy and rider-selection callees;
only input-query results and CRT draws are supplied at external boundaries.
Validation includes no-event preservation, all emitted reasons, launch velocity,
orientation/cache changes, envelope setup, copied bounds, pitch-rate minimum,
rider velocity/selection/flags, resource selection and random-call consumption.
The first connected run exposed an integration error: the wrapper exchanges
arguments 10 and 11 before calling `0x4a4d70`. The corrected port and passing
fixtures preserve that exchange, with independently varied argument values.

This connected milestone is limited to root bike targets and bounds records
without child callbacks. The captured player's vtable is `0x4d9a94`; its slot
`+0x1c` resolves to `0x44fa70`. That callback selects a component transform via
`bike+0x234`, applies orientation and changes position through `0x4b7000` /
`0x4b7270` and `0x4b7860` / `0x4b77a0`. Those child-transform paths remain to
be recovered and connected. The port rejects nonempty bounds-child records when
the orientation branch runs. No whole-bike trajectory or full playable parity
claim follows from these supplied-state event tests.

The child callback's position operations `0x4b7860` (pointer arguments) and
`0x4b77a0` (scalar arguments) now match 40,000 original executions across 99
matrix/cache words (`mcm-position-transform-validation.json`). Both original
entry points execute their real world-transform and point-conversion callees.
The port preserves null-reference assignment, self-reference addition, conversion
from another reference through world space into the target parent's space, and
cache invalidation. The inverse helper stores inverse translation as binary32
before adding it to the transformed point; replacing this with a single inverse
matrix operation would lose the original rounding. Cases cover all four reference
kinds, both entry points, every cache combination, shared parents and finite
nonorthogonal matrices. The original uses a transposed rotation even for those
matrices; no general inverse is substituted. Non-self relative conversions require
a parent, matching the original dereference. Child orientation and complete
callback integration remain outstanding.

The nonzero `record+4` branch of the real child callback `0x44fa70` now matches
40,000 original executions across 105 output words
(`mcm-local-child-transform-validation.json`). The harness executes the component
index lookup, local orientation `0x4b7000` and relative position `0x4b7860` together.
It checks three nodes' local/world matrices and cache flags plus the callback's
in-place forward/up mutations. Unlike `0x4b7270`, this local orientation entry
retains the binary64 inverse-square-root intermediate while multiplying each axis
component, and sums squared components in a different order. The port preserves
both differences. Coverage includes all 32 parent/cache combinations, component
indices 0–7 and nonorthogonal, nondegenerate axes. The zero `record+4` callback
branch and dispatch over the complete bounds-child list still need recovery and
connection to the event wrapper; this milestone does not remove that wrapper's
child-list guard.

The zero `record+4` branch of `0x44fa70` now also matches 40,000 original
executions across 105 output words
(`mcm-relative-child-transform-validation.json`). This executes relative
orientation `0x4b7270` and scalar relative position `0x4b77a0` together, including
component lookup and mutations of the record's axes. The port includes the
separate pointer-argument matrix product `0x4b9bb0` and preserves its x87 sum
orders, rotation-only transposes, binary32 normalization and restoration of the
local translation. Coverage uses the same 32 parent/cache combinations and eight
component indices as the first branch. Both callback branches now have isolated
original-execution evidence; ordered child-list dispatch and their connection
inside the event wrapper remain outstanding. Null/self orientation-reference
paths are implemented but are not covered by this callback-specific report.

The event wrapper now executes ordered child callbacks instead of rejecting
nonempty bounds-child lists. The connected `0x4a4b60` oracle, using the captured
player vtable and real `0x430970` / `0x44fa70` dispatch, matches 48,000 original
executions across 197 output words (`mcm-event-children-validation.json`). Three
ordered records update two components, including repeated updates to the same
component, both callback branches, and sibling or parent-child layouts. In
addition to all previous bike/rider outputs, validation checks component local
and world matrices, cache flags and mutated callback record axes/positions.
This supersedes the earlier wrapper child-list exclusion for this tested graph
model. The original no-child fixtures remain in the regression suite.

The state adapter currently represents a root bike target, an independent or
bike-parented orientation source, and components whose parents precede them in
the array. Arbitrary aliasing between source and component nodes, parented bike
targets and captured live rider tables still need evidence. Input and random
values remain supplied call-boundary data. Full-update sequencing, live state
adaptation and whole-bike acceleration/release trajectory comparison remain
required before claiming complete physics parity.

The common post-event section `0x4ac6cd..0x4ac7c4` now matches 40,000 original
executions across 50 output words (`mcm-post-event-state-validation.json`). This
copies local transform position back to the bike, suppresses yaw rate below the
original signed-bit speed threshold with both contacts, converts angular velocity
to world space, advances the delayed-award timer, and copies suspension heights
and dt to their output fields. Its real `0x4b1a40` scoring arithmetic is executed:
scaled score minus its remainder modulo 100, followed by binary32 storage. The
settings flag can suppress the returned award. Optional UI observers are absent
in the harness; their callbacks are not part of this evidence. Coverage includes
root/parented transforms, cache states, speed boundaries, timer gates and negative
zero, whose input bits are retained in fixtures.

The sequencing trace also confirms that an event clears `bike+0x8c8` and reduces
the remaining update count to one. A no-event result calls `0x4aecb0` only on the
last scheduled update, before this common section. That rider/animation routine,
the object/collision callbacks starting at `0x4ac7c4`, and the subsequent scheduler
remainder handling are still required for a complete update and trajectory test.

The no-event rider routine's blend tail `0x4af185..0x4af6f6` now matches 48,000
original executions across seven output words (`mcm-rider-blend-validation.json`).
It includes directional peak tracking, conditional preservation, clamped envelope
movement, and inactive envelope reset plus component-angle-to-blend conversion.
The original stores the new envelope as binary32 but retains its extended value
to derive the blend; the port preserves that distinction. Fixtures cover positive
and negative control, signed zero, blend/angle/limit boundaries and dt above/below
the envelope duration. Inputs are finite with positive durations and component
limits. Earlier pose/trick selection, its helper calls and connection to the
complete rider routine remain outstanding; this does not establish whole-bike
trajectory parity.

Connected rider pose selection and blending `0x4aefcd..0x4af6f6` now match
48,000 original executions across 11 output words
(`mcm-rider-pose-validation.json`). The port includes lower/upper height selection,
the speed-14 branch, nearest-even pose-index conversion, the special speed-32
weight path, and the secondary-weight update/preservation rules, then executes
the recovered blend tail. Both the unrounded and binary32-stored pose-coordinate
values are needed at different points. Coverage includes threshold-adjacent
heights and speeds, both mode flags, steering samples and signed-zero blend
control. Earlier input/trick handling and the orientation reset before this
section still need to be connected; full-update and trajectory parity remain
unproven.

The trick-start helper `0x4a1970` now matches 48,000 original executions across
209 checked state words (`mcm-trick-start-validation.json`). It runs the real
orientation/bounds-child callbacks and both animation selectors `0x430a20`, with
all 16 trick indices and both orientation-reset paths. The port resets the
envelope and trick counters/flags, optionally resets orientation and dispatches
child records, and selects the rider and bike animation records. Pointer outputs
are compared as indices into supplied animation tables. Event and trick paths
now share the recovered graph/reset adapter; existing event fixtures continue to
check its behavior. Graph scope remains a root bike with the tested component
hierarchies and nondegenerate axes. Live animation tables, selection of a trick
from rider input, the nearby-bike interaction helper `0x4a16d0`, and full-step
trajectory validation remain outstanding.

Directional trick selection `0x4aee32` connected to the real trick-start helper
now matches 48,000 original executions across 210 checked words
(`mcm-trick-selection-validation.json`). The oracle exits at `0x4aed96` for the
dead zone or `0x4af6f6` after trick startup. The recovered path preserves the
unrounded squared-input dead-zone comparison, original coarse square root,
different stored/unrounded direction thresholds, both button-selected banks,
and all downstream orientation/child/animation mutations. Tests exercise all
16 trick indices and no-selection preservation with inputs around magnitude 0.5
and across direction sectors. The earlier input/button gates and nearby-bike
interaction branch remain outside this evidence, as do full-step trajectories.

The bike button-query path `0x4a4ab0`, real POV lookup `0x453fe0` and real input
aggregator `0x454f70` now match 48,000 original executions, including result,
number of polls and ordered device identities (`mcm-bike-input-validation.json`).
The port preserves AI/secondary-control gates, suppression of action 4/5 queries
when an active POV is present and engine/brake state is signed zero, both inactive
POV sentinels, and short-circuit polling across all six device slots. Device-level
responses at `0x452670`, `0x453cd0` and `0x454760` are supplied, with action/option
arguments checked by the oracle. Fixtures include every observed result/poll-count
combination. Device mapping and acquisition remain external; connection into the
complete rider update and full-step trajectory evidence are still required.

### Nearby-bike selection (2026-11-12)

Recovered the original bike iterator (`0x459e90`) and the connected nearby-bike
selection prefix (`0x4a16d0..0x4a17ba`). Selection excludes self and disabled
candidates, terminates on null list entries, and preserves the original mixed
float32/double distance calculation and comparison against the rounded best.
The iterator preserves its cursor when globally disabled and resets it at the
original end boundary, including the single-player special case.

Validation: 32,000 deterministic cases executed against the pinned PE under Wine,
with zero differences in iterator result/cursor and selected-bike identity.
The harness exits immediately after the original stores the selected bike;
angle, orientation, animation and full rider-update parity remain outstanding.
Report: `mcm-nearby-bike-validation.json`; reproduce with
`node scripts/mcm-reference/compare-nearby-bike-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
This is another dependency for the remaining interaction branch, not whole-bike
trajectory parity. The playable preview still uses the hybrid Cannon chassis.

### Nearby interaction angle gate (2026-11-12)

Extended the connected original execution through `0x4a1847`: candidate selection,
`fpatan` relative heading, float32 store, single +/-2pi correction, and the strict
absolute-angle gate at float32 0.698. No candidate preserves the previous angle.
The port matches all five output words in 32,162 cases, including 162 directed
float32 neighbors around +/-0.698, +/-pi and +/-2pi. Fixtures retain every directed
case and each selection/acceptance outcome. Report:
`mcm-nearby-interaction-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-nearby-interaction-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
The harness marks the accepted branch and returns before any orientation, state
or animation mutation; those remain outstanding, as does full rider-update parity.
JS atan2 agreement here is empirical for these finite cases, not an exhaustive
proof of agreement with x87 transcendental rounding.

Next dependency traced directly from disassembly: `0x430ab0` seeks the linked
animation frame whose index is nearest-even(float32((frameCount-1)*fraction-.5)),
copies its bounds, and dispatches each frame child through vtable slot +0x14.
For the bike that callback is `0x44f8b0`, not the bounds-reset `0x44fa70` callback.
It normalizes orientation using the existing local/relative helpers, but only
sets relative position when component table entry +0x38 is nonzero. The interaction
seeks rider record bike+0x778 and bike record +0x790 at fraction .5. Validate these
callbacks and the rider proxy's actual vtable before claiming the complete helper.

### Connected animation seek and bike child callbacks (2026-11-12)

Recovered `0x430ab0` frame selection, bounds copying and linked child dispatch,
connected to the real bike vtable callback `0x44f8b0`. The callback mutates record
axes, selects local versus relative orientation and applies position only when
component +0x38 is nonzero. The port keeps the original nearest-even conversion
and float32 intermediate when choosing the frame. Other animation state is
preserved; this is not the animation reset behavior of `0x430a20`.

40,000 original-execution cases produced zero differences across 119 output words:
three local/world matrices and cache flags, both child records' mutated axes,
selected frame/record identity and bounds. Cases cover 1–8 frames, five fractions
including the interaction's .5, empty/one/two-child lists, both orientation branches,
both position flags, component indices, and body/external parents. Ordered child
cases target the same component so prior mutation and cache invalidation matter.
Report: `mcm-animation-seek-validation.json`; reproduce with
`node scripts/mcm-reference/compare-animation-seek-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
The initial harness mismatch was an input adapter error (parent flag offset), fixed
before the successful runs; no original routines were replaced or patched here.

Still required: identify the rider proxy's actual callback table, integrate both
animation seeks with nearby interaction orientation/state updates, then connect
the full rider update. Whole-bike parity remains unproven and the playable preview
continues to use its hybrid chassis.

### Complete nearby interaction with both animation seeks (2026-11-12)

Recovered and validated the whole `0x4a16d0` helper: iterator/selection, angle gate,
orientation and bounds reset, interaction flags, +/-2.7 angle clamp and +/-0.7 lean,
progress reset, then rider and bike animation seeks in original order. The accepted
path resets orientation regardless of the incoming +0x820 flag. No candidate and
rejected-angle paths preserve the other transition state.

Rider proxy identity evidence: bike construction at `0x4a2519..0x4a2556` calls
`0x45bbc0`, which installs primary vtable `0x4d7b14`; slot +0x30 is `0x44ede0`
and the returned +0x404 interface is adjusted back before storage at bike+0xc8c.
Both that table and bike vtable `0x4d9a94` have `0x44f8b0` at slot +0x14.
The oracle uses those original tables and runs both real animation seeks.

48,000 cases, 220 compared words per case, zero differences. All frame counts
1–8 include no-candidate, rejected-angle and accepted-angle cases. Compared state
includes matrices/caches, mutated child records, bounds, animation record/frame
identity, flags, envelope, angle/lean/progress, and preserved unrelated fields.
The initial comparison exposed only signed versus unsigned representation of an
unchanged -1 state word; the comparison now consistently uses unsigned words.
Report: `mcm-nearby-transition-validation.json`; reproduction:
`node scripts/mcm-reference/compare-nearby-transition-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.

Scope: supplied finite state, root target, source root/child, nested/sibling
components, with bike and rider deliberately sharing the component graph and
child records to exercise mutation order. Independent rider graphs, live asset
records, full rider-input integration, and whole-bike trajectories remain open.
No full-physics parity claim follows from this helper validation.

### Rider-update control flow, pose and blend (2026-11-12)

Recovered the complete control flow of `0x4aecb0`, joining early state gates,
local-input gates, ordered actions 9/6/7, nearby/trick dispatch, the +0xc68 flag
branch, high-stance pose selection, orientation reset dispatch and ordinary
pose/blend. A nearby call returns immediately even if its callee rejects the
interaction. Queries 6 and 7 both occur before testing their combined result.
The high-stance branch sets +0x820 and updates pose/weight without rewriting the
next-pose or secondary-weight fields, then enters the common blend tail.

48,000 original-execution cases, zero differences in 20 words including query
order, all 16 trick indices, nearby/reset dispatch and pose/blend state. Fixtures
retain every one of the 19 observed dispatch outcomes and signed-zero controls.
Report: `mcm-rider-update-validation.json`; reproduce with
`node scripts/mcm-reference/compare-rider-update-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.

This oracle runs the original full rider function with recording adapters at
input query, nearby and trick calls. The orientation reset block is recorded,
then the original +0x820 clear runs. It therefore validates routing and pose/blend,
not the complete graph/animation integration. The recovered JS function likewise
accepts adapter callbacks that mutate its result state. Next, wire the already
recovered transitions and real graph resets into those adapters and validate the
connected original function without these transition substitutions. Full
whole-bike trajectories and the hybrid-preview replacement remain unfinished.

### Connected full rider update (2026-11-12)

Connected the recovered `0x4aecb0` control flow to real input gating/aggregation,
nearby interaction, trick startup, orientation reset, ordered bounds callbacks,
bike/rider animation selectors, pose selection and blend. The new original oracle
calls the full function normally and does not substitute its transition/reset
routines. Its only executed substitution is the device response at `0x452670`;
query arguments and order are recorded. Both original animation vtables remain
in use. The port's `updateMcmRiderStep` composes those same recovered paths and
returns their graph mutations together with rider state.

48,000 cases, 234 compared words per case, zero differences. Coverage includes all
16 trick indices, accepted nearby interactions, rejected/no-candidate nearby calls,
early exits, orientation resets, pose/blend branches and input-query order.
Fixtures preserve every observed animation/active/query outcome, signed-zero
controls, and signed-zero angular state. Report: `mcm-rider-step-validation.json`.
Reproduce with
`node scripts/mcm-reference/compare-rider-step-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.

Scope remains supplied finite state, a root target with source root/child,
nested/sibling components shared by bike and rider, and synthetic animation
records. Independent rider graphs, live animation assets and live state adapters
are not proved by this run. Whole-bike contact/force completion, deterministic
world checkpoints, original-versus-port trajectories and replacing the hybrid
preview chassis remain unfinished. This closes the transition-substitution gap
from the preceding rider-control validation, not the full physics objective.

### Connected substep remainder and orientation refresh (2026-11-12)

Recovered `0x43f870` angle extraction and connected it to the main update tail
`0x4ac89e..0x4ac94b`. The tail decrements the remaining substep count, consumes
+0x8c8 carry only when that count reaches zero and the signed float-bit comparison
exceeds float32 .0001, stores the reciprocal new timestep, then copies local
forward/up axes and refreshes the angle fields. Angle extraction uses hardware
square root and CRT acos, not the coarse physics sqrt table. Near +/-pi/2 pitch
it folds roll into yaw with the original one-step wrap; cached trigonometric
terms remain those calculated before that angle correction.

The helper and connected tail each match 40,000 original-execution cases with
zero differences (6 and 16 output words respectively). Cases include zero axes,
near-vertical pitch, random finite axes, all tested remainder outcomes, signed
zero carry and float32 neighbors of the carry threshold. Reports:
`mcm-orientation-angles-validation.json`, `mcm-substep-finish-validation.json`.
Reproduce with the corresponding `compare-orientation-angles-oracle.mjs` or
`compare-substep-finish-oracle.mjs` script, pinned executable, and fresh directory.

Still open immediately before this tail: proxy matrix synchronization
(`0x4b7a20`/`0x4b6d70`), collision object refresh `0x42a550`, collision dispatch
`0x42ccc0`, and their state-transition effects. The next iteration returns to
`0x4a5bd7` when remaining >0. This validation does not execute the full iteration,
complete contact/force generation, or establish whole-bike trajectory parity.

### Proxy transform synchronization (2026-11-12)

Recovered the null-reference matrix setter `0x4b6d70` and connected it to the
original world-matrix getter `0x4b7a20(null)`, as used at `0x4ac7ee..0x4ac80b`
and `0x4ac87e..0x4ac899`. Source world resolution and destination-parent resolution
retain their original cache effects. A parented destination uses the original
pointer-matrix product/rotation transpose and rounded translation difference,
with the original scalar summation order. The copied source matrix remains
separate from graph mutations while resolving the destination parent.

40,000 original-execution cases match all 115 output words: three local/world
matrices and cache flags plus the copied world matrix. Covers source root/child,
destination root/source-child/shared-parent and cache combinations. Report:
`mcm-proxy-transform-validation.json`; reproduce with
`node scripts/mcm-reference/compare-proxy-transform-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
Non-null reference matrix variants are not included in this implementation.

Next collision dependency: `0x42a550` transforms object +0x70 local center into
+0x7c world center for types 0/1, then enters `0x42a6e0`. That routine checks the
global enable at `0x4e3754`, unlinks active spatial-list entries (object +0x8c,
count +0x90, entry stride 0x18), and dispatches types 0..4 through `0x42b67c`.
The subsequent work includes grid insertion/allocation and cannot be represented
by matrix copying alone. Collision dispatch `0x42ccc0`, complete main-step
sequencing and whole-bike trajectory comparisons remain outstanding.

### Collision world center and type 0/1 spatial-grid updates (2026-11-12)

Recovered `0x42a550` world-center calculation and the type 0/1 path through
`0x42a6e0`: unlink existing active entries, calculate four corner cells, suppress
duplicate cell insertions, and append entries to each cell's linked-list tail.
Entry owner/auxiliary metadata and unused cell indices survive unlinking. The
world center still updates when the global spatial-grid enable is off. Types 2
and invalid values unlink but do not insert; types 3/4 remain unrecovered.

Grid coordinates use truncation toward zero through original `0x4be978`, not
floor. Thus coordinates between -1 and 0 map to cell zero. Out-of-range corners
use the extra cell at dimension squared and participate in duplicate suppression.
The four entry slots correspond to corner order, rather than a packed unique list.

32,162 original-execution cases match 222 words each with zero differences:
world center, all entry words with normalized pointers, and cell/neighbor links.
Includes 162 directed boundary cases, dimensions 1–8, cell sizes .5–100,
prepopulated lists, multiple old entries in the same cell and one-to-four unique
new cells. Report: `mcm-collision-grid-validation.json`; reproduce with
`node scripts/mcm-reference/compare-collision-grid-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.

Scope uses existing four-entry storage. Allocation, types 3/4, collision dispatch,
main-update integration and complete world checkpoints/trajectories remain open.
The original routine was executed without patched callees for these cases.

### Collision entry allocation (2026-11-12)

Extended type 0/1 grid updates to allocate four entries when object +0x8c is null.
The original initializes previous/next, owner, auxiliary and active fields, then
inserts unique corner cells. It leaves cell-index fields uninitialized for corners
that have never been inserted. The JS port represents those with absent cell
properties rather than assigning a fictitious initial cell. Disabled updates and
types 2/invalid do not allocate entries.

32,162 cases match 223 output words with the original CRT allocator running under
Wine, without an allocation stub. The harness initializes the original CRT heap
and thread state and keeps allocated blocks until process exit. It checks entry
count, initialized entry metadata, world center, and all observable cell/neighbor
links. Fresh inactive cell-index words alone are normalized to zero in both
comparison outputs because the original leaves them undefined. Existing-entry
cell indices remain fully compared. Includes fresh and existing entry storage,
empty/no-allocation outcomes and directed cell boundaries.
Report: `mcm-collision-grid-allocation-validation.json`; reproduce with
`node scripts/mcm-reference/compare-collision-grid-allocation-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.

Types 3/4 have separate spatial insertion paths and remain open, along with
collision dispatch and integration into complete original-versus-port trajectories.
This allocation validation does not claim memory-allocator implementation parity.

### Type 3 collision line-grid insertion (2026-11-12)

Recovered the full type 3 branch `0x42a9a0..0x42b00d` and connected it to common
grid dispatch/unlinking. It inserts both endpoints, then traverses X and Z at
cell-size increments using float32 deltas and intermediate coordinates. New nodes
are individually allocated and inserted at the cell-list head, rather than held
in the object's four-entry array used by types 0/1.

Preserved two original quirks: duplicate-owner checks examine the sentinel and
all nodes with successors, excluding the tail; the Z traversal uses the X origin
when constructing its intermediate Z coordinate, while its interpolation subtracts
the Z origin. Neither behavior is replaced with a conventional line rasterizer.

16,000 original-execution cases match all 1,236 output words with zero differences.
Original CRT allocation runs unmodified. Checks ordered owner/auxiliary/active
fields, list lengths and previous-link consistency for every cell; uninitialized
cell-index fields are excluded. Cases include differing grid origins, both signs
of axis delta, zero-length axes, dimensions 1–8, empty lists and one/two existing
neighbors, matching sentinel/tail owners and disabled updates.
Report: `mcm-collision-line-grid-validation.json`; reproduce with
`node scripts/mcm-reference/compare-collision-line-grid-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
Type 4, collision dispatch, main-step integration and whole-bike parity remain open.

### Type 4 collision grid branch (2026-11-12)

Traced the separately compiled type 4 branch (`0x42b00d..0x42b673`), including
both endpoint insertions and both axis traversals. Its observable behavior matches
the type 3 traversal, including the tail-excluding owner test and X-origin use
in Z traversal. Dispatch now shares the recovered implementation for types 3/4.

The original type 4 branch was executed independently for the same 16,000 cases.
All 1,236 output words per case match, and its result SHA256 is identical to the
original type 3 run. The regression test therefore checks both types against the
same captured fixture without duplicating it. Separate original source/report:
`collision-type4-grid-oracle.c`, `mcm-collision-type4-grid-validation.json`.
Reproduce with
`node scripts/mcm-reference/compare-collision-type4-grid-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
Collision dispatch and complete simulation integration remain unfinished.

### Collision dispatch and sphere pair (2026-11-12)

Recovered connected dispatch `0x42ccc0`, candidate preparation `0x42b870`,
pair-state gate `0x42ca00`, and type 0/type 0 primitive `0x42c0e0`. Preserves
protected pair states, symmetric hit/miss updates, original depth calculation,
asymmetric contact-field copies and ordered primary/secondary callbacks.

32,000 original-execution cases match all 66 output words with zero differences,
covering four objects, repeated cell/owner references, enable flags, protected
pair states, and zero through six observational callbacks. Report:
`mcm-collision-dispatch-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-collision-dispatch-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.

Other primitive combinations, mutating gameplay callbacks, full simulation
integration and whole-bike trajectory parity remain unfinished.

### Oriented ellipsoid contact and collision routing (2026-11-12)

Recovered type 1/type 1 primitive `0x42bab0`: broad-radius rejection,
inverse-transform support directions, per-axis extent scaling, coarse square
root/inverse square root, depth, contact position, opposite normals, and
penetration vector. All float stores and instruction-order sums are preserved.
40,000 original-execution cases with full 3D rotations match all 14 output words
with zero differences (4,690 hits). Inputs use positive extents/radii and distinct
finite centers; coincident/degenerate inputs remain outside this validation.

Connected the recovered primitive to default collision dispatch. A further
32,000 original-execution cases match all 66 words, including original no-hit
combinations, invalid type IDs, protected pairs and ordered observer callbacks.
The original deliberately returns no hit for most type combinations, including
type 2/type 2 after local scratch calculations and type 4 as the first object.
Unrecovered line/ellipsoid combinations throw explicitly instead of returning a
fabricated result. Reports: `mcm-collision-ellipsoid-validation.json` and
`mcm-collision-routing-validation.json`; reproduce with corresponding
`compare-collision-ellipsoid-oracle.mjs` / `compare-collision-routing-oracle.mjs`,
pinned executable path, and fresh output directory.

Line/ellipsoid contacts, mutating gameplay callbacks, connected main-step
integration and end-to-end original-v-port whole-bike trajectories remain open.
These checks do not establish full physics parity.

### Line contacts and complete collision type routing (2026-11-12)

Recovered horizontal line/ellipsoid `0x42c1b0` and spatial segment/ellipsoid
`0x42c5b0`, including projection clamps, distinct broad-phase radius rules,
oriented extent support, depth, and writes that occur before a rejected contact.
The horizontal response follows a directed line perpendicular; the spatial
response follows separation. Both preserve the original untouched other-object
normal field rather than synthesizing a symmetrical result.

40,000 original-execution cases match every hit flag and all thirteen contact
state words with zero differences: horizontal 5,385 hits / 14,615 misses; spatial
3,120 hits / 16,880 misses. Positive extents, nondegenerate segments, finite
nonzero separation and full 3D rotations are covered. Degenerate/zero separation
remains outside the math-helper contract and this validation.

Connected all type routes in `collision-dispatch.js`. Another 32,000 cases match
all 66 outputs using original dispatcher and actual primitives, with every pair
of types -1 through 5 exercised. Hit/miss coverage includes both horizontal
argument orders and the original asymmetric spatial route (1/4; 4/1 is no hit).
Reports: `mcm-collision-line-validation.json`,
`mcm-collision-routing-full-validation.json`; reproduce with corresponding
`compare-collision-line-oracle.mjs` / `compare-collision-routing-full-oracle.mjs`
and the pinned executable plus fresh output directory.

All primitive type routes are implemented for the validated finite domain.
Gameplay-mutating collision callbacks, complete main-step integration and
original-v-port whole-bike trajectories remain unfinished; full parity is not
yet established.

### Single-body collision impulse and callback map (2026-11-12)

Recovered `0x45b3c0`: normal contact speed, type-3 separating gate, inverse
rotation of the lever/normal cross product, inverse-inertia scaling, effective
mass, restitution impulse, optional linear scaling and original angular limiter.
Includes `0x4b85c0` forward-vector rotation with instruction-order sums.
40,000 original-execution cases match all 24 output words with zero differences
(linear/angular velocity, impulse, resolved world matrix and cache flag). Covers
cached/uncached root transforms, full 3D rotations, stationary contacts, all
type gates, positive inverse mass/inertia, and signed angular scales.
Report: `mcm-collision-impulse-validation.json`; reproduce with
`node scripts/mcm-reference/compare-collision-impulse-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.

Constructor `0x4a396d/0x4a397d` assigns bike primary callback `0x49e490` and
secondary `0x49e610`. These apply cooldown/secondary-bike gates, optional tag
transfer (`0x4b1d30`), then collision response `0x49d900`. Secondary sets bike
`+0x8a8` before invoking primary. Response type 0 uses the other bike; type 1
uses its rider/proxy body; type 2 is static contact.

Static response calls bike wrapper `0x49d7f0`, which invokes the recovered
`0x45b3c0`. Wrapper arguments are normal, contact velocity, world lever, local
lever, angular scale, type, linear scale. State `+0x844` selects inertia `+0x5fc`
and restitution .1 (linear scale forced zero), otherwise inertia `+0x5f0` and
restitution `+0x5e0`. It updates angular `+0x534`, linear `+0x510`, copies local
lever to `+0x654`, then for type !=3 rotates angular into `+0x528` and reports
to `0x427110`. Dynamic response instead calls paired-body solver `0x45b6b0`.
The response ends with collision/proxy transform synchronization, grid update,
and possible event wrapper `0x4a4b60`. These wrappers and paired-body solver
remain to be connected and validated; this milestone alone is not full parity.

### Paired-body impulses and bike impulse wrapper (2026-11-12)

Recovered `0x45b6b0`, including relative contact velocity, both bodies' rotated
inertia contributions, effective mass, impulse, and linear/angular updates.
The original uses an unstored impulse intermediate for A's linear update, then
the stored float for angular and B updates. A null B velocity destination skips
both B output updates but still uses B mass/inertia and resolves its transform.
40,000 original-execution cases match all 47 output words with zero differences,
including both linear/angular velocities, impulse and both transform caches.

Connected bike wrapper `0x49d7f0` to the recovered single-body solver. State
selects restitution/inertia/linear-scale rules; the local lever is copied even
when a type-3 separating contact skips solving. Other types refresh world
angular velocity and invoke an optional audio notification adapter. A further
40,000 cases execute the real original wrapper, solver, transforms and audio
routine with a nonmatching listener (no playback). All 29 outputs match. Audio
playback side effects are outside this physics validation.

Reports: `mcm-collision-pair-impulse-validation.json` and
`mcm-bike-collision-impulse-validation.json`. Reproduce via matching
`compare-collision-pair-impulse-oracle.mjs` /
`compare-bike-collision-impulse-oracle.mjs` with pinned executable and new output
directory. Input coverage uses finite supplied states, positive inverse mass
and inertia, full 3D root transforms, and zero/nonzero relative motion.

The main collision response `0x49d900`, primary/secondary callback gates, tag
transfer, and final event/grid integration still require recovery/connection.
Complete original-v-port trajectories and full physics parity remain unproven.

### Connected static collision response (2026-11-12)

Connected `0x49d900` type 2 through position correction, world/local lever
calculation, scaled contact-point angular velocity, real bike impulse wrapper,
speed refresh and low-speed stop, collision matrix/proxy synchronization, and
grid unlink/reinsertion. Preserves two ordering details: position correction
does not rewrite the source transform, and stopping angular Y does not redo the
earlier world-angular refresh.

32,000 original-execution cases match 179 output words each with zero
differences. The original response executes its real impulse solver, transform
helpers, grid update and inactive audio routine. Coverage includes state 0/1/2,
position-correction suppression, stop/nonstop, cached/uncached root transforms,
proxy synchronization and enabled/disabled grids with preexisting list entries.
Report: `mcm-static-collision-response-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-static-collision-response-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.

Visual effects are disabled in the original fixtures. State/secondary flags
naturally suppress the final event transition; the port requires an explicit
transition adapter if that gate is entered. These effect/event boundaries,
dynamic contact types, primary/secondary callback gates, and full main-step
integration remain outstanding. No full whole-bike parity claim is made.

### Connected dynamic collision response (2026-11-12)

Connected original `0x49d900` types 0/1 through bike/rider mass and inertia
selection, heading-dependent contact velocity scaling, position correction,
paired impulse, local lever/world angular refresh, speed, proxy and grid updates.
Preserves the original callback ordering: this response updates only its own
bike, leaving the other body's velocities for its separate response callback.
Rider contacts select primary or alternate rider motion when the other bike is
in a nonzero state. The signed heading wrap and floating-point store boundaries
are preserved.

32,000 original-execution cases match 263 output words each with zero
differences. Coverage includes all 144 combinations of contact type, both bikes'
state 0/1/2, position correction gate, and both independent rider flags, plus
cached/uncached full 3D root transforms and enabled/disabled linked-list grids.
The original executes its real paired solver, transforms, grid updates and
inactive audio routine. Retained fixtures include every state/flag combination.
Report: `mcm-dynamic-collision-response-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-dynamic-collision-response-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.

Visual effects and final event transitions remain suppressed in this validation;
the port requires an explicit event adapter when the final transition gate is
entered. Primary/secondary callback gates, tag transfer, event integration,
full main-step orchestration and complete original-v-port trajectories remain
outstanding. This is not evidence of complete whole-bike parity.

### Collision callback gates and connected dynamic response (2026-11-12)

Recovered primary `0x49e490` and secondary `0x49e610`. Preserves own/other
cooldown gates, secondary field618 and state-2 gates, secondary position-
correction suppression, and the rider-to-own-bike identity exception. Tag
transfer changes the holder before the reset callback, then sends its
notification before setting both bikes' five-second cooldowns. A matching tag
player with a third-party holder reaches the response without the usual other-
bike cooldown gate. Unknown classes reach response routing but do no work.

11,520 exhaustive original callback cases match 23 output words each with zero
differences. These cover both callbacks, classes 0..4, all Boolean gates, states
0/1/2, tag presence/player/holder selection and self-rider aliasing. Response,
tag reset and network notification are instrumented boundaries in this suite;
it validates their call order and arguments, not their downstream behavior.
Report: `mcm-collision-callback-validation.json`.

A separate 32,000-case suite executes the real original callbacks connected to
`0x49d900`, paired impulse, transforms, proxy/grid and inactive audio. All 264
words match with zero differences across 1,152 combinations of callback,
cooldowns, dynamic contact type, both states, position gate and rider flags.
Tag is disabled and the final event gate naturally suppressed here. Report:
`mcm-connected-collision-callback-validation.json`. Reproduce with the matching
`compare-collision-callback-oracle.mjs` or
`compare-connected-collision-callback-oracle.mjs`, pinned executable, and a fresh
output directory.

The port defaults to the recovered static/dynamic responses and requires tag
reset/notification adapters for those branches. Full dispatcher execution with
mutating bike callbacks, final event integration, tag reset internals and full
main-step/trajectory parity remain outstanding.

### Collision response through final crash event (2026-11-12)

Connected `0x49d900` types 0/1/2 to the real `0x4a4b60` event transition,
including its decision, orientation reset, bounds copy and rider animation
selection. The adapter reads the bike after impulse, speed refresh and
proxy/grid synchronization and passes the original collision arguments,
including the wrapper's impulse/type argument ordering. It updates the shared
bike velocities, state, scratch vector and transform and returns the remaining
event/rider state for the caller.

32,000 original-execution cases match 367 output words each with zero
differences. Both dynamic types and static contacts cover event/no-event,
orientation reset on/off, parented/root source components, cached transforms,
linked grid updates, rider selection and input/RNG call counts. Finite supplied
states include zero speed on either bike. Contact type varies independently of
the event scenarios. The original response, impulse, event, orientation and
rider callees run together; only input-query results and CRT draws are supplied.
Visual effects and active audio are disabled; bounds children are absent in
this suite. Report: `mcm-collision-event-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-collision-event-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.

This connection exposed and fixed a previously untested zero-speed decision:
x87 invalid normalization stores negative indefinite NaN, whose unsigned bits
select event kind 3. Depending on a JavaScript NaN's sign incorrectly selected
kind 4/5 and different rider records. Stopped-bike cases are now retained among
the original-execution fixtures.

Full dispatcher traversal with mutating gameplay callbacks, persistent event
state adaptation in the full main step, tag reset internals and complete
original-v-port trajectories remain outstanding. Full physics parity is not
yet established.

### Main-step collision phase with live gameplay callback (2026-11-12)

Recovered `0x4ac7c4..0x4ac89e`: clears the collision's previous other-object
pointer, synchronizes world/proxy matrices, refreshes grid membership, and
enters the real dispatcher unless the secondary-contact flag suppresses it.
Suppression clears that flag after synchronization. Missing collision objects
still synchronize the proxy but leave the flag and other state alone. A
state-zero to nonzero transition during dispatch sets remaining substeps to
one and clears carry time; an already-crashed bike does not take that branch.

32,000 cases match 409 output words each with zero differences. The original
section executes real transform/grid helpers, live dispatcher traversal,
horizontal-line contact generation, primary bike callback, static impulse and
final crash/rider event. Its callback updates the same grid being traversed;
contact pointers, pair table, scratch contacts, grid links, bike/proxy state,
event/rider state, remaining substeps and carry all match. Inputs cover missing
objects, enabled/disabled objects/manager/grid, pair exclusion, broad-phase
misses, contact hits, both suppression flags and initial states 0/1/2.
Suppression varies independently of event scenarios.

Report: `mcm-collision-substep-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-collision-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
The harness enters/exits the original section using its real stack/register
layout; it does not replace the dispatcher or gameplay callback. Input-query
results and CRT draws remain supplied boundaries. This suite uses one static
line and one bike, root bike transforms, no bounds children, inactive audio and
no visual effects. Dynamic multi-bike dispatch, persistent event state across
full steps, tag reset internals and complete trajectory parity remain open.

### Two-bike dispatch with ordered gameplay responses (2026-11-12)

Bound the recovered primary/secondary callbacks to live collision objects.
Each callback resolves the other bike from the current contact, so a primary
response's velocity, crash state, transform and grid mutations are visible to
the secondary response. Both responses share the same pair table and grid.

32,000 original-execution cases match 473 output words each with zero
differences. The original main-step collision section runs real ellipsoid
contact generation, both ordered callbacks, paired impulse solvers, proxy/grid
updates and first-bike crash/rider transitions. Secondary responses run for
all three initial states, including the second bike's real final event call in
a supplied nontriggering timing state. Outputs cover both bikes' motion,
transforms, contact vectors, both sets of grid entries, pair table, first-bike
event state and remaining/carry time. A disabled third grid owner also verifies
that traversal ignores disabled objects.

Report: `mcm-bike-pair-substep-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-bike-pair-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
Both collision bodies use type-1 ellipsoid primitives and class-0 bike responses;
rider-class dispatch is not included here. A triggered second-bike event,
tag reset internals, persistent event adaptation across complete steps and
whole-bike acceleration/release trajectories remain outstanding. This does
not establish complete physics parity.

### Connected common substep tail (2026-11-12)

Connected `0x4ac6cd..0x4ac94b` as one original-code sequence: local position
copy, low-speed yaw-rate suppression, world angular refresh, delayed award,
suspension/dt output copy, two-bike grid/contact/callback/event processing,
remaining/carry scheduling and orientation extraction. The adapter passes
current suspension heights and the delayed-award flag into the collision event;
stale heights otherwise selected the wrong crash reason and rider animation.

32,000 cases match 496 output words each with zero differences. Carry values
vary independently of remaining-count values and include both sides of the
float32 .0001 threshold. The suite checks that a collision crash clears carry
and ends the substep sequence, while a non-crash with sufficient carry schedules
one extra update and changes dt/reciprocal dt. Both outcomes have retained
fixtures. Initial state 0/1/2, delayed award/suppression/timer branches,
suspension-height event branches, both ordered bike responses and final
orientation are covered in the connected run.

Report: `mcm-substep-tail-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-substep-tail-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
The original section executes continuously, including real CRT angle helpers,
scoring arithmetic, collision/event routines and grid mutations. Its fixture
scope retains the prior two-bike harness limitations: root bike transforms,
no bounds children or active audio/visual/UI observers, supplied input/CRT
random draws, and a nontriggering second-bike event timing state. The loop
backedge to earlier force/contact work, persistent full-step state adaptation,
remaining update-end work and full acceleration/release trajectories are still
required before claiming complete parity.

### Connected substep start and analog engine input (2026-11-12)

Recovered and connected `0x4a5bd7..0x4a5e27`: shift-timer decrement/clamp,
brake input/ramp, engine release flag, crashed-state mass substitution,
digital or analog throttle, automatic shifts, previous-speed refresh, vertical
acceleration filtering and low-speed/nonfinite velocity stop. Automatic shifts
read the old saved speed before this section overwrites it with current speed.
Brake and throttle queries retain their original order and gating.

The analog path uses the engine's stored filter duration, preserves the filter
value separately from the .2 dead-zone/1.0-clamped demand, and compares the raw
input against the original double .05 release threshold. The vertical filter
uses the stored duration and the supplied inverse timestep, then saves vertical
velocity before the low-speed stop clears the velocity vector. Brake ramp
increments are per substep, rather than multiplied by dt.

40,000 original-execution cases match 33 words each with zero differences.
The original sequence runs real input gate/aggregator, brake clamps, both
throttle paths, gear helper, acceleration filter and finite-speed check. Only
the primary device response and CRT shift draw are supplied. Cases include
states 0/1/2, rider flags, AI/secondary input gates, timer expiry, shifts both
ways, old/current speed differences, analog dead-zone/saturation inputs,
filter durations above/below dt, and speeds around float32 .001. Fixtures retain
all observed branch outcomes and check device poll order and RNG call count.

Report: `mcm-substep-start-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-substep-start-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
Inputs are finite with positive filter durations and the captured five-gear
parameter table. Arbitrary device/POV layouts remain covered separately, not
by this connected run. Contact generation and full loop/state integration are
still required before comparing whole-bike acceleration/release trajectories.

### Connected suspension reset and contact-transform preparation (2026-11-12)

Extended the continuous substep start through `0x4a5ea5`. Original front reset
`0x49eaf0` clears its limit flag and local translation only; rear reset
`0x49ed20` clears its flag and restores the saved local matrix. Both execute
the original cache-invalidating helpers. The subsequent `0x4b7950` null-reference
query resolves the designated node's world position into bike+0x504. The seven
temporary-vector constructor calls at `0x40ded0` do not initialize storage;
the port preserves supplied scratch values rather than inventing zeroes.

40,000 original-execution cases match 257 output words each with zero
differences. This includes all prior connected engine outputs plus six nodes'
local/world matrices and cache flags, both limit flags, the reference position
and seven unchanged scratch vectors. Graph coverage includes root nodes,
front/rear ancestor relationships in either direction, separate branches,
aliased front/rear nodes and position queries on every node. Cached/uncached
states exercise the original rule that invalidating an already-invalid node
skips its descendants. Real full-3D matrix resolution runs inside the original
sequence; only the device response and shift RNG remain supplied boundaries.

Report: `mcm-contact-preparation-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-contact-preparation-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
The settings-dependent contact-query branches after `0x4a5ea5`, contact/force
assembly and whole-loop state adaptation are still required before full
acceleration/release trajectory parity can be claimed.

### Wheel-contact terrain samples and front frame (2026-11-12)

Recovered the continuous `0x4a0130..0x4a0442` sequence: rear and front terrain
height/normal samples, world-space forward/up resolution, contact-axis helper
`0x4a1450`, front tangent and normal construction, normal orientation correction,
wheel-radius offset, and the offset terrain resample. Zero cross products retain
the original forward fallback. Missing terrain preserves supplied normal storage.

40,000 original-execution cases match all 80 output words with zero differences.
The oracle runs the real terrain, transform, cross-product and inverse-square-root
helpers. Inputs exercise full 3D root transforms, cached/uncached matrices,
leaf/child/parent terrain traversal, absent child tables, empty child tables and
null terrain roots. Outputs include all ten point/normal/axis arguments, unchanged
height arguments, bike tangent/normal/offset, local/world matrices and cache flag,
and the routine's forward and resample-normal scratch vectors.

Report: `mcm-wheel-contact-frame-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-wheel-contact-frame-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
This validates the front preparation section with synthetic terrain and finite
inputs; rear contact construction, contact-depth processing, connection to the
main substep and full acceleration/release trajectory parity remain unfinished.

### Both wheel frames and initial contact heights (2026-11-12)

Extended the continuous wheel-contact query through `0x4a06ee`. The rear axis
uses the bike's stored forward/up vectors; its tangent falls back to stored
forward when the cross product is zero. The routine overwrites the shared
normal/offset scratch fields with the rear result, offsets the rear wheel by
its own radius, resamples terrain and writes both terrain-minus-contact height
differences. The front tangent and original forward/resample scratch survive.

40,000 original-execution cases match all 86 output words with zero differences.
The oracle executes both frames and all four terrain queries continuously.
In addition to front-frame terrain/cache coverage, inputs include independent
rear radii, arbitrary stored forward/up vectors, parallel rear axes, zero rear
normals and seeded rear scratch normals for absent terrain. Regression fixtures
retain the first case for each combination of these conditions as well as a
deterministic sample of the remaining cases.

Report: `mcm-wheel-contact-pair-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-wheel-contact-pair-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
Pitch-dependent contact corrections and the rest of `0x4a0130` remain pending.
The two-wheel query is not yet connected to a recovered full substep, so this
does not establish whole-bike acceleration/release trajectory parity.

### Complete wheel-contact query and penetration selection (2026-11-12)

Recovered the remaining `0x4a0130` sequence through its return: heading/roll
probe points, both additional terrain samples, refined contact frames and
radius offsets, final samples, greater-penetration selection, and conditional
normal/tangent replacement (including helper `0x4a15a0`). The shared scratch
normal/offset fields preserve the final rear refinement even when the earlier
contact wins. Finite float32 pitch cannot equal the original double pi/2
comparison constant, so finite inputs always use its heading-based probe path.

The original calls imported `D3DRMVectorRotate`. The reference game uses Wine
11's D3DRM DLL, SHA-256
`7edb1ed218aececbb44f4d92d5b0880f0ff1777dc525e555140f987015d8be1a`.
The oracle loads that real helper, copies the loaded DLL to temporary output,
and verifies its hash before accepting results. The port preserves the DLL's
float32 quaternion multiplication and normalization, rather than substituting
a direct sine/cosine rotation. This is runtime-specific evidence; it does not
validate arbitrary Windows D3DRM versions.

40,000 continuous original-execution cases match all 110 output words with
zero differences. Coverage includes all four front/rear penetration selections
combined with all four normal-change combinations, hierarchy/cache cases,
parallel axes, flat/zero normals, identity/full-3D transforms, heading values
at zero and float32 multiples of pi/2, and roll values at zero and +/-1.
Fixtures retain every observed outcome combination and deterministic samples.
Report: `mcm-wheel-contacts-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-wheel-contacts-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.

Zero-normal cases exposed an overly restrictive inverse-square-root guard.
The original lookup returns a finite estimate for zero and subnormal inputs;
these now execute the same lookup instead of throwing. Independent validation
matches 58,961 binary64 outputs, including signed zero and all subnormal seed
boundaries. Updated report: `mcm-inverse-sqrt-validation.json`.

Scope remains finite supplied state, synthetic terrain, and the pinned runtime.
Main-substep contact-query dispatch, force assembly and whole-loop integration
are still required before full acceleration/release trajectory parity is proven.

### Ordinary main-substep wheel-query connection (2026-11-12)

Connected `0x4a63d2..0x4a647a`: clear bike+0x6b0, resolve the rear wheel's
world position, then the front wheel's world position, and execute the complete
wheel-contact query. Original stack argument locations and bike+0x590/+0x594
height outputs are captured at the main routine boundary. The real transform
and contact helpers run continuously inside this sequence.

40,000 original-execution cases match 210 output words with zero differences.
Four-node parent graphs cover all 16 front/rear node pairings, including wheels
sharing each other or the contact-frame node, cached/uncached query transforms
independently for each pairing and terrain mode, and ancestor/cache propagation.
Outputs include complete contact results and scratch, every node's local/world
matrices and cache flag, and the cleared field. Leaf-only synthetic terrain is
scaled to keep transformed wheel positions within its allocated tile.

Report: `mcm-substep-wheel-query-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-substep-wheel-query-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
This connects the ordinary query branch only. The alternate settings-dependent
branch, common work after the query and force/whole-loop integration remain
pending; this does not establish full acceleration/release trajectory parity.

### Alternate-contact bike reset (2026-11-12)

Recovered complete reset `0x4a1a40`, called by the alternate pose/contact
routine `0x49f8f0`. It clears motion/event/contact fields, restores mass from
bike+0x68c, resets optional components, and resets the engine to gear zero with
one CRT draw for its new threshold. The inverse mass uses the unrounded mass
product; field+0x814 clears only its low byte. Fields outside the original
write set remain unchanged, including component parameters and engine filters.

8,192 original-execution cases match all 1,043 output words with zero
differences. Each comparison covers the complete 0xcc8-byte bike allocation,
four component buffers, engine allocation, optional effect buffer, and RNG
call count. All 64 optional-component combinations run with zero, maximum and
varied CRT draws. Allocations start with independent finite sentinel values;
the packed byte field starts with arbitrary bits. Supplied pointer slots are
restored to their input sentinels before comparison; only CRT rand is replaced.

Report: `mcm-bike-reset-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-bike-reset-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
Source mass is positive and source time/threshold parameters are finite.
The reset is validated independently; the subsequent pose rebuild, terrain
alignment and alternate-path integration remain pending before whole-loop
acceleration/release parity can be established.

### Connected alternate reset and initial pose rebuild (2026-11-12)

Recovered the continuous `0x49f8f0..0x49fa3c` sequence. It executes the full
bike reset, copies supplied forward/up vectors, places the body at input x/z
and local y=100, and saves that position. A vertical/zero forward vector uses
the supplied up vector with a sign selected from the original forward-y bits.
The path then sets world-up, flattens forward-y, applies local orientation to
body and component, and calls the original zero-angle component handoff.

Both orientation calls normalize and overwrite the same forward/up storage.
The second normalization is retained even when the body and component share
one node. The zero-angle handoff copies the body local matrix, zeros component
translation and still executes the axis-angle matrix operation. Cache
invalidation follows the original rule that an already-invalid node skips
its descendants. The saved bike position can consequently differ from the
final local translation when the two nodes alias.

8,192 original-execution cases match all 1,176 output words with zero
differences. Outputs include the full bike/component reset allocations and
random-call count, four nodes' local/world matrices and cache flags, and the
component angle. Cases cover all 64 optional reset-component combinations,
all 16 body/component node pairs, parent graphs, cached/uncached nodes, and
vertical, zero and general forward vectors. Fixtures retain every component
presence pattern, every node-pair/vertical combination, and periodic samples.
Only CRT rand is supplied; reset, orientation, finite check, matrix copy,
translation, rotation and invalidation helpers execute inside the original.

Report: `mcm-reset-pose-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-reset-pose-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
Source parameters are finite and the component rotation axis is nonzero.
Terrain alignment after this initial pose, remaining alternate-path work and
whole-loop integration are still needed for full trajectory parity.

### Connected alternate terrain support and pivot alignment (2026-11-12)

Extended the continuous reset/pose sequence through `0x49fcd0`. It reads rear
then front wheel world positions, samples their terrain heights, sets the two
normal outputs to world-up, and places the body at the higher support height.
It derives half the slope angle from the height difference and bike+0x5d8,
rotates about the corresponding positive/negative bike+0x5dc wheel pivot, saves
the resulting local position, resolves body world orientation and applies it
to the component with orthogonalization disabled. Shared forward/up arrays
retain the relative-orientation helper's float32 normalization stores.

16,384 original-execution cases match all 1,208 output words with zero
differences. The comparison retains complete bike/component allocations, RNG
count, four transform nodes, component angle, ten contact argument vectors and
both height outputs. Cases cover both higher-support branches (including
equal heights), all body/component and front/rear node pairings, shared nodes,
parent graphs, cached/uncached transforms, optional engine/effect state, and
leaf/child/parent/missing/null terrain. The four wheel/pose components are
present because this original path dereferences them unconditionally.

Report: `mcm-reset-terrain-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-reset-terrain-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
Only CRT rand is supplied; all reset, terrain, transform, pivot-rotation and
relative-orientation helpers execute inside the original sequence. Inputs are
finite, with positive wheelbase/pivot distances and synthetic terrain bounded
for the leaf-only cases. The subsequent orientation-angle/contact query,
final correction and whole-loop integration remain pending before full
acceleration/release trajectory parity can be claimed.

### Alternate contact query and final correction (2026-11-12)

Extended the alternate reset sequence through `0x49fe3a`. The first boundary
at `0x49fd8b` includes orientation extraction `0x43f870` and the complete
`0x4a0130` wheel-contact query. It consumes the existing terrain support
positions rather than rereading wheel transforms. The second boundary includes
`0x49ff10` support correction, another orientation extraction, and the final
rear/front/reference-node world-position reads. The correction uses the same
half-angle pivot arithmetic as the first alignment, then writes -0.01 for the
unsupported wheel and zero for the supported wheel.

Both continuous original-execution comparisons match all 1,208 output words
in 16,384 cases with zero differences. They retain full bike/component state,
RNG count, four transform graphs, contact arguments and height outputs. The
final comparison additionally checks the refreshed reference position stored
within bike state. Inputs cover both support branches, all body/component and
wheel-node pairings, all reference-node choices, cached/uncached parent graphs,
vertical/zero/general forward vectors, optional engine/effect state, varied
wheel radii, and leaf/child/parent/missing/null synthetic terrain.

The real original CRT orientation helpers execute with their heap/thread setup;
the actual loaded Wine 11 D3DRM DLL is hash-checked. CRT rand and initial
uninitialized contact-normal scratch are the supplied boundaries. Separate
fixture sets preserve both intermediate and final states. Reports:
`mcm-reset-contacts-validation.json` and
`mcm-reset-contact-finish-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-reset-contacts-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`
and `node scripts/mcm-reference/compare-reset-contact-finish-oracle.mjs /path/to/mcm.exe /tmp/another-new-output-directory`.

Inputs remain finite with positive wheelbase/pivot distances and the pinned
runtime. Collision-proxy/game-object synchronization after `0x49fe3a`, the
main routine's alternate-path dispatch and whole-loop force integration remain
unfinished. These results do not establish whole-bike trajectory parity.

### Alternate reset bounds and child transforms (2026-11-12)

Extended continuous original execution through `0x49fe41`, including bounds
copying in `0x4309d0`/`0x430970` and ordered player callbacks `0x44fa70`.
The recovered reset now copies minimum/maximum bounds and applies each active
child record's local or relative orientation and position. Axis normalization
mutates the record, and transform cache invalidation follows the original.

All 1,235 output words match in 16,384 cases: zero differences. The comparison
retains the full previous reset/contact output plus all three child records,
including inactive records. Cases exercise zero through three callbacks, both
orientation branches, different component targets, cached/uncached transforms,
and parent chains. Callback targets have parents, as required by the original
relative-position routine; a deliberately invalid parentless target caused an
original-executable fault during harness development and is excluded. The
four-node graph permits component/body aliasing and ancestor relationships.

Report: `mcm-reset-bounds-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-reset-bounds-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
The pinned executable and loaded Wine 11 D3DRM hashes are checked. Only CRT rand
and initial contact-normal scratch are supplied. Collision-proxy/grid updates
and final flags after this boundary remain pending, along with main-loop
integration and complete acceleration/release trajectory validation.

### Complete alternate reset routine (2026-11-12)

Connected `0x49f8f0` through its original return. After ordered bounds callbacks,
the routine clears the collision partner, copies the resolved body world matrix,
synchronizes the proxy, and updates collision-grid membership. With no collision
object it still copies the body matrix before synchronizing the proxy. It then
saves bike position at `+0x56c` and sets integer flags `+0x8c0` and `+0xcb4`.
The matrix copy matters when proxy updates invalidate shared transform ancestors.

All 1,474 output words match in 16,384 continuous original-execution cases with
zero differences. Outputs include full bike/component state, transform matrices
and caches, contact arguments, mutable child records, collision matrix/partner,
world center, all four grid entries, and links for 65 cell/marker pairs. Cases
cover collision present/absent, grid enabled/disabled, object types 0/1/2/5,
4- and 8-cell grid dimensions, active and inactive prior entries, proxy/body
aliasing and shared ancestors, plus the existing reset/contact/bounds variations.

Report: `mcm-reset-full-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-reset-full-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
The original routine now returns normally; there is no patched exit boundary.
CRT rand and initial uninitialized contact-normal scratch remain supplied, and
the executable and loaded Wine 11 D3DRM hashes are verified. These cases use
existing four-entry collision objects; allocation and line collision types are
outside this integrated comparison. Main-loop alternate dispatch, force
integration, and whole-bike acceleration/release trajectories remain unfinished.

### Main-loop reset pose selection (2026-11-12)

Recovered `0x4a5eb4..0x4a62eb`, entered with a nonzero reset reason. Modes
0/1/4 call the terrain selector; mode 2 chooses a stored respawn pose or a
normalized direction from current position toward the stored point (with the
stored point's Y cleared), then optionally adjusts position through the terrain
selector without a heading argument. Mode 3 uses related pose selection and
calls the course selector with both position and heading. Other signed-short
mode values retain current position/forward. Mode 2's stored-pose branch writes
bike position before any terrain adjustment; mode 3 leaves it unchanged here.

All 18 output words match in 40,000 original-execution cases: zero differences.
The outputs include chosen position/forward, mutated bike position, helper call
count/type, nullable heading argument, and exact vectors passed to the helper.
Inputs cover modes 0..5, -1 and signed-short extrema, settings and bike flags,
nonzero reset reasons, zero/general direction vectors, and seeded caller
scratch (the original vector constructor does not initialize it).

Report: `mcm-reset-selection-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-reset-selection-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
This comparison executes the real branching, subtraction and normalization.
Terrain selector `0x4ae0b0` and course selector `0x4adb10` are supplied boundaries
with captured inputs and deterministic outputs; their internal logic is not
claimed validated by this report. Recovering these selectors and connecting the
main-loop dispatch through the complete reset remain pending. Whole-loop force
integration and acceleration/release trajectory parity are still unfinished.

### Reset nearby-bike avoidance and course adjustment (2026-11-12)

Recovered the complete `0x4adb10` helper. It finds the nearest eligible bike in
original enumeration order, uses the original approximate square root, and
repeats position adjustments until clearance is sufficient. Repeated encounters
with the same bike use a different displacement. Vertical/zero horizontal
heading falls back to world forward when avoidance is enabled. Bike position
is updated during avoidance; later course-limit changes affect the supplied
reset position without copying it back to bike position in this helper.

Mode 3 applies width-scaled limits and geometric terrain-normal checks in X
then Z order, followed by the conditional unnormalized heading toward the stored
respawn point. Comparisons retain the original unrounded intermediate values,
including the Z-distance product and width-scaled boundary thresholds.

All 840 output words match in 16,384 cases: zero differences. These include the
full bike allocation, reset position/heading, and neighboring-bike positions and
eligibility flags. The original executes real `0x459e90` enumeration, square-root
lookup, terrain lookup and face-normal callees, with no patched helper calls.
Inputs cover one/three primary bikes, zero to four additional bikes, disabled
enumeration, skipped neighbors, both clearance thresholds, null/general/vertical
headings, mode and setting variants, and independently varied flat/steep terrain.
The 284 retained fixtures cover branch combinations plus periodic samples.

Report: `mcm-reset-course-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-reset-course-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
The harness runs original startup initializers, including `0x412910` for the
terrain default normal; omitting it during development changed boundary results.
Inputs use valid level-two synthetic terrain, finite state and positive course
width. The main selection's integration with this helper, terrain selector
`0x4ae0b0`, complete main-loop forces and acceleration/release trajectory parity
remain unfinished.

### Connected terrain reset selection (2026-11-12)

Recovered complete `0x4ae0b0`, including its real terrain, target-position and
avoidance callees. Five samples cover current position and world X/Z offsets
of +/-10. The original compares normal Y values, preserves its tie order, and
tracks a secondary support using comparisons between normal Y and sample height.
Modes 0/2/4 derive heading from that support or retain the saved heading, then
call `0x4ae9c0` avoidance when a heading pointer is present. Mode 1 optionally
points toward a selected target and calls `0x4adb10`; remaining modes return the
selected support without those heading adjustments.

Target access `0x475380` calls `0x4b7920`, which reads local translation directly;
it does not resolve world transforms or change their caches. The reference
harness runs world-right/up/forward initializers as well as terrain-normal and
math-table initialization. Missing the world-right initializer during harness
development incorrectly collapsed the two X-offset samples onto the center.

All 906 output words match in 16,384 cases: zero differences. Outputs include
the entire bike allocation, selected position/heading, neighboring bikes and
both target-node matrices/caches. Inputs independently vary three terrain grid
scales, flat/shallow/steep height scales, optional target and target choice,
parent/cache combinations, null headings where valid, saved vertical headings,
and neighbors placed around the sampled support locations to exercise avoidance.
Mode 1 supplies a heading pointer, matching its original caller requirements.
There are 300 retained regression fixtures. Shared avoidance arithmetic was
extracted for both original helper entry points; existing course fixtures still
validate the separate boundary-adjustment path.

Report: `mcm-reset-terrain-selection-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-reset-terrain-selection-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
No callees are patched or supplied. Cases use finite synthetic state and valid
level-two terrain. Main selection/complete-reset dispatch integration, full
force-loop integration, and acceleration/release trajectory parity remain open.

### Main reset selection with recovered callees (2026-11-12)

Connected the main selection sequence `0x4a5eb4..0x4a62eb` to the recovered
terrain and course helpers by default. Explicit callbacks remain available for
the earlier boundary-isolation test. The connected oracle executes all original
callees; only its exit boundary is patched. It covers nonzero reset reasons,
mode/setting and bike flags, conditional position-only terrain selection, stored
respawn headings, target objects, nearby bikes and varied terrain.

All 906 output words match across 16,384 cases with zero differences; 429
fixtures preserve this connected comparison independently of the complete
terrain-selector fixtures. Report: `mcm-reset-selection-connected-validation.json`.
Reproduce with
`node scripts/mcm-reference/compare-reset-selection-connected-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
The subsequent call into the complete bike reset, main-loop force integration,
and whole-bike acceleration/release trajectories remain pending.

### Continuous main-loop alternate reset branch (2026-11-12)

Connected `0x4a5eb4..0x4a64dc`: mode-dependent pose selection with all real
terrain/course/avoidance helpers, the complete `0x49f8f0` reset, and post-reset
control/cooldown writes. Unlike the earlier standalone reset harness, this path
passes bike `+0x590/+0x594` directly as the contact-height output pointers.
The recovered adapter preserves that aliasing in final bike state.

The main loop clears stack controls at `+0x1c/+0x30/+0x2c/+0x8c` and bike flag
`+0x88c`. It sets cooldown `+0x888` to 3 and integer flag `+0x8ac` to 1 unless
the optional object at settings `+0x608` refers to this bike at `+0x80`. Absent
and other-bike observers take the cooldown path; a self observer preserves the
existing cooldown/flag values.

All 1,566 output words match across 16,384 continuous original-execution cases
with zero differences. Outputs retain full bike/components/engine/effect,
RNG count, transform matrices/caches, contact arguments, child records, collision
matrix and grid links, selected pose, cleared controls, neighboring bikes and
target nodes. Cases combine nonzero reset reasons, modes and flags, observer
variants, targets, nearby bikes, multiple terrain scales, optional engine/effect
and collision objects, and transform aliasing/parent graphs.

Report: `mcm-reset-substep-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-reset-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
The original main branch calls its real reset routine and returns to the main
loop before the exit boundary at `0x4a64dc`. Only that exit, CRT rand and initial
wheel-query normal scratch are supplied; the pinned executable and loaded Wine
11 D3DRM hashes are checked. Inputs use finite synthetic state and valid
level-two terrain. Zero-reset ordinary-path integration, shared force updates,
full main-loop assembly, and acceleration/release trajectory parity remain open.

### Ordinary contact update and shared force preparation (2026-11-12)

Extended the ordinary branch from `0x4a63d2` through `0x4a64dc`, including
complete wheel contacts, conditional component update `0x49eef0`, and cooldown.
The component accumulates a rounded time/rate increment, clears non-finite or
sub-threshold angles, copies the body local transform, zeroes its translation,
and rotates only when the resulting angle is nonzero. Invalidation follows the
original child graph. Cooldown tests signed float bits before and after the
subtraction, preserving negative zero and clearing the associated integer flag
only when a positive cooldown expires.

A second continuous comparison extends through `0x4a663d`: signed-zero-aware
contact flags, rear-normal and speed copies, initial force, conditional velocity
drag, absolute rear alignment, and normalized contact-position difference. Drag
rounds its scalar before scaling velocity; direction normalization uses the
original inverse-square-root routine even for a zero vector.

Both original-execution runs cover 40,000 cases with zero differences across
214 and 227 output words respectively. Inputs cover four-node parent/child
and alias combinations, both component-update branches, tiny angle thresholds,
overflowing angle increments from finite input floats, signed-zero cooldowns,
expiry/equality cases, all terrain-query modes and drag threshold equality.
Component-angle/cooldown bits are stored explicitly in fixture inputs to retain
negative zero through JSON serialization.

Reports: `mcm-contact-substep-validation.json` and
`mcm-contact-force-substep-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-contact-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`
and
`node scripts/mcm-reference/compare-contact-force-substep-oracle.mjs /path/to/mcm.exe /tmp/another-new-output-directory`.
The original component, terrain and math callees execute directly. Query scratch
is seeded as before, and query-return/main-exit observation boundaries capture
outputs. Pinned executable and loaded Wine 11 D3DRM hashes are checked. Later
force assembly, unified complete main-loop execution, and acceleration/release
trajectory parity remain unfinished.

### Connected roll target and suspension geometry (2026-11-12)

Extended ordinary-path execution through `0x4a692a`. The recovered block
projects rear contact normal off the wheel-contact direction, constructs the
roll-target geometry, evaluates the original signed arcsine, and blends the
angle toward current roll according to component steering angle. It preserves
the original differing normalization rounding points and signed speed-bit gate
at 32. The cosine is written before the steering blend and is not recomputed.
Inactive/degenerate paths use current roll and cosine 1.

A second extension through `0x4a69e8` resolves rear and front suspension-mount
world positions after the component rotation, computes wheel lever vectors,
and constructs the front contact axis. These reads can repopulate caches
invalidated by the preceding update, including aliased body/component/mount
nodes. The normal scratch ends with the front mount world position.

Both continuous original-execution runs match all 40,000 cases with zero
differences, across 229 and 238 output words. They retain the prior contact,
force and transform outputs plus target angle/cosine, lever vectors and axis.
Cases cover state and speed gates, exact and adjacent speed thresholds,
component angle thresholds and overflow, signed zeros, all mount pairings,
parent graphs, cached/uncached transforms, and synthetic terrain variants.
The pinned original CRT arcsine executes with heap/thread initialization.

Reports: `mcm-contact-roll-substep-validation.json` and
`mcm-contact-geometry-substep-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-contact-roll-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`
and
`node scripts/mcm-reference/compare-contact-geometry-substep-oracle.mjs /path/to/mcm.exe /tmp/another-new-output-directory`.
The executable and loaded Wine 11 D3DRM hashes are checked. Initial wheel-query
normal scratch and query-return/main-exit observation boundaries are supplied;
geometry and math callees execute directly. Chassis terrain probes, remaining
force assembly, complete main-loop integration and acceleration/release
trajectory parity remain unfinished.

### Connected chassis terrain probes (2026-11-12)

Extended continuous ordinary execution from `0x4a63d2` through `0x4a6c01`.
The recovered chassis block gates on crash state, control20, roll and pitch;
transforms two candidate component probes and one body probe; and executes
terrain height/normal queries to select chassis contacts. It compares depth
before float32 storage, preserves incoming scratch and controls when skipped,
and preserves the prior component contact flag when both candidate probes miss.

The original-execution comparison matches 40,000 cases with zero differences
across 262 output words, including all earlier wheel/contact/force/transform
outputs and the new probe world positions, surfaces, normals, depths and flags.
Coverage includes exact/adjacent roll and pitch thresholds, absent terrain,
parent/mount aliasing, cached transforms, both component probes and missed
contacts. Report: `mcm-chassis-probes-substep-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-chassis-probes-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
The executable and loaded Wine D3DRM remain hash pinned. Only initial scratch
and observation boundaries are supplied; terrain and transform callees execute
in the original. Remaining force assembly, full-loop integration and repeatable
acceleration/throttle-release trajectory parity are still unfinished.

### Connected crash steering and landing response (2026-11-12)

Extended continuous ordinary execution through `0x4a6eac`, including both
crashed and upright branches. Recovered crash steering selects signed steering
increments from wheel contacts and target roll, or computes the single-front
contact response from velocity/normal alignment. The component update executes
with the original angle limit and invalidates the same transform descendants.
The upright branch updates landing flags and records airborne roll sign and
angular state. Skipped branches preserve incoming state and scratch values.

All 40,000 original-execution cases match, across 278 output words with zero
differences. The extension exposed a previously untested extreme-angle mismatch:
x87 FCOS/FSIN leave finite operands with magnitude at least 2^63 unchanged.
The recovered axis-angle construction now preserves that behavior, including
resulting overflowing matrix entries, instead of JavaScript range reduction.
An original-execution regression fixture retains this case. Earlier ordinary
component updates and crash updates share the recovered `0x49eef0` operation.

Report: `mcm-contact-response-substep-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-contact-response-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
Pinned executable/Wine DLL checks, real terrain/transform callees and supplied
scratch/observation boundaries remain as before. This completes another shared
response block, not the force assembly, full main-loop integration or whole-bike
acceleration/release trajectory comparison; those remain unfinished.

### Connected takeoff, rider weight and force reference (2026-11-12)

Extended continuous ordinary execution through `0x4a7221`. On takeoff, the
original captures position/velocity, updates airborne state and clears the
landing latch. Rider lean drives a bounded-time filter; the active branch uses
the unrounded filter result for mass-weighted front/rear distribution, while
the inactive branch sets equal weights and relaxes the filter toward 0.5.
Grounded state shifts the force reference along normalized horizontal rear
contact tangent; airborne state resolves its reference transform instead.

All 40,000 cases match across 307 output words with zero differences. Cases
include signed-zero lean, enabled/disabled lean, filter durations below/equal/
above timestep, takeoff transitions, mount/node aliasing, and prior contact,
crash, geometry and transform state. An overflowing parent transform exposed
host-dependent NaN signs: the recovered world-matrix stores now preserve the
original x87 negative indefinite value. A selected original-execution fixture
retains the failure case; arbitrary input NaN payloads are outside this corpus.

Report: `mcm-contact-balance-substep-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-contact-balance-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
Executable/DLL pinning and observation boundaries remain unchanged. Filter
durations and masses are finite positive values. Remaining force assembly,
full-loop integration and whole-bike acceleration/release parity are unfinished.

### Connected front suspension and crash reference transform (2026-11-12)

Extended ordinary execution from `0x4a63d2` through the first front suspension
response at `0x4a73e2`; no-wheel/rear-only branches are observed at `0x4a8b6e`
and `0x4a7ad6` before their later response calculations. The force reference is
converted into body-local space, lowered by one local unit in crash state and
transformed back. Front suspension now consumes the actual earlier wheel
height, lever and contact normal; its component translation invalidates the
real parent/child graph, including aliases with earlier queried nodes.

The 40,000-case comparison matches all 325 output words with zero differences, preserving all previous
outputs and adding local reference position, suspension displacement/velocity,
travel history, limit/contact flags and activity. It exercises state 2's bypass,
missing front/any contacts, travel limits, signed zeros, zero timestep, graph
aliasing and extreme finite steering. Zero-timestep velocity and overflowed
reference transforms exposed additional x87 NaN-sign behavior. Recovered code
preserves negative invalid results, sign reversal and equal-payload positive
NaN propagation; saved fixtures retain these observed exceptional paths.
Arbitrary input NaN payload propagation remains outside this finite-input corpus.

Report: `mcm-front-suspension-substep-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-front-suspension-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
The original suspension/transform callees execute directly with pinned
executable and Wine D3DRM hashes. Later front/rear force calculations, no-wheel
response, complete integration and whole-bike acceleration/release parity
remain unfinished.

### Connected front load preparation (2026-11-12)

Extended continuous ordinary execution through `0x4a7717`, retaining the earlier
no-wheel/rear-only observation exits. When both wheels contact, the original
steering helper changes linear velocity and turn radius, then the caller scales
its turn angle, constructs the front contact arm, projects angular velocity onto
the contact normal, and crosses that projection with the arm. This cross product
writes stack `0x450`; the earlier contact direction at `0x45c` stays intact.
Shared force is scaled by the recovered rear-weight field as in the executable.
Front-only contact instead uses the full force, clears its designated scratch,
and inverse-rotates the contact-to-body offset into the local arm field.

All 40,000 original-execution cases match all 345 output words with zero
differences, including updated linear velocity, radius/turn, arm, projected
angular vector, cross product, force and transform-cache side effects alongside
prior outputs. Report: `mcm-front-load-substep-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-front-load-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
Original steering/transform callees run directly; no-wheel/rear-only exits are
observation boundaries, not implemented downstream response. Remaining wheel
force calculations, no-wheel response, full-loop integration and whole-bike
acceleration/release trajectory parity remain unfinished.

### Connected front contact velocity and tire force (2026-11-12)

Extended continuous ordinary execution through `0x4a7b27`, with no-wheel and
rear-only branches still observed before downstream execution. The front path
projects velocity off the contact normal, normalizes with the original inverse
square-root lookup and float32 scale store, updates front-only travel direction
and forward speed, and combines linear contact velocity with its angular term.
Contact speed uses the original approximate square-root lookup. Signed-bit
speed gates preserve distinct low-speed branches and untouched scratch fields.
The connected front tire helper now consumes that contact direction/load and
writes alignment, perpendicular factor, force magnitude and force vector.

All 40,000 cases match across 369 output words with zero differences, including
exact/adjacent 0.001 speed thresholds, signed zeros, front-only/both-wheel
contact, low-speed force clearing and preserved skipped state. The extended
oracle invokes both original lookup-table initializers. Its adapter also makes
local/world matrix arrays independent, matching their distinct original memory
ranges even when a synthetic input reused the same JavaScript array.
Exceptional inverse-point results use typed storage to preserve NaN signs
under V8 optimization; this was verified by the full warmed regression suite
as well as another 40,000-case original-execution run.

Report: `mcm-front-velocity-substep-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-front-velocity-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
Original projection, lookup, steering, terrain, transform and tire callees run
directly. Remaining contact-force processing, rear-only/no-wheel response,
full-loop integration and whole-bike acceleration/release parity are unfinished.

### Connected rear-only entry, rotating suspension and drive (2026-11-12)

Extended ordinary execution through `0x4a7c6c`. Rear-only contact now executes
its real front-response clearing block at `0x4a7ad6`, then joins both-wheel
contact for rear suspension and drive force. No-wheel/front-only paths are
observed at their downstream branch entries. Rear response consumes recovered
wheel axis, lever, normal and height, updates travel and wheel contact position,
and rotates the suspension mount with descendant-cache invalidation. Degenerate
contact geometry and skipped responses preserve the original transform behavior.
The suspension helper reports whether rotation actually occurred so an already
invalid parent does not cause spurious invalidation on a skipped rotation.

The rear drive call uses the updated substep speed and rear tangent, executing
released/local/AI branches with synthetic fifteen-entry engine tables. All
40,000 cases match 382 output words with zero differences, including previous
front outputs, rear suspension state and drive scalar/vector. The original
component fields are limit `+54`, divisor `+4c`, limit angle `+48`, prior travel
`+58` and prior height `+5c`; the oracle supplies these independently.

Report: `mcm-rear-suspension-substep-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-rear-suspension-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
Original terrain, transform, suspension and engine callees run directly with
pinned executable/DLL checks and both lookup initializers. Remaining rear tire
and contact-force processing, no-wheel response, full-loop integration and
whole-bike acceleration/release trajectory parity remain unfinished.

### Connected rear load and contact velocity (2026-11-12)

Extended continuous ordinary execution through `0x4a8216`, preserving no-wheel
and front-only observation exits. Both-wheel contact constructs the rear arm,
projects angular velocity onto the rear normal, forms its angular cross product
and assigns the front-weight share of shared force. Rear-only contact uses full
force and updates the local contact arm. Rear tangent projection then updates
forward speed, travel direction, contact speed and normalized contact direction.
Unlike the front path, rear linear velocity is not rounded before adding the
angular contribution. The low-speed path retains separate zeroing/preservation
behavior, including leaving the tangent and alignment scratch untouched.

All 40,000 original-execution cases match across 404 output words with zero
differences. The extended corpus exposed an overflowed suspension transform
whose invalid matrix products/sums must store x87 negative indefinite NaNs;
the recovered matrix multiplication now preserves those stores, and a selected
fixture retains the observed failure. Arbitrary input NaN payloads remain
outside this finite-input corpus.

Report: `mcm-rear-motion-substep-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-rear-motion-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
All prior terrain, suspension, steering, front-tire and rear-drive operations
execute continuously with original callees. Remaining rear tire/contact-force
processing, no-wheel response, full-loop integration and whole-bike
acceleration/release trajectory parity remain unfinished.

### Connected rear traction and tire force (2026-11-12)

Extended continuous ordinary execution through `0x4a8634`; front-only contact
now executes the original rear-response cleanup and joins this boundary.
Only the no-wheel path remains observed at its earlier branch entry. Rear
traction compares forward speed and crash state, derives drive acceleration
minus the prior acceleration magnitude, clamps its factors and scales the drive
vector. It preserves the unrounded factor for the vector's X component and uses
the stored factor for Y/Z. Both-wheel contact chooses the front or midpoint
contact arm using the signed-bit 0.9 threshold, then inverse-rotates that arm.
The rear tire helper consumes the resulting scale, normal load and direction;
its low-speed branch clears force/magnitude without overwriting unused scratch.

All 40,000 cases match across 422 output words with zero differences, retaining
all previous connected outputs plus traction intermediates and rear tire force.
Cases include zero/nonzero acceleration, speed limits, crash/normal state,
front-only/rear-only/both-wheel contact, skipped scaling, released drive and
local/AI force branches. Report: `mcm-rear-tire-substep-validation.json`.
Reproduce with
`node scripts/mcm-reference/compare-rear-tire-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
Pinned original callees execute directly throughout. Remaining combined
contact-force processing, no-wheel response, full-loop integration and whole-bike
acceleration/release trajectory parity remain unfinished.

### Connected combined tire-force and torque accumulation (2026-11-12)

Extended continuous ordinary execution through `0x4a875b`. Front-only and
rear-only contact pass the actual tire force vector to the limiter, preserving
its in-place mutation; both-wheel contact uses a summed temporary. The caller
combines force magnitudes, derives enabled contacts from signed speed-bit gates,
and passes the real contact arms, timestep, mass, accumulated force/torque and
remaining velocity-change budget into original `0x4b1570`.

All 40,000 cases match across 430 output words with zero differences. The
connected corpus includes zero-timestep invalid arithmetic and canonical NaNs
propagated from overflowed contact arms. Limiter stores preserve the original
negative indefinite value; cross-product and torque arithmetic distinguish it
from positive NaN propagation. Shared exceptional arithmetic also serves the
previous inverse-point path. Saved fixtures retain both observed NaN signs;
arbitrary input payloads remain outside the finite-input corpus.

Report: `mcm-tire-accumulation-substep-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-tire-accumulation-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
No-wheel execution remains observed at its branch entry. Subsequent braking,
contact-force processing, no-wheel response, full-loop integration and whole-bike
acceleration/release trajectory parity remain unfinished.

### Connected braking and airborne suspension cleanup (2026-11-12)

Extended continuous ordinary execution through `0x4a8be0`, including the real
no-wheel cleanup branch previously observed at its entry. Front and rear brakes
consume the velocity-change budget remaining after tire friction, in that order.
The original gates front braking on forward contact speed but rear braking on
combined contact speed. Rear brake magnitude includes the traction factor;
both-wheel contact halves each requested forward-speed change. Force vectors
retain the original unrounded first component and rounded remaining components,
and each limited force adds its contact-arm torque to the shared accumulator.
Crash state skips braking. Airborne cleanup clears suspension activity, travel,
compression and front displacement history while preserving unrelated scratch.

All 40,000 cases match across 440 output words with zero differences. The corpus
includes signed-zero and nonzero brake inputs, crash and airborne states,
front-only/rear-only/both-wheel contact, reversed direction, zero timesteps and
canonical NaNs generated from finite state. Original braking, limiting and cross
product callees execute directly; only entry scratch and final observation
boundaries are supplied. Report: `mcm-braking-substep-validation.json`.
Reproduce with
`node scripts/mcm-reference/compare-braking-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
Subsequent force assembly, full-loop integration and whole-bike acceleration /
throttle-release trajectory parity remain unfinished.

### Connected chassis contact merging and penetration correction (2026-11-12)

Extended continuous ordinary execution through `0x4a8ddf`, with the skipped
contact branch observed at `0x4a9b29`. The caller selects crash/normal angular
weights and refreshes chassis probe positions after suspension transforms when
required. Original `0x4b0100` merges rear/front suspension limits and the two
chassis contacts, averages their positions, normalizes the summed normal when
multiple contacts participate, and selects the penetration depth. It computes
the world contact arm, local body arm and velocity at that contact, then moves
both body position and balance center by the normal-projected correction.

All 40,000 cases match across 458 output words with zero bit differences.
Every combination of the four contact flags appears. The response executes with
zero contacts in 106 cases, one in 1,950, two in 6,908, three in 6,595 and four
in 18,482; another 5,959 cases skip it and preserve scratch. Fixtures retain
these branches alongside prior finite-input overflow, signed-zero, transform
aliasing and terrain coverage. The helper and its original transform/math
callees run directly, with no replacement of the contact solver.

Report: `mcm-chassis-contact-substep-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-chassis-contact-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
Subsequent collision response and force assembly, full-loop integration, and
whole-bike acceleration / throttle-release trajectory parity remain unfinished.

### Connected contact-count angular response and crash damping (2026-11-12)

Extended continuous ordinary execution through `0x4a9a52`, just before the
single-body impulse wrapper, with the skipped contact branch still observed at
`0x4a9b29`. Chassis-contact response now selects normal/crashed mass and angular
coefficients, resolves one-contact or two-contact surface levers in the original
branch order, transforms the resulting angular change into body coordinates,
and applies the original speed-bit-dependent damping. The two-contact rear-only
body branch deliberately reads the front terrain surface, matching the binary.
Other contact counts preserve normal-state motion or damp/stop crashed motion;
the stop branch changes state to 2 and clears local angular and linear velocity.

All 40,000 cases match across 473 output words with zero bit differences.
Captured outputs include local angular velocity, its shared field `0x53c`,
local lever `0x660`, response scalars, and every previously connected output.
The contact-count observation hook preserves the overwritten instructions and
resumes original execution; no response or transform helper is replaced.
Report: `mcm-chassis-response-substep-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-chassis-response-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
The following single-body impulse call, remaining force assembly, full-loop
integration, and whole-bike acceleration / throttle-release trajectory parity
remain unfinished.

### Connected chassis impulse and low-speed stopping (2026-11-12)

Extended continuous ordinary execution through the shared `0x4a9b29` boundary.
The chassis response now feeds original bike wrapper `0x49d7f0` and single-body
solver `0x45b3c0` with its merged normal, contact velocity, world/local contact
arms and angular scale. Restitution and inverse inertia follow the current crash
state, including a state change in the preceding response. The type-3 branch
updates linear and local angular velocity, preserves stored world angular
velocity, and bypasses audio notification. The caller then recomputes speed
with its original sum/store/square-root order and applies the low-speed stop
using signed float-bit thresholds, preserving squared-speed scratch.

All 40,000 cases match across 478 output words with zero bit differences.
The capture includes resulting speed and squared speed plus explicit world
angular velocity, in addition to all earlier connected state. Both solver and
wrapper execute directly; no solver/audio substitute is installed. Skipped
contact response preserves scratch and initial post-impulse speed.
Report: `mcm-chassis-impulse-substep-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-chassis-impulse-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
Remaining force assembly, full-loop integration, and whole-bike acceleration /
throttle-release trajectory parity are still unfinished.

### Connected suspension force assembly and low-speed lean gate (2026-11-12)

Extended continuous ordinary execution through `0x4a9d5c`; crashed bikes with
chassis contact exit at the original alternate branch `0x4ab426`. Before force
assembly, both-wheel low-speed contact can clear local angular X according to
forward/tangent slope, alignment thresholds and the rider-lean bit sign. Each
active suspension passes its displacement, velocity, travel, weight share and
spring/damping coefficients into real `0x4b11e0`. Inactive suspension clears
force while preserving damping scratch. Airborne execution restores the local
arm from the balance center and clears displacement/travel history.

All 40,000 cases match across 490 output words with zero bit differences.
Connected zero-timestep state required the unchecked original square-root table
lookup, including nonfinite bit patterns, and x87 exceptional arithmetic in
spring/damping operations. The checked `mcmSqrt` API retains its existing input
domain; suspension uses the recovered unchecked lookup. This corpus also caught
a warm-up-dependent V8 NaN-sign change in the first braking cross-product array
element; explicit typed stores now preserve that sign. Saved original fixtures
cover the new outputs and retain all preceding connected state.

Report: `mcm-suspension-force-substep-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-suspension-force-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
Subsequent force/torque combination, the alternate crash branch, full-loop
integration, and whole-bike acceleration / throttle-release trajectory parity
remain unfinished.

### Connected single-wheel force and torque assembly (2026-11-12)

Extended front-only and rear-only ordinary execution through `0x4aaa55`.
Airborne execution reaches the same boundary after restoring the local contact
arm and clearing torque. Both-wheel execution remains observed at its assembly
entry `0x4aa573`; crashed chassis-contact execution exits at `0x4ab426`.
Single-wheel assembly projects suspension force onto the initialized world-up
vector, scales it by target-roll cosine, and adds the existing contact load and
normal force. It computes body-local torque from the contact arm, applies the
front/rear pitch clips and shared counter, and refreshes the local contact arm.
The rear-only branch additionally applies the original height-dependent torque
scale and drive torque helper `0x4b1ad0` with the connected control/AI state.

All 40,000 cases match across 515 output words with zero bit differences.
Projection partial stores, normal loads, world/local torque scratch, drive
torque, pitch counter and preceding state are captured. Arithmetic retains
zero-times-nonfinite results in world-up projection instead of simplifying the
projection to a Y-only copy. Original projection, transform, cross-product and
drive-torque callees execute directly.

Report: `mcm-single-contact-force-substep-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-single-contact-force-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
Both-wheel force assembly, the alternate crash branch, subsequent integration,
complete-loop wiring, and whole-bike acceleration / throttle-release trajectory
parity remain unfinished.

### Connected both-wheel force and torque assembly (2026-11-12)

Extended both-wheel ordinary execution through `0x4aaa55`, sharing the existing
single-wheel/airborne boundary. Crashed chassis-contact execution still exits
at `0x4ab426`. The both-wheel branch projects each suspension force with real
`0x4ad430`, scales it by target-roll cosine and adds the contact load before
storing each component. This retains the different store order from the single-
wheel branches. It adds the normal forces, accumulates both loads, applies rear
then front pitch clips to body-local torque and the shared counter, adds drive
force/torque, and copies the force-reference local arm into the correction arm.

All 40,000 cases match across 527 output words with zero bit differences.
The capture includes both normal-force vectors and projection temporaries,
as well as all preceding connected state. Expanded finite-input cases exposed
mixed-sign canonical NaN propagation in paired force addition and impulse
scaling/velocity updates. Those operations now use recovered x87 arithmetic;
the saved fixtures retain the angular-velocity regression. Arbitrary external
NaN payloads remain outside this corpus. Original projection, torque, transform
and drive-torque callees execute directly.

Report: `mcm-paired-contact-force-substep-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-paired-contact-force-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
Contact correction and integration, the alternate crash branch, full-loop
wiring, and whole-bike acceleration / throttle-release trajectory parity remain
unfinished.

### Connected contact correction and angular acceleration (2026-11-12)

Extended ordinary execution through `0x4aaded`, connecting the existing contact
correction helper after both-wheel force assembly. The alternate crashed
chassis-contact branch still exits at `0x4ab426`. The connected stage selects
normal or crashed inverse inertia, produces local angular acceleration, updates
the contact mask, and applies the original front/rear or crash pivot rotation.
It invalidates the body transform and descendants only when the original calls
the rotation routine; even zero-angle calls retain that invalidation behavior.
Unordered comparison branches retain the original x87 conditions.

All 40,000 cases match across 532 captured output words with zero bit
differences, including earlier state, node local/world matrices and cache flags.
Independent controller combinations and targeted small-roll/low-speed inputs
exercise both crash-angle choices. Explicit coverage requirements also ensure
front-only and rear-only pivot rotations execute. The original pivot rotation
callee runs directly. The corpus covers finite synthetic inputs, generated
exceptional arithmetic, graph aliases, skipped state, and float thresholds;
it does not establish arbitrary NaN payload behavior or whole-bike parity.

Report: `mcm-contact-correction-substep-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-contact-correction-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
Next: opposing-torque conversion and angular integration from `0x4aaded`.
Subsequent linear integration, the alternate crash branch, full-loop wiring, and
whole-bike acceleration / throttle-release trajectory parity remain unfinished.

### Connected opposing torque and angular integration (2026-11-12)

Extended ordinary execution through `0x4aaf02`. After contact correction,
the original resolves the potentially invalidated world transform and converts
the accumulated opposing torque into body-local coordinates. The recovered
stage applies normal/crashed inverse inertia, the normal-state X/Z scale
factors, stationary/moving damping, and the final angular velocity update.
The original inverse-transform and damping callees execute directly in the
oracle. Its exit adapter removes the five outstanding cdecl arguments before
capturing the common stack frame; the early crashed-contact exit is unchanged.

All 40,000 cases match across 538 output words with zero bit differences.
The capture adds local opposing torque and scaled opposing acceleration and
checks the updated angular acceleration, angular velocity, and resolved world
caches along with all preceding state. Connecting the damping helper exposed
298 initial differences involving generated NaNs. Matching the original
unsigned bit-sign checks, unordered comparisons, and x87 arithmetic reduced
these to four differences in one inverse-transform case; recovered multiply/
add semantics eliminated those too. The saved fixtures retain that case.
All 229 preceding tests also passed after these shared-helper corrections.

Report: `mcm-angular-integration-substep-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-angular-integration-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
This is synthetic connected-state validation, not full trajectory parity.
Linear integration, subsequent orientation/position updates, the alternate
crash branch, complete-loop wiring and repeatable whole-bike acceleration /
throttle-release comparisons remain unfinished.

### Connected linear integration and steering correction (2026-11-13)

Extended continuous execution through `0x4ab49e`. The ordinary branch now
converts assembled force into acceleration and delta velocity, computes the
two-wheel steering fallback and drive/lean correction, updates correction
decay/counter state, and integrates velocity, speed and position. Crashed
chassis contact joins at the real `0x4ab426` boundary and now executes position
integration too. Frozen bikes clear velocity and speed without moving position.
Later orientation and wheel updates remain outside this capture.

All 40,000 cases match across 548 output words with zero bit differences.
Captured state includes linear acceleration, delta velocity, steering angle,
decay, counter and selected rotation, in addition to all earlier fields and
the updated velocity/position/speed. Explicit coverage requires drive steering,
the fallback gate, and frozen/moving execution for ordinary and crashed
chassis-contact paths. Connecting the speed calculation exposed the original
x87 C3 check: both zero and unordered squared speed store zero before sqrt.
Recovered multiply/add semantics retain generated exceptional values.

Report: `mcm-linear-integration-substep-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-linear-integration-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
The full-loop entry, remaining orientation/wheel updates and later branches
still need connecting. Whole-bike acceleration/throttle-release trajectory
parity remains unproven; this synthetic connected-state comparison does not
establish 100% physics parity.

### Connected wheel and body transforms (2026-11-13)

Extended continuous original execution through `0x4ab7fd`. Wheel increments
now follow airborne coast/brake/engine behavior and front/rear contact motion.
Finite increments rotate their wheel nodes; nonfinite increments remain stored
without rotating. The body then receives integrated position and the normalized
angular-velocity pivot rotation. Node mutations occur in original call order,
preserving wheel/body aliases and parent/child cache invalidation. The original
wheel, translation and pivot-rotation callees execute directly in the oracle.

All 40,000 cases match across 553 output words with zero bit differences.
Coverage requires applied/skipped body rotation, large angles, wheel/body and
wheel/wheel aliases, and nonfinite wheel increments generated from finite
scales. Saved fixtures explicitly retain cases 12943, 16940 and 23908, which
exposed large-angle trig reduction and mixed-NaN pivot arithmetic.

Connecting rotation also required the original zero/unordered squared-length
guards and unchecked inverse-square-root lookup for overflowed finite inputs.
Two very large angles (approximately 3.32e12 and 4.44e13 radians) exposed x87
argument reduction differences from host libm. A direct Wine x87 probe confirmed
the phase difference; the recovered reducer subtracts quadrants using the
66-bit pi/2 constant `0x3243f6a8885a308d3 * 2^-65` with exact integer arithmetic.
Small remainders use host sine/cosine, and the existing >=2^63 operand-preserving
behavior remains. This is validated against the captured original outputs,
not a claim of exhaustive x87 transcendental emulation.

Report: `mcm-motion-transform-substep-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-motion-transform-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
Next are the state-dependent crash controls and remaining main-loop updates
from `0x4ab7fd`. Complete-loop wiring and whole-bike acceleration/throttle-release
trajectory parity remain unfinished.

### Connected controller handoff and crash orientation (2026-11-13)

Extended continuous execution from `0x4ab7fd` through the controller handoff
and nonzero-state orientation branch. Normal state exits at `0x4abb30`;
crashed state exits at `0x4ac6cd`, before the separately recovered collision
tail. Controller flags gate velocity/angular transfer. Transition kind 2 can
copy another bike's velocity (including self-reference and absent-pointer
fallback); kinds 4/7 add the bounded upward boost and copy angular velocity;
the remaining kinds scale angular velocity by 0.75.

After handoff, the original chassis-probe gate controls crash orientation.
Both-wheel execution normalizes the combined contact normals, resolves the
updated body world transform, converts the axis into local coordinates, and
rotates the local matrix around the force-reference pivot. Front-only
execution uses the negative component-rate angle about the initialized up axis.
Transform invalidation follows the real node graph and call order.

All 40,000 cases match across 568 output words with zero bit differences.
New captures include controller linear/angular velocity, the local orientation
axis, summed normals and projected normals. Coverage requires each active
transition family, all kind-2 pointer choices, skipped handoff and both/front
orientation. Fifteen initial NaN-sign differences exposed mixed-sign canonical
NaN selection in the controller boost and matrix products. Recovered x87
addition/multiplication replaces blanket negative-NaN canonicalization in matrix
multiplication; existing tests still pass. Explicit regression fixtures retain
cases 1360, 4533 and 7696.

Report: `mcm-controller-handoff-substep-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-controller-handoff-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
Normal-state controls from `0x4abb30`, collision/tail connection, complete-loop
entry and whole-bike acceleration/throttle-release trajectory validation remain.
This synthetic connected-state evidence does not establish full physics parity.

### Connected normal-state airborne controls (2026-11-13)

Extended the normal branch from `0x4abb30` through `0x4abef9`, preserving
its early exits at `0x4ac64a` and `0x4ac1f7`. Crashed execution still exits
at `0x4ac6cd`. The connected stage now applies airborne pitch/yaw input,
lean-disable behavior, conditional brake/engine pitch adjustments, velocity
normalization/redirection/rescaling, and angular damping. It reads the selected
forward component's cached world basis directly, matching the original's lack
of a world-cache refresh at this point.

All 40,000 cases match across 572 output words with zero bit differences.
An observation hook at `0x4abd6e` records actual entry into velocity
redirection, then reproduces the displaced instructions and resumes original
execution. The corpus includes 46 such executions. Independent special-control
and frozen flags prevent accidental correlation from excluding moving-bike
redirection. Captures add the control vector and redirection flag while checking
updated scratch vectors, velocity, speed and angular velocity.

Initial differences exposed zero-speed normalization and generated exceptional
arithmetic. Recovered x87 multiply/divide/add semantics and the original
zero/unordered speed check now apply. Typed angular stores preserve NaN signs
across JS array transitions. Cases 5 and 28 are explicitly retained alongside
earlier regressions. The new fixture is losslessly gzip-compressed; the test
loader supports both existing JSON and compressed JSON fixtures.

Report: `mcm-normal-control-substep-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-normal-control-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
Next are normal-state timers/orientation and alignment, then collision/tail and
entry connections. Whole-bike acceleration/throttle-release trajectory parity
remains unproven.

### Connected normal-state timer and control rotation

The continuous original branch now reaches `0x4ac17b`, following normal
controls with timer accumulation, phase/sign transitions, angular-Z updates,
control-vector normalization and pivot rotation about the local balance center.
Earlier suspension/state gates preserve the original skipped scratch angle.
Body mutation and descendant cache invalidation follow the existing node graph.

The pinned Wine 11 original matches all 573 captured words in 40,000 cases
(zero differences). Coverage includes phases 0 through 3, zero/nonzero angles,
all prior contact branches, and aliased transform nodes. The standalone helper
also preserves the original unordered sign comparison and cap selection, and
uses the unchecked inverse-square-root lookup behind the original guards.
The regression corpus is stored as compressed JSON.

Report: `mcm-normal-rotation-substep-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-normal-rotation-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
The next connection is the bike-event transition call (`0x4a4b60`) at
`0x4ac17b`, then normal-state alignment and collision/tail/entry integration. Complete-bike
acceleration and throttle-release trajectory parity remains unproven.

### Connected grounded alignment

The alternate normal-state branch now reaches `0x4ac5c5`, retaining the
connected airborne branch through `0x4ac17b`. Grounded alignment resolves
world matrices at each original call, rotates the local body about the front
load pivot, damps angular velocity, and applies steering minimum/maximum and
rate limits. It preserves original contact masks, scratch vectors, cache
invalidation and node aliasing.

All 577 captured words match the pinned original in 40,000 executions.
Connecting this branch exposed exceptional-value propagation in world-matrix
composition and axis-angle construction. These now use the recovered x87
arithmetic semantics rather than replacing every NaN with negative indefinite
or relying on host arithmetic for mixed NaN signs. Cases 1099 and 3367 are
explicitly retained in the compressed regression corpus. Coverage includes
active masks 0 through 3, paired/single/no-contact paths and valid/invalid
world-cache exits.

Report: `mcm-normal-alignment-substep-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-normal-alignment-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
Next are the bike-event transition calls and subsequent branch joins, then
collision/tail and entry integration. Full acceleration/throttle-release
trajectory parity is still unproven.

### Connected normal-branch event decision

All three normal-state routes now execute their original call to `0x4a4b60`
and its real decision callee `0x4a4d70`, stopping at `0x4a4baa` before event
setup. Already-crashed states retain the existing `0x4ac6cd` exit. Decisions
consume the preceding simulation's current position, velocity, angular rates,
contacts, suspension/cooldown flags, steering state and speed. Only external
input and CRT random queries are supplied by the harness.

The pinned original matches all 584 captured words in 40,000 executions,
including 4,752 triggered events. Coverage explicitly requires triggered
reasons 1, 2, 4, 5, 6, 7, 8, 9 and 12, plus input/random callbacks and skipped
crashed states. Reason 10 is unreachable from these call sites because their
argument 9 is zero; its standalone coverage remains separate. Rider input and
high-counter seeds are independent of lean-disabled and forced-crash seeds.

Report: `mcm-normal-event-decision-substep-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-normal-event-decision-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
This boundary captures the decision return value before the caller stores
`bike+0x844`; it does not claim event setup or rider initialization is connected.
Those mutations, the caller's remaining branches, collision/tail and entry
integration remain ahead of complete acceleration/throttle-release trajectories.

### Connected event setup and rider initialization

The normal-state calls now return from the original `0x4a4b60` wrapper at
`0x4ac1b2`, `0x4ac5fc`, or `0x4ac681`. The connected model commits the event
state, updates its envelope, optionally resets body orientation and bounds,
clears animation/lean flags, applies the event angular minimum, and initializes
the rider controller with original random-selection ordering and resource IDs.
The orientation source is the same node used by earlier normal controls.
Parented target bodies and aliased source/target nodes are covered.

All 611 captured words match in 40,000 pinned-original executions. Regression
coverage includes event/no-event paths, orientation reset with root and parented
targets, source aliases, alternate resources, empty/nonempty first rider groups,
and launch-plus-rider random calls. The existing event orientation helper now
supports parented targets and recovered exceptional cross-product arithmetic.
Signed-zero headings are retained explicitly in fixture inputs. Event decision
and setup captures encode fields before concatenation, avoiding host-array NaN
sign canonicalization.

Report: `mcm-normal-event-setup-substep-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-normal-event-setup-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
This corpus uses an empty bounds-child callback list; callbacks remain covered
standalone and must still be connected to this prefix. Caller joins and trick
handling, collision/tail integration, entry wiring and whole-bike acceleration/
throttle-release trajectories remain incomplete.

### Connected event child-transform callbacks

Event orientation reset now dispatches the bounds-child records in original
list order, using the real player vtable callback in the reference. Two attached
components participate in the same transform graph as the preceding physics,
including earlier invalidation and nested component parents. The recovered
callback applies each record's local or relative orientation and position,
retaining record-vector mutations and untouched/skipped state.

All 704 captured words match in 40,000 pinned-original executions. Coverage
includes zero through three callbacks, repeated component selection, alternating
local/relative records, flat/nested components, and event/no-event paths.
Case 25608 exposed a NaN-sign difference in pointer-argument matrix composition;
that matrix product now uses recovered x87 multiply/add semantics and the case
is explicitly retained in the compressed regression corpus.

Report: `mcm-normal-event-children-substep-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-normal-event-children-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
Next are the caller's post-event joins and trick handling, then collision/tail
and entry integration. Full whole-bike acceleration/throttle-release trajectory
parity remains unproven.

### Connected post-event joins and rider-call arguments

The normal callers now execute their post-event branches through the common
`0x4ac6cd` join or the entry of `0x4aecb0`, before its prologue. Triggered events
set the shared chassis control flag (`stack+0x20`) to 1 and clear `bike+0x8c8`.
Untriggered normal states call rider update only when that existing flag is 1.
The height argument follows the airborne/limited/grounded route and rear-wheel
contact; control comes from the already-updated rider balance filter, not a
separate input. The third argument is the original timestep.

All 710 captured words match in 40,000 original executions, including 7,235
rider calls. The harness observes entry arguments and exits before executing the
rider body; it does not substitute a fake rider result. Already-crashed states
and skipped calls preserve their scratch values. Initial failed comparisons
identified the shared contact flag and filtered-balance argument and eliminated
incorrect independent harness inputs for those values.

Report: `mcm-normal-event-join-substep-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-normal-event-join-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
The rider-update body (including input, pose/blend and transitions), common
collision/tail, entry wiring and whole-bike trajectory comparisons remain to
be connected. Full acceleration/throttle-release parity remains unproven.

### Connected complete rider-update body

The continuous prefix now executes the original `0x4aecb0` body and returns to
`0x4ac6cd`. Rider controls use the validated call arguments and current physics
state. The reference runs real bike-input aggregation, orientation reset, child
callbacks, nearby interaction, directional trick startup, animation selectors
and pose/blend. Only device responses, animation records and world-list data
are supplied. A valid player input controller is shared with the earlier event
decision; the device boundary now handles its button-8 query as well.

The recovered event/trick graph adapter accepts the existing live graph, so
rider transitions update the same body, source, attached components and caches
used by the physics prefix. Existing standalone callers retain their cloned
graph behavior. The adapter preserves a previous nearby reference unless a
nearby query actually occurs.

All 743 captured words match in 40,256 pinned-original executions: the 40,000
broad cases plus 256 independent input/animation variations of case 14630,
which naturally reaches the airborne rider-input path. The initial broad run
had only one input-query case; targeted cases exercise both flag-16 button
branches, six directional trick selections, accepted/rejected/missing nearby
candidates, animation seeking and normal pose/blend paths without bypassing
the preceding physics. Cases use synthetic records and a shared bike/rider
component graph; live assets and independent rider graphs remain separate.

Report: `mcm-normal-rider-substep-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-normal-rider-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
Next is the common post-event state and collision/tail connection, followed by
entry wiring and full acceleration/throttle-release trajectory comparisons.
Full whole-bike parity remains unproven.

### Connected common post-event state

The continuous prefix now reaches `0x4ac7c4` after the common post-event block.
It extracts the body position, applies the low-speed paired-contact yaw stop,
resolves the world transform and converts local angular velocity, handles the
delayed award/timer, and stores wheel-height history and the last timestep.
The award reference executes the real `0x4b1a40`; optional UI observers are absent.

All 748 captured words match in 40,256 original executions. An observation hook
records actual award-callee entry, requiring both paid and suppressed awards in
the corpus. Other coverage includes ticking timers, zero yaw, parented/root
bodies and the preceding event/rider paths. Initial differences were NaN signs
in world-angular conversion; the helper now uses recovered x87 arithmetic and
typed stores. Cases 388, 4300, 8901, 9506, 12610 and 14065 are retained explicitly.

Report: `mcm-post-state-substep-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-post-state-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
The new regression corpus uses lossless Brotli compression to keep it below
GitHub's 50 MB recommended file size; the fixture loader also retains support
for existing JSON and gzip fixtures.
Next is collision processing and the scheduler/orientation tail, then entry
wiring and full acceleration/throttle-release trajectory comparisons. Full
whole-bike parity remains unproven.

### Connected collision synchronization

The original-execution prefix now reaches `0x4ac81b` after collision proxy/grid
synchronization, or `0x4ac89e` on the no-collision-object branch. Collision dispatch
is the next connection. The corpus checks 876 words across 40,256 executions,
including live grid links, type 0/1 centers, root/parented proxies, grid opt-out,
and the preceding rider/event paths.

The collision proxy shares the rider animation object. The reference preserves
its animation state and components while attaching a distinct proxy transform
before the physics prefix. Recovered rider animation callbacks now accept that
separate target; existing shared-target callers retain their behavior. The first
extended run exposed NaN-sign differences in proxy translation and world-center
conversion. Recovered x87 operations now preserve those signs; the final corpus
matches every captured word. Explicit regressions include cases 388, 2328, 5238,
5529 and 6984.

Report: `mcm-collision-sync-substep-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-collision-sync-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
Collision callbacks, scheduler/entry wiring and whole-bike acceleration/release
trajectories remain to be connected and validated. This is not full parity.

### Connected static collision dispatch

The continuous prefix reaches `0x4ac89e`, executing the original grid dispatcher,
static-wall primary callback, impulse response and collision-triggered event
setup. All 917 captured words match across 40,320 original executions. An
observation hook counts real primary-callback entries; another captures the
pre-dispatch bike state. Required coverage includes a new collision-triggered
crash with the remaining-substep reset, callbacks without a new crash, existing
crash states, absent objects and skip/object/manager dispatch gates.

The recovered normal and collision paths now share event-decision and setup
helpers while retaining the live transform graph and cumulative external-input
counts. The connected corpus exposed an overly strict inverse-square-root input
check in line collision and an unordered projection clamp: the original uses
its unchecked lookup and clamps an unordered projection to zero. Cases 23474
and 28987 are explicit regressions; 64 variants of the observed crash case vary
line direction, radius, dispatch gates and the pair cache.

Report: `mcm-collision-dispatch-substep-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-collision-dispatch-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
This connected corpus covers static-wall callbacks. Dynamic bike/rider collision
callbacks, the scheduler/orientation tail, entry wiring and complete
acceleration/throttle-release trajectories still need connected validation.
Full physics parity remains unproven.

### Connected scheduler and orientation finish

The continuous ordinary prefix now reaches `0x4ac94b`, immediately before the
loop-back branch. It includes the remaining-substep decrement, carry threshold,
remainder timestep/inverse-timestep replacement, and final forward/up, angle
and trigonometric-cache refresh. All 931 captured words match across 40,326
original executions. Explicit carry cases exercise zero, negative carry, the
exact threshold `0x38d1b717`, and its adjacent float32 values.

The larger connected state exposed 3,595 orientation differences in the initial
run. Original x87 C3 guards treat unordered normalization results like zero and
inspect the raw square root before storing float32. Matching those guards and
arithmetic order left nine yaw NaN differences; original CRT acos preserves an
incoming quiet NaN, which the recovered helper now does explicitly. Regressions
include cases 3, 388, 8439, 9506, 14065, 16975, 21146, 21922, 25608 and 38509.

Report: `mcm-finished-substep-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-finished-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
Dynamic bike/rider collision callbacks, entry/loop-back wiring and complete
acceleration/throttle-release trajectories still need connected validation.
Reaching this synthetic substep boundary does not establish whole-bike parity.

### Connected ordinary suspension/contact entry

The original-execution comparison now starts at `0x4a5e27` and continues through
`0x4ac94b` on the ordinary, no-reset-request path. The added entry resets front
translation and the rear rest matrix, clears both suspension travel-limit flags,
preserves contact scratch vectors and refreshes the balance-reference world position.
(The original no-op vector constructor was initially misread as clearing; the
pre-branch observation below corrects that interpretation.)
All 931 captured words match across 40,326 original executions, including aliased
front/rear/body/balance nodes and parented transforms.

The initial field mapping cleared active flags instead of travel-limit flags;
comparison corrected that distinction. Entry preparation also changes which
synthetic state reaches airborne rider inputs. Case 5629 now supplies those
variants naturally, with independent horizontal/vertical inputs and matching
raw-bit metadata. Required trick and nearby-interaction coverage remains present.

Report: `mcm-prepared-substep-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-prepared-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
Engine entry `0x4a5bd7..0x4a5e27`, reset requests, dynamic bike/rider collisions,
loop-back wiring and complete acceleration/throttle-release trajectories remain
to be connected and validated. Full physics parity remains unproven.

### Connected engine/input entry

The continuous original comparison now runs `0x4a5bd7..0x4ac94b`: engine/input
entry, ordinary suspension/contact preparation, physics, static collisions and
substep finish. All 964 captured words match across 40,326 original executions.
An entry observation captures throttle/brake, gear, shift timer, mass selection,
vertical acceleration filtering and ordered device calls before their shared
state flows into the rest of the physics. Coverage requires up/down shifts,
ordered brake/throttle polling, analog/digital control and low-speed stopping.

Recovered engine entry initializes the same torque/contact scratch state and
shares brake, velocity, mass, engine level, RPM demand and gear ratio with the
physics path. The checked public throttle helper retains its input validation;
the recovered entry uses an unchecked path matching finite out-of-range original
engine levels. The expanded corpus exposed a bike/rider mass mapping error,
original CRT asin domain-error behavior (case 8092), and a NaN sign lost by an
acceleration array literal (case 8901). Typed stores and recovered arithmetic
preserve the original results. Signed-zero brakes use the shared restored bike
field when replaying serialized fixtures.

Report: `mcm-engine-entry-substep-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-engine-entry-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
Reset requests, dynamic bike/rider collisions, frame-entry/loop-back wiring and
complete acceleration/throttle-release trajectories remain to be connected and
validated. This synthetic single-substep comparison does not prove full parity.


### Common preparation scratch preservation

An added observation at `0x4a5ea5`, immediately before reset/ordinary branch
selection, captures four scratch vectors. The original `0x40ded0` constructor
only returns its input pointer; it does not clear their contents. The recovered
preparation previously cleared them, a difference hidden by later ordinary
contact writes. The new observation detected 483,912 mismatching words across
40,326 executions before the correction (all twelve added words in every case).

Common preparation now preserves these vectors and is exposed separately for
reset-path integration. The engine-entry corpus includes the twelve intermediate
words as well as the existing 964 entry/final observations. All 976 words match
across 40,326 original executions after the correction. This strengthens
single-substep evidence; reset/force integration, dynamic collisions, repeated
substeps and whole-bike acceleration/release parity remain incomplete.

### Common preparation connected to reset selection and pose

The reset comparison now enters at `0x4a5e27`, sharing the original front
translation reset, rear rest-matrix restoration and balance-reference refresh
before selecting the nonzero-reset branch. It continues through `0x4a64dc`,
including all reset pose selection helpers, bike/engine reset, terrain support,
bounds-child callbacks, collision proxy/grid synchronization and cooldown flags.
All 1,566 captured words match in 16,384 original executions.

Required coverage includes every reset mode (0–4 and fallback), shared and
distinct suspension nodes, body/reference aliasing and parented/unparented rear
nodes. The initial rear rest matrix lives in its real component storage; it is
not rebuilt after preparation invalidates or mutates the live transform graph.
The original constructor calls preserve scratch storage at this boundary.

Report: `mcm-prepared-reset-substep-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-prepared-reset-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
This connects common preparation to reset, but the reset-produced state still
needs to flow into the complete downstream force/collision/finish path. Engine
entry preceding reset, dynamic collisions, frame loops and full acceleration /
throttle-release trajectories remain unproven.

### Reset output connected to common contact and force preparation

The reset comparison now continues from `0x4a5e27` through `0x4a6eac`.
Reset-produced wheel positions, contact depths, tangent/normal vectors, body
orientation and cleared bike state flow into force initialization, target roll,
mount/contact geometry, chassis probes and contact response. It does not rerun
the ordinary wheel-query branch. Both chassis control flags and mutable bike
fields are carried back into the reset context for subsequent integration.

All 1,608 captured words match in 16,384 original executions. Coverage requires
both reset contact combinations, skipped/executed chassis probes, front probe
outcomes 0/1/2, body contact 0/1 and shared/distinct front mount/body nodes. The
new observation captures forces, alignment, lever arms, chassis world/surface /
normal vectors, depths and remaining-substep state, alongside the complete
reset memory and graph observations.

Report: `mcm-reset-contact-response-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-reset-contact-response-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
Reset output has reached common contact response; its continuation through
balance/suspension, tire/chassis forces, integration and substep completion is
still outstanding. Engine entry preceding reset, dynamic collisions, repeated
frames and complete acceleration/throttle-release parity remain unproven.

### Reset output connected through balance and both suspension branches

The connected reset comparison now reaches the rear drive-force boundary
`0x4a7c46` or front-only join `0x4a8602`, with the no-contact exit also observed
at `0x4a8b6e`. It continues from common preparation at `0x4a5e27` through reset,
contact response, rider balance filtering, wheel weights, balance-center offset,
front suspension, front load/velocity/tire response and rear suspension.
All 1,680 captured words match in 16,384 original executions.

Coverage requires neutral/nonzero rider lean, filter durations below/equal/above
the timestep, equal/non-equal weight distribution, both reset wheel-contact
outcomes and chassis-limited/unlimited suspension outcomes. Reset itself leaves
one wheel at zero penetration and the other at -0.01, so these executions validate
the naturally reached suspension reset/skip branches, not arbitrary active
compression. Active compression remains covered by the separate ordinary-path
corpus; consecutive steps after reset still require integration and validation.

Mutable balance-center, local lever, suspension history, contact depths and
control fields are written back to the reset context. The comparison observes
skipped scratch fields as well as newly calculated loads and motion fields.

Report: `mcm-reset-suspension-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-reset-suspension-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
Rear drive/loading, force accumulation, motion integration and substep completion
still need to be connected to this reset path. Engine entry preceding reset,
dynamic collisions, repeated frames and complete acceleration/throttle-release
parity remain unproven.

### Reset state connected through tire forces and chassis impulse

The continuous reset comparison now runs `0x4a5e27..0x4a9b29`. It extends the
balance/suspension path through rear drive/loading, velocity and traction,
combined tire-force accumulation, braking gates, chassis contact merging,
penetration correction, angular response and the real type-3 impulse solver.
All 1,763 captured words match in 16,384 original executions.

Required coverage includes rear traction enabled/skipped by its speed threshold,
positive/negative traction factors, front-only/rear-contact drive routing, skipped
chassis handling, two/three merged contacts and changed/unchanged angular state.
The reset-produced engine release flag yields zero drive thrust; reset also
clears braking. This validates their actual immediate post-reset behavior, not
accelerating or actively braking trajectories. The corpus supplies a present
engine for the downstream original drive call, while earlier reset-only tests
continue to cover engine absence.

Position, balance center, local/angular velocity, contact lever, rear speed and
suspension history remain connected through their original shared fields. The
new observation captures skipped scratch alongside rear traction and chassis
solver outputs; only external random input, initial scratch and observation
boundaries are supplied to the original.

Report: `mcm-reset-chassis-impulse-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-reset-chassis-impulse-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
Reset-path suspension/contact force contributions, angular/linear integration,
transform updates and substep completion remain to be connected. Engine entry
preceding reset, dynamic collisions, repeated frames and complete acceleration /
throttle-release parity remain unproven.

### Reset forces connected through integrated motion and transforms

The continuous reset comparison now runs `0x4a5e27..0x4ab7fd`. Following chassis
impulse handling, it executes suspension-force preparation, single/paired-contact
force assembly, contact pivot correction, opposing angular acceleration, angular
integration, force-to-linear acceleration and position integration, then ordered
wheel rotations and body translation/pivot rotation on the live transform graph.
All 1,829 captured words match in 16,384 original executions.

Required coverage includes both reset contact masks, pitch-counter changes,
nonzero linear motion, zero/nonzero body rotation, large rotation angles, shared
wheel/body nodes and shared/distinct wheel nodes. Reset still reaches one-wheel
contact here, so the paired-contact helper retains its original skip behavior;
paired force execution is covered separately by the ordinary-path corpus.
Counter words at bike+8bc/+6e0 are encoded as integers, independently of the
surrounding float state. No state is re-seeded between reset, forces and motion.

Report: `mcm-reset-motion-transform-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-reset-motion-transform-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
The remaining reset-path connection is post-motion control/events, rider/common
updates, collision dispatch and scheduler completion. Engine entry preceding
reset, dynamic collisions, frame-loop persistence and complete acceleration /
throttle-release trajectories remain unproven. This is synthetic single-substep
evidence, not full gameplay parity.

### Reset motion connected through grounded alignment

The continuous original comparison now reaches the event-call boundaries at
`0x4ac5c5` and `0x4ac64a`, starting at shared preparation `0x4a5e27`.
All 1,832 captured words match across 16,384 original executions. The reset
clears state844 and establishes ground contact; the original therefore selects
grounded alignment or the limited-contact bypass. Both gates, both contact
masks, and changed/preserved alignment scratch are required corpus outcomes.
No force, motion or transform state is replaced between stages.

The ordinary and reset paths share the same grounded-alignment implementation.
The comparison includes the resulting bike roll target/correction, angular
state, transform caches and local alignment vector. Original controller and
airborne branches are naturally skipped here; their independent ordinary-path
coverage does not establish reset-to-event or multi-frame parity.

Report: `mcm-reset-alignment-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-reset-alignment-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
Remaining: reset event/rider/common updates, collision dispatch and scheduler;
shared engine/reset entry and persistent frame loops; dynamic collisions; full
acceleration and throttle-release trajectory agreement and playable integration.

### Reset alignment connected to the event decision

The continuous reset comparison now executes the normal/limited event-call
setup and the real `0x4a4b60` wrapper through its `0x4a4d70` decision callee,
ending at `0x4a4baa` before the wrapper commits state844 and initializes the
rider. All 1,835 captured words match in 16,384 original executions.

Required outcomes include launch (reason 12), roll (5), front-contact pitch (7),
upright threshold (6), deceleration (4), and no event. Both suppression states,
input queried/skipped, and limited/unlimited entry paths are represented. The
input-query callback supplies the external input result; the original grounded
gate still prevents the airborne input event. Random draw order remains one
reset/shift-threshold draw followed by two launch draws when reached. The
resulting launch linear/angular velocities and total/per-event call counts are
compared, with no intermediate physics state replacement.

Report: `mcm-reset-event-decision-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-reset-event-decision-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
Event setup/rider updates, common tail, collisions and scheduler remain to be
connected on this reset path. Shared engine entry, persistent multi-frame
execution, dynamic collisions, complete acceleration/release trajectories and
playable integration remain unproven.

### Reset events connected through rider initialization

The continuous reset comparison now returns from the real event wrapper at
`0x4ac5fc`/`0x4ac681`. It executes state844 commitment, the crash-effect envelope,
saved heading/direction, pitch angular-velocity floor for kind 1, controller
linear/angular velocity handoff, the real `0x40fa10` animation-record selection,
and resource selection. All 1,851 captured words match in 16,384 executions.

Required outcomes include event and no-event preservation, empty/nonempty first
animation groups, pitch-floor application, both limited-contact entry branches,
and zero/two/three/four/five event-plus-rider random draws. The reset draw remains
first; launch consumes two more before rider selection consumes two or three.
Record groups are valid synthetic inputs. The original selection code executes;
only its external random source and input-query callback are supplied.

The reset clears flag820, so event-root reorientation and child-bound rebuilding
are naturally skipped here. Their independent ordinary-path comparisons remain
separate evidence. Controller state is captured alongside the full bike, engine,
effect, transforms, contact/force/motion scratch and random/input counts.

Report: `mcm-reset-event-setup-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-reset-event-setup-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
Remaining reset connections: event join, normal rider update, common tail,
collision dispatch and scheduler. Engine/reset entry, persistent frame loops,
dynamic collisions, complete acceleration/release trajectories and playable
integration remain unproven.

### Reset event return connected to rider-call selection

The reset path now continues from the event wrapper return to `0x4ac6cd`, or
to the entry of `0x4aecb0` when the original calls the normal rider update.
All 1,855 captured words match across 16,384 original executions. Triggered
events force the remaining-step flag to one and clear bike+8c8; non-events
preserve that delay and call the rider update only when the flag equals one.

The comparison captures the actual rider-call height, filtered balance control
and timestep, alongside full preceding bike/controller/transform/physics state.
Required outcomes include called/skipped, event/non-event, cleared/preserved
delay, front/rear contact, zero/nonzero height, and limited/unlimited contact.
The rider entry is an observation boundary: its body has not executed in this
reset corpus. No physics or branch condition is stubbed or reseeded between
reset and call selection. Ordinary and reset paths share the join implementation.

Report: `mcm-reset-event-join-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-reset-event-join-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
Next reset connections remain the rider-update body, common tail, collision
dispatch and scheduler. Shared engine/reset entry, persistent frames, dynamic
collisions, whole acceleration/release trajectories and playable integration
remain unproven.

### Reset path connected through the complete rider-update body

The continuous reset comparison now executes `0x4aecb0` when selected and returns
to the common `0x4ac6cd` tail. All 1,855 captured words match in 16,384 original
executions. The rider-entry observation preserves and resumes the original
prologue; it no longer exits before the rider body.

The reached paths include the signed bike+bfc early-return gate, grounded
height-based pose selection (full and fractional weight), low-speed pose
selection, secondary weight, and steering blend/envelope update. Steering
limits vary independently of call/gate selection, including zero, negative,
below-pi/4 and at/above-pi/4 values. No rider state is reseeded after reset.
Pose integer words, float weights, blend and the crash effect are checked in
the full bike/controller/physics snapshot.

Reset naturally establishes field4bc=0 and flag820=0 here. The shared rider
implementation therefore skips airborne input/trick/orientation callbacks;
the adapter checks those reset invariants rather than inventing callbacks.
The complete original function executes without branch patches or force stubs.
Ordinary airborne/trick coverage remains separate from this reset connection.

Report: `mcm-reset-rider-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-reset-rider-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
Remaining reset connections: common post-state tail, collision dispatch and
scheduler. Shared engine/reset entry, persistent frame loops, dynamic collisions,
whole acceleration/release trajectories and playable integration remain unproven.

### Reset post-state and collision synchronization connected

The continuous reset comparison now reaches `0x4ac81b` with a collision object,
or `0x4ac89e` without one. All 1,856 captured words match in 16,384 original
executions. The preceding `0x4ac6cd..0x4ac7c4` post-state section was also compared
independently with zero differences before extending through synchronization.

The shared implementation refreshes bike position from its local transform,
resolves cached world transforms for angular velocity, commits front/rear
contact-height history and last timestep, then synchronizes the live collision
matrix, proxy and spatial grid. Existing grid entries are reused from reset;
no intermediate transform or physics state is replaced. Required coverage spans
normal/event states, zero/nonzero world angular velocity, parented transforms,
body/wheel/proxy aliases, collision present/absent, and enabled/disabled grids.
The delayed-award entry is observed and remains uncalled after these resets;
its ordinary-path coverage remains separate evidence.

Reports: `mcm-reset-post-state-validation.json` and
`mcm-reset-collision-sync-validation.json`. Reproduce the full connection with
`node scripts/mcm-reference/compare-reset-collision-sync-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
The collision dispatcher and scheduler are the remaining reset-tail connections.
Shared engine/reset entry, persistent frame loops, dynamic collisions, complete
acceleration/release trajectories and playable integration remain unproven.

### Reset state connected through static collision dispatch

The continuous reset comparison now executes collision dispatch through
`0x4ac89e`, including the real `0x42ccc0` live-grid/pair traversal, horizontal
wall primitive, `0x49e490` primary callback, `0x49d900` static response, collision
impulse and event wrapper. All 1,898 captured words match in 16,400 executions.
There are 362 real wall callbacks, including 16 normal-to-crashed transitions.

The grid now carries valid owner IDs resolving to the bike and wall objects.
Both enabled flags, preserved pair suppression (3), hits/misses, normal/crashed
incoming states and callback-induced event transitions are required outcomes.
Pair tables, contact scratch, both objects' contact vectors, callback counts and
pre-dispatch state/angular observations are compared with the full prior state.
Pre-dispatch angular observation retains rider pitch-floor coverage even when
the subsequent impulse changes angular velocity.

Walls are initial environment inputs placed near/far from the predicted prefix
position; every original run still executes the complete prefix without state
replacement. Sixteen additional initial-state scenarios set a deceleration
threshold crossed by the wall response. Native execution independently verifies
that the collision creates the event, sets one remaining step, and clears carry.
The same event commit/setup helpers serve reset and callback paths. Optional
particle/audio systems are disabled in the supplied environment; physics callees
are not stubbed.

Report: `mcm-reset-collision-dispatch-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-reset-collision-dispatch-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
This is the static-wall connection. Dynamic bike/rider collision callbacks,
scheduler completion, shared engine/reset entry, persistent frames, complete
acceleration/release trajectories and playable integration remain unproven.

### Reset path connected through substep completion

The continuous original reset path now reaches `0x4ac94b`, immediately before
loop-back. All 1,902 captured words match in 16,400 executions, including the 16
collision-induced crash cases from the preceding milestone. The original
scheduler decrements remaining steps and consumes positive carry only when the
count reaches zero. The corpus includes 2,227 carry-consuming executions and
all remaining-step outcomes (0, 1, 2). Orientation refresh runs from the live
body transform after collision dispatch, preserving aliases and node caches.

The recovered path uses the same scheduler/orientation helper as the ordinary
path. The native harness observes pre-scheduler carry/count without replacing
state, then executes the real scheduler and orientation callees. This milestone
stops before loop-back; it does not establish persistent-frame parity.

Report: `mcm-reset-finished-substep-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-reset-finished-substep-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
Shared engine/reset entry, repeated substeps and frame completion, dynamic
bike/rider callbacks, complete acceleration/release trajectories, and playable
integration remain outstanding.

### Engine entry connected through reset and completed substep

The continuous alternate path now starts at `0x4a5bd7`, before engine/input
processing, and reaches `0x4ac94b`. All 1,937 captured words match across 16,400
original executions. Engine and bike fields flow directly into the reset path;
there is no state replacement at the engine/reset boundary. An observation-only
hook captures the 33 engine-entry outputs before reset can clear them. Final
analog and acceleration filter values are also compared, alongside the complete
prior substep state.

Required outcomes include digital and analog throttle, incoming normal/crashed
states, upshifts/downshifts, ordered brake/throttle device polling, and low-speed
stopping. All 16 collision-induced event transitions and 2,227 carry-consuming
scheduler cases remain covered. The same engine parameter tables and object
serve input processing and reset. The input controller is valid throughout:
original non-AI engine input dereferences it unconditionally, so the old
reset-only harness's absent-controller case is invalid at this earlier entry.
The real input aggregator runs; only device responses and CRT draws are supplied.

Report: `mcm-reset-engine-entry-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-reset-engine-entry-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
Ordinary and reset paths now share the same original entry/exit addresses in
separate continuous comparisons. A unified persistent state representation,
actual loop-back/frame execution, dynamic bike/rider collision callbacks,
end-to-end acceleration/release trajectories, and playable integration remain
outstanding. This corpus does not establish full simulation parity.

### Actual reset loop-back into the next engine update

The native harness now executes the original loop decision at `0x4ac952` and
branch at `0x4ac954`. Of 16,400 initial scenarios, 8,964 continue through the next
engine update to `0x4a5e27`; 7,436 exit at `0x4ac95a`. All 1,971 captured words
match. The recovered continuation uses the same live bike, rider, engine,
filters and scheduled timestep. It does not reconstruct state from fixtures.

The first completed substep is observed before the original branch. The next
33 engine outputs are captured separately, covering the next shift timer,
throttle/gears, brake, mass, velocity, previous speed and acceleration filter.
Both carried and ordinary timesteps, normal/crashed state, low-speed stop and
ordered device polling are required outcomes. Native first-substep snapshots
are restored only after execution terminates, for output serialization; no
physics input is replaced between the completed substep and next engine entry.
The original branch and displaced stack cleanup retain their original behavior.

Report: `mcm-reset-loop-entry-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-reset-loop-entry-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
This proves the engine-state handoff across an actual loop-back. The second
contact/force substep, unified ordinary/reset execution, complete frame tail,
dynamic bike/rider collisions, acceleration/release trajectories and playable
integration remain outstanding.

### Persistent reset loop-back through the next ordinary contact pass

The continuing original path now reaches `0x4a64dc` on its second iteration.
All 2,156 captured words match across 16,400 executions: 8,964 continue through
shared suspension/transform preparation, ordinary wheel terrain sampling,
steering-component rotation and cooldown; 7,436 exit at the loop decision.
The second pass uses the first pass's live bike, engine, transforms, points and
scheduled timestep. No bike state or transforms are replaced between passes.

The added comparison captures reference position, all ten contact points,
heights, both tangents, normal and offset, steering angle, cooldown/flag, four
local/world matrices and cache flags, and suspension preparation limits.
Component-rate input represents the enclosing frame's initial steering rate;
it is supplied once before the first substep and retained across loop-back.
As in the earlier wheel-contact harness, uninitialized local normal scratch is
supplied at wheel-query entry; this does not validate arbitrary native stack
residue. Crash-event cases still end the loop, so the second contact pass in
this corpus is necessarily normal-state, not an independently seeded crash.

Report: `mcm-reset-loop-contact-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-reset-loop-contact-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
The second force/integration pass, full frame completion, dynamic bike/rider
collision callbacks, end-to-end acceleration/release trajectories and playable
integration remain outstanding. Full physics parity remains unproven.

### Persistent second substep through force preparation and chassis response

The continuous native path now reaches `0x4a6eac` on its second iteration.
All 2,358 captured words match in 16,400 executions, including the 8,964 cases
that continue after the first reset substep. The shared force/contact stage is
now callable without rerunning reset or wheel sampling. It consumes the live
second-pass contacts, updated speed, velocity, orientation and controls.

New observations cover contact masks, drag/base force, target roll/cosine,
contact direction and levers, chassis samples/depths, contact flags and response
scratch, plus the transform caches after geometry/probe queries. All four wheel
contact combinations, front-probe outcomes 0/1/2 and both body-probe outcomes
are required. Integer fields `+8c4` and `+c6c` are now decoded and serialized as
raw integer words by the shared reset adapter; previously their untouched bits
round-tripped through floats, which concealed the representation error until
this direct second-response observation.

Report: `mcm-reset-loop-response-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-reset-loop-response-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
The second suspension/tire-force/integration pass, complete frame execution,
dynamic bike/rider collision callbacks, end-to-end acceleration/release
trajectories and playable integration remain outstanding. The earlier
wheel-query scratch and synthetic-state scope limitations still apply.

### Persistent second substep through suspension and tire forces

The second iteration now reaches `0x4a8be0` with zero differences across 2,690
captured words in 16,400 original executions. The second pass consumes live
balance-filter history, suspension travel/displacement and previous heights,
engine throttle/gear state, contact geometry, velocity and the scheduled dt.
It executes balance and weight transfer, both suspension responses, steering
velocity correction, front/rear tire forces, rear drive and traction scaling,
force/torque accumulation and braking. All four wheel-contact combinations,
airborne/grounded balance state and zero/nonzero drive are required outcomes.

The common suspension and tire stages can now run without re-executing reset.
Their state bridge exposes front axis/scale/limit and rear limit/angle/divisor,
using the original offsets (`rear +54` limit, `+4c` divisor). Both-wheel steering
commits changed velocity, turn rate and radius back to the bike. Drive uses the
current gear ratio and the captured original engine torque curve, seeded once
before native execution. No bike or suspension history is reseeded at loop-back.

Report: `mcm-reset-loop-tire-forces-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-reset-loop-tire-forces-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
Second-pass chassis impulse/integration, later control/event handling, full
frame execution, dynamic bike/rider collisions, end-to-end acceleration/release
trajectories and playable integration remain outstanding. The synthetic-state
and supplied wheel-query scratch limitations from earlier stages still apply.

### Persistent second substep through impulse, integration and transforms

The continuous second iteration now reaches `0x4ab7fd`. All 2,963 captured
words match in 16,400 executions, including 8,964 continuing second substeps.
The recovered common stages now execute chassis contact/response and type-3
impulse, suspension force assembly, single/paired contact torque, pivot/contact
correction, angular and linear integration, and ordered wheel/body transforms
without restarting any earlier stage or replacing state across loop-back.

The new comparison captures impulse/integration scratch, bike position and
velocities, accelerations, angular state, contact levers, force/torque, motion
counters, wheel angles, four transform/cache records and suspension histories.
Airborne integration commits cleared suspension histories back to the component
state for subsequent substeps. Required outcomes include enabled/skipped chassis
response, contact masks 0/1/2 and zero/nonzero body rotation. Mask 3 cannot be
produced here: engine entry clears the mask and these correction branches assign
only 0, 1 or 2. Integration vectors are encoded to words before concatenation,
preserving the original negative NaN sign in exceptional synthetic cases.
The pivot transform uses an indexed Float64Array copy: warmed-up x64 execution
otherwise canonicalized negative NaNs when updating a spread-copied matrix.
The fixture regression checks the resulting body matrix as well as scratch.

Report: `mcm-reset-loop-motion-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-reset-loop-motion-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
Second-pass controller/event/post-state completion, repeated full substeps and
frame completion, dynamic bike/rider collision callbacks, whole-bike acceleration
and throttle-release trajectories, and playable integration remain outstanding.
The earlier synthetic-state and supplied wheel-query scratch limitations apply.

### Persistent second substep through control and alignment

The continuous second iteration now reaches the pre-event exits `0x4ac17b`
(airborne control/rotation), `0x4ac5c5` (grounded alignment), or `0x4ac64a`
(limited-contact bypass). All 3,133 captured words match across 16,400 original
executions: 1,101 airborne paths, 2,257 grounded paths, 5,606 limited-contact
bypasses and 7,436 cases that exit after the first substep.

The shared control and rotation stages consume current velocity, angular state,
input fields, suspension limits and timer/phase history without replaying earlier
physics. The controller axis now reads and commits the authoritative `axis624`
vector, which reset clears; stale scalar aliases had hidden this history error.
The raw `+c68` flags and `+6fc` integer are decoded and serialized as integer
words by the reset adapter. New observations include controller vectors, control
rotation, timer/phase fields, alignment scratch and all four transform caches.

Report: `mcm-reset-loop-controls-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-reset-loop-controls-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
Every continuing second pass enters normal state 0; this corpus does not exercise
crash handoff or flag820 velocity redirection. The forward-cache pointer is bound
to the body node before execution. Control-vector and rotation scratch are
observed only on the airborne path that initializes them. Event/rider/post-state
completion, repeated full substeps and frames, dynamic bike/rider collisions,
whole-bike acceleration/release comparisons and playable integration remain
outstanding. Earlier synthetic-state and wheel-query scratch limitations apply.

### Persistent second substep through event setup and rider-call join

The second iteration now continues through the real event decision and wrapper,
then reaches either rider entry `0x4aecb0` or the common `0x4ac6cd` tail. All
3,321 captured words match across 16,400 original executions. Of the 8,964
continuing second passes, 2,360 trigger an event and 3,738 reach rider entry;
2,866 skip the rider with two iterations still scheduled. Event kinds 1–5 and
both two- and three-random-call rider selections are required outcomes.

The event decision can now run against live bike/controller state without
replaying reset or alignment. The wrapper commits crash state, resource choice,
saved heading, effect envelope, rider velocities and selected records. The join
commits remaining-step and delay changes and captures the actual rider-call
arguments. First-pass observations are saved before loop-back and restored only
for serialization after execution stops; live state is never restored between
substeps. Input/random counts in the new suffix are deltas from that boundary.
Existing normal-control scratch is preserved when preparing event input.

Report: `mcm-reset-loop-event-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-reset-loop-event-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
This milestone stops before the second rider body. Continuing cases enter normal
state 0, with no event random calls consumed in the first pass; external random
values remain supplied at their call boundary. Full second-pass rider/post-state
execution, collision synchronization/dispatch, scheduler completion, repeated
frames, whole-bike acceleration/release comparisons and playable integration
remain outstanding. Earlier synthetic-state and wheel-query limitations apply.

### Persistent second substep through the rider body

The second iteration now executes the actual `0x4aecb0` rider body and reaches
`0x4ac6cd`. All 3,496 captured words match in 17,500 original executions. The
corpus adds 1,100 initial-state variants of cases observed to reach rider input,
covering all 16 directional trick selections, both trick buttons and the alternate
`+c68` flag branch. It includes 4,838 rider calls, 1,051 three-button query
sequences, 418 trick selections and 697 enabled airborne pose results.

The shared rider routine now commits enabled/lean/alternate-control state as well
as pose weights, blend peaks and effect history. Second-pass input polling uses
the recovered bike-input gate. Directional tricks call the recovered transition
and both animation selectors; the native harness executes those original bodies,
with animation records and device responses supplied before initial execution.
The appended observations capture flags, pose/blend state, both animation objects,
normal/offset/bounds vectors, all four transform caches and query order. Earlier
stage observations remain snapshots taken before continuing the same live state.

Report: `mcm-reset-loop-rider-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-reset-loop-rider-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
Reset clears the initial enabled state, so nearby interaction and orientation
reset are not reached in this second rider invocation; their isolated recovery
does not yet establish persistent multi-frame parity. Second-pass post-state,
collision synchronization/dispatch and scheduler completion, repeated frames,
whole-bike acceleration/release comparisons and playable integration remain
outstanding. Earlier synthetic-state and supplied wheel-query limitations apply.

### Two complete persistent substeps

The same live second iteration now continues through post-state refresh,
collision proxy/grid synchronization, static-wall dispatch and scheduler completion
at `0x4ac94b`. All 3,994 observed words match in 17,508 original executions,
including eight initial-state cases where the second wall collision starts a new
event. The corpus covers carry consumption, substep exit and a remaining iteration.
State is not restored or reseeded across the native loop-back.

This exposed the original signed 64-bit `_ftol` conversion used by collision-grid
indexing: out-of-range inputs produce the integer-indefinite value with low word
zero. The recovered conversion now preserves that behavior. The standalone grid
corpus also matches all 32,252 native cases, including 90 added finite cases around
integer boundaries and large-coordinate overflow.

Reports: `mcm-reset-loop-finish-validation.json` and
`mcm-collision-grid-validation.json`. Reproduce the connected comparison with
`node scripts/mcm-reference/compare-reset-loop-finish-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.

This establishes two complete substeps for the covered reset-path corpus, not
full simulation parity. Further iterations, actual frame entry and post-loop
completion, persistent rider history, dynamic bike/rider collisions, whole-bike
acceleration/release trajectory comparisons and playable integration remain.
Synthetic initial state and supplied wheel-query scratch limitations still apply.

### Third engine update and ordinary wheel contact

The native harness now follows the second loop-back with unchanged live state
through the third engine/input/filter update, transform preparation and ordinary
wheel-contact pass at `0x4a64dc`. The corpus has 17,508 original executions,
including 4,801 third passes and all four front/rear contact-height sign pairs.
The appended observations preserve both earlier iterations' snapshots and compare
4,213 words per case.

This continuation exposed two previously unhandled exceptional-value branches.
Wheel-axis/tangent normalization uses the original unordered comparison behavior,
which selects the zero vector for a NaN squared length. Terrain coordinate clamping
uses the original unsigned float-bit comparison: negative NaN clamps to zero,
negative zero survives, and positive NaN is rejected by integer conversion.
Collision-line contact stores also preserve NaN signs across JavaScript JIT
specialization. These cases originate from finite synthetic initial state;
they are not evidence that real riding normally produces non-finite coordinates.

Report: `mcm-reset-third-contact-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-reset-third-contact-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
Third-pass force preparation onward, persistent rider history, dynamic collisions,
actual frame entry/completion, whole-bike acceleration/release comparisons and
playable integration still require connected validation. Earlier synthetic-state
and supplied wheel-query scratch limitations apply.

### Complete third persistent substep

The third live iteration continues through force preparation, suspension and tire
forces, chassis response, angular/linear integration, control handoff, event setup,
rider update, static collision dispatch and scheduling at `0x4ac94b`. The native
harness matches all 6,062 observed words in 17,508 cases, including 4,801
third iterations, nearby-rider state and proxy bounds. Bike, engine, rider and transform state persist across both loop-backs.

This continuation required retaining rider animation frame indices and connecting
nearby interaction to the supplied animation records. It also exposed unordered
suspension/pose branches and exceptional arithmetic after finite synthetic inputs
overflow during repeated integration. Lookup callers now preserve the original
unchecked table behavior; checked public lookup helpers retain their contracts.
Capture adapters preserve NaN signs through array copies and argument passing.

Report: `mcm-reset-third-finish-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-reset-third-finish-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
The supplied nearby animation assets have one frame, supplied bounds and no child
animation records; this is a limitation of this connected corpus. Standalone
animation tests do not establish full live animation-history parity. Further
iterations, actual frame entry/post-loop completion, dynamic bike/rider collisions,
whole-bike acceleration/release trajectories and playable integration remain.
Initial synthetic-state and supplied wheel-query scratch limitations still apply.

### Retained-state loop exhaustion

The native harness now follows every scheduled loop-back in this corpus through
its terminal branch at `0x4ac95a`. All 8,130 observed words match in 17,508 cases:
7,436 finish after one substep, 5,271 after two, 3,693 after three and 1,108 after
four. The fourth iteration executes the same engine, wheel-contact, force,
integration, rider and collision routines against retained state. The harness
fails if a fifth iteration is required; the port does not cap runtime scheduling.

This revealed unordered wheel-penetration selection and normal-equality branches,
unconditional inverse-square-root lookups in target-roll calculation, mixed-sign
NaN propagation through contact levers and torque, and NaN canonicalization during
matrix transposition. The fixes preserve the original branch and arithmetic
semantics, including earlier connected observations, rather than dropping inputs
that overflow after repeated integration. Regression fixtures cover all four
observed iteration counts and require an exhausted fourth iteration.

Report: `mcm-reset-loop-completion-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-reset-loop-completion-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.

This validates loop exhaustion for the synthetic reset corpus, not full frames or
whole-bike physics parity. Actual frame entry and the post-loop tail, longer
runtime histories, dynamic bike/rider collisions, repeatable acceleration/release
trajectory comparison and playable integration remain. Supplied wheel-query
scratch, input callbacks and animation-record limitations still apply.

### Post-loop local-velocity acceleration filter

The original terminal loop branch now continues through `0x4ad07a`, immediately
before the subsequent rider update. The port resolves the final body world
transform, converts retained velocity to local space, divides the local Z change
by the stored frame interval, selects the filter interval, and commits filter value,
`field850` and previous local velocity `field854`. Stack slot `0x64` holds the
incoming frame delta plus prior carry; the scheduler substitutes the nominal
step for its zero-delta/no-whole-step fallback. The supplied `frameDelta` corpus
field represents that stored interval, independently of the final substep or
carry-consumption timestep. Zero stored interval is an additional exceptional
input, not evidence that the ordinary zero-delta fallback uses zero.
The real post-loop entry also clears the `field8c0` flag.

The connected corpus supplies the stored frame interval and filter state before native execution
and matches all 8,277 observed words in 17,508 cases on ARM and x64, retaining
all previous loop observations. It
covers one through four substeps, shorter/equal/longer filter intervals, root and
parented bodies, and finite/non-finite results. The optional visual-effect object
at `c90` is absent; the original takes its real visual-effect bypass. This is an
explicit scope limit, not evidence for the present-effect path.

Report: `mcm-reset-post-filter-validation.json`. Reproduce with
`node scripts/mcm-reference/compare-reset-post-filter-oracle.mjs /path/to/mcm.exe /tmp/new-output-directory`.
The `0x4af710` rider/animation update, actual frame entry and return, longer histories,
present visual effects, dynamic bike/rider collisions, whole-bike trajectory
comparison and playable integration remain unvalidated as a connected simulation.

### Frame-end crash animation (`0x4af710`, crash branch)

The frame-end rider routine differs from the `0x4aecb0` rider update inside
individual physics substeps. Its nonzero `bike+0x844` branch now has a recovered
implementation in `crash-frame-animation.js`. It reads the retained component
angle at `bike+0x8ec -> +0x44`, applies the original signed-bit tests and saturation,
stores the animation fraction at `bike+0x730`, and executes the recovered
`0x430ab0` seek with real `0x44f8b0` child orientation/position callbacks. Secondary
control preserves the existing fraction but still seeks the animation.

The native oracle calls the original routine at its entry and runs through its
actual crash-branch return. Across 40,000 cases, all 120 observed words match:
three transform nodes and cache flags, selected frame/record, live bounds,
mutated child axes and the retained animation fraction. Coverage includes states
1–3, both secondary-control branches, signed zero, saturation boundaries, frame
counts 1–8 and frames with zero, one or two child records. See
`mcm-crash-frame-animation-validation.json` for input/output and source hashes.

This is a branch-level validation with synthetic animation assets. Normal-state
animation progression, trick/nearby frame updates, connection to the retained
post-loop corpus, actual frame entry/return, longer histories, dynamic bike/rider
collisions and complete acceleration/throttle-release trajectories remain open.

### Persistent animation advancement (`0x42e890`)

`animation-advance.js` recovers the animation advancement called by frame-end
trick/recovery paths. It retains fractional time, advances/wraps linked frames,
stops non-looping records, tracks current/displayed/previous frames, updates live
bounds, and blends child axes and positions during transitions. The blend clock
uses the accumulated interval (incoming delta plus old animation remainder), as
the original does. The z-axis blend product retains x87 precision until addition;
x/y products are stored as binary32 first. The mirrored bike callback
`0x44f960` remaps components and reflects x using temporary axes, leaving source
records unchanged; its position-enabled check uses the original component index.

The native oracle calls the complete original routine four times per case without
resetting state between calls. All 552 observed words across 40,000 cases match:
animation timing and flags, frame/record identity, live bounds, transform graphs,
cache flags and original/current child axes. Cases exercise looping/non-looping
and stopped records, positive/zero/negative deltas, 1–8 frames, normal/mirrored
callbacks, and ongoing/completed blends with absent or present child lists.
Both bike and rider-proxy vtables dispatch to the same recovered normal and
mirrored child routines; both object types are exercised by the oracle.
Source/input/output hashes are in `mcm-animation-advance-validation.json`.

The corpus uses valid synthetic bike animation assets and positive frame rates.
The two/four-record blend routines `0x430b70`/`0x431250`,
connection to the frame-end rider state machine, complete frame entry/return,
dynamic bike/rider collisions and whole-bike acceleration/release trajectories
still require implementation and original-execution validation.

### Normal-pose blending (`0x430b70`, `0x431250`, `0x431100`)

`animation-pose-blend.js` recovers both two-record and four-record pose blending,
including original frame selection, adjacent-frame interpolation, pair blending,
retained animation pointers, bounds and live child callbacks. Neither routine
normalizes the selected source assets directly: callbacks consume temporary
interpolated children. Bounds come from the last record's following frame.

The two-record routine uses the first record's count to select frames in both
records. The four-record routine does this independently for each pair, but the
second pair's interpolation fraction subtracts the first pair's selected index.
It also rounds the first pair's blend products to binary32 before adding them,
whereas the other pair and final blend use the `0x431100` arithmetic with products
retained on the x87 stack. These details matter even for finite inputs.

Both original routines now match 40,000 cases each (80,000 total), comparing all
395/683 observed words respectively. The observations include three transform
nodes/cache flags, selected frame/record, bounds and every source child axis and
position. Both bike and rider-proxy vtables are exercised with frame counts 1–8,
unequal pair lengths, empty/partial/full child lists, one/two children, fraction
endpoints, and blend weights below zero or above one. The source/input/output
hashes and coverage are in `mcm-animation-pose-blend-validation.json` and
`mcm-animation-four-pose-blend-validation.json`.

These are synthetic valid asset corpora. The complete frame-end rider state
machine, connection to retained post-loop state, actual frame entry/return,
longer histories, dynamic bike/rider collisions and complete acceleration/release
trajectories remain open; this does not establish full physics parity.

### Frame-end normal rider application (`0x4af710` normal/crash paths)

`normal-frame-rider.js` connects the recovered pose-blending and animation-seek
helpers for the normal frame-end rider path. It selects the two/four-record rider
blend, applies the original speed clamp and secondary weighting, selects the
bike's pose or lean animation, then copies the complete resolved bike world
matrix into the rider proxy graph. Crash-state cases execute the separately
recovered crash animation branch instead and retain the rider state.

The native oracle enters at `0x4af710` and runs through the actual return, with no
patches inside this routine or its callees. All 12,000 cases match all 3,247 observed
words: six transform nodes and cache flags, pose/control fields, both animation
objects' selected records/frames and bounds, and all 336 source child records'
axes/positions. Coverage includes poses 0–13, both pose-enable branches, both
rider-parent configurations, childless and populated frames, signed-zero and
clamped speeds, and crash states 1–3. See
`mcm-normal-frame-rider-validation.json` for hashes and coverage.

This corpus supplies finite synthetic state with `field710=0` and `fieldbfc != 2`.
Trick/nearby animation updates and the recovery-animation branch remain open,
as does connecting this frame-end call to the retained post-loop physics state.
Actual frame entry/return, longer histories, dynamic bike/rider collisions and
end-to-end acceleration/throttle-release comparisons remain required for parity.

### Persistent frame-end trick animation (`0x4af7cf..0x4af8fb`)

`trick-frame-rider.js` recovers the nonnegative trick-index branch of `0x4af710`.
It preserves the original short-circuit button polling (6, then 7 only if needed),
increments the trick elapsed time, applies the pinned per-trick two-frame hold
windows, counts down AI hold time and advances rider animation before bike
animation. Both signs of zero release the timer gate. Expiring an AI timer leaves
the current call paused; subsequent calls can advance the animation.

The native harness enters the real `0x4af710` routine and executes its actual
input gate/aggregator and animation callees through return. Only device responses
are supplied. Four consecutive calls retain bike/rider animation objects, source
records and transform graphs. All 20,000 cases (80,000 calls) match all 1,076
observed words, including control timers, queried action order, animation state,
bounds, source children, and six transform nodes/cache flags. Coverage spans all
16 trick indices, hold-window boundaries, AI/secondary-control gates, alternating
button responses, stopped/looping records and active transition blending.
Hashes and coverage are in `mcm-trick-frame-rider-validation.json`.

The corpus uses valid finite synthetic animation assets. Nearby interaction and
recovery branches, connection to retained post-loop physics state, complete
frame entry/return, longer histories, dynamic collisions and whole-bike
acceleration/throttle-release trajectory parity remain required.

### Complete frame-end rider dispatch, nearby interaction and recovery

`frame-rider.js` now dispatches all branches of `0x4af710`: crash, normal pose,
nonnegative trick, negative-byte nearby interaction and recovery (`fieldbfc=2`).
It receives the raw incoming frame delta, distinct from the carry-inclusive
interval used by the post-loop acceleration filter. The existing normal/crash
and trick adapters now exercise this shared entry point too.

`nearby-frame-rider.js` recovers signed lean/progress handling, target-angle
tracking and single-step wrapping, angle clamps, hold and return phases, and
both animation seeks. The call that clears the interaction flag still seeks the
interaction poses; the next call takes the normal-pose path. All 6,000 cases of
four retained calls match 13,016 observed words per case, including the later
normal-pose transitions and all source child records. See
`mcm-nearby-frame-rider-validation.json`.

`recovery-frame-rider.js` connects original animation advancement, record restart,
orientation restoration, bounds-child dispatch and return to normal posing.
`startMcmAnimation` preserves fractional animation time, matching `0x430a20`.
All 4,000 cases of four retained calls match 13,076 observed words per case,
including animation timing, six transform nodes, orientation scratch and source
child mutations. See `mcm-recovery-frame-rider-validation.json`.

Together with the prior normal/crash and trick corpora, the shared dispatch is
replayed over 42,000 cases / 132,000 calls against original execution. These
corpora use valid finite synthetic state/assets and stationary nearby targets.
They validate the frame-end routine's branches, not a complete physics frame.
Connection to retained post-loop state, actual frame entry/return, longer
histories, dynamic collisions, whole-bike acceleration/throttle-release parity
and playable recovered simulation integration remain open.

### Retained physics-to-rider handoff (`0x4ad07a`)

The connected native harness now optionally captures 56 additional words just
before the frame-end rider call. They cover dispatch/control fields, pose/blend
state, position and orientation scratch, component angle, both animation-object
selectors, bounds and fractional animation time. Pointer values are normalized
using the same record/frame tokens as the existing loop corpus. The JavaScript
observer receives the live context after the acceleration filter; it does not
rebuild the bike or graph. Adding the native observation leaves every byte of
the prior 8,277-word-per-case output unchanged.

All 17,508 cases match the entry capture on ARM64 and x64. The retained states
reach 10,745 crash, 5,413 normal, 996 recovery, 294 trick and 60 nearby branches.
They include 2,172 non-finite speed values and five non-finite headings. Those
exceptional states must remain visible in the connected comparison. See
`mcm-frame-rider-entry-validation.json` and the representative native fixtures.

This establishes the incoming state, not execution of the frame-end call.
The current corpus's trick records contain frame-index placeholders and the
initial rider animation object has no complete record. Before continuing the
original through `0x4af710`, supply complete animation records and initialize
both animation objects **before** the physics loop, then retain their mutations.
Also add the raw incoming frame delta separately from the carry-inclusive
stored interval. Do not reseed state at the observed handoff. Complete frame
entry/return, longer histories, dynamic collisions, trajectory parity and
playable integration remain required.

Reproduce the handoff audit after generating the post-filter corpus:

```sh
node scripts/mcm-reference/compare-frame-rider-entry.mjs /path/to/mcm.exe /path/to/post-filter-corpus /path/to/new-audit-directory
```

Pass `--replay` as a fourth argument to compare an existing native capture under
another Node architecture without rerunning Wine.

### Connected frame-end rider return

`retained-frame-rider.js` now connects the live physics context to `0x4af710`.
Bike controls and pose fields are accessed through the existing bike state;
animation objects are initialized before reset and retained through all substeps.
Trick selection and nearby interaction update those same objects. The frame-end
call uses the raw incoming delta, while the preceding acceleration filter keeps
its distinct stored interval. Child callbacks operate on the existing transform
graph and bounds, including body/proxy aliases and parented components.

The extended original harness now executes the complete reset path, up to four
retained substeps, loop exhaustion, acceleration filter, and the actual rider
routine through its return. All **17,648 cases** match **19,231 observed words**
each: the preceding 8,277-word trace plus 10,954 rider/graph/animation words.
Coverage includes 10,758 crash, 5,473 normal, 984 recovery, 293 trick and 140
nearby calls. Recovery includes 162 already-running and 822 stopped/restarted
animations. Raw and stored frame intervals differ in 14,084 cases. Observation
includes input query count/order, fractional animation time, both animation
objects, live graph/cache state, source child mutations and bounds records.

This is a new connected corpus derived from the earlier arithmetic corpus,
with initial-state requirements made explicit:

- Balance filter values start in the lean-derived `[0.25, 0.75]` domain. The old
  `1.1` seed produced pose `-1` in source case 68, causing the original to read a
  non-animation field as a record pointer.
- Control `+0x6f4` starts in `[-1, 1]`. An old value near `-4972` in source case
  508 drove blend to `1.476`, beyond the linked animation frames; both original
  execution and the recovered implementation failed on that invalid state.
- Pose/trick assets have linked frames, integer FPS, consistent pose component
  indices, and translation flags appropriate to the graph's parent links.
  Nearby assets retain the earlier childless, single-frame records.
- The 140 additional side-target scenarios change other bikes' **initial**
  positions. Their distances remain representable at the large coordinates
  reached by these synthetic trajectories. No target or player state is changed
  at the handoff.

The small regression corpus also exposed a cold-versus-optimized JavaScript
NaN-sign difference in recovery orientation (case 107). Typed orientation scratch
now preserves the original negative x87 NaNs; validation includes both the cold
fixture replay and the complete corpus on ARM64 and x64.

See `mcm-reset-frame-rider-validation.json` and
`tests/fixtures/mcm/reset-frame-rider-wine11.json.br`. Reproduce with:

```sh
node scripts/mcm-reference/compare-reset-frame-rider.mjs /path/to/mcm.exe /path/to/post-filter-corpus /path/to/new-output-directory
```

Use `--replay` to compare retained native captures on another architecture.
The comparator requires all five branches, both recovery paths and distinct
frame timings. It reports native faults and JavaScript exceptions as failures.

The original frame-entry setup and caller tail after the rider return are still
not connected. Original asset/state integration, longer multi-frame histories,
maximum scheduler depth, present visual effects, dynamic bike/rider collisions,
whole-bike acceleration/release trajectory comparison and playable integration
remain required. This milestone does not establish complete frame or physics
parity.

### Connected caller tail and original frame return (`0x4ad07f..0x4ad115`)

`frame-return.js` implements the tail after the rider call. With the manager gate
clear, scene state 3 and this bike selected, it restores the bike and proxy's
**local** translations from the old saved position, using the original ordered
cache invalidation. It sets `+0x568` on that path and clears it on every other
path. Every path then copies the current position to `+0x56c..0x574`.

The extended harness continues from the same retained rider state into the
unmodified caller tail and executes the original epilogue and `ret 4`. Its
continuation is reached by that return, rather than by patching the tail's final
stores or bypassing stack cleanup. Manager/scene state is initialized before
the physics loop. All eight gate combinations are covered, with 2,206 cases
each, including aliased and parented transform nodes already present in the
source corpus.

All 17,648 cases match all 19,374 observed words. The prior physics and rider
captures remain byte-for-byte unchanged against the preceding native corpus.
The new 143 words include the final flag, saved position, four complete
transform/cache states, the old saved position, the current position and the
return observation. See `mcm-reset-frame-return-validation.json` and
`tests/fixtures/mcm/reset-frame-return-wine11.json.br`.

```sh
node scripts/mcm-reference/compare-reset-frame-return.mjs /path/to/mcm.exe /path/to/frame-rider-corpus /path/to/new-output-directory
```

Use `--replay` for comparison on another architecture. The source frame-rider
corpus is required to verify that extending the native run preserves its earlier
observations.

Frame **entry** at `0x4a52c0` remains unconnected. Its initial vector constructors
are no-ops, and `0x4a548a..0x4a54b6` restores the current position when `+0x568`
was set by this tail. Scheduler setup, pre-loop recovery/control handling and
that position-restore pairing must be connected before repeated-frame parity
can be claimed. Longer histories, original asset/state integration, present
visual effects, dynamic collisions, acceleration/release trajectory comparisons
and playable integration also remain open.

### Retained frame return into next-frame entry

The connected harness now calls the original `0x4a52c0` after the previous
frame executes its real epilogue and `ret 4`. It preserves the bike, timing
carry, animation objects, and transform graph. The next-frame observation at
`0x4a5566` follows position restoration and scheduler setup, before recovery
and input processing. The new helper `beginMcmFrame` mirrors that boundary.

All 17,648 retained cases match 19,525 observed words per case, with zero
exceptions. The prior 8,277-word physics prefix and 11,097-word frame-return
trace remain unchanged, apart from the deliberately initialized iteration-cap
word in the prefix. The added 151 words cover scheduler scratch, old/new carry,
raw delta, per-bike nominal step and cap, position/saved position, and all four
transform/cache states. The initial iteration caps are 1/2/4/10 and the next
raw deltas include both signed zeros, 1/120, .02, .04, .25, and 1 seconds.
No state is reseeded between the frame return and next entry.

The source arithmetic corpus includes negative retained timing carry. The
original scheduler processes these as signed counts; the connected helper
preserves that observation. This does not establish those synthetic negative
counts as valid ordinary gameplay inputs. The existing fixed-step public API
retains its previous input validation. The native harness restores the original
settings-load instruction at `0x4a5552`, undoing the older isolated scheduler
harness's early-exit patch before making the real frame-entry call.

Evidence: `mcm-reset-next-entry-validation.json` and 602 regression fixtures in
`tests/fixtures/mcm/reset-next-entry-wine11.json.br`.

```sh
node scripts/mcm-reference/compare-reset-next-entry.mjs /path/to/mcm.exe /path/to/frame-return-corpus /path/to/new-output-directory
```

Use `--replay` for another architecture. The preceding native corpus is
required to verify unchanged prior observations. This boundary still exits
before next-frame recovery/input handling and subsequent substeps. Connecting
those paths, longer histories, original assets/terrain, present visual effects,
dynamic collisions, whole-bike acceleration/release comparisons, and playable
integration remain necessary for full parity.

### Next-frame recovery before input sampling

The retained next-frame harness now continues through `0x4a5672`: the recovery
branch after scheduling and the zero initialization of control scratch `+0x28`.
The initial `+0xbf8` recovery choice is varied between 0 and 1 before reset;
there is no mutation or reseeding at the frame boundary. Modes 1/2/3 with
recovery state `+0xbfc == 1` select animation start or immediate restoration.
Other modes/states bypass recovery. Animation start uses record `+0x77c`,
preserves animation remainder, changes recovery state to 2, and clears the two
trick flags. Immediate restoration changes recovery state to 3, aligns the
body orientation, restores bounds and child transforms, and clears `+0x820`.

The observation adds 228 words: bike/rider state, both animation objects, four
transform/cache states, mutable bounds children, incoming recovery/pose flags,
the initial recovery choice, mode, and zeroed control scratch. Earlier native
observations are compared against the preceding next-entry corpus, allowing
only the intentionally changed initial `+0xbf8` word in the physics prefix.

The retained corpus reaches bypass, animation start without a pose restoration,
and immediate restoration. It does **not** reach animation start with an
incoming `+0x820 == 1`; that branch remains a coverage gap. The helper includes
its disassembled behavior, but this corpus does not validate that combination.
Input processing after `0x4a5672`, subsequent substeps, long histories, original
assets/terrain, dynamic collisions, whole-bike acceleration/release comparisons,
and playable integration remain open.

```sh
node scripts/mcm-reference/compare-reset-next-recovery.mjs /path/to/mcm.exe /path/to/next-entry-corpus /path/to/new-output-directory
```

Use `--replay` for another architecture. Evidence and selected regression cases
are in `mcm-reset-next-recovery-validation.json` and
`tests/fixtures/mcm/reset-next-recovery-wine11.json.br`.

Validation: all 17,648 cases match all 19,753 observed words on ARM64 and x64,
with zero exceptions and zero prior-trace changes. Branch counts are 16,554
bypasses, 546 animation starts, and 548 immediate restorations. The regression
fixture retains 133 cases and passes cold on both architectures.

### Retained player input and explicit controller boundaries

The next-frame continuation now runs `0x4a5672` through player input sampling
at `0x4a57c0`, or through crash input clearing at `0x4a58c8`. It reads the three
axis scalars from the original settings layout, preserves analog-disable `-1`,
negates the longitudinal and steering axes, and applies cubic steering for
device kinds 2/3 unless device byte `+0x5d` is 4. The two multiplications retain
intermediate precision until the final float store. The completed-trick gate
clears `+0x710` and sets `+0x714` before control dispatch. Crash input clearing
sets only the low byte of `+0xb6c` and zeros the original control words.

AI and scripted control are **pending boundaries**, not simulated callbacks.
The native harness stops at `0x4a56d3` before the AI call to `0x46d240`, or at
`0x4a57b1` before the scripted call to `0x470560`. The recovered helper returns
`pendingController` for these paths. Player cases finish input sampling; crash
cases finish clearing. No path is represented as a complete next frame.

The harness initializes axis/device inputs and analog enable before the first
reset. It changes no bike state at the frame handoff. Prior native traces must
remain unchanged, allowing only the initial `+0x6f8` enable word in the prefix.
Twenty added observations capture dispatch, current and previous trick flags,
AI/scripted flags, analog enable, the byte-preserving crash flag, all affected
controls, the analog value, raw frame delta, and rider stopped state.

```sh
node scripts/mcm-reference/compare-reset-next-input.mjs /path/to/mcm.exe /path/to/next-recovery-corpus /path/to/new-output-directory
```

Use `--replay` for another architecture. Evidence is in
`mcm-reset-next-input-validation.json` and
`tests/fixtures/mcm/reset-next-input-wine11.json.br`. Steering-rate setup,
pre-loop reset/terrain checks, AI/scripted controllers, subsequent substeps and
continuous acceleration/release trajectories remain open, alongside the prior
recovery coverage gap and original-world/playable integration work.

The input corpus also adds initial-state variants with non-looping trick records
and a 1.2-second first-frame raw delta. These exercise animation completion
followed by `+0x710` clearing and `+0x714` activation at the next entry. They are
compared against original execution but are reported separately from the
unchanged-prior-source check because their initial assets/delta differ.

Cold x64 replay exposed a NaN sign change in an earlier angular-velocity copy:
array spread could canonicalize the z component before capture. The copy now
uses `Float64Array` and indexed assignments to preserve the original x87 bits.
A selected regression retains source case 1034, which exposed this difference.

The expanded corpus contains 17,941 cases: 17,648 unchanged-source cases plus
293 non-looping trick variants. All 19,773 observed words match per case on
ARM64 and x64. Input boundaries include 10,758 crash, 640 player, 2,954 AI-pending and
3,589 scripted-pending cases. Coverage includes 554 cubic and 3,675 linear
input paths, both analog-enable states, and 293 completed-trick releases. The
selected regression corpus contains 789 cases, including the cold-x64 NaN case.

### Retained steering rate and longitudinal input-rate setup

Player-ready cases now continue from `0x4a57c0` to `0x4a5993`, before the call
to the pre-loop reset/recovery helper `0x4b0610`. Crash cases continue from
`0x4a58c8` through the same input-history update. AI and scripted cases still
stop at their explicitly pending controller calls; no later state is fabricated.

The recovered block selects the direct component limit for pose 9 or reduces it
using the original square-root lookup. It computes the steering error, applies
the original deadzone, and divides by scheduled step time plus eligible timing
carry. It also computes the rate of longitudinal input change. The gated,
capped result at stack `+0x190` supplies extra rear suspension stiffness in the
later substep; the harness calls this observation `burst`. The previous-input
word `+0x700` is then updated. The added observations capture all inputs and
results of these calculations, including the derivative when computed.

No initial bike state, assets, or external input is changed relative to the
source input corpus. All preceding physics, rider, return, scheduler, recovery,
and input observations must remain byte-for-byte identical, including the
inherited non-looping trick variants.

The retained corpus does not reach pose 9's direct limit or a nonzero burst.
A separate isolated harness executes the same original instruction block with
6,000 initialized routine inputs. It covers 1,500 direct-limit cases, 4,500
reduced-limit cases, 471 deadzone cases, 720 nonzero bursts, 495 capped bursts,
2,400 signed-zero raw deltas, and 1,200 included-carry cases. This is routine
branch evidence, not a claim that those branches were reached continuously.

```sh
node scripts/mcm-reference/compare-reset-next-steering.mjs /path/to/mcm.exe /path/to/next-input-corpus /path/to/new-output-directory
node scripts/mcm-reference/compare-frame-steering.mjs /path/to/mcm.exe /path/to/separate-output-directory
```

Both support `--replay`. See `mcm-reset-next-steering-validation.json`,
`mcm-frame-steering-validation.json`, and the matching compressed fixtures.
The pending AI/scripted controllers, pre-loop reset/recovery helper, terrain
checks and next substeps remain open, along with longer whole-bike histories,
original-world integration and playable integration.

Validation: all 17,941 retained cases match all 19,793 observations on ARM64
and x64 with zero exceptions and zero changed prior traces. The new setup block
executes in 11,398 player/crash cases; 6,543 AI/scripted cases retain their earlier
pending boundaries. The separate 6,000-case routine comparison also matches on
both architectures. Regression fixtures retain 21 connected cases and all
6,000 compact routine inputs; both pass cold on ARM64 and x64.

### Retained next-frame reset decision

The original call at `0x4a5993` now executes `0x4b0610` in the retained
comparison harness. The recovered implementation checks forced repositioning,
elapsed reset conditions, the reset button, world boundaries, crash countdown,
and rider activity. Physical rider cleanup follows `0x40fbb0`; a present visual
object still requires its original reparent/callback restoration and is not
covered by this milestone.

The adapter initializes previously unobserved rider fields with the original
harness's zeroed allocation before the first reset. It observes those fields
again immediately before the next-frame decision, then compares its return code,
bike state, rider cleanup and all four transform nodes. No bike or rider state
is reseeded at the frame boundary. Reset-button input alternates before execution;
all previously recorded native observations must remain byte-identical.

The isolated 8,000-case comparison covers all eight decision branches and all
four world boundaries, including signed zeros and NaNs. ARM64 and x64 both match.
The retained corpus does not establish coverage of every isolated branch, and
AI/scripted controller cases still stop before those controller calls. The next
boundary is after the reset result is stored at `0x4a5998`, before terrain checks
and the next physics loop. This is not whole-bike trajectory parity.

```sh
node scripts/mcm-reference/compare-reset-next-reset.mjs /path/to/mcm.exe /path/to/next-steering-corpus /path/to/new-output-directory
node scripts/mcm-reference/compare-frame-reset-decision.mjs /path/to/mcm.exe /path/to/separate-output-directory
```

Validation: all 17,941 retained cases match all 19,948 observed words on ARM64
and x64, with zero exceptions and zero changed prior native traces. The decision
executes in 11,398 cases: 8,023 active crashes, 2,775 manual resets and 600 normal
continuations; 6,543 cases remain at AI/scripted boundaries. The new regression
fixtures pass cold on both architectures. Case 14101 additionally guards x87 NaN
signs during pivot-translation stores and subsequent matrix copying. Full tests
and the production build pass. See `mcm-reset-next-reset-validation.json` and
`mcm-frame-reset-decision-validation.json`.

### Retained next-frame terrain probes

The comparison now continues from the reset result through `0x4a599f..0x4a5bc5`.
When reset/crash state, iteration count and roll allow it, the original probes
one or two front component points and a body point, producing terrain heights,
smooth normals, penetration depths and the three contact-control words. The
recovered path uses the same carried transform graph and terrain. It then clears
`bike+8c4` before the loop iteration gate. No initial state or external input is
changed from the preceding reset-decision corpus.

The observer compares queried scratch values and all four transform nodes.
Skipped scratch is normalized to zero only in the observation, since this block
does not write it; live scratch is preserved. AI/scripted paths remain at their
existing explicit pending boundaries. Execution stops before the next physics
loop, so this is not yet continuous whole-bike acceleration/release validation.

```sh
node scripts/mcm-reference/compare-reset-next-terrain.mjs /path/to/mcm.exe /path/to/next-reset-corpus /path/to/new-output-directory
```

The original frame calls now reuse the same stack base, with a native assertion
at the next frame entry. Previously, the injected first frame and the C-called
second frame used different stack locations. That exposed unrelated bytes when
a terrain query left its normal output untouched. Calling the second frame from
the first frame's assembly return preserves scratch without assigning a new
normal or reseeding bike state. Cases 16630, 16750 and 16770 cover this behavior.
The original first-frame and preceding next-frame observations must still match
the source corpus byte-for-byte.

Validation: all 17,941 retained cases match all 20,109 observed words on ARM64
and x64, with zero exceptions and zero changed prior native traces. There are
44 two-probe and 70 three-probe cases; the remaining cases skip probing or stop
at a pending controller boundary. Forty-four compressed regression cases pass
cold on both architectures. See `mcm-reset-next-terrain-validation.json` and
`reset-next-terrain-wine11.json.br`.

### Retained next-frame engine entry

The retained comparison now crosses the iteration gate at `0x4a5bc5` and executes
`0x4a5bd7..0x4a5e27` when iterations remain. The recovered adapter consumes the
next frame's scheduled timestep, inverse timestep, analog input and contact
controls. Engine state, gear state and both filter histories carry forward from
the preceding frame; they are not reconstructed from initial parameters.

The comparison observes throttle, automatic shifts, brake input, crash-dependent
mass changes, saved speed, acceleration filtering, device queries and initialized
per-substep scratch. Negative/nonpositive iteration cases stop at the original
loop gate. AI/scripted controller boundaries remain explicit. All source initial
states, external inputs and the shared consecutive-frame stack are unchanged.

```sh
node scripts/mcm-reference/compare-reset-next-engine.mjs /path/to/mcm.exe /path/to/next-terrain-corpus /path/to/new-output-directory
```

This is a validation-harness milestone. Browser MCM preview still couples the
recovered engine and suspension to Cannon body dynamics; it does not yet execute
the retained original frame pipeline. Next-frame contact, forces, integration
and collision stages, followed by whole-bike trajectories and playable wiring,
remain required.

Validation: all 17,941 retained cases match all 20,161 observed words on ARM64
and x64, with zero exceptions and zero changed prior native traces. Engine entry
executes in 10,948 cases; 450 stop at the iteration gate and 6,543 remain pending
at AI/scripted controller boundaries. All 105 regression fixtures pass cold on
both architectures. All 294 tests and the production build pass. See
`mcm-reset-next-engine-validation.json` and `reset-next-engine-wine11.json.br`.

### Retained next-frame contacts and resets

The new comparison continues from engine entry through `0x4a5e27..0x4a64dc`,
including suspension transform preparation, ordinary wheel contacts and the
manual-reset path. Component rotation consumes the steering rate computed by
the next frame. Reset state, engine state, mutable child records and transforms
are carried through the original reset helpers.

This exposed original nontermination on synthetic NaN positions: the reset
avoidance routine accepts unordered distances, then repeats an identical state.
The native observer records a repeated position/heading/nearest-bike/flag tuple
and unwinds the harness; it does not patch the original into a successful reset.
The JavaScript observer reports the same explicit `original-nonterminating`
branch. A separate watchdog reports stalled instruction pointers if execution
fails to reach an observed boundary. These cases must remain separate from
completed contact/reset comparisons.

The recovered normalization follows the original unchecked lookup where the
original has no finite-value guard. Its target-heading equality check also
recognizes unordered x87 comparisons. Typed intermediate stores preserve NaN
signs through local and relative child orientation.

The course upper-bound test also uses the original unordered comparison behavior:
NaN bike coordinates take the upper clamp. Case 4149 guards the resulting reset
pose and downstream contact/transform state.

Validation: all 17,941 input cases match their observations on ARM64 and x64,
with zero exceptions and zero changed prior native traces. Of these, 8,193 reach
ordinary contacts, 2,703 complete resets, 52 match a nonterminating original
avoidance cycle, 450 stop at the iteration gate and 6,543 retain AI/scripted
pending boundaries. Nontermination is not a completed reset or trajectory.
The 112 retained regression cases pass cold on both architectures. The observer
compares 20,428 words per case, with explicit status and normalized placeholders
for boundaries not reached. Next-frame forces, integration and collision remain
open, as does connecting the completed pipeline to browser preview.

```sh
node scripts/mcm-reference/compare-reset-next-contact.mjs /path/to/mcm.exe /path/to/next-engine-corpus /path/to/new-output-directory
```

See `mcm-reset-next-contact-validation.json` and
`reset-next-contact-wine11.json.br`. Subsequent reset random draws are supplied
from the initialized CRT draw; this is deterministic external input, not a claim
of the original application's complete random-stream parity.

Validation gates: all 295 tests and the production build pass.

### Retained next-frame contact response

The next response comparison continues completed ordinary contacts and resets
through `0x4a64dc..0x4a6eac`, retaining bike, component and transform state. It
captures 202 further words for force preparation, roll, chassis probes, landing
flags and crash steering. Pending controllers, nonpositive iteration counts and
original avoidance cycles do not enter this stage.

Crash steering must consume the retained component angle limit. Without that
binding the recovered path silently skipped the original component transform
update. Exceptional chassis depth and crash-response arithmetic now use the
existing x87 helpers. Indexed matrix copies and typed pointer-product/event
scratch preserve NaN signs across cold and optimized execution, including
parented event orientation and proxy synchronization. Regression inputs include
cases 34, 47, 73, 75, 352, 9956 and 10664.

This comparison still stops before the second frame's suspension, tire forces,
integration and collisions. It does not connect those stages to playable preview
or establish whole-bike acceleration/release trajectory parity.

Validation: 17,941 cases match on ARM64 and x64, including 10,896 completed
responses; no exceptions or changed prior native traces. The 119 archived
fixtures pass in fresh ARM64/x64 test processes, and case 9956 also matches when
run first. All 296 repository tests and the production build pass. See
[machine-readable response evidence](mcm-reset-next-response-validation.json).

### Retained next-frame suspension, tire forces and motion

The connected comparison now continues from contact response through
`0x4a6eac..0x4ab7fd`: weight balance, front/rear suspension, tire and brake
forces, chassis contact response, force/torque assembly, angular and linear
integration, and wheel/body transforms. It observes 332 tire/suspension words
and 273 motion words without replacing the carried state. The frame's computed
extra suspension stiffness is passed from steering setup into force assembly.

The native chassis-observer enable flag is cleared at entry to this stage;
its retained contact count and the game's stack/state remain unchanged.
Original reset cycles and pending controller/iteration branches do not enter
motion integration.

Case 10664 exercises exceptional balance-center offset arithmetic. Case 5312
exposes nonfinite rear-contact cross products: the x87 NaN sign determines the
original signed-bit branch, so changing it to a positive NaN incorrectly selects
a finite distance and produces infinities downstream. The recovered geometry
now uses the original exceptional arithmetic, and typed contact-lever and
penetration-offset stores preserve the result through chassis response.

This milestone ends before second-frame controls, events, collisions and the
remaining substeps. Original-asset histories and complete acceleration/release
trajectory parity, AI/scripted controllers and integration into playable preview
remain outstanding.

The expanded fixture selection also retains the horizontal-line contact store
from case 227. Typed storage preserves its NaN sign in fresh and partially warmed
execution. All four wheel-contact combinations and crashed/normal chassis paths
are represented. Computed extra suspension stiffness is zero in these retained
histories; nonzero steering-burst calculation is validated separately, and its
connected force effect still needs a retained execution case.

Validation: all 17,941 retained cases match on ARM64 and x64, with zero
exceptions and zero changed prior native traces. 10,896 cases execute the new
motion stage; 7,045 retain the explicit pending, iteration-gate or original-cycle
outcomes. The 236 archived fixtures pass in fresh processes on both architectures,
and all 297 repository tests and the production build pass. See
[machine-readable motion evidence](mcm-reset-next-motion-validation.json).

### Retained next-frame controls and event setup

The comparison continues from `0x4ab7fd` through controller handoff, crash
orientation, airborne control/rotation, grounded alignment and limited-suspension
exits. It then executes the original event decision/setup, stopping at the real
rider-update entry or the common `0x4ac6cd` join. New observations contain 170
control words and 188 event words. The source frame, next-frame motion and all
previous observations remain unchanged.

A bike already in crash state bypasses event decision and setup. The recovered
continuation now follows that branch, preserving bike/rider state and join
scratch; only observer counters are cleared. This accounts for 8,023 retained
cases. The other control routes cover 77 airborne, 2,127 grounded and 669
suspension-limited cases. Pending controllers, original reset cycles and
nonpositive iteration counts still do not execute the new stage.

Event input queries and random draws are observed separately from reset draws.
The native event boundary supplies the same explicit launch and rider-selection
values as the recovered adapter, with its own draw index. This validates the
consumption order, including events with two through five draws; it does not
claim that the complete application CRT RNG stream has been reproduced.

Case 12088 reaches infinite crash steering. Original FSINCOS produces negative
indefinite for either infinity, and the recovered trigonometric helper now
preserves that sign. Typed balance scratch and native array slicing in proxy
copies also preserve NaN signs across cold and partially warmed execution. The
older prepared-substep fixture 5 guards the proxy copy.

Rider updates, collisions and the remaining iterations of this second frame are
not connected by this milestone. Long original-asset acceleration/release
histories, nonzero carried extra suspension stiffness, AI/scripted controllers
and full playable-preview integration remain outstanding.

Validation: all 17,941 retained cases match on ARM64 and x64 with zero
exceptions and zero changed prior native traces. The 341 archived fixtures pass
in fresh processes on both architectures. All 298 repository tests and the
production build pass. See [machine-readable controls/event evidence](mcm-reset-next-event-validation.json).

### Retained next-frame rider, collision dispatch and substep finish

The continuation now runs the first executed second-frame substep through the
original rider helper, post-event state, collision grid synchronization and
static-wall dispatch, ending at 0x4ac94b. It retains the real remaining-step
count and timing carry; it does not force the frame to finish. Animation-frame
pointers are normalized to their actual frame index after the prior frame's
animation advance. No bike, animation or collision state is reseeded at this
boundary. Prior native checkpoints remain byte-for-byte unchanged.

Case 2825 exposed a two-ULP world-angular-velocity mismatch caused by a different
addition order in the recovered 0x4b85c0 transform. The original Y result sums
`(m[5]*y + m[9]*z) + m[1]*x`; large terms nearly cancel in this case. The shared
world-vector helper now follows the original instruction order for all three
coordinates, and the post-event path uses that same helper.

The 17,941-case corpus reaches this boundary in 10,896 cases, including seven
actual static-wall callbacks and 988 timing-carry transitions. The other cases
stop at explicitly recorded controller, no-iteration or original reset-cycle
boundaries. There are 586 saved fixtures, including the cancellation case,
rider/trick branches and collision/timing outcomes. Delayed awards are not
reached in this second-frame corpus. Full machine-readable results are in
[mcm-reset-next-finish-validation.json](mcm-reset-next-finish-validation.json).

This still covers only the first executed substep of the second frame. Its
remaining iterations and frame-end tail, long original-asset acceleration and
release histories, dynamic-bike collisions, AI/scripted controllers and full
playable-preview integration remain open. The preview remains a hybrid using
recovered engine/suspension helpers with Cannon chassis dynamics.

### Complete retained second-frame substep loop

The native continuation now takes the real loop-back at 0x4ac954 until the
remaining count reaches zero. The recovered continuation follows the same
engine, contact, response, suspension, tire, motion, controls, events, rider,
collision and finish stages without resetting live bike state. It consumes the
updated substep interval and inverse interval after each finish, including the
final timing-carry step, rather than reapplying the frame-entry schedule.

Across 17,941 retained inputs, 10,896 cases execute 24,872 second-frame substeps.
There are completed paths of 1 through 7 and 9 through 11 substeps; 408 cases
execute all ten scheduled steps plus a carry step. The 7,045 cases stopped at
controller, no-iteration or original reset-cycle boundaries remain explicit.
Each additional iteration records 2,168 state words, and all prior native
checkpoints are preserved. The regression archive contains 616 fixtures.

Random inputs are still externally supplied: the launch and rider draw sequence
repeats per iteration, with a separate counter each time. This validates state
continuity for those inputs; it is not yet a continuous application CRT stream.
The second-frame post-loop filter, animation/caller tail and actual return are
next. Full original-asset acceleration/release histories, unsupported controllers,
dynamic-bike collisions and playable full-pipeline integration remain open.
See [complete-loop evidence](mcm-reset-next-loop-validation.json).

Validation: all 17,941 retained cases match on ARM64 and x64, with zero
exceptions and zero changed prior native traces. All 616 archived fixtures pass
in fresh processes on both architectures. All 301 repository tests and the
production build pass.

### Retained second-frame filter, animation and actual return

The continuation now runs beyond the completed second-frame substep loop through
its post-loop acceleration filter, retained animation objects and original
caller tail. The native harness resumes the original loop exit and observes the
actual epilogue/`ret 4`, preserving separate first- and second-frame snapshots.
The recovered filter uses the scheduler's stored frame interval, while animation
advances by the incoming raw delta. Neither is replaced with the final substep
interval. Animation children and the acceleration filter retain their state from
the preceding frame.

The new trace adds 11,244 words covering the filter, rider and animation state,
all mutable animation children, transforms, saved position and actual-return
marker. Cases that stopped before an executed second-frame substep still stop at
their existing explicit boundary; they are not labeled as completed returns.
This includes unsupported controller paths, original reset cycles and synthetic
negative-count/no-iteration cases.

Long original-asset acceleration/release histories, a continuous application RNG
stream, dynamic-bike collisions, unsupported controllers and full playable
preview integration remain outstanding. See
[second-frame return evidence](mcm-reset-next-return-validation.json).

The full corpus reaches 10,896 second-frame returns: 9,693 crash, 905 normal,
233 recovery and 65 trick paths. No second-frame nearby-animation path is
reached, which remains a coverage gap. There are 636 saved regression fixtures.

Fresh-process fixtures exposed case 134's recovery-root matrix losing the sign
of its first NaN during a partially optimized typed-to-mutable-array copy. The
warmed full corpus did not expose this. Appending through an existing double
array and slicing preserves the original sign while keeping the mutable matrix
contract. The return fixtures retain this ordering-sensitive regression.

Validation after the recovery-copy fix: all 17,941 retained cases match on
ARM64 and x64 with zero mismatches, exceptions or changed prior native traces.
The 636 archived fixtures pass in fresh processes on both architectures. All
302 repository tests and the production build pass.

### Reusable retained-frame runner

`advanceMcmRetainedFrame` in `src/physics/mcm/retained-frame.js` now owns the
supported frame sequence in production code: entry/recovery, controls, steering,
reset decision, terrain probes, every engine/contact/motion/rider/collision
substep, the frame filter, animation and return. It accepts an already initialized
context and a frame's delta/mode/input. It does not reconstruct bike state,
replace animation assets or reset filters between calls. Optional observers
expose original stage boundaries for comparison.

The caller supplies the live reset-input adapter, terrain, collision world,
controller responses and random inputs on the context. AI/scripted controller
calls and synthetic no-iteration schedules return explicit boundary statuses;
they are not reported as completed frames. Original repeated reset avoidance is
observed by the comparison harness, without inserting a gameplay escape.

The runner is checked against the pinned native return corpus, including all
24,872 substep-finish snapshots, 10,896 actual returns and the unchanged prior
frame. The 6,543 pending controllers, 450 no-iteration cases and 52 original
reset cycles retain their explicit outcomes. This replaces test-adapter nesting
with a callable frame sequence needed for longer histories. It does not by
itself validate third-and-later frames, the real application RNG stream or the
original-asset acceleration/release trajectory, and it is not yet connected to
the playable preview. See [runner evidence](mcm-retained-frame-validation.json).

Validation: 17,941 native-source cases match on ARM64 and x64, with zero
mismatches or exceptions; 232 saved fixtures pass in fresh processes on both
architectures. All 303 repository tests and the production build pass.

### Repeatable 400-frame retained histories

The original now runs 400 further frames on each of four retained player-bike
states (source cases 16616, 16624, 16672 and 16680), using the same frame stack,
bike, engine, transforms, filters, animation objects and collision world. The
supplied frame interval is float32 0.02. Throttle is off for frames 0–49, on for
50–199 and released for 200–399; the supplied brake and manual reset inputs are
off. Only external inputs and diagnostic counters change between frames.

Both native runs produce byte-identical prefix and history files. All earlier
native checkpoints remain unchanged. Across 1,600 further frames, the reusable
recovered runner matches the engine snapshots, every substep finish and each
frame's filter/animation/return output. The capture script verifies the pinned
executable and loaded D3DRM hashes and rejects unsupported frame boundaries.

These are synthetic initial states and assets, not a normal riding baseline.
Source cases 16616 and 16680 produce 44 and 22 nonfinite speed observations;
16624 is crashed throughout, and 16672 is crashed for 398 of 400 frames. The
original produces those same trajectories. Matching them establishes retained
state continuity, including crash and exceptional arithmetic, but does not
establish the requested normal acceleration/release parity. Realistic initial
states and original terrain/assets remain required. Random draws are still
externally supplied and repeated per substep rather than a continuous application
CRT stream. AI/scripted controllers and playable-preview integration remain open.

Reproduce with `capture-retained-history.mjs mcm.exe native-next-return-corpus
output-directory`, then `compare-retained-history.mjs native-next-return-corpus
output-directory`. The capture performs two original runs. Set
`MCM_WRITE_FIXTURES=1` on the ARM64 comparison to write the regression archive
source. [Machine-readable evidence and telemetry](mcm-retained-history-validation.json)
include raw speed, position, velocity, throttle and RPM bits so nonfinite values
are not lost through JSON's numeric representation.

Validation: both native captures are byte-identical; all 1,600 frame comparisons
match on ARM64 and x64, including engine snapshots. Fresh-process history and
runner fixtures pass on both architectures. All 304 repository tests and the
production build pass.

### Live checkpoint export and capture timeout

`capture-bike.c` can now export its existing partial local checkpoint through
`MCM_CHECKPOINT`, retaining component and transform bytes needed to investigate
live-state initialization. It neither expands the restore set nor claims a
complete world snapshot. The no-player-record timeout now also runs during
continuous debugger events, and successful records refresh the deadline.

Validation: MinGW compilation passes with `-Wall -Wextra -Werror`; a Wine export
probe preserves exact block bytes and metadata and refuses an existing output
file. An isolated target continuously executing the RNG breakpoint instruction
(with relocated test addresses) times out with capture status 4 after 30 seconds,
then exits successfully after verifying all instruction bytes were restored.
The live original also detaches with all four original instructions restored.

The current original-game session has no allocated bike candidates and produced
zero player records. No new normal acceleration/release comparison is claimed.
Entering a live riding event, exporting its state and integrating original
terrain/assets into the recovered runner remain the next requirements.

### Playable preview: recovered tire-force and contact-limit helpers

MCM preview now replaces the custom tire curve with `calculateMcmTireForce`
(front `0x4b1870`, rear `0x4b1960`) and limits friction and braking through
`limitMcmContactForce` (`0x4ad310`). The adapter converts SI wheel velocities,
loads and allocated mass to original units before the helper calls. Coefficients
6, float32(0.15) and brake force 175 come from PDM bike fields +0x5b0, +0x5b4 and
+0x5e8 in the checked-in `player-state-wine11.json` capture. The classic handling
path retains its existing tire curve.

This is incremental playable integration, not whole-bike parity. Cannon still
supplies contact geometry, filtered load shares, steering/balance and chassis
integration. The adapter allocates the stopping budget per wheel; the original
shares one budget across both contacts and their torques. The original dynamic
rear traction scaling and complete contact preparation remain to be connected.
Sand resistance remains an additional preview surface effect. No original live
acceleration/release match is claimed by the preview tests.

Validation: all 306 repository tests and the production build pass. Browser
checks pass for preview acceleration, steering, throttle release, pause/photo,
reset, classic-mode switching and mobile layout. Focused tests cover original
pure rolling/lateral force coefficients, forward/reverse low-speed stopping,
zero-contact force, and braking versus coasting on hardpack and deformable sand.

### Playable preview: shared contact budget and steering correction

The preview now feeds both wheel contacts into the recovered tire accumulation
(`0x4a8634..0x4a875b`) and braking (`0x4a875b..0x4a8be0`) paths. Friction and
front-then-rear braking consume one bike-wide velocity-change budget; the
original accumulation helper supplies the combined force and moment. Those
outputs are applied once to the preview chassis. The preceding per-wheel budget
adapter is removed. Drive and deformable-sand resistance remain separate inputs.

The recovered steering velocity helper (`0x4b1320`) now runs before contact
accumulation when both wheels support the bike. Its support-depth constant is
PDM's bike +0x5d8, 4.998459815979004 feet, from the checked-in player snapshot.
The preview maps its bar angle and contact-plane axes into this helper and
applies the returned turn to its Cannon quaternion. The resulting turn rate is
included in balance feedback and cleared on reset and unsupported contact states.

Remaining adaptations include the bar-angle controller, contact geometry/load
filtering, rear traction scale (currently one), quaternion application, rider
balance and chassis integration. This is not the full recovered frame runner
and does not establish normal live riding parity. The locked-desktop live-capture
prerequisite is separate from this playable integration work.

Validation: all 308 repository tests pass, including shared-budget stopping,
combined contact moment, both steering directions and reset cleanup. Focused
checks also cover braking on an unloaded but present contact. Production build
and production-served browser checks pass for acceleration, steering, release,
pause/photo/reset, classic fallback and mobile layout. These are integration
checks alongside the existing original-execution helper fixtures, not a new
whole-bike original-versus-preview comparison.

### Playable preview: dynamic rear traction

The preview now runs `updateMcmRearTire` (`0x4a8216..0x4a8634`) before the shared
tire/brake accumulation. Its PDM gain is float32(0.9505), and its speed threshold
is 45 feet/second (bike +0x6d0 and +0x6d4). Drive, rear tire force and rear braking
now use the stage's computed scale rather than independent constant factors.
The previous unconditional drive multiplier is removed from the preview path;
the scaled drive vector is applied once. The original substep reset value of one
is retained for branches that skip dynamic scaling.

The stage receives prior force acceleration, load share, bank cosine, forward
orientation and current contact velocities. Cannon's spring impulses are
included as equivalent forces when observing the prior acceleration, without
applying those impulses again. Reset clears that history. At rest on level
hardpack, the observed acceleration approaches zero instead of incorrectly
reporting gravity alone.

Contact loads and lever geometry, bank/load-share control and chassis integration
remain adapted. The previous acceleration includes preview forces and is not a
captured original-bike state. Native helper fixture parity and preview behavior
checks therefore do not establish whole-bike live parity. The desktop was
rechecked and remains locked; a new original-game riding checkpoint still needs
an unlocked session.

Validation: all 310 tests and the production build pass. Production-served
browser checks pass for acceleration, steering, throttle release, pause/photo,
reset, classic fallback and mobile layout. New integration checks cover the
45-foot/second branch, prior-acceleration feedback, load/bank changes, no rear
contact, a single drive-scale application and spring-inclusive resting
acceleration. The recovered function's original-execution fixtures remain intact.

### Playable preview: recovered rider weight balance and contact load source

The preview now calls `updateMcmContactBalance` and `updateMcmBalanceCenter`.
For the captured PDM profile (bike +0x618 is zero), the original initialization at
`0x4a3c4a..0x4a3c7a` sets the +0x8f8 filter to 0.5 with duration
float32(nominalInterval * float32(6.3)). The constant at `0x4d9844` and the pinned
executable SHA were rechecked. Bike/rider/total weights are 240/165/405 from
+0x684/+0x688/+0x68c; support depth is +0x5d8. Preview forward/back controls map to
the original rider-lean sign. Neutral weight shares return immediately to 0.5
while the internal filter history decays, matching the recovered branch.

Recovered shares now feed front/rear tire loads, rear traction and spring damping
mass shares. The returned balance-center offset adjusts contact moment arms.
The preview body origin substitutes for the original reference transform, so
that geometry remains an adapter. Reset clears filter history, offset and spring
mass shares; airborne balance follows the body reference without a ground offset.

The original tire-load source is the projected gravity-and-drag force, not
Cannon's suspension impulses. `calculateMcmBaseForce` now exposes the existing
original force/drag stores for both the recovered pipeline and the preview.
The preview uses PDM's [0,-405,0] lbf base force and float32(0.001) drag coefficient
and threshold, splits that force by recovered weight share before normal
projection, and removes its old tire-load smoothing. Original drag replaces the
preview's custom quadratic drag and Cannon linear damping; gravity is still
applied once by Cannon. Classic mode retains its prior handling.

This connects force preparation and balance inputs, not the complete original
chassis solver. Terrain geometry, the reference transform, suspension travel,
rider pitch/roll control, collisions and chassis integration remain adapted.
No new whole-bike live parity claim is made.

Validation: all 313 tests and the production build pass. Fresh x64 checks match
original force-preparation/balance fixtures and all four 400-frame retained
histories. Production-served browser checks pass for acceleration, steering,
release, pause/photo/reset, classic fallback and mobile layout. Integration tests
verify the captured profile, forward/back/neutral filter behavior, airborne
reference state, projected load source, suspension mass-share response and reset.
The existing deformable-sand acceleration checks pass without relaxing their
expectations.


### Retained histories: continuous original CRT random state

The recovered runner can now share one `createMcmRandom` stream across engine
shifts, bike resets, launch events and rider record selection using
`connectMcmRandom`. Consumers draw only inside the original executed branches;
shift delays and empty rider groups do not advance the stream. Captured individual
draws remain supported for the existing boundary fixtures. The stream belongs to
the application thread and can be shared across bike contexts, rather than being
implicitly reseeded by a frame or reset.

`MCM_HISTORY_SEED=12345` enables continuous draws in the retained-history capture.
The native oracle supplies a thread-data pointer and jumps to original
`0x4bf195`, executing the pinned executable's random arithmetic, state store and
return through `0x4bf1be`. It bypasses only the TLS lookup at `0x4bf190`; it does
not replace the generator with a second implementation of the recurrence.
The seed is installed once after the existing retained-frame setup, before the
400-frame history. A sidecar records original state and cumulative draw count
at every frame, and both native captures must match byte-for-byte.

Four 400-frame histories match on ARM64 and x64: engine outputs, all executed
substep finishes, frame returns, and CRT state/count. Native draw totals are
10, 2, 2 and 10. They include shifts separated across acceleration/release and
rider-event draws; earlier setup traces remain byte-identical. The checked-in
`retained-random-wine11.json.br` fixture and `mcm-retained-random-validation.json`
report preserve this evidence. The original fixed-draw history tests remain.

This removes the repeated-draw limitation for these retained histories. Their
initial states/assets are still synthetic, with crash/overflow trajectories;
they do not establish healthy live acceleration parity. Application activity
outside the retained bike, including other consumers of the same thread's CRT
stream, is not simulated. Fresh original-game telemetry still requires the
locked desktop to be unlocked. Preview chassis/contact integration and the other
previously recorded whole-simulation gaps remain open.

Validation: all 315 tests and the production build pass. ARM64 and x64 native
comparisons each report zero mismatches across 1,600 frames. The preview menu
now accurately lists recovered traction and rider weight balance while retaining
the warning about adapted terrain contacts, chassis and rider stabilization.


### Retained histories: rear stiffness burst and exceptional contact torque

The long-history oracle now accepts `MCM_HISTORY_BURST=1`. After the unchanged
retained-frame setup, both implementations set bike +0x848 to 50, +0x73c to 45,
and +0x700 to zero. The first history frame supplies longitudinal input -1;
subsequent frames restore the corpus input. With the existing 0.02 frame interval,
original steering setup produces rear extra stiffness 7500.00048828125 in all
four cases. Later history frames produce zero. The comparator checks this value
from the original stack observation at every frame as well as the complete
engine, substep-finish and frame-return records and continuous CRT state/count.

This scenario exposed a contact-moment divergence at case 16616/frame 264,
followed by 1,089 mismatched words in the four-history comparison. The cross
product in `accumulateMcmContactForce` used an ordinary array literal, whose first
NaN could become positive in V8. The original x87 result is negative indefinite.
That sign feeds opposing-acceleration branches, changing an angular component to
zero in the recovered path while the original retains negative indefinite.
Typed stores now preserve each unrounded cross-product component before the
existing float32 stores. The arithmetic order and finite force behavior remain
unchanged; no mismatch tolerance or trajectory exclusion was introduced.

With the fix, ARM64 and x64 comparisons each match all 1,600 frames exactly.
Intermediate motion/control/event observations at the first failing frame also
match. Native runs repeat byte-for-byte and earlier setup traces are unchanged.
`retained-burst-wine11.json.br` records the new native regression corpus;
`mcm-retained-burst-validation.json` records the comparison and hashes.

These are controlled synthetic burst trajectories, including overflow/crash
states. They validate nonzero stiffness through the connected solver and fix a
shared tire-force helper used by the preview. They do not replace the adapted
preview chassis/contact integration or establish healthy live riding parity.

Validation: all 316 tests and the production build pass. Production preview
browser checks pass for selection, acceleration, steering, throttle release,
pause/photo/reset, classic fallback and mobile layout.


### Playable preview: recovered airborne control and rotation

The MCM preview now calls `updateMcmContactResponse` for normal takeoff/landing
state and `updateMcmStateZeroControlRotation` for airborne input, angular damping,
roll phase/timer progression and control rotation. It replaces the preview's
custom airborne pitch, roll and yaw torques. The original 0.9 angular damping
runs in the recovered stage; Cannon's additional passive angular damping is
removed for the preview. Classic handling retains its existing controller.

The adapter converts Cannon world angular velocity to original local components,
uses `extractMcmOrientationAngles` for the original bank sign (opposite the UI's
bank convention), then converts the updated local angular velocity back to world
space. Takeoff captures the roll accumulator/sign and starts phase one; landing
clears the timer through the original contact-response branch. State persists
between steps and is recreated on reset. Wheel and chassis contacts gate air
control, and the stage runs after Cannon motion integration. The menu description
now includes recovered airborne controls.

PDM defaults were checked against the existing captured player state: +730 is
0.5; +710, +820, +6fc, +c68 and +c6c/+c70/+c74/+c78 are zero. Animation-dependent
trick/controller flags are not invented by the adapter. The preview body origin
substitutes for the original local balance reference; terrain contacts, Cannon
motion/ collision integration and matrix-to-quaternion conversion remain adapted.
Current orientation/contact samples are supplied by that adapter, rather than a
complete original frame context. Ground stabilization and crash/recovery remain
unfinished, so this is not a whole-bike parity claim.

Validation: the full 318-test suite passed before adding the final jump test;
all 14 preview tests, including that additional test, pass. The production build
and browser checks pass for selection, acceleration, steering, release,
pause/photo/reset, classic fallback and mobile layout. Four x64 native-fixture
checks pass for state-zero controls/rotation and connected airborne updates.
Integration tests cover the captured defaults, local-axis behavior at different
headings, both input signs, bank correction sign, chassis-contact gating,
takeoff/landing state, reset and absence of artificial throttle pitch torque.
The ten-second preview starter-line test completes three substantial jumps and
lands without crashing, retaining more than 15 m/s through each landing.
Fresh original-game telemetry is still blocked by the locked desktop.

### Playable preview: retained braking and shift speed

The preview now uses the recovered normal-state brake ramp from
`0x4a5bd7..0x4a5e27`: float32 increments of 0.2 while held, decrements of
0.5 on release, bounded to zero/one. The retained value reaches both tire
braking and airborne controls, replacing binary full braking. Reset clears it.
The retained runner calls the same extracted helper, preserving its existing
crash-state gate. Preview automatic shifts now consume the previous saved
speed before refreshing it, matching the recovered engine-entry ordering.

Preview scheduling remains one engine update per browser physics step, and
speed still comes from the adapted Cannon chassis. This is additional playable
integration, not proof of complete original-bike trajectory parity. Regression
coverage checks brake buildup/release, fractional force application, reset,
and the one-update delay in speed-dependent shifting.

Validation: all 320 tests pass, including the retained original fixture
comparisons and 15 playable-preview tests. Production build and browser checks
pass for acceleration, steering, throttle release, pause/photo/reset, classic
fallback and mobile layout.

### Playable preview: original linear integration

Normal riding in MCM Preview now advances position and linear velocity through
`integrateMcmLinear`, with original binary32 acceleration/delta-velocity stores
before the recovered integration slice. `mcm-preview-motion.js` converts the
preview's SI forces, mass, position and velocity to original units and back.
The adapter matches the position, velocity and speed words of the retained
original-execution force-linear fixtures exactly.

The stage runs at Cannon's body integration boundary, after collision and spring
impulses. It snapshots incoming velocity before Cannon's integration, retains
Cannon's angular result/history updates, and replaces the translation result.
This prevents double application of force. Sleeping bodies remain asleep and
crashed riding keeps the existing Cannon path. Reset retains the installed
adapter without adding another wrapper.

This is a playable integration milestone, not full chassis parity. Force/contact
inputs, angular integration, ground stabilization and the position reference
still come from the preview adapter. Full recovered steering-force state,
chassis impulses and motion transforms remain to be connected. Original
checkpoint trajectory comparison remains required for a whole-bike claim.

### Live wheel-contact initialization and caller-stack observations

The capture tool now optionally records the 0xc00-byte main-update stack at
both existing boundaries (`MCM_STACK=1`). Stack bytes are observations, not
restored checkpoint state. Entry locals may be stale. The decoder checks timing
metadata against the raw stack and preserves the ten contact point vectors.
The checkpoint also includes the separate physics transform at bike+8ec → +50,
which is outside the bike/rider visual graphs: 42 blocks, 25 loaded transforms.

The live contact initializer shares those transforms with engine/suspension
preparation and uses the verified original dunes terrain. On the first neutral
controlled frame, the two contact depths and six tangent components match the
original's surviving bike stores bit for bit on ARM and x64 Node, including
negative zero. This checks eight stores on one frame, not the complete contact
stage or a retained trajectory. Nested contact normal scratch is not captured;
any terrain fallback that consumes its unknown seed throws rather than using
invented zeroes.

The new 1,600-record fixture is a **failing replay**, retained as evidence.
Both passes enter crash state by frame 105. Rider words first differ at frame
107 before update (a0–b4 and e8–f0); velocity/angular velocity first differ at
frame 111 before update, and CRT random state first differs after frame 230.
690 caller-stack word positions differ across the passes. These observations
do not establish which missing dependency causes the divergence. The ordinary
live engine comparator cannot validate the crash branch. The replay comparator
now reports random-state differences alongside memory/motion differences rather
than throwing away the comparison at the first different random state.
`mcm-contact-stack-validation.json` records the full results and input hashes.

Next: isolate crash-stage mutable dependencies and capture the missing original
stage inputs/outputs, then extend retained full-bike comparisons. This milestone
does not change playable preview behavior or establish full physics parity.

### Separate rider update timing

Original rider controller update `0x40e990` receives its own time-step argument
at entry ESP+4. It runs outside the main bike update. At `0x40e9eb..0x40ea05`
it copies the animation object's bounds into rider+a0/ac through `0x44f870`;
these are among the first differing words in the earlier crash capture.

`MCM_RIDER_TIMING=1` now observes the player's rider update count and last
interval. `MCM_FIXED_RIDER=1` requires scripted replay and additionally sets
that player's rider interval to binary32 .02. Incoming timing remains recorded
as `riderObservedDtBits`; effective timing is `riderDtBits`. Other riders and
world timing remain uncontrolled. The new hook is instruction-guarded and is
restored through the same debugger cleanup as the existing hooks.

The observation run measured 399 rider calls between the 400 frame boundaries
in each pass, none inside a bike update, with 23 and 28 distinct interval words.
770 paired boundaries had different rider timing. Motion nevertheless matched
in that run, so timing variance alone does not prove the earlier failure's cause.

The controlled run contains 398 crashed-state boundaries per pass. All 400
frames match in decoded motion, engine allocation, rider allocation and tracked
random state. Rider counts and effective intervals also match. Four unexplained
bike words (488–494) and 521 raw caller-stack word positions still differ;
these remain comparator failures. The controlled and observed captures start
from different checkpoints: this is not a causal A/B experiment. Neither run
establishes recovered full-bike trajectory parity.

The compressed controlled fixture and `mcm-rider-timing-validation.json` retain
these results. Timing comparisons normalize cumulative counts at pass entry and
exclude the preceding frame's interval at the checkpoint boundary. Missing,
regressing or mixed-protocol observations and invalid forced intervals fail.
Next, replay the earlier crash checkpoint under both timing protocols and trace
any remaining animation/world inputs before expanding the retained simulator.

### Replaying the same local checkpoint disproves timing sufficiency

`encode-replay-checkpoint.mjs` writes the captured block discovery order to a
bounded binary import (`MCMCP01\0`, bike address, block count, then addressed
blocks). `MCM_INITIAL_CHECKPOINT` requires scripted capture. At the existing
frame-entry breakpoint the tool first discovers the current local allocations,
then requires every imported address and size to match before writing any
imported memory. It rejects extra/truncated bytes and mismatched bike identity.
This is same-process partial state restoration, not a portable save. A live
malformed-address test was rejected with zero records and all hooks restored.

Both new runs restore exactly the same 42 blocks from the earlier contact-stack
checkpoint. The observed-rider-timing run again diverges: motion first differs
at frame 113 and tracked RNG at frame 237. The fixed-rider-timing run has matching
rider counts and intervals but rider state already differs before frame 1;
bike+540/544/548, +654/658/65c and +8a8 also differ then. Angular velocity first
differs before frame 55 and RNG after frame 104. Both failures are retained in
`same-start-timing-wine11.json.br` and `mcm-same-start-timing-validation.json`.

Thus controlling rider time is insufficient for general replay repeatability.
The earlier fixed-timing success remains valid for its recorded checkpoint but
cannot establish a complete replay protocol. Uncaptured collision dependencies,
mutable animation assets, world updates, caller stack and registers remain
candidates; this experiment does not isolate which causes the new differences.
The next investigation starts with changes between bike frame 0 exit and frame
1 entry, particularly rider+34's collision object and rider animation resources.
Whole-bike recovered trajectory parity remains unproven.
The rider collision object has a proven 0x110-byte allocation at
`0x40d6c6..0x40d706` (constructor `0x42a470`, stored at rider+34).
Crash entry changes its callbacks at +108/+10c (`0x40eaf9..0x40eb09`).
Those bytes are absent from the 42-block checkpoint and are a concrete next
capture target; their causal role is not yet validated.

### Rider collision callbacks and pair-state replay

`MCM_COLLISION=1` observes the rider's 0x110-byte collision object, its owned
0x18-byte grid entries, and its row/column in the manager's 60×60 pair table.
Object+98 is the manager pointer; the table starts at manager+f8. Grid entries
contain shared previous/next links, so copying only the rider allocation is not
a consistent world restoration. The decoder checks ownership, lengths, pointer
metadata and the overlapping pair-table diagonal. All observed differences
remain comparator failures, including linked-entry and geometry differences.

The fixed-timing observation run starts pass 0 with normal callbacks
40b9e0/40ba00 and pass 1 with stale crash callbacks 40bb20/40bb30. Pair state
between rider id 1 and bike id 0 also differs (3 versus 1). Motion diverges at
frame 55. Restoring only the two callback words (43 blocks) removes their initial
mismatch but still diverges at frame 55 with differing pair flags.

`MCM_COLLISION_CALLBACKS=1` checkpoints the two observed callback words.
`MCM_COLLISION_PAIRS=1` additionally checkpoints the rider row and column,
including their overlap exactly once (103 total blocks). Both require scripted
capture. `bindRiderCollisionCallbacks` binds these bytes to matching frame-0
bike/rider observations and preserves the original block discovery order; no
callback values or pair flags are invented. Linked entries are not restored.

In the callback-plus-pair run, all 400 frames per pass match decoded motion,
engine allocation, rider allocation, and tracked random state. The only bike
allocation differences are the existing 488–494 words. Twenty-five collision
word positions and raw caller-stack words still differ. This is evidence that
these captured collision controls address this replay failure, not proof of a
complete world checkpoint or recovered full-bike trajectory parity. Different
uncaptured world state between experiments remains a limitation.

An initial pair-state capture attached mid-frame and recorded an update exit
before checkpoint entry. It is excluded from comparison. The tool now ignores
in-flight throttle/exit hooks until its first player scheduler-entry boundary;
the replacement capture begins with frame 0 before-update. Full traces and
results are retained in `rider-collision-replays-wine11.json.br` and
`mcm-rider-collision-validation.json`.

Read-only inspection identified four collision objects and a 64×64 grid in the
live manager. The next complete collision capture must include the manager,
all cell sentinels and all linked object entries consistently, plus any actor
state consumed by callbacks. Current diagnostic restoration does not close
those dependencies.

### Atomic shared collision graph and live grid refresh

`MCM_COLLISION_WORLD=path` exports the collision manager and graph while stopped
at the same player frame-entry breakpoint as `MCM_CHECKPOINT`. Both files share
a capture ID. The exporter reads the 0x394c-byte manager, all grid sentinels,
the global enable flag, every registered 0x110-byte object, and each object's
0x18-byte entries. It is an observation sidecar, not additional restored state.
Current bounds are 60 objects, grid dimensions 1–128, and 4,096 entries/object.

The live capture contains four type-1 objects, 16 entries, 4,097 sentinels and
11 addressed blocks. `loadLiveCollisionWorld` checks capture identity, player
ownership, overlapping checkpoint bytes, entry ownership, dangling links,
cycles, previous/next consistency, cell membership, orphaned active entries and
unreferenced blocks. It retains shared node identity for recovered grid updates.
This loader currently supports captured type-0/1 objects with four entries each;
other layouts fail explicitly. Actor state referenced by collision callbacks
is outside this loader.

The isolated native oracle maps the captured heap graph at its original
addresses and refreshes each object in manager order through original
`0x42a550/0x42a6e0`. The global enable flag is mapped to its relocated original
image address, not reserved over an unrelated page in the helper process.
Recovered refresh matches all 28,618 words, including six changed link words,
on ARM and x64 Node. All four active entries are in the overflow cell (4096)
in this snapshot; their linked order changes from [0,2,1,3] to [0,1,2,3].
This result does not cover ordinary-cell movement, collision dispatch, actor
response or full-bike trajectories. Existing synthetic grid fixtures remain
separate evidence for other geometry branches.

The actual graph, checkpoint and native output are retained in
`live-collision-grid-wine11.json.br`; hashes and scope are recorded in
`mcm-live-collision-grid-validation.json`. Next: extend the live world adapter
to collision dispatch and actor inputs, and capture populated ordinary cells
before claiming complete shared-world parity.

### Captured bounds frames for retained-frame continuation

The animation exporter now includes the bike and rider proxy frame pointers at
`+0x23c` as `boundsFrames`, together with their frame and child allocations.
These are distinct from displayed/previous/blend history and can lie outside
all 21 normal animation records. The loader preserves shared child identity,
rejects missing allocations, and checks the two pointers against the atomic
checkpoint before combining observations.

The original frame-entry capture `0000012d253b5804` contains bounds frames
`0x019a4740` and `0x01b05e60`, for 666 frames and 8,149 children in total.
The compact checkpoint/animation evidence is retained in
`live-bounds-animation-wine11.json.br`. Focused checks pass on ARM and x64.
A fresh comparison through motion still matches all 925 checked words with
24 changed words and zero differences. This supplies dependencies needed by
rider/event continuation; it does not yet execute those later stages, establish
whole-bike trajectory parity, or alter browser preview handling.

### Connected captured frame through normal control and alignment

The live bootstrap now supplies the actual bike controller fields and alignment
scratch to the retained runner. The same captured state advances through
controller handoff, normal control, rotation and ground alignment after motion.
It stops explicitly at the unmapped event-decision context; it does not replace
missing event input with a neutral default.

`MCM_CAPTURE_CONTROLS=1` captures the normal grounded branch at `0x4ac5c5`,
before event-wrapper argument setup. The harness verifies the original four
instruction bytes and requires a scripted first-frame capture with exactly two
records, excluding other endpoint modes. The native capture and recovered run
match 1,160 words: the complete bike allocation, observed engine prefix, body
local matrix and rider-controller allocation. There are 24 changed words across
the captured prefix and zero differences on ARM and x64 Node. This snapshot
does not add controller mutations beyond the preceding motion prefix; it does
not establish active/crash control coverage or complete-frame parity.

Evidence is in `live-frame-controls-wine11.json.br` and
`mcm-live-frame-controls-validation.json`. Tests also detect a one-bit mismatch
in the rider velocity and reject a wrong endpoint. Event input mapping,
rider/event setup, finish/collision dispatch, retained trajectories and browser
integration remain unfinished. Preview handling is unchanged by this milestone.

### Captured logical actions for event/rider continuation

`MCM_FRAME_ACTIONS=1` extends the atomic frame-environment observation with
controller device pointers, device owners, logical-action mappings, and mapped
button flags for actions 4–9. Keyboard and secondary-device routing follow
original `0x454f70`, `0x452670`, and `0x454760`; option zero reads retained flags
without OS polling. Joystick routes currently fail explicitly. These bytes are
observations, not additions to the replay-restored world state.

The captured keyboard codes for actions 4–9 are 200, 208, 44, 45, 28, and 57.
All secondary mappings are unassigned in this snapshot, and all six actions
are released. The isolated oracle calls unmodified original `0x454f70` with
these allocations at their captured addresses. Captured, all-keyboard-pressed,
flag-two, secondary-event, and both-device-event cases match all 3,750 or 3,751
checked words (six return values plus allocation words), with zero memory
changes and zero differences on ARM and x64. Modified cases are counterfactual
inputs, not additional live riding captures. Native image-global observations
are mapped into the relocated image; they must not be reserved over oracle
process memory.

Evidence is retained in `live-frame-actions-wine11.json.br` and
`mcm-live-frame-actions-validation.json`. The expanded capture also matches the
existing 1,160-word comparison through normal controls. The environment loader
now exposes decoded actions, but event/rider continuation and full retained
trajectories still need integration. Scripted throttle overrides remain separate
from the observed frame-entry button state. Preview handling is unchanged.

### Connected captured frame through event and rider handling

`MCM_FRAME_EVENTS=1` captures terrain `+0x954`, the original mode used by the
front-contact event threshold. The shared bootstrap connects this setting,
validated logical actions, animation frame/bounds, rider event records and the
captured random-stream seed to event setup and rider handling. Controller kind
writes update the same rider object through the correction-stage accessor.
Missing trick/nearby assets and other-bike event state still fail explicitly.

`MCM_CAPTURE_LOOP_RIDER=1` observes the common `0x4ac6cd` boundary after rider
handling, before post-state/collision work. It verifies the six original
instruction bytes, restricts capture to the first scripted frame and two rows,
and also records the 16-byte rider-effect allocation. The connected recovered
prefix matches 1,165 words on ARM and x64: the bike allocation, observed engine
prefix, body local matrix, rider-controller allocation, rider effect and tracked
random state. There are 25 changed words and zero differences. This snapshot
does not trigger a crash event or a trick. A separate controlled case raises
the upright threshold to 2 in the imported partial checkpoint. Original and
recovered execution then select event kind 3/reason 6, activate the rider,
select the same three records, and advance the shared random stream through
three draws to 3837989202. All 1,165 words match with 46 changed words. This
modified-input case exercises event setup; it is not a naturally occurring
crash capture or active-trick proof.

Evidence is retained in `live-frame-loop-rider-wine11.json.br` and
`mcm-live-frame-loop-rider-validation.json`; the modified case uses the
corresponding `loop-rider-trigger` fixture and report. Tests detect effect/random-state
corruption and reject missing event inputs. The retained runner now reaches
post-state, then stops at the next unmapped dependency (`bike.fieldc7c`).
Post-state/collision completion, end-of-frame integration and retained
acceleration/release trajectories remain unfinished. Preview handling is
unchanged; this is not whole-bike parity.

### Connected post-state, shared collision graph and physics substep finish

The live bootstrap now connects post-event state, collision synchronization,
ordered dispatch and substep completion to the existing captured world graph.
Player actor properties are views of the running bike/rider state, including
controller flags and both rider velocity representations. The graph reuses the
same transforms and grid nodes. The legacy static-wall harness remains a
separate adapter; the live path preserves the captured callback routing and
still fails on unsupported callbacks or active external dependencies.

`MCM_CAPTURE_FINISH=1` observes `0x4ac95a`, after the physics loop and before the
optional effect/tail processing. `MCM_FINISH_WORLD` exports the observed world
at this boundary under the entry capture ID. Both the untouched first-frame
case and the deliberate upright-threshold trigger match 36,543 word checks on
ARM and x64, with 105 and 146 changed checks respectively and zero differences.
These totals include repeated checks of player/transform words present in both
the core snapshot and the world observation. Every captured collision-world
block is compared; physics-only nodes absent from that observation and other
component allocations remain outside the comparison.

The recovered callback traces are empty in both cases, so these are connection
and synchronization proofs, not evidence for active collision responses.
Existing ordered callback tests still pass. Tests also verify shared state
identity, catch a one-bit pair-table difference and reject a mismatched world
capture boundary. Fixtures/reports use the `live-frame-finish` and
`live-frame-finish-trigger` names; the trigger is a modified-input experiment.

The retained run now reaches `context.frameTail`. The original optional effect
path is enabled in the running process and writes bike scratch/effect state;
it cannot be assumed absent when connecting frame-end filtering and animation.
That tail, active collision callbacks, full-frame return and retained
acceleration/release trajectories remain unfinished. Preview handling is
unchanged, and whole-bike parity remains unproven.

### Frame-effects terrain segment clipping

Additional same-frame original captures confirm that world flags `+0x714` and
`+0x718` are enabled and the selected player's effects invoke `0x410ac0` once.
That query returns zero in the observed frame. The effect interval changes the
bike counter at `+0xcb0` and emitter position; captured engine, rider and body
matrix words remain unchanged. The query output buffer is undefined on a miss
and must not be used as an expected collision point. Raw captures and diagnostic
sources are archived outside git under `frame-effects-query-2026-11-13`.

`queryMcmTerrainSegment` now translates the `0x410ac0` wrapper: world-to-terrain
scaling, ordered clipping against root bounds, float-bit direction gates,
coordinate permutation, traversal dispatch and successful-result conversion.
An intersecting segment requires an explicit traversal implementation; missing
`0x48e4c0` cannot silently return a miss.

The isolated native oracle runs the original wrapper and clipping helpers while
replacing only traversal with an argument recorder and controlled output. The
captured query, boundary cases and seeded finite segments total 2,045 cases and
24,540 word comparisons, with zero differences on ARM and x64. The recorder is
called in 1,535 cases. Tests also detect intermediate-coordinate corruption and
verify that missing traversal fails. See `mcm-terrain-segment-wrapper-validation.json`.

This proves the wrapper boundary, not terrain traversal. Recovering `0x48e4c0`
(grid crossings, child traversal and triangle intersection), connecting enabled
effects, full-frame return and retained acceleration/release validation remain
outstanding. Preview handling is unchanged.

### Complete terrain segment traversal on the original dunes

`traverseMcmTerrainSegment` now translates `0x48e4c0`: separate grid-crossing
lists, their ordered merge, child-height rejection, recursive tile traversal,
alternating triangle selection, `0x401820` plane construction and `0x401970`
intersection. The course loader retains signed node height bounds and origin
coordinates. The isolated oracle validates 3,350,004 node words against the
original tile deserializer, including these newly retained fields.

The full original wrapper and traversal execute against dunes banks in the
oracle. A hook records sample reads and then runs the overwritten instructions;
terrain traversal and triangle intersection are not substituted. The 2,105
queries include the actual live frame-effects query, seeded rays spanning
multiple cells, near-vertical rays, exactly vertical rays and exact-height plane endpoints. Recovered results
match 10,525 result words (including 228 hits, points and node identities), and
the ordered sequence of 14,252 height reads, on ARM and x64. The compact fixture
retains only accessed node metadata and samples. See
`mcm-terrain-segment-course-validation.json`.

Original boundary rounding can generate an additional tiny segment along a
tile edge. The leaf code does not clamp its cell indices and can read beyond
the 17×17 sample bank. The observer confirms this behavior. These cases require
33 reads from adjacent allocation memory in this fixture. The recovered code
requires explicit observed bytes for those reads and throws when unavailable;
it does not reuse the oracle's adjacent bytes as live-game memory or fabricate
zero heights. Thus these results do not establish unrestricted live-world
queries without the corresponding memory observations.

`generate-terrain-segment-course.mjs` builds deterministic input from the course
and saved frame-effects query report. `terrain-segment-course-oracle.c` reuses
the original course-deserializer oracle's host stdio/allocation adapters and
omits renderer initialization. `build-terrain-segment-course-fixture.mjs` verifies
the pinned executable hash, all serialized node fields and observed normal-bank
samples before writing the fixture and comparison report. Raw native runs are
archived outside git under `terrain-segment-traversal-2026-11-13`.

Enabled frame-effects integration, frame-end filtering/animation/return,
active collision callbacks and repeatable acceleration/release trajectory
validation remain unfinished. Preview handling is unchanged.

### Connected enabled frame-effects tail

The captured frame runner now executes `0x4ac95a..0x4acfd8`: the real recovered
terrain occlusion query, emitter position history, engine-level transition
flags, contact emission, signed-float-bit velocity caps and emitter shutdown.
The live adapter shares the running bike, engine, body transform, terrain and
contact state. Emitter properties write into observed allocation bytes. This
stage runs before frame acceleration filtering and emits an `effects` boundary.

`MCM_CAPTURE_EFFECTS=1` records scheduler entry, effects entry and effects exit
in one player frame, plus actual terrain-query return/count, start coordinates,
effect allocations and settings. It requires three records, scripted input,
stack capture and checkpoint/environment/animation/world outputs. The new
capture mode was compiled and exercised against the running original; capture
breakpoints are restored afterward. The helper still requires a cached query
target; it does not invent an uncaptured scene target list.

Normal and controlled rider-transition captures each match 1,524 words on the
connected prefix through effects, with 35 and 56 changed words respectively.
The comparison includes bike, observed engine prefix, body local matrix, rider,
rider effect, random state, all three emitter allocations, and terrain-query
count, return and start. These cases both query the real terrain and return a
miss. Unobserved transforms, caller stack outputs and the entire collision world
after this endpoint are not compared here. The earlier substep-finish world
comparison remains separate evidence.

An isolated original-code oracle separately covers 256 controlled cases with
occlusion explicitly disabled, exercising contact branches, throttle rise/fall,
speed thresholds, cached-color reset, disabled effects and shutdown. It invokes
the original emitter helpers unchanged: 304,128 word comparisons, 3,874 changed
words and zero differences. It adapts pointers to private allocations and checks
that other initialization words are unchanged. This evidence does not cover the
scene-target cache lookup or an integrated occlusion-hit color transition.

Fixtures/reports use `live-frame-effects`, `live-frame-effects-trigger` and
`frame-effects` names. `build-live-frame-effects-fixture.mjs` regenerates a live
fixture from its raw capture prefix and the original course. Raw evidence is
archived outside git under `live-frame-effects-2026-11-13`.

The retained runner now reaches frame filtering, where additional live bike
fields still require connection and endpoint validation. Frame-end rider
animation, return, active collision responses, retained acceleration/release
trajectories and complete preview integration remain unfinished.


### Connected frame-end acceleration filter

The captured runner now initializes bike +850/+854 from the checkpoint and
continues through the original frame-end acceleration filter (4acfd8..4ad078).
`MCM_CAPTURE_FILTER=1` captures entry, pre-effects, and post-filter boundaries,
including the filter allocation's value and duration. The endpoint has already
pushed the rider delta; only the observation context's stack pointer is adjusted
by four bytes. The running original context is not adjusted.

Normal and controlled rider-trigger captures each compare 1,526 words with zero
differences, including all 818 bike words, the filter allocation, existing engine,
body, rider, emitters, effect, RNG and query observations. They contain 37 and 59
changed words respectively. Fixtures/reports use `live-frame-filter` and
`live-frame-filter-trigger`; the effects fixture builder also supports this
endpoint. A corruption check verifies detection of a changed filter output.

The next observed missing dependency is frame-end rider animation's component
position flags (`frameRider.positionFlags`). Frame-end rider/return integration,
retained acceleration/release trajectories, and full playable-preview integration
remain unfinished. This milestone does not change browser handling or establish
complete-frame parity.

Validation: all 411 tests and the production build pass. The 13 connected-frame
tests also pass on x64. Native captures and hook-cleanup evidence are archived
outside git under `live-frame-filter-2026-11-13`.


### Connected frame-end rider animation

The retained frame adapter now uses the live bike component records (including
position flags) and preserves separate bike/rider animation callbacks. Previously
it tried to construct flags from absent data and applied rider animation to the
bike component list. Nearby-target lookup is now lazy, so normal/crash branches
do not require an unrelated nearby target.

`MCM_CAPTURE_FRAME_RIDER=1` captures through 4ad07f, immediately after the original
4af710 call returns. This endpoint uses the unshifted caller stack, unlike the
post-filter endpoint. Captures include the rider visual allocation, checkpoint
transform allocations and every observed animation asset block. The comparator
serializes both retained animation states and mutated animation child vectors.

Normal and controlled crash-event captures each compare 110,597 words with zero
differences (202 and 104 changed words respectively). Fixtures use
`live-frame-rider-end` and `live-frame-rider-end-trigger`; reports use
`mcm-live-frame-rider-validation` and the trigger counterpart. Corruption checks
verify detection of visual matrix and animation-child changes.

The connected runner now reaches `context.frameReturn`, which remains unmapped.
These captures do not validate trick/nearby/recovery branches, complete return,
retained acceleration/release trajectories or browser integration. Full physics
parity remains unfinished.

Validation: all 412 tests and the production build pass. All 14 connected-frame
checks also pass on x64. Native evidence and restored endpoint bytes are archived
outside git under `live-frame-rider-end-2026-11-13`.


### Connected original frame return

The live bootstrap now loads saved position +56c/+570/+574 and the observed
owner settings/event/player-selection gates for the final frame-return routine.
`MCM_CAPTURE_RETURN=1` observes 4ad10d after all three history stores. At that
point ESI is bike+56c and two saved registers have been popped: bike identity is
normalized for observation and the copied snapshot context uses ESI-56c/ESP-8.
Execution resumes with the original registers and stack untouched.

Normal, controlled crash-event and deliberately changed-history captures each
compare 110,597 words with zero differences (202, 105 and 205 changed words).
The changed-history checkpoint starts with [-123, 456, -789] at +56c and verifies
all three final stores from current position. Comparisons include the existing
bike, engine, rider, filters, emitters, visual transforms and animation assets.
They reject the older pre-history-store after-update boundary.

The runner now returns from its first connected captured frame without an
unmapped-dependency error. This proves the observed normal/crash first-frame
paths only. Unobserved allocations, active collision branches, changed mid-frame
globals, the selected-player state-3 restore branch, repeated acceleration/release
trajectories and full browser integration remain outside this milestone's proof.
No full physics parity claim is made.

Validation: all 413 tests and the production build pass; all 15 connected-frame
checks also pass on x64. Native captures and hook restoration evidence are
archived outside git under `live-frame-return-2026-11-14`. An exploratory
unreinitialized two-frame run matches its observed words, but is not yet the
supported acceleration/release trajectory validation.

### Playable preview: neutral steering assistance

The playable preview now steers from rider input instead of feeding terrain roll
error back into bar angle. A bounded grounded heading assist counters unwanted
turns when the stick is neutral; it rotates velocity with chassis heading and
damps residual yaw. Steering input updates the heading target, and recovery
clears it. Recovered engine, suspension, tires, braking and airborne helpers remain
connected. This assistance is a playability adaptation, not original-game parity.

Regression coverage includes 20-second neutral Free Ride runs with sand on/off,
intentional turns, stick release, holding a newly selected heading and recovery
at a different heading. The browser smoke check now exercises actual multi-touch
Free Ride throttle, left/right steering, steering-finger release and throttle
release. The menu explicitly describes the preview as assisted handling.

Validation: all 415 tests and the production build pass. Desktop browser checks
passed through recovery/classic fallback; the corrected multi-touch Free Ride
check passes on a mobile viewport with no runtime errors.

### Retained throttle onset and separate rider-tick crash entry

The live engine loader now reads its original drive-curve count and knot/sample/
slope tables, including the lookup endpoint. Bike +b6c is initialized for crash
input clearing. A supported retained comparator initializes the model once and
supplies only explicit throttle changes on subsequent frames. It does not replace
rider or emitter state with each frame's observations.

Frames 0–50 of the captured throttle script match 186,897 observed word checks,
including the first throttle-on frame. Frame 51 deliberately remains a reported
failure: three exhaust-emitter words (+48/+68/+478) changed outside bike update.
The fixture includes that failure, and a regression test verifies it stays visible.
Unmodeled bytes are assumed unchanged within each frame using observed entry
bytes; this is not a full-world checkpoint or full retained trajectory proof.
Visual/animation blocks are only compared on frames containing those observations.

A separate native trace brackets 40e990 and its 40ea7c..40ec1a transition after
bike frames 104/105. Every observed rider tick occurs outside player bike update.
The selected-animation crash-entry branch clears +13c, sets +f8 to .25, clears
+144/+138, sets contact class +154 to -1, starts the selected animation and sets
+140. The recovered transition matches 505 words for both pending and already-
started captures (6 and 0 changed words). The null-selected-animation branch
remains explicitly unsupported. This helper is not inserted into the retained
runner as a substitute for the complete rider tick: its preceding bounds/collider
work and following animation/physics work remain to be connected.

The exploratory longer run reaches frame 105 after separating emitter mismatches,
where the inter-frame rider-state changes become observable. That diagnostic does
not establish throttle-release or continuous crash parity. Raw captures and trace
sources are retained outside git; browser handling is unchanged by this milestone.

Validation: all 419 tests and the production build pass; the 19 focused frame,
retained-prefix and rider-transition tests also pass on x64. The reusable fixture
builder reproduces the retained fixture byte-for-byte. Trace sources, captured
boundaries and restored-hook evidence are archived under
`retained-rider-entry-2026-11-14` outside git.

### Separate exhaust tick recovered (2026-11-14)

The retained frame-51 mismatch is in the independently scheduled exhaust actor,
whose vtable update is `0x43a6d0`. Recovered that complete update and its original
particle insertion helper `0x43b160`, including timer expiry, first-position reset,
stopping emissions, particle-pool exhaustion, and both counter wraparounds.
The implementation preserves x87 arithmetic/store order and checks the original
signed float-bit gates rather than replacing them with numeric comparisons.

`docs/mcm-exhaust-tick-validation.json` records 160 isolated executions of the
pinned original under Wine: 2,286,240 compared words, 5,260 changed words, zero
differences. Checks include the full emitter and all 1,000 particle records,
including untouched fields. The fixture passes on ARM64 and x64 Node.
Reproduction sources are `generate-exhaust-tick.mjs`, `exhaust-tick-oracle.c`,
`compare-exhaust-tick.mjs`, and `build-exhaust-tick-fixture.mjs` in the reference
scripts directory. The builder verifies the pinned executable SHA-256.

This helper is not yet connected to retained replay: live actor ordering,
actual actor delta time, particle-pool state and other actor ticks must be
captured first. The retained comparison still honestly stops at frame 51.
No trajectory or full-physics parity is claimed by this isolated validation.

Live follow-up: captured the separate player exhaust calls after bike frames 50
and 51, including all particle slots. Both match the recovered helper exactly:
28,578 words, zero differences. Their actual actor deltas are approximately
0.103 and 0.145 seconds, despite the controlled bike delta being 0.02 seconds.
These observed timings are affected by breakpoint capture and are not physics
constants. Replacing them with the bike delta fails the regression test.
`mcm-live-exhaust-ticks-validation.json` records this narrower live validation;
it does not extend the retained trajectory claim. Original checkpoint restoration
and breakpoint cleanup follow capture. Raw trace and capture sources are archived
under `player-validation/exhaust-tick-2026-11-14` in the local reference store.

### Crash-rider terrain query recovered (2026-11-14)

Recovered complete `0x40bb40`: eleven animated body nodes converted relative to
the rider body, transformed around its current center, and queried against the
original terrain height and smooth normals. Deepest penetration selects one of
four body regions. No-hit preserves all caller outputs and the previous region.
Original x87 transform addition order and the stored-versus-retained Z delta
are preserved; this uses the existing recovered transform and terrain routines.

The complete original routine, including real transform conversions and terrain
sampling, matches 176 isolated cases: 154 hits, all four regions, 188,848 words,
2,126 changed words, zero differences. Live separate-rider calls after bike
frames 104 and 105 also match: 2,698 words, 390 changed words, zero differences,
including all 16 parent/child transform allocations. Both live calls return no
terrain contact. ARM64 and x64 regression tests pass. See
`mcm-rider-terrain-query-validation.json` and
`mcm-live-rider-terrain-query-validation.json` for exact scope.

This removes a dependency of the separate rider tick; it is not yet a retained
whole-rider or trajectory claim. Live query capture sources and raw observations
are archived under `player-validation/rider-terrain-query-2026-11-14`.

### Separate crash-animation rider tick connected (2026-11-14)

Connected the observed active-animation/no-ground-hit branch of `0x40e990`:
its inactive child actor callback, rider position/bounds, collider extents and
radius, grid refresh, crash entry, interpolated animation, rider terrain query,
protected bike/rider pair state, and ordered collision dispatch. Missing active
particle creation, animation crossfade and free-rider integration raise errors.

The rider proxy calls `0x45bcd0`, not `0x42e890`. The recovered proxy update
interpolates adjacent frames, retains distinct displayed/previous/blend-frame
pointers, advances the blend timer even without crossfade, and retains the
forward-Z product until addition before its final float store. That last detail
removed the remaining live transform differences.

`MCM_CAPTURE_RIDER_ANIMATIONS` adds selected and active crash animation records
to the native capture; the loader preserves the normal 21-record prefix and
validates additional records. Native asset capture can now name its actual
boundary. Full-rider after-observations reread the entire before-allocation
footprint, including a historical frame that becomes unreferenced during entry.

`mcm-live-rider-tick-validation.json`: two live ticks after bike frames 104 and
105, 320,799 words compared, 776 changed words, zero differences. This includes
all captured collision-world allocations, all animation assets, the child actor,
and the global rider timestep. Recovered dispatch emits no callbacks in these cases; native callback order
was not separately traced. The captured owner render gate is zero. Both cases pass on ARM64 and x64 Node.
This is whole observed rider-tick coverage for that branch, not a continuous
bike trajectory or coverage of the unsupported branches. Raw captures and
sources are archived under `player-validation/rider-tick-2026-11-14`.

### Retained external rider milestone (2026-11-14)

The retained comparison now connects the separate rider tick without reloading modeled state between bike frames. The pinned-original fixture covers 120 bike calls (frames 0–119) and 119 separate rider ticks (0–118): 413,751 bike-comparison words and 74,256 rider/child/global-delta words, with zero physics differences. All 515 visual-emitter differences remain explicitly reported. The next external tick stops at rider ground contact in frame 119; free-rider integration remains unsupported.

This is a diagnostic projection, not full trajectory parity: unmodeled bytes use each observed entry as an unchanged-within-call baseline, and external output checks do not cover all transforms or world allocations. The fixture includes all captured rider event animation records so later selection does not substitute observed state. Regression tests also reject changed throttle, missing external ticks, and corrupted observed timing. See `mcm-live-retained-rider-prefix-validation.json`.

### First rider ground contact (2026-11-14)

Recovered the first ground-contact transition inside `0x40e990`: collider callback rebinding, pair mode, transfer of crash velocity, extent growth, the second animation advance, and joint-pose compensation with native per-element arithmetic order. The full original frame-119 rider tick matches 160,110 words (438 changed), including world transforms, animation allocations, child state, and global delta. Recovered dispatch invokes rider-primary and bike-secondary callbacks; native callback order was not separately traced.

The retained fixture now reaches 121 bike calls and 120 separate rider ticks, with zero physics differences across 415,277 plus 74,880 comparison words. It reports 525 visual differences and stops explicitly at frame 120's free-rider integration dependency. This retains the diagnostic scope and limitations above; it does not establish full trajectory parity.

### Free-rider ground-motion tick (2026-11-14)

Recovered `0x40cd60` and the `0x430a60` animation transition, connecting captured drag, gravity, angular integration, terrain contact, the previously recovered rider impulse, contact-animation selection, proxy/collider updates, and contact-emitter activation. The full original frame-120 rider tick matches 264,335 words, including all 386 changed words, with no differences. The capture includes all rider event animation records and the previously missing drag coefficient at `0x4e21bc`; neither is supplied from output state.

This is one complete live tick, not broad branch coverage or continuous parity. The next active-particle update and animation crossfade remain explicit dependencies. The earlier retained fixture still stops at frame 120 because its initial capture lacks the drag coefficient; it is not silently supplemented with executable defaults.

### Active rider particles and crash-animation crossfade (2026-11-14)

Recovered active `0x43a0c0` particle creation and the crossfade branch of `0x45bcd0`. The isolated particle oracle matches 160 cases across 2,782,560 words (2,123 changed), including reset/inactive paths, fractional emission, negative/zero timestep, pool exhaustion, and index boundaries. Native table index 32 reads its own index word and eight bytes beyond the advertised child allocation; those bytes are captured explicitly rather than replaced with an invented wrapped entry.

Independent complete rider ticks 121/122 match all 566,772 captured words (878 changed), including full shared-pool headers and all 1,000 particle records per tick. Each tick emits two particles. The original pool counts differ between consecutive entries because other world updates occur between these ticks; these are independently initialized observations, not continuous pool parity. A one-bit Z-velocity difference exposed premature rounding of the drag factor; removing that store follows the original x87 instructions and preserves the prior frame-120 match. Stopped-animation/recovery paths and complete retained shared-world scheduling remain outstanding.

### Complete retained crash-and-release history (2026-11-14)

The new 400-frame capture initializes modeled bike/rider/animation/particle state once, applies throttle at frame 50 and releases it at frame 200. All 400 bike calls and 399 external rider ticks match the compared modeled physics, with zero physics differences across 841,130 bike words and 249,774 rider/child/timing words. The rider crashes earlier in this run; this is not a healthy acceleration/coast-down scenario or a whole-world parity claim.

The retained particle pool is now also compared: 7,600,551 words produce 2,061,978 differences from unconnected world aging/other emitters. Together with 3,888 emitter differences, all 2,065,866 visual differences remain reported. No observed pool state is injected between ticks. Unmodeled bytes still use per-call entry baselines, and not all world transforms are compared.

Recovered the settled-animation seek branch inside `0x40e990`; complete isolated ticks 218/219 match 566,772 words, including 638 changed words. Fixed the bike-frame comparator to serialize the already-modeled rider reset fields (including contact class) instead of treating them as unchanged input bytes. A deliberately corrupted native contact-class output is rejected by the retained regression. Stopped airborne/crash-animation transitions, healthy riding scenarios, shared-world scheduling and final preview integration remain open.

### Airborne crash-animation completion and immediate-throttle history (2026-11-14)

Recovered the stopped crash-animation transition inside `0x40e990`: enter free-rider mode, transfer velocities, restore collider callbacks/pair mode, blend the next selected animation and compensate the preserved joint pose. Complete live ticks 87/88 match 566,772 words (721 changed).

The immediate-throttle capture uses throttle from frame 0 through 199. Retained modeled physics matches 246 bike calls and 246 separate rider ticks, then explicitly stops before completing frame 246 because `context.restoreRiderVisual` is not connected. All 3,936,453 visual differences remain reported. This run crashes at frame 54 and recovers at frame 246 in the original, so it is another crash/recovery scenario, not healthy sustained riding. The next concrete task is original `0x40fbb0` collision-pair/callback restoration (the legacy `restoreRiderVisual` name is misleading: decompilation shows no scene-graph reparenting in this routine); a captured post-recovery grounded state is also a candidate starting point for healthy acceleration/coast-down tests.

### Owned allocation accounting — November 15, 2026

Recovered the intact `45c8d0` calloc and `45c820` free wrappers in `owned-allocation.js`. Successful allocation adds the element size (not count times size) to the global counter and owner+8. Free calls the CRT size lookup twice, subtracting from the global counter before updating owner+8, then calls free even for null. All arithmetic wraps at 32 bits.

The maintained `owned-allocation-oracle.c` maps the pinned executable and initializes its original CRT, with only KERNEL32 imports bound. Ninety bounded allocations (counts 0–8; sizes 0, 1, 4, 15, 16, 17, 20, 32, 64, 256) ran twice identically through intact wrappers and original calloc/msize/free. The fixture checks counters before/after free, allocation success, zeroed payload and observed rounded block sizes. Three focused tests pass, including failure/null and separate size-call ordering.

This explains the previously observed AI owner+8 (`bike+40c`) decrease: count-one/size-20 and count-zero/size-20 allocations add 40, while their original CRT sizes are 32 and 16, giving -8. It does not yet connect live allocation events to the retained controller. Heap addresses, exhaustion/failure policy, general heap emulation, and full controller/frame parity remain open; no frame guards were relaxed and preview behavior is unchanged.

### Live retained allocation accounting — November 15, 2026

`capture-ai-allocations.c` extends the guarded controller/motion capture with original allocation-wrapper entry/exit and both CRT size-return checkpoints. A new 128-call live trace contains 88 grounded calls (176 allocations and 176 frees) and 40 skipped airborne calls. All 24 hook bytes were independently verified restored, with `debugger=0 clean=1`; the original process remained running.

`analyze-ai-allocations.mjs` now computes owner+8 (`bike+40c`) from the initial capture entry and retains it across all 128 calls, checking each allocation/free checkpoint and controller exit. The model checks allocation counts against captured actor inputs, computes the 16-byte-rounded block sizes over the independently oracle-validated bounded domain, and compares both actual CRT size returns. It does not seed owner counters from later observations. Global accounting at each call's first allocation and returned pointer identities remain explicit environment inputs; global accounting is then computed through all ten allocation/free checkpoints. Allocation failures, counts outside 0–8, missing events and unexpected pointer lifetimes are rejected rather than silently approximated.

The existing computed controller/motion replay invokes this validation when allocation events are supplied. This capture also matches 128 control/motion calls, 87 gas commands, 88 rotations and all motion-stage graph bytes. Regression mutations cover both size lookups, pointer identity, owner/global counters, actor counts, missing events and retained-entry corruption. The new fixture archives full raw rows, source executable hash and independent cleanup evidence. This closes the observed `40c` write for this capture; full heap identity, failure-path orchestration, retained trick graphs and whole-frame parity remain open. Preview behavior is unchanged.

### Live AI trick-start graph — November 15, 2026

Added guarded `4a1970` entry / `4a1a2b` exit observations alongside controller, allocation and motion traces. The corrected 256-call capture contains two successful selected-7 trick starts (calls 46 and 245), both with orientation reset. `analyze-ai-trick-graph.mjs` applies the existing recovered `startMcmTrick` to real entry graph state and compares the complete bike body, rider animation object, envelope, bounds resource/records, and every byte of all eight transform nodes per event. Parent, child and sibling links are preserved. Both events match exactly; computed trick selection and the shared random stream select the captured indices (111 predicted draws, 127 total, 12 rejected attempts).

The first 512-call diagnostic capture exposed an adapter error: bounds-record byte 0 is the component index, while DWORD+4 is the local-transform flag. The capture adapter was corrected from original `44fa70` instructions and a fresh trace was recorded. The first capture is not used as parity evidence. Both captures completed, and independent verifiers confirmed all 26 hook bytes restored and debugger detached each time.

The maintained corrected fixture additionally matches retained allocation accounting (328 allocations/frees, 92 airborne skips) and 256 motion stages / 2,048 graph-node records. Crucially, full retained controller replay still rejects call 22 (`b4c` external clear); this is preserved as a failing-input regression. Trick entry pose, graphs, timer and record pointers are still explicit stage inputs. This milestone proves two real orientation-reset trick events, not all trick IDs or retained whole-frame parity. Preview behavior is unchanged. Regression mutations cover body bounds/scratch/animation, rider animation, envelope, resource records, local/world matrices, cache flags and missing exits.

### Combined contact-clear and trick controller replay — November 15, 2026

The maintained `capture-ai-controller-events.c` combines allocation, trick-start, motion-graph and AI-only contact-response observations. It stops at a controller exit after observing both a changing contact latch and a successful trick (minimum 64 calls, caller-supplied ceiling). The new trace completed 110 controller calls, including 1,183 contact substeps. At sequence 109, recovered contact response computes `b4c: 1 -> 0`. A successful selected-8 trick at sequence 5 includes orientation reset and all eight graph nodes. All 28 hook locations were independently verified restored, debugger detached, and the original process remains running.

`replayAiLandingPitch` now also invokes complete trick-graph validation and checks each graph event against the retained controller's computed trick selection. Combined replay passes all 110 calls, 78 gas commands, 78 rotations, 156 allocations/frees and 880 motion graph-node records. This uses computed contact output to update retained latch state, never the observed contact exit value. Removing contact rows reproduces a retained-entry failure at call 109; removing the one changing pair also fails, and changing the observed latch or trick matrices is rejected. The old call-22 capture without contact observations remains a negative regression.

The fixture preserves all non-contact rows and projects contact rows to the exact body words and stack fields consumed by the recovered routine, retaining full component and graph bytes; raw/projected hashes and cleanup logs are archived. The last observed controller call is the call following this clear, so sustained post-clear coverage remains to be expanded. Pose, contact inputs, event-entry graphs and global heap state remain explicit boundaries. Full world/frame orchestration, retained graph evolution, other controller modes and complete gameplay parity remain unfinished; preview handling is unchanged.

### Complete per-call AI bike-body composition — November 15, 2026

Added `analyze-ai-controller-body.mjs`, composing recovered startup, route, handicap, avoidance, lookahead, jump/trick, steering, throttle, motion and allocation outputs into a copy of controller-entry state. Every byte of the entire 0xcc8-byte bike body is compared at exit, including untouched bytes. Exit observations are assertions only. Replay helpers now expose computed per-call outputs while preserving the existing summary APIs; trick composition applies only the original routine's explicit body write set. Mutations to previously unchecked fields, the upper bytes beside the byte-sized animation selector and the last byte of the body are rejected.

The existing 110-call changing-contact fixture matches all 359,920 bytes, with 1,310 changed DWORDs across 48 offsets. A fresh bounded 512-call capture matches all 1,675,264 body bytes, with 6,282 changed DWORDs across 51 offsets. It additionally exercises brake output, avoidance flag changes, packed jump state and the startup jump counter. Eight successful tricks across IDs 0, 7, 8, 9 and 10 all include orientation reset and match complete stage graphs. Its 5,703 contact substeps contain zero latch changes: it does not extend post-clear coverage. Both fixtures remain necessary.

The capture now waits for at least 32 additional controller calls after the first contact change and a successful trick, subject to its caller-supplied ceiling (minimum 128 calls). This run reached its 512-call ceiling without a clear. All 28 hooks were independently verified restored and debugger detached. The new fixture preserves full body snapshots and all non-contact records, using the existing lossless-for-replay contact projection and raw/projected hashes.

Scope remains per-call controller body validation in the captured mode-0 scene. Pose and outer-frame inputs still come from each controller entry; existing route, steering, jump, allocation and contact state checks remain retained across calls. Event/motion graph entry snapshots are still boundaries. This is not yet retained whole-world simulation or proof of all modes, failures, races or gameplay parity. Longer post-clear coverage and complete controller graph composition remain open. Preview handling is unchanged.

### Complete per-call AI transform graph composition — November 15, 2026

`capture-ai-controller-graph.c` adds graph/resource snapshots at whole-controller entry and exit using the existing 28 guarded hook sites. It records the root/source graph with parent/child/sibling closure, bounds records and component links, rider animation object, envelope, and all 16 bike/rider animation record pointers plus selector payloads before a future trick is chosen.

`analyze-ai-controller-graph.mjs` constructs one graph from controller entry, applies the retained controller's computed trick selection through recovered `startMcmTrick`, then applies computed final motion to that same graph. Trick-stage and motion-stage graphs remain independent assertions; they never seed this composed graph. Every captured node byte, local/world matrix, cache flag, bounds record, rider animation field and envelope value is compared at controller exit. Animation resources and body snapshot identities are checked as well. Replay helpers expose the computed trick selection and motion inputs without changing existing summary APIs.

A new 159-call trace matches all 1,272 controller graph-node records, including one orientation-reset trick (selected 7, call 155) and 103 steering rotations. The same trace matches all 520,248 bike-body bytes with 1,810 changed DWORDs. It contains 1,918 contact substeps and one computed `b4c: 1 -> 0` clear at call 126, followed by 32 additional completed controller calls. Thus it extends the previous first-call-after-clear evidence. All 28 hooks were independently verified restored and the debugger detached; the original process remains running.

Regression tests alter only controller-entry graph position or the selected animation resource while leaving intermediate stage observations intact; the composed replay rejects both. Exit matrix/cache/record/animation/envelope corruption, missing graph boundaries and omission of contact events are also rejected. The fixture retains complete controller graph/resource observations and the established contact projection with raw/projected hashes and cleanup evidence.

Scope is still a complete per-call controller comparison in the captured mode-0 scene. The graph and pose at each controller entry remain outer-frame inputs; this does not establish retained graph evolution through the whole world, other AI modes, failure branches, races or full gameplay parity. The production world driver still needs the controller integrated with its real environment. Preview handling is unchanged.

### Terrain queries from the failing retained scene replay — November 15, 2026

The later retained scene fixture still fails at frame 1 tail: 38 bike DWORDs and 28 visual DWORDs differ. To isolate terrain arithmetic, recorded all 354 height/normal query input points made by that recovered replay and evaluated both height and smooth normal through the pinned original's isolated terrain-course oracle using original Dunes banks. All 12,594 parsed hierarchy nodes match, and all 2,124 query result words match bit-for-bit. The maintained `scene-terrain-queries-wine11.json` fixture stores native output words, source/result hashes and the failing scene fixture hash; its regression uses the imported preview terrain.

This rules out query evaluation at these recovered input points, not differing native inputs or surrounding physics/control order. The oracle uses host allocation/stdio and recovered bank loading, omitting rendering. It is not a full-game execution comparison. The strict failing scene regression remains unchanged. No physics behavior or preview handling changes in this milestone.

### Retained AI substep observations — November 15, 2026

The native observer now supports `MCM_AI_SUBSTEPS`, requiring the existing AI scene-object observation mode. Six guarded, non-CALL hook sites add contact, tire, motion, grounded-control, rider-entry and loop-finish records. Entry/tail records bind these to the same capture. Every record preserves the existing local checkpoint allocations plus stack bytes; it does not restore state or force timing. `verify-ai-frame PID substeps` independently checks all 17 sites and debugger detachment.

`analyze-ai-substeps.mjs` advances one retained simulation and asserts the full 0xcc8-byte bike body plus twelve wheel/suspension component words at each observed boundary. It checks record order, frame/substep identities, entry/tail agreement and the computed branch that bypasses the grounded-control hook. Native output is never used to reset computed state. Other captured allocations and stack words are preserved as diagnostics, not claimed as fully compared.

The maintained eight-frame fixture matches 478 substep bodies (1,564,016 bytes), 5,736 component words, all 32 frame bodies, five RNG draws and the complete checked visual state. All 88 substeps agree on control-hook visitation, including 50 bypasses. Seven separate rider ticks match 35,000 rider/child bytes. The shared particle pool still has 107,874 differing DWORD observations; whole-world ordering remains incomplete. Capture overhead produces frame intervals of approximately 0.842 then 24 seconds, with eleven capped substeps per frame. This is not normal-frame-rate or player-input parity evidence. All 17 sites were independently restored and the debugger detached.

Corrupting intermediate body/component output, omitting a boundary, inventing a control visit or changing capture identity fails the regression. The earlier scene fixture remains a strict negative test with 38 bike and 28 visual DWORD differences; the new passing trace does not replace it. No preview physics behavior changes in this milestone.

Further diagnostics on the failing trajectory found no difference in 226 original matrix/rotation calls, 44 pivot rotations, 22 isolated contact-roll calls or its one steering-velocity call at recovered inputs. Substituting 65 groups of captured entry scratch values, individually and together, did not remove the failure. These temporary experiments narrow the search; they do not establish native input equivalence or repair the trajectory.

### Correct base-component source for airborne control — November 15, 2026

A faster read-only capture exposed the first mismatch at frame 3, substep 0, between motion and rider entry. Body, component words and checked transform matrices still matched at motion. Original `0x4abb30..0x4abef9` reads the cached forward basis through `*(bike+0x8d8)`; the retained bridge incorrectly supplied the body root at `bike+0x434`. These nodes differ during trick animation. The live initializer now resolves the base component node explicitly, and the control/event source array uses it. Synthetic one-node oracle contexts retain their existing root.

This removes both that first substep mismatch and the previous scene fixture's 38 body / 28 visual DWORD differences. The earlier fixture now passes strict retained comparison, including its separate rider tick and particle pool. A deliberate reintroduction of the body-root alias reproduces its old strict failure. The new four-frame fixture matches all 237 observed substep bodies, 2,844 component words and 16 frame bodies; 7,412 shared-particle DWORD observations still differ, so whole-world parity remains unfinished.

The same initializer/control bridge is used by MCM Preview, so this changes actual airborne handling when the base component and body root differ. It does not claim full gameplay parity. The faster observer prototype remains outside the maintained capture source: its later measured intervals are approximately 3.0–4.3 seconds rather than 24 seconds, still far above normal frame timing. Its capture completed with all 17 sites restored and debugger detached.

### Correct retained recovery orientation source — November 15, 2026

The frame-end recovery bridge had the same source-node alias error as airborne control. Original `0x4afdb1..0x4afdd6` reads `*(bike+0x8d8)` through `0x4b7640`, then applies those axes to the body root at `bike+0x434`. The retained wrapper now passes the explicitly initialized base component node into recovery completion. Synthetic one-node contexts retain their existing root fallback.

A new regression sends the existing pinned-original recovery corpus through the retained wrapper, rather than only its underlying semantic routine. All 327 stored cases match 4,275,852 output words across four calls each, including six-node graphs, animation state/timers, bounds children and orientation scratch. The test failed on case 11 before the fix; deliberately substituting the body root reproduces that native mismatch. This is isolated recovery-branch evidence with synthetic assets, not a complete live crash/recovery trajectory. MCM Preview uses the corrected shared wrapper.


## Faster maintained capture exposes renderer transform-cache writes (2026-11-15)

Animation observations now batch nearby read-only allocations (maximum 64 KiB span, maximum 4 KiB gap), preserve emitted allocation order, and fall back to individual reads when a gap is inaccessible. The sorted table is rebuilt for every observation so replacing a graph with the same allocation count cannot reuse stale order. Buffered hexadecimal output replaces per-byte formatted output for the large graph/animation snapshots. No target inputs, timing, RNG or outputs are written.

Validation: the portable C transport test covers exact bytes, stable output ordering, inaccessible gaps, required-read failure, same-count graph replacement, and address overflow. `MCM_VERIFY_ANIMATION_BATCH=1` additionally compares every named animation allocation against an individual original-process read at the same suspended boundary. A two-frame native audit completed with all eight frame snapshots checked and all seventeen hooks independently restored, debugger detached. Recovered simulation matched 132 substep bodies, 1,584 component words and the rider/child checks; 864 particle differences remain.

A subsequent four-frame capture with audit reads disabled observed intervals of 0.910, 4.518, 3.800 and 4.028 seconds. These are observed game intervals, not a controlled benchmark and not normal-rate validation. It exposed a new retained-world failure, preserved as `ai-substeps-render-cache-wine11.json.br`: after the first rider update, caller `445711` invokes the world-transform resolver for 21 mesh nodes before the scene position query. Disassembly identifies this as the component loop in `445690` (selected table at mesh+234, index+11c, 40-byte groups and 20-byte component entries; nonzero entry+4 gates resolution). The scene query then visits only its already-valid target, whereas the retained model still predicts four nodes. The strict analyzer fails at frame 0 rather than importing observed cache flags or using recorded node IDs to mutate the graph.

Next: capture the mesh-update initial tables and invocation/eligibility inputs, connect its cache side effects to the shared retained graph, and prove the query chain and subsequent body/visual state against this unchanged capture. Separately, the older player world-prefix trace identifies the AI rider render proxy (5218220, linked to rider 523c2a0) as the unmodeled SSE writer at frame 2; that player-only initialization lacks the AI controller state needed for a complete replay. Full world capture and scheduler integration remain necessary.

A temporary diagnostic that resolves only the observed mesh-query targets gets past the first scene-chain assertion, then fails at the next bike entry (`bike+488`, retained 388 versus native 398). This is observed scheduling supplied as an experiment, not retained-world parity or a shipped runtime option. It shows that adding cache resolution alone is insufficient; additional render/world body writes also need recovery.

Shipping gate for this capture milestone: the full 744-test run produced 743 passes and one failure in the existing connected normal-event-decision corpus (fixture 6243, NaN-sign propagation). The isolated test passed, but the whole player-parity file reproduced the failure at fixture 6257. No simulation implementation was changed in this milestone. The following fix resolves the observed failures and removes that shipping hold.


## Preserve exceptional contact-state signs across JavaScript optimization (2026-11-15)

The normal-event-decision corpus exposed execution-order-sensitive NaN signs at zero-step cases 6243 and 6257. Typed intermediate stores now preserve the rear normalized direction, paired suspension projections/force assembly, and the angular-velocity vector passed to controller handoff. Arithmetic order and native signed-bit branches are unchanged; expected words are not normalized or excluded.

The new regression checks 978 original-corpus evaluations, alternating finite inputs with the two zero-step cases and comparing every output word. A cold case 6257 specifically detects handoff output word 558 changing from original negative indefinite `ffc00000` to positive `7fc00000`; loading the previous handoff implementation reproduces that exact failure. The broader order-sensitive failures did not reproduce under stage instrumentation, so the paired-force/direction typed stores also protect the observed nonfinite propagation paths rather than claiming a uniquely isolated JIT instruction.

Validation: focused cold/warmed regression passes on ARM64 Node 24 and x64 Node 22; the 204-test player corpus passes; the full 745-test suite passes (112 seconds), production build passes, and desktop/touch preview acceleration, release, steering and reset smoke checks pass without browser errors. The faster native capture milestone and explicit renderer-cache failure above remain part of this change. Complete shared-world integration and normal-rate original validation are still outstanding.


## Retained draw rectangles, detail selection and mesh caches (2026-11-15)

The native replay now connects the `44faf0` wrapper's projected rectangle and detail-level selection to the `445690` component world-cache updates. The original selects detail from signed screen area and the actor's threshold table, then `4b8b30` clamps and propagates the selection through the shared child graph. Selected mesh table entries determine which nodes resolve; observed resolver targets never select mutations. The calculated rectangle and actor selection update the owned AI body at `488..494` and `4a4`, so subsequent frame-entry assertions include those writes.

Read-only wrapper entry/exit hooks at `44faf0` and `44ff95` capture nested bike/rider calls, camera/viewport inputs, all mesh detail tables and thresholds, per-node detail state, rectangle outputs and complete post-draw node allocations. `MCM_AI_DRAW_TRACE` requires the existing AI/substep observation mode; `verify-ai-frame PID draws` independently checks all nineteen hook sites and detached status. The archive preserves draw data and any controlled camera selection/restoration logs.

The new eight-frame pinned-original fixture matches 32 complete bike-body boundaries, 480 substep bodies, 5,760 component words, 35,000 rider/child bytes and all captured visual/animation state. Fourteen nested draw returns match all rectangle and detail-state assertions and 24,150 post-draw node DWORDs. Two visible bike draws produce 24 correctly derived direct/recursive resolver calls; twelve other draws are culled. One visible draw selects detail 2 from initial selection 0, including recursive per-node clamping. Removing the draw model exposes the missing `bike+488` write; changed output rectangles, detail states and observed resolver targets are rejected.

For visible coverage, the camera target was selected to the AI before debugger attachment and restored to the player after independent cleanup. The four-byte target change and restoration were read back and verified. Bike inputs, RNG and frame timing were not forced. Capture intervals remain approximately 0.96 seconds initially and 3.31–4.62 seconds later; this is not normal-rate validation. The first controlled probe exposed the previously missing `bike+4a4` detail selection, prompting the expanded initial-table capture.

Scope: mesh tables and detail state initialize once and are retained; later observations assert them. Draw invocations, camera matrices, viewport and renderer mode remain explicit external stage inputs. Vertex-buffer generation, resource loading/alternate mesh dispatch, complete camera/world scheduling and shared particle writers remain unfinished. The visible rider-proxy path is not exercised by this new fixture, and 53,214 particle DWORD differences remain reported. The older render-cache negative fixture lacks these new inputs and remains an explicit failure; it is not relabeled as solved. This milestone adds replay integration and evidence, not a new preview graphics feature.

Validation: all 747 tests pass (103 seconds), including deliberate draw-output and query-target corruption checks; the production build passes.

## Rider orientation-reset source and visible rider draw validation (2026-11-15)

A fresh eight-frame original capture passed earlier substeps, then first diverged at frame 7, substep 9, rider return: bike scratch vector `+540` was `3e5e8a8b` instead of `3e85db55`. The rider callback setup still aliased its source to the body root. Original `4a188d`, `4a19c0`, `4aefaa` and `4afdc6` read orientation from the node at `*(bike+8d8)` and write the body root at `bike+434`. The retained rider callback now uses the separately initialized base node, with the existing body-root fallback only for synthetic contexts that omit it. This corrects the runtime used by the preview as well as native replay.

With that change the new fixture matches all 32 frame-body boundaries, 454 substep bodies, 5,448 component words, six RNG draws, 35,000 rider/child bytes and all checked visual state. It also exercises four visible bike and four visible rider-proxy draws, deriving 168 resolver calls and checking 24,150 post-draw node words across fourteen returns. This closes the previous fixture's missing visible rider-proxy coverage; it does not recover camera or invocation scheduling. All nineteen hooks were independently verified restored, debugger detached, and the controlled camera target restored to the player. Shared particles still have 47,716 differing DWORD observations, and capture timing remains far above normal gameplay rate.

Validation: all 748 tests pass; the production build and desktop/touch preview acceleration, throttle-release, steering and reset checks pass without browser errors.

## Shared-particle pool scheduling connected in AI replay (2026-11-15)

Optional `MCM_AI_POOL_TICKS` adds guarded entry `43b200` and normal/paused returns `43b334` / `43b216` to the existing AI draw capture. The pool's actual delta, pause state, complete 0x2004-byte pool and 1,000 complete 0x48-byte particle allocations are recorded in the shared rider/query event sequence. Allocation identity remains the initial pointer order even when native expiry reorders active slots. The independent `pool` verifier checks all twenty-two hook instructions and debugger detachment; archives require their cleanup evidence.

The retained analyzer now calls the recovered shared-pool update at those explicit observed invocations, with its own timing rather than an assumed bike/rider delta. It compares complete entry and exit allocations without reseeding. Seven ticks in a new eight-frame capture add 280,686 checked pool/particle words. Bike comparison still matches all 32 body boundaries, 474 substep bodies, 5,688 component words and checked visual state. A deliberately changed native entry age changes its reported comparison but not subsequent computed returns; a missing pool return fails validation.

This is not a shared-pool parity pass: 99,534 differing particle/pool DWORD observations remain across rider and pool boundaries. The first difference already precedes the initial pool tick: before the selected rider update, retained count is 12 versus original 107. That localizes an upstream shared-emission dependency rather than attributing every discrepancy to aging/expiry. Other emitter updates and draw-written pointers remain unconnected. All twenty-two hooks were restored and debugger detachment independently verified; the controlled camera target was restored. Capture overhead still prevents normal-rate validation.

A separate sixteen-frame follow-up to the rider orientation fix also passed 894 substep boundaries, 10,728 component words, 75,000 rider/child bytes and 51,750 post-draw node words, including 26 visible draws and 546 derived resolver calls. Its capture and checked archive remain diagnostic artifacts in `/tmp/mcm-ai-draw-visible-v5` and `/tmp/ai-draw-long-wine11.json.br`, not an additional committed regression fixture. Its remaining 1,558 particle differences cover age, render pointers and pool membership/order; the newer capture above demonstrates why that quiet trajectory is not general whole-world evidence.

A temporary four-frame writer probe observed 111 insertions at `43b1ed`, all outside the selected bike and rider updates; none hit the three inline emitter increment sites `439714`, `439d95`, or `43a440` in that trajectory. This identifies the generic insertion function as the next writer to trace, but does not yet establish its caller or emitting actor. All twenty-six diagnostic sites were independently restored and the camera target restored. Validation for the maintained pool milestone: all 749 tests pass (102 seconds), and the production build passes.

## Dust emitter update recovered and connected (2026-11-15)

The missing writer identified in the follow-up probe is the selected AI bike's own dust emitter at `bike+c94`: all 485 recorded insertions came from `438e10` through `4390bf`, not the exhaust caller. `dust-tick.js` now recovers the full update, including pause/inactive/startup gates, position reset, original square-root lookup, signed float-bit clamps, x87 spill order, distance-based count, size/lifetime interpolation, texture cycling and `43b160` pool insertion. Native unordered loop comparisons continue until pool exhaustion; this matters for positive NaN emission counts.

The isolated pinned-original oracle matches 968 cases / 17,456,912 DWORDs, including all 0x84 emitter bytes and all 1,000 complete 0x48 particle allocations. The cases cover pause/startup/reset, missing and exhausted pools, zero delta/distance, varied sizes/intensities, infinities and signed canonical NaNs. An altered untouched particle word is detected. These are function-level synthetic inputs, not full-world validation.

Optional `MCM_AI_DUST_TICKS` observes entry and all six return paths using seven guarded, non-CALL hooks, with independent twenty-nine-site cleanup verification. Actual dust timing/pause and emitter identity join the existing rider/pool/draw sequence. Replay uses the same byte-backed emitter that the frame-effects update modifies and the same retained pool used by rider emissions and pool aging; native outputs never seed it.

The new eight-frame fixture matches seven complete dust-emitter entries/returns and retains emissions of 58, 104, 118, 171, 0, 0 and 0 particles. Its first dust update matches every pool/particle word before and after the 58 insertions. All 32 bike-body boundaries, 474 substep bodies, 5,688 component words and checked visual state still match. Later shared-world differences remain explicit: 433,309 differing particle/pool DWORD observations across dust, rider and pool boundaries. New external writes occur after the first matching dust return and before the first pool tick; remaining emitters and particle draw writes are not yet connected. This capture has different activity from previous captures, so raw mismatch totals are not a before/after performance measure.

All twenty-nine original hook instructions were verified restored, the debugger detached, and the controlled camera target restored. Capture intervals remain too slow to establish normal-rate equivalence. This milestone connects dust to native replay; it does not claim the preview's entire world scheduler or particle renderer is ported.

A separate four-frame diagnostic writer capture observes only the selected dust emitter's 109 insertions. Its retained replay matches 229 substep boundaries and 2,748 component words; all 690 remaining particle differences are at the draw-written `particle+44` pointer. Particle creation/aging and pool count/order match in this quieter trajectory. All thirty-three diagnostic hooks were independently restored and the camera restored. This does not eliminate the additional emitter activity in the eight-frame regression above. Validation: all 752 tests pass (98 seconds), including output-corruption checks; the production build passes.


## Spray callback recovered; native boundary-memory failure retained (2026-11-15)

Recovered original spray update `4393d0` and connected it to the shared retained emitter/pool runtime. The initial full emitter tables initialize once; frame effects and spray updates share the computed prefix. Later observed entries and returns are assertions, never replacement state. Native scalar index 256 and vector index 32 deliberately read the original boundary words instead of wrapping early. Missing boundary bytes are rejected.

The isolated pinned-original oracle matches 616 cases / 11,328,240 DWORDs, with 63,474 changed words and zero differences. Coverage includes active emission, pool exhaustion, pause/reset/inactive branches, table boundaries and canonical nonfinite inputs. This is function-level evidence, not proof of whole-world parity.

The new eight-frame inactive-spray fixture matches all seven complete spray entries/returns, 32 bike-body boundaries, 489 substep bodies, 5,868 component words and checked visual state. All spray emissions are zero; active spray still needs retained live coverage. Its 22,688 remaining particle differences are confined to offsets +24, +2c, +30 and +44. Output corruption and missing returns are rejected.

A separate sixteen-frame capture fails at the second before-rider boundary: child+614 retains `0075000c` while the original contains `0146000c`. Disassembly at `40d541` allocates only 0x610 bytes before constructor `439e80`; +610/+614 are additionally captured because the original vector-table boundary can read them. The external writer is not identified and the failing capture remains an explicit regression, not a passing trajectory or a reason to reseed those bytes. All thirty-five hooks were independently restored, the debugger detached and the camera restored in both captures. An intermediate zero-frame timeout also cleaned up; the original process was not restarted.

Validation: all 756 tests pass (93 seconds), production build passes, and the isolated spray corpus also passes on x64 Node 22. This milestone improves original-execution replay and does not add a browser particle scheduler or claim a visible preview change.

## Particle visibility stores recovered against original code (2026-11-15)

`particle-visibility.js` implements the original `43b4c8..43b575` per-particle depth and viewport checks. Rejected particles retain every bound not reached by the native branch sequence. The first left-bound calculation uses the unrounded radius; the remaining bounds use its single-precision spill. Right/bottom rejection checks the unrounded sum after storing the rounded bound. Depth uses the original signed/unsigned integer comparisons on float bits, including negative zero; unordered viewport comparisons reject.

The isolated oracle runs the original `43b4b5..43b582` region, replacing only its end with a return before sorting and drawing. It receives explicit projected-center/camera inputs and compares all 0x48 particle bytes plus acceptance. The pinned fixture matches 896 cases / 17,024 DWORDs, with 2,280 changed particle words and zero differences. Inputs cover every rejection direction, depth edges, signed zero, infinities, canonical NaNs and varied finite projection/size values. Corrupting an untouched particle word or the acceptance result is detected. The same fixture passes on ARM64 Node 24 and x64 Node 22.

This stage is not yet connected to retained world replay or the browser renderer. Next is live particle-draw observation, shared render-pointer assignment and camera/device projection, then original invocation ordering and draw submission. The eight-frame spray fixture's remaining +24/+2c/+30/+44 differences remain explicit; this isolated milestone does not relabel them as resolved. Player negative steering, external boundary-memory writes and normal-rate whole-world validation remain open.

Validation: all 757 tests pass (91 seconds), and the production build passes.


## Particle draw writes connected in retained native replay (2026-11-15)

Added optional `MCM_AI_PARTICLE_DRAW` observation at guarded `43b3a0`, `43b4bc` and `43b582` boundaries. The observer captures shared pool/particle allocations, input and projected buffers, viewport/scale values and buffer identities before preparation, before visibility tests and after visibility tests. Empty draws make no writes and are skipped. All 38 sites passed independent preflight and post-capture restoration checks; debugger detachment and camera restoration passed. The original process was not restarted.

Retained replay now computes each particle's render pointer, prepares XYZ with the original +0.5 Y offset, resets the visible count, applies the recovered conditional bounds writes and builds the accepted list. Native prepared positions are assertions. Projected centers and camera/viewport remain explicit external device-stage inputs; the projection producer, accepted-particle sorting and draw submission are not yet implemented here.

The new eight-frame fixture matches 32 complete bike boundaries, 528 substep bodies, 6,336 component words, 35,000 rider/child bytes and 24,150 mesh-draw node words. All checked visual and particle/pool differences are zero. Seven particle draws contain 52, 116, 154, 184, 207, 219 and 220 active particles, all culled; their entry/prepared/exit comparisons each cover 20,049 words (421,029 total). This resolves the particle writes for this capture, not earlier captures with different emitter activity. Active spray, visible particle submission, the external rider-child boundary-memory writer and the existing player negative-steering divergence remain open.

Regression checks corrupt a native particle output and verify that only that comparison changes, with later computed state still matching. Altered prepared positions and missing visibility returns are rejected. No observed particle output is imported into retained state. This improves replay validation, not the browser particle renderer.

Validation: all 758 tests pass (94 seconds), production build passes, and the new retained draw regression also passes on x64 Node 22.

## Original sound recordings recovered (2026-11-15)

At the user's request, recovered all 45 WAV files from the pinned installation into `public/mcm-audio`, byte-for-byte (13,113,236 bytes). `build-audio-assets.mjs` validates the executable hash, parses every RIFF/PCM stream, preserves the complete original file and records SHA-256, original filename, duration, channel count and sample rate in `manifest.json`. All are 16-bit PCM; most are 22,050 Hz, with two wreck samples at 44,100 Hz. The exporter normalizes output filename case and rejects collisions.

Original executable references confirm deceleration (`425b07`, string `4e322c`), idle (`425b6d`, `4e3220`), bike (`425bdb`, `4e3214`), landing (`425cab`, `4e31fc`), wreck variants (`425cc0`, `4e31ec`) and maximum-engine (`425e68`, `4e31d4`) resource loading. The executable also references `skid.wav`, which is absent from this installation; the manifest records that gap rather than inventing a replacement.

These are recovered recordings, not audio-behavior parity. The browser still uses `RideAudio` synthesis. Remaining audio work: recover loop selection, pitch/rate and gain rules, throttle-release transitions, landing/crash triggers, spatialization and pause/reset lifecycle, then wire the original recordings into preview and validate against original playback. Assets are served without loading them during startup. Production build passes; exported and built WAV bytes are checked against the manifest hashes.


## Particle projection derived from device matrices (2026-11-15)

Read-only inspection identifies the live particle projection callback as DDRAW RVA `1bc40` in the pinned Wine 11 build (SHA-256 `be2964ddd67d148bcf87c4a1eedf8cf5e1ccc39eb7c87f3079df181d80fbea29`). Its unclipped path composes the three device matrices with the recovered SSE matrix operation, transforms each center with single-precision stores, divides by W and applies the viewport using the observed mixture of single/double precision. Source color/texture words are copied unchanged.

The same 38 guarded observation sites now capture those matrices and viewport identity/dimensions. `particle-projection.js` derives projected records from computed particle positions. Native projected outputs are assertions, not inputs. The retained analyzer explicitly labels legacy fixtures `observed` and new fixtures `computed-from-device-matrices`; missing matrices within a new capture are rejected rather than silently falling back. Temporary viewport switching is rejected until that state transition is recovered. Archives with matrix observations additionally require the pinned DDRAW DLL hash.

A new eight-frame native capture matches 1,294 complete projected records (10,352 DWORDs), 32 bike-body boundaries, 501 substep bodies and 6,012 component words. All checked visual and pool/particle differences are zero. Seven draw passes contain 22, 86, 188, 246, 282, 273 and 197 particles, all culled. Corrupting both paired projected observations fails; deleting matrix inputs or changing matrices also fails. All 38 original hooks were independently restored, the debugger detached and the camera restored without restarting the original.

Remaining boundary: device matrices, viewport and invocation order are still external stage inputs. Camera producers, visible-particle sorting/submission, other actor/emitter activity, the rider-child boundary-memory writer and sustained player negative steering remain unfinished. The new live projection evidence covers finite observed inputs, not an exhaustive exceptional-value corpus or full-world parity. Original audio playback rules and preview integration remain outstanding alongside physics work.

Validation: all 759 tests pass (108 seconds), production build passes, and the new projection regression passes on x64 Node 22.

## Original audio control paths traced; attenuation recovered (2026-11-15)

Decompiled `426be0` identifies the player's engine playback state machine: idle/deceleration switching uses buffer playing status and deceleration playback position (threshold 0x2b750), acceleration starts `bike.wav` at one of seven original byte offsets, and throttle release stops the engine buffer and starts deceleration. Offsets at original `4e30f8` are 0x50e00, 0x78200, 0xa2600, 0xe6200, 0x14d200, 0x192e00 and 0x1afe00. These are playback cursors, not a fabricated RPM-to-pitch curve. Crash/landing state and buffer status affect subsequent commands; those command sequences still need an original-execution oracle and browser integration.

`sound-distance.js` recovers complete original `4276f0` / `427760` distance and attenuation behavior. It ignores Y, clips by signed float-bit tests on absolute X/Z separation, uses the original square-root lookup, and computes DirectSound volume with original constants and integer truncation. The diagonal-out-of-range branch preserves the caller's pan word; the ordinary branch writes zero pan. This models the game's software attenuation helper, not the separate DirectSound 3D mode.

The isolated pinned-original oracle matches all three output words over 664 cases (1,992 DWORDs), including distance boundaries, large vertical offsets, diagonal rejection, signed zero, infinities, NaNs and denormals. It executes both original functions completely, with no replacement audio or math calls. A changed pan output is detected. Browser audio still uses synthesis until the recovered playback controls are connected; this milestone does not claim audible parity.

Validation: all 760 tests pass (112 seconds), production build passes, and the attenuation corpus also passes on x64 Node 22.

## Normal-riding engine audio command policy recovered (2026-11-15)

`riding-sound.js` ports the normal-riding branch of original `426be0`. It derives sound demand from the original player/secondary/replay/AI fields, retains prior throttle/gear/engine state, emits the original stop/play/seek ordering, and handles landing notifications, release, airborne demand and return from a previously crashed state. Idle and bike stops preserve cursors; deceleration and launch stops reset them. Engine starts select one of the seven original byte offsets using the supplied random result. These are sample seeks, not pitch estimates.

The isolated oracle executes original `426be0` with explicit audio-status/cursor, control and RNG boundary callbacks. It compares all manager bytes, modeled device status/cursors and the ordered boundary calls. All 906 cases / 306,228 DWORDs match, including 6,591 calls: 1,567 stops, 1,593 plays, 426 seeks, and 3,005 status/cursor/control/RNG reads. Coverage crosses AI/secondary/replay/player demand, throttle and gear transitions, deceleration cursor threshold, airborne state, landing, previous crash cleanup, null launch handle and random seek boundaries. Corrupting an untouched manager word or a command fails the comparison.

Scope remains explicit: the actual crash branch is rejected until recovered; the callback devices model supplied state and do not validate DirectSound timing, wrapper enable gates, audible output or shared world/RNG scheduling. Browser audio still uses synthesis. The next audio step is crash/event policy and the playback adapter, followed by live command captures and audible preview checks. No original-game debugger was attached for this isolated corpus; an initial harness calling-convention fault was corrected before collecting the passing output.

Validation: all 762 tests pass (128 seconds), production build passes, and the two new audio policy regressions pass on x64 Node 22. The preceding attenuation deployment also passes public desktop/touch asset/startup checks.

## Original wreck sample selection recovered (2026-11-15)

`wreck-sound.js` ports complete original `427230`: nearest-even random selection among six recordings, seven status probes before forcibly stopping/resetting sample zero, impact-dependent byte cursor clamped to the first half of the recording, optional volume update and nonlooping playback. The constant at `4d6f08` is exactly float bits `3c23d70a`; comparisons preserve the original unordered-to-zero behavior. Sample lengths are unsigned and the half-length spills to float32 before the impact calculation.

The isolated original-code oracle executes the complete routine with explicit RNG and sound-device callbacks. All 880 cases / 233,200 output words match, including 7,898 ordered boundary calls. The corpus covers free/busy sample combinations, random index boundaries, alternating retry choices, missing volume override, zero/odd/large unsigned sample lengths, impact thresholds, infinities and NaN. Regression checks also detect tampered selected-index and command outputs. The fixture stores pinned executable, harness, generator and corpus hashes. No original-game debugger was attached.

This recovers the helper, not its crash-state caller, actual playback clock, sound wrapper gates, shared-world RNG scheduling or browser audio integration. The browser still synthesizes sound. Full physics parity remains open, especially sustained player steering without substituted caller scratch and complete world update dependencies.

Validation: all 763 tests pass (107 seconds), the production build passes, and the new original-code regression passes on x64 Node 22.

## Complete crash audio controller composed (2026-11-15)

`riding-sound.js` now dispatches the crash branch of original `426be0` through `crash-sound.js` when explicit rider, listener and wreck-length context is supplied. It retains the original first-crash sequence, launch-vs-idle/deceleration choice, selected wreck suppression, fall cooldown, delayed crowd reaction, timer stores and menu-sensitive play command. Assembly confirms deceleration/idle stop calls use reset=0 at crash entry; fall and crowd signed-bit timer gates include exactly five seconds and one second respectively. Missing crash context is still rejected rather than silently inventing external state.

The oracle executes original `426be0`, `427230` and `427760` together, including original square-root lookup initialization. Across 1,024 cases, all 359,424 output words and 6,916 ordered calls match. Outputs cover all manager bytes (pointer tokens normalized), nineteen modeled device cursors/status bits and ordered control/audio/RNG calls. Inputs cross first/ongoing crash, crash kind 12, contact notifications, current wreck status, throttle/control modes, fall-trigger flag, cooldown boundaries, crowd latch, random index boundaries and near/far listener geometry. Tampered manager state and commands fail comparison. The existing 906 normal-riding cases remain regressions.

Boundaries remain explicit: group-stop is a supplied callback (its collection membership and effects are not recovered here); play wrapper enable/menu gates, audio clock, actual audible output and shared RNG scheduling remain outside this oracle. Browser audio remains synthesized pending the playback adapter. No original-game debugger was attached or original process restarted.

Validation: all 764 tests pass (145 seconds), production build passes, and the crash/normal-riding regressions pass on x64 Node 22. An initial x64 check started before fixture compression completed and reported a missing file; rerunning after the fixture existed passed all three tests.

## Original sound wrapper and group stop recovered (2026-11-15)

`sound-device-control.js` recovers complete `426af0` and `401cf0`. The play wrapper respects world enable/reaction flags, ignores null samples, optionally resets the cursor before playing, and forwards the original reserved/loop arguments. Group stop walks the linked list in order, skips samples without a DirectSound buffer, queries status, stops only playing samples, preserves the requested reset flag, and exits on the first failed status/stop call. Status failure forwards the original diagnostic location and line 111.

An isolated oracle executes both complete routines with callbacks only at the DirectSound status, sample stop/play and error-report boundaries. All 1,024 cases / 264,192 words / 2,609 ordered calls match, covering empty and populated groups, absent buffers, playing/status flags, error paths and play gates. Mutation checks detect altered results and calls. The regression passes on ARM and x64 Node 22, and production build passes. Actual device timing, group construction and browser playback remain outside this evidence; the crash controller's group callback has not yet been replaced by the recovered traversal in its composed oracle. Main's crash-controller milestone is `492fa95`.

## Crash audio composed with native group and playback gates (2026-11-15)

`sound-controller-device.js` binds the recovered controller to the recovered playback wrapper and group traversal. A new composed oracle now executes original `426be0`, `427230`, `427760`, `426af0`, `401cf0` and list insertion `401c20` together. Group 44 contains deceleration, idle, engine, skid and landing in initialization order; original insertion appends to the tail. The corpus crosses world sound/reaction flags and a missing skid buffer, while retaining the crash-state scenarios from the preceding fixture.

All 4,096 executions / 1,437,696 words / 34,646 ordered calls match, including modeled status and cursor effects of group stops. This removes the prior group-stop and play-wrapper substitutions from the composed execution. Original sample methods, DirectSound status queries, input and RNG remain explicit callbacks. Their playback timing and real device failure behavior remain outside this evidence, as do the full world schedule and browser playback adapter. The old conditional fixtures remain intact with their original scope.

Validation: five affected audio regressions pass on ARM, the composed regression passes on x64 Node 22, and production build passes. A changed manager field or device call is detected. Fixture provenance includes the pinned executable and the source crash corpus hash.

## Original sample playback connected to preview (2026-11-15)

The recovered-core preview now runs the recovered normal/crash audio controller at each fixed simulation tick through the recovered wrapper/group adapter. It reads the retained bike/engine/rider fields and converts the displayed listener position into native coordinates. `McmSampleAudio` supplies Web Audio PCM playback, byte-aligned cursor accounting, idempotent looping calls, seek/stop/reset behavior, DirectSound-style centibel gain conversion and pause/resume cursor retention. Original engine, idle, release, landing, launch, wreck, fall and crowd recordings are loaded on the first sound gesture. The unavailable `skid.wav` remains explicitly silent. Synthesized engine/wind/landing audio is suppressed in recovered preview; existing race UI beeps remain.

Loading errors are surfaced in the UI and diagnostics, permit retry, and do not stop physics. New sample transport regressions check preserved/reset cursors, repeated loop calls, seeks, missing assets, pause/resume and one-shot completion. A Chrome smoke verifies nonzero decoded audio output for idle and throttle, original deceleration on release, frozen cursor/ticks while paused and continued physics after a deliberately failed bike-sample download.

Scope: this is playable original-recording integration, not full audible or physics parity. The audio-only CRT RNG stream intentionally cannot alter the retained simulation stream; original shared-world/audio order remains unresolved. Web Audio clock/resampling, pause lifecycle, listener adaptation, pitch/frequency changes, other-bike/ambient/crowd policies and actual DirectSound device behavior require further comparison. Current engine selection/seek and crash command policies retain their isolated-original evidence. Full physics parity still requires the unresolved player steering/caller scratch and world dependencies.

Validation: all 769 tests pass (110 seconds), sample transport tests pass on x64 Node 22, production build passes, and the final Chrome audio flow passes idle/throttle/release/pause/resume with no page errors. A separate failed-download run confirms physics continues and audio reports the failure. These checks verify emitted browser signal and routing, not a waveform comparison with the original game.

The same browser flow also passes in a mobile viewport using trusted touch-start/touch-end events on the on-screen gas pedal, with original idle/engine/release signals, stable paused cursor, resumed output and no page errors.

## Original visible-particle sorting recovered (2026-11-15)

`particle-sort.js` recovers comparator `43b350` and the pinned CRT sort `4bec70`/`4bede0`. It orders by projected depth and preserves the original partition/short-sort tie permutations. The comparator treats unordered float comparisons as -1; replacing it with subtraction or a stable JavaScript sort would change the original list order. This is the next stage after the currently connected particle projection/culling path.

The isolated oracle calls both intact original routines with actual particle/projection allocations and compares the entire normalized pointer array, including untouched entries. All 228 cases / 233,472 output words match, with 41,028 active particles across counts 0–1,024. Coverage includes the eight-element short-sort boundary, ascending/descending/repeated depths, signed zero, infinities, NaNs, large finite values and subnormals. Mutations to an active result and an untouched slot are rejected. ARM/x64 regression tests and production build pass.

This does not yet validate a live visible-particle submission. The latest live projection fixtures still cull all particles; visible-quad generation, sorted draw-tail observations, scene scheduling and camera producers remain required. No original-game debugger was attached for this oracle. Full physics parity and the older negative-steering failure remain open.

Hosted audio verification: Pages run `43790553629` deployed `8a45cb4` successfully. The public GitHub Pages preview passes the original-audio browser flow on desktop and mobile with trusted touch pedal events: decoded idle/engine/release signals are nonzero, pause freezes cursors and controller ticks, resume restores output, and page/physics errors are absent. This confirms the user-visible change is deployed, not only present locally.

## Visible-particle quads and submission tail recovered (2026-11-15)

`particle-quads.js` recovers the sorted visible-particle tail `43b582..43b8f6`: native empty-list return, depth sorting, fog alpha, lifetime alpha, inherited diffuse-color behavior, four transformed/lit vertices per particle, texture binding, render-state ordering and indexed submission. Flag bit 0 preserves the previous diffuse color, including the explicit inherited seed on the first particle. The original draw call uses total-pool count times four for vertices and visible count times six for indices; the port preserves both counts independently. Texture format `115c` skips the optional state-33 changes.

The isolated oracle executes the intact original tail, including its CRT sort and final epilogue. Only texture binding, render-state and indexed-draw methods are boundary callbacks. All 768 cases / 302,592 words match: 12,252 vertices, 682 nonempty draws and 4,774 ordered calls. Cases cover empty returns, unequal total/visible counts, both texture paths, fog gates/ranges, all low flag combinations, inherited-color sequences, exceptional lifetimes and arbitrary UV words. Active vertex and command mutations are rejected. The corrected native oracle repeats byte-identically; ARM and x64 regressions and production build pass.

An initial stage harness had an incorrect saved-register/local-stack layout when extended to the native epilogue. Two isolated helper executions faulted and were terminated by their specific Wine PIDs; the original game was not restarted or instrumented. Acceptance evidence was regenerated only after matching the original prologue layout, and both corrected runs completed normally.

Remaining boundary: projected positions, camera fields, UV table and inherited diffuse seed are explicit stage inputs. The latest live particle fixtures still cull every particle. Connecting this tail to a live visible capture, recovering the seed/table producers and retaining graphics/world scheduling remain necessary; this does not close the player steering failure or establish full physics parity.

## Visible particle draw replay adapter and guarded capture (2026-11-15)

The retained sequence analyzer now connects computed culling to the recovered depth sort and quad generator. It resolves visible pointers through the current active allocation table, retains the computed projection, updates the sorted pointer list, and compares generated vertex bytes with observed output. Missing draw-tail pairs, changed stage inputs, unknown particle ownership and changed vertices are rejected. Capture optionally observes `43b599` and `43b835` (40 total guarded sites), recording inherited diffuse seed, camera depth/fog inputs, render flags, texture format, UV data and the resulting quad buffer. These remain explicit external stage inputs, not recovered camera/texture producers. Archives require restoration of both added sites even when enabled captures contain only culled draws.

Validation: all 682 nonempty cases from the existing 768-case pinned-original quad corpus pass through the live adapter, including reversed allocation addresses and original sort output. Mutation checks reject changed color output, changed seed, unknown ownership and absent computed projection. All 17 particle-quad/retained-substep regressions pass; the three quad tests also pass under x64 Node. Capture/verifier binaries compile and the production build passes.

Two new live capture attempts (`/tmp/mcm-ai-quads-v1` and `v2`, the latter without the grounded filter) terminated with zero records after the observer's 30-second limit. Both independently verified all 40 restored instructions, debugger detachment and camera-target restoration. They are not passing parity fixtures. A subsequent read-only check of original PID 292 found pause word zero, selected AI actor `51f7598+20` zero, and the original window unfocused. A normal foreground request returned success but did not confirm foreground ownership. No actor gates, physics state, RNG or timing were forced and the original was not restarted. Live visible-quad integration remains unproved; investigate normal game scheduling/window state before further capture attempts. This milestone changes replay tooling, not preview physics behavior.


## Retained initialization during an original active trick (2026-11-15)

The original window was minimized, explaining the two zero-record captures. A normal window restore resumed execution without restarting PID 292 or changing bike state. The subsequent eight-frame capture starts with `bike+710=1`, crash flag zero and recovery mode zero. Its first replay rejection was an obsolete normal-pose-only initializer guard, not a failure of the recovered trick dispatcher.

Full-frame bootstrap now explicitly allows initial AI trick states only with retained animation observations and a valid nonnegative trick index (0–15). It loads the captured current animation and history once and uses the existing retained trick update. The standalone normal-pose initializer retains its guard; crash, recovery, nearby/signed-negative indices and missing retained history remain rejected. No later observed body, animation, RNG or projection output is substituted into the runtime.

`ai-active-trick-entry-wine11.json.br` matches all eight frames / 32 bike-body boundaries, 465 substep boundaries, 5,580 component words, six RNG draws, 35,000 rider bytes and 24,150 draw-node words. All checked visual and shared-particle words match. Five particle draws still cull every particle, so this adds no live visible-quad proof. All 40 hook sites were independently restored, debugger detachment verified, and the controlled camera target restored. The incoming first interval is about 0.589 seconds; later intervals retain observer overhead, so this remains non-normal-rate evidence.

All 24 targeted substep/animation tests pass; the two active-trick tests also pass on x64 Node, and the production build passes. Regression checks preserve native fixture hashes and cleanup, reject altered intermediate trick state, and retain unsupported-initial-state guards. This is replay/bootstrap coverage, not a change to preview handling or full physics parity. Player negative-steering caller scratch, normal-rate trajectories and surrounding world dependencies remain open.


## Batched particle observation with same-boundary audit (2026-11-15)

Each shared-particle snapshot previously issued 1,000 separate Wine reads and formatted every byte individually. The read-only observer now groups nearby allocations into bounded 64 KiB spans, retains initial allocation order, falls back to individual reads across inaccessible gaps, and buffers hex output. Duplicate, overlapping, null and overflowing allocation addresses are rejected. The target remains stopped for the complete observation; no target state is written. `MCM_VERIFY_PARTICLE_BATCH=1` additionally compares every batched allocation with an individual read before resuming, and each snapshot records whether this audit was enabled.

Portable C tests cover exact bytes/order, inaccessible-gap fallback, missing required bytes, duplicate/overflow rejection, deliberate audit mismatch, output encoding, and stable identity after active slots reorder. All three affected capture harnesses compile. A native four-frame audit (`ai-particle-batch-audit-wine11.json.br`) matches all 34 same-boundary particle snapshots, 16 complete bike boundaries, 241 substep boundaries and 2,892 component words, with zero checked visual/particle differences. The subsequent eight-frame unaudited capture (`ai-particle-batch-fast-wine11.json.br`) matches 32 bike boundaries and 498 substep boundaries (5,976 component words), also with zero checked visual/particle differences. Both captures independently restored all 40 hook sites, detached the debugger and restored the camera target.

Observed intervals with the audit disabled are 0.324 seconds initially and 3.151–4.049 seconds afterward. These are separate natural trajectories, not a controlled before/after benchmark; the improvement removes redundant work but does not establish normal-rate validation. All particle draws in these fixtures remain culled. Sustained player steering, other world writers/scheduling and capture overhead remain unresolved. Preview handling is unchanged.


## Buffered frame transport and measured debugger overhead (2026-11-15)

Optional `MCM_PROFILE_CAPTURE=1` now reports observer wall time, stopped-event handling, frame-snapshot time, the shared read-wrapper time/count/bytes, and per-site breakpoint hits. Read timing excludes included exporters that use separate read helpers; stopped/snapshot time includes their work. These timings overlap and must not be summed. Profiling does not replace the original frame delta or write target state.

The unbuffered four-frame probe measured 19.008 s wall, 15.603 s stopped, 9.173 s in 16 snapshots and 0.329 s in the measured read wrapper. The main output stream was unbuffered despite containing millions of formatted bytes. It now uses a 64 KiB buffer and checks a flush after each complete bike or RNG record before resuming the target. Closing the output stream also propagates write errors.

The capture/verifier compile, and the new fixture regression passes on ARM and x64 Node. The retained `ai-buffered-observation-wine11.json.br` capture passes four frames / 16 bike boundaries / 237 substep boundaries / 2,844 component words, with zero checked visual or particle differences. It measured 9.289 s wall, 6.589 s stopped, 0.412 s in snapshots, 0.463 s in the read wrapper, and 12,488 debug events. The largest breakpoint count is 4,687 at shared resolver `4b6930`; most hits do not produce selected-bike observations. That debugger traffic, other event work and initial exports remain overhead targets. Its original intervals are 0.813, 1.982, 0.932 and 0.977 seconds: improved observation cost, still not normal-rate parity. These independent natural trajectories are not a controlled performance benchmark.

An earlier buffered probe began in a crash state, produced five entries within its 16-record cap, and was rejected by the substep analyzer (`Invalid substep frame`). It is diagnostic-only, not a passing parity fixture. All three probes independently restored all 40 instructions, detached and restored the camera target; the original was not restarted. Player negative-steering/world-state parity and normal-rate repeatability remain unresolved. This milestone changes capture transport, not preview physics.


## Predicate-gated query and substep observation (2026-11-15)

Two optional capture modes now disable debugger hooks only during intervals already excluded by their existing record predicates. `MCM_AI_QUERY_GATING=1` disables `4b6930` before retained capture starts and during selected bike/rider updates; all other query callers remain observable, including unknown callers outside the known scene/draw paths. `MCM_AI_SUBSTEP_GATING=1` disables the six substep hooks when no selected bike update is active. The ECX/ESI allocation identity checks remain. Both modes are opt-in and require their corresponding observation streams.

Instruction changes happen while a debug event holds the target stopped. A hook with a pending single step is left untouched until that step returns; terminal cleanup remains responsible for restoring every armed instruction and clearing TF. The observer and hook decision share the same predicate functions. Portable tests exercise 165,312 combinations of enable/install/terminal/pending/armed/frame/activity state plus entry, nested rider, single-step and cleanup transitions. Capture and verifier compile.

`ai-query-gating-wine11.json.br` passes four frames, 16 bike boundaries, 240 substep boundaries, 2,880 component words and 51 recorded world queries, with zero checked visual/particle differences. It records 14 gate transitions and 816 resolver breakpoint hits; later intervals are about 0.722–0.753 seconds. The combined `ai-substep-gating-wine11.json.br` passes eight frames, 32 bike boundaries, 454 substep boundaries, 5,448 component words and 247 world queries, also with zero checked visual/particle differences. It records 30 query and 102 substep gate transitions, 7,000 debug events and 2,032 resolver hits. Its original intervals are 0.092, 1.197, then 0.668–0.727 seconds. Native fixtures preserve complete cleanup for all 40 hook sites and restored camera targets; the game was not restarted.

Both new fixture regressions pass on ARM and x64 Node. Removing an eligible world query or a required substep from either fixture still fails replay; gating does not make those assertions optional. The visible-quad hooks were hit before retained capture began in the query-only run, while retained particle draws remained culled; live visible-quad parity is still unproved. These natural runs are not controlled performance comparisons, and neither proves normal-rate driving. Remaining global hook traffic, initial exports, surrounding world inputs and the older player negative-steering divergence remain open. Preview handling is unchanged.


## Full retained rider-collider projection exposes shared-grid divergence (2026-11-15)

AI sequence replay now compares the complete 0x110-byte rider collider, its four 24-byte linked grid entries, all 60 words in its pair row and column, and the grid-enabled flag at initial, bike and separate rider boundaries. Mutable shape/contact/callback fields, links and pair flags are projected from the retained shared objects. Unmodeled allocation bytes come only from the initial world checkpoint; later native bytes are assertion targets, never seeds. Ownership, allocation/count changes, inconsistent pair diagonals and missing observations are rejected. Reports explicitly include `collisionStatus`, `collisionBoundaries`, `collisionWords` and `collisionDifferences`.

This **reveals a failure**, not a new whole-world parity pass. Existing `ai-substep-gating-wine11.json.br` checks 47 collision boundaries / 10,011 DWORD observations and reports 76 differences, all in the first entry's previous/next links. The earliest is frame 0 before the rider tick: retained previous pointer `1b405d0` (player rider collider ID 1, actor `51dd978`) versus original `518b9b8` (grid cell 4096, the overflow sentinel of the 64×64 grid beginning at `51739b8`). Collider shape, contacts, callbacks and pair row/column match in this fixture. Later links also reference player-bike and selected-bike entries. This localizes an unretained shared-grid ordering dependency consistent with other actors updating between observed boundaries; it does not yet identify the responsible native call or justify replaying observed pointers.

All 34 targeted AI sequence/substep regressions pass, and the new collision regression passes on x64 Node. These tests retain the exact 76 native/model mismatches rather than claiming collision parity, expose deliberately changed shape/pair output as additional differences, and reject a missing first collision observation, removal of all collision observations, or altered entry ownership. The prior positive bike/component/visual/particle counts remain scoped evidence, not proof that collision dispatch will remain equivalent during interactions. Next: capture/derive the other actors' grid-update order and state, then evolve those actors in the shared world without reseeding. No new original debugger was attached for this milestone, and preview handling is unchanged.


## All-actor collision-grid trace isolates missing world updates (2026-11-15)

`MCM_AI_GRID_TRACE` observes the common grid entry `42a6e0` and all three returns (`42a998`, `42b005`, `42b673`) for colliders sharing the selected bike's manager. Each boundary records all cells and all four objects' entries, geometry and caller identity. The first diagnostic incorrectly covered only one return; it rejected a subsequent overlapping call after three bike records, restored all hooks, detached and restored the player camera. It is not passing evidence. The corrected four-frame capture completes with all 44 hook sites independently restored, debugger detached and camera restored; the original process was not restarted.

`ai-all-grid-wine11.json.br` retains 78 complete grid calls: 39 selected-bike and 33 player-bike calls from `4ac81b`, plus three calls for each rider from `40ea7c`. `analyze-grid-trace.mjs` initializes links once from the atomic collision checkpoint, supplies only the current callee's observed geometry and call order, and runs the already recovered grid helper. All **3,849,768 DWORD comparisons** match across every entry and cell at every boundary. Removing a player-rider call exposes divergence; corrupting one observed link produces exactly one discrepancy without contaminating later state. Missing returns and changed identities reject. This validates the grid stage with external geometry/order, not the complete world scheduler or other actors' physics.

The same fixture passes four retained AI frames, 208 substep boundaries and 2,496 component words, with no visual or particle differences. It also supplies the first nonempty live quad evidence: 14 visible particles (448 vertex words), then zero, then one (32 vertex words), all matching. Device matrices remain external inputs. The retained single-bike/world replay still reports **32 collision-link mismatches**, which this milestone deliberately preserves. Next work is to evolve the player bike/rider and reproduce their scheduling from initial state, not insert captured links or call inputs into production physics. Capture intervals remain approximately 0.106, 1.255, 0.689 and 0.733 seconds, so normal-rate behavior remains unproven.

Validation: four grid regression checks pass on ARM and x64 Node 22; the retained AI/visible-particle regression passes on ARM. Native observer and independent verifier compile successfully. Raw files and hashes, cleanup and camera logs are included in the fixture.
