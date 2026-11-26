# VFX_FireBreath — kế hoạch v1 (2026-11-26, order 20261126_khaipd_thoilua; số liệu ghi *đề xuất* do artist đoán)

Brief: Khải gửi video YouTube `qeUuME4z9yY` từ 0:40 + "VFX dạng thổi lửa"; "làm gif demo"; "góc camera như ref". Video = Dota 2 "Lina Arcana - Fiery Soul of the Slayer", 0:40 = **Dragon Slave**. Không tải được video (YouTube chặn), chỉ xem 6 khung thu nhỏ (`work/vfx_orders/20261126_khaipd_thoilua/ref/key_tiles.png`).

Không gian: ground / dir (bắn ngang mặt đất, 1 hướng +Z) · quy mô: dài ~10 m, rộng ~3 m ở cuối, nhân vật 2 m · neo = hai tay ở cao 0,9 m *đề xuất* · camera **như ref: Dota nhìn xuống ~60°, nhìn từ bên (sóng chạy ngang màn hình)** *đề xuất (đọc từ khung ref)* · nền: cỏ xanh (ref).
Timing *đề xuất*: tụ 0,25 s → sóng lao ra 0,45 s (22 m/s) → tàn/khói/vệt cháy còn ~3,5 s. Tổng ~4,5 s, một lần.
Sản phẩm: **GIF demo** (≤ 10 MiB) + prefab `VFX_FireBreath` (Khải chỉ xin GIF; prefab là bản kèm, chưa vào `Included`).

## Anatomy / Bất biến (chép từ `_Anatomy/fire-breath.md`)
- Một sóng lửa rộng thổi ra phía trước theo một hướng, hẹp ở nhân vật rồi loe; không phải cầu lửa / vòng quanh người.
- Đầu sóng sáng hơn thân, dẫn đầu (ánh hồng-tím ở mép trước như ref).
- **Để lại vệt cháy đen + tàn lửa trên đất sau khi sóng qua.**
- Màu cam đỏ, lõi vàng, stylized; nhìn ra lửa (lưỡi lửa có vân).

## Lớp (v1b, sau review vòng 1)
| ID | Lớp | Vai trò, timing (s) | Carrier / shader | Texture |
|---|---|---|---|---|
| L1 | Wave (root) | quầng nền cam của sóng 0,25–0,70 (không còn là thân chính) | Billboard Add, `Mobile/Particles/Additive`, đường kính tối đa 2 m < 2 × Y0 (không cắt đất) | `glow/soft_round/glow_soft_round_005` |
| L2 | Tongues | **thân sóng thật**: lưỡi lửa có hướng, ~40 hạt Stretched, tất cả cùng hướng bắn, không xoay, đầu = hướng bay | Stretched Alpha | `FX_TX_Fire_FireLoop_03_4x4` (rpg-game) |
| L3 | Head | đầu sóng: quầng hồng-tím + lõi kem + lưỡi liềm bay cùng, 22 m/s | Billboard Add + Stretched Alpha | `glow_soft_round_005`; `FX_TX_Fire_DirectionalFlame_01_4x4` |
| L4 | Scorch | vệt cháy nằm đất, sống 3–3,8 s (sub-emitter của Head, Local X 90) | Billboard Local, Alpha | `ground/scorch/ground_scorch_003` |
| L5 | GroundGlow | vệt sáng cam trên đất đi theo sóng | Local flat, Add | `glow_soft_round_005` |
| L6 | Embers | tàn lửa rải trên vệt cháy, 1,4–3,2 s | Add | `glow/soft_round/glow_soft_round_002` |
| L7 | Smoke | khói nhiệt bốc lên từ vệt cháy (đường kính ≤ 1,5 m, bắt đầu cao 0,85 m) | Alpha | `smoke/soft/smoke_soft_005` (= khói mặc định) |
| L8 | Sparks | comet bay tới trước rồi rơi, pivot (0,1,0) | Stretched Add | `spark/streak/spark_streak_001` |
| L9 | Charge + Flash | tụ glow + hạt hút vào 0–0,25 s, chớp nòng | Billboard Add | `glow_soft_round_005`, `_002`, `impact/flash_spiky/impact_flash_spiky_001` |

