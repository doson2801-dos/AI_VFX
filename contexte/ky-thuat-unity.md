# Mẹo / bẫy kỹ thuật Unity

- **Project:** Unity 2022.3, Built-in pipeline, color space **Linear** (màu particle tới shader ở dạng linear), Input Manager cũ.
- **Curve:** `VfxBuildKit.Curve(...)` tạo tangent phẳng (ease in/out). Flipbook chạy theo curve này đứng ở frame 0 ~12 % đời rồi chạy vội. Dùng `ComponentKit.LinearFrames` / `AnimationCurve.Linear`.
- **Stretched Billboard:** hướng bay = mép trái texture. Speed Scale 0, Length Scale = tỉ lệ ô (2 cho ô 256×128). Pivot (0,1,0) để gốc nằm trên đất / đuôi tia nằm trên hạt. Flipbook dọc phải xoay từng frame rồi xếp lại, không xoay cả sheet.
- **Effect cũ** (Explosion, FireballImpact) còn dùng Horizontal Billboard và curve ease: có trước luật, chỉ sửa khi được yêu cầu.
- **Shader dùng chung:** kiểm tra `Docs/VFX/SHADERS.md` trước khi viết mới. Hợp đồng particle: vertex color = tint, Custom1.x = tiến trình, Custom1.y = seed.
- **Kiểm tra compile khi Unity đang mở:** Windows chặn cướp focus, nên nhấn/nhả Alt (keybd_event 0x12) rồi `SetForegroundWindow` vào cửa sổ Unity; theo dõi `Library/ScriptAssemblies`. Lỗi shader thật: `ShaderUtil.CompilePass` + `GetShaderMessages`.
- **vfx-code auto build:** `VfxCodeAutoBuild.cs` theo dõi `Assets/VFX/*/Textures/*.json`, tự dựng prefab ~8 s kể cả khi Unity không focus. Chỉ script C# mới cần focus Unity một lần để compile.
- **Texture mobile:** sheet ≤ 1024 px.

## Showcase: Build Scene không được xoá setup (2026-11-05)
- Art lead mất setup mỗi lần Build Scene (bản cũ tạo scene mới hoàn toàn). Nay `VfxShowcaseBuild.Update()` mở scene có sẵn, chỉ thêm prefab chưa từng đặt (GUID nhớ ở `VfxShowcase.addedPrefabs`), sao lưu trước vào `Scenes/_Backup/`. Dựng lại từ đầu = menu riêng có xác nhận.
- Mọi công cụ sinh scene / asset mà art lead có thể chỉnh tay: cập nhật tại chỗ, không tạo lại; có sao lưu.

## Projectile tự chạy bằng sub-emitter (FireballThrow, 2026-11-05)
- Một prefab bay + nổ không cần script: hạt thân có Velocity over Lifetime (y tuyến tính = parabol đúng, không phụ thuộc Physics.gravity), lifetime = thời gian bay; sub-emitter **Death** kích các lớp nổ ở điểm chạm. Lớp nổ: World space, burst ở t = 0.
- Velocity over Lifetime: ba trục phải **cùng kiểu** (cùng là curve), nếu không Unity báo "Particle Velocity curves must all be in the same mode" và bỏ qua vận tốc.
- `VfxBuildKit.CaptureSheet` mặc định tua `Simulate(t)` một bước lớn: **sub-emitter Death không kích**. Truyền `motion: t => Vector3.zero` để mô phỏng từng bước 1/30 s.
- Không dùng `SaveNested` cho prefab có sub-emitter: tách lớp thành prefab con làm mất liên kết sub-emitter.

## Bẫy tìm ra khi review biến thể 2026-11-09
- **`Particle Velocity curves must all be in the same mode`**: `vel.x = MinMaxCurve(0f)` (Constant) cùng `vel.y = MinMaxCurve(a, b)` (TwoConstants) thì Unity bỏ cả module, hạt đứng yên mà không báo lỗi lúc build (chỉ thấy trong Console khi Simulate). Dùng `(0f, 0f)` cho trục không dùng. Đã sửa ở `Slash360FireBuild`, `IceSpikeVariantKit`.
- **Slash mesh vòng, nhiều layer Coloso có `window` khác nhau**: `Custom1.z` = vị trí đầu / **window của chính layer đó**. Layer có window khác Body phải nhân đường cong với `WindowBody / WindowLayer`, nếu không Edge (window nửa) chạy chậm một nửa rồi đứng yên ở mép (mảng trắng cố định), Trail (window lớn) chạy vượt đầu. Đã sửa ở Slash360 Fire / Water; `Slash360Build.cs` (Earth) còn dùng đường cong chung, chưa đụng.
- **Texture Library cho slash có cột đầu sáng sát mép**: `_MainClampX` kéo cột mép ra ngoài 0..1 nên cả mesh sáng. Copy ảnh sang `Textures/` rồi làm tối vài % cột đầu / cuối (xem `BakeFireMain`).
- **Build effect khi Unity đang mở project**: không batch được. Cách làm: một script Editor tạm poll file `Temp/remote_cmd.txt` rồi gọi `Build()` (nhớ nhấn Alt + `SetForegroundWindow` một lần để Unity compile script mới, sau đó `AssetDatabase.Refresh()` từ chính script). Scene đang mở có dấu `*` thì `ConfirmSceneSwitch` hiện hộp thoại Save và treo: cần người dùng Save trước. `Finish()` mở scene Demo của effect, nhớ mở lại `VFX_Showcase` sau cùng. Không chụp màn hình để kiểm tra (lộ nội dung riêng tư).

