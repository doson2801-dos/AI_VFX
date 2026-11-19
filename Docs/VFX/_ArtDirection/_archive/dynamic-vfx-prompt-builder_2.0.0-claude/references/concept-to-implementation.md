# Từ concept đến prompt triển khai bám hình ảnh

Đọc khi xuất prompt cuối có ảnh concept/reference cần bám, hoặc người dùng phản hồi bản dựng/prompt chưa giống concept. Mục tiêu là truyền thông tin thị giác có thể thực hiện và kiểm tra, không đơn thuần kéo dài prompt bằng kiến trúc hay từ ngữ mỹ thuật chung.

## 1. Xác định nguồn đúng và phạm vi đã chốt

Mở trực tiếp ảnh đã chọn bằng công cụ xem ảnh; ảnh local cần path có thật. Ghi ID/version, trạng thái selected/approved/draft và phần người dùng muốn lấy. Không dùng thumbnail, prompt gen ảnh hoặc tên file để thay việc xem ảnh. Nếu chỉ có spec chữ, làm theo spec, không giả đã xem concept. Nếu cần bám ảnh nhưng ảnh không truy cập được, chuẩn bị phần dựa trên dữ liệu đã có và yêu cầu đúng nguồn còn thiếu; không gọi bản đó là đã đối chiếu ảnh.

Tách bốn loại căn cứ: quyết định user đã chốt, đặc điểm quan sát trong ảnh, giả định chuyển động/tuning và phần chưa biết. Một ảnh được chọn là định hướng hình ảnh, không tự duyệt timing/gameplay hoặc mọi chi tiết AI vô tình sinh ra. Nếu ảnh lệch spec approved, ghi đúng khác biệt, giữ quyết định đã chốt cho tới khi có yêu cầu đổi. Đánh dấu đâu là effect, đâu là background/nhân vật/camera/lighting hỗ trợ để không triển khai nhầm thành layer VFX.

## 2. Phân tích thị giác theo từng lớp

Gán ID ổn định cho các lớp thực sự cần theo concept, không bắt mọi effect có cùng số layer. Cho mỗi lớp, điền các mục áp dụng bằng mô tả cụ thể:

- **Vai trò và độ ưu tiên:** tâm điểm hay hỗ trợ, chủ thể nào phải đọc rõ; lớp nào được phép che lớp khác.
- **Vị trí/tỷ lệ:** nguồn phát, điểm bám, hướng, vùng bao phủ, độ cao/bề rộng tương đối với target hoặc toàn effect. Phân biệt tương quan quan sát được với đơn vị mét đã chốt; không đo meters từ ảnh không có scale.
- **Silhouette/hình khối:** cong/góc, bất đối xứng, đoạn phình/cổ thắt, khối đặc/khoảng rỗng, độ dày biến đổi và mật độ. Chỉ nêu những nét thật sự có ở ảnh, không mặc định mọi sét phải zigzag hay mọi slash phải rách.
- **Đầu–thân–đuôi và lõi–mép:** phần dẫn/đi sau dọc chuyển động khác gradient theo bề ngang. Chỉ rõ vùng nào liền, sắc, mềm, mảnh/dày; không dùng một mô tả “noise/dissolve” cho toàn layer.
- **Sáng–tối/màu:** vùng sáng nhất nằm đâu, diện tích tương đối, vùng chuyển tối, lõi lệch/giữa khi thấy được, mép/glow và độ tách nền. Không biến toàn thân thành dải trắng phẳng chỉ vì lõi ảnh sáng. Tách màu texture, tint, alpha và ánh sáng môi trường.
- **Ngôn ngữ bề mặt:** mảng lớn, gân, rỗng, grain, mức mềm/sắc; phần nào sạch ít vân, phần nào có khối. Không chỉ ghi “texture chi tiết” hoặc phủ noise nhỏ lên tất cả.
- **Quan hệ giữa lớp:** độ dày, độ sáng, mật độ, overlap, khoảng hở và thứ tự che nhau. Giữ sự khác biệt của layer chính với highlight/glow/particle phụ khi concept có chúng.

Mỗi mục phải dẫn đến quyết định hình ảnh cụ thể; không copy checklist trống vào prompt cuối. Có thể dùng định tính có mốc rõ khi ảnh không đủ căn cứ định lượng. Mọi ratio/threshold/tuning mới do AI đề xuất phải có nhãn, không ghi là giá trị đọc chính xác từ ảnh hoặc đã duyệt.

