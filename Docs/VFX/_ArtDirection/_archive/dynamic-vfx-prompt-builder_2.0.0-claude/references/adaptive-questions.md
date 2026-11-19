# Hỏi thích ứng theo loại hiệu ứng

Đây là ngân hàng định hướng, không phải bảng khảo sát hỏi hết. Đọc brief, bỏ câu đã có đáp án, chọn khoảng trống ảnh hưởng lớn nhất. Cập nhật decision ledger sau mỗi đáp án rồi rẽ nhánh. Effect lai dùng nhóm liên quan, không hỏi trùng.

Thông tin chung khi chưa biết: mục đích gameplay, tham chiếu đã xem hoặc brief văn bản được cho phép, nguồn/mục tiêu, silhouette/style/màu, kích thước/camera, trigger/timing/end. Engine/pipeline/platform/concurrency và assets phục vụ kỹ thuật, không bắt hỏi hết ở concept.

| Nhóm | Khoảng trống cần khai thác | Rẽ nhánh |
|---|---|---|
| Projectile | Nguồn, quỹ đạo thẳng/cong/homing, trail, impact | Homing: đổi hướng/mất target; piercing: tiếp tục hay dừng; AoE: bán kính từ gameplay |
| Explosion/impact | Điểm nổ, silhouette/hướng lực, flash–khói–mảnh/end | Sát tường: normal; trên không: không tự thêm decal đất; không mặc định damage/shake |
| Beam/lightning | Hai đầu, liên tục/xung, dài/dày, nhánh | Sustained: tracking/stop; lightning: topology/jitter; tick gameplay chỉ khi có yêu cầu |
| Aura/buff/shield | Bám object/world, vùng bao phủ, loop, active/end | Shield: vòm/cầu/hit response; aura: refresh/stack/bone; không tự thêm collider |
| AoE/telegraph | Hình vùng, căn đất, cảnh báo/kích hoạt, ally/enemy | Dốc: align/project; di chuyển: follow/fixed; ranh gameplay khác glow |
| Slash/trail | Gesture/weapon path, pivot, rộng, sampling/lifetime | Weapon: bone/world, teleport discontinuity; slash sẵn: orientation/trigger |
| Summon/portal | Mặt phẳng/hướng, mở–giữ–đóng, kích thước | Cosmetic hay traversal? Render xuyên cổng là yêu cầu riêng |
| Bind/tether/vine | Nguồn, quấn/đuổi/nối, target, vùng bám, tháo | Wrap: nhánh/vòng/chiều/attach; lock hay slow? Rút đồng thời/lần lượt; gai chỉ khi brief có |
| Fire/smoke/weather | Burst/loop, nguồn/hướng, scale/gió/độ dày | Flipbook: playback/pivot/loop; weather: world/camera volume; không ép vật lý |
| Transformation | Bộ phận đổi, hướng/tiến trình, mesh/material | Topology đổi cần asset/transition; fade không tự tương đương dissolve |
| Khác | Cái gì xuất hiện, biến đổi thế nào, kết thúc ra sao? | Tạo câu theo cơ chế vừa hiểu, không ép vào danh mục |

## Art Style không được bỏ qua

Ngân hàng cơ chế ở trên không thay nhóm lựa chọn chung Art Style. Nếu chưa được chốt, nhóm này phải có ở bảng đầu tiên theo references/art-style.md. Nếu đã có trong brief/spec hoặc user đã yêu cầu bám style của dự án/tham chiếu cụ thể, giữ lại giá trị và nguồn, không hỏi trùng.

## Quyết định câu tiếp theo

1. Chưa rõ nguồn/mục tiêu: hỏi vì chúng quyết định tọa độ/tương tác.
2. Chưa rõ chuyển động chính: đưa lựa chọn dễ hình dung, hỏi nhánh phụ thuộc đáp án sau đó.
3. Chưa rõ end/gameplay: hỏi trước khi chốt timeline/contract.
4. Giá trị tuning không ảnh hưởng concept: đề xuất có nhãn và đơn vị trong spec.
5. Đủ core behavior: tổng hợp thiết kế; chỉ hỏi blocker thật.

Ví dụ “Tia sét nối pháp sư với kẻ địch, phát từng nhịp”: hỏi một mục tiêu hay chain, hai đầu tracking hay cố định lúc phát, cosmetic hay đồng bộ combat event. Không hỏi số vòng/gai/rút đất. Nếu chọn chain, hỏi thứ tự lan/mất mục tiêu; nếu một target, bỏ nhánh chain.

Ví dụ “Dây leo từ đất quấn 2–3 nhánh đến eo humanoid, continuous, rút simultaneous; lock sau khi trói”: không hỏi lại các giá trị này. Tổng hợp hoặc chuyển thẳng sang prompt nếu đã duyệt. Hold duration chưa biết thì ghi phụ thuộc gameplay, không bịa 3 giây.
