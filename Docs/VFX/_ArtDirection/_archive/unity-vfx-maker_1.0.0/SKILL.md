---
name: unity-vfx-maker
description: "Quy trình rút gọn để làm VFX trong Unity ra prefab: lấy/tạo asset (texture, mesh), dựng Particle System, dùng hoặc viết shader nhẹ cho mobile (Built-in + URP), đặt tên có hệ thống. Chỉ chạy khi người dùng gọi /unity-vfx-maker."
disable-model-invocation: true
metadata:
  version: "1.0.0"
---

# Unity VFX Maker

Biến mô tả effect thành **prefab Unity chạy được** với một lần duyệt duy nhất. Trao đổi bằng tiếng Việt; code, tên asset và prompt cho ChatGPT viết bằng tiếng Anh.

Prefab được **dựng từ một Editor script** (`<Effect>Build.cs`) chứ không chỉnh tay trong Inspector. Nhờ vậy mỗi lần sửa chỉ cần sửa script rồi build lại, kết quả luôn tái tạo được, và Claude tự chụp preview để kiểm tra.

```
Mô tả → Kế hoạch (DUYỆT 1 lần) → Asset → Build script → Build + preview → Bàn giao → Sửa theo phản hồi
```

## 0. Chuẩn bị project (chỉ lần đầu trong mỗi project)

Làm nhanh, không hỏi người dùng trừ khi thiếu thông tin:

1. **Unity version:** đọc `ProjectSettings/ProjectVersion.txt`. Unity.exe nằm ở `C:/Program Files/Unity/Hub/Editor/<version>/Editor/Unity.exe`.
2. **Render pipeline:** `ProjectSettings/GraphicsSettings.asset` có `m_CustomRenderPipeline: {fileID: 0}` → Built-in; có guid → kiểm tra `Packages/manifest.json` có `com.unity.render-pipelines.universal` → URP. HDRP: báo người dùng, skill không hỗ trợ.
3. **Build kit:** nếu chưa có `Assets/VFX/_Kit/`, copy từ thư mục `assets/` của skill này:
   - `assets/VfxBuildKit.cs` → `Assets/VFX/_Kit/Editor/VfxBuildKit.cs`
   - `assets/VfxDemoReplay.cs` → `Assets/VFX/_Kit/Runtime/VfxDemoReplay.cs`
   Nếu đã có, so `VfxBuildKit.Version` với bản trong skill; bản skill mới hơn thì cập nhật (không đụng build script của từng effect).
4. **Quy ước có sẵn:** nếu project đã có quy ước đặt tên/thư mục VFX riêng (xem vài effect cũ), hỏi người dùng giữ quy ước cũ hay dùng quy ước của skill. Mặc định dùng [references/naming.md](references/naming.md).

## 1. Nhận mô tả

Người dùng mô tả effect (có thể kèm ảnh/video tham chiếu, hoặc spec/prompt từ skill `dynamic-vfx-prompt-builder` — khi đó dùng spec làm brief, không hỏi lại những gì spec đã chốt).

Chỉ hỏi khi thiếu điều **làm thay đổi thiết kế**. Gom tối đa một lượt `AskUserQuestion` (≤ 4 câu), ví dụ:
- Kiểu phát: một lần (impact, explosion) / lặp (aura, fire loop) / bay (projectile + trail).
- Phong cách: stylized/cartoon, realistic, anime...
- Màu chủ đạo, kích thước so với nhân vật (mặc định 1 unit ≈ 1 m, nhân vật cao ~2 m).
- Góc camera game (top-down, side, 3rd-person) nếu ảnh hưởng hình dạng.

Phần nào không hỏi thì tự chọn giá trị hợp lý và ghi là **giả định** trong kế hoạch.

## 2. Kế hoạch — lần duyệt duy nhất

Trước khi lập kế hoạch, tìm asset tái sử dụng (đọc [references/library.md](references/library.md)): trong project hiện tại trước, rồi thư viện `D:\Projects\animlibrary\Assets\VFX_Library`. Xem trực tiếp ảnh texture ứng viên (Read file PNG) thay vì chỉ đoán theo tên.

Đọc [references/particles.md](references/particles.md) để chọn layer và thông số; [references/shaders.md](references/shaders.md) nếu cân nhắc shader mới.

