---
name: phaser-vfx
description: Dùng thư viện vfx-code để tạo hiệu ứng flipbook cho game Phaser 2D của dự án. Dùng khi brief cần VFX như nổ, tia lửa, sét, khói, vệt chém, nhặt vật phẩm.
---

# VFX cho Phaser bằng vfx-code

`.claude/skills/vfx-code/` là bản sao nguyên vẹn của skill trên nhánh `main`. **Không sửa thư mục đó.** Đọc `.claude/skills/vfx-code/SKILL.md` trước, rồi áp dụng các thay đổi dưới đây.

## Dùng và bỏ gì
| Phần trong vfx-code | Ở dự án này |
|---|---|
| `lib/`, `examples/`, `references/techniques.md`, `references/particles.md` | Dùng |
| Luật về không gian, nhịp hiệu ứng, sheet ≤ 1024 px, sửa ≥ 3 vòng, `--check` sạch | Giữ |
| `--effect`, `--project`, `--review`, Review Lab | Không dùng, chỉ dùng `--out` |
| Prefab, shader Unity, thư mục `assets/` | Không dùng |
| `Assets/Library/` (texture có sẵn) | Dùng bản ở `vfx/Library/`, xem mục dưới |
| Đường dẫn `D:/Game_prj/VFX_LIb` | Bỏ qua |

## Thư viện texture `vfx/Library/`
- Bản sao thư viện thành phần của vfx-code. Cây `vfx/Library/<nhóm>/<vai trò>/` giống `Assets/Library/`. Có 15 nhóm: `Slash`, `beam`, `glow`, `ground`, `impact`, `lightning`, `mask`, `noise`, `ring`, `rune`, `smoke`, `spark`, `trail`, `water`, `_review`.
- Không nằm trong Git vì nặng khoảng 163 MB. Nguồn là file `Library.tar.gz` trên Google Drive của người dùng. Máy mới thì giải nén file đó vào `vfx/` để có `vfx/Library/`.
- File `.meta` là của Unity, bỏ qua.
- Chỉ đọc, không sửa file trong thư viện. Cần chỉnh ảnh thì chép sang `vfx/<Effect>/textures/`.
- Xem ảnh trước khi chọn. Ảnh trong `_review/` chưa được duyệt, không dùng.
- Không chép ảnh thư viện vào `public/`. Chỉ sheet đã render mới vào `public/vfx/`.
- Chọn ảnh theo `docs/vfx/_Library/LIBRARY.md`, là bảng thành phần → thư mục. Nguồn và tên cũ xem trong `docs/vfx/_Library/library_index.csv`. Hai file này chép từ `Docs/VFX/_Library/` trên nhánh `main` ngày 2026-11-27. Trong các file đó, đọc `Assets/Library/` thành `vfx/Library/`. Phần Unity như `LoadAssetAtPath` hay import setting thì bỏ qua.
- Ghi đường dẫn ảnh đã dùng và lý do chọn vào báo cáo.
- Nếu `LIBRARY.md` nhắc tới một thư mục mà `vfx/Library/` không có, ví dụ nhóm `shield/`, thì bản `Library.tar.gz` đang cũ hơn bảng. Báo Producer, không tự đoán.

## Không gian mặc định
Game là 2D nhìn ngang. Dùng `plane="billboard"`, `camera="side 2D"`, `background="dark"`. `width_m` quy đổi theo nhân vật cao 48 px tương ứng 2 m. Thiếu thông tin làm đổi hình khối thì không tự đoán: ghi câu hỏi vào báo cáo cho Producer.

## Quy trình
1. Viết `vfx/<Effect>/<name>.py`, bắt đầu từ mẫu gần nhất trong `examples/`. Chọn `size` nhỏ nhất đủ dùng, thường 64 đến 128 px.
2. Render vào thư mục nháp:
   ```powershell
   & .venv-vfx/Scripts/python.exe -I .claude/skills/vfx-code/lib/render.py vfx/<Effect>/<name>.py --out vfx/<Effect>/out --gif --check --res 1
   ```
   `.venv-vfx` là môi trường riêng trên máy này, không nằm trong Git, thư viện ghi trong `tools/vfx-requirements.txt`. Nếu thiếu hoặc lỗi, dừng và báo Producer. Không tự cài.
3. Mở `_preview.png`, sửa chỗ tệ nhất, tối thiểu 3 vòng.
4. Chỉ chép sheet `T_*.png` và file `.json` vào `public/vfx/<name>/`. Không chép GIF hay preview vì sẽ lọt vào bản build.

## Bàn giao cho Gameplay Programmer
Agent VFX không sửa `src/`. Báo các giá trị đọc từ file `.json`:

- đường dẫn sheet, kích thước ô bằng `size × res`, `frames`, `cols`, `rows`
- `fps` phát bằng `frames / duration`, `loop`, `pivot`
- `blend`: `add` dùng `Phaser.BlendModes.ADD`; `alpha` có hai sheet Body và Light, Body dùng `NORMAL`, Light dùng `ADD`, đặt chồng nhau
- sự kiện gameplay kích hoạt hiệu ứng

## Báo cáo
Đường dẫn effect và sheet, kết quả `--check`, dung lượng sheet, và điều chưa kiểm được. Đánh giá đẹp hay không thuộc về người dùng.
