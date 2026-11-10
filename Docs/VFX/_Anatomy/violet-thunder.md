# VioletThunder — sét tím từ trời, tích rồi nổ một phát
Độ chắc: suy từ `Docs/VFX/VioletThunder/Plan.md` + preview · Cập nhật: 2026-11-10 · Nguồn: Plan.md, Plan_Variants.md

## Nó là gì
Sét tím-hồng stylized toon **đánh xuống một điểm đất**: **tích điện ~0.4 s** (quầng tụ ở điểm đánh) rồi **một phát giáng** (~0.4–0.72 s): tia toon dày vẽ tay vỡ vụn theo flipbook, chớp ở điểm chạm, **sóng điện lan trên đất** ~3 m, dòng điện còn lại. Tia cao ~6 m.

## Cấu trúc
| Phần | Vai trò | Bắt buộc |
|---|---|---|
| Charge | quầng tích điện | có |
| BoltGlow + BoltCore | tia đứng (Stretched, flipbook 2×4 giáng → vỡ vụn) | **xương sống** |
| Flash | chớp chạm đất | có |
| Wave / ring | sóng lan nằm đất | có |
| Cracks, arcs, embers (v2) | điện còn lại, nứt, tàn | lớp phụ |

## Bất biến
- **Nhịp: tích → một phát giáng → vỡ vụn → dư điện**, không phải chuỗi nhiều phát.
- **Tia toon dày có đường zig-zag đọc được** (viền màu + lõi sáng), vỡ vụn theo flipbook.
- Một chớp + sóng lan trên đất ở điểm chạm.

## Được đổi
Màu / nguyên tố (xanh lam, đỏ thẫm), hình dư điện (arc / vết nứt / tàn), hạt phụ, độ dài tích.

## Lỗi biến thể đã gặp
- **Crimson**: có một tia hình "móc" lạ ở frame 3–4. **Azure / Crimson** nhìn chung tốt (dùng đúng `ring_ragged`, `ring_thin`, `flare_005`) nhưng quầng `glow_soft_round_008` chỉ 128 px (nửa khung), vỡ nhẹ khi to; ưu tiên `_007`.
- Giữ chung sheet bolt: khác nhau chủ yếu ở lớp phụ; ok vì cùng hiệu ứng.

## Biến thể đã làm
Gốc (tím-hồng), Azure, Crimson.
