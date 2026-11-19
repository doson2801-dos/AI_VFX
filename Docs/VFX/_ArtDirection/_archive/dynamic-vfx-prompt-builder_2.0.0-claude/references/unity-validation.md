# Unity integration và kiểm chứng khi được yêu cầu

Skill mặc định thiết kế/xuất prompt. Chỉ thực hiện runtime khi người dùng yêu cầu riêng, đúng asset plan và các gate shape/keyframe áp dụng đã duyệt. “Update skill”, “xuất prompt”, hoặc approval design không tự yêu cầu sửa Unity. Không tiếp tục effect đang stop. Giữ ràng buộc không điều khiển UI nếu có; dùng file/job đã được cấp quyền.

## Thiết lập

Đọc AGENTS.md, xác minh Unity version, pipeline/packages, color space, target platform, scene/camera, pool/trigger convention và reuse đã khảo sát. Đọc API/tài liệu chính thức đúng version khi chưa chắc; không cài package hay đổi pipeline để hợp phương án tự chọn.

Unity VFX mới ưu tiên native Particle Systems, prefab hierarchy gọn và không cần runtime controller. Script demo/trigger ở ngoài prefab; chỉ thêm logic vào runtime khi behavior/integration thật sự yêu cầu và thuộc scope. Renderer/material/texture/mesh theo plan, không sửa shared asset ngoài quyền. Xác minh module bật, streams/custom data packing, shader keywords thực thi và opacity channel. World/local space, alignment, sorting, bounds/culling, start delay/lifetime/bursts và Texture Sheet Animation phải khớp spec.

Gameplay và visual tách ownership: VFX không tự thêm damage/collider/shake/decal/status. Play/cancel/stop/completion/replay/pooling theo hệ thống có sẵn; reset seed/time/sub-emitters/trails khi liên quan, không để state từ lần trước rò sang lần mới. Callback và cleanup chỉ tác động state effect sở hữu.

## Bằng chứng kiểm chứng

| Nhóm | Hành động và kết quả cần quan sát |
|---|---|
| Import/compile | Mở/import bằng môi trường được phép; không missing material/texture/shader hoặc lỗi console liên quan; báo log thật |
| Timeline | Trigger rồi capture onset/peak/end theo mốc approved; kiểm tra start delays, lifetime, frame map và end không còn hạt ngoài thiết kế |
| Lifecycle | Cancel sớm, replay, disable/destroy, pool reuse và mất target nếu áp dụng; không rò trạng thái hoặc phá ownership |
| Visual | Camera/framing/scale/nền phù hợp; frame comparison với concept/blueprint và playback thật; so silhouette/value/overlap/hướng/continuity |
| Mobile | Khi có thiết bị và budget: đo CPU/GPU, overdraw/draw calls, texture memory, concurrency ở camera/resolution đích; nếu chưa có ghi chưa đo |

Chọn test cần thiết theo effect; không tạo unit test “ảnh đẹp” hoặc lặp implementation. QA từng layer dùng để tìm lỗi, không tạo gate duyệt mọi layer ngoài yêu cầu đã có. Sửa trong scope đã duyệt rồi kiểm tra phần ảnh hưởng; nếu cần đổi approved shape/timing/technique, trình delta cụ thể.

Báo ba trạng thái riêng: technical checks, visual comparison và user artistic approval. Technical pass không tự là visual pass; AI nhìn ổn không thành user approval. Khi thiếu editor/capture/device, bàn giao setup, lệnh/job có sẵn và kiểm tra chưa chạy; không bịa screenshot/Play Mode/FPS. Giao actual files, demo instructions, evidence, gaps và điểm chưa xác minh.
