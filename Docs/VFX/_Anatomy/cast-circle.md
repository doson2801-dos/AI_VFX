# CastCircle — vòng phép dựng đứng trước tay
Độ chắc: suy từ order + Plan (chưa có ref art lead) · Cập nhật: 2026-11-25 · Nguồn: `Docs/VFX/CastCircle/Plan.md`, `heal-circle.md`

## Nó là gì
Vòng phép **dựng đứng** ở trước tay người cast, mặt hướng ra trước (+Z), đường kính ~1.4 m, tâm cao ~1.3 m; 3 vòng đồng tâm xoay xen kẽ, nở ra, nháy sáng, hạt bắn ra phía trước, tan; ~1.2 s, tông xanh dương-cyan.

## Cấu trúc
| Phần | Vai trò | Hình | Bắt buộc |
|---|---|---|---|
| RingOuter / Mid / Inner | 3 vòng xoay xen kẽ (+80 / -130 / +210 °/s) | vành vạch, vòng hoa văn, sao 5 cánh | **xương sống** |
| Glow | đĩa sáng nền | glow tròn | có |
| Flash + Shock | một chớp t=0.6 s + vành sóng nở | glow, ring mảnh | có |
| Motes / Sparkles | hạt bắn ra +Z, sao quanh viền | chấm, sao 4 cánh | có |

## Bất biến
- Vòng **đứng**, pháp tuyến +Z (ra phía trước), không nằm đất; 3 vòng đồng tâm đọc được, xoay xen kẽ chiều.
- Dựng đứng bằng Billboard + Render Alignment Local trên object không xoay; **không Vertical Billboard**.
- Một chớp (t ~ 0.5 vòng đời), hạt thả ra phía trước = phép được phóng đi.
- Bám người cast (simulation Local), ngắn ~1.2 s.

## Được đổi
Màu, họa tiết 3 vòng, kích thước, nhịp nở / chớp, hạt thả (tia, sao, khói nhẹ).

## Lỗi đã gặp
- Nhìn từ camera sau lưng (3/4 40°), hạt bay +Z đi xa camera nên thu nhỏ và lẫn vào tâm vòng: kiểm hạt bằng camera bên (`Docs/VFX/CastCircle/Preview_side.png`). Hạt 0.04-0.1 m gần như không thấy; đã nâng lên 0.1-0.2 m, 36 hạt.
- **SAI KHÔNG GIAN trong Showcase (art lead 2026-11-25)**: camera Showcase nhìn dọc +Z, instance không xoay nên vòng (pháp tuyến +Z) hiện **thẳng mặt từ sau lưng**, không đọc ra "dựng đứng trước tay, hướng ra trước". Cách sửa: prefab giữ hướng ra trước = +Z (chuẩn nhân vật), còn **cách đặt** xoay instance Y 45° (`VfxShowcaseBuild.Place`, focusOffset (0.6, 0, 0.6)) để vòng thành ellipse ~0.7 rộng, chớp / Motes bay ra phía trước-phải. Luôn kiểm bằng camera Showcase thật, không chỉ camera preview của builder; hướng gốc +Z chỉ đúng khi nhìn từ bên hoặc phía trước.
- Vòng đứng nhìn 40° bị dẹt theo chiều cao ~cos40 = 0.77 (không phải lỗi).

## Biến thể đã làm
Chưa có (2026-11-25: bản gốc CastCircle, tông xanh dương-cyan).

## Luật art lead 2026-11-25
Không thêm decal vỡ địa hình vào vòng phép trừ khi art lead yêu cầu.
