# Hình khối 2D và lựa chọn texture/mesh cho VFX

Đọc khi thiết kế silhouette, lập asset plan hoặc prompt triển khai. Ưu tiên mới của người dùng: dùng texture/mask 2D làm phương tiện chính kiểm soát nét và khối cho thành phần phù hợp, đặc biệt impact stylized. Không mặc định giải bài toán hình vẽ bằng khối mesh 3D.

## 1. Tách art style, silhouette và mặt mang texture

Stylized 3D là định hướng hình ảnh; không bắt mọi layer là geometry có thể tích. Texture được vẽ cho một phần tử impact có thể mang chóp, vai, cổ thắt, cạnh cong C/móc, độ dày thay đổi và phân bố sáng–tối. Quad, billboard, stretched billboard hoặc dải mesh UV chỉ mang ảnh, định hướng và tạo độ cong không gian khi cần. Chúng vẫn có triangles nhưng khác việc dùng geometry để quyết định mọi đường nét.

Mesh 3D có thể làm stylized; chỉ chọn làm phương tiện hình chính khi cần silhouette thay đổi theo góc nhìn, chiều sâu/occlusion, parallax hoặc vật thể thật sự có thể tích. Không cấm mesh cho đá, gai, dây có thân hoặc phần cần nhìn quanh. Không chọn volume mesh chỉ vì tên effect hay style có chữ 3D. Ghi lý do riêng cho từng layer, không chỉ impact.

**Dissolve và UV scroll không phải lý do tự đủ để dùng mesh có thể tích.** Cả hai dùng được trên card/quad/particle sprite có UV. Chỉ cần strip/arc/shell khi hình hoặc hướng UV phải chạy dọc bề mặt cong, vòng/cung/đường đi hay wrap thật; khi đó mesh là carrier và texture vẫn có thể quyết định nét. Hợp đồng lựa chọn luôn ghi visual need → kỹ thuật → carrier tối thiểu đủ dùng, không đi ngược từ thích mesh sang ép concept.

| Layer/nhu cầu | Điểm bắt đầu ưu tiên | Điều cần kiểm tra |
|---|---|---|
| Impact spike, hit flash, slash accent | Texture silhouette/value cục bộ trên quad/card định hướng | Nét/chóp/độ dày nằm trong mask, không thay bằng tam giác mesh đều |
| Slash/sweep cong không gian | Texture pulse trên strip/arc mesh UV gọn | Texture tạo ngôn ngữ bề mặt; UV tạo sweep, không bake cả cung |
| Khói/khối mềm nhìn từ camera game | Puff grayscale/alpha + particle phân bố 3D | Shading/overlap tạo khối đọc được; không cho rằng một puff tự có volume thật |
| Lửa stylized | Texture cục bộ + module; flipbook nếu cần biến dạng nội tại | Không dùng scale/noise module để giả mọi chuyển động mặt |
| Shock ring/magic circle | Mask trên mặt phẳng hoặc strip/ring UV | Projection/perspective, không đĩa đặc nếu cần vành |
| Tia sét/energy stroke | Texture/mask có hình vẽ hoặc dải có texture | Hướng, dày–mỏng, value và thay hình khi cần; tube không mặc định |
| Đá/mảnh có thể tích, gai, vật quay nhiều góc | Mesh nếu texture card không đáp ứng | Geometry phục vụ yêu cầu thật, không là mặc định cho tất cả |

Ưu tiên 2D vẫn cần kiểm tra camera thực: view-facing card có thể đổi cảm giác hướng; velocity-facing có thể nhìn nghiêng mất hình; crossed cards có seam/overdraw. Chọn alignment theo góc nhìn game, không xoay mọi thứ nhìn camera bằng thói quen. Không tự thêm chồng card để vá mà không đo/so hình.

## 2. Thiết kế một phần tử có thể tái dùng

Trước chi tiết, vẽ/brief silhouette đen–trắng của **một phần tử**, không phải toàn vụ nổ/cung chém. Xác định trục lực, gốc/pivot và chóp dẫn. Khối lớn → khối phụ → chi tiết nhỏ; dùng khoảng rỗng có chủ đích, tránh chia thân thành nhiều dải song song nếu cần thân liền.

