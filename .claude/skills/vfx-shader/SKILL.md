---
name: vfx-shader
description: "VFX_Shader — skill dựng VFX Unity (prefab) của dự án: effect cần shader / mesh (bộ Coloso VFXLib cho slash / trail / vệt trên mesh + UV, shader nhập từ rpg-game, SH_VFX_* dùng chung; chỉ viết hoặc mở rộng shader nhẹ Built-in + URP khi chưa có cái nào đủ) và cả nhánh nhẹ particle + texture thuần dùng shader stock. Quy trình: tra Anatomy + chỉ mục loại effect → định hướng không gian (bắt buộc, thiếu thì hỏi) → research nhanh → kế hoạch duyệt 1 lần (có bảng texture từ Assets/Library) → build script (tools/unity_build.py) → preview + Review Lab → check_texture_plan + vfx-director review → bàn giao. Dùng khi người dùng gọi /vfx-shader, và khi worker / agent được giao làm một VFX Unity (slash, dissolve, vệt, lửa / khói toon, shockwave, beam, aura, vòng phép, tornado, gai đất, sét…)."
metadata:
  version: "1.4.0"
---

# VFX_Shader

Làm effect mà **shader quyết định hình, chuyển động, màu hoặc kết thúc**. Thứ tự ưu tiên khi cần shader:

1. **Dùng lại shader có sẵn** chỉ bằng material (bộ Coloso, shader nhập từ rpg-game, `SH_VFX_*` dùng chung).
2. **Mở rộng** shader do mình viết bằng keyword mới (mặc định tắt).
3. **Viết shader mới** (nhẹ, một pass, Built-in + URP) khi chưa có cái nào đủ.

Trao đổi bằng tiếng Việt; code và tên asset bằng tiếng Anh. Từ 2026-11-26 đây là skill duy nhất dựng prefab Unity theo quy trình (ngoài `/vfx-code` làm VFX hoàn toàn bằng code). `vfx-maker` đã xoá, bản lưu ở `Docs/VFX/_ArtDirection/_archive/vfx-maker_2.3.1_2026-11-26/`.

**Hai nhánh:** (A) cần shader / mesh: đủ các bước dưới đây; (B) **nhánh nhẹ** — particle + texture thuần, không cần shader mới: dùng shader stock qua `VfxBuildKit.Material`, bước 3 chỉ ghi "stock", bỏ bước shader mới / mở rộng; mọi bước khác (Anatomy, không gian, kế hoạch + bảng texture, build, kiểm, review) vẫn bắt buộc.

**Người dùng là art lead.** Yêu cầu hình khối / luật của họ thắng tài liệu. **Luật nằm ở một chỗ: `.claude/rules/vfx-art-lead.md`** (không gian, đòn trúng / nổ, texture + quy trình chọn Library, slash = Coloso, khác biệt giữa effect + giữ tạo hình cốt lõi, kỹ thuật prefab, bàn giao). Skill này chỉ nói **cách làm**, không chép lại luật; đọc file luật đầu mỗi việc, lệch nhau thì theo luật. Riêng từng loại effect có Anatomy + reference ở bảng `references/effect-index.md`.

```
Mô tả → ANATOMY + chỉ mục loại effect → ĐỊNH HƯỚNG KHÔNG GIAN (thiếu → HỎI) → research nhanh → CHỌN SHADER (dùng lại / mở rộng / mới / stock)
      → KẾ HOẠCH + bảng texture (DUYỆT 1 lần) → asset → [shader mới] → material + build script → build (tools/unity_build.py) + preview
      → check_texture_plan → REVIEW LAB → vfx-director review (≤ 3 vòng) → đăng ký shader → bàn giao → sửa
```

## 0. Chuẩn bị project (lần đầu)

Theo [references/setup.md](references/setup.md) (build kit, thư viện hàm, noise dùng chung, sổ shader, Review Lab). Build / chụp preview bằng `tools/unity_build.py` (mục 7); các lệnh dưới đây dùng `python3 -I` trên Linux, `python -I` hoặc `.venv/Scripts/python.exe -I` trên Windows, đường dẫn tương đối từ gốc project. Mesh và texture nhập sẵn của art lead: `Assets/VFX/_Imported/Mesh/` (55 `SM_VFX_*`), `Assets/VFX/_Imported/RpgGame/` (shader; xem `README.md` trong đó).

