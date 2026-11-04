# Vụ nổ mạnh — Shape Specification v1

Trạng thái hiện tại: ĐÃ DUYỆT cấu trúc, silhouette và spec v1. Ngày 2026-10-17. Giữ tên file để bảo toàn link.

Căn cứ: người dùng trả lời “tiếp tục” ngay sau câu hỏi rõ phạm vi “Bạn có duyệt gộp cấu trúc, shape, spec v1 và A01–A07, đồng thời cho phép xuất prompt tiếng Anh không?”. Xác nhận áp dụng đúng phạm vi vừa trình bày. Các nhãn proposed/pending bên dưới được giữ như lịch sử bản trình duyệt; nội dung cấu trúc/shape và mục 5 nay được duyệt. Không suy thành concept v1 được chọn nguyên trạng hoặc runtime đã đạt.

Hai lệnh “tiếp tục” trước câu hỏi duyệt gộp chỉ cho phép tiếp tục thiết kế/khảo sát. Phản hồi mới nhất sau câu hỏi duyệt gộp là căn cứ trạng thái hiện tại. Quyết định D01–D08 trong DesignLedger_v1.md giữ nguyên. Lượt này chỉ xuất prompt bàn giao, chưa sản xuất runtime.

## 1. Mục tiêu thị giác

Vụ nổ Stylized 3D mạnh và nặng, khối vòm bung tròn quanh tâm, khói cuộn mảng lớn. Tâm sáng vàng–cam; khói ngoài sẫm; impact, đá và nhánh nứt cùng đọc hướng lực từ tâm ra ngoài. Vết nứt chỉ là hình ảnh trên nền. Tất cả tan hết sau hiệu ứng.

Nguồn đã mở xem: `References/StrongExplosion_Concept_v1_Draft.png`. Ảnh gốc tạo bằng built-in imagegen; chưa được người dùng chọn rõ. Quan sát: tâm vàng gần trắng nằm thấp; khói sau cao, hai bên và trước thấp hơn; impact nhiều mũi thẳng; đá góc cạnh; nứt nền sáng gần tâm. Khói trong ảnh chứa nhiều chi tiết nhỏ và đỉnh giữa cao. Những chi tiết này không tự thành yêu cầu. Blueprint đề xuất giản lược bề mặt và giữ envelope dạng vòm theo bảng chọn, cần duyệt.

Camera ba phần tư từ trên xuống là giả định trình bày. Chưa chốt camera game hoặc khả năng xem toàn hướng.

## 2. Hình cấu trúc mục tiêu

BP-01 v1 được hiển thị trong chat, với chế độ phân lớp màu/đơn sắc và shape kit. Nguồn hiển thị:
`C:/Users/Manh/.codex/visualizations/2026/10/17/01a14899-e9e0-7952-9e76-4e321f473f0c/strong-explosion-blueprint-v1.html`.

Đây là sơ đồ thiết kế, không phải runtime asset. Tỷ lệ bên dưới là đề xuất:

- Vòm tổng rộng 2R, cao R; khối sau cao hơn khối trước, vai hai bên khác nhau, không có cổ cột nấm.
- Tâm sáng rộng khoảng 0,5R, nằm thấp. Khói trước che các gốc nhưng chừa vùng tâm đọc rõ ở peak.
- Impact vượt qua khoảng hở khói và silhouette ở vài hướng, tránh hàng rào mũi đều. Mũi dẫn hướng ra ngoài.
- Đá phân bố cả trong và ngoài envelope, ít mảnh lớn xen mảnh nhỏ; không tạo vòng tròn spacing đều.
- Vết nứt đi trên mặt nền, lan ra xa hơn chân vòm; không dựng mảng đất nổi hoặc hố thật.

## 3. Cấu trúc layer

