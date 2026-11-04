# codefx: làm VFX hoàn toàn bằng code (toon) — Chế độ C của `/vfx-maker`

> Tích hợp vào `/vfx-maker` 2.1.0 (art lead, 2026-11-02). Thư mục: `D:/Game_prj/VFX_LIb/.claude/skills/vfx-maker/codefx/`.
> Phương pháp học từ pixelfx (MIT); phân tích ở `<project>/Docs/VFX/_ArtDirection/components/PIXELFX_ANALYSIS.md`.
> Khác pixelfx: xuất **toon mượt**, gồm bậc tông cứng, mép khử răng cưa, glow mềm. Không dùng pixel/dither.

**Khi nào dùng:**
- Thư viện shape (Shape Lab, 522 shape) không có hình đạt yêu cầu.
- Cần hình **chuyển động có diễn**: overshoot, tan, hạt bay theo lực. Một texture tĩnh không làm được việc này.
- Cần đổi nguyên tố nhanh: chỉ đổi `palette` rồi render lại.

## 0. Xác định không gian TRƯỚC khi viết code (bắt buộc)

Art lead, 2026-11-02: "VFX code vẫn phải xác định không gian như chúng ta đã làm. Khi tôi yêu cầu tạo fx thì phải **hỏi** nếu cảm thấy chưa đủ thông tin về không gian."

**Quy tắc:**
1. Đọc brief, ảnh hoặc JSON trước. Ghi rõ điều nào **đã chốt** (người dùng nói), điều nào **quan sát được** (thật sự thấy trong ảnh), điều nào **đề xuất** (Claude), điều nào **chưa rõ**. Không nâng đề xuất thành lựa chọn của người dùng.
2. Còn mục nào ở bảng dưới **chưa rõ** thì **hỏi trước khi viết code**:
   - dùng `AskUserQuestion`, tối đa 4 câu một lượt, gom vào tối đa 2 lượt;
   - mục nào người dùng đã nói thì không hỏi lại;
   - gợi ý của Claude ghi là *đề xuất*.
3. Ghi kết quả vào `META["space"]`. `render.py` **dừng lại** (mã thoát 2) nếu thiếu hoặc sai, và liệt kê đúng những câu cần hỏi.

| Mục (`space.*`) | Lựa chọn | Quyết định gì trong codefx / Unity |
|---|---|---|
| `context` | `air` (giữa không) · `ground` (tại đất) · `dir` (có hướng đòn) | Bố cục (toả cầu / nằm đất / nón theo hướng). `origin`: air = giữa ô; ground = gần đáy ô (chân chạm đất); dir = lệch trái, hướng đòn vẽ sang phải |
| `plane` | `billboard` (đứng, quay về camera) · `ground` (nằm đất = Billboard + Render Alignment Local, xoay X 90°) · `stretch` (Stretched Billboard, texture ngang, hướng bay = mép TRÁI) | Renderer trong Unity. **Không dùng Horizontal / Vertical Billboard** |
| `camera` | `3/4 40` (mặc định dự án) · top-down · side · sau lưng · UI | Hướng đèn tô sáng, độ dẹt của vòng nằm đất, camera preview |
| `width_m` | Bề ngang cả ô tính bằng mét, so với người cao 2 m: nhỏ < 0.5 · vừa 1–2 · lớn 3–6 · rất lớn > 6 | Start Size trong Unity. Nét mảnh nhất phải còn đọc được ở cỡ màn hình |
| `anchor` | Điểm trong thế giới · bám nhân vật/bone · bám vũ khí · nối 2 điểm · UI | Simulation space, pivot, effect đi theo hay đứng lại |
| `background` | `dark` · `light` · `mixed` | Add chỉ hợp nền tối. Nền sáng / lẫn thì dùng Alpha hoặc thêm viền tối |

Ngoài ra cần biết **thời gian** (một lần / loop / bay + chạm, thời lượng, mốc hiệu lực) và **thành phần** (chọn lớp nào). Hai mục này hỏi chung lượt với không gian nếu brief chưa nói.

**Ví dụ khai báo:**

```python
space=dict(context="ground", plane="billboard", camera="3/4 40", width_m=4.4,
           anchor="world point (ground)", background="mixed")
```

