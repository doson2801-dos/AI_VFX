# Bảng tiến độ: Gatefall (tên tạm)

- Brief: `docs/briefs/gatefall.md`
- Giai đoạn: Cơ chế
- Tạm dừng theo yêu cầu người dùng ngày 2026-11-24, khi QA đang xác minh test C5 và kiểm lại C6. Lượt QA đó bị dừng giữa chừng, chưa có kết luận. `tests/` có thể còn thay đổi dở của QA.
- Người dùng cho chạy lại ngày 2026-11-24.
- Tạm dừng lần 2 theo yêu cầu người dùng ngày 2026-11-24, khi QA đang kiểm lại C6 sau bản sửa vòng 3. Lượt QA đó bị dừng giữa chừng, chưa có kết luận, `tests/` có thể còn thay đổi dở.
- Việc tiếp theo khi chạy lại: QA xem thay đổi dở trong `tests/`, kiểm lại C6 sau bản sửa vòng 3 (đây là vòng sửa cuối được phép), rồi chạy kiểm tra cuối. Không đạt thì dừng và hỏi người dùng.
- Việc cũ: QA xem lại thay đổi dở trong `tests/`, xác minh test C5 chập chờn (`tests/gatefall-c5.spec.ts:895`), kiểm lại C6 và chạy kiểm tra cuối. Không đạt sau vòng sửa thứ 3 thì dừng và hỏi người dùng

## Cơ chế
| # | Cơ chế | Programmer | QA | Vòng sửa | Ghi chú |
|---|---|---|---|---|---|
| C1 | Lõi bàn cờ xác định | Xong | Đạt 12/12 | 0 | 137/137 test. C3 phải thay hành vi tạm khi `tiltsLeft === 0` |
| C2 | Bốn cửa nạp | Xong | Đạt 8/8 | 0 | 168/168 test. Test C1 lỗi thời đã được QA sửa |
| C3 | Mục tiêu, thắng thua, xả bàn | Xong | Đạt 8/8 | 0 | 224/224 test. Xả bàn được ép bằng beam search. Bot ngẫu nhiên thắng khoảng 53%, cần xem ở C4. `campaignComplete` để C6 |
| C4 | Phép đo bằng bot | Xong | Đạt 9/9 trên tập nghiệm thu: G-B 12,67 (cận dưới 9,69), G-B2 12,92 | 1 vòng tune | 9 tiêu chí. Không đạt C4.6 sau khi tune thì dừng trước C5 và báo người dùng |
| C5 | Hiển thị và diễn hoạt | Xong | Đạt 5/5 | 0 | 297/297 test. Thanh tune chỉ có ở bản dev |
| C6 | Điều khiển, thử lại, 3 màn | Đã sửa vòng 3, chờ QA | Không đạt 10/12: ngón kéo ra khỏi nút còn giữ làm nuốt lần chạm hợp lệ của ngón khác. Test C5 chập chờn đã xác định là lỗi test và được sửa | 3 | 12 tiêu chí |

## Câu hỏi mở cho người dùng
- Chưa có.

