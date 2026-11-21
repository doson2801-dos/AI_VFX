# Game Brief: Coin Hop

## 1. Câu hỏi cần trả lời
Vòng lặp agent (viết, chạy, tự kiểm tra, sửa) có hoạt động từ đầu đến cuối không?

## 2. Core loop
Di chuyển và nhảy → nhặt đủ xu → chạm cờ để qua màn.

## 3. Điều khiển
- Bàn phím: mũi tên hoặc WASD, Space để nhảy, R để chơi lại.
- Cảm ứng: nút trái, phải, nhảy.

## 4. Luật chơi
- Thắng: nhặt đủ 3 xu rồi chạm cờ.
- Thua: chạm bẫy hoặc rơi xuống hố.

## 5. Thông số cần tune
Xem `TUNING` trong `src/config.ts`.

## 6. Phạm vi
- Có làm: một màn, đồ họa placeholder.
- Không làm: âm thanh, menu, lưu tiến trình.

## 7. Nền tảng đích
Web chung, desktop và mobile.

## 8. Tiêu chí hoàn thành (đo được)
- [ ] Game khởi động không có lỗi console.
- [ ] Bot qua được màn với đủ 3 xu.
- [ ] Rơi xuống hố thì thua.
- [ ] Chạm cờ khi thiếu xu thì chưa thắng.
- [ ] Nút cảm ứng điều khiển được nhân vật.

## 9. Người chơi cần tự đánh giá
Độ nặng của cú nhảy, tốc độ di chuyển, độ khó của màn.
