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
- Một chớp, một ngữ cảnh (**ground**, art lead 2026-11-25: tâm nổ ở y ≈ 0 chạm sàn, không lơ lửng trên không): chớp là đĩa + sao **nằm trên sàn** (Billboard + Local) cộng một lõi nhỏ đứng với Pivot (0,0.5,0) để đáy ở y = 0; bụi phát từ sàn.
- Thân là **bụi vàng mềm tan thành hạt**, không phải lửa cam / khói xám / khối cầu sần.
- **Có lấp lánh** trong bụi; có **chớp + tia gai + vòng gai** ở lúc nổ (đúng ref nổ vàng).
- Màu vàng theme Hero xuyên suốt (lõi trắng vàng, bụi vàng nhạt → vàng đậm).
- Bán kính ~4 m; hết sạch ~1.5 s.

## Được đổi
Màu vàng, lượng bụi, số tia gai / lấp lánh, bán kính, có / không chip mảnh xúc xắc, kiểu bụi (cuộn / bốc cột).

## Lỗi dự đoán
- **Bụi như mây bay lên từ điểm nổ** (Hoàng 2026-11-26, v9): tốc độ đầu thấp + vận tốc bốc lên + vòm bụi bốc lên + bụi nở to chậm. Vụ nổ = **bắt đầu nhanh, tỏa chậm dần**, gần như nằm ngang mặt đất: tốc độ đầu 16–24 m/s, `velocityOverLifetime.speedModifier` giảm về ~0.03, bốc lên ≤ 1 m/s, alpha vào nhanh rồi tan tại chỗ; hạt chậm lấp tâm (đừng để vòng rỗng). Vòng lan dưới đất nên to hơn đám bụi một chút (bán kính vòng ~1.3–1.5× bụi).
- **Nổ lơ lửng trên không** (art lead 2026-11-25, v2–v3): nâng tâm chớp lên y 1.6–1.8 và bụi lên y 1.0 để sàn khỏi cắt billboard thì mất ngữ cảnh ground. Đừng nâng tâm; dùng lớp nằm đất (Local) và **Pivot (0,0.5,0)** (đáy quad = vị trí hạt) cho billboard đứng; pivot quay theo quad nên startRotation = 0.
- **Billboard bị mặt đất cắt**: hạt billboard cỡ lớn có tâm sát y = 0 thì nửa dưới chìm dưới sàn và lộ cạnh phẳng / chữ nhật. Nâng tâm lên ≥ nửa kích thước (chớp 1.6–1.8 m, bụi phát từ y = 1 m); preview dựng sàn thật mới thấy.
- Drag của Limit Velocity mặc định nhân theo kích thước hạt (`multiplyDragByParticleSize`): hạt to bị phanh quá mạnh, bụi không toả được. Dùng Speed Modifier của Velocity over Lifetime để điều khiển tầm toả.
- Bụi ra màu bùn / khói bẩn nếu alpha blend vàng sẫm: giữ vàng sáng + hạt cộng sáng bên trong.
- Chớp + quầng cháy trắng kín khung: chớp ≤ 6 m, alpha đỉnh ≤ 0.9, ≤ 0.3 s.
- Stretched hạt tia: texture symmetric nên không lệ thuộc hướng, nhưng vẫn không xoay ngẫu nhiên thủ công.

## Biến thể đã làm
- v14 (Hoàng 2026-11-26): bụi nhỏ thêm ~10% (Dust / DustLow tốc độ và size ×0.9), viền đất giữ như v13.
- v13 (Hoàng 2026-11-26): vòng / viền đất to hơn (Ring 14 m, Ring2 12.5 m, Pool 12 m), cụm bụi nhỏ lại (~−25%) để viền tròn trên đất lộ rõ.
- v12 (Hoàng 2026-11-26): bụi **bắt đầu bé đi sau khi tản xa** (Dust size 0.45 → 1 (25%) → 0.8 → 0.3, DustLow tương tự); số hạt giữ như v10.
- `Assets/VFX/LuckyDice_v10/Prefabs/VFX_DieExplosion_v10.prefab` (2026-11-26, Hoàng): bụi theo đặc tính nổ (xem Lỗi dự đoán), vòng đất to hơn (Ring 11 m).
- `Assets/VFX/LuckyDice/Prefabs/VFX_DieExplosion.prefab` (2026-11-25, order sondh_docs, chờ art lead). v4: nổ chạm sàn (chớp = đĩa + sao nằm đất + lõi nhỏ đứng pivot đáy y = 0, bụi phát từ sàn).
