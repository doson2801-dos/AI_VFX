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
| `.gitignore` | Chỉ cho tài liệu + code lên git (whitelist). |

## Unity

- `Assets/VFX/ThunderChainImpact/`: effect mới độc lập + prefab hit và scene sét lan 3 mục tiêu; builder riêng và controller chỉ trong scene demo. `Docs/VFX/ThunderChainImpact/`: ghi chú, contact sheet chọn hình, preview/Frames, báo cáo và QAProject tạm (không Git).
- `Docs/VFX/ThunderChainImpact/make_preview.py`: ghép render Unity thành GIF và trang timeline `Preview.html` độc lập; `contexte/thunder-chain-impact.md`: phạm vi yêu cầu không dùng skill.

- `Assets/VFX/ThunderImpact/`: ThunderImpact ba nhịp vàng–trắng; builder, 4 material, prefab native và scene demo. `Docs/VFX/ThunderImpact/`: plan v1 đã duyệt, build log/report, preview và playback. `contexte/thunder-impact.md`: phạm vi đã chốt.
- `Docs/VFX/ThunderImpact/Review.html`, `QA.md`: Review Lab riêng và kết quả kiểm thử; `QAProject/` là project render tạm độc lập, loại khỏi Git bằng `.gitignore` cùng thư mục.

| Đường dẫn | Chứa gì |
|---|---|
| `Assets/VFX/<Tên>/` | **Sản phẩm (livrables)**: mỗi effect một thư mục: `Prefabs/`, `Textures/`, `Materials/`, `Scripts/`. |
| `Assets/VFX/_Showcase/` | Scene chung `VFX_Showcase.unity` + UI chuyển effect (`VfxShowcase.cs`, `VfxShowcaseBuild.cs`).  Môi trường thực tế (trời hoàng hôn, nắng + bóng, sương, đất, sàn đá, đá tảng, cột vỡ) do `VfxShowcaseEnvironment.cs` dựng; texture / mesh sinh tự động ở `_Showcase/Textures`, `/Meshes`, `/Materials`. Ảnh xem thử: `Docs/VFX/_Showcase/env_*.png`. |
| `Assets/VFX/_Components/` | Thành phần chuẩn để mix: Impact / Glow / Ring / Sparks / Dust. |
| `Assets/VFX/Mixes/` | Effect đã mix từ thành phần. |
| `Assets/VFX/_Kit/` | Build kit dùng chung (`VfxBuildKit`, `ComponentKit`). |
| `Assets/VFX/_Shared/` | Shader dùng chung (`VfxShaderLib.cginc`), noise texture. |
| `Assets/VFX/_Imported/` | Asset nhập: `Mesh/` (55 `SM_VFX_*`), `RpgGame/` (shader Coloso…). |
| `Assets/VFX/_VfxCode/` | Builder của skill `vfx-code`. |
| `Assets/VFX/LightningStrike/`, `ThunderSpear/`, `LightningTrail/`, `AuraGauntlet/` | 4 VFX điện (builder trong `Editor/`, menu `VFX/<Tên>/Build`), học từ rpg-game; số liệu: `.claude/skills/vfx-shader/references/thunder-core.md` và `lightning-set.md`. |
| `Assets/VFX/GroundBlast/`, `MushroomBlast/` | Nổ tại đất stylized; khói = khối cầu ăn mòn `VFX/FX/Erode Sphere` (luật khói vụ nổ). MushroomBlast: cột + đầu nấm + vành đất, texture từ `Assets/Library/`. Kế hoạch ở `Docs/VFX/<Tên>/Plan.md`. |
| `Assets/VFX/_Imported/RpgAura/` | Bản copy `VFX_Aura_Gauntlet_Prismatic` của rpg-game (hiện hồng: Shader Graph URP), để đọc setup. |
| `Assets/VFX/_Imported/RpgThunder/` | Bản copy 100% `VFX_BossRaid_Knight_Thunder` của rpg-game (tham chiếu, giữ GUID gốc). |
| `Assets/VFX/_Imported/RpgGame/Lightning/` | Texture + mesh điện nhập từ rpg-game (Guardian_Lightning3, Gradient_lightning, sheet cung điện, nứt đất…). |
| `Assets/VFX/_Kit/Editor/VfxLightningKit.cs`, `_Kit/Runtime/VfxPathMover.cs` | Helper cho effect điện; mover cho effect có vệt (showcase). |
| `Docs/VFX/_Reference/rpg-game_Thunder/` | Ảnh render mẫu rpg-game (Thunder, Spear, Trail). |
| `Assets/shader_water/` | Shader nước (riêng). |
| `Assets/Library/` | Thư viện texture VFX đã phân loại (bản **sao chép** từ rpg-game + project, GUID mới): `decals/ glow/ impact/ Lightnings_Electrics/ noise/ Slash/ smoke/ trail/ water/ wave/`. Tên file `<thư mục>_NNN` (đã soát bằng mắt). Bảng nguồn → đích + tên cũ: `Docs/VFX/_Library/classify.csv`. |
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

## Ảnh rời ở gốc

`tread_ring*.png`, `tread_strip.png`: ảnh thử vết bánh xích (2026-10-23), chưa có thư mục.
