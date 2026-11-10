# AuraGauntlet — aura ôm vật thể (găng)
Độ chắc: suy từ `Docs/VFX/AuraGauntlet/Plan_Variants.md` (bản gốc không có Plan) · **cần art lead xác nhận bản gốc** · Cập nhật: 2026-11-10 · Nguồn: Plan_Variants.md, prefab `VFX_AuraGauntlet.prefab`

## Nó là gì
Aura **lặp (loop)** quanh một vật thể cao 1.5 m đứng ở gốc toạ độ, ~2 m. Bản gốc: **sét tím-hồng bò quanh vật** (mesh bolt `Guardian_Lighting`) + khói đỏ + haze + chấm sáng; vòng lặp 2 s.

## Cấu trúc (bản gốc)
| Phần | Vai trò | Bắt buộc |
|---|---|---|
| mesh bolt (`electric`) | **tia sét chạy quanh vật**, nét đặc trưng | **xương sống** (suy) |
| smoke / haze | khí quyển bao quanh | có |
| dot_Light | chấm sáng | phụ |

## Bất biến (suy, cần xác nhận)
- Là **aura ôm vật thể** (không phải vụ nổ, không rải rộng): hiệu ứng nằm sát và bao quanh vật, loop mượt.
- **Có chuyển động đặc trưng quanh vật** (sét bò / hạt xoáy quanh trục).
- Không có điểm kích nổ hay một lần: lặp liên tục.

## Được đổi
Nguyên tố, chất liệu hạt, nhịp lặp, layout quanh vật. **Nhưng phải giữ "nét đặc trưng chạy quanh vật"** (bản gốc là tia sét): biến thể nên có phần tử tương đương theo chất liệu (lửa: lưỡi lửa liếm quanh; độc: giọt / khí chảy quanh).

## Lỗi biến thể đã gặp
- **Fire**: bỏ mesh sét và dùng `smoke_sheet_002` (cụm mây cartoon trắng) làm lửa → ra bông khói / vụ nổ, **không còn là aura quanh vật**.
- **Poison**: khí + bong bóng ổn, nhưng không có phần tử "bò quanh vật" mạnh; vũng loang (`water_splash_002`) gần như không thấy.
- Tránh: lửa phải là **lưỡi lửa dựng cao liếm quanh vật** (flipbook lửa thật), không dùng mây; luôn có 1 phần tử xoáy quanh trục vật.

## Biến thể đã làm
Gốc (sét tím), Fire, Poison.
