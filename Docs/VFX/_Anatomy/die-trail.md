# DieTrail — vệt vàng bám xúc xắc rơi (skill Lucky Dice của Hero Lucky God)
Độ chắc: **suy từ ảnh ref art lead (docs Hero – Lucky God, mục IV "Trail Die") + mô tả docs; chưa xem video Envato ref** · Cập nhật: 2026-11-25 · Nguồn: `work/vfx_orders/20261125_sondh_docs/image.png` (xúc xắc trắng, dải lửa vàng xoắn quanh, lấp lánh), docs Google (mục III: "xúc xắc xoay nhẹ khi rơi, vệt khói vàng dài"; mục IV: "khi rơi có trail màu vàng toả ra từ các góc của xúc xắc")

## Nó là gì
Xúc xắc to rơi từ trên trời xuống mục tiêu, **xoay nhẹ**; từ **các góc của khối** toả ra những **dải vàng mảnh xoắn** kéo dài ngược lên phía sau, kèm một dải khói vàng mềm và vài điểm lấp lánh. Nhìn từ 3/4: một cột dải vàng xoắn nối từ trời tới xúc xắc.

## Cấu trúc
| Phần | Vai trò | Hình dáng | Bắt buộc |
|---|---|---|---|
| Dải từ góc | **xương sống**: 8 góc mỗi góc một dải (ribbon) | mảnh, lõi vàng sáng, mép mềm, nở dần ra ngoài + xoắn nhờ xúc xắc xoay, thon về đuôi | **có** |
| Khói vàng | thân vệt dài phía sau | khối mềm vàng nhạt, nở dần, tan | có |
| Quầng | halo quanh xúc xắc | cầu mềm vàng, không che mặt xúc xắc | có (nhẹ) |
| Tia vụn | vệt tia ngắn bắn ra từ góc | gạch mảnh Stretched | nên có |
| Lấp lánh | sao 4 cánh nhấp nháy dọc vệt | nhỏ, thưa | nên có |

## Chuyển động / nhịp
Rơi ~0.8 s (gia tốc, nhanh dần), xoay ~1.2 vòng (540°/s). Vệt dài ~5–6 m ngược lên; tan sạch trong ~0.5 s sau khi xúc xắc dừng. Vệt thuộc không gian thế giới (để lại sau lưng), gốc dải dính vào góc xúc xắc.

## Bất biến (mất là không còn là nó)
- Dải **xuất phát từ các góc** của xúc xắc (nhìn rõ nhiều dải, không phải một cái đuôi chung từ tâm).
- Dải **liền mạch, mảnh, xoắn**, thon dần về đuôi; không phải chuỗi đốm rời, không phải thanh thẳng cứng.
- **Màu vàng** (theme Hero), lõi sáng hơn mép; không trắng xanh, không cam đỏ.
- Có **khói vàng dài** (docs: "long golden smoke trail") và **lấp lánh**.
- Bám theo xúc xắc (root gắn vào xúc xắc), không đứng yên tại chỗ spawn.

## Được đổi
Màu vàng (vàng chanh / vàng đồng), số dải, độ dài vệt, độ xoắn, mật độ lấp lánh, chất khói (bụi vàng / khói mềm).

## Lỗi biến thể / lỗi dự đoán
- **Ribbon (Trails mode Ribbon): vị trí 0 của width / color over trail là đầu CŨ (đuôi), 1 là đầu mới** (sát hạt gốc). Đặt ngược thì dải dày + cụt phẳng ở xa xúc xắc, mảnh ở sát (reviewer 2026-11-25). Thêm: Noise + hướng ngẫu nhiên của cone + rate over time cho ra dây zig-zag giống **tia sét** (bản thử 1–2 bị chê): dùng rate over distance, không Noise, cone góc ~1°, texture dải mềm `trail_ribbon_019` (không dùng `trail_streak_005` làm ribbon: mảnh như dây điện).
- Ribbon (Trails) cần `renderMode None` ở hạt gốc, nếu không hiện thêm chuỗi chấm dọc dải.
- Texture dải có đầu / đuôi thon theo U: lấy khúc giữa (tiling X 0.4) để thân dải không bị tối đầu.
- Rate over distance không chạy khi chụp Simulate bằng bước lớn: dùng bước 1/60 s hoặc rate over time.

## Biến thể đã làm
- `Assets/VFX/LuckyDice/Prefabs/VFX_DieTrail.prefab` (2026-11-25, order sondh_docs, chờ art lead).