| Layer | Vai trò và overlap | Value, hình ảnh | Shape |
|---|---|---|---|
| L01 Khói | Khối chính; puff sau và hai bên bao quanh tâm, puff trước thấp che gốc | Mảng lớn có shading, không hạt li ti; trong nóng cam/đỏ, ngoài nâu than sẫm; không tint xám đồng nhất | S01 |
| L02 Impact | Lực bung nhanh; gốc chìm trong tâm, thân xuyên khe khói | Chóp sắc vàng, thân cam; vai cong/eo và taper, dày–mỏng xen kẽ; tránh toàn tam giác thẳng | S02A/B |
| L03 Ánh sáng tâm | Điểm sáng nhất, thấp sát gốc; không phủ trắng toàn vòm | Lõi nhỏ vàng nhạt, bao cam chuyển mềm; contour bất đối xứng, không ngôi sao đều | S03 |
| L04 Đá vụn | Accent có chiều sâu, bay khỏi tâm theo cung | Mảnh đặc góc cạnh, mặt tối/ấm khác nhau; không glow toàn thân | S04 |
| L05 Nứt nền | Nhánh lan từ tâm trên nền, thấy rõ ngoài chân khói | Gốc dày, đầu thu mảnh, phân nhánh không đều; khe tối có ánh ấm gần nguồn lúc đầu | S05 |

## 4. Shape kit v1

Preview đơn sắc trong chat gồm từng phần tử và ghép tổng thể BP-01. Chúng chỉ là bản vẽ thiết kế; chưa kiểm tra ở pixel size của camera game thực.

| ID | Contour, khối và tỷ lệ đề xuất | Pivot/trục | Value và phạm vi biến thể |
|---|---|---|---|
| S01 v1 | Puff liền, cụm 3–5 vai lớn lệch, eo nông, không xẻ thành tua; rộng/cao khoảng 1,3–1,8 | Gần tâm thấp; trục lên và hướng nở ra ngoài | Khối trung gian đủ rộng, một phía sáng hơn; thử nguồn puff sẵn có trước khi quyết định số biến thể |
| S02A v1 | Impact dày: gốc rộng, eo lệch, vai cong lõm, chóp thẳng; dài/rộng khoảng 2,5–3,5 | Gốc dưới, dọc theo lực bung | Thân liền, cạnh sạch; cam ở gốc, vàng gần chóp trong phối tổng thể |
| S02B v1 | Impact mảnh: thân hẹp, chóp dài, gãy nhịp ở vai; dài/rộng khoảng 4–6 | Gốc dưới, hướng ra ngoài | Khác contour S02A; không chỉ scale ngang cùng mask |
| S03 v1 | Khối sáng thấp, rộng/cao khoảng 1,5–2; lõi liền, rìa vài lồi lõm lớn | Tâm thấp sát điểm phát | Preview chỉ kiểm tra contour; bản render cần gradient mềm, không cạnh trắng cứng |
| S04 v1 | Mảnh 5–7 cạnh bất đối xứng, thân đặc, một đầu nhỏ hơn | Tâm khối để quay | Mesh reuse ưu tiên nếu cần quay đa trục; số mảnh chưa duyệt |
| S05 v1 | Một đoạn nhánh nứt, trục zigzag không đều, nhánh phụ ngắn; gốc dày và đầu nhọn | Đầu gốc để bố trí hướng tâm | Phần tử cục bộ, không texture bake cả mạng nứt tổng; xoay/ghép có chủ đích |

Kênh opacity chưa chốt. Phải xác minh shader đọc R hay alpha trước production. Texture thân và vùng sáng có thể cần dữ liệu khác nhau; một tint nhân grayscale không tạo nhiều màu độc lập.

## 5. Motion logic và thông số đề xuất

Không có charge hoặc hold. Từ trigger, chớp và impact phát ngay; vết nứt lan nhanh; khói nở theo lực bung rồi chậm, cuộn và tan. Đá bay theo cung và rơi; không có gameplay collision được yêu cầu. Ảnh tĩnh không xác nhận các chuyển động này.

| Layer | Khoảng thời gian từ trigger | Diễn tiến đề xuất |
|---|---|---|
| L03 | 0–0,12 s | Sáng nhanh; giảm độ sáng và opacity, tâm không giữ thành quả cầu trắng |
| L02 | 0–0,45 s | Mở rất nhanh tới peak khoảng 0,08–0,15 s, tiếp tục tỏa nhẹ rồi fade |
| L01 | 0,03–3,0 s | Nở thành vòm khoảng 0,25–0,45 s, tốc độ giảm; vùng nóng chuyển đỏ/nâu rồi than sẫm, tan mềm |
| L04 | 0–1,6 s | Phụt theo hướng ra ngoài, quay và rơi; fade cuối, không nằm lại vĩnh viễn |
| L05 | 0–2,4 s | Lan từ tâm trong 0,18 s; giảm ánh ấm sớm, vết tối còn một lúc rồi fade hết |

