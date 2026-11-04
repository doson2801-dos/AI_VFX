# Mẹo / bẫy kỹ thuật Unity

- **Project:** Unity 2022.3, Built-in pipeline, color space **Linear** (màu particle tới shader ở dạng linear), Input Manager cũ.
- **Curve:** `VfxBuildKit.Curve(...)` tạo tangent phẳng (ease in/out). Flipbook chạy theo curve này đứng ở frame 0 ~12 % đời rồi chạy vội. Dùng `ComponentKit.LinearFrames` / `AnimationCurve.Linear`.
- **Stretched Billboard:** hướng bay = mép trái texture. Speed Scale 0, Length Scale = tỉ lệ ô (2 cho ô 256×128). Pivot (0,1,0) để gốc nằm trên đất / đuôi tia nằm trên hạt. Flipbook dọc phải xoay từng frame rồi xếp lại, không xoay cả sheet.
- **Effect cũ** (Explosion, FireballImpact) còn dùng Horizontal Billboard và curve ease: có trước luật, chỉ sửa khi được yêu cầu.
- **Shader dùng chung:** kiểm tra `Docs/VFX/SHADERS.md` trước khi viết mới. Hợp đồng particle: vertex color = tint, Custom1.x = tiến trình, Custom1.y = seed.
- **Kiểm tra compile khi Unity đang mở:** Windows chặn cướp focus, nên nhấn/nhả Alt (keybd_event 0x12) rồi `SetForegroundWindow` vào cửa sổ Unity; theo dõi `Library/ScriptAssemblies`. Lỗi shader thật: `ShaderUtil.CompilePass` + `GetShaderMessages`.
- **vfx-code auto build:** `VfxCodeAutoBuild.cs` theo dõi `Assets/VFX/*/Textures/*.json`, tự dựng prefab ~8 s kể cả khi Unity không focus. Chỉ script C# mới cần focus Unity một lần để compile.
- **Texture mobile:** sheet ≤ 1024 px.
