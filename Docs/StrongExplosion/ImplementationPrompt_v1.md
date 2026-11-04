# Strong Ground Explosion — Implementation Prompt v1

## Task and authorization

Implement the approved StrongExplosion v1 design when the user requests implementation. This document is the final English implementation handoff. Producing it did not create runtime assets or validate a Unity effect.

The user approved BP-01 v1, the shape kit, specification v1, Asset Plan v1 A01–A07, and this prompt export by answering the explicit combined approval question with a continuation instruction. The approval evidence is recorded in `D:/Game_prj/VFX_LIb/Docs/StrongExplosion/DesignLedger_v1.md`. Do not request these approvals again while staying within their exact scope. Approval does not establish artistic success of any future render. Do not restart the stopped LargeExplosion task or modify SmallExplosion or Cannon effects.

Current handoff scope is documentation. If this prompt is supplied as an implementation request, carry out the approved plan. Otherwise, do not interpret its presence on disk as an instruction to run production.

## Project and references

Target: `D:/Game_prj/VFX_LIb`. Verified project version: Unity 2022.3.62f3. GraphicsSettings has no custom render pipeline; the project uses Built-in. ShaderGraph 14.0.12 is already in the manifest. Do not install packages or change render pipelines.

Read applicable project instructions and recheck relevant files before edits; another task may have changed the workspace. Preserve unrelated changes. Work only in the approved new folder `Assets/StrongExplosion_v1/` and its own documentation. Source library assets remain unchanged.

Reference bundle:

- `D:/Game_prj/VFX_LIb/Docs/StrongExplosion/References/StrongExplosion_Concept_v1_Draft.png`
- `D:/Game_prj/VFX_LIb/Docs/StrongExplosion/References/StrongExplosion_Blueprint_ShapeKit_v1.html`
- `D:/Game_prj/VFX_LIb/Docs/StrongExplosion/ShapeSpecification_v1_Draft.md`
- `D:/Game_prj/VFX_LIb/Docs/StrongExplosion/AssetPlan_v1_Pending.md`
- `D:/Game_prj/VFX_LIb/Docs/StrongExplosion/References/ReuseCandidates_AlphaInspection.png`

The spec and plan filenames retain Draft/Pending for link stability; their leading status and approval evidence govern. The concept image itself remains a draft visual reference. The approved blueprint and specification govern over incidental detail in that image. Open the actual images and blueprint before producing assets. If moving to another machine/chat, attach the reference PNG and blueprint HTML as well as this prompt; do not assume these paths are accessible.

## Approved visual identity and source interpretation

Create a powerful Stylized 3D ground explosion with five visual roles: rolling smoke, impact accents, central light, flying rock debris, and spreading surface cracks. Use hot yellow/orange near the center and dark smoke outside. The smoke envelope expands as a rounded dome around a fixed center, then rolls and dissipates. Cracks are cosmetic marks on a flat ground surface. Every component eventually disappears.

The draft concept shows a low bright center, orange interior illumination, dark smoke towers and side lobes, sharp radial impact tips, angular flying rocks, and branching cracks visible beyond the smoke footprint. It also contains dense small smoke detail and a tall central cluster. Do not reproduce those incidental details at the expense of the approved simpler dome and large smoke masses.

BP-01 is a structural diagram, not a shaded final render. Its duplicated puff symbols explain placement; they are not an instruction to build a wreath of identical smoke balls. It has less surface detail than the concept deliberately. Its theme colors are diagram colors, not exact production color samples.

Use an elevated three-quarter camera as the demo presentation assumption, framed to show the whole dome, airborne debris and crack tips. This is not a promise of identical card volume from every viewpoint. Keep the effect on flat ground for this version. A neutral background must separate dark smoke from the environment.

Approved overall scale, assuming one Unity unit equals one meter:

- Smoke envelope radius R = 2 m; approximately 4 m across and 2 m tall at full expansion.
- Central bright region about 0.5R across, low near the origin; do not interpret this as a white sphere.
- Farthest impact extent approximately 2.8 m from the origin.
- Surface crack extent approximately 3 m from the origin.

