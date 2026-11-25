# FireballThrow — cầu ném bay cung rồi nổ
Độ chắc: suy từ `Docs/VFX/FireballThrow/Plan.md` + preview · Cập nhật: 2026-11-10 · Nguồn: Plan.md, Plan_Variants.md

## Nó là gì
Một **quả cầu 0.6 m ném từ tay theo vòng cung ~8 m trong 0.8 s**, để lại đuôi, **chạm đất thì nổ ~2.5 m** (chớp + khối nổ + tia + khói). Một prefab tự chạy trọn: bay → chạm → nổ (hạt thân chết → sub-emitter Death).

## Cấu trúc
| Phần | Vai trò | Bắt buộc |
|---|---|---|
| Body | thân cầu Stretched theo hướng bay | **xương sống** |
| Core | lõi sáng | có |
| Trail / đuôi + khói đuôi | vệt dọc cung | có |
| Flash | một chớp Impact lúc chạm | có |
| Burst / nổ + tia + mảnh | vụ nổ ở chân | có |

## Bất biến
- Có **quả cầu nhìn thấy rõ bay vòng cung**, đầu hướng đúng tiến (Stretched), **đuôi liền** theo quỹ đạo.
- **Một chớp rồi nổ ở điểm chạm đất**; trước khi chạm không có nổ.
- Kích cỡ: cầu ~0.6 m, nổ ~2.5 m.

## Được đổi
Chất liệu quả cầu (lửa; băng: cầu tinh thể + mảnh; độc: cục / bọt đặc), hình nổ (lửa bung; băng vỡ tinh thể; độc bắn tung toé và vũng), màu đuôi, khói.

## Lỗi biến thể đã gặp
- **Frost**: đuôi dùng `trail_streak_012` (trắng đặc) nên ra **thanh trắng cong**, thân tinh thể nhỏ khó thấy.
- **Poison**: thân dùng noise streak nên trông như khối trắng sáng, thiếu cảm giác độc.
- **Frost, thân tinh thể** (2026-11-10): mesh xoay tự do (tumble) nên mũi chỉ lung tung. Sửa: mesh có trục dài (`SM_VFX_Debris_Crystal_01`: trục +Y, mũi nhọn ở +Y, kiểm bằng Blender) phải **dẫn đầu theo hướng bay**: Euler X +90° đưa +Y về +Z, rồi chúi theo đường cong quỹ đạo. Mọi mesh có đầu-đuôi bay theo quỹ đạo đều theo luật này; không xoay ngẫu nhiên.
- Đuôi băng đã đổi sang vệt sao chổi mảnh `trail_streak_010` (bản alpha thật), bỏ `trail_streak_012` (khối trắng đặc).
- Tránh: kiểm preview frame 2–4 thấy **cầu + đuôi tách bạch**; đuôi băng nên là vệt mảnh có hạt lấp lánh, không phải dải đặc.

## Biến thể đã làm
Gốc (lửa), Frost, Poison.
- **FireballStraight** (2026-11-25, chờ art lead): bay thẳng 10 m / 0,65 s, đuôi dài (aspect 4,5, ribbon ~8 m) + comet tàn lửa, nổ trên không ở độ cao ngực. Khác gốc ở hành vi (không cung, không chạm đất) và timing. Plan: `Docs/VFX/FireballStraight/Plan.md`.
- **FireballCharge** (2026-11-25, chờ art lead): tích tụ 1 s trước tay (quả 0,6 m + tuft xoay + tàn lửa hút vào + vòng co), thả, bay thẳng 6 m, nổ nhỏ ~1,4 m. Hạt thân dùng `startDelay` = thời gian tích tụ. Plan: `Docs/VFX/FireballCharge/Plan.md`.

Lỗi mới (2026-11-25): Meteor `_HeadX` cho Stretched Billboard: quad trải x -Aspect..+Aspect (đơn vị nửa chiều cao), đầu cầu = mép trái = vị trí hạt, nên `_HeadX = -(Aspect - 0,9)` (không tỉ lệ thuận theo aspect). `trail_streak_012` và `glow_soft_round_029` nằm trong "Sai vai trò đã biết" (không dùng). Sheet 2×2 `smoke_sheet_002` làm lưỡi lửa ra cục mây: Library chưa có sheet lửa thật.

Lỗi mới (2026-11-25, art lead, FireballStraight): **khói lệch phong cách**. Thân lửa + nổ là toon, nhưng khói đuôi mờ (`fx_t_smoke_02`) và khói nổ xám lạnh nhìn như khói thật. Sửa: khói đuôi = thuỳ toon (sheet `smoke_sheet_002`) nhuộm nâu ấm → bồ hóng; khói nổ Erode Sphere tô nâu tối ấm; co + mờ cùng nhịp lưỡi lửa. Luật: trong một effect, khói cùng ngôn ngữ với lửa (bảng màu ấm, mép thuỳ rõ), không mượn khói xám mặc định. Lỗi FireballCharge: pha sạc nhiều lớp chồng (tuft + vòng + chấm + glow) thành rối; giữ 1 quả rõ + tối đa 2 lớp phụ dễ đọc.
