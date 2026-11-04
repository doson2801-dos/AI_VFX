# Định hướng ban đầu: phân tích, không gian hoạt động, thành phần

Đọc ở bước 2 của SKILL.md, trước khi kiểm tra shader hay viết code. Lấy từ phần khai thác yêu cầu và Shape Specification của dynamic-vfx-prompt-builder (2.0.0), viết lại cho cách làm bằng shader.

Mục tiêu: trước khi dựng, biết rõ **effect là gì, nằm ở đâu trong game, gồm những phần nào, chạy theo thời gian ra sao**. Thiếu bước này, shader đúng kỹ thuật nhưng sai quy mô, sai góc nhìn hoặc thiếu lớp (ví dụ Meteor bản đầu: nhỏ, không rõ camera, không rõ chạm đất ở đâu).

## 1. Phân tích brief (tự làm, không hỏi)

Đọc mô tả, ảnh/video tham chiếu (Read) và JSON Shape Lab nếu có. Viết gọn 4 dòng:

- **Effect là gì:** vai trò gameplay (đòn đánh, buff, cảnh báo, trang trí) và cảm giác chính (mạnh/nhẹ, nhanh/chậm, nóng/lạnh).
- **Tâm điểm:** phần nào phải đọc rõ nhất; phần nào là phụ.
- **Hướng lực:** từ đâu tới đâu (rơi xuống, toả ra, bay thẳng, xoáy, bốc lên).
- **Nguồn thông tin:** đã chốt (người dùng nói) / quan sát được (thật sự thấy trong ảnh) / đề xuất (Claude) / chưa rõ. Không nâng đề xuất thành lựa chọn của người dùng. Ảnh tĩnh không cho biết timing.

## 2. Hỏi phần còn thiếu

Chỉ hỏi những gì **làm thay đổi thiết kế** và brief chưa trả lời. Bỏ câu đã có đáp án. Gom vào **tối đa 2 lượt**.

**Cách hỏi:**
- Ưu tiên bảng chọn `show_widget` (gọi `read_me` module `elicitation` trước lần đầu). Bảng gồm các nhóm radio/checkbox, ô ghi chú tuỳ chọn và một nút "Gửi lựa chọn" dùng `sendPrompt(text)`. Text gửi đi phải chứa brief và từng nhóm đã chọn.
- Không dùng được widget thì dùng `AskUserQuestion`: ≤ 4 câu mỗi lượt, `multiSelect` cho các thành phần độc lập.
- Lựa chọn chưa gửi không phải là đáp án. Gợi ý của Claude ghi là *đề xuất*.

### A. Không gian hoạt động (luôn xác định)

| Nhóm | Lựa chọn gợi ý | Ảnh hưởng tới shader / dựng |
|---|---|---|
| Góc camera game | Top-down · Isometric / 3/4 · Ngang (side-view) · Góc thứ 3 sau lưng · UI / màn hình | Hướng quad (billboard / nằm đất / theo vận tốc), có cần nhìn nhiều góc không, camera preview |
| Neo vào đâu | Một điểm trong thế giới · Bám nhân vật / bone · Bám vũ khí · Nối 2 điểm (nguồn → đích) · Màn hình (UI) | Simulation space Local / World, follow, cách đặt pivot |
| Mặt phẳng hiển thị | Đứng quay về camera · Nằm sát mặt đất · Dọc theo hướng bay · Vòng quanh đối tượng | Renderer mode: Billboard / Horizontal Billboard / Stretched / Mesh; UV theo trục nào |
| Quy mô | So với nhân vật cao ~2 m: nhỏ (< 0.5 m) · vừa (1–2 m) · lớn (3–6 m) · rất lớn (> 6 m) | Size quad, độ mảnh tối thiểu của nét (đọc được ở kích thước màn hình), overdraw |
| Di chuyển | Đứng yên · Bay thẳng · Quỹ đạo cong / rơi · Bám theo mục tiêu | Particle velocity / script, effect có để lại vết (World) không |
| Nền phía sau | Tối · Sáng · Nhiều màu / đổi liên tục | Additive (chỉ hợp nền tối) hay Alpha; có cần viền tối để tách nền |

### B. Thời gian

- Kiểu phát: **một lần** (impact, nổ) / **lặp** (aura, lửa) / **bay + chạm** (projectile).
- Thời lượng đề xuất (giây), có đơn vị. Nếu có gameplay: thời điểm hiệu lực (ví dụ chạm đất ở 0.9 s).
- Nhịp: **chuẩn bị → đỉnh → tan**. Lớp sáng nhất ở đầu đỉnh.

