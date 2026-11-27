# Bảng tiến độ: Slot Five

- Brief: `docs/briefs/slot-five.md`
- Giai đoạn: Kiểm tra cuối xong (2026-11-27), chờ người dùng chơi thử
- Việc tiếp theo: game-designer chốt brief theo kết luận QA; người dùng đánh giá mục 9

## Cơ chế
| # | Cơ chế | Programmer | QA | Vòng sửa | Ghi chú |
|---|---|---|---|---|---|
| C1 | Lõi lưới có seed | Xong | Đạt 8/8 | 0 | C1.8 qua scene kiểm lại ở C3 |
| C2 | Chuỗi và hiệu ứng | Xong | Đạt 5/5 | 0 | |
| C3 | Trận luân phiên, máu, khiên | Xong | Đạt 11/11, C1.8 scene đạt | 0 | |
| C4 | Mô phỏng cân bằng | Xong | Đạt sau tune (comeback 0,3445, thắng 0,544, trung vị 11) | 1 | Tune sfBBlade 15, sfWBlade 24 |
| C5 | Điều khiển và lượt đối thủ | Xong | Đạt 10/10 | 0 | Màn dọc 390x844: chữ HUD và nút nhỏ (ngoài brief) |
| C6 | Diễn hoạt và HUD máu | Xong | Đạt 7/7; C6.5 mở lại (lastResolveMs), C6.8 thay bằng C8.10 | 0 | |
| C7 | Layout dọc 540x960, panel dưới, nút "?" | Xong | Đạt 12/12; C1–C6 đạt lại | 0 | Điện thoại xoay ngang: nút nhỏ (Q5) |
| C8 | Cast chiêu từ chuỗi xuống nhân vật | Xong | Đạt 9/9 + ảnh C8.10 chờ duyệt | 0 | |
| C9 | Chuyển lưới 4x4 | Xong | Đạt 6/6; C1–C7 bản 4 đạt; spec 119/119 | 0 | |
| C10 | Tune thời lượng 5–7 phút, tỉ lệ ra đòn ≥ 0,60 | Đã ghi sfBHeal 50, sfFoeMaxHp 440 | Đạt 8/8 (349 s, thắng 0,5385, lật ngược 0,236) | 1 | Người dùng chấp nhận đối thủ 440 máu (2026-11-27) |
| C11 | Quay nhanh (công tắc, phím F) | Xong; trận nhanh ~2,5 phút | Đạt 11/11 + C11.12 ghi số | 0 | |
| C13 | Bộ icon theo hệ trang bị, demo chỉ Sét | Brief bản 5 xong; Programmer đang làm | Chưa kiểm | 0 | sfBVolt giữ 15 (designer đúng, 45 là số bản 2–3) |
| C14 | Tune lại cho 5 icon | Chưa làm | Chưa kiểm | 0 | Mục tiêu thêm: lượt có chuỗi Sét ≥ 0,15 |
| C12 | VFX: đạn cast 7 loại, va chạm, chặn khiên, lóe chuỗi | 16 sheet, đã gắn, pack:single 2,02 MB | Đạt C12.1–C12.12, C12.14; ảnh C12.13 chờ duyệt; verify 559/559 (2026-11-27) | 0 | Người dùng yêu cầu 2026-11-27. Thêm C12.14 bản HTML đơn (tools/pack-single.mjs, cờ DOM data-sf-* chỉ đọc, chấp nhận có trong bản phát hành) |

Kiểm tra cuối 2026-11-27: `npm run verify` ĐẠT, 542/542 test. Bản HTML đơn `artifacts/slot-five-play.html` (1,4 MB) đã gửi người dùng.

## Câu hỏi mở cho người dùng
- Q1 khắc hệ? Q3 trần lượt/hòa? Q4 đối thủ có trọng số riêng? Không chặn C1–C4. Tạm dùng mặc định của brief.
- Q2 đã chốt (2026-11-26): người chơi chỉ bấm quay, không giữ cột/quay lại/kỹ năng. Game-designer đóng Q2 trong brief ở bước chốt brief.