## 1. Nhận mô tả + tạo hình (Anatomy)

Trước hết tìm loại gần nhất trong [references/effect-index.md](references/effect-index.md), mở `Docs/VFX/_Anatomy/<loại>.md` + `materials.md`; chưa có hoặc chưa hiểu thì research rồi **lưu file Anatomy mới + một dòng vào bảng chỉ mục** (`_Anatomy/README.md`). Chép "Bất biến" vào kế hoạch; sau build đối chiếu preview với nó. Rồi đọc mô tả, ảnh / video tham chiếu (Read), JSON Shape Lab nếu có. Đọc hết những gì đã có trước khi hỏi. **Brief nói "học theo / làm giống prefab X" (rpg-game…):** làm đủ [references/study-reference.md](references/study-reference.md) (copy bản gốc, render, dump, đọc mesh + texture + Shader Graph) trước khi lập kế hoạch; dùng mesh + shader + số của họ trước, không chỉ đọc số rồi tự dựng (art lead 2026-11-04 và 2026-11-06). Người dùng chỉ sửa một effect đã có thì nhảy tới mục 8.

## 2. Định hướng không gian — BẮT BUỘC

Đọc [references/direction.md](references/direction.md): ngữ cảnh (air / ground / dir), mặt phẳng, góc camera (mặc định 3/4 nhìn xuống 40°; art lead hay ra lệnh góc khác, ví dụ topdown 60°), neo, quy mô (m, người 2 m), di chuyển, nền, thời gian, thành phần, Art Style + màu. **Thiếu thông tin thì hỏi** (`AskUserQuestion`, ≤ 2 lượt, ≤ 4 câu mỗi lượt); không tự đoán. Đề xuất của Claude ghi là *đề xuất*.

## 2b. Research nhanh trên mạng — BẮT BUỘC (art lead 2026-11-09)

Trước khi chọn shader, tìm nhanh VFX tương tự trên mạng để biết người ta làm thế nào (lớp nào, mesh / texture gì, shader làm gì, timing). Làm theo [references/web-research.md](references/web-research.md): ~3–5 nguồn, tối đa vài phút, rồi ghi **"Tham khảo"** (nguồn → điều học được → áp dụng vào đâu) vào kế hoạch ở mục 4. Chỉ lấy ý tưởng cách làm; không copy asset có bản quyền; luật art lead vẫn thắng nguồn nghiên cứu. Bỏ qua khi: brief đã có prefab / video tham chiếu cụ thể (dùng mục 1 + study-reference), hoặc chỉ sửa effect đã có (mục 8).

## 3. Chọn shader — BẮT BUỘC, từng thành phần

1. Đọc sổ `Docs/VFX/SHADERS.md` (menu, làm được gì, thuộc tính, chi phí, "không sửa" nếu có).
2. Rà thực tế: Glob `Assets/**/*.shader` (bỏ `Library/`), đọc `Properties` + `#pragma shader_feature` của ứng viên. Sổ có thể thiếu shader mới thêm.
3. **Gai đâm lên đất (băng / đất):** làm theo [references/ground-spike.md](references/ground-spike.md).
3b. **Magic circle (vòng phép):** không viết shader; làm theo [references/magic-circle.md](references/magic-circle.md) (texture vẽ bằng script + particle, cách HealCircle).
3c. **Tornado / cột gió xoáy:** không viết shader; làm theo [references/tornado.md](references/tornado.md) (làm lại `Stupid_Tornado_Projectile` của rpg-game từng lớp: vành `fbx_fx_cylinder_03` + Shader Graph `Fx_dissolve_particle_apb`, ống, sương, vụn; art lead 2026-11-06). Mẫu: `Assets/VFX/WindTornado/`.
4. Với **mesh + UV** (slash, vệt, trail, vòng): đọc [references/coloso.md](references/coloso.md) và chọn mesh trong `_Imported/Mesh`. Render thử mesh với texture tô UV (đỏ = u, xanh lá = v) trước khi chọn: tên mesh không nói hướng UV (ví dụ `Slash_360` là vòng dây đứng, không hợp topdown; `Slash_Circle_Thin` là vành phẳng).
5. Quyết định: **Dùng lại** (chỉ đổi thuộc tính, tạo material) → **Mở rộng** (keyword mới, mặc định tắt, không đổi thuộc tính cũ; shader "không sửa" thì không mở rộng) → **Viết mới**.
6. **Nhánh nhẹ (B):** thành phần chỉ cần particle + texture thì chọn "stock" (`VfxBuildKit.Material` tự chọn shader mobile / URP theo blend). Không viết shader chỉ để đổi màu hay mềm mép.
7. Ghi quyết định và lý do vào cột "Shader" của bảng thành phần.

