---
name: team-ui
description: "Điều phối đội UI làm một màn hình / tính năng UI Unity (uGUI) qua đủ quy trình: thu thập bối cảnh → UX spec → review spec → visual + asset → cài đặt → review song song (UX, art, accessibility) → polish. Dùng khi người dùng gọi /team-ui, hoặc muốn dựng / làm lại một màn hình, HUD, menu, popup trong Unity theo ảnh demo hay UI sheet. Sửa nhỏ một chỗ UI thì làm thẳng, không cần skill này."
argument-hint: "[mô tả màn hình / tính năng UI] [--team individual|small] [--auto]"
user-invocable: true
metadata:
  version: "1.0.0"
  source: "Chuyển thể từ team-ui (Claude Code Game Studios) cho AI_VFX, 2026-11-27"
---

# Team UI (Unity, AI_VFX)

Không có tham số: in hướng dẫn dưới đây rồi dừng, không gọi agent, không đọc tài liệu, không dùng `AskUserQuestion`:

> Cách dùng: `/team-ui [màn hình hoặc tính năng UI] [--team individual|small] [--auto]`, ví dụ `/team-ui HUD trận SlotFive`, `/team-ui popup chiến thắng`, `/team-ui menu chính`.

Trao đổi bằng tiếng Việt; code, tên asset, tên GameObject bằng tiếng Anh. Phiên chính là **người điều phối**: đọc bối cảnh, giao việc cho agent, giữ cổng duyệt. Phiên chính không tự viết spec hay code thay agent.

## Bước 0: Cấu hình

Đọc tham số (không có thì dùng mặc định):

| Khoá | Mặc định | Ý nghĩa |
|---|---|---|
| `--team` | `individual` | `individual`: `ux-designer` + `ui-programmer`. `small`: thêm `art-director` (Phase 2, Phase 4). |
| `--auto` | tắt | Tắt: mỗi cổng duyệt hỏi người dùng bằng `AskUserQuestion`. Bật: cổng tự qua **trừ** khi verdict là BLOCKED / NEEDS REVISION / NOT ASSESSED, và mọi việc ghi code (Phase 3) vẫn hỏi một lần. |

Agent không có trong bộ đang bật thì **không gọi**; việc của nó do agent lõi gần nhất làm kèm (art-director → ux-designer; accessibility → ux-designer). Engine cố định là Unity 2022.3 + uGUI, không có agent engine riêng: phần "kiểm theo engine" do `ui-programmer` làm ở đầu Phase 3.

**Báo bộ agent trước khi gọi bất kỳ ai**, một dòng, để người đọc phân biệt được chạy gọn đúng ý với quy trình bị hỏng:

> `Bộ agent (--team <giá trị>): <các agent sẽ gọi>. Không gọi lần này: <các agent quy trình có nhắc> — làm qua <agent lõi>. Dùng --team small để mở rộng.`

**Cổng duyệt** = mọi điểm kết thúc phase có `AskUserQuestion` dưới đây (kể cả khi `--auto` cho qua tự động). Một kiểm tra bị bỏ qua mà không nói ra thì người đọc không phân biệt được với một kiểm tra đã đạt: mọi thứ không đánh giá được phải ghi **NOT ASSESSED** kèm lý do.

## Đội

| Vai | Agent (`.claude/agents/`) | Việc |
|---|---|---|
| UX Designer | `ux-designer` | Luồng, wireframe, trạng thái, input phím + chạm, accessibility; viết spec; review bản cài |
| UI Programmer | `ui-programmer` | Dựng uGUI bằng code (theo kiểu `SlotFiveGame` / `SlotFiveUi`), cắt / nhập sprite, build scene qua MCP, test EditMode |
| Art Director | `art-director` | Chỉ ở `--team small`: style, màu, chữ, khoảng cách, danh sách asset, so khớp ảnh demo |

## Cách giao việc

Gọi bằng `Agent` với `subagent_type` như bảng trên. **Brief gọn, không đổ bối cảnh**: phiên chính đọc tài liệu chung **một lần**, đưa vào prompt đúng những dòng agent cần; chỉ đưa đường dẫn cho tài liệu mình chưa đọc mà chỉ agent đó cần. Ảnh demo / UI sheet thì đưa đường dẫn (agent phải tự xem ảnh).

**Cuối mỗi prompt có hợp đồng trả về:**

