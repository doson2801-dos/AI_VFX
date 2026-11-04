# Technical Decision Engine

Đọc sau visual intent/blueprint, trước asset plan. Engine/version/pipeline/camera/platform được xác minh từ project khi có; không bịa API hay đổi pipeline. Hướng mobile mặc định theo ưu tiên người dùng, budget mới là đề xuất cho tới khi có số đo.

## Trình tự ra quyết định

1. Ghi visual invariant và motion cần đạt từng layer: silhouette thay đổi hay chỉ transform, bề mặt có chuyển động nội tại không, cần nhiều góc/occlusion thật không, ending nào đã chọn.
2. Rà project được cấp theo asset-review-and-approval.md. Đọc module/stream/UV/channel/keyword thực; ghi nguồn và giới hạn. So giải pháp có sẵn với yêu cầu, không suy từ tên shader hoặc curve lưu khi module tắt.
3. Chọn phương án đơn giản đủ dùng theo bảng. Nếu bỏ phương án reuse hoặc thêm kỹ thuật phức tạp, ghi khoảng thiếu cụ thể. Phương án này là đề xuất cho tới khi thuộc plan đã duyệt.
4. Xuất bảng từng layer: visual need → reuse evidence → silhouette owner → carrier/alignment/space → motion/end → channel/blend → cost/risk → kiểm tra → status. Liên kết ID shape/layer/spec để tránh kỹ thuật làm đổi thiết kế.

| Nhu cầu | Điểm bắt đầu | Khi cần giải pháp khác |
|---|---|---|
| Một phần tử giữ shape, di chuyển/scale/rotate/tint | Static mask/texture + native Particle Systems | Biến dạng nội tại rõ mà module không diễn tả được |
| Chạy pulse trên cung/dải/bề mặt | Texture cục bộ + UV animation trên carrier đủ dùng | Nhiều góc hoặc biến dạng silhouette không đạt bằng UV |
| Tan/rút/erosion đã được yêu cầu | Fade/gradient/mask/dissolve phù hợp nguyên tố | Cần topology biến đổi phức tạp thì cân nhắc chuỗi frame |
| Hình khối bên trong biến đổi theo thời gian | Flipbook cục bộ có keyframes được kiểm soát | Tránh nếu static + modules đã đủ hoặc chi phí atlas quá cao |
| Vật có thể tích/quay nhiều góc, parallax/occlusion thật | Reuse mesh/material hoặc geometry vừa đủ | Card đủ nếu góc game hạn chế và không mất đọc hình |
| Nhiều ngôn ngữ hình ảnh/motion độc lập | Hybrid theo layer | Không bake cả bố cục vào một sheet để né art direction |

Static, UV, dissolve, flipbook và mesh có thể phối hợp nhưng mỗi tính năng cần vai trò. UV scroll/dissolve chạy được trên quad, không là bằng chứng cần volume mesh. Flipbook không mặc định tốt hơn smoke mềm. Atlas variants chọn ngẫu nhiên không phải chuỗi animation.

## Shader và kết thúc

Alpha/additive đơn giản: ưu tiên shader particle có sẵn tương thích pipeline. Material/texture/config khác nhau thường đủ; không copy shader đổi tên cho từng effect. Chỉ mở rộng/tạo shader khi đã nêu tính năng thiếu; giữ tương thích shared VFX, Built-in + URP cho shader mới trong phạm vi áp dụng, không tự thêm HDRP.

Ending theo quyết định đã duyệt. Khi cần chọn dissolve đọc elemental-dissolve.md; ghi vùng mất trước/giữ cuối, hướng/polarity/channel và progress theo lifetime. Với ánh sáng, nếu được yêu cầu tan theo sáng–tối, vùng mờ mất trước lõi sáng, không dùng noise độc lập phá lõi trước. Không tự thêm dissolve vì thư viện có nó.

Texture/mask RGB×tint×opacity, một tint không tạo nhiều tông độc lập. Xác minh kênh shader đọc rồi mới làm ảnh; shading vẽ trên card tạo cảm giác khối nhưng không thành thể tích đúng mọi góc. Chú ý overdraw, vùng trong suốt, layer/draw call, hạt/đỉnh, samples/pass/variants và memory/bandwidth; không cam kết FPS trước đo thiết bị đích.
