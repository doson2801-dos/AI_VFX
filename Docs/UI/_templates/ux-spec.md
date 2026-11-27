# UX spec: <Tên màn hình / tính năng>

- Slug: `<feature>` · Ngày: YYYY-MM-DD · Người viết: ux-designer
- Nguồn: brief `<đường dẫn>` · ảnh demo / UI sheet `<đường dẫn>` · code hiện có `<đường dẫn>`
- Nguồn thiếu: <liệt kê, hoặc "không">

## 1. Mục đích
Người chơi đến màn này khi nào, đang làm gì, cần biết / làm được gì. Một đoạn ngắn.

## 2. Khung và tỉ lệ
- Khung tham chiếu: <540×960 dọc, gốc trên trái, y xuống>
- Tỉ lệ cần hỗ trợ: <9:16, 9:19.5, ...>; phần thừa: <letterbox / giãn nền>
- Canvas Scaler: <ScaleWithScreenSize + Expand, ...>

## 3. Bố cục
Bảng phần tử, toạ độ theo khung tham chiếu (x, y, w, h):

| Phần tử | Rect | Sprite / kiểu | Ghi chú |
|---|---|---|---|
| | | | |

Wireframe (ASCII hoặc đường dẫn ảnh):

```
```

## 4. Trạng thái
Với từng trạng thái (nghỉ, đang thao tác, bị khoá, lỗi / rỗng, kết thúc): phần tử nào đổi, đổi thế nào (hiện / ẩn, tint, chữ).

## 5. Tương tác và input
| Hành động | Phím | Chạm / chuột | Khi nào bị khoá | Gọi tới (API / event logic) | Mẫu |
|---|---|---|---|---|---|
| | | | | | `<tên mẫu>` / MỚI |

UI không giữ trạng thái game: mọi hành động đi qua cột "Gọi tới".

## 6. Phản hồi và chuyển động
Phản hồi cho mỗi hành động (nhấn, kết quả, lỗi): hình, thời lượng, có bỏ qua / tăng tốc được không.

## 7. Chữ hiển thị
Mọi chuỗi người chơi thấy, gom một bảng (khoá → nội dung). Chữ nướng sẵn trong ảnh ghi rõ.

## 8. HUD (chỉ khi là HUD)
- Ngân sách: số phần tử tối đa, vùng màn hình dành cho HUD, độ mờ tối đa đè lên vùng chơi.
- Phần tử nào luôn hiện, phần tử nào chỉ hiện theo sự kiện.

## 9. Accessibility
- Mức: <theo Docs/UI/accessibility-requirements.md> hoặc **Mức giả định: Basic** (file chưa có).
- Cỡ chữ tối thiểu, tương phản, vùng chạm tối thiểu, trạng thái không chỉ bằng màu, chuyển động giảm được không.

## 10. Câu hỏi mở
Điều thiếu làm đổi cách chơi / bố cục, chờ người dùng quyết.

---

## Checklist review (Phase 1c)
- [ ] Đủ 10 mục; mục bỏ có lý do.
- [ ] Mọi phần tử trong ảnh demo có trong bảng bố cục (hoặc ghi rõ cố ý bỏ).
- [ ] Toạ độ nằm trong khung, không chồng lấn ngoài ý muốn; vùng chạm ≥ mức tối thiểu.
- [ ] Mỗi hành động có cả phím và chạm, có trạng thái bị khoá.
- [ ] Mọi hành động gọi qua logic, UI không tự giữ trạng thái game.
- [ ] Đủ trạng thái nghỉ / thao tác / khoá / lỗi / kết thúc.
- [ ] Chữ gom một bảng; chữ nướng trong ảnh được ghi.
- [ ] Accessibility có mức (cam kết hoặc giả định ghi rõ).
- [ ] Không có tính năng ngoài brief.

Verdict: APPROVED / NEEDS REVISION / NOT ASSESSED