Đề xuất demo: R=2 m, vòm rộng khoảng 4 m/cao 2 m; impact xa nhất khoảng 2,8 m từ tâm; nứt bán kính 3 m. Giả định 1 unit=1 m. Các số này CHƯA DUYỆT, không kế thừa từ LargeExplosion hoặc SmallExplosion. Chưa chốt mật độ hạt hoặc budget thiết bị.

## 6. Representation decision — sơ bộ, chưa chốt tài nguyên

Chưa khảo sát reuse riêng cho effect này. Bảng này chỉ mô tả phương án cần kiểm chứng, không phải asset plan xin quyền tạo mới.

| Layer | Phương tiện tạo silhouette / carrier tối thiểu | Motion/end | Điều cần kiểm tra trước asset plan |
|---|---|---|---|
| L01 | Puff texture/alpha trên particles bố trí trong không gian 3D | Size/Velocity/Rotation/Color theo lifetime; fade | Texture mềm có sẵn có đạt khối lớn không; kênh alpha, value, sorting, overdraw và góc camera |
| L02 | Mask phần tử cục bộ trên card định hướng; tránh mesh tam giác thay nét vẽ | Scale/velocity rồi fade; chưa yêu cầu dissolve | Shader alpha/additive đơn giản, giữ chóp/eo/mảng sáng sau blending |
| L03 | Mask mềm cục bộ trên billboard/ground-facing card tùy góc | Size và color/alpha theo lifetime | Tách lõi và bao màu bằng nguồn dữ liệu hoặc lớp tối thiểu phù hợp; không mặc định real-time Light/bloom |
| L04 | Reuse mesh đá nhỏ nếu quay thật; particle mesh renderer là phương án | Ballistic/gravity, rotation, fade | Mesh/material/pivot hiện có; không tự bật physics/collider |
| L05 | Nhánh mask trên ground-aligned card, hoặc giải pháp surface projection sẵn có nếu cần | Lan theo trục nhánh bằng mask/UV phù hợp rồi fade | Tìm giải pháp reveal hiện có; nếu thiếu phải trình khoảng thiếu, không tự viết shader; kiểm tra dốc và z-fighting |

Không mặc định flipbook: hiện chưa thấy nhu cầu biến đổi nội tại buộc dùng chuỗi frame. Không tự thêm dissolve. Khi đã có quyền chuẩn bị asset plan, rà toàn project, đọc module/streams/channel/keyword thật và liệt kê reuse/variant/modify/new cụ thể trước runtime.

## 7. Tiêu chí duyệt và nghiệm thu

- Khi thu nhỏ hình, đọc ra vòm và tâm thấp; không chỉ còn sao impact hoặc các quả khói lặp đều.
- Impact dày–mỏng khác contour, mũi giữ hướng ra ngoài; khói trước không lấp hoàn toàn tâm.
- Sáng nhất là vùng tâm nhỏ; mảng khói sẫm giữ tương phản; đá phân biệt với tia sáng.
- Vết nứt đọc là dấu vẽ trên nền; không tự biến thành terrain gameplay.
- Preview này xác nhận thiết kế hình; render/playback sau triển khai vẫn cần đối chiếu camera, tỷ lệ, value và motion.
- Cancel/disable/pool reuse phải dọn particle và vết nứt effect sở hữu; replay không tích lũy dấu vết. Hợp đồng kỹ thuật cụ thể chốt khi xem môi trường.
- Mobile budget chưa đo; chưa có test Unity hoặc xác nhận mỹ thuật runtime.

Đề nghị duyệt gộp: BP-01 v1 + S01/S02A/S02B/S03/S04/S05 v1 + motion/timing/kích thước đề xuất trong mục 5. Nếu chỉ duyệt hình, giữ timing/kích thước pending. Concept v1 không tự thành selected khi duyệt blueprint. Asset plan và quyền runtime vẫn pending. Chưa yêu cầu xuất prompt cuối trong lượt này.
