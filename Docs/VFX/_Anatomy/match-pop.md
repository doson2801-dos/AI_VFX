# MatchPop — impact kiểu puzzle khi một ô được ăn (match-3 / slot)
Độ chắc: **suy từ nguồn web + art lead yêu cầu "impact dạng game puzzle ở các icon khi được ăn"** (2026-11-27), đã duyệt kế hoạch · Nguồn: Unity Gem Hunter Match (https://unity.com/blog/engine-platform/2d-puzzle-match-3-sample-gem-hunter-match), Match-3 PixiJS juice (https://dev.to/roman_guivan_17680f142e28/match-3-game-in-pixijs-103-juice-and-polish-3fff), itch.io juicy effects (https://itch.io/blog/1059831/making-a-game-feel-juicy-with-simple-effects).

Khác `reward-burst.md` (nổ mở thưởng to, có tích lực) và các hit ở nhân vật: đây là **nhịp pop ngắn ngay trên ô lưới UI**, mỗi ô được ăn một lần, nhiều ô cùng lúc.

## Nó là gì
Ô / thẻ icon "bật" lên như bị bấm vỡ: thẻ phóng to rồi bật về, lóe trắng đúng hình thẻ, cùng lúc một chớp tròn, một vòng sóng và chùm hạt cùng màu icon toả ra, vài mảnh văng rồi rơi.

## Cấu trúc
| Phần | Vai trò | Hình dáng | Bắt buộc |
|---|---|---|---|
| Nảy thẻ (UI) | xương sống: cho biết ô nào được ăn | scale 1 → ~1,18 ease-out nhanh, bật về có nảy nhẹ | **có** |
| Chớp thẻ (UI) | lóe đúng hình thẻ | bản trắng của thẻ, mờ dần ~150 ms | **có** |
| Flash | chớp tròn sau thẻ | quầng mềm nhỏ hơn ô một chút | có |
| Ring | vòng sóng | vòng mảnh nở ra, mờ dần | có |
| Burst | chùm hạt toả | sao / chấm, tốc độ cao, chậm dần, co lại | có |
| Chips | mảnh văng | vài mảnh có hướng, văng rồi rơi | tuỳ |

## Bất biến
- **Thẻ nảy** (scale có easing bật, không tuyến tính) và **lóe đúng hình thẻ**: thiếu là mất cảm giác "ăn".
- Màu hạt / vòng **theo màu icon** (game tô), chớp giữ trắng nhiều hơn.
- Ngắn: toàn bộ ≤ ~0,45 s; nhiều ô cùng lúc vẫn đọc được từng ô.
- Không che hẳn thẻ quá ~1 khung; không lan vào vùng UI khác (thanh báo lượt, panel).

## Được đổi
Kiểu hạt (sao / chấm / mảnh), số hạt, độ to vòng, có / không mảnh văng, màu chớp.

## Lỗi biến thể đã gặp
- **Chớp tròn to (5 m ≈ 120 px) che trắng cả thẻ** ở khung đầu (SF_Cast 2026-11-27): giữ ≤ 3,6 m, alpha 0,8.
- **Sao tốc độ thấp dồn cục quanh tâm**: cần ≥ 9 m/s ở 24 px/m và giảm tốc bằng speed modifier.
- **Mảnh rơi lực lớn lọt xuống ô dưới**: lực rơi ~ −18 m/s² cho đời 0,4 s.
- **Vòng 6 m lan tới thanh báo lượt** từ ô hàng trên: giữ ≤ 5 m (bán kính ≤ 60 px).
- **Viền highlight UI scale quanh góc** (pivot (0,1)) lệch khỏi thẻ khi nảy: pivot ở giữa.
- Tô màu bằng code không được ép alpha = 1 (mất alpha gốc của lớp).

## Biến thể đã làm
`VFX_SF_MatchPop` (Slot Five, 2026-11-27, chờ art lead): Plan `Docs/VFX/SF_Cast/Plan.md`.