## 3. Ánh xạ sang cách dựng, không bake cả concept

Tạo bảng **ID/dấu hiệu trong concept → yêu cầu hình ảnh → cách dựng/điều khiển → cách kiểm tra**. Mọi dấu hiệu nổi bật và layer đã chốt cần có dòng ánh xạ; mọi layer đề xuất thêm phải có lý do và trạng thái, không thêm ngầm.

Cho mỗi lớp, chỉ rõ những phần cần thiết:

- Asset có thể tái dùng đã kiểm tra, tài nguyên cần tạo và tài nguyên tạm. Không copy từ project chỉ được xem/học. Texture cục bộ đa dụng được phép và ưu tiên quyết định nét/silhouette của phần tử phù hợp; carrier/UV định vị và emitter/module/phối lớp tạo bố cục cuối. Không vẽ sẵn toàn effect vào một PNG và không ép geometry thay vai trò texture.
- Chọn texture-first/carrier/hybrid/volume theo từng lớp và nhu cầu thật; không tự chọn mesh 3D vì có dissolve/UV scroll. Texture hoặc geometry tạo silhouette phần tử theo lựa chọn, emitter tạo bố cục/tỷ lệ; UV/pivot/orientation/space và cách follow nguồn. Với mesh sweep, tách geometry/mask cố định, pulse và chuyển động UV; không ép thành bóp méo mesh nếu không cần.
- Texture silhouette/value distribution, kênh shader thực đọc (R/alpha/khác), blending và RGB×tint×opacity. Kiểm tra alpha có hữu ích thật, không suy từ đuôi PNG. Mức trắng trong mask không tự chứng minh render bị phẳng; kiểm tra trong pipeline/color space thực.
- Module tạo hình, hướng, scale, màu, tốc độ, noise hoặc sub-emitter khi cần; parameter nào điều khiển yêu cầu nào. Với nguồn particle di chuyển, cân nhắc native Birth sub-emitter và World Space nếu cần đuôi lưu lại, không hardcode quỹ đạo chỉ giống một ảnh.
- Tái sử dụng shader/material phù hợp trước; alpha/additive đơn giản thì ưu tiên shader có sẵn theo pipeline. Chỉ thêm dissolve/distortion/noise động nếu hình ảnh cần. Tránh shader hardcode hình dáng/timing riêng của effect hoặc master shader dư thừa.

Unity VFX mới mặc định native Particle Systems, prefab không cần runtime controller; script demo/trigger nằm ngoài. Behavior đặc thù hoặc gameplay integration có thể cần script, giải thích đúng nhu cầu. Thiết kế hướng mobile: chú ý overdraw, số layer, hạt/đỉnh, sample/pass và texture memory từ đầu; không tự giảm nét hình đã duyệt để đạt budget chưa đo. Shader mới hỗ trợ Built-in và URP theo dự án áp dụng, không tự thêm HDRP hay đổi pipeline.

## 4. Chuyển động/timeline theo layer

Đưa bảng start/peak/hold/end của các layer áp dụng, time unit và event. Chuyển động khối, chuyển động bề mặt và fade/end là ba phần khác nhau; chỉ trượt nguyên mesh hoặc đổi seed không tự thay được surface evolution khi brief cần nó. Giữ mốc/thời lượng đã chốt, timing chưa biết ghi đề xuất. Không suy vận tốc, ease, sequence, mặt khuất hoặc số frame chỉ từ concept tĩnh.

Phần concept biểu diễn peak cần được giữ như một pose đánh giá trong timeline, nhưng không ép toàn lifetime đóng băng giống peak. Nêu dấu hiệu khi onset, peak và recovery đủ để người triển khai hiểu hình biến đổi ra sao; không tự thêm gameplay/camera shake/lớp hỗ trợ.

## 5. Tiêu chí nghiệm thu hình ảnh và sửa sai

Prompt phải yêu cầu render/playback thực trên nền phù hợp với concept và bối cảnh game. So ảnh và render tại góc camera, pose, scale/framing, nền/ánh sáng và thời điểm tương ứng; ghi rõ điều kiện chưa khớp nếu không thể so trực tiếp. Không chỉ so các PNG texture rời.

Nghiệm thu dựa trên đặc điểm đã phân tích: silhouette và tỷ lệ, phân bố dày–mỏng/khối đặc–rỗng, focal hierarchy, sáng–tối/màu, sạch/vân/edge theo vai trò và mật độ/tương quan các layer. Ngưỡng số chỉ dùng nếu có căn cứ hoặc ghi đề xuất. Pixel match toàn ảnh không là tiêu chí mặc định cho VFX động.

