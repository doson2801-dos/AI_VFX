# VFX_FireballCharge — kế hoạch v1 (2026-11-25; số ghi *đề xuất* do artist đoán)

Cầu lửa **tích tụ và xoay trước tay (~1 s, quả ~0,6 m)** rồi **phóng thẳng ra ~6 m và nổ nhỏ**. Một prefab tự chạy: hạt gốc là quả bay, sinh sau `startDelay` = 1,0 s; các lớp tích tụ là con; lớp nổ là Death sub-emitter.

Không gian: pha tích tụ ground/air tại tay (cách tay 0,45 m về trước, cao 1,3 m *đề xuất*) · pha bay dir +Z, thẳng, 13,3 m/s, 0,45 s *đề xuất* · nổ trên không · camera 3/4 40° · nhân vật 2 m · pivot = tay · quả 0,6 m, nổ ~1,4 m.
Timing: 0–1,0 tích tụ; 1,0 thả (glow pop); 1,0–1,45 bay; 1,45–2,5 nổ nhỏ + khói.

## Anatomy / Bất biến (`_Anatomy/fire-hand-flame.md` cho phần lửa ở tay, `hero-projectile.md` + `fireball-throw.md` cho phần bay)
- **Quả cầu lửa nhìn rõ ngay từ đầu pha tích tụ**, lớn dần tới ~0,6 m, vân cháy sôi; không phải một bóng glow trơn.
- Tích tụ: **vật liệu bị hút vào** tâm (tuft xoay quanh, tàn lửa rơi vào, vòng co lại), không bắn ra.
- Lửa dính theo tay (Local), không để vệt.
- Khi thả: đầu dẫn theo hướng bay (Stretched), đuôi liền; **bay thẳng**; nổ nhỏ ở đích, **một chớp Impact** (chớp thả là glow, không phải Impact).

## Khác FireballThrow / FireballStraight
Hành vi mới: pha tích tụ 1 s dính tay + thả (Throw / Straight bay ngay), tầm ngắn 6 m, nổ nhỏ ~1,4 m (khói 5 cầu), lớp phụ riêng (ChargeBall, ChargeOrbit, ChargeInflow, ChargeRings, ReleasePop).

## Lớp
| ID | Lớp | Vai trò, timing | Carrier / shader | Texture |
|---|---|---|---|---|
| C1 | ChargeBall | quả 0,6 m lớn dần, vân sôi, xoay; 0–1,0 | Billboard, `VFX/FX/Meteor` (Aspect 1, đuôi tắt) | noise `T_Noise_Streaks` |
| C4 | ChargeInflow | vài tàn lửa từ vỏ cầu r 1,1 bị hút vào, 22/s | Sphere shell + radial âm | `glow_soft_round_007` |
| C5 | ChargeRings | 2 vòng mảnh co dần vào bóng, sáng lên khi co | Billboard Additive | `ring/thin/ring_thin_002` |
| C6 | ReleasePop | glow chớp ngắn lúc thả (không phải Impact) | Billboard Additive | `glow/soft_round/glow_soft_round_005` |
| L1 | Body (root, startDelay 1,0) | quả bay + đuôi, 0,45 s; chết ở đích | Stretched 0,75 m, `VFX/FX/Meteor`, aspect 3 | noise |
| L2 | Core + Trail | lõi + ribbon ngắn (0,22 s) | Billboard + Trails | `glow_soft_round_007` + `trail/streak/trail_streak_011` |
| L3–L4 | FlameLicks / TrailSmoke / Embers | lớp phụ khi bay (Birth) | | `smoke_sheet_002`, `fx_t_smoke_02.png`, `glow_soft_round_007` |
| H1–H4 | Flash 1,4 m / FireBurst 1,3 m / Sparks 9 / Smoke 5 cầu ăn mòn | nổ nhỏ ở đích | Death sub-emitter | `impact_flash_spiky_001`, `glow_soft_round_005`, `spark_streak_001`, mask GroundBlast |