`CodeFxComponentsBuild.cs` đọc khai báo này trong file `.json` (Start Size = `width_m`, mặt phẳng, độ cao preview), không ghi cứng trong code. Thiếu khai báo thì build báo lỗi.

## 1. Chạy

```bash
python -I "D:/Game_prj/VFX_LIb/.claude/skills/vfx-maker/codefx/render.py" <effect.py> --out <thư_mục> --gif --check
#   ví dụ mẫu: .../codefx/fx/impact/hit_star.py (res 2 = ô 256) · .../codefx/fx/smoke/puff_burst.py --res 1.4 --opts '{"seed":9}'
```

**Effect của dự án** để ở `<project>/Docs/VFX/<Effect>/codefx/<tên>.py`. Skill chỉ giữ bộ công cụ và các mẫu. `render.py` tự thêm thư mục codefx vào đường dẫn import, nên effect ở đâu cũng `import codefx` / `from smoke import Smoke` được. Output đưa thẳng vào `Assets/VFX/<Effect>/Textures/` hoặc `Assets/VFX/_Components/CodeFX/Textures/`.

Lệnh này xuất ra:
- **Sheet cho Unity:**
  - `add`: `T_<tên>_4x4.png`, dùng cho Mobile/Particles/Additive;
  - `alpha`: `T_<tên>_Body_4x4.png` (Alpha Blended) + `T_<tên>_Light_4x4.png` (Additive).
- `<tên>_preview.png`: ảnh xem trước, ghi thời gian từng frame, dấu + đỏ là điểm gốc.
- `<tên>.gif`: chuyển động đủ 30 fps (khi có `--gif`).
- `<tên>.json`: thời lượng, lưới, kích thước, pivot. Script build Unity đọc file này.
- Với `--check`: kết quả kiểm tra. Nếu có lỗi thì lệnh trả mã lỗi 1.

**Đưa vào Unity:**
- Chép sheet + json vào `Assets/VFX/_Components/CodeFX/Textures/` (thành phần), hoặc `Assets/VFX/<Effect>/Textures/` (effect riêng).
- Thành phần: thêm một dòng `Make(...)` trong `Assets/VFX/_Components/CodeFX/Editor/CodeFxComponentsBuild.cs`, rồi chạy menu `VFX/Components/CodeFX - Build`.
- Effect riêng: trong `<Effect>Build.cs`, dựng layer giống hàm `Make`/`Layer` của file trên. Đọc `<tên>.json` để lấy duration, lưới, pivot và `space` (width_m, plane).
- Mỗi effect là **1 particle** chạy cả flipbook: Start Lifetime = duration, Frame over Time 0 → 1, pivot = điểm gốc.
- Effect `alpha` có 2 layer: Body + Light.

## 2. Viết một effect (`fx/<nhóm>/<tên>.py`)

```python
import math, codefx as cf
META = dict(name="CFX_Ten", size=(128, 128), origin=(64, 64), duration=0.5, loop=False, fps=30,
            blend="add",                      # "add" hoặc "alpha"
            options=dict(palette=None, seed=1, scale=1.0))
def create(o):                                # đòn một lần: mô phỏng
    R, ramp = cf.Rng(o["seed"]), cf.ramp(o["palette"])
    ps = cf.Particles()
    for _ in range(12):
        a, sp = R.range(0, cf.TAU), R.range(110, 210)
        ps.spawn("spark", 0, 0, math.cos(a) * sp, math.sin(a) * sp, R.range(0.16, 0.34))
    class St:
        t = 0.0
        def update(self, dt): self.t += dt; ps.update(dt)
        def draw(self, cv):
            cv.glow(0, 0, 50, cf.blend(ramp, 0.85), 0.9 * math.exp(-self.t / 0.05))   # lớp sáng
            for p in ps.live(): ...                                                     # lớp thân
    return St()
# hoặc effect loop:  def draw(cv, t, o): ...   (hàm thuần của t, nên loop liền)
```

**Toạ độ:**
- x sang phải, **y hướng xuống**, 1 đơn vị = 1 px ở res 1.
- (0, 0) = `origin`: điểm trúng, hoặc chân nếu effect đứng trên đất.
- Effect có hướng thì luôn vẽ hướng sang phải.

**Bộ công cụ trong `codefx.py`:**

