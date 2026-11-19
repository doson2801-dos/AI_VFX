---
name: dynamic-vfx-prompt-builder
description: "Design game VFX from adaptive Vietnamese requirements, concept-specific structural blueprints and shape previews through technical/asset decisions, approval-aware specifications and English implementation prompts. Use for Dynamic VFX Prompt Builder, Shape Specification, VFX concept analysis or approved-spec handoff. Runtime production and Unity integration require a separate implementation request."
metadata:
  version: "2.0.0-claude"
---

# Dynamic VFX Prompt Builder v2.0 (Claude Code)

Trao đổi, khai thác yêu cầu, Shape Specification và spec bằng tiếng Việt; giữ tên API/identifier ở ngôn ngữ engine. Prompt kỹ thuật triển khai cuối cùng viết hoàn toàn bằng tiếng Anh, chỉ xuất sau phê duyệt của người dùng theo phạm vi bên dưới. Biến ý tưởng hoặc spec VFX thành thiết kế kiểm chứng được, rồi prompt triển khai tự chứa. Không áp dụng câu hỏi dây leo cho mọi hiệu ứng; không mặc định Unity cho dự án mới.

## Bản Claude Code: công cụ và phạm vi

Bản này tách từ bản Codex tại `C:\Users\Manh\.agents\skills\dynamic-vfx-prompt-builder` và **không có chức năng tạo/chỉnh ảnh concept**. Không đề xuất gen ảnh concept, không thêm lựa chọn "Tạo ảnh concept" vào bảng chọn. Ảnh/video tham chiếu do người dùng cung cấp vẫn được đọc và phân tích bình thường (xem ảnh bằng Read).

- **Bảng chọn tương tác:** `show_widget` (gọi `read_me` trước); nút gửi dùng `sendPrompt(text)`.
- **Fallback bảng chọn:** `AskUserQuestion` — tối đa 4 câu/lượt, 2–4 option mỗi câu; `multiSelect: true` cho lớp/đặc tính độc lập.
- **Hình cấu trúc, preview silhouette, keyframe board:** sơ đồ SVG qua `show_widget` hoặc Artifact; ghi rõ là sơ đồ dựng tay, không phải ảnh AI.
- **Texture runtime:** Claude Code không gen ảnh raster. Khi cần texture mới, xuất brief texture để người dùng tạo bằng công cụ khác; không thay bằng SVG/polygon rồi gọi là texture cuối.
- **Prompt triển khai:** tự chứa, dán được vào phiên Claude Code mới hoặc agent khác.

## Hợp đồng v2.0 và trạng thái bàn giao

Giữ một chuỗi truy vết: brief/quyết định người dùng → concept/version đã xem → hình cấu trúc → layer ID → shape ID → motion → representation/asset ID → tiêu chí render. Mỗi bước kế thừa quyết định đã duyệt; kỹ thuật không được âm thầm đổi hình hoặc timing để dễ dựng. Chỉ cập nhật phần được yêu cầu, không khởi động lại effect đang dừng.

- **Khai thác thích ứng bằng tiếng Việt:** từ brief hiện có tạo nhóm chọn theo cơ chế; chỉ hỏi phần còn thiếu làm thay đổi thiết kế. Style, nguồn, hướng lực, chuyển động, kết thúc và lớp tùy chọn phải có trạng thái rõ. Không biến bảng hỏi thành checklist cố định hoặc đáp án mặc định thành approval.
- **Blueprint trước breakdown:** khi làm Shape Specification, giao hình cấu trúc nhìn được trước layer/shape kit. Giải quyết vị trí khối chính, overlap, silhouette, tỷ lệ và hướng lực trước khi đi sâu chi tiết. Không thay hình bằng heading, bảng chữ hoặc prompt gen chưa chạy.
- **Shape kit có hợp đồng:** mỗi shape mang ID/version, vai trò và layer dùng nó; mô tả contour, khối đặc/rỗng, dày–mỏng, lõi–mép/value, pivot/trục và phạm vi biến thể. Hiển thị preview silhouette mới/đổi trước production. Shape kit là thiết kế phần tử cục bộ, không bake toàn effect vào texture.
- **Chọn kỹ thuật theo bằng chứng:** sau blueprint, khảo sát reuse và ánh xạ nhu cầu từng layer sang static texture/modules, UV/mask/dissolve, flipbook, geometry hoặc hybrid. Chỉ rõ tính năng thiếu khi cần kỹ thuật phức tạp hơn; giữ carrier đủ dùng, shader đơn giản và hướng mobile phù hợp.
- **Flipbook có kiểm soát:** khi thực sự cần, duyệt keyframe board có hình/time/anchor trước toàn chuỗi; giữ continuity, frame map và QA kênh/grid/pivot/bleed cùng playback thật. Atlas variants không phải animation. Static asset chỉ cần QA tương ứng, không ép keyframe gate.
- **Prompt kỹ thuật cuối bằng tiếng Anh sau duyệt:** chỉ xuất khi spec/design đã duyệt và user yêu cầu/cho phép xuất prompt. Nhúng đầy đủ đặc điểm concept, shape kit, motion, quyết định kỹ thuật, timeline, assets và tiêu chí nghiệm thu; truyền rõ mọi gate còn thiếu cho agent triển khai. Không tự tạo runtime khi chỉ viết prompt hoặc sửa skill.

