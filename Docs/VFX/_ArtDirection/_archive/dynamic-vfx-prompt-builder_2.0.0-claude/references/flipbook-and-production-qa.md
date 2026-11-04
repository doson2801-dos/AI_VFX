# Flipbook được kiểm soát và QA production asset

Đọc khi đã xác định cần chuyển động nội tại không thể đạt đủ bằng static texture/modules/UV, hoặc khi tạo/kiểm tra production asset. Gate assets vẫn bắt buộc; preview/keyframe thiết kế không là quyền ghi runtime project.

## 1. Hợp đồng animation trước tạo atlas

Chốt layer/shape ID và phạm vi cục bộ, visual invariants, duration đã duyệt, one-shot hay loop, hướng lực, pivot/anchor, canvas/bounds và frame order. Đề xuất frame count, cell size, grid, frame timing và playback mapping theo screen size/budget; không coi chúng là số đo từ concept tĩnh. Nếu N frame có thời lượng đều, fps danh nghĩa = N / duration; cần xác minh cách engine lấy mẫu normalized age và frame cuối. FrameTime curve/hold có thể khác đều; ghi mapping cụ thể.

## 2. Keyframes trước toàn chuỗi

Đề xuất key poses đủ thể hiện motion: onset, expansion/strike, peak, breakup và end khi áp dụng; loop dùng poses theo chu kỳ, không ép fade-to-empty. Không bắt số lượng poses cố định cho mọi effect. Hiển thị hình keyframe thật có ID/thứ tự/time (giây và normalized age), shape/value cần giữ và điểm được phép đổi. Phân biệt approved silhouette với proposed motion.

Gửi keyframe board để người dùng duyệt trước sinh toàn chuỗi; có thể gộp với shape/spec/asset-plan approval nếu đã hiển thị đủ. Dùng approval trước nếu đã có, không xin lại. Chỉ keyframe được duyệt không cho phép bỏ gate asset plan. Với nhiệm vụ chỉ viết prompt, truyền gate này cho agent thực hiện. Nếu preview chưa có, báo thiếu; một prompt gen hoặc grid placeholders không phải keyframe board đã hoàn tất.

## 3. Tạo frame và continuity

Tạo/edit theo các key poses được chọn với cùng canvas, camera, scale, pivot, style, channel và lighting/value language. Chèn frame trung gian có chủ đích; không sinh độc lập N ảnh rồi mặc định chúng nối được. Giữ nguồn/anchor cố định nếu effect không di chuyển; không tự recenter từng frame làm rung. Kiểm tra hướng lực, thay đổi diện tích/độ dày/value, edge travel, chi tiết pop và nhịp peak/decay.

Không ép nội suy cơ học nếu concept cần snap hoặc chuyển topology, nhưng chuyển đổi phải có chủ đích và kiểm tra ở tốc độ thật. Xem frame stepping và playback đúng duration; loop cần xem seam cuối–đầu, one-shot cần đúng frame kết thúc và cleanup. Không kéo dài animation để chữa frame sai timing approved. Giữ keyframes đã duyệt khi sửa intermediate trừ khi user cho đổi.

## 4. QA file và đóng atlas

| Kiểm tra | Bằng chứng cần ghi |
|---|---|
| Kích thước/grid/thứ tự | Kích thước ảnh, rows×columns, cell, N frame dùng, ô trống và start cell/orientation thực |
| Kênh | Đọc riêng R/RGB/alpha: constant/range, polarity; đúng shader channel contract |
| Transparency | Alpha thật khi yêu cầu; không nền/checkerboard vẽ vào ảnh, không matte halo ngoài ý muốn |
| Bounds/pivot | Chóp/gốc không crop; anchor nhất quán, padding/gutter/extrusion theo filter/mip |
| Render import | sRGB/linear theo vai trò, wrap/filter, mip/compression và texture format theo project/platform; không ghi một preset cho mọi map |
| Continuity | Contact sheet + playback duration thật + frame stepping; seam loop hoặc end của one-shot |
| Runtime | UV/cell mapping, tint/blend/channel, particle lifetime, frame over time, clipping/bleed ở mip và camera game |

Image generation không bảo đảm grid/channel chính xác; kiểm tra output thật trước đóng gói. Tuân công cụ/skill ảnh khi edit; không tự dùng code sửa pixel trái quyền. Metadata inspection và xem kênh là QA. Báo file/asset chưa tạo hoặc chưa QA, không thay bằng placeholder gọi là cuối.

## 5. QA trong tổ hợp

Static texture cũng cần channel/edge/pivot/import/render QA tương ứng; không bắt static asset có keyframes. Sau import thử đúng shader/carrier/pipeline/color space, nền sáng/tối và camera/scale game, rồi ghép layer. So onset/peak/end và toàn playback với concept/spec: silhouette, tỷ lệ, khối đặc/rỗng, lõi–mép, sáng–tối, hướng và mật độ. Liệt kê lỗi theo layer ID cùng ảnh/video bằng chứng. Compile và file đúng grid không chứng minh motion/mỹ thuật đạt. Không tự thay timing/mesh/gameplay đã duyệt để che texture sai.

Giao file production, channel/import contract, frame map, preview/playback, actual QA và phần chưa kiểm chứng. Chưa chạy Unity/thiết bị thì nói rõ, không nhận đã tích hợp hoặc đạt mobile.
