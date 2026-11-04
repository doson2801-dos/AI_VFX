# Luật art lead (luôn áp dụng)

Đây là luật đã chốt. Luật art lead thắng mọi nguồn nghiên cứu / thư viện. Thêm luật mới vào skill chỉ khi art lead nói "chốt".

## Không gian (mọi VFX, kể cả bằng code)
- Chốt không gian trước khi viết code: ngữ cảnh (air / ground / dir), mặt phẳng, camera (mặc định 3/4, nhìn xuống 40°), quy mô (m, so với nhân vật 2 m), neo, nền, timing.
- Brief thiếu thông tin thì **hỏi** (≤ 2 vòng, không hỏi lại điều đã nói, đánh dấu phần mình đoán là *đề xuất*).
- **Không dùng Horizontal / Vertical Billboard.**
  - Dựng đứng: Stretched Billboard, texture nằm ngang, hướng bay = mép TRÁI.
  - Tia / vệt có Speed Scale > 0: pivot (0,1,0).
  - Nằm đất: Billboard + Render Alignment Local (GameObject xoay X 90°) hoặc World.

## Mix thành phần (đòn trúng / nổ)
- Claude **tự mix** bằng `auto_mix.py` từ brief, báo lý do từng lớp. Art lead yêu cầu đổi sau.
- Một effect: **một ngữ cảnh, một chớp Impact**.
- `sortingOrder` không trùng, theo mặt phẳng trước rồi tới độ sáng (bảng ở `ComponentKit`).

## Hình dáng
- Hình hình học (vòng phép, rune, vòng tròn): vẽ bằng script là tốt.
- Hình hữu cơ (lửa, khói, thân vụ nổ): không tin preset script. Đưa 2–3 phương án ảnh trước, ưu tiên nguồn của art lead.
- Khói mặc định: `Assets/VFX/fx_t_smoke_02.png` + shader mobile mặc định của Unity, tô màu bằng Start Color.
- Flipbook chỉ cho khói / lửa / điện. Frame over Time **tuyến tính** (`ComponentKit.LinearFrames`, không dùng `VfxBuildKit.Curve`).

## Slash
- Slash = **mesh + UV** (texture chạy theo UV trên mesh cung / vòng), không dùng billboard.
- Chỉ dùng bộ shader Coloso (`VFXLib/ColosoShaderAdditive|Alpha|AlphaCutOut_Optimized`): texture xám, màu từ ramp / Color over Lifetime, `_MaskTex` = `T_VFX_Gradient_01`, stream `Custom1XYZW`. Không viết shader slash riêng.
- Giữ texture slash ở bố cục UV gốc (nguyên khung, đúng tỉ lệ).
- Mesh: lấy từ `Assets/VFX/_Imported/Mesh/` trước.

## Khác biệt giữa các effect
- Effect mới / biến thể: đổi **ít nhất hai** trong: mesh, bố cục-vị trí, timing, lớp phụ. Không chỉ đổi màu.
- Biến thể **vẫn là cùng hiệu ứng** (cùng hành vi, số mảnh, lớp, tính chất hình học). Không tự biến thành effect khác.
- Chất liệu quyết định hình: băng cứng nên gai dài được; đất xốp nên ngắn (~1–2 m), thô, đỉnh vỡ.

## Skill
- `vfx-code` tách hẳn khỏi `vfx-maker`; điểm chung duy nhất là Review Lab.
- Mỗi effect mới: prefab `VFX_<Tên>.prefab` trong `Prefabs/`, thêm vào `Included` của `VfxShowcaseBuild.cs` (khi art lead duyệt), chạy lại **VFX → Showcase → Build Scene**.