## 4. Kế hoạch — lần duyệt duy nhất

Trình bày gọn trong chat rồi hỏi duyệt (`AskUserQuestion`: "Duyệt, làm luôn" / "Sửa"):

```markdown
## VFX_<Effect> — kế hoạch v1
Không gian: <air/ground/dir> · <mặt phẳng> · camera <...> · neo <...> · <m> · nền <...> (đã chốt: ...; đề xuất: ...)
Tham khảo (mục 2b): <nguồn → học được → áp dụng>; hoặc "bỏ qua: <lý do>"
Thời lượng: <s> · Art Style: <...>

| # | Layer | Vai trò & timing | Carrier (mesh / quad) | Shader (dùng lại / mở rộng / mới / stock) | Texture | Kết thúc |

Bảng texture (bắt buộc, mỗi ảnh trong builder một dòng, kể cả lớp phụ: arc, cracks, ring, glow):
| Thành phần | Thư mục Library (tra `LIBRARY.md`) | Ảnh chốt + dự phòng | Lý do (hướng omni / dir, kind, color) | Đã loại (vì sao) |
```

Thêm: **khác với effect nào, ở điểm nào** (mesh / bố cục / timing / lớp phụ), shader mới / mở rộng (hình, chuyển động, kết thúc, thuộc tính 5–10, keyword ≤ 3, chi phí sample), ngân sách (particle, material, texture), giả định. Không tạo file trong project trước khi được duyệt (trừ setup lần đầu). Sau khi duyệt lưu `Docs/VFX/<Effect>/Plan.md` (đủ bảng có ID: Review Lab đọc nó).

## 5. Asset và shader

- **Texture hình:** chọn theo **quy trình 6 bước của `LIBRARY.md` mục "Luật chọn"** (viết yêu cầu thành phần → tra bảng ra thư mục → `python3 -I tools/library_props.py --contact <nhóm>/<vai trò>` rồi Read ảnh → lọc bằng `library_props.csv` / `library_direction.csv` (kind, color, edge_touch, hướng omni / dir) → chốt 1 ảnh + 1–2 dự phòng → xem lại sau khi dựng). Không chọn theo tên file hay số thứ tự. Ảnh mới thêm vào Library còn `chua_xet` thì gán nhãn hướng trước khi dùng. Chỉ bake bằng script (`scripts/bake_slash_textures.py`…) hoặc Shape Lab khi Library không có hình hợp, và nói lý do trong kế hoạch. Ramp màu slash vẫn có thể bake. **Giữ nguyên khung UV, tỉ lệ gốc** với texture slash. Noise dùng chung: `Assets/VFX/_Shared/Textures/Noise/` (`scripts/make_noise.py`).
- **Shader mới:** copy `assets/SH_VFX_FX.template.shader` → `Assets/VFX/_Shared/Shaders/SH_VFX_<Name>.shader`, dựng hình theo [references/recipes.md](references/recipes.md), giữ đúng [references/mobile-rules.md](references/mobile-rules.md) (một pass unlit, không include URP, ≤ 3 sample, không vòng lặp, `// Cost:` ở header). Viết chung chung, tham số hoá, không hardcode timing của một effect.
- **Mesh:** ưu tiên `_Imported/Mesh`; mesh tạo bằng code chỉ khi thư viện không có.

## 6. Material + build script

