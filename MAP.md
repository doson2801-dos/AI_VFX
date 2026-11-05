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
| `Assets/VFX/_Imported/RpgAura/` | Bản copy `VFX_Aura_Gauntlet_Prismatic` của rpg-game (hiện hồng: Shader Graph URP), để đọc setup. |
| `Assets/VFX/_Imported/RpgThunder/` | Bản copy 100% `VFX_BossRaid_Knight_Thunder` của rpg-game (tham chiếu, giữ GUID gốc). |
| `Assets/VFX/_Imported/RpgGame/Lightning/` | Texture + mesh điện nhập từ rpg-game (Guardian_Lightning3, Gradient_lightning, sheet cung điện, nứt đất…). |
| `Assets/VFX/_Kit/Editor/VfxLightningKit.cs`, `_Kit/Runtime/VfxPathMover.cs` | Helper cho effect điện; mover cho effect có vệt (showcase). |
| `Docs/VFX/_Reference/rpg-game_Thunder/` | Ảnh render mẫu rpg-game (Thunder, Spear, Trail). |
| `Assets/shader_water/` | Shader nước (riêng). |
| `Assets/Library/` | Thư viện texture VFX đã phân loại (bản **sao chép** từ rpg-game + project, GUID mới): `decals/ glow/ impact/ Lightnings_Electrics/ noise/ Slash/ smoke/ trail/ water/ wave/`. Tên file `<thư mục>_NNN` (đã soát bằng mắt). Bảng nguồn → đích + tên cũ: `Docs/VFX/_Library/classify.csv`. |
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
| `Docs/VFX/_Library/` | Script phân loại texture (`classify.py`, chạy thử mặc định, `--apply` để chép) + bảng kết quả `classify.csv`. |
| `Docs/VFX/SHADERS.md` | Danh mục shader: kiểm tra trước khi viết shader mới. |
| `Docs/CannonLibraryAudit_v1/` | Kiểm kê thư viện Cannon VFX (có bản project Unity kiểm thử). |
| `Docs/StrongExplosion/`, `Docs/Meteor/`, `Docs/Models/`, `Docs/blender-mcp/` | Tài liệu từng chủ đề riêng. |

## Không đưa lên git

`Library/`, `Temp/`, `Logs/`, `obj/`, `.vs/`, `UserSettings/`, `*.csproj`, `*.sln`, texture / prefab / mesh / material / scene (chỉ ở máy này), `.env`, `CLAUDE.local.md`.