Trình bày kế hoạch **gọn trong chat**, theo mẫu:

```markdown
## VFX_<Effect> — kế hoạch v1
Pipeline: <Built-in/URP> · Kiểu: <one-shot/loop> · Thời lượng: <s> · Kích thước: <m>

| # | Layer (GameObject) | Vai trò & timing | Kỹ thuật | Material / Shader | Texture (nguồn) |
|---|---|---|---|---|---|
| 1 | Flash | lóe sáng 0–0.15s | billboard burst 1 | M_<Effect>_Flash_Add / Mobile/Particles/Additive | T_Glow_Soft (script: glow) |
| 2 | Sparks | tia văng 0–0.6s | stretched billboard, burst 20 | ... | T_Spark_Comet (script: comet --style anime) |

Asset mới cần tạo: <script / thư viện / ChatGPT cho từng texture, hoặc "không">
Shader mới: <không / SH_xxx — lý do>
Ngân sách: tổng max particles ≈ <n>, <m> material, texture ≤ <size>
Giả định: <các giá trị tự chọn>
```

Hỏi duyệt bằng `AskUserQuestion` với các lựa chọn kiểu "Duyệt, build luôn" / "Sửa kế hoạch". Người dùng có thể sửa bằng chat. **Không tạo file trong project trước khi kế hoạch được duyệt** (trừ build kit ở bước 0).

Sau khi duyệt, lưu kế hoạch vào `Docs/VFX/<Effect>/Plan.md` (kèm nguồn của từng asset lấy từ thư viện).

## 3. Chuẩn bị asset

**Texture: luôn thử theo thứ tự rẻ → đắt** và ghi nguồn từng texture trong kế hoạch:

1. **Sinh bằng script (~1 giây, gần như không tốn token)** — glow, dot, ring (shockwave), flare, comet (spark cho stretched billboard), star (sao anime đặc), glint, impact (hit spark gai bất đối xứng + mảnh vụn), slash (lưỡi liềm mép rách), smoke (khói hoạt hình nhiều múi, bóng chồng khối), fire_element (**lửa kiểu 1 đã chốt với art lead**: phần tử đơn cho particle random, có sẵn mờ; `--look`, `--sharp` — quy tắc ở shape-language.md), fire (ngọn lửa anime: lõi tròn + lưỡi S/C + mảng tách — chưa theo spec art lead), fireblob (mảng lửa hạt đậu kiểu cfxr), lightning (điện: đoạn thẳng góc ngẫu nhiên, thắt sau góc gãy, nhánh 20–45°, ngang hoặc `--vertical`), ember, trail, gradient, noise, dissolve; có atlas biến thể (`--grid 2x2`) và flipbook — **chỉ cho khói, lửa, điện** (`smoke`, `fire`, `fireblob`, `lightning`) — (`--grid 4x4 --anim --dir <độ>`: tự dissolve bằng ít lỗ lớn/vừa/nhỏ và mờ dọc theo hướng tan A = `--dir` (0 phải, 90 lên); script in ra số cặp lỗ cùng cỡ cạnh nhau — phải bằng 0; chọn `--dir` theo hướng effect tan trong game), kiểu cel bằng `--style anime`:
   ```
   python -I "C:/Users/Manh/.claude/skills/unity-vfx-maker/scripts/make_texture.py" comet -o "Assets/VFX/<Effect>/Textures/T_Spark_Comet.png" --style anime
   ```
   `python -I <script> list` liệt kê preset và tham số mặc định. Xem ảnh sau khi tạo (Read), chỉnh tham số nếu cần (`--radius --thickness --halo --lobes --pinch --seed`...; đổi `--seed` để có hình khác). Chuẩn chất lượng và cách tự kiểm tra: [references/texture-quality.md](references/texture-quality.md); nguyên tắc hình khối từng loại (nghiên cứu web + board Pinterest của người dùng): [references/shape-language.md](references/shape-language.md) — đọc khi thiết kế hoặc viết TEXTURE REQUEST.
