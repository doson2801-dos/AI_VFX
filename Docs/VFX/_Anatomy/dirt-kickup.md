# Đất bung lên khi xe chạy (dirt kick-up / dust trail của bánh xe)
Độ chắc: **suy từ nguồn web + giả định** (art lead chưa đưa ref) · Cập nhật: 2026-11-20 · Nguồn: web (xem cuối), bản dựng `idle_farm_harvesting/Assets/Anim_VFX/VFX/Prefabs/VFX_TractorDirt.prefab`

## Nó là gì
Khi bánh sau của xe quay trên đất, **cục đất nhỏ bị hất lên-ra sau** theo hướng đáy bánh chạy ngược, kèm **bụi đất nâu nhạt tản ra phía sau, nở to rồi tan**; để lại một vệt bụi theo đường xe đi. Xe đứng yên: không có gì.

## Cấu trúc
| Phần | Vai trò | Hình dáng | Bắt buộc? |
|---|---|---|---|
| Cục đất (clod) | xương sống: "đất bung" | cục tròn gồ ghề, nâu sẫm, 4 biến thể, bắn vòng cung lên-sau, xoay, rơi theo trọng lực, 0,5–0,75 s | **có** |
| Bụi đất (dust puff) | khối lượng + vệt | bông khói cartoon tô nâu-be, đục vừa, nở 0,45→1,5 lần, trôi chậm, 0,9–1,4 s | **có** |
| Vệt theo đường đi | hệ quả | hạt simulation World nên tự để lại vệt sau xe | tự có |
| Vết bánh xe trên đất (decal) / hạt mịn / tia | phụ | chưa làm | không |

## Chuyển động / nhịp
Liên tục theo tốc độ: cường độ = tốc độ thực / tốc độ tối đa (mượt), dưới ~8 % thì tắt hẳn. Phát từ **hai bánh sau** (mỗi bánh một bộ), hướng ra sau và lên (clod ~50° lên, bụi ~20°). Mỗi bánh ~10 clod + ~10 bụi cùng lúc, cả xe ~45 hạt.

## Bất biến
- Nguồn ở **chỗ bánh sau chạm đất**, hạt đi **ra sau** (ngược hướng xe) và lên; không bao giờ phun phía trước.
- Có **cả hai lớp**: cục đất rời rạc (hình rõ, nhỏ, sẫm) **và** bụi mềm (to, nhạt). Chỉ bụi = thành "khói xe", chỉ cục = "đạn đất".
- Cường độ **theo tốc độ**: đứng yên = 0 hạt; tăng tốc thì tăng dần.
- Simulation space World (vệt ở lại trên đường), Scaling Mode Hierarchy (theo scale xe).
- Màu theo đất nền (nâu-be ấm), không xám/đen như khói động cơ.

## Được đổi
Màu theo loại đất (nâu ruộng, cát vàng, bùn đen ướt: bùn thì cục nhiều/nặng hơn, bụi ít), tốc độ / số hạt, cỡ, góc hất, số bánh, thêm decal vệt bánh, thêm hạt cỏ bắn khi chạy trên cỏ.

## Lỗi biến thể / lỗi đã gặp
- **Bụi alpha thấp trên nền cỏ xanh ra màu olive bẩn**: tăng alpha (≥0,75) và đẩy màu sang be sáng (0,88 0,72 0,5) thay vì nâu sẫm.
- **Cỡ hạt theo mét xe gốc, nhưng xe thật trong scene bị scale** (demo 0,4): cục đất 0,35 m (local) chỉ ~3 px ở camera ortho 15; cần ≥0,7 m local mới đọc được ở Game view dọc.
- Bụi dùng chung texture khói với effect khác trong cùng scene (khói tàu trắng): phải tô màu nâu rõ để không lẫn.
- Prefab `Tractor.prefab` trong idle_farm **chưa nối field** (`model/body/rake/wheelPivots` null → `TractorController` tự tắt vì NRE) và renderer trỏ material fbx không texture (xe trắng): phải nối tay trên instance (đã làm trong Demo_scene, không sửa prefab gốc).

## Biến thể đã làm
- `VFX_TractorDirt` (idle_farm_harvesting `Assets/Anim_VFX/VFX/Prefabs/`), đất ruộng nâu, tractor 2 bánh sau. Texture: cục đất `T_Dirt_Clods_2x2.png` (tự vẽ, lý do: Library không có cục đất), bụi `T_Dirt_Puff.png` = `Assets/Library/smoke/cartoon/smoke_cartoon_001.png` (omni, alpha thật, xám, 512 → 256; dự phòng `smoke_cartoon_002`, `smoke/soft/fx_t_smoke_02`; loại 004 vì xoáy tối, 006/007 vì mềm quá mất nét cartoon).

## Nguồn (web, 2026-11-20)
- Spintires MudRunner (gamedeveloper.com/programming/mud-and-water-of-spintires-mudrunner): bánh quay hất hạt bùn; spray billboard + hạt phụ.
- road-machiners issue #425 (github.com/btseytlin/road-machiners/issues/425): tire spray = clod bay ra sau-lên trong nón + bụi tô theo màu nền; số hạt và tốc độ theo tốc độ xe.
- City Car Driving dev blog (Steam): đất khô ít trượt = chủ yếu bụi nhẹ; ổ bùn = nhiều cục dày.
- Visual Mud Tracks FS25 (kingmods): hệ hạt riêng cho đất khô / bùn ướt; cường độ theo quay bánh, trượt, cỡ lốp.
- Fab "Ground Dust VFX" / Realtime VFX Store "Vehicle VFX": prefab gắn vào vật thể, bụi sinh theo di chuyển.
