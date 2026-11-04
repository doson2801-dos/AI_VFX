---
name: vfx-shader
description: "VFX_Shader — làm VFX hoàn toàn bằng shader (technical). Bắt đầu bằng định hướng: phân tích brief, hỏi không gian hoạt động (camera, neo, mặt phẳng, quy mô), thành phần và style, sơ đồ cấu trúc; duyệt 1 lần. Hình khối, chuyển động và kết thúc do shader tính trên quad/mesh đơn giản, chỉ dùng texture noise. Shader nhẹ, đơn giản, tối ưu mobile, chạy cả Built-in và URP. Luôn kiểm tra shader có sẵn trước khi viết mới. Chỉ chạy khi người dùng gọi /vfx-shader."
disable-model-invocation: true
metadata:
  version: "1.1.0"
---

# VFX_Shader

Làm effect **bằng shader**. Hình khối, chuyển động, màu và kết thúc đều do shader tính. Carrier là một quad (particle) hoặc mesh đơn giản tạo bằng code. **Texture chỉ dùng noise**, thoải mái dùng các noise dùng chung. Không dùng texture vẽ hình; khi cần texture hình thì dùng skill `/vfx-maker`.

Trao đổi bằng tiếng Việt; code và tên asset bằng tiếng Anh.

```
Mô tả → ĐỊNH HƯỚNG (phân tích · không gian · thành phần · style) → KIỂM TRA SHADER CÓ SẴN
      → BẢN ĐỊNH HƯỚNG + KẾ HOẠCH (DUYỆT 1 lần) → shader → material + build script → build + preview → REVIEW LAB (art lead ghim góp ý) → đăng ký shader → bàn giao
```

Project mới: chuẩn bị theo [references/setup.md](references/setup.md) (build kit, thư viện hàm, noise dùng chung). Chỉ làm lần đầu.

## 1. Nhận mô tả

Đọc mô tả, ảnh/video tham chiếu (Read) hoặc JSON Shape Lab nếu có. Đọc hết những gì đã có trước khi hỏi; không bắt làm lại phần đã chốt. Người dùng chỉ sửa một effect đã có thì nhảy thẳng tới bước 9.

## 2. Định hướng ban đầu — BẮT BUỘC với effect mới

Đọc [references/direction.md](references/direction.md) và làm theo thứ tự:

1. **Phân tích brief** (tự làm): effect là gì, tâm điểm, hướng lực, nguồn thông tin (đã chốt / quan sát / đề xuất / chưa rõ).
2. **Hỏi phần còn thiếu**, tối đa 2 lượt. Dùng bảng chọn `show_widget`; không được thì dùng `AskUserQuestion`.
   - **Không gian hoạt động:** góc camera game, neo vào đâu, mặt phẳng hiển thị, quy mô so với nhân vật ~2 m, di chuyển, nền.
   - **Thời gian:** một lần / lặp / bay + chạm; thời lượng; thời điểm gameplay.
   - **Thành phần:** danh sách lớp gợi ý theo loại effect, người dùng tích chọn.
   - **Art Style và màu.**

   Bỏ câu brief đã trả lời. Phần không hỏi thì tự chọn và ghi là **giả định**.

## 3. Kiểm tra shader có sẵn — BẮT BUỘC, làm cho từng thành phần

1. Đọc **sổ đăng ký shader** `Docs/VFX/SHADERS.md` (mỗi shader: path menu, làm được gì, thuộc tính chính, chi phí, effect đang dùng, "không sửa" nếu có).
2. Rà thêm thực tế: Glob `Assets/**/*.shader` (bỏ `Library/`), đọc khối `Properties` và `#pragma shader_feature` của các ứng viên. Sổ có thể thiếu shader mới thêm.
3. Quyết định theo thứ tự:
   - **Dùng lại:** có shader làm được hình này chỉ bằng đổi thuộc tính → tạo material mới, không viết shader.
   - **Mở rộng:** gần đủ, chỉ thiếu một tính năng nhỏ → thêm `shader_feature_local` mới, mặc định **tắt**, để material cũ không đổi hình. Không đổi tên/ý nghĩa thuộc tính cũ. Shader ghi "không sửa" hoặc của phiên khác thì không được mở rộng, mà phải viết mới.
   - **Viết mới:** không có gì phù hợp.
