# SummonCircle — vòng triệu hồi
Độ chắc: suy từ order + Plan (chưa có ref art lead) · Cập nhật: 2026-11-25 · Nguồn: `Docs/VFX/SummonCircle/Plan.md`, `heal-circle.md`

## Nó là gì
Vòng phép **nằm đất**, bán kính ~3 m, nhiều lớp rune xoay xen kẽ chiều, **chùm tia nhọn dựng quanh viền**, một chớp trung tâm rồi tan; ~2.6 s, một lần, tông tím-đỏ. Ý nghĩa: nghi lễ triệu hồi (không phải hồi máu).

## Cấu trúc
| Phần | Vai trò | Hình | Bắt buộc |
|---|---|---|---|
| RuneOuter / Mid / Inner | 3 vòng xoay xen kẽ (+14 / -32 / +60 °/s) | vòng hoa văn, vành vạch, ngôi sao 5 cánh | **xương sống** |
| GroundGlow | quầng dưới vòng | glow tròn mềm, tím sẫm | có |
| RimBeams | 8 tia đứng quanh viền | nón nhọn, Stretched, gốc ở viền | có |
| CenterColumn + Flash + PulseRing | một chớp Impact t=1.2 s | cột trắng + chớp + vành sóng | có |
| Embers / Sparkles | tro, sao bay lên | chấm, sao 4 cánh | có |

## Bất biến
- >= 2 lớp rune xoay ngược chiều, tròn đều, nằm đất, tâm đúng giữa; vòng đọc được.
- Tia dựng từ **viền vòng** (chân tia đúng ở viền, không chìm đất); hạt bay lên.
- Một ngữ cảnh (ground), **một chớp** (cột giữa + Flash + vành sóng cùng lúc).
- Tông tối-đỏ/tím, hình nhọn; không mềm-xanh lá kiểu hồi máu.

## Được đổi
Màu (tím-đỏ <-> xanh lục tối, cam...), họa tiết rune, số tia (6-12), độ cao tia, nhịp mọc tia / chớp, hạt (tro / linh hồn / lửa).

## Lỗi đã gặp
- Quad Stretched nằm giữa hạt nên tia chìm nửa dưới đất: dùng pivot y = lengthScale/2 (như HealCircle_Arcane v3); preview xác nhận chân tia đúng ở viền.
- Texture tia hình nón nhọn nên dễ giống "gai"; nếu art lead muốn mềm hơn thì đổi `trail_streak_011` / `spark_streak_002`.
