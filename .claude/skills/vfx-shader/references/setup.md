# Chuẩn bị project (lần đầu)

Kiểm tra từng mục; mục nào đã có thì bỏ qua.

1. **Build kit** (nguồn đúng là `Assets/VFX/_Kit/` của project): nếu thiếu (máy mới, Assets chưa chép), copy từ skill này:
   - `assets/VfxBuildKit.cs` → `Assets/VFX/_Kit/Editor/VfxBuildKit.cs`
   - `assets/VfxDemoReplay.cs` → `Assets/VFX/_Kit/Runtime/VfxDemoReplay.cs`
   Đã có thì so `VfxBuildKit.Version` (bản 1.2.0 trở lên có kiểm luật `StrictRules`); bản cũ hơn thì cập nhật từ `assets/`. Sửa kit trong project thì chép ngược lại vào `assets/` để hai bản không lệch.
2. **Thư viện hàm shader:** nếu chưa có `Assets/VFX/_Shared/Shaders/VfxShaderLib.cginc`, copy từ `assets/VfxShaderLib.cginc` của skill này. Đã có thì so `VFX_SHADER_LIB_VERSION`; chỉ **thêm** hàm mới, không đổi hàm cũ (shader khác đang dùng).
3. **Noise dùng chung:** nếu chưa có `Assets/VFX/_Shared/Textures/Noise/`, tạo bằng:
   ```
   python -I .claude/skills/vfx-shader/scripts/make_noise.py all -o "Assets/VFX/_Shared/Textures/Noise"
   ```
   Tạo ra `T_Noise_Smooth` (R: mảng mềm, G: noise mịn), `T_Noise_Cells` (R: ô lớn/vừa/nhỏ, G: đường viền ô), `T_Noise_Streaks` (R: kéo dọc Y, G: kéo dọc X). Tất cả 256 px, tileable, import linear + Repeat (build script gọi `ImportNoise`).
   Noise có sẵn trong project cũng được dùng (ví dụ `Assets/VFX/SmokeStylized/Textures/T_Noise_Dissolve_*.png`), nhưng phải import linear.
4. **Sổ đăng ký shader:** nếu chưa có `Docs/VFX/SHADERS.md`, tạo từ việc rà `Assets/**/*.shader` (khối Properties, keyword, số sample) theo mẫu cột của sổ hiện có.
5. **Pipeline và color space:** đọc `ProjectSettings/GraphicsSettings.asset` (`m_CustomRenderPipeline: {fileID: 0}` = Built-in) và `ProjectSettings.asset` (`m_ActiveColorSpace: 1` = Linear). HDRP: báo người dùng, skill không hỗ trợ.
6. **Review Lab** (dùng chung): cần có `tools/review-lab/build_review.py` và `review_lab.html`. Thêm cấu hình `review-lab` vào `.claude/launch.json` nếu chưa có: `python -m http.server 8776 --bind 127.0.0.1 --directory Docs/VFX/_Review`.
