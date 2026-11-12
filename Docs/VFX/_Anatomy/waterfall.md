# Thác nước (stylized, môi trường loop)
Độ chắc: giả định, đã dựng 1 bản (Map6), chờ video ref của art lead · Cập nhật: 2026-11-12 · Nguồn: brief art lead (airport-tycoon S_Map6, mesh `Road_M6/Plane.037`) + kiến thức chung về thác toon

## Nó là gì
Mặt nước rơi thẳng có vệt sáng chạy từ trên xuống. Chân thác có bọt trắng sủi liên tục, từ đó gợn sóng tròn lan ra trên mặt nước. Effect loop, không có chớp.

## Cấu trúc
| Phần | Vai trò | Hình dáng | Bắt buộc? |
|---|---|---|---|
| Dòng chảy | xương sống | mesh phủ đúng mặt thác, texture vệt dọc chạy UV theo chiều rơi (V) | có |
| Mép tràn (lip) | phụ | dải bọt mảnh ở mép trên, nơi nước bắt đầu rơi | nên có |
| Bọt chân thác | xương sống | cụm blob trắng toon sủi lên rồi xẹp, bám dọc chân dải thác, không bay xa | có |
| Gợn sóng | xương sống | vòng tròn mảnh nằm trên mặt nước (Billboard + Local), sinh ở chân thác, nở ra rồi mờ | có |
| Giọt bắn / sương | phụ | vài giọt văng ngắn, sương mỏng | tuỳ |

## Chuyển động / nhịp
- Dòng chảy: liên tục, nhanh dần từ trên xuống (tốc độ UV hằng, có thể 2 lớp tốc độ khác nhau).
- Bọt: sinh liên tục, mỗi blob sống ~0.6–1.2 s, phồng to rồi co / mờ.
- Gợn sóng: mỗi vòng ~1.5–2.5 s, nở từ nhỏ đến ~2–3× chiều rộng dải thác, mờ dần theo bán kính; vài vòng chồng nhau lệch pha.

## Bất biến
- Chuyển động **từ trên xuống** trên mặt thác (không đứng yên, không chạy ngang).
- Bọt **nằm ở chân thác**, ngay mặt nước bên dưới, không lơ lửng giữa thác.
- Gợn sóng **nằm phẳng trên mặt nước** và **tỏa ra từ chỗ có bọt**.
- Loop liền, không có nhịp bùng.

## Được đổi
Màu (nước trong / đục / phép), độ dày vệt, số dải thác, có hay không có sương / giọt bắn, kiểu vòng (tròn đều / méo).

## Lỗi đã gặp
- **Đá chân thác che hết bọt** (Map6, 2026-11-12): map thường đặt tảng đá ngay chân thác, nhô ra ~0.6× bề rộng dải. Bọt đặt sát chân thì bị che. Cách tránh: dời bọt ra trước và hai bên đá (hộp phát ~1.15W × 0.75W), bọt ôm viền đá.
- **Blob trong sheet chỉ chiếm ~1/3 ô**: size hạt phải ~3× kích thước blob muốn thấy, nếu không chỉ ra chấm li ti.
- **Lưới bọt (`water_tile_002`) nằm phẳng nhìn như vết nứt**: bọt mặt nước dùng blob sheet nằm phẳng thay vì lưới.
- **Gợn sóng to hơn hồ thì tràn ra lơ lửng qua mép vách**: hồ nhỏ (bậc giữa) cần hệ số size riêng.
- Ảnh chụp bằng camera tạm làm nước stylized (shader dùng depth) hiện trắng, bọt trắng lẫn mất; kiểm tra bằng Scene view.

## Biến thể đã làm
- `VFX_Waterfall_Map6` (airport-tycoon S_Map6): bản gốc, toon, dòng chảy 2 lớp + bọt blob + gợn. Plan: `Docs/VFX/Waterfall_Map6/Plan.md`.
