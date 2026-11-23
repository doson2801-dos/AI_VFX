# Nguồn gốc

Chuyển thể từ `skills/.curated/hatch-pet` của https://github.com/openai/skills, commit `49f948faa9258a0c61caceaf225e179651397431`. Giấy phép Apache 2.0, xem `LICENSE.txt`.

## Giữ nguyên
- `scripts/`: `extract_strip_frames.py`, `inspect_frames.py`, `compose_atlas.py`, `validate_atlas.py`, `make_contact_sheet.py`, `render_animation_previews.py`.
- `references/animation-rows.md`, `references/qa-rubric.md`.

## Thay đổi
- Viết lại `SKILL.md` bằng tiếng Việt cho pipeline sprite của game Phaser.
- Bỏ phần sinh ảnh `$imagegen`, tìm hiểu thương hiệu, worker và đóng gói vào `~/.codex/pets`.
- Không chép `prepare_pet_run.py`, `derive_running_left_from_running_right.py`, `agents/openai.yaml`.
- Thêm `scripts/mirror_strip.py`, viết mới cho dự án này.
