# Thorn Vine Binding — dữ liệu ví dụ đã duyệt

Nguồn: tin nhắn người dùng đọc được ở chat “Miêu tả hiệu ứng cho AI”, ID `6acf7115-d1b8-83ec-aa6d-77cee97e09d2`. Không phải mặc định cho effect khác.

| Quyết định | Giá trị | Căn cứ |
|---|---|---|
| Engine | Unity | Giai đoạn 2 |
| Nguồn/hướng | Mọc từ đất, quấn từ chân lên, nhiều vòng siết chặt | Giai đoạn 2 |
| Số nhánh | 2–3 | Giai đoạn 2 |
| Kiểu mọc/phạm vi | continuous / waist (đến eo) | Giai đoạn 2 |
| Gameplay | Khóa cứng khi trói xong; cách khóa = lock | Giai đoạn 2 và duyệt thiết kế |
| Target | humanoid | Duyệt thiết kế |
| Kết thúc | Tháo ra, rút xuống đất; simultaneous | Giai đoạn 2 |
| Màu | Thân xanh lá, gai đỏ | Giai đoạn 2 |
| Bán kính dây | 0.055 m | Phê duyệt v1.0/prototype |
| Khoảng cách vòng | 0.18 m | Phê duyệt v1.0/prototype |
| Thời gian mọc | 1.5 s | Phê duyệt v1.0/prototype |
| Chiều dài gai | 0.065 m | Phê duyệt v1.0/prototype |

Người dùng đã viết “Tôi phê duyệt thiết kế Thorn Vine Binding v1.0”, yêu cầu prompt Unity với kiến trúc, thuật toán, animation, gameplay integration, hiệu năng, test và nghiệm thu. Không xin duyệt lại các dữ liệu trên.

## Giới hạn dữ liệu

Câu trả lời assistant cũ chỉ trả về content-reference, chưa đọc được toàn bộ thiết kế v1.0. Không tuyên bố đã khôi phục đầy đủ. Dùng bảng trên; để giữ cả chi tiết ngoài bảng, xin spec đầy đủ hoặc phần thiếu cụ thể. Có thể chuẩn bị prompt từ dữ liệu đọc được với giới hạn được ghi rõ.

Chưa đọc được: Unity version/pipeline/platform, hold/retract duration, wrap radius/clearance quanh cơ thể, chiều xoắn/số vòng chính xác, mật độ gai, vật liệu chi tiết, ground alignment, gameplay lock API, skeleton binding, performance/concurrency budget. Đây là giả định/đề xuất/phụ thuộc, không phải quyết định đã duyệt.

0.055 m là **bán kính thân dây**, không phải bán kính đường quấn; 0.18 m là **khoảng cách vòng**, không phải sample spacing. Giữ khoảng 2–3 nhánh, không tự ghi 3 đã duyệt.

## Lựa chọn kỹ thuật minh họa, chưa được duyệt

Có thể đề xuất procedural tube theo đường quấn với gai mesh/instanced, growth liên tục và attach theo root/bounds/bone. Giải thích coordinates và target movement. Đây là lựa chọn triển khai, không phải kiến trúc được xác nhận trong chat cũ.

Growth complete ở 1.5 s mới yêu cầu adapter áp lock. Cancel trước completion không tạo lock; end/cancel sau completion release lock hiệu ứng sở hữu. Hold/release lấy từ gameplay/config, không bịa thời lượng. Tháo/rút cả nhánh simultaneous và về đất, không thay bằng dissolve.

## Lệnh tiếp tục mẫu

```text
$dynamic-vfx-prompt-builder
Tiếp tục Thorn Vine Binding v1.0 theo references/thorn-vine-binding.md.
Tôi đã duyệt các quyết định đọc được trong ví dụ; xuất prompt kỹ thuật Unity,
giữ nguyên số liệu. Nêu phần spec cũ chưa đọc được và giả định kỹ thuật.
```

Khi người dùng đưa toàn bộ spec, ưu tiên spec đó và đối chiếu mâu thuẫn, không giới hạn họ vào ví dụ.
