# Assets/Library — bản đồ chọn texture (2026-11-09)

Cây hiện tại do art lead chia lại: `Assets/Library/<nhóm>/<vai trò>/<nhóm>_<vai trò>_NNN.png`. Tên thư mục con là **vai trò** của ảnh. Ánh xạ tên cũ → mới và nguồn gốc: `Docs/VFX/_Library/library_index.csv` (bảng cũ `classify.csv` là đời trước). Thành phần của các effect đã làm: `components_by_effect.md`.

Cách chọn: tìm dòng thành phần trong bảng → mở thư mục (vai trò) → **xem ảnh (Read PNG)** vài ứng viên → chọn, ghi đường dẫn + lý do vào kế hoạch. Nhiều ảnh cùng vai trò thì chọn theo dáng và độ sắc trong brief. Không có hình hợp mới tạo (nói lý do). File dùng chung: chỉ `LoadAssetAtPath`, không đổi import setting.

*Cột "vai trò" suy từ tên thư mục và `components_by_effect.md`; chưa xem từng ảnh. Nếu một thư mục chứa ảnh sai vai trò, báo art lead rồi sửa bảng này.*

| Thành phần cần | Thư mục | Ghi chú |
|---|---|---|
| Vệt chém chạy UV trên mesh (`_MainTex` slash) | `Slash/Main_tex(Uvmesh)` (18) | ảnh xám; xem `vfx-shader/references/coloso.md` |
| Vệt / hiệu ứng trúng đòn của slash | `Slash/Onhit` (14) | |
| Chớp lúc bắt đầu, quầng sáng, lõi sáng, tàn lửa | `glow/soft_round` (36), `soft_oval`, `soft_shape` | additive, nằm đất hoặc billboard |
| Flare, sao chớp, chớp gai nhọn | `glow/flare` (9), `impact/flash_spiky` (12) | |
| Quầng nhỏ / halo | `glow/halo` (3) | |
| Impact flipbook (nổ, chớp nhiều khung) | `impact/flipbook` (17) | Frame over Time tuyến tính |
| Vòng sóng nổ lan | `impact/radial_ring` (5), `ring/thin` (13), `ring/soft` (17) | nằm đất: Billboard + Local |
| Vòng chạy UV trên mesh vòng | `ring/Uv_mesh` (19) | |
| Vòng rách, vòng xoáy, vòng flipbook | `ring/ragged`, `ring/swirl`, `ring/flipbook` | |
| Mảnh vỡ / shard impact | `impact/shard` (2), `spark/shard` (2) | |
| Vòng rune / vòng phép | `rune/circle` (9) | vẽ bằng script cũng được (luật hình học) |
| Nứt đất toả tròn / vệt nứt / chữ X | `ground/crack_radial` (13), `crack_line` (15), `crack_x` (3) | nằm đất |
| Vết cháy, vết bắn, dấu chỉ vùng | `ground/scorch` (3), `splat` (5), `indicator` (4) | |
| Tia sét: sheet nhiều khung / đơn / cung điện | `lightning/bolt_sheet` (8), `arc_sheet` (7), `arc_single` (1) | Stretched, additive |
| Khói mềm (mặc định `Assets/VFX/fx_t_smoke_02.png`) | `smoke/soft` (6) | luật khói mặc định vẫn giữ |
| Khói / lửa flipbook, khói cartoon | `smoke/sheet` (20), `smoke/cartoon` (7) | khói vụ nổ làm theo Erode Sphere, không dùng ảnh |
| Tia lửa, sao nhỏ, vệt sao chổi, chấm sáng | `spark/star` (20), `streak` (7), `dot_sheet` (2) | |
| Vệt đuôi, dải, ribbon | `trail/ribbon` (15), `streak` (12), `band` (1), `beam/` (1) | |
| Nước: văng, bọt, vệt, ô lát | `water/splash` (11), `bubble` (4), `tile` (7) | |
| Noise tan (dissolve) / nhiễu mịn | `noise/cloud` (25), `noise/cell` (28) | |
| Noise sọc dọc theo vệt, thân cầu lửa | `noise/streak` (14), `noise/dash` (3) | |
| Noise méo UV / cuộn gió | `noise/swirl` (8) | |
| Noise điện / mạng điện | `noise/electric_web` (6) | |
| Noise mép cứng (cutout) | `noise/hard_edge` (6) | |
| Noise đóng gói kênh RGB | `noise/packed_rgb` (6) | xem tornado.md |
| `_MaskTex` gradient 1D | `mask/gradient` (8) | slash: `T_VFX_Gradient_01` |

`_review/` là thư mục tạm chờ phân loại: không dùng.
