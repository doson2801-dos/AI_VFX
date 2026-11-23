---
name: hatch-pet
description: Kiểm tra và đóng gói spritesheet nhân vật 2D từ các dải ảnh animation trên nền chroma key, gồm tách khung, soát lỗi, ghép atlas, contact sheet và GIF xem trước. Dùng khi đã có ảnh nhân vật theo từng trạng thái và cần đưa vào game Phaser.
---

# Đóng gói spritesheet nhân vật

Skill này **không tự vẽ hay sinh ảnh**. Đầu vào là các dải ảnh do người dùng hoặc công cụ vẽ cung cấp. Thiếu ảnh thì dừng và báo Producer, không tự vẽ bằng code để lấp chỗ.

Nhân vật phải là thiết kế mới, không tái tạo nhân vật của game có sẵn.

## Định dạng atlas
Cố định `1536x1872`, 8 cột, 9 hàng, mỗi ô `192x208`. Script yêu cầu đủ 9 hàng.

| Hàng | Tên file | Số khung | Dùng trong game |
|---|---|---:|---|
| 0 | `idle.png` | 6 | Đứng yên |
| 1 | `running-right.png` | 8 | Chạy phải |
| 2 | `running-left.png` | 8 | Chạy trái |
| 3 | `waving.png` | 4 | Tương tác, chào |
| 4 | `jumping.png` | 5 | Nhảy |
| 5 | `failed.png` | 8 | Bị thương, thua |
| 6 | `waiting.png` | 6 | Chờ input |
| 7 | `running.png` | 6 | Đang làm việc tại chỗ, **không phải chạy** |
| 8 | `review.png` | 6 | Quan sát, tập trung |

Thời lượng từng khung ở `references/animation-rows.md`. Tiêu chí soát ở `references/qa-rubric.md`. Hai file này giữ nguyên bản gốc, chỗ nhắc "Codex app" hiểu là game của dự án.

## Yêu cầu dải ảnh
- Một hàng ngang, đúng số khung, các tư thế tách rời, không cắt mất thân.
- Nền phẳng một màu chroma, mặc định `#00FF00`. Màu này không được xuất hiện trên nhân vật. Nếu trùng, đổi màu và truyền `--chroma-key`.
- Cùng nhân vật, tỉ lệ, bảng màu và đạo cụ ở mọi hàng.
- Không có bóng đổ, glow, vệt chuyển động, bụi rời, chữ hay khung lưới. Hiệu ứng rời do `vfx-artist` làm bằng sheet riêng.

## Quy trình
Đặt ảnh vào `vfx/Sprites/<id>/decoded/`. Chạy từ thư mục gốc dự án:

```powershell
$py = ".venv-vfx/Scripts/python.exe"; $s = ".claude/skills/hatch-pet/scripts"; $r = "vfx/Sprites/<id>"
```

Nếu nhân vật đối xứng, có thể tạo hàng chạy trái. Script lật từng khung tại chỗ nên giữ đúng thứ tự:

```powershell
& $py -I "$s/mirror_strip.py" --input "$r/decoded/running-right.png" --output "$r/decoded/running-left.png" --frames 8
```

Xử lý và kiểm tra:

```powershell
New-Item -ItemType Directory -Force "$r/final", "$r/qa" | Out-Null
& $py -I "$s/extract_strip_frames.py" --decoded-dir "$r/decoded" --output-dir "$r/frames" --states all --method auto
& $py -I "$s/inspect_frames.py" --frames-root "$r/frames" --json-out "$r/qa/review.json" --require-components
& $py -I "$s/compose_atlas.py" --frames-root "$r/frames" --output "$r/final/spritesheet.png" --webp-output "$r/final/spritesheet.webp"
& $py -I "$s/validate_atlas.py" "$r/final/spritesheet.webp" --json-out "$r/final/validation.json"
& $py -I "$s/make_contact_sheet.py" "$r/final/spritesheet.webp" --output "$r/qa/contact-sheet.png"
& $py -I "$s/render_animation_previews.py" --frames-root "$r/frames" --output-dir "$r/qa/previews"
```

`.venv-vfx` không nằm trong Git. Nếu thiếu hoặc lỗi, dừng và báo Producer, không tự cài.

Nếu GIF bị giật kích thước nhưng dải gốc ổn định, chạy lại bước tách với `--method stable-slots`, bước soát thêm `--allow-stable-slots`, rồi chạy lại các bước sau.

## Soát kết quả
1. `qa/review.json` không có lỗi, `final/validation.json` có `ok: true`. Cảnh báo phải xem bằng mắt.
2. Mở `qa/contact-sheet.png` và GIF. Chặn nếu nhân vật đổi hình dạng, màu, khuôn mặt, đạo cụ; ô bị cắt; còn viền chroma; sai hướng chạy; idle đứng im hoàn toàn.
3. Chỉ làm lại hàng lỗi, không làm lại cả atlas.

Số liệu đạt chưa đủ để duyệt. Người dùng là người duyệt hình ảnh.

## Bàn giao cho Gameplay Programmer
Chỉ chép `final/spritesheet.webp` vào `public/vfx/<id>/`. Không chép GIF, contact sheet hay khung rời vì sẽ lọt vào bản build. Agent VFX không sửa `src/`, chỉ báo:

```ts
this.load.spritesheet('<id>', 'vfx/<id>/spritesheet.webp', { frameWidth: 192, frameHeight: 208 });
```

- Chỉ số khung bằng `hàng * 8 + cột`, ví dụ `jumping` là khung 32 đến 36.
- Thời lượng theo `references/animation-rows.md`.
- Sự kiện gameplay kích hoạt từng animation.

Chuyển thể từ `hatch-pet` của openai/skills, xem `NOTICE.md`.