> Ghi toàn bộ kết quả vào `[đường dẫn]` — đường dẫn này là quyền ghi của bạn, ghi luôn không cần hỏi. Chỉ trả về: (1) đường dẫn đã ghi, (2) tối đa 5 gạch đầu dòng quyết định, (3) mỗi mục BLOCKED / CONCERNS một dòng. Không chép lại tài liệu đã đọc.

**Ngoại lệ: file code / asset / scene.** `ui-programmer` trả về **danh sách file sẽ tạo hoặc sửa** trước; phiên chính hỏi người dùng **một lần** cho cả danh sách; có "đồng ý" thì mới gọi lại để ghi. Câu trả lời đó mới là quyền ghi, không phải ngoại lệ dưới đây.

Đường dẫn làm việc (`<feature>` là slug, ví dụ `slotfive-hud`):

| Phase / agent | Ghi vào |
|---|---|
| 1b ux-designer | `Docs/UI/<feature>/ux-spec.md` (theo `Docs/UI/_templates/ux-spec.md`) |
| 1c ux-designer (lượt review mới) | `Docs/UI/<feature>/ux-review.md` |
| 2 art-director (hoặc ux-designer) | `Docs/UI/<feature>/visual-design.md` |
| 3 ui-programmer | ghi chú engine: `Docs/UI/<feature>/engine-notes.md`; code / asset: danh sách đã được duyệt |
| 4 mỗi reviewer | `Docs/UI/<feature>/review-<agent>.md`, mỗi agent một file |
| 4 ảnh chụp | `Docs/UI/<feature>/shots/` |

> **Vì sao agent được ghi không cần hỏi.** Chỉ khi đủ ba điều: (1) đường dẫn do phiên chính đặt trong prompt; (2) là file **mới** dưới `Docs/UI/` (không sửa code / cấu hình có sẵn); (3) phase tạo ra nó có cổng duyệt trước khi đi tiếp. Thiếu một điều thì agent phải hỏi. Đừng "sửa" bằng cách hỏi từng agent từng phase: như vậy điều phối không dùng được.

Các agent độc lập chạy song song khi quy trình cho phép (Phase 4).

## Quy trình

### Phase 1a: Bối cảnh

Đọc và tóm tắt trước khi thiết kế. Báo **có / KHÔNG CÓ** cho từng nguồn:

- Brief / tài liệu tính năng: `Docs/<Dự án>/brief.md` (ví dụ `Docs/SlotFive/brief.md`, đọc theo mục: Grep `^#` rồi Read đúng đoạn).
- Ảnh demo, UI sheet, ảnh chụp cũ (`Docs/<Dự án>/*.png`) — xem ảnh, không đoán.
- Code UI đang có (ví dụ `Assets/SlotFive/Runtime/SlotFiveGame.cs`, `SlotFiveLayout.cs`, `SlotFiveUi.cs`) và cách scene được dựng (`Editor/*SceneBuild.cs`).
- `Docs/UI/interaction-patterns.md` — mẫu tương tác đã có, để dùng lại.
- `Docs/UI/accessibility-requirements.md` — mức accessibility đã cam kết.

**`accessibility-requirements.md` không được thiếu một cách im lặng.** Phase 3 cài theo mức này, Phase 4 chặn theo nó. Thiếu file thì cổng đó không có tiêu chí và sẽ "đạt" mà không kiểm gì. Khi thiếu:
- Nói ra ngay, và Phase 4 phải báo `Accessibility: NOT ASSESSED — chưa có mức cam kết (Docs/UI/accessibility-requirements.md không có)`, **không** báo đạt.
- `ux-designer` ghi rõ mức mình **giả định** (gợi ý: Basic — chữ ≥ 16 px ở 540×960, tương phản ≥ 4.5:1 cho chữ, vùng chạm ≥ 44 px, không chỉ dùng màu để báo trạng thái).
- Đề xuất tạo file bằng template `Docs/UI/_templates/accessibility-requirements.md`.

**Thiếu `interaction-patterns.md`** thì báo: "chưa có interaction-patterns.md — không có mẫu để dùng lại", rồi hỏi (`AskUserQuestion`):
- (a) Để `ux-designer` lập thư viện mẫu từ UI đang có trước, rồi tiếp tục.
- (b) Làm tiếp không có thư viện — `ui-programmer` coi mọi mẫu là mới và ghi hết vào `Docs/UI/interaction-patterns.md` khi xong.

