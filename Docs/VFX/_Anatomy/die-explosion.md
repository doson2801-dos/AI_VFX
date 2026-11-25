# DieExplosion — xúc xắc nổ tan thành bụi vàng (skill Lucky Dice)
Độ chắc: **suy từ ảnh ref art lead (docs Hero – Lucky God, mục IV "Die explosion": nổ vàng nền đen, gai toả, vòng gai dưới đất) + mô tả docs**; link Adobe Stock "golden particle ring rotating and exploding" bị chặn 403 nên chưa xem video · Cập nhật: 2026-11-25 · Nguồn: `work/vfx_orders/20261125_sondh_docs/image.png`, docs Google ("xúc xắc rơi phát nổ tại mục tiêu, tan biến thành đám bụi màu vàng cùng theme với hero, trong bụi có vài điểm lấp lánh")

## Nó là gì
Xúc xắc chạm đất: **một chớp vàng-trắng**, **vòng gai lan nằm đất**, chùm **tia gai** bắn nửa cầu; sau chớp là **đám bụi vàng** nở ra rồi tan thành hạt mịn sáng, **vài điểm lấp lánh** nhấp nháy trong bụi. Kết thúc sạch, không còn xúc xắc.

## Cấu trúc
| Phần | Vai trò | Hình dáng | Bắt buộc |
|---|---|---|---|
| Chớp | đúng một chớp 0–0.3 s | cầu sáng + sao 8 gai vàng trắng | **có** |
| Vòng gai nằm đất | sóng lan ra ~4 m | vòng tia gai mờ (Billboard Local) | có |
| Tia gai | bắn nửa cầu từ điểm chạm | gạch mảnh vàng, ngắn, nhanh | có |
| Bụi vàng | **xương sống**: thân vụ nổ | nhiều mảng mềm nở ra theo mặt đất rồi bốc lên, tan | **có** |
| Hạt vàng mịn | bụi sáng trôi lên | chấm nhỏ cộng sáng | có |
| Lấp lánh | "vài điểm" | sao 4 cánh nhấp nháy trong bụi | **có** |
| Quầng nền | ánh vàng trên đất | đĩa mềm | nên có |

## Nhịp (~1.5 s)
Chớp 0 → 0.3 s · vòng gai 0–0.7 s · tia gai 0–0.4 s · bụi nở 0–0.6 s, bốc và tan tới ~1.5 s · lấp lánh rải 0.1–1.4 s.

## Bất biến
- Một chớp, một ngữ cảnh (ground).
- Thân là **bụi vàng mềm tan thành hạt**, không phải lửa cam / khói xám / khối cầu sần.
- **Có lấp lánh** trong bụi; có **chớp + tia gai + vòng gai** ở lúc nổ (đúng ref nổ vàng).
- Màu vàng theme Hero xuyên suốt (lõi trắng vàng, bụi vàng nhạt → vàng đậm).
- Bán kính ~4 m; hết sạch ~1.5 s.

## Được đổi
Màu vàng, lượng bụi, số tia gai / lấp lánh, bán kính, có / không chip mảnh xúc xắc, kiểu bụi (cuộn / bốc cột).

## Lỗi dự đoán
- Bụi ra màu bùn / khói bẩn nếu alpha blend vàng sẫm: giữ vàng sáng + hạt cộng sáng bên trong.
- Chớp + quầng cháy trắng kín khung: chớp ≤ 6 m, alpha đỉnh ≤ 0.9, ≤ 0.3 s.
- Stretched hạt tia: texture symmetric nên không lệ thuộc hướng, nhưng vẫn không xoay ngẫu nhiên thủ công.

## Biến thể đã làm
- `Assets/VFX/LuckyDice/Prefabs/VFX_DieExplosion.prefab` (2026-11-25, order sondh_docs, chờ art lead).
