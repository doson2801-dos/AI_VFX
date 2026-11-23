---
name: define-goal
description: Biến ý tưởng hoặc yêu cầu mơ hồ thành mục tiêu cụ thể, đo được, có phạm vi và điều kiện dừng. Dùng trước khi viết brief, khi người dùng muốn đặt mục tiêu, làm rõ tiêu chí thành công, hoặc khi yêu cầu chỉ nói chung chung như "làm game hay hơn".
---

# Xác định mục tiêu

Chỉ dùng để định hình mục tiêu. Không tạo file kế hoạch, nhật ký hay snapshot riêng. Yêu cầu đã rõ thì làm luôn, không ép qua bước này.

## Một mục tiêu dùng được phải nêu
- Điều cụ thể sẽ đúng khi xong.
- Prototype, scene, cơ chế hoặc file liên quan.
- Bằng chứng: test, trường trong `window.__game.getState()`, lệnh, hoặc ảnh trong `artifacts/`.
- Ngưỡng số hoặc đạt/không đạt.
- Trong phạm vi, và ngoài phạm vi nếu dễ hiểu nhầm.
- Khi nào phải dừng và hỏi người dùng.

## Quy trình
1. Viết lại ý định thành một câu mục tiêu theo các điểm trên.
2. Gắn số khi số phản ánh thành công thật: tỉ lệ bot thắng, thời lượng màn, số lần thử, FPS, số lần chạy lặp.
3. Sửa mục tiêu yếu. Loại các mục tiêu chỉ tả hoạt động như "cải thiện", "tiếp tục xem", "làm cho vui hơn".
4. Chỉ hỏi **một** câu ngắn khi thiếu thông tin làm đổi kết quả hoặc cách kiểm chứng.
5. Bàn giao:
   - Producer đưa mục tiêu vào lời giao cho `game-designer`.
   - `game-designer` chuyển thành câu hỏi của prototype và tiêu chí mục 8 trong brief.

## Cách định lượng theo loại việc
| Loại việc | Cần nêu |
|---|---|
| Cơ chế mới | Tình huống và giá trị `getState()` mong đợi |
| Sửa lỗi | Tái hiện được trước, test đỏ rồi xanh |
| Cân bằng | Chỉ số, ngưỡng, số lượt bot, thông số trong `TUNING` |
| Hiệu năng | Chỉ số, ngưỡng, cách đo, số lần chạy |
| Hình ảnh | Ảnh cần xem, lỗi cần loại, người dùng là người duyệt |
| Nghiên cứu | Quyết định cần đưa ra, nguồn, mức bằng chứng |

## Ví dụ
Tốt:

> Trong prototype Gatefall, bot thắng màn 1 từ 60% đến 80% trên 50 lượt, thời lượng trung vị 45 đến 75 giây, chỉ đổi giá trị trong `TUNING`, và `npm run verify` đạt. Dừng hỏi nếu 3 vòng tune vẫn không vào khoảng này.

Yếu:

> Làm Gatefall cân bằng hơn.

## "Vui" không phải tiêu chí tự động
Test không kết luận được game có vui hay không. Hãy tách thành câu hỏi cho người chơi ở mục 9 của brief, và chỉ đo những hành vi có thể quan sát.

## Trước khi chốt, trả lời được
- Điều gì sẽ đúng khi xong?
- Bằng chứng nào chứng minh?
- Ngưỡng nào là thành công?
- Ranh giới phạm vi là gì?
- Khi nào phải dừng và hỏi?

Chuyển thể từ `define-goal` của openai/skills, xem `NOTICE.md`.