## Chọn texture (xem contact sheet `ring_thin`, `trail_streak`, `spark_streak`)
| Thành phần | Ảnh chọn | Lý do | Dự phòng / đã loại |
|---|---|---|---|
| Vòng co | `ring/thin/ring_thin_002` | vòng mảnh có quầng mềm, alpha thật, xám (nhuộm cam) | dự phòng `ring_thin_011`; loại `004`, `007` (nền đen đặc, đĩa tối), `001` (rách, kiểu sét) |
| Ribbon / glow / flash / comet / tuft | như FireballStraight (cùng ảnh đã chọn ở đó) | | `trail_streak_010`, `glow_soft_round_005`, `spark_streak_003` |

Shader: `VFX/FX/Meteor`, `VFX/FX/Erode Sphere`, stock; không viết mới. Ngân sách ~300 hạt, 10 material.

## Việc chưa chắc
- Quả ChargeBall dùng Meteor với đuôi tắt: nếu nhìn như đĩa phẳng thì thêm `_Volume`.
- Tuft toon trông như hoa mây hơn là lửa (cùng vấn đề FireballThrow v2).
- Hướng quay quỹ đạo (YZ) chỉ đẹp khi nhìn từ bên; từ sau lưng nhân vật thấy vòng thành đường thẳng.

## Review vfx-director (2026-11-25) và đối chiếu Bất biến
- FireBurst đổi sang `glow_soft_round_005` (029 nằm trong "Sai vai trò đã biết"; đã loại).
- **Lưỡi lửa (FlameLicks)**: `smoke_sheet_002` ghi trong LIBRARY.md là "4 cụm mây cartoon, không phải lửa". Đã tìm ảnh lửa thật trong `Assets/Library/`: **không có** thư mục / ảnh lửa flipbook (các `FX_TX_Fire_FireLoop_*`, `TX_VFX_Flame*` chỉ có trong contact sheet `fire_candidates.png`, chưa nhập Library; chỉ có `impact/flipbook/001-003` là FireImpact dùng cho nổ). Vẫn dùng `smoke_sheet_002` nhuộm cam. **Art lead quyết**: nhập `FireLoop_03` (hướng, dùng ít hạt theo luật sheet có hướng) hay giữ mây toon.
- Sửa theo review: sortingOrder duy nhất (TrailSmoke 0, Smoke 1, Orbit 2, FlameLicks 3, ChargeGlow 4, ChargeBall 5, Body 6, Core 7, Inflow 8, Embers 9, Rings 10, FireBurst 11, Sparks 12, ReleasePop 13, Flash 14); ChargeBall rõ hơn (`_Volume` 0,8, lõi bớt cháy trắng, to nhanh hơn, quầng glow giảm 40%); sheet chính thêm mốc 1,46 / 1,52 / 1,62 s thấy chớp + nổ nhỏ.
- Đối chiếu Bất biến trên preview: quả thấy ngay từ 0,3 s và lớn dần (cận cảnh); tuft + vòng + chấm đều hút vào; thả lúc 1,0 s bay thẳng; một chớp Impact ở 1,46 s. Còn lệch: vân quả có mảng hồng ở đáy (crust darkening), chờ art lead.

## Đơn giản hoá pha sạc + khói (art lead 2026-11-25)
- Pha sạc (0–1 s) chỉ còn: **ChargeBall** (trung tâm, lớn dần) + 2 lớp phụ (**ChargeRings** 2 vòng hút vào ở 0,3 s và 0,65 s, **ChargeInflow** ~22 tàn lửa/s) + ReleasePop tức thời lúc thả. Đã bỏ ChargeOrbit (tuft xoay) và ChargeGlow. Thứ tự đọc: quả to dần → vòng/tàn lửa hút vào → thả. sortingOrder vẫn duy nhất (Body 6, Ball 5, Core 7, Inflow 8, Embers 9, Rings 10 ...).
- Khói (TrailSmoke khi bay + khói nổ) đổi cùng kiểu FireballStraight: thuỳ toon `smoke_sheet_002` màu nâu ấm, khói nổ Erode Sphere tô nâu ấm.
- Preview: `Preview_sheet.png` (3/4, mốc 0,15–1,8 s) và `Preview_close.png` (cận cảnh, 0,15–1,1 s).
