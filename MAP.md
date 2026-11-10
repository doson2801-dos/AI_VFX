# MAP.md: Bản đồ dự án VFX_LIb

Đọc file này cùng `CLAUDE.md` ở đầu mỗi hội thoại. **Tạo / di chuyển / xoá file thì cập nhật dòng tương ứng ở đây.**

## Harness (khung làm việc cho Claude)

| Đường dẫn | Chứa gì |
|---|---|
| `CLAUDE.md` | Dự án là gì, skill, công cụ, quy tắc chính. Đọc đầu tiên. |
| `CLAUDE.local.md` | Sở thích cá nhân trên máy này. Không commit. |
| `AGENTS.md` | Quy tắc chung cho mọi agent / subagent / phiên song song. |
| `SPEC.md` | Mục tiêu, phạm vi, tiêu chí "xong" của thư viện VFX. |
| `MAP.md` | File này. |
| `contexte/` | Những gì đã học được về dự án, mỗi chủ đề một file (xem `contexte/README.md`). |
| `.claude/rules/` | Luật cứng của art lead, tự nạp vào mọi phiên. |
| `.claude/skills/` | Skill dự án: `vfx-maker`, `vfx-code`, `vfx-shader`. |
| `.claude/settings.local.json` | Quyền riêng máy (không commit). `settings.json` (quyền dùng chung) chưa tạo. |
| `.claude/launch.json` | Server xem web: `shape-lab` (8765), `review-lab` (8776). |
| `.mcp.json` | Công cụ kết nối: Blender MCP. |
| `.worktreeinclude` | File không có trong git nhưng cần chép theo mỗi worktree. |
| `.gitignore` | Chỉ cho tài liệu + code lên git (whitelist). Từ 2026-11-04 chỉ commit kiến thức + skill + `.md` (xem `CLAUDE.md`). |
| `tools/auto_commit.ps1` | Auto-commit 17:30 hằng ngày (Task Scheduler `VFX_LIb Auto Commit`), chỉ phạm vi kiến thức / skill / `.md`; log `tools/auto_commit.log`. Không lên git. |

## Unity

- **Dọn 2026-11-05 (art lead):** `Assets/` chỉ còn effect có trong scene Showcase + phần dùng chung. Đã xoá (vào Thùng rác Windows): `Assets/StrongExplosion_v1`, `Assets/Scenes`, `Assets/_Game`, `Assets/VFX/{BombBlast_Shader, CodeShockwaveGround, CodeSparkBurst, Explosion, FireStylized, FireballImpact, FireballLoop, FireballProjectile, Lightning_Impact, Lightning_Strike, Meteor, SmokeStylized, StylizedSlash, ThunderChainImpact, ThunderImpact, Shaders}`, 5 Mix cũ, `smoke.mat`, ảnh `tread_*.png` ở gốc. Tài liệu của chúng trong `Docs/VFX/` (kể cả `ThunderImpact/`, `ThunderChainImpact/`) và `contexte/` vẫn giữ; builder của ThunderImpact / ThunderChainImpact còn trong git (commit `b23b0b6`).

