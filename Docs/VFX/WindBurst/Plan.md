# VFX_WindBurst: kế hoạch v1 (2026-11-25)

Brief: gió xoáy bùng quanh chân nhân vật, bán kính ~2.5 m: vòng gió lan ra, vài dải xoắn, bụi cỏ lá bay, ~1.2 s.
Không gian: ground · neo ở chân (y = 0) · mặt đất: Billboard + Render Alignment Local (GameObject xoay X 90°) · dải / lá: Stretched Billboard · camera 3/4 nhìn xuống 40° · bán kính cuối 2.5 m, dải bay cao ~2 m (nhân vật 2 m) · một lần 1.2 s · nền lẫn.
*Đề xuất*: màu (trắng mint `E0FFF2` / `8CEBD1`, bụi `C7BD94`, lá `8CC74D`), số hạt, thời gian từng lớp.

Khác với: WindTornado (cột đứng yên ~4 s, mesh) và WindShellTrail (đuôi theo vật bay): đây là **bùng một lần quanh chân, lan ngang mặt đất**, hình xương sống là vòng gió + dải xoắn bay lên.

## Bất biến (chưa có file Anatomy riêng: `_Anatomy/wind-burst.md`)
- **Vòng gió lan ra** từ chân đến ~2.5 m, nằm đất.
- **Dải gió xoắn** quay quanh trục dọc và bay lên.
- Bụi + lá bị cuốn theo vòng xoáy (cùng chiều quay với dải).
- Một lần ~1.2 s, tan sạch; không có khối khói tròn thay hình dải.

## Lớp
| ID | Lớp | Timing / vai trò | Carrier | Shader | 
|---|---|---|---|---|
| L1 | Vortex | đĩa xoáy nằm đất, 1.0 s, 2.5 → 5 m, xoay −5..−2 rad/s | Billboard Local, X 90° | Mobile Additive |
| L2 | WaveRing | vòng nhanh 0.7 s, 0.5 → 5 m | như L1 | Additive |
| L3 | WaveRing2 | vòng thứ hai trễ 0.12 s, xoay ngẫu nhiên | như L1 | Additive |
| L4 | Streaks (root) | 15 dải, 3 đợt (0 / 0.12 / 0.24 s), đời 0.65–0.95 s, đi ra + lên 2.4 m/s + quay quanh Y 6.5 rad/s | Stretched, World | Additive |
| L5 | Dust | 16 đốm bụi, quay 3.5 rad/s, nở 1 → 1.7 | Billboard, World | Alpha Blended |
| L6 | Leaves | 20 lá, bay lên 4 m/s, quay 5 rad/s, gravity 0.35 | Stretched (sheet 2x4 ô ngẫu nhiên) | Alpha Blended |

Thứ tự vẽ: Vortex 0, WaveRing 1, WaveRing2 2, Dust 3, Streaks 4, Leaves 5.

## Texture (Library, đã xem contact sheet)
| Thành phần | Thư mục | Chốt | Dự phòng | Đã loại |
|---|---|---|---|---|
| Vortex | `ring/swirl` | `ring_swirl_002` (vòng xoắn mờ, omni, alpha) | `ring_swirl_001` | `ring_swirl_003` (lưỡi liềm có hướng, không spam được) |
| WaveRing | `ring/ragged` | `ring_ragged_010` (vòng rách mờ, alpha, omni) | `ring_ragged_014` | `011`–`013` (đĩa trắng đặc), `006`/`007` (xanh lửa có màu), `003` (lửa) |
| WaveRing2 | `ring/ragged` | `ring_ragged_009` (vòng gai mờ, nền đen = additive) | `ring_ragged_008` | `005` (cầu vồng) |
| Streaks | `trail/streak` | `trail_streak_005` | `trail_streak_006` | `012` (khối đặc) |
| Dust | `smoke/soft` | `smoke_soft_004` | `smoke_soft_001` | `003`, `006` |
| Lá | `spark/shard` | `spark_shard_002` (không có ảnh lá thật trong Library: xấp xỉ) | `spark_shard_001` | `003` |

Builder: `Assets/VFX/WindBurst/Editor/WindBurstBuild.cs` (menu `VFX/WindBurst/Build`). Prefab `Assets/VFX/WindBurst/Prefabs/VFX_WindBurst.prefab`. Preview `Docs/VFX/WindBurst/Preview_sheet.png`.
Chưa chắc: (a) bản preview đầu quá nhiều dải nhọn kiểu nhím, đã giảm (đang chờ xem lại); (b) chiều xoắn của dải so với đĩa Vortex có thể ngược nhau; (c) lá chỉ là lưỡi nhọn trắng nhuộm xanh; (d) chưa vào `Included`.