The back smoke is taller; front smoke remains lower and partly conceals emitter roots. Leave a visible opening to the center during the bright phase. Unequal side shoulders and uneven impact lengths create rhythm while retaining the overall dome. Do not create a mushroom stem, a symmetric starburst as the whole effect, or a long-lived pillar.

## Layer and shape contracts

### L01 / S01 v1 — smoke, the main mass

Build the dome from local puff particles distributed in three-dimensional space, not a texture of the whole explosion. Each puff has a solid irregular silhouette with three to five broad shoulders, shallow concavities, an off-center mass and a width/height ratio around 1.3–1.8. Avoid deep shredded gaps, wispy-only coverage, evenly spaced round balls, or micro-noise as the main texture language.

The puff RGB contains neutral grayscale shading with broad readable value regions. Alpha contains coverage with a soft but controlled boundary. Preserve a substantial mid-value body; do not make every puff a uniform white cutout or a thin transparent edge. Position the brightest shading consistently enough for the demo camera. This is painted volume, not physically correct volumetric lighting.

Inner/lower smoke starts warm orange/red where appropriate, changes through deep red/brown to charcoal, then fades. Outer and upper portions remain darker. Color over Lifetime represents visual aging, not heat simulation. Use spatially different initial colors and particle ages with the same material to avoid tinting the entire cloud uniformly. One tint of one grayscale texture cannot independently create multiple spatial colors inside one puff.

Use native Size, Color, Velocity, Rotation and suitable particle distribution. Puff motion decelerates as the cloud expands. Controlled overlap and rotation should suggest rolling. Do not claim transform animation produces animated internal texture deformation. If this approach cannot achieve the approved rolling appearance, report the visual gap; do not silently replace it with a flipbook or volume mesh.

### L02 / S02A and S02B v1 — impact accents

Texture masks, carried on oriented cards, own the contour. Do not substitute uniform triangular geometry for their drawn shape.

S02A is a thick accent: broad root, offset waist, curved concave shoulder, substantial continuous body and a sharp straight outward tip. Length/width is approximately 2.5–3.5. S02B is a narrow accent with a long leading tip, a tighter waist and a different shoulder contour, approximately 4–6 in length/width. It must not be merely S02A scaled sideways.

Keep the long axis aligned with outward explosion force. Curvature belongs to shoulders and side contours; it must not curl the leading tip away from the radial direction. Mix lengths, thicknesses and angles intentionally. A few accents project beyond the smoke silhouette; their roots remain integrated with the central hot region. Avoid uniformly spaced spikes or parallel duplicated strokes.

Use an orange body and a yellow highlight/tip with separate matched masks/materials. The tip layer follows the same variant, UV registration, pivot and particle pose as its body. It occupies a smaller leading region, not the whole body. Keep the body solid and readable; edges are clean rather than smoke-like. Do not add noise erosion or a dissolve requirement.

### L03 / S03 v1 — central light

Use one local asymmetric soft mask for a small core and a larger soft halo with separate tints and sizes. The contour is a low broad mass, roughly 1.5–2 in width/height, with a few deliberate large protrusions; it is not a regular star. Keep a continuous core, softened boundary and orange surrounding transition.

The small pale-yellow core is the highest value. The halo spreads warmth without washing all smoke or impact bodies to white. Front smoke may occlude roots but must not close the center during its bright phase. No real-time Light or mandatory bloom is included in the plan. Match the reference hierarchy through textures, blending and layering first.

### L04 / S04 v1 — rock debris

Use two compact angular solid meshes with unequal sides, five to seven major contour corners and a tapered end. Faceted surfaces and vertex colors should distinguish illuminated and darker faces. Meshes are justified because the debris rotates and needs changing visible faces.

Distribute sizes and outward ballistic paths irregularly. Larger fragments are sparse; smaller fragments support the motion without becoming a dense spark field. Rocks must remain readable as dark/earthy solids with restrained warm accents, not luminous triangles. Particle gravity and rotation provide motion; do not add Rigidbody, colliders, damage or terrain interaction. Fade fragments before their approved end so none remains permanently.

### L05 / S05 v1 — surface cracks

Use a reusable local branch mask, not a single texture of the whole radial crack layout. A branch follows a broken irregular line, with a thick root, narrowing tip and shorter unequal offshoots. RGB is neutral white; useful coverage is in alpha. Place branches intentionally outward from the origin on flat ground-aligned cards. Their tips extend beyond the smoke footprint.

