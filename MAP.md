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

| Đường dẫn | Chứa gì |
|---|---|
| `Assets/VFX/<Tên>/` | **Sản phẩm (livrables)**: mỗi effect một thư mục: `Prefabs/`, `Textures/`, `Materials/`, `Scripts/`. |
| `Assets/VFX/_Showcase/` | Scene chung `VFX_Showcase.unity` + UI chuyển effect (`VfxShowcase.cs`, `VfxShowcaseBuild.cs`). |
| `Assets/VFX/_Components/` | Thành phần chuẩn để mix: Impact / Glow / Ring / Sparks / Dust. |
| `Assets/VFX/Mixes/` | Effect đã mix từ thành phần. |
| `Assets/VFX/_Kit/` | Build kit dùng chung (`VfxBuildKit`, `ComponentKit`). |
| `Assets/VFX/_Shared/` | Shader dùng chung (`VfxShaderLib.cginc`), noise texture. |
| `Assets/VFX/_Imported/` | Asset nhập: `Mesh/` (55 `SM_VFX_*`), `RpgGame/` (shader Coloso…). |
| `Assets/VFX/_VfxCode/` | Builder của skill `vfx-code`. |
| `Assets/shader_water/` | Shader nước (riêng). |
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
| `Docs/VFX/SHADERS.md` | Danh mục shader: kiểm tra trước khi viết shader mới. |
| `Docs/CannonLibraryAudit_v1/` | Kiểm kê thư viện Cannon VFX (có bản project Unity kiểm thử). |
| `Docs/StrongExplosion/`, `Docs/Meteor/`, `Docs/Models/`, `Docs/blender-mcp/` | Tài liệu từng chủ đề riêng. |

## Không đưa lên git

`Library/`, `Temp/`, `Logs/`, `obj/`, `.vs/`, `UserSettings/`, `*.csproj`, `*.sln`, texture / prefab / mesh / material / scene (chỉ ở máy này), `.env`, `CLAUDE.local.md`.

## Ảnh rời ở gốc

`tread_ring*.png`, `tread_strip.png`: ảnh thử vết bánh xích (2026-10-23), chưa có thư mục.