## Ribbon (Trails mode Ribbon), bụi billboard lớn, drag (LuckyDice 2026-11-25)
- **Ribbon: vị trí 0 của `widthOverTrail` / `colorOverTrail` là đầu CŨ (đuôi), 1 là đầu mới** (sát hạt gốc). Ngược với trail từng hạt trực giác. Muốn thon về đuôi: 0 → 0, 1 → lớn.
- Dải bám vật rơi nhanh: phát bằng **`rateOverDistance`** (6 điểm / m), không dùng rate over time (khi chụp bằng `Simulate` bước 1/60 s các điểm dồn cục → đường răng cưa kiểu tia sét). Không bật Noise, cone góc ~1°. Hạt gốc `renderMode None` vẫn vẽ ribbon.
- Ribbon dùng texture dải mềm (`trail_ribbon_019`), không dùng thấu kính `trail_streak_005` (mảnh như dây điện).
- Billboard cỡ lớn có tâm sát y = 0 bị sàn cắt nửa dưới (lộ cạnh phẳng): nâng tâm ≥ nửa kích thước.
- `limitVelocityOverLifetime.drag` mặc định **nhân theo kích thước hạt** (`multiplyDragByParticleSize`): hạt to bị phanh mạnh, bụi không toả. Điều khiển tầm toả bằng `velocityOverLifetime.speedModifier` (đủ 3 trục cùng mode).
- Unity đang mở project (Linux, Hub): build bằng `refresh_unity compile=request` rồi `execute_menu_item VFX/<Effect>/Build` qua MCP; builder tự mở lại `VFX_Showcase.unity` ở cuối. Mỗi lần chạy ~1.5 phút.

## TrailRenderer, billboard đứng trên sàn, chụp Play mode (LuckyDice v4, 2026-11-25)
- **TrailRenderer mượt hơn Trails module** của PS cho vật rơi nhanh + xoay (Trails module ra đường gãy). `numCapVertices = 0` (cap tròn đâm ra trước vật). `widthCurve` / `colorGradient`: 0 = đầu mới.
- **Billboard đứng chạm sàn**: Pivot (0, 0.5, 0) đặt đáy quad ở y của hạt (không bị sàn cắt), thay cho nâng tâm hạt lên cao (làm nổ lơ lửng). Pivot xoay theo quad nên đặt startRotation = 0.
- TrailRenderer không cập nhật khi `Simulate` tay: chụp ở Play mode với `Time.captureFramerate = 60`, `cam.Render()` vào RenderTexture (không dùng `WaitForEndOfFrame`, không chạy trong batchmode). Batch không cửa sổ: `DISPLAY=:0 flock work/vfx_orders/.unity.lock Unity -batchmode -projectPath . -executeMethod ...` **không có `-quit`**, watcher `[InitializeOnLoad]` tự thoát khi có file done (domain reload khi vào Play mode xoá delegate). `pkill -f "Unity -batchmode"` giết luôn shell đang chạy lệnh có chứa chuỗi đó.

## Missing Script khi build trên bản copy project (LuckyDice v14, 2026-11-26)
- Script mới / vừa sửa, build trong bản copy có `Library` cũ: `AddComponent<T>()` chạy được nhưng prefab lưu `m_Script: {fileID: 0}` (Missing) vì MonoScript chưa gắn class (`MonoScript.GetClass()` = null). Sửa: đổi nội dung file script (touch) rồi chạy một lượt batch để reimport, rồi mới build. Luôn kiểm `m_Script` guid trong prefab và `debug.txt` (đỉnh phải xoay) trước khi gửi demo; hình xúc xắc không xoay là dấu hiệu.- Chạm script **sau** khi assembly đã biên dịch mới gắn MonoScript đúng: touch lần 1 cùng lượt với file mới vẫn Missing; chạy một lượt Unity (executeMethod bất kỳ), rồi chạm lần 2 + chạy lại một lượt, rồi mới build (kiểm `MonoScript.FromMonoBehaviour(...)` có path).