A dark alpha-blended mark defines the fissure; a separate warm additive layer using the same mask provides brief light close to the source. Reduce the hot component earlier than the dark mark. Do not make the full crack radius equally luminous. No actual terrain displacement, raised slabs or crater is included.

Use native staggered emission and lengthwise growth from a root pivot as the approved initial reveal approach. Width stays controlled. Evaluate whether this reads as spreading rather than stretching or popping. If it cannot meet the visual requirement, document the failure and request a scoped asset/technique delta before adding a shader or controller. Do not silently change approved timing. Flat-ground offset must avoid z-fighting without making marks float visibly. Sloped terrain projection is outside this version.

## Approved timeline

All times are seconds from a single trigger, not per-particle lifetimes that can extend beyond the listed end.

| Layer | Active interval | Behavior |
|---|---|---|
| L03 central light | 0–0.12 | Fast onset, then brightness/opacity decay; no persistent white ball |
| L02 impact | 0–0.45 | Rapid opening, peak around 0.08–0.15, slight further outward motion and fade |
| L01 smoke | 0.03–3.0 | Dome approaches its envelope around 0.25–0.45, then slows, rolls, darkens and fades |
| L04 debris | 0–1.6 | Outward launch, gravity and rotation, then fade completely |
| L05 cracks | 0–2.4 | Spread during the first 0.18; hot light declines early, dark marks persist briefly then fade |

There is no charge, sustained hold or loop. The draft concept is a representative overlap moment, not proof that every layer reaches peak simultaneously. Validate a bright overlap around 0.08–0.12 and a later fully expanded smoke pose around 0.25–0.45. Do not extend the flash to make a later frame resemble the static concept.

Module curves, initial velocities, counts, seeds, exact colors and camera settings remain implementation tunables inside these approved visual/timing boundaries. Document chosen values and units. Do not invent that they were measured from the concept.

## Approved asset plan A01–A07

Create only the following new assets under `Assets/StrongExplosion_v1/`; associated Unity metadata is expected. Do not overwrite source files.

| ID | Files and representation |
|---|---|
| A01 | `Textures/T_SmokePuff.png`, 512x512 RGBA; grayscale RGB shading and alpha coverage; one static local puff |
| A02 | `Textures/T_ImpactBody_2Variants.png` and `Textures/T_ImpactTip_2Variants.png`, each 1024x512 RGBA; two horizontal cells, matching contour/UV/pivot registration |
| A03 | `Textures/T_CenterFlash.png`, 256x256 RGBA; one local soft asymmetric mask reused for core and halo |
| A04 | `Meshes/M_Debris_A.asset` and `Meshes/M_Debris_B.asset`, approximately 24–60 vertices each; faceted solid geometry with vertex colors |
| A05 | `Textures/T_CrackBranch.png`, 512x256 RGBA; one local branch, useful alpha, root pivot |
| A06 | Eight new materials in `Materials/`: `M_Smoke`, `M_ImpactBody`, `M_ImpactTip`, `M_CenterCore`, `M_CenterHalo`, `M_Debris`, `M_CrackDark`, `M_CrackHot` |
| A07 | `Prefabs/VFX_StrongExplosion.prefab`, `Scenes/StrongExplosion_Demo.unity`, and only if needed `Demo/StrongExplosionDemo.cs` plus `Editor/StrongExplosionBuild.cs` |

Totals: five PNGs, two meshes, eight materials, one native-particle prefab, one demo scene, at most two supporting scripts outside the prefab. There is no approved new shader, package, flipbook, shared-asset modification or runtime controller. Group the prefab clearly by Smoke, Impact, Center, Debris and Cracks; multiple emitters may implement spatial roles without creating arbitrary hierarchy clutter.

Reuse built-in shaders already identified in this project. The prior Cannon Unity report resolved `Alpha_Blended.mat` to `Particles/Standard Unlit` and `sub_arrow.mat` to `Mobile/Particles/Additive`, with support at that historical validation. Use transparent Standard Unlit for alpha roles and Mobile/Particles/Additive for additive roles where appropriate. Verify availability, channel behavior, vertex colors and material configuration in the current editor. Do not blindly copy Alpha_Blended settings: its serialized source uses opaque blend/ZWrite settings despite its name. Alpha roles need correct transparent blending and ZWrite off.

