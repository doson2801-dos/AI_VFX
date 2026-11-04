# StrongExplosion v1 — texture production

Built-in imagegen created the raster artwork. No API key or CLI image-generation fallback was used. Sources remain in the conversation's generated_images folder; selected files were copied into Assets/StrongExplosion_v1/Textures. Unity import limits the working resolution; raw generated dimensions are larger than the requested sizes. No pixel-code edits were used to replace the artwork.

| Runtime file | Source image filename | Production brief |
|---|---|---|
| T_SmokePuff.png | exec-9c0f37ea-d711-4596-be32-582cf686ee1b.png | One reusable isolated asymmetric smoke puff, 4 broad unequal lobes, shallow waists, solid core, painted grayscale volume, soft alpha edge, no scene, genuine transparency |
| T_ImpactBody_2Variants.png | exec-7ca4b567-2457-4eb6-9b89-04fe267a8a02.png | Two horizontal independent cells: thick impact with curved shoulder/waist and straight tip; distinct narrow impact with long straight tip. Neutral grayscale, solid body, soft root, genuine transparency; not sequential animation |
| T_ImpactTip_2Variants.png | exec-ca6d85bb-e115-4a62-a7c1-6e3ec2319c6a.png | Edit of the body atlas: preserve canvas, positions, scale and contours, retain upper regions and fade lower body to transparency; registered highlight-only companion |
| T_CenterFlash.png | exec-dc884c84-eede-4c23-99d0-3474ee2eb62e.png | One low wide asymmetric light mask, small bright core, broad grayscale transition to soft transparent perimeter, no regular star or scene |
| T_CrackBranch.png | exec-384c57c7-3961-4b6c-b494-1fd77291d857.png | One local horizontal branching fissure, thick left root, irregular bends and tapering right tip, short unequal offshoots, white/grayscale with genuine alpha; no ground or full radial layout |

Read-only sampled channel inspection found alpha 0–254 or 0–255 and RGB values up to 255 for all five files. This establishes nonconstant alpha, not artistic success. Imported textures use FromInput alpha, transparent-edge handling, clamp, bilinear filtering and mipmaps. The initial desktop review uses uncompressed import to isolate shape/blend issues; mobile format/compression and device performance remain unmeasured.

Source dimensions: smoke/flash 1254x1254; body/tip/crack 1774x887. Import uses nearest-power-of-two plus max sizes: smoke 512, flash 256, impacts 1024, crack 512. The .meta files record actual settings. No new shader was created.
