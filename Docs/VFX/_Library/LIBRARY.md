# Assets/Library — bản đồ chọn texture (2026-11-09)

Cây hiện tại do art lead chia lại: `Assets/Library/<nhóm>/<vai trò>/<nhóm>_<vai trò>_NNN.png`. Tên thư mục con là **vai trò** của ảnh. Ánh xạ tên cũ → mới và nguồn gốc: `Docs/VFX/_Library/library_index.csv` (bảng cũ `classify.csv` là đời trước). Thành phần của các effect đã làm: `components_by_effect.md`.

Cách chọn: tìm dòng thành phần trong bảng → mở thư mục (vai trò) → **xem ảnh (Read PNG)** vài ứng viên → chọn, ghi đường dẫn + lý do vào kế hoạch. Nhiều ảnh cùng vai trò thì chọn theo dáng và độ sắc trong brief. Không có hình hợp mới tạo (nói lý do). File dùng chung: chỉ `LoadAssetAtPath`, không đổi import setting.

*Cột "vai trò" suy từ tên thư mục và `components_by_effect.md`; chưa xem từng ảnh. Nếu một thư mục chứa ảnh sai vai trò, báo art lead rồi sửa bảng này.*

| Thành phần cần | Thư mục | Ghi chú |
|---|---|---|
| Vệt chém chạy UV trên mesh (`_MainTex` slash) | `Slash/Main_tex(Uvmesh)` (18) | ảnh xám; xem `vfx-shader/references/coloso.md` |
| Vệt / hiệu ứng trúng đòn của slash | `Slash/Onhit` (14) | |
| Chớp lúc bắt đầu, quầng sáng, lõi sáng, tàn lửa | `glow/soft_round` (36), `soft_oval`, `soft_shape` | additive, nằm đất hoặc billboard |
| Flare, sao chớp, chớp gai nhọn | `glow/flare` (10), `impact/flash_spiky` (14) | `flare_010` sao 4 cánh mảnh dài; `flash_spiky_013` hàng gai dựng đứng, `_014` sao 8 gai quầng mềm (từ `Impact_Ground.psd`, 2026-11-10) |
| Quầng nhỏ / halo | `glow/halo` (3) | |
| Impact flipbook (nổ, chớp nhiều khung) | `impact/flipbook` (20) | Frame over Time tuyến tính. `020`, `021` = 2×2 (lưỡi cong, mũi V); `022` = 4×2 ảnh đứng (mảnh bắn lên rồi tan), không alpha thật, chỉ Additive; từ `Impact_Ground.psd` 2026-11-10 |
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

## Luật chọn (2026-11-10)

Thư mục chỉ cho biết **họ** của ảnh, không bảo đảm đúng hình. Ví dụ `glow/flare`: `003` là chùm tia xoè (không phải sao), `001` đỏ chéo, `008` là cầu mềm, `010` sao 4 cánh mảnh. Nên mỗi lần chọn làm đủ các bước:

1. **Viết yêu cầu thành phần** trước khi mở thư mục: hình gì; đứng hay nằm đất; blend (Additive / Alpha / Cutout); ảnh đơn hay sheet (lưới?); xám (tint được) hay đã có màu; có cần mép mềm không.
2. **Tra bảng ở trên** ra thư mục (có thể 2 thư mục lân cận, ví dụ `glow/soft_round` + `soft_oval`).
3. **Xem cả thư mục**: `python -I tools/library_props.py --contact <nhóm>/<vai trò>` → Read `Docs/VFX/_Library/_contact/<nhóm>_<vai trò>.png` (nền caro: thấy alpha thật; ảnh có nền đen không alpha sẽ hiện nền đen). Thư mục > 24 ảnh: contact sheet vẫn đủ, nhưng chọn xong phải Read ảnh gốc của ứng viên.
4. **Lọc bằng `library_props.csv`** (`python -I tools/library_props.py` để làm mới khi Library đổi):
   - `kind=alpha` → dùng Alpha / Cutout / Additive đều được; `black_bg` → **chỉ Additive** (hoặc import `alphaFromGray`); `opaque` → cẩn thận, thường là noise / mask / UV.
   - `color=gray` → tint bằng Start Color / ramp; `tinted|color` → màu bị cố định, chỉ dùng khi brief cần đúng màu đó.
   - `edge_touch=1` → ảnh chạm mép, hay lộ **cạnh vuông** khi scale: không dùng cho glow / flare / hạt, trừ ảnh chạy UV, noise, mask, flipbook.
   - **Ảnh không alpha thật (`black_bg` / `opaque`, hoặc ảnh RGB) dễ lộ viền vuông** (art lead 2026-11-10, FireTornado): đừng gán thẳng. Copy sang `Assets/VFX/<Effect>/Textures/` rồi tạo bản alpha thật: alpha = độ sáng (max RGB), RGB chia lại theo alpha (Additive nhìn y nguyên), làm mờ mép ~6–8 % vào trong, Wrap = Clamp. Mẫu: `T_FireTornado_Crack.png`, `T_FireTornado_Shard_1x4.png` (sheet thì mờ mép theo từng ô).
   - `warn` có "không POT" / "nhỏ <128": nói rõ trong kế hoạch nếu vẫn dùng.