Không tự bịa mẫu từ tên tính năng. Ghi trạng thái thư viện (có / tạo mới / cập nhật / không có) vào báo cáo cuối.

Thiếu brief hoặc ảnh demo không chặn, nhưng phải ghi tên từng thứ thiếu vào brief cho `ux-designer`.

Tóm tắt thành brief cho `ux-designer`: người chơi đang làm gì ở màn này, cần gì, ràng buộc (khung 540×960 dọc hoặc khác, phím + chạm, luật `.claude/rules/`), mẫu có thể dùng lại.

### Phase 1b: UX spec

Giao `ux-designer` viết `Docs/UI/<feature>/ux-spec.md` theo `Docs/UI/_templates/ux-spec.md` (HUD thì điền thêm mục HUD trong template).

### Phase 1c: Review spec

Gọi `ux-designer` **lượt mới** (không đưa kết luận của lượt viết, chỉ đưa spec + checklist trong template) để review, ghi `ux-review.md`, verdict: APPROVED / NEEDS REVISION / NOT ASSESSED.

**Cổng:** chưa APPROVED thì không sang Phase 2. NEEDS REVISION: `ux-designer` sửa **chính spec đó** (giữ, không viết lại từ đầu) rồi review lại. Người dùng có thể chấp nhận rủi ro để đi tiếp, nhưng phải là quyết định có ý thức: trình các điểm cần sửa qua `AskUserQuestion` rồi mới hỏi đi tiếp. NOT ASSESSED chặn y như vậy, nhưng cách gỡ là **bổ sung đầu vào** (ví dụ mức accessibility), không phải review lại: nêu phần nào chưa đánh giá được và thiếu gì, đề xuất làm đầu vào trước. Người dùng cho đi tiếp thì báo cáo cuối ghi lại: verdict, điểm còn mở, người dùng chọn đi tiếp.

### Phase 2: Visual + asset

Giao `art-director` (`--team small`) hoặc `ux-designer` (`individual`, ghi "art-director không gọi, ux-designer làm thay"):
- Đọc cả spec (luồng, wireframe, trạng thái, accessibility), không chỉ wireframe.
- Áp style theo ảnh demo / UI sheet / UI đang có: màu, font, cỡ chữ, khoảng cách, chuyển động.
- Giữ accessibility: kiểm tương phản; màu không bao giờ là cách duy nhất báo trạng thái (thêm hình, chữ hoặc icon).
- **Danh sách asset**: mỗi sprite một dòng — tên `T_<Prefix>_<Tên>`, nguồn (vùng cắt trên sheet / file có sẵn / cần vẽ thêm), kích thước, 9-slice border nếu có, chữ có nướng sẵn trong ảnh không.
- Nhất quán với các màn đã làm.

**Cổng:** trình visual + danh sách asset, hỏi duyệt.

### Phase 3: Cài đặt

Đầu Phase 3, `ui-programmer` kiểm theo engine và ghi `engine-notes.md`: dùng uGUI (mặc định của dự án) hay UI Toolkit và vì sao; Canvas Scaler / khung tham chiếu; cấu trúc GameObject; 9-slice, preserveAspect, mask, sorting với particle VFX; bẫy riêng của Unity cho bố cục này.

Rồi `ui-programmer` (sau khi danh sách file được duyệt):
- Cài theo spec + visual + engine notes; dùng mẫu trong `interaction-patterns.md`, mẫu gần đúng thì ghi độ lệch để `ux-designer` xem.
- **UI không giữ hay sửa trạng thái game**: chỉ hiển thị, hành động của người chơi gọi API / event của logic (như `SlotFiveMatch`).
- Chữ hiển thị gom vào một chỗ (hằng số / bảng chuỗi), không rải trong code dựng view. Dự án chưa có hệ localization: ghi điều này, không tự thêm.
- Mọi thao tác dùng được bằng phím và chạm / chuột.
- Cài accessibility theo mức đã cam kết (hoặc mức giả định, ghi rõ).
- Thông số bố cục để ở file layout riêng (kiểu `SlotFiveLayout`), không rải số trong code dựng.
- Mẫu tương tác mới → thêm vào `Docs/UI/interaction-patterns.md` trước khi báo xong.
- Build scene qua UnityMCP (`execute_menu_item` menu build của tính năng), đọc console không lỗi, chạy test EditMode liên quan; test có hardcode toạ độ layout thì cập nhật.
- Chụp Game view (trạng thái nghỉ + sau một thao tác chính) vào `Docs/UI/<feature>/shots/`.