- Copy `assets/ShaderFxBuild.template.cs` (quad) hoặc `assets/ColosoMeshFxBuild.example.cs` (mesh + Coloso, ví dụ Slash360) → `Assets/VFX/<Effect>/Editor/<Effect>Build.cs`. Prefab dựng từ script, không chỉnh tay; sửa script rồi build lại. Dùng `VfxBuildKit` (`Assets/VFX/_Kit/`) và đặt **`VfxBuildKit.StrictRules = true`** ở đầu `Build()` của effect mới (template đã có sẵn): vi phạm luật (Horizontal / Vertical Billboard, `sortingOrder` trùng, pivot Stretched, Frame over Time không thẳng, Scaling Mode, mesh thiếu) làm hỏng build ngay, không đợi tới review. Builder effect cũ giữ `false` (chỉ cảnh báo trong `BuildReport.txt`).
- Mỗi thành phần = một layer đúng ID. Thuộc tính material đặt trong script. Mesh renderer thì `SetActiveVertexStreams` đúng với shader (Coloso: `Position, Color, UV, Custom1XYZW`).
- **ĐỌC HƯỚNG MESH trước khi đặt Start Rotation / alignment — mọi VFX dùng mesh** (art lead 2026-11-06, lỗi FireTornado: đặt Whips nghiêng ±11° vì giả định trục mesh là Y, nhưng mesh phải xoay X 90° mới đúng hướng). Trục của mesh nhập **không mặc định là Y**: `fbx_fx_cylinder_03`, `Tornado_vertical`, `tornado_mesh` đều có trục vành / phễu trên **Z** trong Unity. Làm: (1) đọc `mesh.bounds` + trục xoay trong build script (hàm `Describe()` ở `assets/TornadoFireBuild.example.cs` log ra "revolution axis ~ Z"); (2) nếu bản tham chiếu đặt Start Rotation X ≈ 90° / 270° cho mesh đó thì **đó là tín hiệu trục khác Y**, đừng bỏ qua con số; (3) tính hướng mong muốn (vòng nằm ngang quanh cột = trục vành thẳng đứng = X 90°); (4) xem preview đủ góc rồi mới báo xong. Chi tiết: [references/tornado.md](references/tornado.md) mục "Hướng mesh".
- **Dựng đúng không gian đã chốt:** size theo mét, renderer mode theo mặt phẳng, simulation space theo neo, `cameraPos`/`lookAt` của `Finish()` khớp camera game (ví dụ topdown 60°: `lookAt + d·(0, sin60°, −cos60°)`).
- **Không `ImportTexture` lên texture dùng chung** (`Assets/Library/`, `_Shared/Textures/Noise/` …): chỉ `LoadAssetAtPath`. Cần setting khác thì copy ảnh (không copy `.meta`) sang `Assets/VFX/<Effect>/Textures/`. Import đổi wrap / sRGB của chúng sẽ hỏng các effect khác.
- Tên: `VFX_<Effect>`, `M_<Effect>_<Layer>`, `SH_VFX_<Name>`, `T_<Effect>_<Tên>`.

## 7. Build và tự kiểm tra

