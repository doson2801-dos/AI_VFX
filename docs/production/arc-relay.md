# Bảng tiến độ: Arc Relay

- Brief: `docs/briefs/arc-relay.md`
- Giai đoạn: Xong, chờ người dùng chơi thử
- Việc tiếp theo: Người dùng đánh giá theo mục 9 của brief

## Cơ chế
| # | Cơ chế | Programmer | QA | Vòng sửa | Ghi chú |
|---|---|---|---|---|---|
| C1 | Vào game và cú phóng tia sét | Xong | Đạt 11/11 | 0 | Rơi hố tạm về điểm xuất phát, C3 sẽ thay |
| C2 | Nhịp nối cú phóng | Xong | Đạt 6/6 | 0 | Đo lại C2.3 và C2.6 sau khi sửa đồng hồ ở C3 |
| C3 | Thắng, thua và đồng hồ | Xong | Đạt 8/8 | 0 | Chưa kiểm được tab ẩn thật, cần thử tay |
| C4 | Chơi lại và cảm ứng | Xong | Đạt 7/7 | 0 | Đạt trên giả lập, chưa thử thiết bị thật |
| C5 | Hai hiệu ứng flipbook | Xong | Đạt 4/4 | 1 | Đã thêm timeout 3 giây cho từng sheet VFX |

## Câu hỏi mở cho người dùng
- Không có.

## Quyết định đã chốt
- Ý tưởng và tên Arc Relay do Producer đề xuất vì người dùng chưa nêu ý tưởng.
- Coin Hop giữ nguyên và là game mặc định. Arc Relay mở bằng `/?game=arc-relay`.
- Phiên hiện tại chưa nạp agent tùy chỉnh, nên các vai chạy bằng subagent thường, đọc đúng file vai trò và skill.
- Đồng hồ Arc Relay phải bám thời gian thực khi FPS thấp. QA đo được đồng hồ chỉ chạy 18% tốc độ thực khi khung hình bị chặn 90 ms. Xử lý ở C3.

- Giới hạn chấp nhận cho demo: ở máy rất yếu, vật lý chậm hơn đồng hồ trong 120 khung đầu và sau mỗi lần focus lại tab (41% khi chặn 40 ms, 18% khi chặn 90 ms). Bot vẫn thắng ở cả ba mức đo. Không mở rộng phạm vi để sửa, sẽ báo người dùng.
- Giới hạn cần báo người dùng: ở màn cảm ứng 844x390, nút phải che nhân vật tại điểm xuất phát tới khoảng `x=148`. Bố cục nút dùng chung với Coin Hop nên chưa sửa trong demo này.
- Bỏ qua bước Balance Tuner ở vòng này: thông số mặc định đã đạt mọi tiêu chí đo được, còn độ khó và cảm giác cần người chơi thử trước khi có mục tiêu để tune.

## Nhật ký bàn giao
| Agent | Việc | Kết quả |
|---|---|---|
| Game Designer | Viết brief | Xong, 36 tiêu chí, không có câu hỏi mở |
| Gameplay Programmer | Cài C1 | Xong, typecheck và 5 test Coin Hop đạt, chờ QA |
| QA Tester | Nghiệm thu C1 | Đạt 11/11, 20/20 test, chạy lặp 45/45 |
| Gameplay Programmer | Cài C2 | Xong, typecheck và 20/20 test đạt, chờ QA |
| QA Tester | Nghiệm thu C2 | Đạt 6/6, 30/30 test, chạy lặp 75/75 |
| Gameplay Programmer | Cài C3 | Xong, typecheck và 30/30 test đạt, chờ QA |
| QA Tester | Nghiệm thu C3 | Đạt 8/8, 56/56 test, chạy lặp 153/153, C2 đạt lại ở FPS thấp |
| Gameplay Programmer | Cài C4 | Xong, typecheck và 56/56 test đạt, chờ QA |
| QA Tester | Nghiệm thu C4 | Đạt 7/7, 78/78 test, chạy lặp 219/219, có 1 lỗi bố cục không chặn |
| VFX Artist | Tạo `arc-bolt`, `pylon-spark` | Xong, `--check` sạch, chờ gắn vào game |
| Gameplay Programmer | Gắn VFX (C5) | Xong, typecheck và 78/78 test đạt, chờ QA |
| QA Tester | Nghiệm thu C5 và kiểm tra cuối | 36/36 tiêu chí đạt, verify không đạt (90/91 test) vì request VFX treo |
| Gameplay Programmer | Sửa timeout tải VFX | Xong, typecheck và 91/91 test đạt, chờ QA |
| QA Tester | Kiểm tra cuối | Verify đạt, 36/36 tiêu chí, 91/91 test, chạy lặp 258/258, bản phát hành đạt |