## Quyết định đã chốt
- Nguồn: `reports/Nghiên cứu gameplay match 3.md`, hướng 1 (nghiêng trọng lực).
- Rà soát tiền lệ ngày 2026-11-23: luật vuốt để cả bàn trượt rồi nổ cụm 3 đã có ở Gravity (itch.io), Three Swipes, Weird Gravity. Nghiêng hoặc xoay bàn cũng có ở Bloktonik, Tisnart Tiles, GravBlocks+, Verto, Shift Shaft. Không coi nghiêng trọng lực là điểm mới.
- Điểm khác biệt tạm chốt do Producer đề xuất: bốn cửa nạp nhìn thấy trước. Mỗi cạnh bàn hiện các quân sẽ vào nếu nghiêng về hướng tương ứng. Chưa khẳng định là mới vì mới rà soát nhanh.
- Không dùng refill thiên lệch theo tình trạng thua. Mọi quân sắp vào đều nhìn thấy được.
- Producer chốt tạm các điểm brief mơ hồ do QA nêu ở C1, gửi Game Designer ghi vào brief ở bước chốt: lần nghiêng bị từ chối không đổi `lastChain`, `lastAnimMs`; `tiltStart.tiltsLeft` là giá trị sau khi trừ; khi khởi tạo lặp `(color + 1) % colorCount` tới khi hợp lệ; C1.10 dùng seed 1 đến 200.
- Producer chốt tạm các điểm QA nêu ở C2, gửi Game Designer ghi vào brief ở bước chốt: mục 4.5 áp dụng cho chuỗi màu và số lần rút, còn vị trí khe theo bước 7 có thể đổi khi có quân kẹt ở làn đầy; cửa fixture nhiều hơn `waveSize` được giữ nguyên, là ngoại lệ của C2.6.
- Producer chốt tạm ở C3, gửi Game Designer ghi vào brief ở bước chốt: `vent.tiltCost` là chi phí cấu hình, số lượt còn lại thật đọc ở `turnEnd.tiltsLeft`; bàn đầy ở lượt cuối thì thua ngay, không xả.
- Producer chốt cách đo C4 trước khi có số liệu:
  - Bot B chính thức theo đúng chữ brief, duyệt `validTilts` và chấm bằng `preview(false)`. Kết luận C4.6 dựa trên bot này.
  - Thêm bot đối chứng B2, chỉ chọn trong các hướng có `preview(false).valid`, nếu không còn hướng nào thì chọn trong `validTilts`. Nếu C4.6 đạt với B nhưng không đạt với B2 thì báo là kết quả chưa vững.
  - Đo tập tune (seed 1000 đến 1399) trước. Chỉ chạy tập nghiệm thu (5000 đến 5399) khi tập tune đã đạt C4.5 đến C4.7, để tập nghiệm thu không bị dùng lặp lại khi tune.
  - Cận dưới 95% của C4.6 tính trên gộp 3 màn (n = 1200). Từng màn chỉ cần chênh lệch dương. `sd` là độ lệch chuẩn mẫu, phân vị theo nearest-rank, thời lượng C4.8 tính cả ván thắng và thua.
  - `npm run verify` không bao gồm C4.5 đến C4.8. Kiểm tra cuối phải chạy thêm `node tests/gatefall-measure.mjs --set accept`.
- Producer chấp nhận bộ thông số đề xuất của Balance Tuner để đưa vào nghiệm thu: `gfWaveSize` 4; TiltLimit 26/26/32; GoalCount 24/24/16; Colors 4/4/6. Test ghim thông số màn được QA đổi sang đọc từ `TUNING`, ngưỡng C4 giữ nguyên.
- Producer chốt ở C5: kết quả thắng/thua chuyển sang vùng HUD, không che bàn, để người chơi xem lại vì sao thua. Nghiêng sau khi ván kết thúc vẫn rung báo từ chối. `gateRefill` được phép chạy tiếp sau khi mở khóa vì không gây sai trạng thái. `restart()` giữ fixture đang nạp, chỉ dùng cho test.
- Producer chốt ở C6: "dùng được mọi lúc" gồm cả lúc có ngón khác trên màn hình. Sau một lần nghiêng phải nhấc hết tay mới vuốt lần tiếp theo. Vuốt đúng đường chéo khi ratio bằng 1 bị bỏ qua. Luật nhấc hết tay chỉ tính ngón trên canvas: ngón giữ trên nút không chặn vuốt, và mất focus đặt lại bộ đếm ngón.
- Producer chấp nhận ở vòng sửa 3: nút giữ trạng thái riêng từng ngón; ngón bị hủy không chặn ngón khác; khi một ngón đã kích hoạt nút thì các ngón khác đang đặt trên chính nút đó không kích hoạt thêm, nên hai ngón cùng bấm chỉ tính một lần.
- Rủi ro đã biết: cấu hình rất nhạy với `gfWaveSize` (3 cho G 9,42%, 5 cho G 92,42%) và số màu. Cần báo người dùng dù C4 đạt.

