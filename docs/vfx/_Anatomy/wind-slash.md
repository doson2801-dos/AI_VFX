# WindSlash — lưỡi gió chém bay ngang
Độ chắc: giả định từ brief + Plan + preview (art lead chưa xem) · Cập nhật: 2026-11-25 · Nguồn: `Docs/VFX/WindSlash/Plan.md`, `_Anatomy/slash360.md`

## Nó là gì
Một **lưỡi liềm gió** (lồi về phía trước, hai mũi kéo ra sau) bay thẳng ~8 m trong ~0.6 s, **để lại sọc gió dài**, bụi và lá bị cuốn rơi dọc đường. Một phát, ngang tầm ngực (~1 m).

## Cấu trúc
| Phần | Vai trò | Bắt buộc |
|---|---|---|
| Lưỡi liềm (mesh + UV, Coloso) | thân lưỡi; 2 nửa lật gương ghép lại | **xương sống** |
| Viền sáng | mép nóng trên lưỡi | nên có |
| Sọc gió (Trails) | vạch mảnh dài sau lưỡi | có |
| Bụi + lá | rơi lại dọc đường bay khi lưỡi đi qua | có |

## Bất biến
- Một lưỡi liềm **đọc được hình C** (đầu dày ở giữa, hai mũi mỏng kéo ra sau), không phải đầu sao chổi tròn.
- Sọc gió dài theo hướng bay phía sau lưỡi.
- Bụi / lá nổ **dọc đường bay theo thời điểm lưỡi đi qua**, không xuất hiện sẵn khắp đường.
- Slash = mesh + UV, shader Coloso, `_MaskTex` = `T_VFX_Gradient_01`. Không Billboard cho lưỡi.

## Được đổi
Màu, độ rộng cung, số sọc, bụi / lá (cát, tuyết, hoa), độ nghiêng lăn, texture slash (xám).

## Lỗi đã gặp
- Dùng một nửa lưỡi (texture bất đối xứng) thì ra **đầu sao chổi**: phải ghép hai nửa lật gương (tiling x âm / dương).
- Edge shape + arc Loop **không quét theo thời gian** ở bản Unity này: dùng trạm có `startDelay` theo vị trí.
- `_MaskTex` lấy `mask_gradient_008` là sai luật, phải là `T_VFX_Gradient_01`.
- Lá: Library không có ảnh lá thật, dùng `spark_shard_002` (xấp xỉ).

## Biến thể đã làm
Chưa có (chỉ bản gió v1).
