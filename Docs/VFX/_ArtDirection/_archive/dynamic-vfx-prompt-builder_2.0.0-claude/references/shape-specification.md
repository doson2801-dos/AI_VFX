# Shape Design Engine và cấu trúc hình ảnh mục tiêu

Đọc khi phân tích concept hoặc thiết kế/đổi shape. Bắt đầu từ nguồn thực đã mở xem: ID/version, path, góc camera, phần effect so với nền. Nếu nguồn không truy cập được, ghi rõ; dùng brief đã xác nhận hoặc yêu cầu ảnh còn thiếu khi cần phân tích hình, không bịa quan sát. Không lấy màu, số shape hay layer của một ví dụ làm mặc định toàn cục.

## Bảy phần của Shape Specification

1. **Mục tiêu thị giác:** identity, focal hierarchy, hướng lực, camera và đặc điểm phải giữ. Tách yêu cầu đã duyệt, quan sát ảnh, đề xuất và giả định motion.
2. **Cấu trúc hình ảnh mục tiêu:** hiển thị một hình tóm tắt trực quan đơn giản, bám đúng concept. Dùng khối màu/shape chồng lên nhau để cho thấy khối chính ở đâu, trước–sau, silhouette tổng, tỷ lệ tương đối, hướng lực và accent. Nhãn ngắn nếu cần; không nhồi bảng asset, tên shader, kích thước texture hoặc cả bộ variants vào hình. Không copy toàn effect sang PNG runtime. Ghi “Sơ đồ cấu trúc — không phải production asset”.
3. **Cấu trúc layer:** sau hình tổng thể, gán ID ổn định cho các nhóm có vai trò khác nhau; ghi primary/secondary/accent, overlap, value, tỷ lệ và phần được phép che. Không chia layer chỉ vì muốn tăng chi tiết.
4. **Shape kit đề xuất:** cho mỗi nhóm ghi phần tử cục bộ cần có, silhouette, pivot/trục, vai/phình/eo/taper, khối đặc/rỗng, lõi/mép, nét và nhịp biến thể. Số lượng là đề xuất trừ khi đã chốt; ưu tiên ít shape đủ khác biệt.
5. **Motion logic:** onset/peak/decay, hướng đi, biến đổi bên trong, cách kết thúc và quan hệ timing. Ảnh tĩnh chỉ xác nhận một pose; không chứng minh motion. Giữ timeline approved, không tự thêm charge/hold.
6. **Representation decision:** liên kết feature → asset → carrier → module/shader/animation theo technical-decisions.md. Không mặc định “Stylized 3D = volume mesh”.
7. **Approval criteria:** tiêu chí nhìn được cho cấu trúc/silhouette/value/direction và phạm vi cần duyệt; version, nguồn, phần chưa rõ. Đừng tuyên bố ảnh đẹp hoặc build pass là đạt.

Hình cấu trúc phải xuất hiện **trước** breakdown. Tạo sơ đồ gọn bằng SVG qua `show_widget` hoặc Artifact. Ghi rõ đây là sơ đồ dựng tay, không phải ảnh AI. Luôn hiển thị preview thực trong chat hoặc artifact xem được; mã SVG, đường dẫn trống, bảng chữ hoặc prompt gen chưa chạy không thay hình. Nếu không có công cụ hiển thị/tạo hình, nói rõ phần hình chưa hoàn tất; không giả đã giao Shape Specification đầy đủ.

## Bốn cấp hình ảnh

| Cấp | Câu hỏi được giải quyết | Không thay thế |
|---|---|---|
| Cấu trúc hình ảnh mục tiêu | Khối/lớp/hướng/tỷ lệ tạo effect ra sao? | Breakdown chi tiết hoặc texture runtime |
| Layer breakdown | Những nhóm thành phần/asset nào cần có? | Duyệt silhouette cụ thể |
| Shape preview | Đường nét và khối phần tử có đúng không? | Kênh texture, import và QA runtime |
| Production asset | File nào thực sự dùng trong engine? | Xác nhận render tổng hợp đạt concept |