| Nhóm | Hàm |
|---|---|
| Thời gian | `seg`, `smooth`, `bump`, `ease.out_expo / out_cubic / out_quart / out_back`, bảng key bậc 30 fps (xem `hit_star.KEYS`) |
| Ngẫu nhiên | `Rng(seed)`, `hash01(...)` tất định. `noise1`, `noise2`, `fbm2`, `loop_noise` (loop liền) |
| Màu | `ramp_from_slots(Core, Mid, Outer)`: 7 bậc lệch hue, bóng sẫm/lạnh, sáng trắng. `ramp_smoke(Dust)`. `at(ramp, nhiệt)` = **bậc cứng** cho thân. `blend()` = mượt, chỉ dùng cho ánh sáng |
| Thân (alpha-over) | `disc`, `ellipse_ring` (mặt phẳng nghiêng `sy`, `keep` để cắt đoạn), `streak` (capsule thon: đầu → đuôi), `poly`, `star`, `arc` (lưỡi liềm / vệt chém), `shade(fn)` (như fragment shader, tính từng pixel) |
| Sáng (cộng) | `glow`, `glow_line`, `glow_ring`, falloff `(1-d)²` |
| Hạt | `Particles` + loại `spark` (g 0.45, drag 2.2, nảy 0.45), `grit`, `ember`, `mote`, `smoke`, `twinkle`. Sàn ở y = 0 khi `ground=True`. Có `on_death` (vd lửa chết sinh khói) |
| Màu theo hình | Mọi hình nhận màu là **hàm của toạ độ trong hình**: `disc` theo bán kính, `streak` theo đầu → đuôi, `arc` theo dọc/ngang vệt. Dùng cách này để có mép sáng → lõi, đầu nóng → đuôi nguội |

### Khói / bụi: HÌNH DÁNG theo cách của dự án (`smoke.py`)

Art lead, 2026-11-02: "shape khói cần học từ cách làm của mình", "ý tôi là phần hình dáng khói thôi".

- **Hình dáng (bắt buộc)**: port từ Shape Lab `smokeGeom`.
  - Thông số mặc định = Shape Lab: body 0.5, lobes 7, spread 0.8, arc 290°, flat 0.25, rMax 0.34, rMin 0.14, order 0.75, jitter 0.3.
  - Một khối thân lớn và các thuỳ **bám sát**, lớn trong nhỏ ngoài, cụm gọn (bản phác `art/smoke_shape_sketch_v1.png`).
  - **Không cắt đáy** (`flat=0`; art lead 2026-11-02: "khói bị cắt đáy"): đáy tròn, điểm thấp nhất của cụm chạm đất.
  - **Thân vẽ phía trước**, thuỳ phía sau ló ra quanh viền, nên cả khối đọc thành một silhouette.
  - Không cho thuỳ toả xa: `expand` ≤ 0.06.
  - Đã loại: khối tròn kiểu elip, cụm dài, thuỳ cách xa nhau.
- **ĐÃ BỎ (art lead, 2026-11-03): tô từng quả như khối cầu kiểu pixelfx** (`draw_lobes`).
  - Lý do: mỗi quả 3 tông cứng + vệt lưỡi liềm giống hệt nhau, nên trông như bóng nhựa; tan thì vỡ vụn thành mảnh lấm tấm. Khối cứng, không ra khói.
  - Không dùng lại cách này cho khói / lửa. Bản lưu: `Docs/VFX/_ArtDirection/_archive/codefx_lobe_smoke_2026-11-03/`.
- **Tô hiện có (tạm)**: `Smoke.draw()`: tô cả cụm bằng dải bóng lưỡi liềm 2 tông (Shape Lab `shadeField`), tan CoreOut theo khối.
  - Cách tô khói đang được **làm lại** theo hướng khối mềm: viền gợn theo noise động, sáng/bóng tính trên cả cụm, thuỳ chuyển động lệch pha, tan thành sợi bay lên. Chưa chốt.

Ví dụ: `fx/smoke/puff_burst.py`. Gọi: `sm = Smoke(cv); sm.add(0, 0, size, seed, flat=0); sm.draw(cf.ramp_smoke(DUST), prog, seed)`.

### Khói / lửa bằng mesh 3D + noise dissolve (thử nghiệm, 2026-11-03)

