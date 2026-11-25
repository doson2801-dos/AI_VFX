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
| C2 | ChargeGlow | quầng phình + chớp nhẹ | Billboard Additive | `glow/soft_round/glow_soft_round_007` |
| C3 | ChargeOrbit | tuft lửa toon xoay quanh bóng (mặt phẳng YZ, nhìn rõ từ bên), xoáy vào, 45/s | Circle r 0,85, orbital X + radial âm, Alpha | `smoke/sheet/smoke_sheet_002` |
| C4 | ChargeInflow | chấm lửa từ vỏ cầu r 1,3 bị hút vào, 70/s | Sphere shell + radial âm | `glow_soft_round_007` |
| C5 | ChargeRings | 3 vòng mảnh co dần vào bóng, sáng lên khi co | Billboard Additive | `ring/thin/ring_thin_002` |
| C6 | ReleasePop | glow chớp ngắn lúc thả (không phải Impact) | Billboard Additive | `glow/soft_round/glow_soft_round_029` |
| L1 | Body (root, startDelay 1,0) | quả bay + đuôi, 0,45 s; chết ở đích | Stretched 0,75 m, `VFX/FX/Meteor`, aspect 3 | noise |
| L2 | Core + Trail | lõi + ribbon ngắn (0,22 s) | Billboard + Trails | `glow_soft_round_007` + `trail/streak/trail_streak_011` |
| L3–L4 | FlameLicks / TrailSmoke / Embers | lớp phụ khi bay (Birth) | | `smoke_sheet_002`, `fx_t_smoke_02.png`, `glow_soft_round_007` |
| H1–H4 | Flash 1,4 m / FireBurst 1,3 m / Sparks 9 / Smoke 5 cầu ăn mòn | nổ nhỏ ở đích | Death sub-emitter | `impact_flash_spiky_001`, `glow_soft_round_029`, `spark_streak_001`, mask GroundBlast |

## Chọn texture (xem contact sheet `ring_thin`, `trail_streak`, `spark_streak`)
| Thành phần | Ảnh chọn | Lý do | Dự phòng / đã loại |
|---|---|---|---|
| Vòng co | `ring/thin/ring_thin_002` | vòng mảnh có quầng mềm, alpha thật, xám (nhuộm cam) | dự phòng `ring_thin_011`; loại `004`, `007` (nền đen đặc, đĩa tối), `001` (rách, kiểu sét) |
| Ribbon / glow / flash / comet / tuft | như FireballStraight (cùng ảnh đã chọn ở đó) | | `trail_streak_010`, `glow_soft_round_029`, `spark_streak_003` |

Shader: `VFX/FX/Meteor`, `VFX/FX/Erode Sphere`, stock; không viết mới. Ngân sách ~300 hạt, 10 material.

## Việc chưa chắc
- Quả ChargeBall dùng Meteor với đuôi tắt: nếu nhìn như đĩa phẳng thì thêm `_Volume`.
- Tuft toon trông như hoa mây hơn là lửa (cùng vấn đề FireballThrow v2).
- Hướng quay quỹ đạo (YZ) chỉ đẹp khi nhìn từ bên; từ sau lưng nhân vật thấy vòng thành đường thẳng.