Before new production, recheck current candidates across the project. The completed review found:

- `Assets/CannonVFX_LibraryReuse_v1/Sources/Textures/SmokeHarsh.png`: 256x256 with four soft irregular puffs in alpha; sampled alpha 0–233. It is not an empty white mask merely because its RGB preview looks white.
- `Assets/CannonVFX_LibraryReuse_v1/Sources/Textures/cfxr smoke cloud x4.png`: 512x512, four solid rounded alpha variants. Variants are not sequential animation frames. Its contour/value does not automatically satisfy S01.
- `Assets/CannonVFX_LibraryReuse_v1/Sources/Textures/Tx_Burst_directional_03.png`: 3630x4096, multiple directional accent groups and useful alpha; its shapes differ from S02A/B.
- `Assets/CannonVFX_LibraryReuse_v1/Sources/Dependencies/RPG/RPG_VFX/texture/GroundCracks_Radial.png`: 512x512, complete radial layout, alpha sampled constant 255 while R contains the mask. Binding it to an alpha-reading material would show a whole quad. It is not the approved local branch asset.
- `Assets/CannonVFX_LibraryReuse_v1/Sources/Dependencies/RPG/_Game/Resources_moved/Shaders/scroll_XY_Base.shader`: always applies brightness-based dissolve and edge fading, consumes custom TEXCOORD1 data, and multiplies vertex alpha twice. Do not choose it simply because its name includes scrolling.
- `Assets/CannonVFX_LibraryReuse_v1/Sources/Shaders/CFXR_PASSES.cginc`: normal color path reads texture alpha; its SingleChannel path remaps R to alpha. The existing smoke material enables a real dissolve keyword. No such dissolve is required here.
- Only two FBX sources were found; historical import reports give Ant_M_1 512 vertices and Tornado_vertical 35. Their geometry was not directly verified as rock debris. Do not infer suitability from names or bounds.

The new textures/meshes were approved to fill these identified shape/value gaps. Keep that rationale. If current evidence reveals a suitable reusable substitute, show a narrowly scoped plan delta if it changes approved assets or visual behavior. Do not replace all drawing with procedural triangles to claim reuse.

## Texture production and import

Actually draw or generate the approved local component images when production is requested. Use available image generation under its skill rules for missing raster artwork. Do not crop the entire concept into a particle, import blueprint symbols as finished textures, or deliver placeholders as final art. Generate/edit only within the approved component plan.

Use neutral grayscale RGB and genuine alpha coverage as specified. Inspect RGB, R and alpha separately; verify actual shader sampling. Do not assume file extension implies useful alpha, that a generated checkerboard is transparency, or that grayscale RGBA inherently saves memory.

Impact variants use two fixed cells. Select a variant without playing between them. Match the body/tip pair's cell index, anchor, orientation, scale and age. Pad each cell and keep straight-alpha RGB edge colors suitable for filtering. Use clamp and appropriate mip/filter/compression settings after testing. Choose import settings in the actual project color space; record them. Avoid assuming a texture that looks bright in an image viewer will remain readable after tint, blend and compression.

Smoke/impact center/branch images remain reusable local shapes. Emitter placement and native modules create the final layout. No atlas is approved as an animation sequence, so no flipbook keyframe gate applies. Adding animation frames or changing silhouette beyond the approved kit requires a scoped review.

## Native Unity implementation and lifecycle

The prefab owns visuals only. Use native Particle Systems and their modules; leave demo triggering, replay and cleanup orchestration outside the prefab. Configure world-space behavior as needed for a fixed explosion; moving the launch object afterward must not drag the emitted cloud, debris or ground marks.

Keep hit, damage, movement locks, destruction and networking outside this VFX. No gameplay integration has been approved. Terrain cracks do not alter navigation, physics or collision. No camera shake, warning, shockwave ring, spark field, extra fire system or bloom dependency is included.