> **Realtime trong Unity (art lead 2026-11-03: "đưa thẳng shader vào unity, không cần bake ra sheet")**:
> - `CFX_EXPORT=<file.json> blender.exe -b --factory-startup --python mesh/blender_passes.py -- <dir> 2` xuất khối full-size thành mesh ở **camera space** (x phải, y lên, z ra xa camera; pivot = điểm chạm đất), bake mỗi đỉnh: uv0 = (AO, noise vùng), uv1 = (noise chi tiết), kèm 5 mốc ngưỡng tan (phân vị, để diện tích mất đều). File để ở `Docs/`, không để trong `Assets/`.
> - Shader `VFX/FX/Smoke Mesh` (`Assets/VFX/_Shared/Shaders/SH_VFX_SmokeMesh.shader`) làm lại đúng các luật bên dưới trên GPU. Mép tan đều theo pixel bằng `fwidth`; ngưỡng là một đường cố định, nên frame tự liên tục.
> - Build: `SmokeMeshBuild.cs` (menu `VFX/Components/CodeFX - Build Smoke Mesh (realtime)`). Particle Mesh, **Render Alignment View** (khối thiết kế theo góc 3/4).
> - **Shader chỉ giữ thông số hình của dissolve / màu / ánh sáng. Mọi thứ theo thời gian nằm trong particle system** (art lead 2026-11-03), để chỉnh bằng curve:
>   - **Custom Data chỉ có Dissolve** (Custom1.x; art lead: "chỉ cần kiểm soát dissolve, đừng đưa quá nhiều thông tin"). Trôi / cong khi tan suy ra từ Dissolve;
>   - **Shader realtime chỉ còn khói** (art lead 2026-11-03: "bỏ hết phần màu của lửa"): 2 tông khói + AO khe + dissolve + drift. Không nhiệt, không lửa ở khe, không mép cháy, không glow. **Màu khói ở particle** (Start Color × Color over Lifetime, art lead 2026-11-03); shader chỉ quyết định sáng / tối (`_ShadowDarkness`, `_LitThreshold`, `_ToneNoise`, `_LightDir`). Shader chặn các giá trị 0 gây chia 0 (Light = 0, Curl radius = 0). **Nhiều hạt** (art lead 2026-11-03): shader **1 pass** vừa tô vừa ghi depth, pixel đã tan bị clip, Sort Mode = By Distance.
>     - Pass depth riêng cho cả mesh → hạt trước che kín hạt sau tới khi biến mất.
>     - Pass depth riêng chỉ phần đặc → particle chạy pass depth cho mọi hạt trước khi tô, mép đang tan của hạt trước che hạt sau rồi bật ra ở ngưỡng 0.5 → giật khi tan.
>     - Mép mềm tính theo **đơn vị noise** (`_EdgeSoft`); theo pixel (`fwidth`) thì noise trên đỉnh làm độ rộng nhảy theo từng tam giác → mép rung khi khối di chuyển. Build lại sẽ dựng lại prefab: chỉnh trên instance trong scene có thể mất, shader thì chỉ cần refresh. (Nhiệt / lửa vẫn còn trong bản codefx `smoke_mesh.py` để tham khảo.)
>   - Size over Lifetime = phồng (grow × swell); Velocity over Lifetime Y = bay lên;
>   - stream: Position, Normal, Color, UV, UV2, Custom1X, Center. Build lại sẽ dựng lại particle (giữ nguyên material).
>   - Material có **Preview: override Dissolve**: xem mọi mức tan trên particle đứng yên (mép tan, drift chỉ hiện khi đang tan).
>   - Pivot mesh = dưới **tâm** khối (x, z bỏ lệch), chân chạm đất. Mốc ngưỡng tan tính lại theo `_RegionWeight` mỗi lần build.
> - Chưa có: lobe cuộn quanh thân (mesh tĩnh, chỉ phồng / trôi / cong bằng vertex), quầng chớp lúc đầu.

Art lead gợi ý (2026-11-03): khói trong reference TOTK (video `gQ_1K61VTvo`, giây 4.5–6.0) là **mesh 3D + shader dissolve**. Thay cho cách tô từng quả cầu đã bỏ.

