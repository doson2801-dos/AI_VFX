# Bảng tiến độ: Gatefall (tên tạm)

- Brief: `docs/briefs/gatefall.md`
- Giai đoạn: Cơ chế
- Việc tiếp theo: QA nghiệm thu C2

## Cơ chế
| # | Cơ chế | Programmer | QA | Vòng sửa | Ghi chú |
|---|---|---|---|---|---|
| C1 | Lõi bàn cờ xác định | Xong | Đạt 12/12 | 0 | 137/137 test. C3 phải thay hành vi tạm khi `tiltsLeft === 0` |
| C2 | Bốn cửa nạp | Xong | Đang kiểm | 0 | 8 tiêu chí, điểm khác biệt. 1 test C1 cần QA xét lại |
| C3 | Mục tiêu, thắng thua, xả bàn | Chưa làm | Chưa kiểm | 0 | 8 tiêu chí |
| C4 | Phép đo bằng bot | Chưa làm | Chưa kiểm | 0 | 9 tiêu chí. Không đạt C4.6 sau khi tune thì dừng trước C5 và báo người dùng |
| C5 | Hiển thị và diễn hoạt | Chưa làm | Chưa kiểm | 0 | 5 tiêu chí |
| C6 | Điều khiển, thử lại, 3 màn | Chưa làm | Chưa kiểm | 0 | 12 tiêu chí |

## Câu hỏi mở cho người dùng
- Chưa có.

## Quyết định đã chốt
- Nguồn: `reports/Nghiên cứu gameplay match 3.md`, hướng 1 (nghiêng trọng lực).
- Rà soát tiền lệ ngày 2026-11-23: luật vuốt để cả bàn trượt rồi nổ cụm 3 đã có ở Gravity (itch.io), Three Swipes, Weird Gravity. Nghiêng hoặc xoay bàn cũng có ở Bloktonik, Tisnart Tiles, GravBlocks+, Verto, Shift Shaft. Không coi nghiêng trọng lực là điểm mới.
- Điểm khác biệt tạm chốt do Producer đề xuất: bốn cửa nạp nhìn thấy trước. Mỗi cạnh bàn hiện các quân sẽ vào nếu nghiêng về hướng tương ứng. Chưa khẳng định là mới vì mới rà soát nhanh.
- Không dùng refill thiên lệch theo tình trạng thua. Mọi quân sắp vào đều nhìn thấy được.
- Producer chốt tạm các điểm brief mơ hồ do QA nêu ở C1, gửi Game Designer ghi vào brief ở bước chốt: lần nghiêng bị từ chối không đổi `lastChain`, `lastAnimMs`; `tiltStart.tiltsLeft` là giá trị sau khi trừ; khi khởi tạo lặp `(color + 1) % colorCount` tới khi hợp lệ; C1.10 dùng seed 1 đến 200.

## Nhật ký bàn giao
| Agent | Việc | Kết quả |
|---|---|---|
| Producer | Đọc báo cáo, rà soát tiền lệ | Xong, chọn hướng nghiêng trọng lực với bốn cửa nạp |
| Game Designer | Viết brief | Xong, 54 tiêu chí, 6 cơ chế, không có câu hỏi mở |
| Gameplay Programmer | Cài C1 | Xong, typecheck đạt, 91/91 test cũ đạt bằng config tạm ở cổng 5199 vì 5173 đang bận, chờ QA |
| QA Tester | Nghiệm thu C1 | Đạt 12/12, 137/137 test, lặp Gatefall 138/138, chưa chạy verify |
| Gameplay Programmer | Cài C2 | Xong, typecheck đạt, 136/137 test, test hỏng ghim giả định cửa rỗng sau lượt đầu, chờ QA |