**Kiểm hiện vật trước khi coi là xong**: file / ảnh trong hợp đồng phải có trên đĩa. Agent trả lời trôi chảy mà không ghi gì = phase thất bại: gọi lại, nêu rõ hợp đồng chưa đạt.

### Phase 4: Review (song song)

Gọi cùng lúc, mỗi agent ghi file riêng, đưa đường dẫn ảnh chụp + spec:
- `ux-designer`: bản cài có khớp wireframe và spec tương tác; thử chỉ phím, chỉ chạm (qua MCP hoặc đọc code xử lý input); các tính năng accessibility có chạy.
- `art-director` (`small`) / `ux-designer` (`individual`): nhất quán với demo / UI sheet; kiểm ở tỉ lệ nhỏ nhất và lớn nhất cần hỗ trợ (dọc 9:16, 9:19.5; ngang nếu spec có) — chụp ở từng tỉ lệ.
- Accessibility (do `ux-designer` làm, không có agent riêng): kiểm theo mức trong `accessibility-requirements.md`, vi phạm là blocker. Không có file thì báo `Accessibility: NOT ASSESSED — ...` như Phase 1a, nói rõ mức đã giả định.

Với `--team small`, dặn reviewer: "việc của bạn không phải xác nhận nó khớp spec — hãy tìm chỗ nó **không** khớp", và báo cáo ghi rằng lượt review đối kháng đã chạy.

Đủ các luồng review báo về mới sang Phase 5.

### Phase 5: Polish

- Sửa hết góp ý review (giao `ui-programmer`, cùng luật danh sách file).
- Animation UI bỏ qua được / tôn trọng chế độ nhanh; không có hệ "giảm chuyển động" thì ghi NOT ASSESSED.
- Âm thanh UI: dự án chưa có hệ audio event thì ghi NOT ASSESSED, không tự thêm.
- Chụp lại ở mọi tỉ lệ cần hỗ trợ.
- `interaction-patterns.md` đã cập nhật đủ mẫu mới.
- HUD: tôn trọng ngân sách hiển thị trong spec (số phần tử, vùng màn hình, độ mờ tối đa).

## Khôi phục lỗi

Trước hết **kiểm hiện vật**: hợp đồng có đường dẫn thì đường dẫn phải tồn tại. Agent trả BLOCKED, lỗi, hay không xong: **báo ngay, không đi qua phần phụ thuộc vào nó, luôn có báo cáo dở dang.** Phần của agent bị bỏ để trống có tên, không tự viết thay.

Hay gặp:
- Thiếu brief / ảnh demo → hỏi người dùng hoặc làm brief trước.
- Unity chưa mở hoặc MCP chưa kết nối (`http://127.0.0.1:8080/mcp`) → báo người dùng mở Unity / bấm Start server; không build được thì Phase 3, 4 dừng ở BLOCKED.
- Phạm vi quá lớn → tách thành nhiều `/team-ui`.
- Spec và luật `.claude/rules/` mâu thuẫn → nêu mâu thuẫn, không đoán.

## Ghi file

Mọi file (spec, thư viện mẫu, code) do agent ghi. Phiên chính chỉ ghi `MAP.md` (thêm dòng cho thư mục `Docs/UI/<feature>/` và file code mới) và báo cáo cuối. Không commit; commit chỉ khi người dùng yêu cầu (hook `Stop` tự đồng bộ `Docs/**/*.md` và skill theo `tools/sync_knowledge.py`).

## Báo cáo cuối

Gồm: trạng thái spec, verdict review spec (và override nếu có), visual + asset, cài đặt (file đã sửa), accessibility, phím + chạm, thư viện mẫu, ảnh chụp, việc còn mở.

- **COMPLETE** — đi hết quy trình.
- **COMPLETE — [accessibility | …] NOT ASSESSED ([lý do])** — xong nhưng có kiểm tra không chạy được; không bao giờ ghi COMPLETE trơn khi có mục NOT ASSESSED.
- **BLOCKED** — dừng; nêu blocker và phase.

Luôn nói thêm: test tự động và ảnh chụp không kết luận được UI có "đẹp" hay dễ dùng; người chơi / art lead cần tự xem trong Play.