- **Build bằng một lệnh** (mọi máy): `python3 -I tools/unity_build.py <Class> --effect <Effect> [--warmup]`. Tool tự: xếp hàng bằng lock `work/vfx_orders/.unity.lock` (nhiều worker thay phiên), tìm Unity theo `ProjectVersion.txt` (hoặc `UNITY_EDITOR`), **không dùng `-nographics`** (cần để chụp preview), dùng `xvfb-run` nếu Linux không có màn hình, và **nếu editor đang mở project (Unity chỉ cho một instance) thì build trên bản copy `/tmp/<tên>_clone` rồi chép lại `Assets/VFX/<Effect>/` + `Docs/VFX/<Effect>/` kèm `.meta`**. File ngoài thư mục effect (shader dùng chung…) thêm `--copyback <đường dẫn>`. Script mới / vừa sửa thì thêm `--warmup` (không thì prefab có thể lưu `m_Script` Missing; kiểm `m_Script` guid trong prefab). Lệnh trả exit 0 chỉ khi log có `built OK`; in lỗi `error CS` / Exception và đường dẫn log.
- Cách thủ công (chỉ khi tool không dùng được): người dùng chọn menu **VFX → <Effect> → Build**, hoặc dựng ở project tạm (copy `_Kit`, effect, shader, mesh, noise + manifest `com.unity.modules.*`; `-batchmode`, không `-nographics`).
- Đọc `Docs/VFX/<Effect>/BuildReport.txt` (có mục "Rule notes"), **xem** `Preview_sheet.png`; đối chiếu bảng thành phần (đủ lớp, đúng mặt phẳng / quy mô / timing / góc camera) và "Bất biến". Phóng to khung để tìm lỗi viền (răng cưa, lớp lòi ra ngoài, billboard xuyên đất), cứng, cắt sắc.
- Kiểm shader biên dịch: `ShaderUtil.GetShaderMessages` trong script `-executeMethod` (đối chứng bằng cách làm hỏng một shader xem có báo lỗi không); `-batchmode -quit` một mình không báo lỗi shader.
- Tự sửa tối đa 2 vòng; không báo xong khi chưa xem preview. Compile được ≠ đạt mỹ thuật.
- **Chạy `python3 -I tools/check_texture_plan.py` (phải exit 0)**: mọi texture trong builder phải có dòng trong Plan.

## 7b. Review Lab

```
python3 -I tools/review-lab/build_review.py --project . [--effect <Effect>]
```
Ghi `Docs/VFX/_Review/index.html` (một file; bỏ `--effect` thì gom tất cả, rất nặng). Cho art lead: timeline preview, so sánh A/B, ghim góp ý, **Xuất phản hồi**. Chạy lại sau mỗi lần build.

## 7c. Review độc lập trước khi chuyển (art lead 2026-11-13)

Làm xong + `check_texture_plan` pass → gọi agent **`vfx-director`** (chỉ đưa đường dẫn prefab / builder / Plan / Anatomy, **không** đưa kết luận của mình) theo `Docs/VFX/_ArtDirection/agent-review.md` → sửa mọi `LỖI` → review lại, tối đa 3 vòng (vòng 3 còn lỗi thì nói thẳng khi chuyển). Rồi chuyển art lead / người order: nêu kết quả review, điểm yếu đã biết, link Review Lab. **Không tự chốt "đạt"; không thêm vào `Included` khi art lead chưa duyệt.**

## 8. Đăng ký, bàn giao, sửa

- **Cập nhật `Docs/VFX/SHADERS.md`** khi viết mới / mở rộng (menu, file, làm được gì, thuộc tính + keyword chính, chi phí, effect đang dùng); dùng lại thì thêm tên effect vào cột "Đang dùng".
- Bàn giao: prefab, scene demo, ảnh preview, link Review Lab; shader dùng lại / mở rộng / mới; chi phí; **phần chưa kiểm chứng** (chưa xem chuyển động thật, chưa đo máy thật).
- **Sửa theo phản hồi:** mỗi ghim Review Lab gán vào ID thành phần theo timing + vị trí; ghim không gán được thì hỏi, không đoán. Đổi màu / kích thước / timing chỉ sửa material trong build script. Sửa shader dùng chung thì kiểm tra và build lại effect khác trong cột "Đang dùng".
- **Scene chung:** mọi VFX nằm trong `Assets/VFX/_Showcase/Scenes/VFX_Showcase.unity` (có UI đổi qua lại). Khi thêm effect mới, nhắc người dùng chạy **VFX → Showcase → Build Scene**: lệnh này chỉ thêm effect chưa có và giữ nguyên setup art lead đã sắp (camera, môi trường, vị trí); không dùng **Rebuild Scene From Scratch** nếu art lead không yêu cầu. Build lại effect đã có thì scene tự cập nhật. Đèn demo chỉ có trong Showcase lúc Play (bảng `Table` của `_Showcase/Runtime/VfxShowcaseLights.cs`), không gắn đèn vào prefab: effect mới thêm một dòng vào bảng đó. Scene chỉ liệt kê effect trong `Included` của `VfxShowcaseBuild.cs`: thêm tiền tố `VFX_<Tên>_` vào đó khi effect mới đã được art lead duyệt.
- Phản hồi mơ hồ ("đang có lỗi visual") không kèm ảnh: tìm lỗi ở preview phóng to, sửa những gì thấy được, nói rõ phần chưa chắc và xin ảnh / mô tả.