Dùng ledger gọn với ID, giá trị, nguồn/version, trạng thái, bằng chứng approval và phạm vi bị thay thế. Trạng thái **observed/proposed/assumed/approved/pending** không hoán đổi cho nhau. Có thể gộp gate khi toàn bộ nội dung liên quan đã được hiển thị; không bắt duyệt lại phần đã có quyền. Thiếu công cụ, ảnh hoặc project thì ghi phần chưa xác minh và tiếp tục phần độc lập được phép, không tự nhận đã hoàn tất preview/QA.

## Bắt đầu từ trạng thái hiện tại

Đọc yêu cầu, spec và quyết định đã có trước khi hỏi. Xác định người dùng cần khai thác ý tưởng, phân tích cấu trúc/timeline, bản thiết kế để duyệt, hay prompt từ spec đã duyệt. Đi thẳng vào giai đoạn đã được yêu cầu, không bắt làm lại.

- Đọc tham chiếu chat/file truy cập được. Content-reference, filename hoặc link chưa xem không phải nội dung thiết kế. Ghi rõ phần chưa đọc được; chỉ hỏi phần ảnh hưởng kết quả.
- Phân biệt **đã xác nhận**, **quan sát được**, **đề xuất**, **giả định kỹ thuật**, **chưa rõ**. Không nâng đề xuất của AI thành lựa chọn của người dùng.
- Giữ số liệu, đơn vị, khoảng giá trị, màu, timing, gameplay và phạm vi đã chốt. Khi có mâu thuẫn, nêu hai giá trị và hỏi phần mâu thuẫn. Yêu cầu sửa mới nhất, rõ ràng của người dùng thay thế lựa chọn cũ.
- Mặc định cho phép người dùng bắt đầu bằng mô tả văn bản ngắn. Ảnh/video là tham chiếu bổ sung tùy chọn, không bắt buộc trước khi hiện bảng chọn. Ghi nguồn đầu vào là brief văn bản nếu chưa có hình đã xem. Không yêu cầu ảnh mới để chuyển spec đã duyệt thành prompt.
- Với ảnh, không coi timing hoặc phần khuất là đã quan sát. Với video, chỉ dùng timestamp/frame đã xem; nếu không thể phát, nêu giới hạn. Phối hợp quy trình VFX dự án đang áp dụng khi có, tránh hỏi trùng.

## 1. Mô tả → bảng chọn thích ứng

Trải nghiệm mặc định là **người dùng nhập mô tả, bên dưới xuất các lựa chọn để tích/chọn**. Không thay bằng danh sách câu hỏi buộc gõ từng câu trả lời. Đọc [references/selection-interface.md](references/selection-interface.md) để dựng và gửi bảng chọn; dùng [references/adaptive-questions.md](references/adaptive-questions.md) làm dữ liệu tạo lựa chọn theo cơ chế, không làm kịch bản phỏng vấn.

Nếu chưa có mô tả effect, hiển thị ô mô tả và nút gửi; sau khi nhận mô tả mới tạo nhóm lựa chọn đúng effect. Nếu đã có mô tả, bỏ bước nhập lại, tóm tắt một câu rồi hiện nhóm chọn ngay. Nếu spec đã duyệt và yêu cầu prompt, chuyển thẳng giai đoạn 3; giữ trạng thái các gate shape/assets, không tự coi chúng đã duyệt.

