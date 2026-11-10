# _Anatomy — tạo hình chuẩn của từng loại VFX (2026-11-10)

Mục đích: **một biến thể phải còn nhận ra là cùng hiệu ứng**. Đổi nguyên tố / chất liệu / mesh / bố cục / timing là được, nhưng **tạo hình cốt lõi** của đối tượng (cái làm người xem gọi tên nó) phải giữ. Mỗi loại VFX có một file ở đây ghi: nó gồm những gì, hình dáng ra sao, cái gì **không được mất**, cái gì **được đổi**. Tra ngay, không research lại.

Luật gốc: `.claude/rules/vfx-art-lead.md` mục "Khác biệt giữa các effect" + "Tạo hình trước khi làm".

## Khi nào dùng

1. **Trước khi lên kế hoạch** mọi effect mới hoặc biến thể: mở `_Anatomy/<loại>.md`, chép mục "Bất biến" vào kế hoạch.
2. **Chưa có file cho loại đó** (hoặc Claude chưa hiểu rõ đối tượng): **research trước khi làm** (xem dưới), tạo file theo mẫu, thêm vào bảng chỉ mục, rồi mới lên kế hoạch.
3. **Sau khi dựng**: đối chiếu preview với mục "Bất biến" và "Lỗi biến thể đã gặp". Thiếu một bất biến = chưa xong.

## Cách research (khi chưa có file)

Thứ tự nguồn: (1) prefab / texture tham chiếu của art lead hoặc rpg-game (xem `vfx-shader/references/study-reference.md`); (2) ảnh / video / JSON art lead đưa; (3) web: `vfx-shader/references/web-research.md` (3–5 nguồn VFX tương tự: GIF, breakdown, asset pack); (4) tài liệu cũ trong `Docs/VFX/<Effect>/Plan*.md`.
Phải trả lời được: **nó gồm mấy phần, phần nào là xương sống, nhìn từ camera 3/4 thấy hình gì, chuyển động ra sao theo thời gian, thiếu phần nào thì không còn là nó**. Không trả lời được thì hỏi art lead (≤ 2 vòng), không đoán rồi làm.
Lưu kết quả ngay khi xong (file mới + dòng trong bảng bên dưới), kèm **nguồn** và độ chắc (đã xác nhận bởi art lead / suy từ prefab / suy từ tài liệu / giả định).

## Quy tắc thêm từ việc làm lại (2026-11-10, art lead)

- **Texture sheet có hướng thì không spam**, không hướng thì spam được (`Docs/VFX/_Library/LIBRARY.md`, nhãn ở `library_direction.csv`).
- **Mesh có đầu-đuôi bay theo quỹ đạo** phải quay mũi theo hướng bay.
- **Không mượn mesh của effect khác** nếu làm đổi tạo hình (aura → cột lốc xoáy là sai).
- Texture không alpha thật → làm bản copy có alpha, mờ mép, Wrap Clamp (viền vuông).
- Thấy mơ hồ về cách dựng một đối tượng: **học prefab tham chiếu của art lead trước**, không đoán từ mesh / texture có sẵn.

## Mẫu file `<loại>.md`

```
# <Tên loại VFX>
Độ chắc: <art lead xác nhận | suy từ prefab/doc | giả định> · Cập nhật: <ngày> · Nguồn: <đường dẫn / link>

## Nó là gì (1–2 câu, nhìn thấy gì)
## Cấu trúc: các phần (xương sống / phụ)
| Phần | Vai trò | Hình dáng | Bắt buộc? |
## Chuyển động / nhịp (timing)
## Bất biến (mất là không còn là nó)
## Được đổi (nguyên tố, chất liệu, mesh, bố cục, timing, lớp phụ)
## Lỗi biến thể đã gặp (và cách tránh)
## Biến thể đã làm (prefab, khác gốc ở đâu)
```

## Chỉ mục

| Loại | File | Độ chắc |
|---|---|---|
| Vệt chém 360° | `slash360.md` | suy từ Plan + preview |
| Gai đâm lên từ đất | `ice-spike-fan.md` | suy từ Plan + preview |
| Vòng hồi máu | `heal-circle.md` | suy từ Plan + preview |
| Sét đánh xuống (cột sét) | `lightning-strike.md` | suy từ Plan |
| Aura ôm vật thể (găng) | `aura-gauntlet.md` | suy từ Plan_Variants (bản gốc không có Plan) |
| Cầu ném bay cung rồi nổ | `fireball-throw.md` | suy từ Plan |
| Sét tím từ trời (tích rồi nổ) | `violet-thunder.md` | suy từ Plan |
| Lốc xoáy đứng | `tornado.md` | suy từ Plan + yêu cầu art lead 2026-11-10 |
| Tạo hình đặc trưng theo chất liệu / nguyên tố | `materials.md` | kiến thức chung, chỉnh khi art lead chốt khác |
