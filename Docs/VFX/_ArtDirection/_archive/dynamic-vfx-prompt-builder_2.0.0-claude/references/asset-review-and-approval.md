# Rà soát project và duyệt danh sách asset trước mỗi effect

Yêu cầu người dùng ngày 17/10/2026: luôn ưu tiên tái sử dụng, trước mỗi effect liệt kê asset thành phần để user duyệt rồi mới làm. Áp dụng cho mọi loại VFX và mọi layer, không chỉ impact. Đây là gate triển khai runtime, không tự ngăn yêu cầu chỉ viết spec/prompt hoặc xem/học tài nguyên. Concept generation theo yêu cầu vẫn là bước thiết kế, không tự phê duyệt asset runtime.

## 1. Rà soát toàn project trước khi đề xuất tạo mới

Khi có project được cấp: kiểm tra AGENTS.md, engine/pipeline và cấu trúc Assets cùng local packages/thư viện VFX được project sử dụng, không chỉ thư mục effect mới. Ưu tiên rg --files, lọc theo vai trò/chức năng và rg tìm shader/property/material/prefab liên quan. Tìm cả tên chức năng như pulse, soft particles, unlit, alpha/additive, dissolve, UV scroll, custom data, flipbook, arc/ring; tìm effect có kỹ thuật gần dù khác nguyên tố. Không coi danh sách filenames hoặc một query tên effect là đã rà soát đầy đủ.

Đọc ứng viên có liên quan: prefab hierarchy/Particle Systems, renderer mode, material/shader refs, mesh/texture, UV/streams/custom data, các module bật, shader keywords/properties có thực thi, blend và opacity channel. Resolve GUID/meta khi cần, xem texture/mesh preview khi có công cụ. Tham số/curve còn lưu nhưng module/keyword tắt không chứng minh kỹ thuật đang chạy. Prefab/mesh binary chưa đọc được phải ghi giới hạn; không kết luận từ tên.

Rà soát theo phạm vi có bằng chứng: ghi các vùng Assets/packages đã tìm và phần chưa truy cập/kiểm chứng. Không scan toàn ổ máy hoặc import project tham chiếu ngoài quyền được cấp. Project tham chiếu chỉ được xem/học thì giữ đúng quyền đó; kỹ thuật học được khác quyền copy file.

Chưa có project/path: có thể tạo asset plan sơ bộ, ghi reuse chưa khảo sát. Hỏi đường dẫn khi cần để tiếp tục triển khai; không ghi “không có asset phù hợp” khi chưa rà. Khi chỉ xuất prompt, prompt bắt agent bên nhận thực hiện rà soát và gate duyệt trước tạo assets runtime.

## 2. Bảng asset thành phần để người dùng duyệt

Với effect mới, lập bảng trước mọi runtime texture gen, mesh/shader/script/prefab creation hoặc sửa tài nguyên dùng chung. Điền bằng dữ liệu thực, không bảng mẫu trống:

| Trường | Nội dung |
|---|---|
| Plan ID/version và layer | Tên effect, version, vai trò từng thành phần |
| Hình ảnh cần giữ | Silhouette/value/style/ending liên quan và concept/spec source |
| Asset và carrier | Texture đơn/atlas/flipbook/mask, material/shader, quad/strip/volume mesh, prefab/particle system |
| Phương án | Tái dùng nguyên trạng / material hoặc prefab variant mới / chỉnh có kiểm soát / tạo mới |
| Nguồn đã kiểm tra | Path thật, kỹ thuật có thể học/reuse, module/stream/channel/keyword thực sự dùng |
| Khoảng thiếu | Vì sao giải pháp sẵn có chưa đủ; không tạo mới nếu chưa có lý do |
| Phạm vi thay đổi | File mới dự kiến, file cũ cần sửa, ảnh hưởng shared assets và quyền copy |
| QA | Cần xem PNG/channel, carrier render hoặc playback để xác nhận phù hợp |
| Trạng thái | Chờ duyệt/đã duyệt/đề xuất thay đổi; chưa xác minh không thành đã đạt |

Tách asset kỹ thuật dùng chung với instance/variant của effect. Dùng shader cũ + material/texture mới khi đủ, không copy shader đổi tên. Nếu cần tính năng mới, nêu lý do mở rộng shader chung hay tạo shader tái dùng; tránh master shader dư thừa. Tương tự prefab: có thể học setup và tạo variant không phá bản cũ, không tự sửa shared prefab/material làm thay VFX khác.

## 3. Gate bắt buộc và phạm vi phê duyệt

Gửi bảng cụ thể và xin **duyệt asset plan**. Chờ user trả lời trước khi bắt đầu thực hiện runtime asset/prefab của effect. “Dùng concept” hoặc “duyệt spec và xuất prompt” không tự là duyệt asset plan chưa từng hiển thị. Yêu cầu “triển khai” chung không bỏ qua gate này. Có thể tiếp tục đọc/khảo sát không gây thay đổi trong lúc chờ.

Nếu plan/version đã được duyệt trong ngữ cảnh thì ghi căn cứ và triển khai đúng plan, không hỏi lại. Đổi công cụ nội bộ không đổi nội dung/quyền ảnh hưởng không cần tạo gate mới; thay asset mới, đổi carrier/technique có ảnh hưởng visual hoặc sửa tài nguyên shared ngoài plan phải đưa phần thay đổi ra duyệt, giữ phần cũ đã duyệt. Không yêu cầu duyệt lại toàn bộ effect do một dòng thay đổi.

## 4. Đưa gate vào prompt cuối và bàn giao

Prompt triển khai phải mang plan ID/version, bảng asset cụ thể, quyết định user và trạng thái duyệt. Nếu chưa rà/duyệt thì phần đầu yêu cầu agent bên nhận rà project, xuất bảng actual candidate paths rồi chờ duyệt; không đưa câu “thực hiện ngay toàn bộ” mâu thuẫn với gate. Spec visual/timing approved vẫn giữ nguyên trong lúc chọn asset.

Sau triển khai, đối chiếu actual asset list với plan: reused/variant/new/modified, lý do sai khác được duyệt và QA thật. Thiếu asset/quality chưa đạt thì báo đúng, không đổi sang volume mesh hoặc procedural placeholder để nói hoàn tất. Quy trình này không cho phép tiếp tục LargeExplosion đang bị stop hoặc điều khiển UI trái ràng buộc của task.


## Bổ sung v1.5.0

Asset plan approval không thay phê duyệt silhouette mới/đổi hoặc keyframes flipbook chưa hiển thị. Theo [shape-specification.md](shape-specification.md) và [flipbook-and-production-qa.md](flipbook-and-production-qa.md), có thể gộp chúng trong một lượt duyệt cụ thể. Preview thiết kế ngoài runtime project được phép trước asset plan; production/import và sửa prefab vẫn phải chờ plan đã duyệt và yêu cầu thực hiện.
