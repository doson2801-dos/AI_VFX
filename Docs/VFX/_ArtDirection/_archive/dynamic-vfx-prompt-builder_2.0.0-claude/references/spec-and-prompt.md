# Spec và prompt tự chứa

## Bản thiết kế để duyệt

Điều chỉnh độ dài theo effect, bỏ mục không áp dụng. Dùng mẫu để tạo bản thực tế, không gửi bảng trống.

1. **Tên/version/status:** draft, approved, revised; căn cứ/phạm vi phê duyệt đọc được và phần chưa truy xuất được.
2. **Concept:** mục đích, reference đã xem, silhouette/style/màu/tỷ lệ/camera. Tách quan sát và suy đoán.
3. **Thành phần/timeline:** layer → vai trò → geometry/asset → chuyển động → start/duration → end. Timing chưa chốt là đề xuất có đơn vị.
4. **Gameplay:** trigger, target, thời điểm có hiệu lực, chủ sở hữu trạng thái, cancel/end/replay. Cosmetic-only thì ghi rõ.
5. **Asset plan:** đơn/sheet/atlas/mesh/material/shader; grayscale/alpha/tint; placeholder; kiểm tra playback/pivot/loop của sheet.
6. **Thông số:** key, nghĩa, giá trị/đơn vị, tuning range, trạng thái. Khoảng giá trị không đổi thành số đơn mà không ghi nhãn.
7. **Decision ledger:** ID, quyết định, giá trị, nguồn, trạng thái; bảng Markdown đủ dùng.
8. **Giả định và câu thiếu:** blocker concept/gameplay khác lựa chọn triển khai agent có thể quyết định.
9. **Nghiệm thu thiết kế:** dấu hiệu đúng hình/chuyển động/gameplay, trường hợp kết thúc, môi trường đánh giá.

Chưa duyệt thì hỏi phê duyệt bản cụ thể. Đã duyệt thì ghi căn cứ và chuyển bước được yêu cầu. “Không có ghi chú” không phải duyệt mọi con số AI đề xuất.

## Prompt triển khai để dán vào phiên agent mới

Viết trực tiếp cho agent thực hiện, bao gồm những mục áp dụng dưới đây. Điền dữ liệu thực tế; không để placeholder chưa giải thích trong prompt được gọi là hoàn chỉnh.

### Nhiệm vụ và scope

Tên effect/spec version/status và asset plan ID/version/trạng thái duyệt. Nếu chưa duyệt asset plan thì chỉ dẫn rà project → xuất bảng assets → chờ duyệt trước thực hiện; không bắt agent bỏ qua gate. Deliverables: script, prefab/material, scene demo, tài liệu setup theo engine. Gắn nhãn nếu nháp. Chép đủ quyết định đã chốt kể cả ledger; prompt không phụ thuộc lịch sử chat.

### Kiểm tra dự án

Đọc AGENTS.md/quy ước repo, kiểm tra engine/version/pipeline, gameplay/pooling sẵn có. Nêu environment biết rồi; phần chưa có mới yêu cầu kiểm tra. Không cài package/chuyển pipeline chỉ để hợp giải pháp tự đề xuất. Chưa có repo thì yêu cầu đường dẫn trước sửa file, vẫn mô tả thiết kế/thuật toán độc lập.

### Hành vi/hình ảnh

Đọc [concept-to-implementation.md](concept-to-implementation.md) khi có concept/reference được chọn. Đưa vào prompt cuối phần đặc tả hình ảnh chi tiết, danh sách layer có ID và bảng dấu hiệu trong ảnh → yêu cầu dựng → cách kiểm tra. Mỗi layer mô tả silhouette, tỷ lệ/vị trí, khối đặc/rỗng, độ dày thay đổi, đầu–thân–đuôi hoặc lõi–mép khi áp dụng, phân bố sáng–tối/màu, cạnh/texture và tương quan với layer khác. Tách quan sát thật, yêu cầu user, đề xuất và phần chưa biết. Điền dữ liệu thực từ ảnh; không copy schema trống.

Concept, layer và state/timeline; enter/exit, units, trigger/end/cancel, follow/world space, pause/time scale khi liên quan. Đủ cụ thể để không suy ra từ tên effect.

### Kiến trúc/dữ liệu

Chỉ đề xuất kiến trúc theo nhu cầu thực. Với Unity VFX mới của người dùng này, ưu tiên native Particle Systems và prefab không cần runtime controller; demo/trigger script ở ngoài prefab. Controller/renderer/config/gameplay adapter chỉ có khi behavior/integration thực sự cần, không tạo như bộ khung bắt buộc. Tên type minh họa khi repo chưa có, không giả đó là API tồn tại. Public entrypoints phù hợp dự án: play/start, stop/cancel, release, completion callback. Config tách tuning khỏi behavior; callback idempotent; token/reference count khi nhiều nguồn áp trạng thái.