## Nhật ký bàn giao
| Agent | Việc | Kết quả |
|---|---|---|
| Producer | Đọc báo cáo, rà soát tiền lệ | Xong, chọn hướng nghiêng trọng lực với bốn cửa nạp |
| Game Designer | Viết brief | Xong, 54 tiêu chí, 6 cơ chế, không có câu hỏi mở |
| Gameplay Programmer | Cài C1 | Xong, typecheck đạt, 91/91 test cũ đạt bằng config tạm ở cổng 5199 vì 5173 đang bận, chờ QA |
| QA Tester | Nghiệm thu C1 | Đạt 12/12, 137/137 test, lặp Gatefall 138/138, chưa chạy verify |
| Gameplay Programmer | Cài C2 | Xong, typecheck đạt, 136/137 test, test hỏng ghim giả định cửa rỗng sau lượt đầu, chờ QA |
| QA Tester | Nghiệm thu C2 | Đạt 8/8, 168/168 test, lặp Gatefall 231/231, bắt được 9/9 đột biến, chưa chạy verify |
| Gameplay Programmer | Cài C3 | Xong, typecheck đạt, 168/168 test cũ đạt, chưa có test C3, chờ QA |
| QA Tester | Nghiệm thu C3 | Đạt 8/8, 224/224 test, lặp Gatefall 399/399, bắt được 19/19 đột biến, chưa chạy verify |
| Gameplay Programmer | Cài `preview`, `animMs` cho C4 | Xong, typecheck đạt, 224/224 test cũ đạt, chưa có test C4, chờ QA |
| QA Tester | Viết bot, đo C4 trên tập tune | 240/240 test. G-B 4,00 điểm, G 87,25%, B 83,25%, R 48,42%. Chưa đo tập nghiệm thu |
| Balance Tuner | Tune C4 trên tập tune | Có đề xuất: G-B 14,67 trên tập tune, 11,75 trên seed 2000-2399. Chưa ghi vì vướng test ghim thông số |
| Balance Tuner | Ghi thông số vào config | Xong 9 khóa, typecheck đạt, tập tune khớp. `npm test` chưa chạy, chờ QA sửa test ghim |
| QA Tester | Nghiệm thu C4 | Đạt 9/9, 240/240 test, lặp 447/447, tập 5000-5399 chạy đúng một lần. Cận dưới G-B là 9,69 nên không khẳng định chắc chắn từ 10 điểm trở lên |
| Gameplay Programmer | Cài C5 | Xong, typecheck đạt, 234/240 test, 6 test hỏng do gọi lệnh trong lúc diễn hoạt, chờ QA |
| QA Tester | Nghiệm thu C5 | Đạt 5/5, 297/297 test, lặp 618/618, G-B tập tune vẫn 14,67, 6 test hỏng là test lỗi thời |
| Gameplay Programmer | Cài C6 | Xong, typecheck đạt, 297/297 test cũ đạt, chưa có test C6, chờ QA |
| QA Tester | Nghiệm thu C6 | Không đạt 10/12, lỗi nút khi đa chạm. Chưa chạy kiểm tra cuối |
| Gameplay Programmer | Sửa lỗi đa chạm | Xong, typecheck đạt, 349/351 test. 2 test đa chạm còn đỏ, Programmer cho là do helper test, chờ QA xác minh |
| QA Tester | Kiểm lại C6 | Helper test sai đã sửa, lỗi đa chạm hết. Không đạt 10/12 vì lỗi mất focus giữa lần bấm, 368/372 test. Chưa chạy kiểm tra cuối |
| Gameplay Programmer | Sửa lỗi mất focus | Xong, typecheck đạt, 371/372 test. Test C5 thời gian thực hỏng 2/6 lần chạy riêng, chờ QA xác minh |
| QA Tester | Xác minh C5, kiểm lại C6 | Test C5 là khe đọc-rồi-gọi, đã sửa, 20/20 xanh, bắt 3/3 đột biến. C6 không đạt 10/12, lỗi kéo ra khỏi nút, lặp 6/6. Chưa chạy kiểm tra cuối |
| Gameplay Programmer | Sửa vòng 3, trạng thái riêng từng ngón | Xong, typecheck đạt, 393/393 test, spec C6 hai lần 96/96. Thêm padding cho chữ "ĐỦ", chờ QA |