## Việc riêng của skill (luật chung ở `.claude/rules/vfx-art-lead.md`)
- **Slash:** chỉ bộ Coloso ([references/coloso.md](references/coloso.md)); `_MainTex` chạy UV lấy từ `Assets/Library/Slash/Main_tex(Uvmesh)/`.
- **Magic circle:** [references/magic-circle.md](references/magic-circle.md). **Tornado:** [references/tornado.md](references/tornado.md) + [references/study-reference.md](references/study-reference.md). **Gai băng / đất:** [references/ground-spike.md](references/ground-spike.md). **Điện:** `thunder-core.md`, `lightning.md`, `lightning-set.md`.
- **Biến thể:** thêm dòng **"Khác với bản nào, ở điểm nào"** vào kế hoạch (mesh / bố cục / timing / lớp phụ; ít nhất hai, vẫn nhận ra là cùng hiệu ứng). Đừng tái dùng nguyên builder và chỉ đổi bảng màu.

## Tài liệu

| File | Nội dung |
|---|---|
| [references/effect-index.md](references/effect-index.md) | **Chỉ mục loại effect → Anatomy → reference → builder / prefab đã có** (mở đầu tiên) |
| [references/coloso.md](references/coloso.md) | Bộ Coloso: cách dùng chuẩn, Custom Streams, công thức slash quanh mesh vòng, lỗi thường gặp |
| [references/magic-circle.md](references/magic-circle.md) | Vòng phép: dùng cách HealCircle, không viết shader |
| [references/ground-spike.md](references/ground-spike.md) | Gai băng / đất đâm lên đất: lớp, số khối, hướng, tuổi thọ, bảng màu Băng ↔ Đất, ghi chú theo nguyên tố, bài học quy trình |
| [references/tornado.md](references/tornado.md) | Tornado / cột gió: cách bản gốc `Stupid_Tornado_Projectile` hoạt động (mesh, Shader Graph, sheet đóng gói kênh), bảng lớp + số, khác bản gốc, biến thể, lỗi đã gặp |
| [references/study-reference.md](references/study-reference.md) | Học từ prefab tham chiếu đủ bước: copy theo GUID, render + dump, Shader Graph hồng, đọc mesh / texture, dựng |
| [references/web-research.md](references/web-research.md) | Research nhanh trên mạng trước khi chọn shader (bước 2b) |
| [references/thunder-core.md](references/thunder-core.md), [lightning.md](references/lightning.md), [lightning-set.md](references/lightning-set.md) | Điện: cột sáng / wave / flare (công thức chính), ThunderSpear / LightningTrail / AuraGauntlet, ghi chú học từ rpg-game |
| [references/direction.md](references/direction.md) | Định hướng không gian |
| [references/mobile-rules.md](references/mobile-rules.md) | Quy tắc shader mobile (cho shader mới viết) |
| [references/recipes.md](references/recipes.md) | Công thức SDF / kết thúc cho shader mới |
| [references/setup.md](references/setup.md) | Chuẩn bị project |
| `assets/` | `VfxBuildKit.cs` + `VfxDemoReplay.cs` (bản dự phòng của build kit, chép sang `Assets/VFX/_Kit/` nếu thiếu), template shader, build script quad, ví dụ mesh + Coloso (Slash360), ví dụ vòng phép (HealCircle), ví dụ gai đất / băng (`GroundSpikeBuild.example.cs`), ví dụ tornado (`TornadoBuild.example.cs` vành + Graph, `TornadoFireBuild.example.cs` phễu + Thrust), công cụ render + dump prefab tham chiếu (`RefRender.example.cs`), `VfxShaderLib.cginc` |
| `scripts/` | `make_noise.py`, `bake_slash_textures.py`, `heal_circle_textures.py`, `copy_closure.py` (copy prefab + phụ thuộc theo GUID). Công cụ chung ở `tools/`: `unity_build.py` (build mọi máy), `check_texture_plan.py`, `library_props.py`, `review-lab/` |