**Art Style là nhóm lựa chọn chung cần được xử lý trước khi kết thúc giai đoạn chọn**, không phải câu hỏi tùy cơ chế. Nếu brief/spec chưa chốt style, hiển thị nhóm “Phong cách hình ảnh (Art Style)” ngay trong bảng chọn đầu tiên; không được bỏ vì đã đủ hành vi gameplay. Đọc [references/art-style.md](references/art-style.md) để dùng lựa chọn và trạng thái phù hợp. Style đã được nêu rõ thì hiển thị giá trị đã chốt và cho sửa, không hỏi lại. Style suy ra từ ảnh chỉ là gợi ý cho tới khi người dùng chọn hoặc cho phép bám ảnh.

Dùng radio/select cho phương án loại trừ nhau, checkbox cho các lớp/đặc tính độc lập. Có ghi chú tùy chọn, không bắt gõ để chọn các giá trị phổ biến. Giá trị người dùng đã nêu là cố định hoặc được điền với nhãn rõ; gợi ý của AI chưa phải phê duyệt. Không coi giá trị preselected hoặc trạng thái UI chưa gửi là đáp án.

Mỗi lượt chọn một nhóm gọn các quyết định liên quan. Sau khi người dùng gửi, cập nhật ledger; chỉ hiện nhóm phụ thuộc còn thiếu. Không hỏi lại thông tin đã có hoặc ép bộ lựa chọn dây leo lên sét/nổ/aura. Thông số vi mô tuning đưa thành đề xuất có đơn vị ở spec thay vì kéo dài bảng chọn.

Chỉ dùng câu hỏi tự do cho mâu thuẫn/blocker không thể biểu diễn bằng lựa chọn, hoặc khi người dùng yêu cầu hỏi–đáp. Khi công cụ không hỗ trợ bảng tương tác, nêu giới hạn rồi cung cấp lựa chọn đánh số làm fallback; checkbox Markdown không được gọi là bấm được.

## 2a. Shape Design Engine: concept → cấu trúc → silhouette

Khi yêu cầu Shape Specification, phân tích concept, thiết kế shape hoặc cần sửa khoảng cách concept–runtime, đọc [references/shape-specification.md](references/shape-specification.md). Xem đúng reference/version trước; không thay quan sát bằng mẫu của effect khác.

Thứ tự bắt buộc: **mục tiêu thị giác → hình cấu trúc hình ảnh mục tiêu → cấu trúc layer → shape kit đề xuất → motion logic → representation decision → approval criteria**. Hình cấu trúc là sơ đồ thị giác đơn giản về khối, overlap, silhouette, tỷ lệ và hướng lực, phải hiển thị ảnh/sơ đồ thật; không chỉ viết một heading, bảng layer hoặc prompt tạo ảnh. Đây là thiết kế, không phải asset sản xuất. Chốt cấu trúc tổng thể trước breakdown chi tiết; dùng phê duyệt đã có nếu đủ phạm vi.

Với shape mới/đổi silhouette, hiển thị preview đen–trắng có ID/version và duyệt silhouette trước production. Có thể gộp cấu trúc, silhouette và spec/asset plan trong một lượt duyệt khi tất cả đã được hiển thị rõ. Không xin lại shape đã duyệt, không tự buộc duyệt riêng mọi layer hay playback. Xem bảng gate trong reference để tránh đi lùi hoặc coi concept approval là asset approval.

## 2b. Technical Decision Engine

Đọc [references/technical-decisions.md](references/technical-decisions.md) trước chốt representation/asset plan. Nhu cầu hình ảnh và chuyển động quyết định kỹ thuật; kiểm tra reuse trước new. Chọn static texture + particle, UV/mask/dissolve, flipbook cục bộ, geometry hoặc hybrid có lý do từng layer. Không ép mọi effect thành mesh, flipbook hoặc shader nhiều tính năng. Nếu chọn flipbook, đọc [references/flipbook-and-production-qa.md](references/flipbook-and-production-qa.md): duyệt keyframe quan trọng trước tạo cả chuỗi, kiểm tra continuity và QA sản xuất, không dùng atlas biến thể giả animation.

## 2. Tổng hợp và duyệt thiết kế/spec