### Thuật toán

Đường đi, sampling/update/attachment/hệ tọa độ; lý do mesh/particle/flipbook/procedural. Growth progress là normalized time hay arc length; gai/nhánh có orientation/distribution ổn định, tránh nhảy hình. Taper/fade/retract đúng concept; validation input/fallback theo effect. Không tự thêm physics.

### Animation và gameplay

Timeline nhất quán, easing/curve tunable khi chưa chốt. Gameplay apply/release độc lập alpha renderer. Cancel sớm, chết/despawn, disable/destroy, reuse/replay đều dọn trạng thái. Chỉ release lock effect sở hữu, tránh mở trạng thái do hệ khác khóa. Networking/authority/sync theo dự án khi có yêu cầu multiplayer.

### Assets/setup

Danh sách tài nguyên theo layer, phần tái sử dụng đã kiểm tra và phần cần tạo; import rules theo môi trường, kênh opacity thực tế shader đọc (R/alpha/khác), RGB×tint×opacity, blend, UV, shader/material và placeholder có nhãn. Thư viện tham chiếu chỉ được xem/học nếu chưa được phép copy. Texture là thành phần cục bộ tái dùng, hình cuối do mesh/emitter/module/phối layer tạo ra. Với shader mới, giữ hỗ trợ Built-in và URP trong phạm vi dự án áp dụng; không tự thêm HDRP/chuyển pipeline. Setup prefab/scene/Inspector theo engine. Không giả có asset/bone path. Humanoid binding hoặc fallback bounds khi skeleton không hợp.

### Hiệu năng

Mặc định thiết kế hướng mobile khi user chưa chỉ định khác; chọn shader particle có sẵn, đơn giản phù hợp pipeline khi alpha/additive đủ nhu cầu. Không bắt mọi effect có dissolve/noise/distortion. Pooling/buffer reuse khi cần, allocation update, giới hạn mesh/particle/draw/overdraw/texture; bounds/culling cho geometry động. Budget có sẵn thì giữ; nếu chưa, nhãn đề xuất và cách đo CPU/GPU/memory/GC trên platform đích với concurrency/camera/resolution. Không cam kết FPS trước đo.

### Test/nghiệm thu

Mỗi test: điều kiện → thao tác → mong đợi. Thông số đã chốt, timeline/event, geometry/motion, cancel/cleanup/reuse và performance liên quan. Test logic deterministic và visual scene phù hợp; không test lặp code hay unit test “ảnh đẹp”. So sánh concept và render tại pose/camera/scale/mốc thời gian tương ứng, kiểm tra playback trên nền phù hợp và xét từng layer đóng góp vào tổng thể. Khác biệt về silhouette, tỷ lệ, độ dày, sáng–tối và mật độ phải được báo cụ thể. Build/compile/lifecycle pass không chứng minh đạt mỹ thuật. Reference comparison/threshold có căn cứ; threshold mới là đề xuất. Không bắt xin duyệt từng thành phần trừ khi user đã yêu cầu quy trình đó.

### Bàn giao/báo cáo

Files/changes, setup/run, config/Inspector, demo, test thực sự chạy, chưa chạy và limitations. Không tuyên bố build/Play Mode pass nếu thiếu engine. Blocker thực phải báo, không tự đổi thiết kế để vượt nó.

## Kiểm tra trước giao

Đối chiếu mọi quyết định với prompt, units và tên dễ nhầm; timeline nhất quán; ownership/cleanup có kết thúc; version/phê duyệt khớp. Thiếu dữ liệu không thành “đã duyệt”, đề xuất không thành requirement. Prompt tự chứa đủ để dùng ở chat mới.

## Ảnh tham chiếu trong spec và prompt triển khai

Nếu người dùng cung cấp ảnh concept/tham chiếu, ghi ID/version, path/link thực sự truy cập được và trạng thái (selected/chỉ tham khảo). Đưa quyết định hình ảnh đã xác nhận vào ledger; chi tiết ngoài ý muốn trong ảnh không thành requirement. Timing/thông số/gameplay vẫn lấy từ spec, không đo chính xác từ raster concept.

Prompt triển khai tự chứa mô tả hình ảnh chi tiết bằng chữ; ảnh concept đã chọn là căn cứ thị giác phải mở xem khi có thể truy cập, không chỉ phụ kiện tùy ý. Nội dung phải theo concept-to-implementation.md, không rút gọn thành tên style/palette. Nếu path chỉ nằm ở chat/máy khác, nêu cần gửi kèm ảnh khi bàn giao thay vì giả agent ở chat mới truy cập được. Không bắt gửi ảnh mới khi user chỉ yêu cầu chuyển spec đã duyệt thành prompt.

