# Tìm asset tái sử dụng

Thứ tự tìm: **project hiện tại → thư viện VFX → tạo mới**. Tạo mới tốn thời gian (chờ ChatGPT, chỉnh sửa), nên tìm kỹ trước.

## Project hiện tại

Tìm trong `Assets/VFX/_Shared/` và các effect đã làm (`Assets/VFX/*/Textures`, `Materials`). Dùng Glob theo tên (`**/T_Glow*`, `**/*Smoke*.png`).

## Thư viện: `D:\Projects\animlibrary\Assets\VFX_Library`

Nếu đường dẫn không tồn tại (máy khác), hỏi người dùng đường dẫn thư viện.

Cấu trúc chính:

| Thư mục | Nội dung |
|---|---|
| `Textures/` | ~750 texture VFX (glow, slash, decal, rune, smoke, noise...) |
| `Materials/`, `Shaders/` | material/shader của các pack (Cartoon FX `.cfxrshader`, HCFX, Shader Graph...) |
| `Meshes/`, `FBX/` | mesh VFX |
| `VFX/` | prefab tham khảo theo pack |
| `Docs/References/<Pack>/` | manifest + preview theo pack |

Mỗi pack có `VFX_PackManifest.json` (`assets[]` gồm `path`, `type`, `name`) — grep trong các manifest để tìm nhanh theo từ khóa, rồi kiểm tra file thật.

### Cách tìm

1. Grep tên file theo từ khóa tiếng Anh của hình cần: `glow`, `flare`, `spark`, `streak`, `smoke`, `puff`, `ring`, `wave`, `slash`, `trail`, `noise`, `crack`, `debris`, `fire`, `flame`, `magic`, `rune`, `dot`, `star`.
2. Chọn 2–4 ứng viên, **mở xem ảnh** (Read file PNG/TGA). Đánh giá: silhouette, có alpha hay nền đen, grayscale hay đã có màu, flipbook hay ảnh đơn, độ phân giải.
3. Ưu tiên texture grayscale/trắng (tint được bằng màu particle) hơn texture đã tô màu.

### Copy vào project

- Chỉ copy file ảnh/mesh, **không copy `.meta`** (để Unity tạo GUID mới, tránh trùng GUID giữa hai project).
- Đổi tên theo [naming.md](naming.md), ghi nguồn vào `Plan.md`.
- **Không copy material dùng shader riêng của pack** (`.cfxrshader`, Shader Graph có subgraph) — chúng kéo theo importer/dependency. Lấy texture rồi gán vào shader chuẩn hoặc `SH_VFX_Particle`.
- Prefab thư viện chỉ dùng để **tham khảo thông số** (đọc file `.prefab` YAML: lifetime, size, emission, curve), không copy nguyên prefab.

### Texture nền đen không có alpha

Dùng được với blend Additive trực tiếp. Với Alpha blend, import bằng `ImportTexture(path, size, alphaFromGray: true)` để lấy độ sáng làm alpha.
