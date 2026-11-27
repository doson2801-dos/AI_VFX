# Mô phỏng nội bộ Slot Five: tỉ lệ chuỗi theo trọng số (dữ liệu dự án, không phải nguồn ngoài)

Nguồn: Producer tự chạy Monte Carlo 200.000 lưới cho mỗi bộ trọng số. Lưới 4x4, 14 đường (4 ngang, 4 dọc, 3 chéo xuống, 3 chéo lên). Chuỗi là ≥3 icon giống nhau liên tiếp trên một đường. Số liệu là "% lượt có ít nhất 1 chuỗi của icon đó". Kết quả khớp với số `chainTurnRateByIcon` mà QA đo trong game (Kiếm khoảng 0,635, mỗi hệ 0,5–1,2%).

Thứ tự trọng số: Lửa / Điện / Băng / Đất / Kiếm / Hồi máu / Khiên / May mắn.

| Bộ | Trọng số | Lửa | Điện | Băng | Đất | Kiếm | Hồi | Khiên | May mắn | Lượt có sát thương | Lượt có nguyên tố | Lượt trắng |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Hiện tại | 8/6/6/8/40/13/13/6 | 1,5% | 0,7% | 0,7% | 0,7% | 60,5% | 4,6% | 5,1% | 1,0% | 62,6% | 3,6% | 31,7% |
| Đều nhau | 12,5 mỗi icon | 4,4% | 4,5% | 4,2% | 3,8% | 4,3% | 3,5% | 3,3% | 5,7% | 20,0% | 16,6% | 68,9% |
| Nén A | 12/12/12/12/22/11/11/8 | 4,2% | 3,9% | 4,1% | 4,0% | 17,0% | 2,9% | 3,4% | 1,8% | 30,8% | 15,9% | 62,7% |
| Nén B | 14/14/14/14/18/10/10/6 | 6,4% | 4,7% | 5,1% | 4,1% | 9,9% | 1,9% | 2,5% | 1,0% | 28,5% | 19,6% | 67,0% |
| Nén C | 11/11/11/11/26/11/11/8 | 3,4% | 3,0% | 2,8% | 2,8% | 24,3% | 2,9% | 3,4% | 1,8% | 34,1% | 11,8% | 59,7% |

Sai số Monte Carlo khoảng ±0,1–0,2 điểm phần trăm (thấy rõ ở bộ "Đều nhau", các icon cùng trọng số lệch nhau vài phần mười).

## Nhận xét rút ra từ mô phỏng
- Xác suất một đường ra chuỗi tỉ lệ gần với p^3 (p là tỉ lệ trọng số của icon). Vì vậy khoảng cách trọng số bị khuếch đại rất mạnh: Kiếm 40% so với Lửa 8% (gấp 5 lần) cho tỉ lệ chuỗi chênh khoảng 40 lần.
- Với 8 loại icon trên lưới chỉ 16 ô, dù chia trọng số đều nhau thì khoảng 69% lượt không có chuỗi nào. Chỉ nén trọng số thì hệ ra nhiều hơn (16–20% lượt có nguyên tố), nhưng tổng số lượt có đòn đánh tụt từ 63% xuống 20–34%. Như vậy không đạt mục tiêu C10.4 (≥ 60% lượt có sát thương), và trận sẽ dài hơn nhiều.
- Kết luận: không có bộ trọng số đơn thuần nào vừa giữ được ≥ 60% lượt ra đòn vừa cho hệ xuất hiện thường xuyên. Muốn có cả hai thì phải đổi cấu trúc: ít loại icon hơn trong một lượt, icon wild hoặc icon "nguyên tố chung", gộp chuỗi theo nhóm, đảm bảo/pity, bộ reel theo nhân vật, v.v. Đây là các hướng cần tham chiếu với nghiên cứu thị trường.

Mục tiêu hiện hành của Slot Five (brief bản 4.2): trận trung vị 5–7 phút, ≥ 60% lượt có sát thương, người chơi thắng 50–60%, lật ngược 15–40%. Người dùng nhận xét: "tỉ lệ ra nguyên tố quá ít, chủ yếu ra kiếm".