5. **Chốt**: 1 ảnh chính + 1–2 dự phòng. Ghi vào kế hoạch dạng bảng `Thành phần | Ảnh chọn | Lý do | Đã loại (vì sao)`.
6. **Kiểm sau khi dựng**: xem preview / Review Lab, thành phần phải ra **đúng hình đã định** (không cạnh vuông, không ra màu lạ, không chớp đen). Sai thì quay lại bước 3 đổi ảnh, không chỉnh thông số để chữa hình sai.

Quy tắc theo loại (đã gặp lỗi hoặc art lead chốt):
- **Chớp / quầng (glow)**: ảnh đối xứng tròn, `edge_touch=0`, xám. Không lấy flare có vòng hay tia cố định khi cần "quầng mềm".
- **Sao / flare**: kiểm số cánh và độ dài cánh so với brief (4 cánh mảnh ≠ chùm 16 tia ≠ sao 8 gai).
- **Vòng sóng / rune nằm đất**: tròn đều, tâm đúng giữa ảnh (vì xoay quanh tâm), mép không chạm khung.
- **Tia sét / vệt / trail Stretched**: ảnh **nằm ngang**, hướng bay = mép TRÁI; ảnh dựng đứng thì sai hướng.
- **Flipbook**: biết lưới (cột × hàng) và số khung thật trước khi gán; khung cuối nên gần trong suốt; Frame over Time tuyến tính.
- **Noise**: chọn theo việc (tan = `cloud|cell`, sọc = `streak`, méo UV = `swirl`, cutout = `hard_edge`); tileable thì kiểm có thấy mối nối không.
- **Nứt đất / vết cháy**: nằm đất, `kind=alpha` ưu tiên; nền đen thì chỉ Additive.
- **Khói / lửa hữu cơ**: theo luật hình dáng (khói mặc định, khói nổ = Erode Sphere); không chọn theo bảng này một mình.

### Sai vai trò đã biết

Thêm dòng khi gặp (file → vai trò thực → nơi đúng). Chưa di chuyển file khi chưa có lệnh art lead.

| File | Vai trò thực | Ghi chú |
|---|---|---|
| `glow/flare/glow_flare_003` | chùm tia xoè (sunburst), không phải sao | dùng cho "tia nắng / bùng tia", không cho sao chớp |
| `glow/flare/glow_flare_008` | cầu mềm có gai nhỏ | gần `soft_round` hơn là flare |
| `trail/streak/trail_streak_012` | khối trắng đặc, mép phải rách (không alpha) | Additive ra **thanh trắng đặc**, không phải vệt băng / đuôi sao; chỉ hợp vệt tốc độ trắng |
| `water/splash/water_splash_002` | mạng vân xám loang (giống vân dung nham / nứt), chạm mép | không phải vũng chất lỏng |
| `smoke/sheet/smoke_sheet_002` | 4 cụm mây cartoon trắng (2×2) | là khói / nổ cartoon, không phải lửa; dùng làm "ngọn lửa" ra cục mây |
| `glow/soft_round/glow_soft_round_008`, `_029` | cầu mềm 128 px, chỉ chiếm nửa khung, nền đen | quá nhỏ cho quầng lớn (GroundFlash) → mờ vỡ; ưu tiên `_007` (500 px) hoặc `_005` |
| `ground/crack_radial/ground_crack_radial_001` | vỡ kính dày, chạm mép | tốt cho nứt đất nhưng không hợp "băng lạnh" mảnh; cần scale + fade mép |
