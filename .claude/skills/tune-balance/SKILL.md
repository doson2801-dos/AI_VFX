---
name: tune-balance
description: Đo và cân chỉnh thông số gameplay trong TUNING bằng bot, so sánh trước và sau. Dùng khi cần chỉnh độ khó, tốc độ, lực nhảy hoặc thời lượng màn theo mục tiêu trong brief.
---

# Cân chỉnh

## Đo bằng bot
Cần dev server đang chạy ở cổng 5173. Script thử thông số lúc chạy, **không sửa file**:

```powershell
node .claude/skills/tune-balance/measure.mjs "<hàm bot>" "<JSON thông số>" <số lần>
```

Ví dụ:

```powershell
node .claude/skills/tune-balance/measure.mjs "(s) => ({ left: false, right: true, jump: s.grounded })" "{\"moveSpeed\":300}" 3
```

Kết quả là JSON gồm số lần thắng, thua, hết giờ và thời gian thắng trung bình. Lấy hàm bot từ test của QA nếu có.

## Quy trình
1. Đọc mục tiêu trong mục 5, 8 và 9 của brief. Nếu mục tiêu không đo được, báo Producer.
2. Đo nền với thông số hiện tại.
3. Đổi một nhóm liên quan mỗi lần, trong `TUNING_RANGES`:
   - Di chuyển: `moveSpeed`, `acceleration`, `airControl`
   - Cú nhảy: `gravity`, `jumpVelocity`, `jumpCutMultiplier`
   - Độ dễ thao tác: `coyoteMs`, `jumpBufferMs`
4. Đo lại với cùng bot và cùng số lần.
5. Chỉ ghi giá trị vào `TUNING` khi số đo tốt hơn theo mục tiêu.
6. Chạy `npm test`. Nếu hỏng, trả giá trị cũ.

Khi đổi lực nhảy hoặc trọng lực, tính lại độ cao `v² / (2g)` để chắc nhân vật vẫn tới được các bệ và xu.

## Báo cáo
| Thông số | Trước | Sau | Lý do |
|---|---|---|---|
| | | | |

Kèm số đo trước và sau, kết quả test, và điểm cần người chơi tự thử. Bot không đo được cảm giác chơi.
