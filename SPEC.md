# SPEC.md: Mục tiêu dự án

## Mục tiêu
Thư viện VFX cho Unity (Built-in + URP), dùng lại được trong game. Mỗi effect là một prefab chạy được ngay, đúng định hướng mỹ thuật của art lead.

## Phạm vi
- Effect dạng particle + texture (`/vfx-maker`), bằng code (`/vfx-code`), cần shader (`/vfx-shader`).
- Thành phần chuẩn (Impact / Glow / Ring / Sparks / Dust) + auto mix cho đòn trúng / nổ.
- Công cụ review không cần Unity: Review Lab, Shape Lab, Mix Lab.

## Một effect được coi là "xong" khi
1. Đã chốt không gian (ngữ cảnh, mặt phẳng, camera, neo, quy mô) với art lead.
2. Có prefab `Assets/VFX/<Tên>/Prefabs/VFX_<Tên>.prefab`, dựng bằng build script (dựng lại được).
3. Có preview / GIF trong `Docs/VFX/<Tên>/` và đã đưa lên Review Lab.
4. Đã thêm vào danh sách `Included` của `VfxShowcaseBuild.cs` và build lại scene Showcase.
5. Khác các effect đã có ở ít nhất hai điểm: mesh, bố cục, timing hoặc lớp phụ.
6. `PROGRESS.md` và `MAP.md` đã cập nhật.

## Kế hoạch / tiến độ
Xem `Docs/VFX/_ArtDirection/PROGRESS.md`. Dự án dùng file đó thay cho PLAN.md.
