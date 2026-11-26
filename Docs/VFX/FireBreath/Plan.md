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

## Lớp
| ID | Lớp | Vai trò, timing (s) | Carrier / shader | Texture |
|---|---|---|---|---|
| L1 | Wave (root) | thân sóng: mây lửa toon bắn từ nón dẹt, 0,25–0,70, sống 0,32–0,5 | Billboard Alpha, `Mobile/Particles/Alpha Blended`, màu theo đời: kem → vàng → cam → đỏ → than | `smoke/sheet/smoke_sheet_002` 2×2 (không hướng, spam được) |
| L2 | Tongues | lưỡi lửa có hướng, ít hạt to (~19), Stretched, đầu = hướng bay | Stretched Alpha | `FX_TX_Fire_FireLoop_03_4x4` (rpg-game, art lead; PyroNova đã dùng) |
| L3 | Head | đầu sóng: quầng hồng-tím + lõi kem + lưỡi liềm DirectionalFlame bay cùng, 0,25–0,70, 22 m/s | Billboard Add + Stretched Alpha | `glow_soft_round_005`; `FX_TX_Fire_DirectionalFlame_01_4x4` |
| L4 | Scorch | vệt cháy đen nằm đất, sống 3–3,8 s, ấm → than | sub-emitter Birth của Head, Billboard Local (X 90), Alpha | `smoke_sheet_002` nhuộm than |
| L5 | GroundGlow | vệt sáng cam trên đất đi theo sóng, 0,4 s | sub-emitter, Local flat, Add | `glow_soft_round_005` |
| L6 | Embers | tàn lửa rải trên vệt cháy, 1,4–3,2 s | sub-emitter, Add | `glow_soft_round_002` |
| L7 | Smoke | khói nâu ấm bốc từ vệt cháy | sub-emitter, Alpha | `smoke_sheet_002` nhuộm nâu |
| L8 | Sparks | comet bay tới trước rồi rơi, có hướng | Stretched Add | `spark/streak/spark_streak_001` |
| L9 | Charge + Flash | tụ glow + hạt hút vào 0–0,25 s, chớp nòng lúc bắn | Billboard Add | `glow_soft_round_005`, `_002`, `impact_flash_spiky_001` |

Thứ tự vẽ (không trùng): Scorch 0, GroundGlow 1, Smoke 3, Wave 4, Tongues 5, Head 6, Crest 8, Core 9, Embers 10, Sparks 11, Charge 12, ChargeDots 13, Flash 14. Scaling Mode Hierarchy; Frame over Time tuyến tính; không Horizontal / Vertical Billboard.

## Chọn texture
Đã xem contact sheet `_contact/fire_candidates.png`, `trail_streak.png`.
| Thành phần | Chọn | Lý do | Đã loại |
|---|---|---|---|
| Lưỡi lửa có hướng | `FireLoop_03` (rpg-game) | màu cam thật, alpha thật, bầu sáng dẫn đầu ở TRÁI = đúng quy ước Stretched | `FireLoop_01` (cục trắng), `FireLoop_04` (xám) |
| Lưỡi liềm đầu sóng | `DirectionalFlame_01` (rpg-game) | lưỡi liềm dẫn đầu bên trái, bung rồi tan trong 16 khung | `DirectionalFlame_03` (xám), `FireSlash_*` (dạng chém) |
| Thân sóng | `smoke_sheet_002` | mây toon 2 tông, không hướng, nhuộm thành lửa | `smoke/cartoon/*` (dự phòng) |
| Quầng / tàn / chớp / comet | `glow_soft_round_005 / 002`, `impact_flash_spiky_001`, `spark_streak_001` | đã dùng ở FireballStraight, đã qua review | `trail_streak_012` (khối trắng đặc) |
Hai flipbook rpg-game chưa có trong `Assets/Library/`: copy + resize vào `Assets/VFX/FireBreath/Textures/` qua `prep_tex.py` (Library không đổi). **Art lead quyết** có nhập hai flipbook này vào Library không.

## Việc chưa chắc
- Chỉ xem được khung thu nhỏ của ref: chưa biết độ rộng, nhịp, vân thật của sóng.
- Đầu hồng-tím: ref chỉ thấy lờ mờ ở khung nhỏ.
- Chưa chạy lại trong Showcase (không đụng `Included`).
