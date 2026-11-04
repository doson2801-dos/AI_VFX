# AGENTS.md: Quy tắc cho mọi agent

Áp dụng cho phiên chính, subagent, workflow và các phiên chạy song song.

## Trước khi làm
- Đọc `CLAUDE.md`, `MAP.md`; việc VFX thì đọc thêm `Docs/VFX/_ArtDirection/PROGRESS.md`.
- Luật art lead ở `.claude/rules/` luôn thắng mọi nguồn nghiên cứu / thư viện.

## Trong khi làm
- Tạo, di chuyển hoặc xoá file thì cập nhật `MAP.md`.
- Học được điều lâu dài (quyết định, sở thích, mẹo công cụ) thì ghi vào `contexte/<chủ-đề>.md`.
- Sản phẩm VFX đặt ở `Assets/VFX/<Tên>/`, tài liệu của nó ở `Docs/VFX/<Tên>/`. Không tạo file rác ở thư mục gốc.
- Secret (API key, mật khẩu) chỉ để trong `.env` (đã bị `.gitignore` chặn). Không viết vào file khác.

## Chạy nhiều phiên song song
Git chỉ chứa tài liệu + code, **không có texture / prefab / mesh**. Vì vậy:
- **Việc cần Unity / asset** (dựng prefab, texture, Showcase): các phiên làm chung thư mục `D:\Game_prj\VFX_LIb`, **mỗi phiên một effect** (`Assets/VFX/<Tên>/` + `Docs/VFX/<Tên>/`). Không hai phiên sửa cùng một file.
- **File dùng chung** (`_Kit/`, `_Shared/`, `_Showcase/VfxShowcaseBuild.cs`, skill, `CLAUDE.md`, `MAP.md`): mỗi lúc chỉ một phiên sửa. Phiên khác cần thì báo lại, không tự sửa.
- **Việc chỉ code / tài liệu** (skill, script Python, docs): có thể dùng git worktree + branch riêng (`git worktree add ../VFX_LIb-<việc> -b <việc>`), gộp về `main` sau khi xong.
- Unity chỉ mở một instance trên project chính; build Showcase chạy sau cùng, một lần.

## Lưu / đồng bộ
- Lưu: `git add -A && git commit -m "..." && git push` (`.gitignore` đã lọc chỉ còn tài liệu + code).
- Máy khác: `git clone https://github.com/doson2801-dos/AI_VFX.git` hoặc `git pull`. Asset Unity phải chép riêng (không có trong git).
- Commit hoặc push chỉ khi người dùng yêu cầu.
