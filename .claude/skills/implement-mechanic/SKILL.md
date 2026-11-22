---
name: implement-mechanic
description: Cài đặt hoặc sửa một cơ chế gameplay trong khung Phaser 4 và TypeScript của dự án. Dùng khi cần thêm cơ chế theo brief hoặc sửa lỗi gameplay do QA báo.
---

# Cài đặt cơ chế

## Bản đồ code
| File | Vai trò |
|---|---|
| `src/config.ts` | `TUNING`, `TUNING_RANGES`, `VIEW`, dữ liệu màn `LEVEL` |
| `src/scenes/GameScene.ts` | Luật chơi, vật lý, HUD, `getState()` |
| `src/game/controls.ts` | `InputState`, nút cảm ứng, nguồn input của bot |
| `src/debug/devTools.ts` | `window.__game` và bảng tune, chỉ có ở bản dev |
| `index.html` | Canvas và nút cảm ứng |

## Checklist cho mỗi cơ chế
1. **Thông số:** thêm vào `TUNING` và thêm `[min, max, step]` vào `TUNING_RANGES`. Đọc `TUNING` lúc chạy để bảng tune có tác dụng ngay. Không viết số gameplay trong logic.
2. **Dữ liệu màn:** đặt vị trí và kích thước trong `LEVEL`.
3. **Trạng thái:** thêm trường vào `GameState` và `getState()` để QA đọc được.
4. **Reset:** khởi tạo lại mọi biến mới trong `create()`, vì chơi lại dùng `scene.restart()`.
5. **Input mới:** nếu cần nút mới, sửa đủ bốn nơi:
   - `InputState` và `touchInput` trong `controls.ts`
   - `bind(...)` trong `bindTouchControls()`
   - nút trong `index.html`
   - `readInput()` trong `GameScene.ts`
6. **Kết thúc ván:** đi qua `finish()` để thắng thua chỉ xảy ra một lần.
7. **Khung hình:** dùng `delta` hoặc `time`, không giả định 60 FPS.

## Kiểm tra trước khi bàn giao
Chạy `npm run typecheck` và `npm test`. Trong PowerShell dùng `npm.cmd`.

## Sửa lỗi từ QA
1. Tái hiện theo đúng bước trong báo cáo.
2. Sửa nguyên nhân, không thêm trường hợp đặc biệt chỉ để qua test.
3. Nếu thấy tiêu chí sai hoặc mâu thuẫn với brief, báo Producer thay vì tự đổi hành vi.