### C. Thành phần (component / layer)

Đề xuất danh sách lớp theo loại effect, cho người dùng tích chọn (checkbox). Không tự thêm damage, rung camera, decal, mảnh vỡ nếu chưa được chọn.

| Loại effect | Thành phần thường có (chọn những gì cần) | Câu hỏi rẽ nhánh |
|---|---|---|
| Projectile / thiên thạch | Thân (đầu sáng) · Đuôi / trail · Tia lửa bắn theo · Quầng sáng · Impact khi chạm · Vòng xung kích · Khói sau nổ · Vết cháy trên đất | Quỹ đạo thẳng hay cong? Chạm đất hay trúng mục tiêu? |
| Nổ / impact | Flash · Cầu lửa / lõi · Vòng xung kích · Tia bắn toả · Khói · Vết trên đất | Nổ trên không hay sát đất (có vòng nằm đất / decal không)? |
| Beam / sét | Thân tia · Lõi sáng · Đầu phát · Điểm trúng · Nhánh phụ | Liên tục hay theo nhịp? Hai đầu bám mục tiêu hay cố định? |
| Aura / buff / shield | Vòng dưới chân · Màn bao quanh · Hạt bay lên · Viền sáng · Hiệu ứng bật/tắt | Bám nhân vật hay đứng yên? Có phản ứng khi trúng đòn không? |
| AoE / cảnh báo | Vùng đất · Viền vùng · Đếm ngược · Hiệu ứng kích hoạt | Hình tròn / quạt / chữ nhật? Phân biệt phe? |
| Slash / chém | Vệt chém chính · Mép sáng · Mảnh vụn · Flash điểm trúng | Theo vũ khí hay vệt cố định? |
| Lửa / khói loop | Thân lửa · Lõi · Tàn lửa · Khói trên · Quầng | Gió / hướng bốc? Có tắt dần khi dừng không? |
| Portal / triệu hồi | Vòng chính · Xoáy bên trong · Hạt hút vào · Mở → giữ → đóng | Đứng hay nằm đất? |
| Khác | Cái gì xuất hiện, biến đổi thế nào, kết thúc ra sao? | Tạo câu theo cơ chế vừa hiểu |

### D. Phong cách và màu

- **Art Style** (bắt buộc có trạng thái rõ): Stylized · Anime / cel-shaded · Realistic · Hand-painted · Pixel art · Theo dự án / tham chiếu · "Tuỳ Claude" (thì đề xuất và ghi *đề xuất*).
- Bảng màu chủ đạo (2–3 tông: lõi / giữa / mép). Toon có dải màu cứng hay chuyển mềm.

## 3. Hình cấu trúc (trước khi chia layer)

Vẽ **một sơ đồ cấu trúc đơn giản** bằng SVG qua `show_widget` (hoặc Artifact):
- khối chính nằm đâu, lớp nào trước / sau;
- silhouette tổng, tỷ lệ so với nhân vật (vẽ một hình người ~2 m làm thước);
- hướng lực bằng mũi tên, mặt đất nếu có, góc camera đã chọn.

Ghi rõ "Sơ đồ cấu trúc — không phải asset". Không nhồi tên shader hay thông số vào hình. Có thể vẽ 2–3 mốc thời gian (chuẩn bị / đỉnh / tan) cạnh nhau khi chuyển động quan trọng.

## 4. Bảng thành phần

Sau hình cấu trúc, mỗi thành phần một dòng:

| ID | Thành phần | Vai trò | Mặt phẳng / carrier | Timing (s) | Kết thúc | Shader |
|---|---|---|---|---|---|---|
| L1 | Thân thiên thạch | chính | quad theo hướng bay, 1.2 m | 0–0.9 | tắt khi chạm | dùng lại `VFX/FX/Meteor` |
| L2 | Vòng xung kích | phụ | quad nằm đất, 4 m | 0.9–1.3 | mỏng dần, tan | mở rộng `VFX/FX/Blast` (+ `_GROUND`) |

Vai trò: chính / phụ / điểm nhấn. Cột Shader điền sau bước kiểm tra shader có sẵn (SKILL.md bước 3).

**Một shader hay nhiều lớp:**
- Gộp nhiều phần vào một shader trên một quad khi chúng cùng mặt phẳng, cùng tâm và chung timing. Cách này rẻ hơn ba quad chồng nhau.
- Tách lớp khi khác mặt phẳng (đứng / nằm đất), khác vị trí, hoặc khác blend.
