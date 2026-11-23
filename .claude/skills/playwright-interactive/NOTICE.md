# Nguồn gốc

Chuyển thể từ `skills/.curated/playwright-interactive` của https://github.com/openai/skills, commit `49f948faa9258a0c61caceaf225e179651397431`. Giấy phép Apache 2.0, xem `LICENSE.txt`. Thông báo gốc nằm trong `NOTICE.upstream.txt`.

## Thay đổi
- Viết lại `SKILL.md` bằng tiếng Việt cho game Phaser.
- Thay phiên `js_repl` và `codex.emitImage` bằng Browser pane và spec Playwright.
- Bỏ phần Electron, yêu cầu tắt sandbox và các đoạn chuẩn hóa ảnh riêng của Codex.
- Thêm luật dùng `window.__game` và phân biệt API debug với input thật.
- Không chép `agents/openai.yaml` và `assets/`.