- **Khối**: Blender chạy nền (không cần mở giao diện), `mesh/blender_passes.py`.
  - Hình theo bản phác art lead (`art/smoke_shape_sketch_v1.png`): **một khối tròn gọn, 6 thuỳ lớn** quanh viền (to ở trên, nhỏ dần xuống dưới), **khe giữa các thuỳ rõ**. Thuỳ đặt theo mặt phẳng nhìn từ camera để viền đọc được; thân ở trước.
  - Metaball độ cứng 10, bán kính × 0.82 (`CFX_STIFF`, `CFX_RSCALE`): khe sắc, bo nhẹ.
    - Độ cứng 2 thì thuỳ rời khỏi thân.
    - Độ cứng 10 với bán kính gốc thì khối tròn mất khe.
    - Ghép cầu cứng (`CFX_MODE=spheres`) lộ đường nối kiểu mâm xôi.
  - **Đã loại (art lead 2026-11-03, "shape khói xấu quá")**: nhiều bướu nhỏ + metaball mềm → hình giun lổn nhổn.
  - Mỗi frame xuất `passes.npz`: pháp tuyến (camera space), noise, alpha, AO (bóng khe giữa các thuỳ). Camera ortho, 3/4 nhìn xuống 40°, khung theo `META.space`.
  - Noise là noise 3D trong không gian của một empty lớn lên / bay lên cùng khối, nên **bám trên bề mặt**: mảng nóng và lỗ tan đi theo khói, không trượt trên nó.
  - Chạy: `blender.exe -b --factory-startup --python mesh/blender_passes.py -- <thư_mục_passes> 2`. Blender 4.3 ở `D:/download/blender-4.3.0-windows-x64/blender-4.3.0-windows-x64/blender.exe`. Khoảng 10 giây cho 37 frame.