2. **Từ thư viện** — hình hữu cơ đã có sẵn (lửa, khói, slash, tàn lửa...): copy file ảnh (không copy `.meta`) vào `Assets/VFX/<Effect>/Textures/` hoặc `Assets/VFX/_Shared/Textures/` nếu dùng chung, **đổi tên theo quy ước**. Import settings do build script đặt lại.
3. **ChatGPT (1–2 phút/ảnh, chậm nhất)** — chỉ khi hai cách trên không đáp ứng (flipbook lửa/khói phức tạp, hình đặc thù của concept). Làm theo [references/textures-chatgpt.md](references/textures-chatgpt.md): Project "Texture_Maker", gửi khối TEXTURE REQUEST qua app ChatGPT trên máy (Claude copy prompt vào clipboard và mở app, người dùng dán/gửi và lưu ảnh). Gộp nhiều hình vào một atlas khi được. Trong lúc chờ, có thể build với texture tạm (script hoặc thư viện), đặt tên `..._TEMP`.

- **Mesh:** ưu tiên mesh có sẵn (thư viện, primitive Unity) hoặc mesh tạo bằng code trong build script (ring, cone, quad strip). Chỉ dùng Blender MCP khi cần hình phức tạp và Blender đang mở.
- **Shader mới** (chỉ khi shader có sẵn không đáp ứng): bắt đầu từ `assets/SH_VFX_Particle.shader`, lưu vào `Assets/VFX/_Shared/Shaders/` nếu dùng chung.

## 4. Viết build script

Copy `assets/EffectBuild.template.cs` → `Assets/VFX/<Effect>/Editor/<Effect>Build.cs`, thay `__EFFECT__`, rồi viết từng layer theo kế hoạch đã duyệt. Dùng helper của `VfxBuildKit` (`ImportTexture`, `Material`, `Particle`, `SizeOverLifetime`, `AlphaOverLifetime`, `Finish`...); cấu hình các module còn lại trực tiếp bằng API `ParticleSystem` của Unity.

Giữ đúng tên GameObject, material, texture như trong kế hoạch — tên là một phần của hợp đồng với người dùng.

## 5. Build và tự kiểm tra

1. **Unity đang mở project?** Kiểm tra process: `Get-CimInstance Win32_Process -Filter "Name='Unity.exe'" | Select-Object CommandLine` có chứa đường dẫn project.
   - **Đang mở:** Unity tự compile khi file thay đổi. Nhờ người dùng chọn menu **VFX → <Effect> → Build**, rồi báo lại.
   - **Không mở:** chạy batchmode (chạy nền, có thể mất vài phút):
     ```
     "<Unity.exe>" -batchmode -projectPath "<project>" -executeMethod VfxEffects.<Effect>Build.BuildBatch -logFile "<project>/Logs/vfx_<Effect>.log"
     ```
     Không thêm `-nographics` (cần GPU để chụp preview). Exit code ≠ 0 → đọc log, tìm `error CS` hoặc exception.
2. **Đọc kết quả** trong `Docs/VFX/<Effect>/`:
   - `BuildReport.txt` — lỗi shader, material thiếu, tổng particle.
   - `Preview_sheet.png` — dải ảnh chụp effect ở các mốc thời gian. **Xem ảnh** và so với kế hoạch/tham chiếu: hình dạng, màu, kích thước, timing, có layer nào không hiện (material hồng = shader lỗi).
3. Tự sửa và build lại tối đa 2 vòng cho các lỗi rõ ràng. Không tuyên bố "đã xong" khi chưa xem preview.

## 6. Bàn giao

Báo ngắn gọn:
- Đường dẫn prefab `Assets/VFX/<Effect>/Prefabs/VFX_<Effect>.prefab` và scene demo `.../Scenes/<Effect>_Demo.unity` (Play để xem, phím Space để phát lại).
- Gửi ảnh preview sheet.
- Asset mới, asset lấy từ thư viện, phần còn tạm (`_TEMP`), điều chưa kiểm chứng được (ví dụ: chưa test trên thiết bị mobile thật).

## 7. Sửa theo phản hồi

Sửa trong `<Effect>Build.cs` rồi build lại; cập nhật `Plan.md` nếu thay đổi layer/asset. Thay đổi nhỏ (màu, timing, số lượng) không cần duyệt lại; thêm/bớt layer hoặc asset mới thì nêu ngắn rồi làm.

**Lưu ý:** build lại sẽ ghi đè prefab. Nếu người dùng đã chỉnh tay prefab trong Inspector, hỏi trước: chuyển các chỉnh sửa đó vào script, hay dừng dùng build script cho effect này.