Ensure stop-and-clear works on all children. Replaying after completion or early cancellation must not retain particles, crack marks, previous emission state or duplicate demo objects. Disable/destroy/despawn cleanup releases only visuals owned by this effect. A pool integration, if the project already has one, must preserve these semantics without adding gameplay state. Do not add a mandatory pooling framework.

All visible particles must be gone by t=3.0 under normal playback. Start delays plus particle lifetimes must respect the layer end times. Demo completion must account for the slowest child. Do not use long root duration as evidence that particles have ended. Test pause/resume under the project's chosen time scale policy and report that policy rather than inventing gameplay timing behavior.

## Visual-to-implementation acceptance mapping

| Visual requirement | Control/asset | Required evidence |
|---|---|---|
| Dome rather than pillar/wreath | S01 contour, spatial puff distribution, size and velocity curves | Three-quarter full-effect frames and playback; compare width/height and front/back mass |
| Low visible bright center with dark surroundings | Small core/halo, smoke placement and independent tints | Frames during 0.08–0.12 with center readable and large dark smoke regions retained |
| Thick/thin radial accents with shaped shoulders | Registered S02A/B body/tip masks, root pivots, orientation | Isolated diagnostic view if needed, then full composite; no uniform triangle spikes |
| Warm-to-charcoal rolling smoke | Grayscale value texture, spatial start colors, lifetime color, rotation/overlap | Playback through expansion and decay; no uniform gray tint or detached bead chain |
| Solid angular airborne debris | Two faceted meshes, vertex colors, ballistic modules | Rotation visible in playback; debris remains stone-like rather than a glow layer |
| Branches spread over intact flat ground | Local branch cards, native delayed growth, dark/hot materials | Ground view across 0–0.18 and late fade; no static whole-layout pop or terrain displacement |
| Everything disappears and replays cleanly | Lifetimes, alpha curves, stop/clear and external demo logic | Completion, early cancel, disable and repeated replay checks |

## Performance and verification

Design for mobile from the start. There is no approved device budget or concurrency target, and no mobile measurement exists. Minimize transparent card area, overdraw, material switches, particle counts, samples and passes while retaining the approved appearance. Two meshes and eight materials do not automatically mean a fixed draw-call count; report actual rendering behavior.

Reuse shared materials between compatible emitters. Do not create a shader per layer. Do not turn on dissolve, soft particles, distortion or dynamic noise without a visual requirement and measured reason. No FPS claim is justified by desktop playback or shader compilation.

Validate in the real Unity project and color space on a neutral ground/background. Capture a sequence or playback plus representative frames around 0.05, 0.10, 0.30, 0.45, 0.80, 1.60, 2.40 and 3.00 seconds. Inspect layers separately only as diagnostics, then evaluate the composite. These are evidence samples, not additional approval gates.

Verify these meaningful cases:

1. Trigger once: correct onset, radial force, dome formation, layer end times, and empty scene after completion.
2. Cancel during the bright phase and during smoke decay: all owned particles and cracks clear.
3. Disable and re-enable, then replay: no stale particles, doubled emitters or persistent marks.
4. Replay several times: timing/scale remain stable and resources do not accumulate.
5. Move the trigger object after emission: fixed world effect remains at its impact point.
6. Inspect mip/filter/compression at demo/game-like sizes: tips, puff bodies and crack branches remain readable without atlas bleeding.

If an authorized Unity executable or capture job is available, use it; do not control desktop UI without authorization. If engine execution is unavailable, report exactly which render/playback checks remain unverified. Do not use compile/lifecycle success as proof of artistic fidelity. Profile CPU/GPU, overdraw, draw calls, particles and texture memory on the actual target device when supplied; until then report desktop observations separately.

## Delivery and correction policy

Deliver the approved files, setup/play instructions, chosen module settings and units, texture briefs/prompts, channel/import settings, reference comparison frames/playback, test results and limitations. Record which assets were new or reused and confirm no source assets were changed.

For any visual mismatch, report the layer/shape ID, intended appearance, observed render, likely cause, scoped correction and resulting evidence. Correct texture/value/distribution issues without changing approved timing or scale to conceal them. Request review only for genuine plan/design deltas, not already approved A01–A07 or each routine layer inspection. Do not claim user artistic approval, mobile budget compliance, or completed engine tests without the corresponding evidence.
