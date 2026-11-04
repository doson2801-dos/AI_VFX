# Thư viện dissolve theo hành vi và nguyên tố

Đọc khi user yêu cầu dissolve, concept cần biến đổi hình bên trong khi kết thúc, hoặc cần mô tả phương án trong prompt. Đây là thư viện mở cho các nhóm nguyên tố phổ biến và tổ hợp; không có một công thức duy nhất cho “tất cả nguyên tố”. Chọn theo vai trò layer, art style và reference. Các lựa chọn hình ảnh dưới đây là phương án thiết kế, không phải mô phỏng vật lý hay kết quả render đã được user duyệt.

## 1. Phân biệt các hành vi trước chọn kỹ thuật

- **Fade:** giảm toàn coverage/intensity; không tự làm silhouette biến đổi có cấu trúc.
- **Erosion/dissolve:** các vùng mất theo retention/order mask, giữ vùng khác lâu hơn; có thể shader hoặc frame vẽ.
- **Directional reveal/retract:** đầu quét hoặc rút theo trục/path; không thay bằng lỗ noise nếu brief cần rút về nguồn.
- **Breakup:** hình tách thành mảng; dissolve chỉ che phần gốc, mảnh tách thật cần particle/asset phù hợp.
- **Morph/flow:** đường biên di chuyển, coalescence/chảy; threshold noise một mình không tự tạo chuyển động vật chất.

Nếu fade/module đã đủ concept, không tự thêm dissolve. Nếu effect approved chỉ đổi màu, không đổi ending. Dây leo đã chốt tháo/rút đất thì giữ đó; shader dissolve không tự thay được tháo/rút.

## 2. Các công cụ tạo hình có thể phối hợp

| Công cụ | Trường hợp hợp | Điểm kiểm soát |
|---|---|---|
| Retention/value mask vẽ tay | Mất vùng tối/mờ trước, lõi giữ lâu; impact/energy | Mảng lớn, giá trị có thứ tự, bảo vệ lõi; noise không ghi đè ý đồ |
| Gradient theo UV/trục | Tan đầu/đuôi, sweep, rút theo hướng | Chiều trục, pivot, một/hai đầu; phân biệt dọc vệt và ngang vệt |
| Flow noise có cấu trúc | Khói/lửa/độc phong cách loang/cuộn | Scale và hướng flow theo khối; tránh noise li ti phá lõi |
| Cell/crack mask | Băng/đất/đá/corruption vỡ mảng | Cell không đều, fissure có lý do; không thêm mảnh bay khi chưa chọn |
| Flipbook vẽ cục bộ | Silhouette thay đổi mạnh mà mask/module không đủ | Key shapes, continuity/pivot, end; không mặc định khói cần flipbook |
| UV advection/pulse trên carrier | Wind/slash/trail, chuyển động bề mặt | UV wrap/clamp, cố định mask, tránh trượt cả shape gây mất hướng |

Kiểm tra shader/material có sẵn trước; native Color over Lifetime có thể điều khiển fade nhưng không tự điều khiển arbitrary dissolve threshold của shader. Custom Data/vertex streams chỉ dùng khi shader hỗ trợ đúng packing/stream và module thật sự bật. Không giả Custom1.x mặc định luôn là dissolve trong mọi shader.

## 3. Hợp đồng mask và công thức tham khảo

Gọi `A` là coverage gốc theo kênh shader đọc, `M` là retention/order mask trong [0,1] (cao giữ lâu), `p` là dissolve progress 0→1 trong đoạn end đã có, `w>0` là độ mềm. Công thức **minh họa**, không là shader đã tích hợp:

```text
t = lerp(-w, 1, saturate(p))
keep = smoothstep(t, t + w, M)
coverage = A * keep * particleOpacity
```

