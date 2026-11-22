# Agent làm gameplay prototype (HTML5 2D)

Stack: Phaser 4, TypeScript, Vite, Playwright. Trả lời người dùng bằng tiếng Việt.

## Lệnh
- `npm run dev`: chạy game tại http://127.0.0.1:5173
- `npm run typecheck`: kiểm tra kiểu
- `npm test`: chạy test trình duyệt, ảnh chụp nằm trong `artifacts/`
- `npm run build`: build bản phát hành vào `dist/`
- `npm run verify`: chạy typecheck, test, build và kiểm tra code dev không lọt vào `dist/`
- `npm run board`: mở sơ đồ node theo dõi agent tại http://127.0.0.1:5180, dữ liệu từ hook trong `.claude/settings.json`

## Đội agent
Phiên chính là Producer, theo skill `producer`, và giao việc qua `.claude/agents/`:

| Vị trí | Agent | Skill | Được sửa |
|---|---|---|---|
| Producer | phiên chính | `producer` | `docs/production/` |
| Game Designer | `game-designer` | `write-brief` | `docs/briefs/` |
| Gameplay Programmer | `gameplay-programmer` | `implement-mechanic` | `src/`, `index.html` |
| QA Tester | `qa-tester` | `qa-acceptance` | `tests/` |
| Balance Tuner | `balance-tuner` | `tune-balance` | giá trị `TUNING` trong `src/config.ts` |
| VFX Artist | `vfx-artist` | `phaser-vfx`, dựa trên `vfx-code` | `vfx/`, `public/vfx/` |

Kết luận đạt phải do `qa-tester` đưa ra. Agent chuyên môn không commit hay push.

## Quy trình cho mỗi prototype
Skill `producer` điều phối các bước dưới đây qua đội agent.

1. Đọc brief trong `docs/briefs/`. Nếu chưa có, tạo từ `docs/GAME_BRIEF_TEMPLATE.md`. Chỉ hỏi khi thiếu thông tin làm thay đổi gameplay.
2. Chia brief thành các cơ chế nhỏ, làm từng cơ chế một.
3. Mỗi cơ chế phải có test Playwright theo tiêu chí trong brief.
4. Sau mỗi cơ chế: chạy typecheck và test, xem ảnh trong `artifacts/`, sửa rồi mới làm tiếp.
5. Khi xong: chạy `npm run verify`, báo tiêu chí nào đạt và điểm nào cần người chơi tự đánh giá.

## Commit tự động
- Task Scheduler `Game_AI Knowledge Commit` chạy `tools/daily_commit.ps1` lúc 18:00 hàng ngày, log ở `tools/daily_commit.log`.
- Chỉ commit kiến thức (`CLAUDE.md`, `docs/`, `.claude/agents`, `.claude/rules`, `.claude/skills`) và chỉ push nhánh `game-ai-prototype`.
- Không push nhánh `main` từ dự án này. `main` có lịch commit riêng.

## Luật
- Mọi thông số gameplay nằm trong `src/config.ts` và có khoảng tune trong `TUNING_RANGES`.
- Không thêm tính năng ngoài phạm vi brief.
- Test đọc trạng thái qua `window.__game`, không suy đoán từ hình ảnh. Trạng thái mới phải được thêm vào `getState()`.
- Debug API và bảng tune chỉ có trong bản dev.
- Mọi thao tác phải dùng được cả bằng phím và cảm ứng.
- Không tái tạo game có sẵn (tên, nhân vật, hình ảnh, âm nhạc, màn chơi).
- Test tự động không kết luận được game có "vui" hay không. Luôn nêu điều này cho người chơi đánh giá.