Chụp frame ở các mốc đã có và quay playback để xem hướng, continuity, nhịp và cách kết thúc. Kiểm tra từng layer khi cần để tìm nguyên nhân, rồi đánh giá tổng hợp; việc kiểm tra layer không tạo một vòng xin duyệt bắt buộc mới. User yêu cầu duyệt thành phần trước thì gửi playback riêng rồi chờ phê duyệt đã yêu cầu trước khi tích hợp; không xin lại phần đã duyệt.

Yêu cầu agent báo **visual gap** theo ID: mong muốn → quan sát render → khác biệt → nguyên nhân cần kiểm tra → sửa trong phạm vi → bằng chứng sau sửa. Compile/build/lifecycle pass không đủ để nói mỹ thuật đạt. Nếu môi trường thiếu engine/capture/thiết bị, báo phần chưa kiểm chứng thay vì đánh dấu đạt; không lặp thử vô hạn hoặc tự đổi timing/gameplay đã chốt để che lỗi hình.

## 6. Cấu trúc prompt cuối

Prompt tự chứa gồm: nhiệm vụ và dữ liệu tham chiếu thực; trạng thái spec/ảnh và quyết định đã chốt; đặc tả tổng thể/camera/art style; mô tả từng layer; bảng ánh xạ thị giác sang cách dựng; assets/shader/module và tham số; timeline/animation; gameplay/lifecycle khi áp dụng; budget mobile và cách đo; setup/demo; tiêu chí frame/playback và báo cáo sai khác. Giữ mọi mục kiến trúc/test cần thiết nhưng không thay phần visual bằng mô tả chức năng chung.

Nếu dài, lưu prompt đầy đủ thành Markdown deliverable, chat chỉ tóm tắt. Phần giao cho agent triển khai phải chứa toàn bộ chi tiết áp dụng, không chỉ link tới hướng dẫn skill hoặc “xem phần trên”. Kèm đúng ảnh concept nếu agent bên nhận không truy cập được path gốc; không hứa text hoặc ảnh AI tự bảo đảm render giống hoàn toàn mà chưa kiểm tra.

## Tình huống rà soát

- Có ảnh được chọn: thực sự xem ảnh, ghi đặc điểm theo layer và điều kiện render; không chỉ chép prompt gen ảnh.
- Chỉ có spec chữ: viết đủ theo dữ liệu thật, báo chưa có đối chiếu hình, không bịa quan sát.
- User chỉ sửa màu: thay palette/value liên quan, giữ silhouette, timing, gameplay và layer đã duyệt.
- Concept thể hiện peak: giữ pose mục tiêu; motion vẫn theo spec/video hoặc đề xuất có nhãn.
- Ảnh và spec trái nhau: ghi xung đột, không tự đổi quyết định approved; giải quyết blocker cụ thể.
- Chỉ yêu cầu prompt: bàn giao đầy đủ, không tự sửa project hoặc tạo tài nguyên.

Các tình huống này là hướng dẫn đánh giá, không phải kết quả chạy thử model/Unity.

## Ràng buộc asset runtime bổ sung v1.4.0

Đọc [asset-review-and-approval.md](asset-review-and-approval.md): trước triển khai cần rà project-wide và bảng asset cụ thể được user duyệt. Đây là gate asset plan đã được yêu cầu, khác việc tự đặt thêm vòng duyệt mỹ thuật từng layer. Prompt cuối phải giữ gate, không dùng “triển khai toàn bộ ngay” nếu plan chưa duyệt. Texture-first áp dụng mọi layer phù hợp; đọc [shape-design-2d.md](shape-design-2d.md) và [texture-production.md](texture-production.md). Nếu ending dùng dissolve, chọn theo [elemental-dissolve.md](elemental-dissolve.md) và nhúng phương án áp dụng vào prompt, không chỉ dẫn link.


## Bổ sung v1.5.0

Trước phân rã layer chi tiết cho Shape Specification, đọc [shape-specification.md](shape-specification.md): phải hiển thị hình cấu trúc hình ảnh mục tiêu đơn giản, bám concept. Hình đó khác breakdown sheet, silhouette preview và production asset. Prompt cuối tiếng Anh sau approval, mang ID/version và trạng thái gate shape/keyframe/assets còn thiếu; không giả chúng đã duyệt.