4. Điền quyết định vào cột "Shader" của bảng thành phần, kèm lý do ngắn (hoặc vì sao không dùng lại được: thiếu tính năng gì).

## 4. Bản định hướng + kế hoạch — lần duyệt duy nhất

Trình bày trong **một** lượt, rồi hỏi duyệt bằng `AskUserQuestion` ("Duyệt, làm luôn" / "Sửa"):

1. **Sơ đồ cấu trúc** (SVG qua `show_widget`): khối chính, lớp trước/sau, hình người ~2 m làm thước, hướng lực, mặt đất, góc camera. Ghi "Sơ đồ cấu trúc — không phải asset". Khi chuyển động quan trọng thì vẽ thêm 2–3 mốc thời gian.
2. **Tóm tắt không gian và thời gian:**
   ```
   Camera: <...> · Neo: <...> · Mặt phẳng: <...> · Quy mô: <m> · Thời lượng: <s> · Nền: <...> · Art Style: <giá trị> (<đã chọn/đề xuất>)
   ```
3. **Bảng thành phần** (direction.md mục 4): ID · thành phần · vai trò · mặt phẳng/carrier · timing · kết thúc · shader (dùng lại / mở rộng / mới).
4. **Shader mới hoặc mở rộng** (nếu có), mỗi shader một khối:
   ```markdown
   ## SH_VFX_<Name> — mới / mở rộng
   Hình: <SDF/toạ độ> · Chuyển động: <...> · Kết thúc: <...>
   Thuộc tính chính: <5–10, có khoảng giá trị> · Keyword: <≤ 3>
   Chi phí: <n> sample, hàm đắt: <không / atan2 ×1 vì ...> · Blend: <add/alpha>
   ```
5. **Giả định** còn lại.

Không tạo file trong project trước khi bản này được duyệt (trừ setup lần đầu). Sau khi duyệt, lưu bản định hướng vào `Docs/VFX/<Effect>/Plan.md`.

## 5. Viết / mở rộng shader

Với shader mới, sau khi duyệt:
- Copy `assets/SH_VFX_FX.template.shader` → `Assets/VFX/_Shared/Shaders/SH_VFX_<Name>.shader`.
- Thay `__NAME__` và dòng mô tả, rồi viết hình theo [references/recipes.md](references/recipes.md).
- Giữ đúng [references/mobile-rules.md](references/mobile-rules.md): một pass unlit, không include URP, ≤ 3 sample, không vòng lặp, `half` cho màu, tính UV cuộn ở vertex shader.
- Header shader phải có dòng `// Cost:`.

Shader viết **chung chung** để effect sau dùng lại được: tham số hoá hình (bán kính, độ rộng, hướng, màu), không hardcode timing hay vị trí riêng của một effect.

## 6. Material + build script

- Copy `assets/ShaderFxBuild.template.cs` → `Assets/VFX/<Effect>/Editor/<Effect>Build.cs`, thay `__EFFECT__` và `__SHADER__`.
- Mỗi thành phần trong bảng là một layer (GameObject) đúng ID và tên đã duyệt. Đặt thuộc tính material trong script; dùng `FxProgress()` để truyền progress và seed qua Custom1.
- **Dựng đúng không gian đã chốt:**
  - size theo quy mô (mét);
  - renderer mode theo mặt phẳng: Billboard / Horizontal Billboard / Stretched / Mesh;
  - simulation space Local/World theo cách neo;
  - startDelay theo timing từng lớp.
- **Camera preview khớp camera game:** truyền `cameraPos`/`lookAt` vào `Finish()` theo góc đã chốt, khung vừa effect lúc to nhất. Khung preview phải cho thấy effect ở đúng tỷ lệ, không phải một chấm nhỏ giữa nền.
- Tên theo quy ước của vfx-maker (`naming.md` trong skill đó): `VFX_<Effect>`, `M_<Effect>_<Layer>_<Blend>`, `SH_VFX_<Name>`.
- Prefab dựng từ script, không chỉnh tay. Mỗi lần sửa thì sửa script rồi build lại.

## 7. Build và tự kiểm tra