Đọc [references/spec-and-prompt.md](references/spec-and-prompt.md). Thiết kế gồm concept/reference (link/path ảnh tham chiếu nếu người dùng cung cấp), thành phần/timeline, asset plan, gameplay, thông số có đơn vị, end/cancel, version/status và decision ledger. Có bắt đầu, hành động, giữ/loop nếu có, kết thúc; không áp đặt hold cho effect tức thời.

Kiểm tra assets/shader/material hiện có trước khi tạo mới. Với lửa/khói, ưu tiên thử texture cục bộ đa dụng grayscale/alpha và module particle khi đủ tạo hình/chuyển động; chỉ dùng flipbook khi cần chuyển động nội tại module không đáp ứng. Texture được phép mang silhouette của một phần tử cục bộ; không bake cả đội hình/quỹ đạo tổng của concept vào texture; phân biệt atlas biến thể và chuỗi frame. Texture VFX mặc định grayscale trung tính để tint, alpha riêng khi cần; concept art vẫn có màu. Một tint không tự tạo bảng màu đa tông. Không tuyên bố grayscale tự giảm VRAM. Mesh/procedural/shader dùng khi cần, giải thích lợi ích; không mặc định shader phức tạp. Sheet cần kiểm tra playback/pivot/loop, không chỉ grid đẹp.

### Chọn kỹ thuật hình khối cho mọi layer

Đọc [references/shape-design-2d.md](references/shape-design-2d.md) khi lập asset plan hoặc prompt. Mặc định ưu tiên texture/mask 2D kiểm soát nét/khối cho thành phần phù hợp, không chỉ impact. Art Style “Stylized 3D” không yêu cầu mọi layer dùng volume mesh. Dissolve/UV scroll đều có thể chạy trên quad/sprite: chọn strip/arc/shell khi cần UV chạy theo đường/bề mặt, chỉ chọn mesh có thể tích khi có nhu cầu góc nhìn/occlusion/hình khối cụ thể. Mỗi layer phải nêu phương tiện tạo silhouette, carrier tối thiểu và lý do.

Đọc [references/texture-production.md](references/texture-production.md) để chuyển concept thành brief rồi texture cục bộ dùng được. Khi thiếu texture phù hợp, xuất brief texture cụ thể để người dùng tạo bằng công cụ khác; không thay nét texture bằng mesh/procedural đơn giản rồi coi là đủ. Chỉ tạo prompt/spec thì nhúng brief và hướng dẫn vào prompt.

Đọc [references/elemental-dissolve.md](references/elemental-dissolve.md) khi cần dissolve/ending: thư viện theo nhóm nguyên tố và hành vi, có mask/gradient/UV/flipbook, hướng tan, giữ lõi và QA. Không áp một noise dissolve cho mọi layer/nguyên tố; không thêm dissolve vào effect chỉ fade/rút đã duyệt trừ khi user đổi yêu cầu.

### Rà soát và duyệt asset plan trước triển khai

Đọc [references/asset-review-and-approval.md](references/asset-review-and-approval.md) trước khi đề xuất tạo mới hoặc chuẩn bị prompt triển khai. Với mỗi effect, rà toàn project được cấp để tìm shader/material/texture/mesh/prefab liên quan và học kỹ thuật thực, không chỉ tìm folder cùng tên. Ưu tiên reuse/variant phù hợp, nêu bằng chứng nguồn đã đọc và phần chưa kiểm chứng.

**Liệt kê asset thành phần cụ thể để user duyệt trước khi thực hiện assets/prefab runtime.** Chờ phê duyệt plan/version; không coi duyệt concept/spec là duyệt một danh sách assets chưa hiển thị. Nếu plan đã duyệt thì giữ quyền đó, không hỏi lại. Prompt cuối phải mang bảng asset và trạng thái gate; nếu agent bên nhận mới có project thì yêu cầu họ rà, lập bảng, chờ duyệt rồi mới làm. Không dùng prompt để bỏ qua gate. Việc chỉ xuất tài liệu vẫn được làm trong phạm vi yêu cầu, không tự tiếp tục project đang stop.