## Truyền Art Style qua bàn giao

Spec và prompt triển khai phải chứa hướng art style, mô tả bằng hình khối/edge/detail/shading hữu ích cho effect, nguồn và trạng thái xác nhận; thêm reference thật khi có. Giữ style đã chọn khi chọn assets/materials. Engine/render pipeline hoặc ưu tiên grayscale texture không thay thế art style; concept có màu theo palette đã chốt. Kiểm tra nghiệm thu visual có mục đúng style. Nếu style còn proposed, ghi rõ và không biến thành quyết định đã duyệt.

## Kiểm tra độ đầy đủ của prompt cuối

Mỗi layer và dấu hiệu thị giác quan trọng trong concept phải có yêu cầu dựng, tham số điều khiển hoặc giải pháp tài nguyên và cách nghiệm thu tương ứng. Đặc điểm đã chốt không được bỏ chỉ để prompt ngắn. Giữ phần visual chi tiết bên cạnh thuật toán, timeline, gameplay, hiệu năng và test; không để nội dung kiến trúc lấn mất mô tả hình ảnh. Nếu dài, xuất một file Markdown prompt đầy đủ thay vì tóm tắt mất dữ liệu; prompt vẫn phải tự chứa và mang danh sách ảnh cần bàn giao. Dữ liệu chưa quan sát được cần đánh dấu, không bịa chi tiết để làm dài.

## Texture-first, dissolve và gate asset plan v1.4.0

Trước đề xuất assets mới, đọc [asset-review-and-approval.md](asset-review-and-approval.md) và thực hiện hoặc giao agent bên nhận rà toàn project, ghi candidate paths có kiểm chứng,reuse/learn/variant/new, lý do và ảnh hưởng shared assets. Bảng asset cần user duyệt trước runtime asset generation hoặc tạo/sửa shader/mesh/prefab/script cho effect. Duyệt spec và xuất prompt không thay gate này; plan đã duyệt không hỏi lại.

Mỗi layer trong prompt có: silhouette owner (texture/geometry/hybrid), carrier/alignment/UV/pivot, brief texture cục bộ với value/opacity/order channels và trạng thái, nguồn reuse, module và kỹ thuật end. Tham khảo [shape-design-2d.md](shape-design-2d.md) và [texture-production.md](texture-production.md); đủ dữ liệu phải mô tả được một texture artist sẽ vẽ gì, không chỉ “tạo impact texture”. Không biến Stylized 3D thành yêu cầu volume mesh hoặc xem dissolve/scroll như đặc quyền của mesh.

Khi cần ending, dùng [elemental-dissolve.md](elemental-dissolve.md): chọn theo nguyên tố/vai trò, nêu vùng mất trước/giữ cuối, order mask/polarity, progress/softness/hướng và hợp đồng alpha/RGB/emission; chỉ thêm khi phù hợp yêu cầu. Ghi rõ no dissolve/fade/retract nếu đó là quyết định. Progress sample là QA, không đổi timeline đã chốt. Tham số chưa được chọn giữ nhãn đề xuất. Chưa chạy engine không coi shader/mask đạt mỹ thuật.


## Hợp đồng ngôn ngữ và phê duyệt v2.0

Trong v2.0: spec/trao đổi tiếng Việt; **prompt kỹ thuật cuối hoàn toàn bằng tiếng Anh** và chỉ xuất sau user duyệt spec và cho phép xuất prompt. Bản nháp chỉ khi user yêu cầu, ghi DRAFT — NOT APPROVED, không cấp quyền runtime. Nếu có Shape Specification, theo thứ tự/hình thực trong [shape-specification.md](shape-specification.md); kỹ thuật theo [technical-decisions.md](technical-decisions.md); keyframes/QA theo [flipbook-and-production-qa.md](flipbook-and-production-qa.md); Unity testing/integration theo [unity-validation.md](unity-validation.md). Prompt tự chứa kết quả áp dụng, không chỉ link tới skill. Giữ phê duyệt còn hiệu lực, gộp gate khi đủ nội dung đã hiển thị.

Trước bàn giao, đối chiếu từng layer/shape ID: brief đã xác nhận → nguồn concept/blueprint đã xem → contour/value/motion → representation/asset → phép kiểm tra. Prompt tiếng Anh phải nhúng nội dung thực của chuỗi này, không chỉ tên reference trong skill. Nêu concept/preview cần gửi kèm, gate đã duyệt và gate đang chờ; agent nhận prompt không được suy approval từ tên file hoặc lời AI. Báo riêng technical QA, visual comparison và user artistic approval.