- **Tô + dissolve** trong effect codefx (mẫu: `<project>/Docs/VFX/SmokeMesh/codefx/smoke_mesh.py`). **Một noise điều khiển tất cả**, ngưỡng thay đổi theo thời gian:
  - `heat = T(t) + noise + chút ánh sáng` → bậc màu cứng của ramp lửa. T(t) giảm dần: trắng → cam có mảng vàng → đỏ sẫm → khói.
  - **Lửa ở khe** (art lead 2026-11-03): khi nguội, lửa vàng chỉ còn **ở khe giữa các thuỳ**, ít, đứt đoạn. Mặt nạ khe lấy từ pass AO, noise mượt ngắt quãng.
    - Đã loại: vân lửa ridged noise chạy khắp mặt khối → trông như **tảng đá nham thạch**.
  - **Chống "cục đá"** (art lead 2026-11-03: "frame giữa giống cục đá hơn đám khói"):
    - khói tô **2 tông lớn**, mượt (sáng / bóng theo ánh sáng + AO), không trộn noise chi tiết vào màu (noise chi tiết = mặt đá sần);
    - màu khói xám ấm vừa, không đen than đặc;
    - khối **không bao giờ đứng yên**: phồng tới ~1.4×, bay lên ~0.75 m, các thuỳ cuộn quanh thân, noise trôi lên trong khối;
    - lửa rút vào lõi (viền nguội trước), lúc đầu cả khối là lửa (không có vành xám quanh "miếng dán" lửa);
    - bỏ 2 bậc lửa tối nhất khi chuyển sang khói (tạo vòng viền đỏ sẫm cứng).
  - `alpha = noise > ngưỡng(t)`: ngưỡng tăng dần nên khói thủng lỗ rồi tan thành mảng. Viền khối (pháp tuyến quay ra ngoài) tan trước một chút.
  - **Dissolve mềm** (art lead 2026-11-03: "dissolve quá cứng và sắc"):
    - lỗ tan dùng bản **làm mờ** của noise (`dis_blur`), nên lỗ to, tròn, không vụn;
    - alpha mờ dần qua một dải (`soft` 0.16), không cắt 1 px;
    - mép cháy là dải màu lửa hoà mềm, không viền tối.
  - Ngưỡng bắt đầu thấp hẳn dưới noise, để viền khối còn sắc và nguyên vẹn cho tới lúc tan.
  - **Vùng tan do noise kiểm soát** (art lead 2026-11-03: "kiểm soát vùng tan bằng noise"). Hai noise, đều tính **trong Blender trên bề mặt** và **đứng yên theo thời gian**:
    - **noise vùng** (pass kênh 5, rất lớn): vùng nào tan trước, vùng nào giữ lâu → nhịp không đều, khói vỡ thành vài mảng;
    - **noise chi tiết** (kênh 2): hình mép lỗ. Trộn `region_w` 0.5.
  - **Liên tục khung hình** (art lead 2026-11-03: "frame tan sau không khớp frame tan trước, làm cả vfx bị sai"). Chỗ đã tan không bao giờ đặc lại:
    - noise **không** trôi, **không** đổi W theo thời gian (Blender);
    - ngưỡng tăng theo **một đường cong cố định** cho cả hiệu ứng, dựng **một lần** từ frame bắt đầu tan (phân vị diện tích của frame đó), nên diện tích vẫn mất đều;
    - **không** chuẩn hoá hay lấy phân vị lại từng frame, **không** làm mờ noise trên ảnh (khối phồng thì vùng tan trượt);
    - **không clamp** noise: clamp tạo mảng phẳng, ngưỡng chạm tới là cả mảng nửa trong suốt (màn mờ);
    - làm mờ **chỉ bên trong khối** (`blur(f·a)/blur(a)`), kể cả noise vùng: giá trị thô ở viền khử răng cưa không tin được (để lại viền ma).
    - Kiểm tra: `python -I mesh/coherence.py <effect.py>` đếm pixel trong khối đã thủng mà frame sau đặc lại (30 fps). Bản hiện tại ≤ 15 px/bước, chỉ ở các khe thuỳ lúc khối phồng.
  - **Mép tan mềm** (art lead 2026-11-03: "thêm smooth edge, edge tan đang khá sắc"): `edge_px` 4 (đều theo pixel nhờ gradient của trường). Mép cháy mảnh hơn (~3.9 px), chỉ sát lỗ đã thủng, chỉ khi còn lửa.
  - Lửa phải **nguội hẳn trước `hot_end`** (ngưỡng "nguội" tăng dần): với noise đứng yên, chỗ noise cao giữ nhiệt thành chấm đỏ "con mắt" tới cuối.
  - **ĐÃ BỎ (art lead 2026-11-03, "trông tệ quá")**: tan theo cấu trúc thuỳ: lõi-ra từng thuỳ, noise dải quanh thuỳ, **vòng cung chồng theo viền thuỳ** (đều hay không đều đều xấu). Bản lưu: `Docs/VFX/_ArtDirection/_archive/codefx_smoke_arc_dissolve_2026-11-03/`. Pass `B` (tâm thuỳ) giờ chỉ dùng cho phần trôi.
  - **Trôi khi tan** (video 5.6–6.1 s): phần còn lại phồng ra (~1.2×), hai bên cong lên, bay lên nhẹ. Làm bằng cách warp ảnh đã tô quanh tâm thân.
    - Chiều xoay trái / phải dùng `tanh`: `sign()` xé một đường dọc giữa khối.
    - Phồng hay bay quá thì `--check` báo tràn mép trên.
  - Lấy frame gần nhất, không trộn 2 frame (trộn sẽ tạo bóng ma ở mép).
- Lỗi đã gặp:
  - bướu đặt theo hướng từ tâm, quá xa → rời khối thành "tai chuột" (luật thuỳ bám sát);
  - noise detail 4 → mảng màu lấm tấm, nên dùng detail 2;
  - dải mờ của dissolve chạm viền ngay từ đầu → viền khối mờ, có quầng cam;
  - trộn 2 frame pass → bóng ma.

## 3. Chuẩn chất lượng (học từ pixelfx, đổi sang toon)

1. **Nét và ánh sáng, không mảng màu.**
   - Lõi và mép trắng nóng, giữa có màu, màu sẫm chỉ ở vùng bóng.
   - Mảng màu bão hoà phẳng gần như luôn sai.
2. **Thân dùng bậc tông cứng** (`at`), mép 1 px khử răng cưa. Mềm **chỉ** ở lớp sáng và khói.
3. **Ánh sáng khắp nơi:**
   - đèn chớp lúc trúng rồi tắt (`exp(-t/0.05)`);
   - mỗi tia lửa có chút sáng ở đầu;
   - khói lúc còn nóng ửng màu lửa ở mặt bóng.