## Quyết định đã chốt (2026-11-26, đổi thiết kế)
- Slot đối kháng: 2 nhân vật dưới lưới, luân phiên quay, hết máu thì thua. Bỏ credit/cược và RTP.
- Icon: Lửa, Điện, Băng, Đất (sát thương), Kiếm (đánh thường), Hồi máu, Khiên, May mắn (làm sau).
- Chuỗi càng dài thì hiệu ứng càng mạnh.

## Hệ theo trang bị (2026-11-27)
- Chiêu nguyên tố phụ thuộc trang bị (làm sau). Hệ tương lai: Băng, Sét, Lửa, Nước, Đất.
- Demo chỉ hệ Sét: lưới 5 icon (Sét, Kiếm, Hồi máu, Khiên, May mắn). May mắn giữ vai trò cũ, không làm wild.
- Nguồn: báo cáo `reports/Tỉ lệ icon game slot chiến đấu.md` (phương án C).

## Đổi lưới và thời lượng (2026-11-26)
- Lưới 4 cột x 4 hàng (5 cột khó chơi, ít ra tấn công).
- Trận trung bình 5–7 phút. Tạm giảm sát thương.

## Đổi layout (2026-11-26, người dùng vẽ demo)
- Màn dọc: khung quay trên, 2 nhân vật trái/phải bên dưới, panel dưới có nút quay bầu dục; chừa khoảng trống cast chiêu.
- Giữ lưới 5x4. Làm luôn hiệu ứng bay từ chuỗi xuống nhân vật (đơn giản). Trận mới + nút "?" chú giải trong panel dưới.

## Quyết định cũ (2026-11-26, một phần đã thay)
- Lưới 5 cột x 4 hàng.
- 8 icon: 7 icon thuộc tính thường + 1 icon may mắn. Buff riêng của icon may mắn làm sau, ngoài phạm vi brief này.
- Thắng: 3+ icon giống nhau liên tiếp theo ngang, dọc, chéo.
- Kiểm chứng cả cảm giác quay/thắng lẫn toán RTP.

