# VFX_FireballStraight — kế hoạch v1 (2026-11-25, brief từ người order; các số ghi *đề xuất* do artist đoán)

Cầu lửa **bay thẳng ngang ~10 m** với đuôi lửa dài + tàn lửa, **nổ khi tới đích** (loop bay rồi impact). Một prefab tự chạy, không script: hạt thân là quả cầu, chết ở đích thì kích các lớp nổ (sub-emitter Death), giống cơ chế FireballThrow.

Không gian: dir (bay thẳng ngang) + nổ trên không · thân Stretched Billboard (đầu = mép trái) · camera 3/4 40° · neo = tay người ném (pivot), bay +Z · cao 1,2 m, không trọng lực *đề xuất* · cầu 0,6 m, đuôi ~3 m, nổ ~2 m so với nhân vật 2 m · nền lẫn.
Timing: bay 0,65 s (15,4 m/s *đề xuất*), nổ 0,65–1,9 s. Tổng ~1,9 s.

## Anatomy / Bất biến (chép từ `_Anatomy/hero-projectile.md` + `fireball-throw.md`, `materials.md` dòng Lửa)
- Quả cầu nhìn rõ, **đầu dẫn theo hướng bay (Stretched)**, đuôi **liền** sau thân (frame giữa chuyến bay thấy thân + đuôi tách bạch).
- **Bay thẳng, tốc độ cao** (không vòng cung, không lờ đờ). Khác FireballThrow: không cung, không chạm đất.
- Nhìn ra **lửa** (lưỡi lửa, vân nóng), không phải bóng sáng trơn. Đuôi không phải thanh trắng đặc.
- **Một chớp Impact, nổ ở đích**; trước đó không có nổ.

## Khác FireballThrow thực chất
Hành vi (thẳng, vận tốc không đổi, nổ trên không ở độ cao ngực, không khói đất), timing (0,65 s), lớp phụ (comet tàn lửa thả ngược `ShedComets`, ribbon dài 8 m, khói đuôi 1,4 s để lại cả đường), tỉ lệ đuôi (aspect 4,5 vs 3), nổ tia cầu 360° thay vì chỏm hướng lên.

## Lớp
| ID | Lớp | Vai trò, timing (s) | Carrier / shader | Texture |
|---|---|---|---|---|
| L1 | Body (root) | thân cầu + đuôi lửa dài, 0–0,65; chết ở đích kích L5–L9 | 1 hạt Stretched 0,75 m × (×4,5), `VFX/FX/Meteor`, vân nhiễu chạy nhanh | noise `T_Noise_Streaks` |
| L2 | Core + Trail | lõi sáng + ribbon cam→đỏ dài ~8 m (đuôi liền) | hạt Billboard + Trails (World) | `glow/soft_round/glow_soft_round_007` + `trail/streak/trail_streak_011` |
| L3 | FlameLicks | cụm lưỡi lửa toon sôi sau cầu, 110/s | Birth sub-emitter | `smoke/sheet/smoke_sheet_002` (2×2, khung ngẫu nhiên) |
| L4 | TrailSmoke | khói xám để lại dọc đường, 60/s, sống ~1,2 s | Birth sub-emitter, stock Alpha | `Assets/VFX/fx_t_smoke_02.png` (luật khói mặc định) |
| L4b | Embers | tàn lửa tròn rơi, 60/s | Birth sub-emitter | `glow_soft_round_007` |
| L4c | ShedComets | tia comet thả ngược sau cầu (có hướng: ít, nhỏ, đúng hướng), 45/s | Stretched | `spark/streak/spark_streak_001` |
| L5 | Flash | **một** chớp Impact, 0,14 s, 2,2 m | Billboard Additive | `impact/flash_spiky/impact_flash_spiky_001` |
| L6 | FireBurst | khối glow nóng → cam → đỏ, 0,45 s, 2 m | Billboard Additive | `glow/soft_round/glow_soft_round_029` |
| L7 | Sparks | 18 comet bắn 360° rồi rơi | Stretched Additive | `spark_streak_001` |
| L8 | Smoke | 9 cầu ăn mòn nhỏ (luật khói vụ nổ, GroundBlast v5c), cháy → gân → than → tan | Mesh `SM_VFX_SphereUV`, `VFX/FX/Erode Sphere` | mask `T_GroundBlast_SmokeErode` + ramp |

Thứ tự vẽ: TrailSmoke 0, Smoke 1, FlameLicks 2, Body 3, Core+trail 4, Embers 5, ShedComets 6, FireBurst 7, Sparks 8, Flash 9.

## Chọn texture (quy trình LIBRARY.md; xem contact sheet `trail_streak`, `spark_streak`)
Các ảnh glow / flash / smoke / streak đã dùng trong FireballThrow (tên cũ glow_022 / glow_085 / impact_018 / smoke_007 / glow_072; đường mới sau khi chia lại cây thì tra `library_index.csv`).
| Thành phần | Ảnh chọn | Lý do | Dự phòng / đã loại |
|---|---|---|---|
| Ribbon đuôi | `trail/streak/trail_streak_011` | trái đặc, phải rách sọc: đuôi lửa liền mà không thành thanh đặc, black_bg dùng Additive | dự phòng `trail_streak_010` (comet mảnh); loại `trail_streak_012` (opaque trắng đặc: lỗi đuôi băng đã gặp) |
| Lõi / tàn lửa | `glow/soft_round/glow_soft_round_007` | glow tròn mềm, alpha | `glow_soft_round_029` |
| Khối nổ | `glow/soft_round/glow_soft_round_029` | lõi đặc, mép mềm | `007` |
| Chớp | `impact/flash_spiky/impact_flash_spiky_001` | sao gai mềm | `flash_spiky_014` |
| Comet | `spark/streak/spark_streak_001` | đầu tròn bên trái, đuôi nhọn, black_bg Additive | `spark_streak_003` (alpha thật, chạm mép), loại `006` (khối to) |
| Lưỡi lửa | `smoke/sheet/smoke_sheet_002` | 2×2 mây toon 2 tông, nhuộm thành lửa; không hướng nên được spam | `smoke/cartoon/*` |

Shader: dùng lại `VFX/FX/Meteor`, `VFX/FX/Erode Sphere`, stock. Không viết mới. Ngân sách: ~280 hạt tối đa, 9 material.

## Việc chưa chắc
- `_HeadX` công thức `-(Aspect-0.9)` suy từ shader + đo preview; kiểm lại trong Showcase.
- Hình lưỡi lửa là mây toon nhuộm (cùng cách FireballThrow v2); art lead chưa nói có hợp không.
- Chưa có Lights demo trong `VfxShowcaseLights.Table` (chờ duyệt).
