# WindBurst — gió bùng quanh chân
Độ chắc: giả định từ brief + Plan + preview (art lead chưa xem) · Cập nhật: 2026-11-25 · Nguồn: `Docs/VFX/WindBurst/Plan.md`, `_Anatomy/heal-circle.md`, `_Anatomy/tornado.md`

## Nó là gì
Gió **bùng một lần quanh chân nhân vật** (ground, bán kính ~2.5 m, ~1.2 s): vòng gió lan ra nằm đất, vài dải gió xoắn quay quanh trục dọc bay lên, bụi và lá cuốn theo xoáy rồi tan.

## Cấu trúc
| Phần | Vai trò | Bắt buộc |
|---|---|---|
| Vòng gió nằm đất (WaveRing x2) | lan ra tới ~2.5 m | **xương sống** |
| Đĩa xoáy (Vortex) | xoáy xoay dưới đất | có |
| Dải xoắn (Streaks) | sọc gió quay quanh Y và bay lên | **xương sống** |
| Bụi + lá | cuốn theo xoáy | có |

## Bất biến
- Vòng gió **lan ra nằm đất** (Billboard + Local, X 90°), đọc được bán kính ~2.5 m.
- Dải gió **xoắn quanh trục dọc và bay lên**, thấy rõ (không chỉ là khói / bụi), cùng chiều quay với đĩa xoáy.
- Bụi + lá bay theo xoáy; **một lần**, tan sạch ~1.2 s. Không biến thành cột lốc đứng yên (đó là WindTornado).

## Được đổi
Màu, chất liệu hạt (cát, tuyết, hoa, lá), số dải, bán kính, độ cao xoắn.

## Lỗi đã gặp
- Dải quá dài / nhiều thành **gai nhím**; quá ngắn / ít thì **không thấy** (đã chỉnh qua 2 vòng: 5× dài, 0.2–0.3 m rộng, 23 dải).
- Edge / Loop không dùng được cho quét (xem wind-slash).
- Lá: Library không có ảnh lá thật, dùng `spark_shard_002` (xấp xỉ).
- Chiều xoắn dải vs đĩa Vortex mới kiểm bằng suy luận toạ độ, chưa bằng video.

## Biến thể đã làm
Chưa có (chỉ bản gió v1).
