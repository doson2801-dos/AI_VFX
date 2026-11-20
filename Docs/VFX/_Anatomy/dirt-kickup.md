# Đất bung lên khi xe chạy (dirt kick-up / dust trail của bánh xe)
Độ chắc: **suy từ nguồn web + giả định** (art lead chưa đưa ref) · Cập nhật: 2026-11-20 · Nguồn: web (xem cuối), bản dựng `idle_farm_harvesting/Assets/Anim_VFX/VFX/Prefabs/VFX_TractorDirt.prefab`

## Nó là gì
**Phiên bản chốt 2026-11-20 (art lead sửa): đất bung lên ở RĂNG CÀO (rake) phía trước tractor, không phải bánh sau.** Răng cào xúc đất: cục đất nhỏ bị hất **lên và ra trước / hai bên** theo hướng xe chạy, kèm bụi đất be tản ra rộng theo bề ngang răng cào rồi tan; xe chạy đi để lại bụi phía sau. Xe đứng yên: không có gì. (Biến thể bánh sau xe tải / xe địa hình là cách làm khác, giữ ở "Được đổi".)

## Cấu trúc
| Phần | Vai trò | Hình dáng | Bắt buộc? |
|---|---|---|---|
| Cục đất (clod) | xương sống: "đất bung" | cục tròn gồ ghề, nâu sẫm, 4 biến thể, bắn lên-trước-hai bên từ dọc răng cào (hộp 4,4 m rộng), kế thừa 90 % vận tốc xe, rơi theo trọng lực, 0,45–0,75 s | **có** |
| Bụi đất (dust puff) | khối lượng | bông khói cartoon tô be, đục vừa, nở, kế thừa 80 % vận tốc rồi bị cản (drag), 0,9–1,4 s | **có** |
| Vệt / hạt ở lại | hệ quả | simulation World nên bụi ở lại sau xe | tự có |
| Decal luống đất sau răng cào / hạt cỏ | phụ | chưa làm | không |

## Chuyển động / nhịp
Liên tục theo tốc độ: cường độ = tốc độ thực / tối đa (mượt), dưới ~8 % thì tắt hẳn. Một điểm phát dọc răng cào (Model-space x ±2,2, z ≈ 3,0 trước đầu răng; răng cách đất ~1 m trong model này nên phát ở y ≈ 0,3 sát mặt đất). Clod ~62° lên về phía trước, bụi ~40°; cả xe ~35–45 hạt.

## Bất biến
- Nguồn ở **dọc răng cào phía trước** (rộng bằng bề ngang răng cào), **không** ở bánh sau.
- Đất bị hất **lên + ra trước + hai bên** (theo hướng xe chạy), không phun ngược ra sau.
- Có **cả hai lớp**: cục đất rời rạc (nhỏ, sẫm) **và** bụi mềm (to, nhạt). Chỉ bụi = "khói", chỉ cục = "đạn đất".
- Cường độ **theo tốc độ**: đứng yên = 0 hạt; tăng tốc thì tăng dần.
- World simulation space, Scaling Mode Hierarchy (theo scale xe).
- Màu theo đất nền (nâu-be ấm), không xám / đen.

## Được đổi
Màu theo loại đất (nâu ruộng, cát vàng, bùn đen ướt: bùn thì cục nhiều/nặng hơn, bụi ít), tốc độ / số hạt, cỡ, góc hất, số bánh, thêm decal vệt bánh, thêm hạt cỏ bắn khi chạy trên cỏ.

## Lỗi biến thể / lỗi đã gặp
- **Bụi alpha thấp trên nền cỏ xanh ra màu olive bẩn**: tăng alpha (≥0,75) và đẩy màu sang be sáng (0,88 0,72 0,5) thay vì nâu sẫm.
- **Cỡ hạt theo mét xe gốc, nhưng xe thật trong scene bị scale** (demo 0,4): cục đất 0,35 m (local) chỉ ~3 px ở camera ortho 15; cần ≥0,7 m local mới đọc được ở Game view dọc.
- **Bụi phát ở đầu xe bị xe chạy đè lên** (nằm dưới thân, tractor che): phải kế thừa vận tốc (`inheritVelocity`) + drag, không dùng limit tuyệt đối (limit 0,3 làm hạt đứng yên lại ngay).
- Răng cào của model cách đất ~1 m (toy): nếu phát ở đầu răng thì đất lơ lửng; phát sát mặt đất ngay trước răng.
- Bụi dùng chung texture khói với effect khác trong cùng scene (khói tàu trắng): phải tô màu nâu rõ để không lẫn.
- Prefab `Tractor.prefab` trong idle_farm **chưa nối field** (`model/body/rake/wheelPivots` null → `TractorController` tự tắt vì NRE) và renderer trỏ material fbx không texture (xe trắng): phải nối tay trên instance (đã làm trong Demo_scene, không sửa prefab gốc).

## Biến thể đã làm
- `VFX_TractorDirt` (idle_farm_harvesting `Assets/Anim_VFX/VFX/Prefabs/`), đất ruộng nâu, phát ở răng cào (v1 bánh sau 2026-11-20 đã bỏ theo yêu cầu art lead). Texture: cục đất `T_Dirt_Clods_2x2.png` (tự vẽ, lý do: Library không có cục đất: đã xem contact `spark/shard`, `impact/shard`, `ground/splat` 2026-11-20, toàn mảnh nhọn / sao nứt, không có cục tròn), bụi `T_Dirt_Puff.png` = `Assets/Library/smoke/cartoon/smoke_cartoon_001.png` (omni, alpha thật, xám, 512 → 256; dự phòng `smoke_cartoon_002`, `smoke/soft/fx_t_smoke_02`; loại 004 vì xoáy tối, 006/007 vì mềm quá mất nét cartoon).

## Nguồn (web, 2026-11-20)
- Spintires MudRunner (gamedeveloper.com/programming/mud-and-water-of-spintires-mudrunner): bánh quay hất hạt bùn; spray billboard + hạt phụ.
- road-machiners issue #425 (github.com/btseytlin/road-machiners/issues/425): tire spray = clod bay ra sau-lên trong nón + bụi tô theo màu nền; số hạt và tốc độ theo tốc độ xe.
- City Car Driving dev blog (Steam): đất khô ít trượt = chủ yếu bụi nhẹ; ổ bùn = nhiều cục dày.
- Visual Mud Tracks FS25 (kingmods): hệ hạt riêng cho đất khô / bùn ướt; cường độ theo quay bánh, trượt, cỡ lốp.
- Fab "Ground Dust VFX" / Realtime VFX Store "Vehicle VFX": prefab gắn vào vật thể, bụi sinh theo di chuyển.