## Duyệt theo phạm vi, không lặp vòng

| Gate | Bằng chứng đưa cho người dùng | Điều được phép sau duyệt |
|---|---|---|
| Cấu trúc | Hình tổng thể + version + tiêu chí | Breakdown chi tiết bám cấu trúc |
| Silhouette | Preview shape mới/đổi, ID/version, đơn sắc ở kích thước game và ghép thử | Chốt thiết kế shape để sản xuất trong asset plan được duyệt |
| Spec và xuất prompt | Spec/timeline/đơn vị và yêu cầu xuất prompt rõ | Prompt kỹ thuật cuối tiếng Anh; không tự cho phép runtime |
| Asset plan | Bảng reuse/variant/modify/new, nguồn, carrier và file ảnh hưởng | Production runtime đúng plan nếu đã được yêu cầu thực hiện |
| Flipbook keyframes | Key poses + duration/frame map/sequence đề xuất | Hoàn thiện chuỗi trong plan đã duyệt |

Gộp các gate khi đã có đủ hình và nội dung để duyệt trong cùng một bản. “Duyệt” chỉ áp dụng phần đã hiển thị và ngữ cảnh rõ; preselection, im lặng hoặc lời AI tự nhận không là approval. Không tái mở gate khi chỉ sửa màu và silhouette không đổi. Shape đã duyệt ở concept/preview cụ thể có thể đáp ứng gate silhouette; ghi ID/phạm vi, không bắt vẽ lại. Preview thiết kế được tạo trước asset-plan approval nhưng không được ghi vào Assets/import hoặc gọi là texture cuối. Nếu task chỉ prompt, truyền các gate còn thiếu cho agent thực hiện, không tự sinh production để lấp chỗ trống.

## Tiêu chí silhouette

Xem ở đơn sắc để kiểm tra hướng, độ liền thân, nhịp dày–mỏng, khoảng rỗng, đầu dẫn–đuôi; xem thêm value/color khi silhouette không thể biểu đạt phân lớp. Giữ language riêng cho body/highlight/smoke/debris theo concept. So tổng hợp để phát hiện các shape đúng riêng lẻ nhưng sai nhịp hoặc che lõi. Không áp luật cong C, ba ngọn, cyan hay bán cầu cho effect không có yêu cầu đó. Khi sửa, ghi delta và chỉ xin duyệt phần shape thay đổi chưa được cho phép.

## Shape kit: dữ liệu thiết kế cần truyền sang asset plan

Sau khi hình cấu trúc đã đúng, điền bảng với dữ liệu thật theo từng phần tử; không gửi schema trống làm kết quả:

| Shape ID/version | Layer/vai trò | Contour và nhịp khối | Value/edge/channel dự kiến | Pivot/trục/tỷ lệ | Biến thể và motion | Preview/approval | Asset ID/carrier |
|---|---|---|---|---|---|---|---|

Contour cần đủ mô tả đầu dẫn–thân–đuôi hoặc lõi–mép khi áp dụng; chỉ ra vùng đặc/rỗng và nhịp dày–mỏng có chủ đích. Tách shape body/highlight khi chúng có ngôn ngữ khác nhau; không bắt mọi effect dùng cả hai. Kênh ở thiết kế là dự kiến cho tới khi shader/module được kiểm tra. Tỷ lệ theo concept không tự thành đơn vị world đã duyệt.

Mỗi shape mới/đổi có preview ID/version thấy được ở đơn sắc và kích thước game, kèm ghép thử khi quan hệ overlap ảnh hưởng silhouette. Ghi giới hạn camera/góc nhìn; không hứa card giữ thể tích mọi hướng. Liên kết các shape được dùng chung thay vì nhân bản gần giống chỉ khác tên. Giữ phê duyệt còn hiệu lực khi chỉ đổi màu mà contour không đổi.
