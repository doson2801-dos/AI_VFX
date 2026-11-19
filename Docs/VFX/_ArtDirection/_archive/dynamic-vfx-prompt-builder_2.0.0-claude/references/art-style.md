# Art Style — lựa chọn chung của VFX

Mục đích: không đánh mất định hướng mỹ thuật khi bảng thích ứng tập trung vào cơ chế. Art style được dùng cho spec lẫn VFX runtime.

## Khi nào hiện lựa chọn

- Effect mới, chưa rõ style: hiển thị nhóm Art Style trong bảng đầu tiên sau mô tả.
- Brief hoặc spec đã ghi rõ: hiển thị giá trị đã chốt, không bắt chọn lại; chỉ thay khi user sửa.
- User nói bám style của dự án hoặc ảnh cụ thể: kiểm tra nguồn truy cập được và giữ nó. Chỉ nhìn ảnh rồi tự suy ra style mà user chưa cho phép thì ghi đề xuất, không xác nhận.
- Chỉ tiếp tục spec approved để xuất prompt: không chặn yêu cầu bằng bảng mới; giữ dữ liệu style có thật, phần thiếu ghi giới hạn. Nếu cần thay đổi định hướng thì hỏi đúng phần đó.
- User cho AI tự chọn style: đề xuất style có nhãn rồi tiếp tục; không tạo vòng xác nhận mới.

## Lựa chọn dễ hiểu

| Lựa chọn | Định hướng hình ảnh gợi ý |
|---|---|
| Stylized 3D | Khối và silhouette rõ, chi tiết có chọn lọc, shading cách điệu |
| Anime / Cel-shaded | Mảng sáng tối tách rõ, cạnh sắc hoặc nét vẽ khi phù hợp reference |
| Realistic | Hình thái/vật liệu/ánh sáng hướng tự nhiên, vẫn giữ độ đọc gameplay |
| Hand-painted / Painterly | Nét/chất liệu vẽ tay, mảng màu và biên có chủ đích |
| Pixel art | Pixel/cluster đọc rõ, không tự áp blur/smooth trái reference |
| Theo dự án / tham chiếu | Bám đúng nguồn user chỉ định, không ép vào preset |
| Khác | User ghi định hướng cụ thể; không bị giới hạn bởi danh sách |
| Nhờ AI đề xuất | AI đề xuất theo brief, gắn nhãn proposed, không ghi là user đã chọn style đó |

Đây là preset hỗ trợ, không taxonomy đóng. Nếu user yêu cầu style lai, lưu mô tả lai như custom thay vì ép radio loại bỏ một phần. Không dùng nhiều checkbox style tùy tiện tạo tổ hợp mâu thuẫn; custom cho phép phối có ý đồ.

Style khác palette, 2D/3D, độ chi tiết, độ sáng và camera. Không suy style từ “màu xanh”, “Unity” hoặc “mobile”. Các thuộc tính bổ sung chỉ hỏi/chọn khi thực sự ảnh hưởng effect. Không buộc mọi style dùng viền đen, bloom hoặc distortion.

## Kiểm tra hành vi mong đợi

1. “Dây leo quấn humanoid” chưa có style → bảng có Art Style và các lựa chọn cơ chế.
2. “Sét anime cel-shaded, xanh trắng” → giữ Anime/Cel-shaded đã nêu, palette riêng, không hỏi lại style.
3. “Aura” chỉ mô tả cơ chế → vẫn có Art Style nếu chưa chốt vì runtime cũng cần mỹ thuật.
4. User chỉ gửi reference → style quan sát là proposed, không tự ghi confirmed nếu chưa cho phép bám nó.
5. “Style tùy bạn” → chọn đề xuất có nhãn, không ép chọn bảng nữa.
6. Chọn Realistic → không bị template stylized ghi đè; spec/prompt giữ Realistic.
7. Export approved spec → không tự sửa style hoặc bắt chọn lại; nêu phần style thiếu nếu spec không có.

Đây là kịch bản để đánh giá, không phải tuyên bố các lượt UI/model đã được chạy.

Stylized 3D là hướng mỹ thuật, không yêu cầu thể tích mesh cho mọi thành phần. Có thể dùng texture 2D trên particle/card/dải UV để giữ nét và tạo cảm giác khối; quyết định carrier riêng theo nhu cầu từng layer ở shape-design-2d.md.
