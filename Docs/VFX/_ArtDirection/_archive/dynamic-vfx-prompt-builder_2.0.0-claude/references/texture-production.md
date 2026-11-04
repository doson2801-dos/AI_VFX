# Từ concept được vẽ sang texture sử dụng được

Đọc khi lập brief tài nguyên hoặc thực sự tạo texture. Có thể vẽ/generate texture từ ngôn ngữ của concept; nhiệm vụ khác với vẽ ảnh minh họa. Không dừng ở “tạo mesh gần giống” khi nét chính nên được thể hiện bằng ảnh 2D.

## 1. Tách concept thành brief asset

Xem ảnh/version đúng và chọn layer. Chuyển các đường nét, value và nhịp khối cần giữ sang **một phần tử cục bộ**, không crop nguyên concept thành runtime sprite. Xác định phần đã duyệt và đề xuất asset riêng. Ví dụ impact: một shape có gốc, thân liền với vai/eo, chóp theo trục; emitter phối phần tử thành vụ nổ. Không vẽ luôn cả khói/vòng/đá và đội hình tia vào cùng texture.

Mỗi texture brief phải có: ID/layer/role; style; silhouette/value; trục/pivot/UV; static/atlas/flipbook; kích thước đề xuất theo camera; tên kênh shader dùng; nền/alpha; tiling và padding; phần reuse hoặc cần tạo. Không mặc định bắt tất cả có nhiều maps/normal/emissive. Phân biệt **runtime texture**, **silhouette study**, **concept illustration**.

## 2. Brief texture (Claude Code không gen ảnh raster)

Kiểm tra thư viện có thể reuse trước, không copy tài nguyên chỉ được phép học. Thiếu texture phù hợp thì xuất brief texture cụ thể và kế hoạch thực hiện để người dùng tạo bằng công cụ khác; không thay bằng vài polygon/procedural shape rồi gọi là đã vẽ texture giống concept.

Dùng concept/reference làm **tham chiếu visual language**, không yêu cầu vẽ y nguyên toàn scene. Khi người dùng gửi lại texture đã tạo, inspect ảnh local trước khi dùng. Giữ version không overwrite trừ khi được yêu cầu. Các lựa chọn gen texture/asset không tự duyệt toàn spec hoặc bản render. Không cần tạo ảnh minh họa mới khi đã có concept được chọn.

Brief mẫu để điền bằng dữ liệu effect thật:

```text
Asset type: runtime VFX texture — one reusable local component
Reference role: selected concept for shape/value language, not full composition
Component: tên layer và chức năng
Silhouette: khối chính/khối phụ, đường biên và khoảng rỗng cần giữ
Value structure: vùng trắng/trung gian/tối; lõi/mép và độ chuyển
Direction and pivot: axis, gốc/chóp, vị trí padding
Channel contract: ảnh/kênh shader cần đọc; grayscale neutral/no hue
Background: genuine transparent alpha nếu workflow cần, hoặc nền đen theo hợp đồng R mask
Constraints: isolated component, no scene/ground/text/grid/checkerboard/glow halo baked unless specified
Avoid: lặp đều, mất lõi giữa, chi tiết vụn/viền nền không có trong brief
```

Nền đen cho R mask không đồng nghĩa alpha transparent. Nếu cần cutout thật, yêu cầu transparency và kiểm tra alpha; không chấp nhận checkerboard vẽ vào RGB. Không yêu cầu RGB trắng/alpha shape và RGB grayscale/R shape cùng lúc trừ khi thực sự cần cả hai. Tool gen không bảo đảm packing channel chính xác: phải xác minh và dùng công cụ phù hợp nếu cần chuyển kênh; không hứa một call tạo đúng mọi map.

Chỉ dùng xử lý pixel bằng code khi user đã yêu cầu/cho phép theo skill. Kiểm tra metadata/channel bằng công cụ đọc ảnh là bước QA, không tự là quyền sửa ảnh bằng code. Thiếu tool thì báo ảnh chưa tạo, không dùng placeholder mà gọi là asset cuối.

## 3. Kiểm tra kỹ thuật và mỹ thuật

Đọc RGB/R/alpha riêng: range min/max, kênh có constant hay không, mask đúng polarity và không mất shading. Xem trên nền sáng/tối; kiểm tra chóp/biên, padding/bleeding khi mip/filter/compression và UV atlas. Không tự xóa shadow/value để lấy alpha bằng một ngưỡng thô mà chưa xem kết quả.

Sau import, thử texture trên đúng carrier/material/shader, pipeline/color space, tint/blend/opacity, UV/orientation và scale gần game. Silhouette đạt khi đứng riêng chưa đủ; ghép lại layer chính để kiểm tra khối/occlusion/value. Không tự sửa mesh/timing/gameplay đã chốt để bù một texture sai vai trò.

Static texture + module đủ thì dùng trước. Nếu cần biến dạng bên trong texture mà UV/mask/module không đạt: flipbook cục bộ nối tiếp có onset/peak/end, pivot/scale nhất quán, kiểm tra playback đúng duration. Atlas biến thể không được phát tuần tự giả animation; không sinh grid rồi tuyên bố chuyển động đạt khi chưa xem.

Khi dùng grayscale/ramp/tint, kiểm tra hiển thị thực; texture mask trắng có thể cần giữ lõi, gray quá tối có thể mất khối. Khả năng tái dùng không đồng nghĩa grayscale RGBA giảm VRAM; chọn format/compression theo shader/platform thực.

## 4. Bàn giao

Lưu asset thật vào workspace được phép; ghi path/version, prompt/brief, role/channel/import và material sử dụng. Kèm preview trong shader/playback khi có môi trường; nếu chỉ gen PNG thì nói rõ chưa xác nhận runtime. Nếu user yêu cầu duyệt thành phần trước, gửi playback và chờ phê duyệt đúng phần đó; nếu không, không tự tạo vòng chờ mới.

Unity có thể phát sprite sheet trong module [Texture Sheet Animation](https://docs.unity3d.com/2022.3/Documentation/Manual/PartSysTexSheetAnimModule.html); đây là khả năng engine, không chứng minh các frame AI đã nối liên tục hoặc đạt art direction.


## Bổ sung v1.5.0

Đọc [flipbook-and-production-qa.md](flipbook-and-production-qa.md) khi chọn flipbook: duyệt keyframe board trước full sequence, giữ duration/pivot và kiểm tra continuity. Shape mới/đổi cần preview silhouette đã duyệt theo [shape-specification.md](shape-specification.md); các gate có thể gộp với plan khi đã hiển thị đủ. Quy tắc không tự xin duyệt playback từng layer không bỏ các gate thiết kế này.
