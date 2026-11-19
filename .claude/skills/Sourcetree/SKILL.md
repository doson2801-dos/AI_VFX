---
name: Sourcetree
description: "Tạo lại cây thư mục của project VFX_LIb trên máy khác (git không lưu thư mục rỗng) theo bảng Docs/VFX/_Library/folder_tree.csv, hoặc quét lại cây hiện tại để cập nhật bảng. Chạy khi người dùng gọi /Sourcetree, hoặc nói 'tạo lại cây thư mục', 'dựng thư mục máy mới', 'cập nhật bảng thư mục'."
metadata:
  version: "1.0.0"
---

# Sourcetree — dựng lại cây thư mục

Công cụ: `tools/make_tree.py` (chỉ tạo thư mục, không đụng file, chạy lại an toàn). Bảng: `Docs/VFX/_Library/folder_tree.csv` (một dòng một thư mục, đường dẫn tương đối).

## Việc theo yêu cầu

- **Máy mới / thiếu thư mục** (đã pull `main`): chạy `python -I tools/make_tree.py`. Muốn xem trước: thêm `--dry-run`.
- **Cập nhật bảng** (máy gốc, sau khi thêm / đổi thư mục): chạy `python -I tools/make_tree.py --export`, rồi commit bảng (xem dưới).

Bỏ qua thư mục sinh tự động: `Library`, `Temp`, `obj`, `Logs`, `UserSettings`, `.vs`, `.git`, `__pycache__`, `tmp_gen`, `node_modules`. Cần bỏ thêm thì sửa `SKIP` trong `tools/make_tree.py`.

## Commit

Bảng và script nằm trong phạm vi kiến thức của `tools/sync_knowledge.py`: chạy `python -I tools/sync_knowledge.py` (commit lên `master`, chép sang `main`, push `main`). Hook `Stop` cũng tự làm việc này.

Sau khi chạy xong, báo số thư mục đã tạo / đã ghi.
