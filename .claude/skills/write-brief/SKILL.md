---
name: write-brief
description: Viết hoặc cập nhật brief prototype game với core loop, phạm vi và tiêu chí đo được. Dùng khi có ý tưởng game mới, đổi thiết kế, hoặc cần chia brief thành các cơ chế.
---

# Viết brief

## Quy trình
1. Tìm brief trong `docs/briefs/`. Nếu chưa có, tạo `docs/briefs/<ten-game>.md` từ `docs/GAME_BRIEF_TEMPLATE.md`.
2. Viết **một** câu hỏi mà prototype phải trả lời, ví dụ: "Kéo dây để đu qua hố có vui sau 30 giây không?".
3. Tả core loop trong một dòng: người chơi làm gì, nhận gì, tiếp tục thế nào.
4. Cắt phạm vi tới mức nhỏ nhất vẫn trả lời được câu hỏi. Mặc định đưa menu, âm thanh, lưu tiến trình và nhiều màn vào "Không làm", trừ khi chúng chính là điều cần kiểm chứng.
5. Định nghĩa điều khiển cho cả phím và cảm ứng.
6. Lập bảng thông số với giá trị đầu và khoảng thử.
7. Viết tiêu chí và danh sách cơ chế theo hai phần dưới.

## Tiêu chí đo được
Mỗi tiêu chí ở mục 8 phải có dạng: **khi** tình huống, **thì** trường nào trong `window.__game.getState()` có giá trị gì.

- Tốt: "Khi chạm bẫy, `status` là `lost`."
- Tốt: "Bot thắng màn với `coins === totalCoins` trong dưới 30 giây."
- Không đạt: "Nhảy có cảm giác đã tay." Đưa loại này vào mục 9.

## Chia cơ chế
- Mỗi cơ chế làm và test được độc lập.
- Sắp theo phụ thuộc. Cơ chế đầu tiên là thứ trả lời câu hỏi chính.
- Ghi rõ tiêu chí nào thuộc cơ chế nào.

## Ranh giới
- Được dùng thể loại và cơ chế quen thuộc. Tên, nhân vật, hình ảnh, âm nhạc và màn chơi phải mới.
- Tự chọn giả định hợp lý và ghi lại. Chỉ nêu câu hỏi mở khi câu trả lời đổi core loop, điều kiện thắng thua hoặc nền tảng đích.
- Khi Producer gửi kết quả QA, đánh dấu tiêu chí đạt ở mục 8. Không đánh dấu nếu chưa có kết luận của QA.
