# TractorDirt — đất bung lên ở răng cào tractor (idle_farm_harvesting)
Cập nhật 2026-11-20 · Anatomy: `Docs/VFX/_Anatomy/dirt-kickup.md` · Prefab: `idle_farm_harvesting/Assets/Anim_VFX/VFX/Prefabs/VFX_TractorDirt.prefab` · Builder: `Assets/Anim_VFX/Editor/TractorDirtBuilder.cs`

## Không gian (đề xuất, art lead chưa xác nhận trừ vị trí phát)
Ground; camera Main Camera của Demo_scene (ortho 15, nhìn xuống 55°, dọc 9:16); tractor scale 0.4 (dài ~4 m, rộng ~2 m); phát dọc răng cào phía trước (art lead 2026-11-20); đất hất lên-trước-hai bên; cường độ theo tốc độ, đứng yên 0 hạt; mobile (≤ ~45 hạt, shader Mobile/Particles/Alpha Blended, một material mỗi lớp).

## Bất biến (chép từ Anatomy)
- Nguồn dọc răng cào phía trước, không ở bánh sau. Đất hất lên + ra trước + hai bên.
- Đủ hai lớp: cục đất sẫm + bụi be mềm. Theo tốc độ, đứng yên = 0 hạt.
- World space, Scaling Mode Hierarchy, màu theo đất nền.

## Thành phần và texture
| Thành phần | Yêu cầu | Ảnh chốt | Dự phòng | Đã loại |
|---|---|---|---|---|
| Cục đất | tròn gồ ghề, đứng, alpha blend, sheet 2×2 không hướng (spam, xoay ngẫu nhiên), xám để tint nâu | **tự vẽ** `Textures/TractorDirt/T_Dirt_Clods_2x2.png` (PIL, 4 cục) | không có | Library `spark/shard` 001–003 và `impact/shard` 001–002 (mảnh nhọn / gai, không phải cục tròn); `ground/splat` 001–005 (vệt nứt / bắn toả, nằm đất, không phải cục); `ground/*` còn lại là nứt, cháy, chỉ báo. Lý do tạo mới: Library không có hình cục đất. |
| Bụi | bông khói cartoon không hướng, alpha thật, xám | `smoke/cartoon/smoke_cartoon_001.png` (512 → 256, copy `T_Dirt_Puff.png`) | `smoke_cartoon_002`; `smoke/soft/fx_t_smoke_02` | 004 (xoáy tối), 006/007 (quá mềm), 005 (nhỏ 128) |

Ghi chú: máy Linux thiếu numpy nên `library_props.py --contact` không chạy; xem bằng contact sheet có sẵn `_contact/spark_shard.png`, `ground_splat.png` và ghép tay `impact/shard` bằng PIL. Chưa chạy `check_texture_plan.py`.

## Lớp / timing
Clods_Rake: 34/s, sống 0,45–0,75 s, cỡ 1,0–1,6 m local, tốc độ 4,5–7,5, góc lên 62°, kế thừa vận tốc 0,9, gravity 2,2. Dust_Rake: 14/s, sống 0,9–1,4 s, cỡ 1,9–3,0 nở ×0,45→1,5, tốc độ 1,5–3, góc 40°, kế thừa 0,8, drag 1,5. Sorting layer WorldUI (uniqueID 4277590315), order 20 / 18. `TractorDirtEmitter` đo tốc độ thật, tắt dưới 8 %.

## Preview
`preview_play_4frames.png`: khung xe đứng yên (0 hạt), 3 khung sau khi bắt đầu chạy. `preview_play_full.png`: toàn khung.

## Còn mở
Dust phần nào bị thân xe che khi xe chạy đè; trộn lẫn với khói tàu trắng trong scene; răng cào nằm ~1 m trên đất trong model; Tractor.prefab của project chưa nối field (nối tay trên instance Demo_scene).

## Cập nhật texture đất (2026-11-20, art lead: giống đất thật hơn)
`T_Dirt_Clods_2x2.png` (256×256, sheet 2×2, cùng đường dẫn / GUID / import) vẽ lại bằng `make_dirt_clods.py` (PIL thuần, `python3 -I make_dirt_clods.py <ra.png>`): 4 ô = cục to xốp / cục dẹt / cụm vụn / mảnh dài; mép vỡ theo noise, vụn li ti quanh, vân + sỏi, sáng trên tối dưới, xám-nâu nhẹ (đã sáng hơn để Start Color nâu sẫm không thành đen). Bản cũ: `_old/T_Dirt_Clods_2x2.old.png`. So sánh: `texture_before_after.png`; preview Play: `preview_newtex_1.png`, `preview_newtex_2.png`. Không động prefab / scene (art lead đã chỉnh vị trí phát sau bản của tôi: Clods y 1.30 z 3.49, Dust y 0.71).