## Nhật ký bàn giao
| Agent | Việc | Kết quả |
|---|---|---|
| game-designer | Viết brief | Xong, RTP lý thuyết tính tay ≈ 0,9463 |
| gameplay-programmer | C1 | Xong theo brief cũ: typecheck sạch, 404 test cũ đạt. Chờ brief mới rồi chỉnh, sau đó mới giao QA |
| game-designer | Sửa brief thành slot đối kháng | Xong, 6 cơ chế, 4 câu hỏi mở |
| gameplay-programmer | Sửa C1 theo brief mới | Xong; spinIndex đếm từ 0 theo brief 4.2; typecheck sạch, 404 test cũ đạt |
| qa-tester | Nghiệm thu C1 | ĐẠT 8/8; test `tests/slot-five.spec.ts` 17/17, hồi quy 224/224 |
| gameplay-programmer | C2 | Xong; analyticEffects 14,888 / 1,021 / 1,766 khớp số tính tay |
| game-designer | Sửa mâu thuẫn C2.2 (giữ luật 4.3: dr 4,4,3,3) và ghi Q2 | Xong, không fixture nào khác bị ảnh hưởng |
| qa-tester | Nghiệm thu C2 | ĐẠT 5/5; slot-five.spec 24/24 |
| gameplay-programmer | C3 | Xong; làm sớm đối thủ tự quay (thuộc C5) để kiểm C1.8, Producer chấp nhận |
| qa-tester | Nghiệm thu C3 + C1.8 qua scene | ĐẠT; slot-five.spec 41/41; seed 1–2000 trung vị 11 lượt, người chơi thắng 52% |
| gameplay-programmer | C4 | Xong; 9001–11000: thắng 0,54, trung vị 11 lượt, P90 21, comeback 0,51 (định nghĩa quá rộng), ~28,6 s/trận |
| game-designer | Siết định nghĩa lật ngược C4.4, ghi rõ nearest-rank và tham số setup | Xong; lật ngược = bên thắng từng bị dẫn ≥20 điểm % máu sau spinIndex≥2; mục tiêu [0,15; 0,40] |
| gameplay-programmer | Sửa C4 theo định nghĩa mới | Xong; comebackRate 0,408 trên tập nghiệm thu, vượt trần 0,40; các ngưỡng khác đạt |
| qa-tester | Nghiệm thu C4 (tách đúng code đo và đạt số liệu) | Code đo ĐÚNG; C4.4 KHÔNG ĐẠT do số liệu thật; spec 53/54 |
| balance-tuner | Tune comebackRate về [0,15; 0,40] (người dùng duyệt 2026-11-26) | Chặn: test fixture ghi cứng giá trị mặc định. Phương án sfBBlade 15, sfWBlade 24 → comeback 0,3445 nghiệm thu; đã trả config về cũ |
| qa-tester | Ghim TUNING cố định cho test fixture C1.8/C2/C3 | Xong; BRIEF_TUNING khớp bảng mục 5; diễn tập bộ tune mới 54/54 |
| balance-tuner | Ghi sfBBlade 15, sfWBlade 24 | Đã ghi (Producer kiểm bằng grep; báo cáo cuối của Tuner không tới) |
| qa-tester | Nghiệm thu chính thức C4 sau tune | ĐẠT C4.1–C4.7; spec 54/54; C1–C3 vẫn đạt |
| gameplay-programmer | C5 | Xong; Space/Enter quay, R trận mới, nút #sf-spin #sf-new; spec 54/54 |
| qa-tester | Nghiệm thu C5 | ĐẠT 10/10; spec 77/77 |
| gameplay-programmer | C6 | Xong; 9 test cũ hỏng vì spinning/resolving nay tốn thời gian thật (đúng brief), QA cần cập nhật |
| gameplay-programmer | Thêm bảng chú giải icon (mục "Có làm"), giãn số nổi | Xong; nút #sf-* dời vị trí |
| qa-tester | Sửa 9 test theo pha có thời gian, nghiệm thu C6 | ĐẠT; spec 88/88 |
| qa-tester | Kiểm tra cuối npm run verify | 492/492 test, build đạt; quét dist KHÔNG ĐẠT do chuỗi `.lil-gui` trong GatefallScene.ts:52; freeplay 60 s đạt |
| gameplay-programmer | Bỏ `.lil-gui` khỏi bản build | Xong; dist không còn chuỗi lil-gui |
| qa-tester | Chạy lại npm run verify | ĐẠT bản 2: 493/493, VERIFY PASSED |
| game-designer | Chốt brief theo kết luận QA | Xong; thêm mục 5.4 giá trị sau tune, C6.8 chờ duyệt |
| gameplay-programmer | C7 | Xong; spec 88/88, game khác 148/148; sửa lỗi Space click lại nút "?" |
| qa-tester | Nghiệm thu C7 (#sf-help-close so hộp [450,72,64,64], miễn chồng legend) | ĐẠT 12/12; toàn dự án 513/513 |
| gameplay-programmer | C8 cast chiêu | Xong; 104/108, 4 test C4 hỏng vì estMatchMs nay dùng lastResolveMs (đúng brief 5.3 bản 3, Producer xác nhận). QA nghiệm thu C8 dời tới sau khi chuyển lưới 4x4 để khỏi viết test 2 lần |
| game-designer | Brief bản 4: lưới 4x4, trận 5–7 phút, tỉ lệ lượt có sát thương | Xong; C9 lưới 4x4, C10 tune thay C4; máu 450, Kiếm trọng số 40; câu hỏi mới Q6 quay nhanh/autoplay |
| gameplay-programmer | C9 lưới 4x4 | Xong; 67 test cũ hỏng vì theo bản 2–3. Seed 1–2000: 306 s, 120 lượt, ra đòn 0,654, thắng 0,5125, comeback 0,103 (dưới ngưỡng) |
| qa-tester | Cập nhật test bản 4, nghiệm thu C8 + C9 | TẠM DỪNG theo yêu cầu người dùng (2026-11-26); tests/slot-five.spec.ts có thể đang sửa dở |
| game-designer | Thêm C11 quay nhanh vào brief | Xong (bản 4.1): sfFastFactor 0,35, phím F, #sf-fast; 12 tiêu chí; dời nút "?" |
| game-designer | Cập nhật brief: layout dọc theo bản vẽ người dùng, cast chiêu, panel dưới + nút "?" | Xong (bản 3): 540x960, C7 12 tiêu chí, C8 10 tiêu chí; mở lại C6.5, C6.8 → C8.10; Q5 màn ngang |