Thứ tự vẽ (không trùng): Scorch 0, GroundGlow 1, Smoke 3, Wave 4, Tongues 5, Head 6, Crest 8, Core 9, Embers 10, Sparks 11, Charge 12, ChargeDots 13, Flash 14. Scaling Mode Hierarchy; Frame over Time tuyến tính; không Horizontal / Vertical Billboard.

## Chọn texture (thành phần → thư mục → ảnh chốt → ảnh loại)
Đã xem contact sheet `fire_candidates`, `trail_streak`, `ground/scorch` (3 ảnh xem trực tiếp), `smoke_sheet`.
| Thành phần | Thư mục | Chốt | Lý do | Đã loại |
|---|---|---|---|---|
| Thân sóng: lưỡi lửa có hướng | (Library chưa có; rpg-game `Flipbooks/Fire`) | `FireLoop_03` | cam thật, alpha thật, bầu sáng dẫn đầu ở TRÁI = quy ước Stretched | `FireLoop_01` (cục trắng), `FireLoop_04` (xám) |
| Lưỡi liềm đầu sóng | cùng | `DirectionalFlame_01` | lưỡi liềm dẫn đầu bên trái, bung rồi tan | `DirectionalFlame_03` (xám), `FireSlash_*` (dạng chém) |
| Quầng nền sóng, đầu sóng, ground glow, tụ | `glow/soft_round` | `glow_soft_round_005` | alpha thật, omni, tint được (warn "không POT" không ảnh hưởng) | `_007` (nền đen) |
| Vết cháy | `ground/scorch` | `ground_scorch_003` | alpha thật, omni, vệt cháy có nứt; dùng nhiều dấu chồng nhau | `_001` (nền đen, vòng chấm), `_002` (dir, chạm mép), `smoke_sheet_002` (mây, bị review chặn) |
| Khói nhiệt | `smoke/soft` | `smoke_soft_005` | khói mặc định của dự án | `smoke_sheet_002` (mây cartoon, "không phải lửa") |
| Tàn lửa | `glow/soft_round` | `glow_soft_round_002` | chấm nhỏ alpha thật | `_005` (quá to) |
| Chớp nòng | `impact/flash_spiky` | `impact_flash_spiky_001` | sao gai mềm, omni | `_014` |
| Comet tia lửa | `spark/streak` | `spark_streak_001` | đầu tròn bên TRÁI, đuôi nhọn, Additive | `trail_streak_012` (khối trắng đặc) |
Hai flipbook rpg-game: copy + resize vào `Assets/VFX/FireBreath/Textures/` qua `prep_tex.py` (Library không đổi). **Art lead quyết có nhập hai flipbook này vào Library không.**

## Review vòng 1 (vfx-director, 2026-11-26) và cách sửa
- L1 cao: thân sóng bằng `smoke_sheet_002` (mây = lửa) → bỏ; thân = lưỡi lửa FireLoop_03 ~40 hạt cùng hướng (nhiều hơn "vài hạt" của luật sheet có hướng, nhưng đều thẳng hướng, không xoay: **art lead quyết**), quầng glow làm nền.
- L2: billboard xuyên đất bị cắt cạnh thẳng → Y0 1,0 m, đường kính tối đa thân / khói ≤ 2 × độ cao tâm.
- L3: Scorch → `ground/scorch_003`, Smoke → `smoke_soft_005`, bảng chọn texture đủ cột.
- L5: Sparks pivot (0,1,0); Anatomy ghi lỗi đã gặp.
- Còn mở: thân sóng thon hơn ref? (đo bằng mắt, art lead quyết); sub-emitter Birth chưa xem ở Play mode.

## Việc chưa chắc
- Chỉ xem được khung thu nhỏ của ref: chưa biết độ rộng, nhịp, vân thật của sóng.
- Đầu hồng-tím: ref chỉ thấy lờ mờ ở khung nhỏ.
- Chưa chạy lại trong Showcase (không đụng `Included`).