4. **Biên đạo theo pha**: frame trắng **hero** (1–2 frame) → overshoot 1.3× → về 1.05× và mảnh lại, tụt bậc màu → vỡ trước khoảng 0.13 s → toả → **giữ** (sao lấp lánh trễ 0.08–0.3 s) → tắt.
5. **Drag**: bắn nhanh, trôi chậm. Mỗi hạt khác nhau về cỡ, tốc độ, delay, tuổi thọ.
6. **Fast attack, slow release.** Đòn đánh 0.3–0.8 s, khói/bụi 1–1.5 s.
7. **Đọc được ở cỡ thật**: một tâm điểm, không lấm tấm nhiễu bên trong hình.
8. **Đòn một lần phải kết thúc trống.** Loop không giật ở chỗ nối. Không tràn mép ô.

**Bảng sửa lỗi:**

| Thấy | Sửa |
|---|---|
| Lờ đờ, không lực | Ease `out_expo`, thêm frame trắng, rút ngắn tổng thời gian |
| Cứng | Random mọi thứ, thêm chuyển động phụ (sao trễ, tàn lửa) |
| Bệt, nhạt | Glow 0.2–0.5, mép tối một bậc, trắng chỉ ở lõi |
| Phẳng | Sáng trên-trái, tối dưới-phải (`shade` + pháp tuyến cầu) |
| Như vector | Thân dùng `at` (bậc cứng), không dùng `blend` |
| Tắt cái bụp | Co lại / ăn mòn / rơi đi trước khi hết thời lượng |
| `--check` báo tràn mép | Giảm tốc độ, tuổi thọ, bán kính glow; hoặc tăng `size` |

## 4. Quy trình

0. **Xác định không gian** (§0 ở đây và mục 1a của SKILL.md, `references/direction.md`). Chưa đủ thông tin thì **hỏi người dùng trước**, không tự đoán.
1. **Tìm trong thư viện trước**: Shape Lab, bao gồm nhóm PixelFX để tham chiếu hình và nhịp.
2. Mô tả effect bằng **một câu** có hướng nghệ thuật.
3. Hướng còn mở thì làm **3–5 nháp khác hẳn nhau** và render cạnh nhau.
4. Render → nhìn → **sửa chỗ tệ nhất**. Làm **tối thiểu 3 vòng**, xem cả GIF (lỗi chuyển động không lộ trên ảnh mẫu).
5. `--check` phải sạch.
6. Build vào Unity → preview chuẩn → Review Lab.

## 5. Effect mẫu

| Effect | Mô tả | Unity |
|---|---|---|
| `fx/impact/hit_star.py` | Sao toon trúng giữa không, 0.5 s, Add: hero trắng, overshoot, vòng đứt đoạn, 14 tia có sáng ở đầu, 4 sao lấp lánh trễ, đèn chớp | `IMP_Code_Air_01` |
| `fx/smoke/puff_burst.py` | Cụm bụi toon tại đất, 1.2 s, Alpha + Light:<br>• **hình dáng** khói của dự án: thân + 7 thuỳ, không cắt đáy;<br>• tô cả cụm + tan CoreOut (tạm, chờ làm lại). Bản tô từng quả kiểu pixelfx đã bỏ 2026-11-03. | `DST_Code_Ground_01` (texture trong Unity vẫn là bản đã bỏ, cần dựng lại) |

**Kết quả 3 vòng sửa (2026-11-02):**
- hit_star:
  - tràn mép: tia quá nhanh, quầng sáng quá to, sao quá dài;
  - tia rơi chạm đáy ô vì trọng lực;
  - vòng sóng quá dày và trắng, lấn mất hình sao.
- puff_burst, bản đầu (theo cách pixelfx: tô từng quả cầu, ăn mòn từ mép) đã bị thay. Bản theo cách của dự án sửa 4 vòng:
  - 2 cụm bên bay xa nên thành dải dài (luật đã loại): kéo lại cho chồng lên cụm chính;
  - vỏ ngoài còn lại thành vòng: chuyển sang noise Cells, tan theo khối;
  - biên khối thẳng như kính vỡ, viền tối loang thành mảng: làm tròn biên, viền chỉ ở sát mép lỗ;
  - vùng bán trong suốt ở mép tan: mép sắc 1 px; tăng tương phản sáng/bóng.