Trước prompt triển khai cuối, cần spec đã được người dùng duyệt và yêu cầu cho phép xuất prompt; có thể xác nhận cả hai trong một câu. Yêu cầu xuất prompt từ spec chưa duyệt không tự phê duyệt các đề xuất còn mở. Không xin duyệt lại nếu đã có. Với spec chưa duyệt, chuẩn bị bản thiết kế cụ thể rồi xin duyệt; nếu người dùng yêu cầu prompt nháp, có thể xuất bản nháp tiếng Anh với nhãn **DRAFT — NOT APPROVED**, giữ tất cả gate còn thiếu; không gọi là prompt cuối hay cấp quyền production. Giả định ảnh hưởng concept/gameplay cần giải quyết; lựa chọn triển khai nội bộ có thể ghi là giả định và điều chỉnh trong phạm vi cho phép.

Nếu sửa spec đã duyệt, tăng version, ghi thay đổi và phạm vi phê duyệt còn hiệu lực. Không ngầm thay quyết định khác. Chỉ hỏi duyệt phần sửa chưa được cho phép trong yêu cầu hiện tại.

## 3. Spec đã duyệt → prompt triển khai

Khi có ảnh concept/tham chiếu do người dùng cung cấp cần bám, **đọc [references/concept-to-implementation.md](references/concept-to-implementation.md) trước khi viết prompt cuối**. Xem trực tiếp đúng ảnh/version; phân rã thành các yêu cầu hình ảnh cụ thể cho từng lớp rồi ánh xạ sang cách dựng và tiêu chí render. Không coi một dòng “bám concept”, tên art style, palette hoặc một link ảnh là đủ. Prompt cuối phải nhúng nội dung phân tích áp dụng vào chính nó, không chỉ trỏ sang tài liệu phụ. Giữ bảng chọn Art Style và quyết định đã duyệt như trước.

Chỉ sau khi người dùng đã duyệt spec và cho phép xuất prompt (kể cả “duyệt spec và xuất prompt”), xuất **prompt kỹ thuật cuối hoàn toàn bằng tiếng Anh**, tự chứa để dán vào chat mới, không dùng “như đã nói ở trên”. Bao gồm mọi quyết định đã chốt, giả định/phụ thuộc, kiến trúc, thuật toán, animation/timeline, gameplay integration, assets/setup, hiệu năng, test và nghiệm thu. Có thể dùng pseudocode; không tự sửa repo/tạo asset khi chỉ được yêu cầu tạo prompt.

- Tách hệ thống hình ảnh với gameplay bằng hợp đồng rõ ràng: ai sở hữu hit/damage/lock, callback và thời điểm áp/gỡ. Shader không tự quyết định gameplay.
- Xử lý cancel, chết/despawn, replay, disable/destroy và pool reuse. Cleanup chỉ giải phóng trạng thái effect sở hữu. Networking chỉ khi dự án có yêu cầu multiplayer.
- Tunable có đơn vị/ý nghĩa/default. Phân biệt tube radius với wrap radius, turn spacing với segment sampling. Giữ khoảng giá trị: chọn 2–3 nhánh không được ghi 3 là quyết định đã duyệt.
- Không bịa engine version, pipeline, package/API hay repo structure. Nếu cần API cụ thể, kiểm tra repo/tài liệu chính thức. Chưa có dự án thì prompt yêu cầu agent kiểm tra môi trường trước triển khai. Thiếu engine cốt lõi thì hỏi để tạo prompt hoàn chỉnh cho engine đó.
- Budget chưa có: nêu cách đo và budget đề xuất có nhãn. Không đảm bảo FPS/zero allocation trước đo. Nghiệm thu phải quan sát/đo được, nêu môi trường.

Với Unity integration/testing được yêu cầu riêng, đọc [references/unity-validation.md](references/unity-validation.md); việc xuất prompt không cho phép tự triển khai. Đối chiếu prompt với ledger trước giao. Không thêm damage, camera shake, bloom, dissolve, ragdoll hay lớp phụ thành bắt buộc nếu chưa chọn. Không tuyên bố đã test trong engine khi chỉ tạo prompt.

## Tiếp tục và ví dụ

Khi yêu cầu lưu/bàn giao, lưu spec/prompt ở vị trí người dùng chọn hoặc thư mục deliverable; nêu version, status, quyết định còn thiếu và bước tiếp theo. Chat mới cần gửi kèm spec; không mặc định tự có lịch sử.

Đọc [references/thorn-vine-binding.md](references/thorn-vine-binding.md) chỉ khi tiếp tục Thorn Vine Binding hoặc cần ví dụ giữ spec đã duyệt. Ví dụ này không phải template cho mọi effect.