Với M∈[0,1], p=0 giữ coverage gốc; p=1 che hết, kể cả texel M=1. Không dùng hai cạnh smoothstep bằng nhau; với hard cut thì xử lý endpoints rõ thay vì để step(1,1) còn lõi. Sắp xếp gradient và đảo mask có chủ đích, không chỉ đổi threshold rồi đoán chiều tan. Đừng giả smoothstep của engine tự có nghĩa dissolve nếu chưa có mask/progress/coverage wiring.

Với ánh sáng, retention phải bám vùng sáng/độ phủ **có ý nghĩa trong hình đã chọn**: vùng tối/mờ mất trước, lõi sáng giữ lâu. Có thể dùng value/coverage được vẽ làm M sau khi kiểm tra thực tế; alpha trắng phẳng không chứa phân cấp sáng, còn mask noise độc lập không biết lõi ở đâu. Không sample màn hình sau bloom để ngược điều khiển dissolve. Nếu yêu cầu đúng thứ tự tuyệt đối, không thêm nhiễu đổi ranking; nếu thêm biến thiên cục bộ được phép thì không để lõi sáng thủng trước vùng tối.

Edge band khi thật sự cần là vùng còn hiện sát biên threshold, nhân coverage gốc để không phát sáng ngoài silhouette. Không mặc định mọi nguyên tố có viền cam/emission. Với additive phải giảm cả đóng góp RGB/emission theo keep theo hợp đồng blend; sửa alpha thôi có thể chưa làm ánh sáng biến mất. Với premultiplied tránh nhân alpha hai lần; đọc shader/blend hiện tại trước. Kiểm tra gamma/linear, import của data mask và compression thực, không áp sRGB giống nhau cho color và dữ liệu thứ tự mà chưa hiểu shader đọc.

