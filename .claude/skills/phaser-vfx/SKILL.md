---
name: phaser-vfx
description: Dùng thư viện vfx-code để tạo hiệu ứng flipbook cho game Phaser 2D của dự án. Dùng khi brief cần VFX như nổ, tia lửa, sét, khói, vệt chém, nhặt vật phẩm.
---

# VFX cho Phaser bằng vfx-code

Các phần dưới đây là bản sao nguyên vẹn từ nhánh `main` (dự án Unity), chép ngày 2026-11-27. **Không sửa bản sao.** Khi `main` thay đổi, chép lại trên nhánh `phaser-vfx-setup`.
- `.claude/skills/vfx-code/`
- `.claude/skills/vfx-shader/`: chỉ dùng làm tài liệu tham khảo. Không gọi `/vfx-shader` để làm VFX cho Phaser.
- `docs/vfx/rules/vfx-art-lead.md`: luật art lead. Trên `main` file này nằm ở `.claude/rules/`. Ở đây chuyển sang `docs/` để nó không tự nạp vào mọi phiên, vì luật đó viết cho Unity 3D.
- `docs/vfx/_Anatomy/`: chép từ `Docs/VFX/_Anatomy/`.
- `docs/vfx/_Library/`: chép từ `Docs/VFX/_Library/`.

Thứ tự đọc khi làm VFX: `docs/vfx/rules/vfx-art-lead.md` → `.claude/skills/vfx-code/SKILL.md` → bảng dưới đây. Luật art lead thắng tài liệu. **Riêng các điểm trong bảng này thì skill này thắng**, vì game là Phaser 2D chứ không phải Unity.

## Dùng và bỏ gì
| Phần | Ở dự án này |
|---|---|
| vfx-code: `lib/`, `examples/`, `references/techniques.md`, `references/particles.md` | Dùng |
| vfx-code: sheet ≤ 1024 px, Frame over Time tuyến tính, sửa ≥ 3 vòng, `--check` sạch | Giữ |
| vfx-code: `--effect`, `--project`, `--review`, Review Lab | Không dùng, chỉ dùng `--out` |
| **Anatomy**: `docs/vfx/_Anatomy/<loại>.md` và `materials.md`; chỉ mục loại effect ở `vfx-shader/references/effect-index.md` | Dùng. Trước mỗi effect, tìm loại gần nhất rồi chép phần "Bất biến" vào kế hoạch. Đối chiếu preview với "Bất biến" trước khi bàn giao. Chưa có loại hợp thì research rồi thêm file Anatomy (sửa trên nhánh `phaser-vfx-setup`) |
| **Không gian**: luật art lead mục "Không gian", `vfx-shader/references/direction.md` | Dùng cách làm: chốt ngữ cảnh, quy mô, neo, timing trước khi code; thiếu thì hỏi. **Đổi** camera thành 2D nhìn ngang (xem mục "Không gian mặc định"). Bỏ luật Billboard và Render Alignment của Unity |
| **Luật art lead**: đòn trúng/nổ ("một ngữ cảnh, một chớp Impact"), hình dáng, khác biệt giữa effect, giữ tạo hình cốt lõi, có hướng/không hướng | Dùng |
| **Texture**: luật art lead mục "Texture", `LIBRARY.md`, `library_index.csv`, `library_props.csv`, `library_direction.csv` | Dùng, với `vfx/Library/` thay cho `Assets/Library/` (xem mục dưới) |
| vfx-shader: `references/lightning.md`, `lightning-set.md`, `thunder-core.md`, `magic-circle.md`, `ground-spike.md`, `tornado.md`, `coloso.md`, `recipes.md`, `study-reference.md`, `web-research.md` | Tham khảo về tạo hình, nhịp và lớp. Bỏ phần shader, mesh, material |
| Prefab, Particle System, Scaling Mode, `sortingOrder`, `VfxBuildKit`, showcase scene | Bỏ. Lớp và thứ tự vẽ do Gameplay Programmer làm trong Phaser |
| Shader Unity (`*.shader`, `*.cginc`, Coloso, Erode Sphere), mesh `SM_VFX_*`, khói `fx_t_smoke_02` + shader mobile | Bỏ. Hình nào cần shader hay mesh thì vẽ thành flipbook bằng vfx-code |
| Build script và công cụ: `tools/unity_build.py`, `check_texture_plan.py`, `library_props.py`, Review Lab, `vfx-shader/scripts/`, các file `*.cs` trong `assets/` | Bỏ. Các công cụ này không có trong Game_AI. Bước "contact sheet thư mục" thì tự ghép ảnh xem trong `vfx/<Effect>/out/` |
| Quy trình bàn giao của art lead (agent khác review, art lead duyệt lần cuối) | Dùng như sau: QA kiểm trong game, người dùng duyệt hình |
| Đường dẫn `D:/Game_prj/VFX_LIb` | Bỏ qua |

## Thư viện texture `vfx/Library/`
- Bản sao thư viện thành phần của vfx-code. Cây `vfx/Library/<nhóm>/<vai trò>/` giống `Assets/Library/`. Có 15 nhóm: `Slash`, `beam`, `glow`, `ground`, `impact`, `lightning`, `mask`, `noise`, `ring`, `rune`, `smoke`, `spark`, `trail`, `water`, `_review`.
- Không nằm trong Git vì nặng khoảng 163 MB. Nguồn là file `Library.tar.gz` trên Google Drive của người dùng. Máy mới thì giải nén file đó vào `vfx/` để có `vfx/Library/`.
- File `.meta` là của Unity, bỏ qua.
- Chỉ đọc, không sửa file trong thư viện. Cần chỉnh ảnh thì chép sang `vfx/<Effect>/textures/`.
- Xem ảnh trước khi chọn. Ảnh trong `_review/` chưa được duyệt, không dùng.
- Không chép ảnh thư viện vào `public/`. Chỉ sheet đã render mới vào `public/vfx/`.
- Chọn ảnh theo `docs/vfx/_Library/LIBRARY.md`, là bảng thành phần → thư mục. Nguồn và tên cũ xem trong `docs/vfx/_Library/library_index.csv`. Hai file này chép từ `Docs/VFX/_Library/` trên nhánh `main` ngày 2026-11-27. Trong các file đó, đọc `Assets/Library/` thành `vfx/Library/`. Phần Unity như `LoadAssetAtPath` hay import setting thì bỏ qua.
- Theo quy trình chọn 6 bước trong luật art lead: viết yêu cầu → tra bảng → xem cả thư mục → lọc theo `library_props.csv` → chốt 1 ảnh và 1–2 ảnh dự phòng → kiểm lại trên preview. Không chọn theo tên file.
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
