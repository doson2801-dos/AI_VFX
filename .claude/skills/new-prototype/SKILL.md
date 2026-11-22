---
name: new-prototype
description: Biến một ý tưởng game 2D thành prototype Phaser chơi được và có test. Dùng khi người dùng đưa ý tưởng game mới, yêu cầu làm prototype, hoặc thêm cơ chế theo một brief trong docs/briefs.
---

# Làm prototype từ ý tưởng

Làm theo thứ tự. Luật chung nằm trong `CLAUDE.md`.

## 1. Chốt brief
- Tìm brief trong `docs/briefs/`. Nếu chưa có, tạo `docs/briefs/<ten-game>.md` từ `docs/GAME_BRIEF_TEMPLATE.md`.
- Tự điền phần suy ra được. Chỉ hỏi khi câu trả lời làm đổi core loop, điều kiện thắng thua hoặc nền tảng đích.
- Mỗi tiêu chí ở mục 8 phải đo được qua `window.__game`.
- Nếu ý tưởng giống một game có sẵn, giữ thể loại và cơ chế, nhưng dùng tên, nhân vật, hình ảnh, âm nhạc và màn chơi mới.

## 2. Chia cơ chế
Liệt kê các cơ chế nhỏ theo thứ tự phụ thuộc. Cơ chế đầu tiên là thứ trả lời câu hỏi ở mục 1 của brief. Không thêm gì ngoài mục "Có làm".

## 3. Làm từng cơ chế
Với mỗi cơ chế:
1. Thêm thông số vào `TUNING` và khoảng vào `TUNING_RANGES` trong `src/config.ts`.
2. Viết logic. Trạng thái mới phải có trong `getState()`.
3. Hỗ trợ cả phím và cảm ứng.
4. Viết test Playwright theo tiêu chí, đọc trạng thái qua `window.__game`. Dùng `setBot` hoặc `setInput` để test lặp lại được.
5. Chạy `npm run typecheck` và `npm test`.
6. Mở ảnh trong `artifacts/` để kiểm tra bố cục. Sửa xong mới sang cơ chế tiếp theo.

## 4. Kết thúc
1. Chạy `npm run verify`. Lệnh này gồm typecheck, test, build và kiểm tra code dev không lọt vào `dist/`.
2. Đánh dấu tiêu chí đạt trong brief.
3. Báo người dùng: tiêu chí nào đạt, tiêu chí nào chưa, điều gì chưa kiểm được (ví dụ điện thoại thật), và các điểm ở mục 9 cần họ tự chơi để đánh giá. Test tự động không kết luận được game có vui hay không.

## Git
Lịch 18:00 chỉ commit phần kiến thức. Code game phải commit riêng khi người dùng yêu cầu, chỉ trên nhánh `game-ai-prototype`. Không bao giờ push hay merge vào `main`.