Kỹ thuật threshold mềm có cơ sở ở [Smoothstep Node — Shader Graph 14](https://docs.unity3d.com/Packages/com.unity.shadergraph@14.0/manual/Smoothstep-Node.html). Cấu hình alpha/blend/cutout/streams phụ thuộc shader, tham khảo [URP Particles Unlit 14](https://docs.unity3d.com/Packages/com.unity.render-pipelines.universal@14.0/manual/particles-unlit-shader.html), không coi shader này mặc nhiên đọc retention mask tùy ý hoặc chạy Built-in.

## 4. Gợi ý theo nhóm nguyên tố

| Nhóm | Ngôn ngữ kết thúc có thể chọn | Shape/mask và điều cần tránh |
|---|---|---|
| Lửa / nhiệt | Mép/lưỡi mỏng co/tan trước, khối nóng hạ về than khi phù hợp | Loang theo hướng cuộn/nâng và value; không đục lõi bằng noise trắng độc lập, không buộc mọi lửa có than |
| Khói / hơi / sương | Mảng tách mềm, độ phủ giảm, khoảng hở nở có cấu trúc | Mask khối lớn + module trước; không mặc định flipbook hoặc dissolve rách cứng; màu nóng chỉ gần nguồn nhiệt phù hợp |
| Sét / điện / plasma | Nhánh/mép yếu và vùng mờ mất trước lõi; pulse tắt theo spec | Value mask theo nét; giữ đoạn dày–mỏng và chóp; không mặc định rung hình/noise/dư chấn mới |
| Nước / chất lỏng / foam | Màng mỏng tách, co/rách thành giọt hoặc foam mờ | Mask flow/neck breakup hoặc flipbook nếu cần morph; threshold không tự tạo giọt chuyển động |
| Băng / tuyết / frost | Nứt/tách mảng hoặc tan rìa tùy concept | Crack/cell/frost growth inversion; không tự thêm nước hay shard physics, không mặc định viền cháy |
| Gió / khí / slash gió | Mỏng đuôi, đầu–cuối tan dọc stroke, khoảng hở chạy theo flow | Retention/UV gradient; giữ thân chính trong đoạn đọc hình; không phá tất cả cung thành sợi |
| Đất / đá / pha lê | Mòn mép, nứt theo mảng hoặc mất lực rồi rơi | Mask theo mặt/crack; hình thật có thể cần mesh; không làm khối cứng như khói nếu brief không yêu cầu |
| Cát / bụi / tro | Mép tơi, mảng giảm coverage, hạt phụ nếu được chọn | Cell/flow theo khối và gravity gợi ý; đừng thêm hàng nghìn grain chỉ để texture có chi tiết |
| Cây / gỗ / lá / dây leo | Khô/héo, tách lá, hoặc tháo/rút nếu đã chốt | Mask theo lá/gân/chiều dài khi phù hợp; opacity erosion không thay chuyển động unwrap |
| Độc / acid / slime | Mảng bọt vỡ, loang coalescence, giọt co khi được chọn | Blob/cell có nhịp; không random rách nhỏ đồng đều hoặc tự sinh khói độc/damage |
| Ánh sáng / thánh / laser | Ngoài mờ mất trước, lõi sáng thu/tan cuối; vệt theo hướng | Value retention và coverage/emission đồng bộ; không dùng noise thủng lõi hoặc viền lửa nếu không hợp |
| Bóng tối / void / corruption | Co hút hoặc ăn mảng, giữ silhouette trong đoạn đọc | Gradient hướng tâm/cell/flow theo brief; không mặc định xóa từ sáng đến tối cho hình hấp thụ tối |
| Ma thuật / rune / shield | Nét tắt theo stroke, mảnh panel mất lần lượt hoặc pulse tan | Stroke/directional/segment mask; không biến rune rõ nét thành đám noise vô nghĩa |
| Kim loại / năng lượng cơ khí | Hạ sáng, rã theo panel/đường cắt khi phù hợp | Panel/crack/value; mesh cho vật có thể tích; không tự mô phỏng nóng chảy |
| Vụ nổ / impact đa lớp | Impact theo value/direction; khói theo mảng; debris theo lifetime | Mỗi lớp một end behavior, không một noise mask chung cho flash/khói/đá/impact |

Tên nguyên tố mới hoặc tổ hợp: phân loại trạng thái nhìn thấy (glowing stroke/fluid/soft volume/solid/graphic symbol), nguồn lực và hành vi end rồi chọn công cụ; không cần bịa shader mới cho mỗi tên. Ví dụ băng phát sáng có thể cần crack cho mặt băng và value fade cho glow riêng, không ép một mask làm cả hai.

## 5. Khai báo trong spec/prompt và kiểm tra

Mỗi layer có end behavior: no dissolve/fade/erosion/directional/breakup/flipbook; vì sao hợp concept; vùng mất trước/giữ cuối; M lấy từ ảnh/kênh nào, polarity, softness/scale/direction; t_start/t_end dựa timeline đã duyệt; progress theo particle age hay global trigger; điều khiển qua module/curve/streams thật; edge/emission có hay không; trạng thái thông số đề xuất. Khi end time tính theo trigger, xử lý start delay và emission kéo dài, không giả mọi particle cùng tuổi.

Test progress 0, 0.25, 0.5, 0.75, 1 cho shape và test playback ở duration thật. Các progress chỉ là mốc QA, không tự chốt timing mới. Kiểm tra không còn hạt/lõi sáng tại end; vùng quan trọng không mất quá sớm; không bật viền ngoài alpha; alpha/additive đều kết thúc; random seed không thay mask topology bất chợt giữa frame; UV sheet không bleed, pause/replay/pool reuse reset đúng. Kiểm tra giá trị mask phẳng, softness=0 không hợp lệ và texture thiếu để báo/fallback có kiểm soát.

Mask/data map thêm sample/band/noise chỉ khi cần; tránh nhiều noise/pass/overdraw trên mobile. Threshold animation không được tự tăng total lifetime hoặc thay gameplay. Chưa có engine thì chỉ báo phương án/kiểm tra logic, không gọi kỹ thuật được QA mỹ thuật.