Giống vfx-maker:
- Unity đang mở project thì nhờ người dùng chọn menu **VFX → <Effect> → Build**. Unity đóng thì chạy batchmode `-executeMethod VfxEffects.<Effect>Build.BuildBatch`, không thêm `-nographics`.
- Đọc `Docs/VFX/<Effect>/BuildReport.txt` và **xem** `Preview_sheet.png`. Kiểm tra:
  - không lỗi compile, không material hồng;
  - đúng hình ở các mốc, kết thúc sạch;
  - **khớp bản định hướng**: đủ mọi thành phần trong bảng, đúng mặt phẳng (đứng / nằm đất), đúng quy mô và timing, đúng góc camera. Thiếu hay lệch ở đâu thì ghi theo ID thành phần.
- Tự sửa tối đa 2 vòng. Không báo xong khi chưa xem preview.

## 7b. Review Lab — art lead xem và góp ý, không cần mở Unity

Sau khi tự kiểm tra ở bước 7 đạt, **luôn** dựng trang review. Công cụ dùng chung với vfx-maker: `C:/Users/Manh/.claude/skills/vfx-maker/review-lab/` (`review_lab.html` + `build_review.py`).

1. Dựng trang:
   ```
   python -I "C:/Users/Manh/.claude/skills/vfx-maker/review-lab/build_review.py" --project "<project>" --effect <Effect>
   ```
   Kết quả ghi ra `Docs/VFX/_Review/index.html`, một file tự chứa. Bỏ `--effect` thì gom mọi effect.
2. Mở trang trong browser pane: `preview_start` với cấu hình `review-lab` trong `.claude/launch.json` (http.server thư mục `Docs/VFX/_Review`, cổng 8776). Chưa có cấu hình thì thêm vào launch.json. Có thể mở trực tiếp file bằng double-click.
3. Trang có:
   - timeline của `Preview_sheet.png` (kéo hoặc phát từng mốc);
   - ảnh/GIF trong `Docs/VFX/<Effect>/`;
   - so sánh A/B: kéo thả ảnh concept vào để đặt cạnh render;
   - tab **Kế hoạch & Build**: `Plan.md`, tức bản định hướng và bảng thành phần, cùng `BuildReport.txt` có shader từng layer;
   - nút Duyệt / Cần sửa và **ghim góp ý** lên đúng vị trí, đúng mốc thời gian.

   Vì vậy `Plan.md` phải lưu đủ bảng thành phần có ID (bước 4).
4. Báo art lead link và cách dùng ngắn: bật 📌, click lên chỗ cần sửa, ghi chú, rồi bấm **Xuất phản hồi** và dán vào chat.
5. Mỗi lần build lại thì chạy lại lệnh ở mục 1. Góp ý được lưu trong localStorage của trình duyệt theo tên project, nên dựng lại trang không làm mất góp ý.

## 8. Đăng ký shader và bàn giao

- **Cập nhật `Docs/VFX/SHADERS.md`** mỗi khi viết mới hoặc mở rộng shader. Ghi: path menu, file, làm được gì, thuộc tính và keyword chính, chi phí, effect đang dùng. Dùng lại thì chỉ thêm tên effect vào cột "Đang dùng".
- Báo ngắn:
  - prefab, scene demo, ảnh preview, **link Review Lab** (`Docs/VFX/_Review/index.html`);
  - shader **dùng lại / mở rộng / mới**;
  - chi phí shader (sample, hàm đắt);
  - giả định và phần chưa kiểm chứng (ví dụ chưa đo trên máy thật).

## 9. Sửa theo phản hồi

- **Phản hồi từ Review Lab** ("Xuất phản hồi"): đọc như danh sách sửa chính xác. Mỗi ghim có effect, mốc thời gian và toạ độ x/y %, dạng:
  ```
  ## Meteor — cần sửa
  - [ ] #1 **Timeline 0.3s** (x 94%, y 7%): đầu thiên thạch to hơn
  ```
  Toạ độ tính trên khung của mốc đó: x 0% là trái, y 0% là trên.
  - Gán mỗi ghim vào **ID thành phần** dựa trên timing và vị trí trong bảng thành phần.
  - Sửa đúng thành phần đó, rồi build lại và dựng lại Review Lab.
  - Báo lại theo từng ghim: đã sửa gì, ghim nào còn mở.
  - Ghim không gán được vào thành phần nào thì hỏi lại, không đoán.
- Đổi màu, kích thước, timing: chỉ sửa thuộc tính material trong build script, không sửa shader.
- Sửa shader dùng chung thì kiểm tra các effect khác đang dùng nó (cột "Đang dùng" trong sổ) và build lại chúng, hoặc thêm keyword mới thay vì đổi hành vi cũ.