- **Đường nét:** phối straight/curve theo concept; tránh toàn tam giác thẳng hoặc toàn lưỡi cong. Impact cần hướng tâm thì chóp vẫn theo trục hướng ra ngoài, đường cong nằm ở cạnh/thân.
- **Nhịp dày–mỏng:** vai/phình, cổ/eo, taper và nhịp asymmetry; không thay bằng scale đều của một shape nghèo nét. Preset không áp đặt chữ C hay nhọn cho mọi nguyên tố.
- **Đầu–thân–đuôi:** chóp, thân chịu lực và gốc chuyển mềm có vai trò riêng. Gradient theo chiều dài khác gradient từ mép vào trong bề ngang.
- **Phân bố value:** lõi đọc rõ, mảng trung gian/tối và vùng sáng tập trung; trắng liền có thể đúng cho mask opacity, không tự là lỗi. Render color mới quyết định có bị trắng phẳng hay không.
- **Mép/highlight:** nếu là lớp riêng, dùng nét sạch/sắc phù hợp, không copy texture thân có vân rách sang mép. Bloom không thay shape hoặc value structure.
- **Biến thể:** khác silhouette/khối có chủ đích, giữ cùng visual language; không chỉ đổi seed/xê dịch. Atlas các biến thể độc lập không chạy như frame nối tiếp.

Xem silhouette ở kích thước hiển thị gameplay, không chỉ zoom PNG. Kiểm tra chi tiết/đầu mảnh còn đọc được sau mip/compression và không sinh viền nền. Tỷ lệ texel/resolution theo screen size/platform, không mặc định mọi asset 4K.

## 3. Texture kiểm soát shape và cảm giác khối như thế nào

Mask kiểm soát coverage; value texture kiểm soát sáng–tối; mask giữ lại kiểm soát dissolve; chúng có thể là cùng ảnh/kênh hoặc tách theo nhu cầu. Một kênh không tự mang ba vai trò độc lập. Chốt shader đọc R hay alpha trước khi tạo asset. RGB trắng với chi tiết trong alpha khác ảnh grayscale RGB alpha=1.

Cảm giác khối trong một sprite có thể dùng các mảng sáng–tối được vẽ phù hợp style/camera, và phân lớp trong không gian. Đây là shading minh họa, không là thể tích/shadow đúng mọi góc. Với ánh sáng thay đổi cần kiểm tra giải pháp lit/normal hoặc geometry sẵn có; không tự tạo shader mới khi unlit đủ mục tiêu.

Một tint nhân grayscale không cho màu lõi vàng và mép đỏ độc lập. Có thể phối các lớp/mask hoặc dùng remap/ramp có sẵn khi cần nhiều tông. Chọn giải pháp đủ dùng và chi phí mobile; không thêm sample/pass không cần thiết.

## 4. Output bắt buộc trong prompt triển khai

Với mỗi layer ghi: **phương tiện quyết định silhouette** (texture/geometry/hybrid), **carrier**, camera/alignment, texture brief + opacity/value/dissolve channels, UV/pivot, module/animation, blend và tiêu chí render. Nếu chọn volume mesh cho một phần tử giống impact được vẽ, giải thích nhu cầu texture card không đáp ứng; không ghi “mesh để stylized” như lý do đủ.

Giữ decisions/timing/gameplay, không tự thay asset của effect đang dừng. Khi chỉ viết prompt, nhúng chỉ dẫn cụ thể; khi được yêu cầu thực hiện assets, dùng [texture-production.md](texture-production.md) để thực sự tạo ảnh và kiểm tra.

## Cơ sở kỹ thuật

Unity hỗ trợ nhiều renderer mode cho particle, bao gồm billboard và mesh; lựa chọn renderer không tự xác định art style. Xem [Renderer module — Unity 2022.3](https://docs.unity3d.com/2022.3/Documentation/Manual/PartSysRendererModule.html). Quy tắc tạo hình ở trên là định hướng mỹ thuật/workflow theo yêu cầu người dùng, không là công thức do tài liệu engine bảo đảm. Kiểm tra engine/package của project trước chọn thiết lập cụ thể.


## Bổ sung v1.5.0

Khi cần Shape Specification, đọc [shape-specification.md](shape-specification.md): hình cấu trúc tổng thể trước layer breakdown, preview silhouette mới/đổi cần được duyệt trước production. Phê duyệt đã có được giữ; không tạo thêm vòng duyệt từng layer ngoài gate đó.
