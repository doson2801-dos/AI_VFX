# FireBreath — thổi lửa (kiểu Dragon Slave: sóng lửa phẳng thổi ra phía trước, để lại vệt cháy)
Độ chắc: **suy từ 6 khung thu nhỏ (320×180) của video ref Dota 2 "Lina Arcana - Fiery Soul of the Slayer", đoạn Dragon Slave 0:40 (Khải order 20261126_khaipd_thoilua); chưa tải được video đầy đủ (YouTube chặn), phần chưa thấy được ghi *đề xuất*** · Cập nhật: 2026-11-26 · Nguồn: `work/vfx_orders/20261126_khaipd_thoilua/ref/key_tiles.png`; liên quan `fire-wave-cast.md`, `flamethrower.md`, `materials.md` (lửa)

## Nó là gì
Nhân vật **thổi một đợt lửa ra phía trước**: một sóng lửa cam **phẳng, rộng, lao rất nhanh** theo một hướng (~8–10 m), **đầu sóng là khối sáng nhất** (ánh hồng-tím ở mép trước, như ref), thân sóng là lửa cam mờ có vân chạy dọc; sau khi sóng đi qua, **mặt đất còn vệt cháy đen + tàn lửa** vài giây rồi nhạt dần.

## Cấu trúc
| Phần | Vai trò | Hình dáng | Bắt buộc |
|---|---|---|---|
| Thân sóng (Wave body) | **xương sống** | lửa cam, hẹp ở nhân vật, **loe dần thành nón dẹt**, vân lưỡi lửa kéo dọc hướng bắn | **có** |
| Đầu sóng (Head) | cho thấy sóng "đang lao" | khối sáng nhất ở mép trước, lõi vàng trắng, viền hồng-tím; đi nhanh nhất | **có** |
| Vệt cháy (Scorch) | **dấu hiệu nhận ra Dragon Slave** | vệt đen nâu bám đất dọc đường sóng, rộng ~2 m, có tàn lửa đỏ rải trên đó | **có** |
| Tàn / tia lửa | sống động | mảnh lửa bay theo, rơi | có |
| Tụ + chớp nòng | báo trước | quầng sáng tụ ở miệng / tay ~0,25 s, chớp khi bắn | có |
| Khói nhiệt | đuôi | khói nâu ấm mỏng bốc lên từ vệt cháy | phụ |

## Nhịp (đề xuất)
Tụ 0,25 s → sóng lao ra tới ~9 m trong ~0,45 s (≈ 22 m/s, sóng rất nhanh) → thân tan trong 0,3 s sau đầu → vệt cháy + tàn lửa còn ~3–4 s rồi mờ. Tổng ~4,5 s. Một lần, không loop.

## Bất biến
- **Một sóng lửa rộng thổi ra phía trước theo một hướng**, hẹp ở nhân vật và loe ra; không phải cầu lửa, không phải vòng quanh người.
- **Đầu sóng sáng hơn thân và dẫn đầu** (đi nhanh nhất).
- **Để lại vệt cháy đen + tàn lửa trên đất sau khi sóng qua** (không có = không phải Dragon Slave, chỉ là lửa phụt).
- Màu: **cam đỏ, lõi vàng, đầu sóng ánh hồng-tím** (ref), bão hòa, stylized (Dota-like), không mờ nhoè thực tế.
- Nhìn ra **lửa** (lưỡi lửa có vân), không phải bóng glow trơn hay khói tròn.

## Được đổi
Màu nguyên tố (xanh hextech, tím), độ rộng nón, tầm, tốc độ, thời gian vệt cháy, có / không khói, mức tia lửa, chất liệu vệt (cháy đen / đóng băng / ăn mòn nếu đổi nguyên tố).

## Lỗi biến thể đã gặp
(chưa có; thêm khi build)

## Biến thể đã làm
- `Assets/VFX/FireBreath/` v1 (2026-11-26, order Khải): demo GIF, camera ref Dota ~60°; chưa vào `Included`.
