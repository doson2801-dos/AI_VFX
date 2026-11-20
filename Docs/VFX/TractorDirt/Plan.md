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

## Texture toon v3 (2026-11-20, art lead: v2 nhiễu hạt "không giống đất")
`make_dirt_clods.py` viết lại: toon / hand-painted, 4 ô (cục to, cục dẹt, cụm cục nhỏ, mảnh dài), silhouette bo gồ ghề, 3 tông phẳng-mềm (sáng trên-trái, thân, tối dưới-phải), viền đậm, 2–3 vết lõm sẫm, vài mẩu vụn tròn. Vẽ **kem-ấm gần trắng** vì Start Color hiện tại của Clods_Rake là nâu sẫm (0,34..0,52 / 0,20..0,34 / 0,11..0,19) nhân vào texture: sau nhân thân ≈ #6e4526, sáng ≈ #855730 (không đen, không xám). Muốn đúng #8a5a34 / #b8844f thì phải nâng Start Color (chưa động). Đã ghi đè PNG ở project (cùng đường dẫn / GUID / 256×256); bản trước ở `_old/T_Dirt_Clods_2x2.noise_v2.png`, `_old/make_dirt_clods_v2_noise.py`. Ảnh: `texture_v3_toon.png`. **Chưa kiểm in-game** (xem dưới).

## Đề xuất thông số "nhiều, dày, nhanh, bắn cao" (CHƯA áp lên prefab / scene, bị chặn quyền)
Giá trị hiện tại đọc từ scene instance (art lead đã sửa): Clods_Rake pos (0,1.30,3.49), shape rot (180,0,0), gravity 0, rate 34, speed 4,5–7,5, life 0,45–0,75, size 1,0–1,6, randDir 0,45, inherit 0,9, max 60. Dust_Rake pos (0,0,71,3,00), rot (-40,0,0), rate 14, speed 1,5–3, size 1,9–3,0, randDir 0,65, inherit 0,8, max 60.
Đề xuất (đã ghi vào `TractorDirtBuilder.cs`, chưa áp lên instance): Clods rate 110, speed 11–17, life 0,8–1,1, size 1,3–2,0, gravity 1,3, shape rot (-80,0,0), randDir 0,12, inherit 0,3, max 200. Dust rate 24, speed 2,5–4, size 2,2–3,4, rot (-70,0,0), randDir 0,3, inherit 0,35. Không dùng burst vì `TractorDirtEmitter` chỉ nhân rateOverTime (burst sẽ phát cả khi xe đứng yên). Builder vẫn giữ vị trí cũ, không phải vị trí art lead.

## Đợt áp thông số + texture v4 (2026-11-20, art lead "ok làm đi")
Đã áp lên **scene instance** Demo_scene (RecordPrefabInstancePropertyModifications + SaveScene, mtime 18:16:06; prefab asset không đổi; vị trí phát giữ nguyên). Trước → sau:
- Clods_Rake: rate 34→110; speed 4,5–7,5→11–17; life 0,45–0,75→0,8–1,1; size 1,0–1,6→1,3–2,0; gravity 0→1,3; shape rot (180,0,0)→(-80,0,0); randDir 0,45→0,12; inherit 0,9→0,3; max 60→200; **Start Color** (0,34,0,20,0,11)–(0,52,0,34,0,19) → (0,46,0,29,0,16)–(0,58,0,38,0,22) (~#8a5a34 giữa).
- Dust_Rake: rate 14→24; speed 1,5–3→2,5–4; size 1,9–3,0→2,2–3,4; rot (-40,0,0)→(-70,0,0); randDir 0,65→0,3; inherit 0,8→0,35; max 60→100.
Kết quả Play: chạy ~117–131 hạt, xe dừng 0 hạt; ảnh `preview_toon_crop_1.png`, `preview_toon_crop_2.png`. Texture v4 (`texture_v4_earth.png`, script `make_dirt_clods.py`): xám-ấm trung tính, nâu nhờ Start Color; viền tối đậm cùng tông, sỏi / đốm sẫm, bỏ nét cong; thu 64 px vẫn đọc là cục đất. Bản v3 ở `_old/T_Dirt_Clods_2x2.toon_v3.png`. `TractorDirtBuilder.cs` đã đồng bộ số (vị trí phát trong builder vẫn là số cũ).

## Texture v5 có khối (2026-11-20, art lead: v4 "mỏng như miếng dán")
`make_dirt_clods.py` viết lại: baked height (mái vòm riêng từng cục + mảng lồi/lõm + sỏi nhô) → lambert từ trên-trái → AO ở rìa → 5 bậc sáng (LUT toon, xám ~#3a..#e4) → thành dày tối phía dưới + rim sáng mảnh phía trên + vài vết nứt nhỏ (chỉ cụm / mảnh dài; bỏ ở cục to và cục dẹt vì tạo "mặt người"). Ô cụm = 4 cục tròn-dẹt chạm nhau. Chỉ ghi đè PNG (cùng đường dẫn / GUID / 256×256) + ImportAsset; **Start Color không đổi** (vẫn (0,46,0,29,0,16)–(0,58,0,38,0,22)). Bản v4 ở `_old/T_Dirt_Clods_2x2.flat_v4.png`. Ảnh: `texture_v4_vs_v5.png`, `preview_v5_crop_1.png`, `preview_v5_crop_2.png`. Không động prefab / scene (scene đang dirty do art lead sửa tay, tôi không lưu); bụi `T_Dirt_Puff` không đổi.