| Đường dẫn | Chứa gì |
|---|---|
| `Assets/VFX/<Tên>/` | **Sản phẩm (livrables)**: mỗi effect một thư mục: `Prefabs/`, `Textures/`, `Materials/`, `Scripts/`. |
| `Assets/VFX/_Showcase/` | Scene chung `VFX_Showcase.unity` + UI chuyển effect (`VfxShowcase.cs`, `VfxShowcaseBuild.cs`).  Môi trường thực tế (trời hoàng hôn, nắng + bóng, sương, đất, sàn đá, đá tảng, cột vỡ) do `VfxShowcaseEnvironment.cs` dựng; texture / mesh sinh tự động ở `_Showcase/Textures`, `/Meshes`, `/Materials`. Ảnh xem thử: `Docs/VFX/_Showcase/env_*.png`. Build Scene chỉ thêm effect mới, giữ setup; bản sao scene tự lưu ở `_Showcase/Scenes/_Backup/` (5 bản gần nhất). Đèn demo (chỉ lúc Play trong Showcase, không trong prefab): bảng trong `Runtime/VfxShowcaseLights.cs`. |
| `Assets/VFX/_Components/` | Thành phần chuẩn để mix: Impact / Glow / Ring / Sparks / Dust. |
| `Assets/VFX/Mixes/` | Effect đã mix từ thành phần: `IceSpike_Impact`, `LightningStrike_Ground`, `LightningStrike_Impact`, `_Palettes`. |
| `Assets/VFX/fx_t_smoke_02.png` | Texture khói mặc định (luật art lead ghi cứng đường dẫn này, không dời). |
| `Assets/VFX/_Kit/` | Build kit dùng chung (`VfxBuildKit`, `ComponentKit`). |
| `Assets/VFX/_Shared/` | Shader dùng chung (`VfxShaderLib.cginc`, `SH_VFX_*`, `VFX_ArrowGlow` dời từ `VFX/Shaders` ngày 2026-11-05), noise texture. |
| `Assets/VFX/_Imported/` | Asset nhập: `Mesh/` (55 `SM_VFX_*`), `RpgGame/` (shader Coloso…). |
| `Assets/VFX/_VfxCode/` | Builder của skill `vfx-code`. |
| `Assets/VFX/LightningStrike/`, `ThunderSpear/`, `LightningTrail/`, `AuraGauntlet/` | 4 VFX điện (builder trong `Editor/`, menu `VFX/<Tên>/Build`), học từ rpg-game; số liệu: `.claude/skills/vfx-shader/references/thunder-core.md` và `lightning-set.md`. |
| `Assets/VFX/GroundBlast/`, `MushroomBlast/` | Nổ tại đất stylized; khói = khối cầu ăn mòn `VFX/FX/Erode Sphere` (luật khói vụ nổ). MushroomBlast: cột + đầu nấm + vành đất, texture từ `Assets/Library/`. Kế hoạch ở `Docs/VFX/<Tên>/Plan.md`. |
| `Assets/VFX/FireballThrow/` | Cầu lửa ném vòng cung 8 m / 0.8 s rồi nổ tại chân mục tiêu (2026-11-05). Một prefab tự chạy: hạt thân vẽ cung, chết khi chạm thì kích lớp nổ (sub-emitter Death). Builder `Editor/FireballThrowBuild.cs` (menu `VFX/FireballThrow/Build`), kế hoạch `Docs/VFX/FireballThrow/Plan.md`. |
| `Assets/VFX/VioletThunder/` | Sét tím-hồng đánh xuống đất (2026-11-05): tích điện 0.4 s → tia toon (sheet `Lightnings_Electrics_026` cắt lại nằm ngang + bản viền mờ) + chớp + impact đất (vùng sáng, sao gai, 2 vành sóng) + dòng điện bò tồn ~1.4 s (`_020`). Builder `Editor/VioletThunderBuild.cs` (menu `VFX/VioletThunder/Build`), kế hoạch `Docs/VFX/VioletThunder/Plan.md`. |
| `Assets/VFX/WindTornado/` | Lốc xoáy gió 3,6 m (v3, 2026-11-06): làm lại layer theo layer từ `Stupid_Tornado_Projectile` của rpg-game: vành gió `fbx_fx_cylinder_03` + Shader Graph `Fx_dissolve_particle_apb` trên sheet đóng gói kênh, ống `Tornado_vertical`, cột sương, sương chân, khói, vụn. Builder `Editor/WindTornadoBuild.cs` (menu `VFX/WindTornado/Build`); kế hoạch + ảnh / dump bản gốc `Docs/VFX/WindTornado/`. Mesh `SM_VFX_WindBand_*` (v1) không còn dùng. Chưa vào `Included`. |
| `Assets/VFX/FireTornado/` | Lốc lửa 4,5 m (2026-11-06): thân = một phễu `tornado_mesh` + shader Thrust tông ấm, dải lửa dựng đứng (Graph, sheet ô 6) leo lên thân, lửa chân, tàn lửa + đợt bắn khi sụp, khói nhiệt, quầng cháy đất. Làm bằng quy trình `vfx-shader/references/tornado.md`, không có prefab tham chiếu. Builder `Editor/FireTornadoBuild.cs` (menu `VFX/FireTornado/Build`), kế hoạch `Docs/VFX/FireTornado/Plan.md`. Đã thêm vào `Included` của Showcase. |
| Biến thể 2026-11-09 | Mỗi loại trong Showcase có 2 biến thể mới (20 prefab), builder ở `Assets/VFX/<Loại>/Editor/<Loại><Biến thể>Build.cs` (menu `VFX/<Loại>/Build <Biến thể>`), prefab `VFX_<Loại>_<Biến thể>`, kế hoạch `Docs/VFX/<Loại>/Plan_Variants.md`. Slash360: Fire, Water; IceSpikeFan: Magma, Thorn; HealCircle: Holy, Nature; LightningStrike: Toxic, Frost; ThunderSpear: Frost, Flame; LightningTrail: Flame, Wind; AuraGauntlet: Fire, Poison; FireballThrow: Poison, Frost; VioletThunder: Crimson, Azure; FireTornado: Frost, Sand. **Chưa build / chưa compile trong Unity.** Kit phụ: `Slash360VariantKit.cs`, `IceSpikeVariantKit.cs`. |
| `Assets/VFX/_Imported/RpgAura/` | Bản copy `VFX_Aura_Gauntlet_Prismatic` của rpg-game (hiện hồng: Shader Graph URP), để đọc setup. |
| `Assets/VFX/_Imported/RpgTornado/` | Bản copy `VFX_Book_Tornado` + `Stupid_Tornado_Projectile` (mesh / sheet texture dùng bởi WindTornado v3) của rpg-game + mesh / shader Thrust / texture (GUID gốc; copy bằng `tools/py/copy_closure.py`). Lớp gốc dùng Shader Graph URP nên hiện hồng. |
| `Assets/VFX/ElectricBolt/` | Tia điện nối A→B (2026-11-09): tay → ngực 8 m, một phát ~0.45 s, xanh-trắng toon, **hoàn toàn code + shader, không texture** (v2): shader mới `_Shared/Shaders/SH_VFX_ElectricBolt` (tia gấp khúc từ hash) + `SH_VFX_GlowStar` (chớp / sao), dùng lại `SH_VFX_Spark`. Builder `Editor/ElectricBoltBuild.cs` (menu `VFX/ElectricBolt/Build`). Tài liệu `Docs/VFX/ElectricBolt/` (`Research.md`, `Plan.md`); cách làm lưu vào skill `vfx-code` (`references/electric-bolt.md`, `assets/shaders/`, `assets/ElectricBoltBuild.example.cs`). Đã build v2, art lead duyệt, có trong `Included` + đèn demo Showcase. |
| `Assets/VFX/WindShellTrail/` | Trail gió cyan sau vật bay (2026-11-09, từ ảnh boomerang của art lead): vỏ cầu sóng mỗi 1.2 m bằng 2 lớp Billboard 2D (`ring_soft_004` bong bóng + `ring_soft_010` lưỡi liềm) + 2 ribbon gió (Trails Ribbon, `trail_ribbon_001/009`) + quầng lõi + sương; World space, root có `VfxPathMover`. Builder `Editor/WindShellTrailBuild.cs` (menu `VFX/WindShellTrail/Build`), kế hoạch `Docs/VFX/WindShellTrail/Plan.md`. Chỉ shader Additive mobile. v2 chưa build. |
| `Assets/VFX/_Imported/RpgThunder/` | Bản copy 100% `VFX_BossRaid_Knight_Thunder` của rpg-game (tham chiếu, giữ GUID gốc). |
| `Assets/VFX/_Imported/RpgGame/Lightning/` | Texture + mesh điện nhập từ rpg-game (Guardian_Lightning3, Gradient_lightning, sheet cung điện, nứt đất…). |
| `Assets/VFX/_Kit/Editor/VfxLightningKit.cs`, `_Kit/Runtime/VfxPathMover.cs` | Helper cho effect điện; mover cho effect có vệt (showcase). |
| `Docs/VFX/_Reference/rpg-game_Thunder/` | Ảnh render mẫu rpg-game (Thunder, Spear, Trail). |
| `Assets/shader_water/` | Shader nước (riêng). |
| `Assets/Library/` | Thư viện texture VFX đã phân loại (bản **sao chép** từ rpg-game + project, GUID mới): `decals/ glow/ impact/ Lightnings_Electrics/ noise/ Slash/ smoke/ trail/ water/ wave/`. Tên file `<thư mục>_NNN` (đã soát bằng mắt). **Đã chia lại theo vai trò (2026-11-06, art lead tự chỉnh thêm):** `Slash/{Main_tex(Uvmesh),Onhit} glow/ spark/ impact/ ring/ lightning/ ground/ rune/ beam/ smoke/ noise/ mask/ trail/ water/`, mỗi thư mục con chứa ảnh tên `<cha>_<con>_NNN` (ví dụ `glow/soft_round/glow_soft_round_001.png`). Tra ngược tên cũ / tên gốc / nguồn: `Docs/VFX/_Library/library_index.csv`; bảng đổi tên: `rename_manifest.csv`, `reorganize_manifest.csv` (script `reorganize.py`, `rename_library.py`, đều có `--undo`). CLAUDE.md / luật / 3 skill đã trỏ cây mới (2026-11-09); **build script C# cũ trong Assets có thể còn trỏ đường dẫn cũ**. Bản đồ chọn texture: `Docs/VFX/_Library/LIBRARY.md`. Bảng nguồn → đích + tên cũ: `Docs/VFX/_Library/classify.csv`. |
| `Assets/VFX/_Generated/ComfyUI/` | Texture tạo bằng ComfyUI MCP (Qwen Image 2.1), chưa đưa vào Library. Bản gốc ở `D:\GameProjects\VFX_LIb\`. `T_Impact_ComfyUI_01.png`: chớp impact xám trên nền đen (additive), 1024²; `_02`: bản 4 tia hình chữ thập (sửa từ `_01`); `_06`: 4 tia lệch, dài ngắn và góc khác nhau (ảnh ComfyUI `_04` đã xoá bớt 1 tia bằng script). |
| `Packages/`, `ProjectSettings/` | Cấu hình Unity. |

## Tài liệu

| Đường dẫn | Chứa gì |
|---|---|
| `Docs/VFX/_ArtDirection/PROGRESS.md` | **Trạng thái công việc / kế hoạch**: đọc trước khi làm VFX. |
| `Docs/VFX/_ArtDirection/` | Định hướng mỹ thuật, tools (Shape Lab), scripts, `_archive/` (bản lưu skill cũ). |
| `Docs/VFX/<Tên>/` | Plan, preview, GIF, BuildReport của từng effect. |
| `Docs/VFX/_Recipes/` | Recipe mix (json). |
| `Docs/VFX/_Components/` | Ảnh / dữ liệu chụp thành phần. |
| `Docs/VFX/_Review/` | Review Lab sinh ra (`index.html`). Không commit. |
| `Docs/VFX/_Tasks/` | Bảng giao việc vẽ texture (`VFX_Texture_Tasks.xlsx`, 2026-11-09): Impact đất / không, Bolt-Electric/Lightning, Shockwave; kéo vào Google Drive để thành Google Sheet. |
| `tools/py/` | Script phụ: `copy_closure.py` (copy prefab + phụ thuộc theo GUID), `RefRender.cs.txt` (bản sao của `vfx-shader/assets/RefRender.example.cs`). Bản chính thức nằm trong skill `vfx-shader`. |
| `tools/paseo-sdk/` | Gọi Claude bằng code. Mặc định gọi thẳng máy chủ API nội bộ: `gateway.mjs` (thư viện, stream), `ask.mjs`, `chat.mjs` (~1 s). Qua Paseo (`@getpaseo/client`, cần app mở): `paseo-ask.mjs`, `paseo-chat.mjs`, `providers.mjs`, `bench-reuse.mjs`, `check-default.mjs`, `fix-agent-models.mjs` (đổi agent dùng tên model sai sang tên máy chủ nhận). Xem `README.md` (gồm cấu hình model của app Paseo). |
| `Docs/VFX/_Library/` | Script phân loại texture (`classify.py`, chạy thử mặc định, `--apply` để chép) + bảng kết quả `classify.csv` + `LIBRARY.md` (bản đồ thành phần → thư mục Library, 2026-11-09) + `components_by_effect.md` (thành phần texture của từng effect trong Showcase, 2026-11-06, làm cơ sở chia lại Library). |
| `Docs/VFX/SHADERS.md` | Danh mục shader: kiểm tra trước khi viết shader mới. |
| `Docs/CannonLibraryAudit_v1/` | Kiểm kê thư viện Cannon VFX (có bản project Unity kiểm thử). |
| `Docs/StrongExplosion/`, `Docs/Meteor/`, `Docs/Models/`, `Docs/blender-mcp/` | Tài liệu từng chủ đề riêng. |

## Không đưa lên git

`Library/`, `Temp/`, `Logs/`, `obj/`, `.vs/`, `UserSettings/`, `*.csproj`, `*.sln`, texture / prefab / mesh / material / scene (chỉ ở máy này), `.env`, `CLAUDE.local.md`.
