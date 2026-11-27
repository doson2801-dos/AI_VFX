# VFX_SF_Cast — kế hoạch v1 (art lead duyệt 2026-11-27)

VFX cast của Slot Five (brief `Docs/SlotFive/brief.md` mục 4.12), bộ demo hệ Sét: đạn + va chạm cho Sét, Kiếm, Hồi máu, Khiên, cộng chặn khiên và lóe chuỗi. 10 prefab, builder `Assets/VFX/SF_Cast/Editor/SFCastBuild.cs` (menu **VFX → SF_Cast → Build All**).

**Không gian:** dir (đạn bay thẳng trên mặt phẳng màn hình XY) · camera trực giao nhìn thẳng (camera game; preview dùng camera phối cảnh nhìn thẳng −Z) · neo: đạn bám vị trí cast do code đẩy (hướng bay = +X cục bộ, code xoay root quanh Z), va chạm neo ở tâm `*Fighter` · quy mô 48 px = 2 m (nhân vật 88 px ≈ 3,7 m); prefab dựng bằng mét, scene đặt nhóm cha scale 24 px/m · nền xanh đen `#141826`.
*Đề xuất (đã duyệt):* Particle System thật đặt trước canvas Screen Space Camera, `sortingOrder` > canvas; không dùng flipbook trên UI Image.

**Thời lượng** (tốc độ thường; chế độ Nhanh: `simulationSpeed = 1 / timeScale`): đạn 350 ms (loop, code huỷ lúc trúng), va chạm và chặn ≤ 250 ms, lóe chuỗi ≤ 500 ms. Art Style: stylized, sáng, additive trên nền tối.

**Tham khảo (2b):**
- Unity Discussions, "Particle System in front of UI" (https://discussions.unity.com/t/particle-system-in-front-of-ui/751459) → canvas Screen Space Camera + `sortingOrder` particle cao hơn → lớp VFX của Slot Five.
- Electric Orb 2D (https://manugamingcreations.itch.io/electric-orb) → đạn điện = lõi sáng + tia chớp quanh, va chạm là chớp ngắn → Sét.
- Force Shield 2D (https://999overlap.itch.io/force-shield-2d-effects-pack) → trạng thái "hit" của khiên = mặt khiên lóe + nứt → `VFX_SF_Block`.

**Anatomy:** gần nhất `hero-projectile.md` (đạn bay thẳng có đuôi + hit nhẹ). Bất biến chép vào: đạn bay thẳng, nhanh; hit chỉ nhẹ ở điểm chạm, không thành vụ nổ lớn; đầu dẫn đúng chiều bay (lưỡi Kiếm xoay nên không có đầu cố định). Trong UI 2D, đuôi là tàn hạt World space rơi lại thay vì ribbon.

## Thành phần

| ID | Prefab | Layer | Vai trò & timing | Carrier | Shader | Texture | Kết thúc |
|---|---|---|---|---|---|---|---|
| V1 | VFX_SF_ProjVolt | Core (root) | lõi sáng vàng 1,6 m, nhấp nháy | billboard | stock Additive | glow_soft_round_005 | code huỷ lúc trúng |
| V2 | VFX_SF_ProjVolt | Arcs | 2–3 tia điện chớp quanh lõi, khung ngẫu nhiên, không xoay | billboard, sheet 4×4 | stock Additive | lightning_arc_sheet_006 | 70 ms mỗi hạt |
| V3 | VFX_SF_ProjVolt | Sparks | tàn sao rơi lại (World) | billboard | stock Additive | spark_star_002 | co về 0 trong 150 ms |
| V4 | VFX_SF_HitVolt | Flash (root) | chớp sao 8 gai 0 → 4 m | billboard | stock Additive | impact_flash_spiky_014 | mờ hết 180 ms |
| V5 | VFX_SF_HitVolt | Arcs | 3 tia điện bung quanh điểm trúng | billboard, sheet 4×4 | stock Additive | lightning_arc_sheet_006 | 120 ms |
| V6 | VFX_SF_HitVolt | Sparks | 8 tàn sao toả ra | billboard | stock Additive | spark_star_002 | 200 ms |
| B1 | VFX_SF_ProjBlade | Wake (root) | tàn sáng thép rơi lại (World), đuôi của lưỡi | billboard | stock Additive | spark_star_002 | co về 0 trong 150 ms |
| B2 | VFX_SF_ProjBlade | Blade | lưỡi cung nửa vòng xoay 1080°/s trên mặt phẳng màn hình, `_MainColor` ≈ 1, màu từ Start Color | mesh `SM_VFX_Slash_Thin_180` (xoay X −90°) | Coloso Additive (`VFXLib/ColosoShaderAdditive_Optimized`), mask `T_VFX_Gradient_01` | Slash_Main_tex_Uvmesh_019 | code huỷ |
| B3 | VFX_SF_HitBlade | Flash (root) | chớp trắng nhỏ 0,6 → 2 m | billboard | stock Additive | glow_soft_round_013 | 100 ms |
| B4 | VFX_SF_HitBlade | Cut | một vệt chém chéo 30° cố định, kích thước 3D 1,05 × 4,2 m giữ tỉ lệ ảnh 1:4 | billboard | stock Additive | Slash_Onhit_015 | 200 ms |
| H1 | VFX_SF_ProjHeal | Core (root) | đốm sáng xanh lá nhỏ 1 m, alpha 0,4 | billboard | stock Additive | glow_soft_round_013 | code huỷ |
| H2 | VFX_SF_ProjHeal | Halo | quầng vòng mềm nhịp nhẹ | billboard | stock Additive | ring_thin_005 | code huỷ |
| H3 | VFX_SF_ProjHeal | Sparkle | sao lấp lánh rơi lại (World) | billboard | stock Additive | spark_star_003 | 250 ms |
| H4 | VFX_SF_HitHeal | Ring (root) | vòng lan 1 → 4 m | billboard | stock Additive | ring_thin_002 | 250 ms |
| H5 | VFX_SF_HitHeal | Rise | 7 sao bay lên (bán kính 0,6 m, 2–3,5 m/s, nằm trong hộp 104 px) | billboard | stock Additive | spark_star_009 | 250 ms |
| H6 | VFX_SF_HitHeal | Glow | quầng xanh lá | billboard | stock Additive | glow_soft_round_013 | 200 ms |
| S1 | VFX_SF_ProjShield | Bubble (root) | vòng sáng xanh dương dạng bong bóng | billboard | stock Additive | ring_thin_010 | code huỷ |
| S2 | VFX_SF_ProjShield | Core | lõi nhỏ xanh trắng | billboard | stock Additive | glow_soft_round_005 | code huỷ |
| S2b | VFX_SF_ProjShield | Bubbles | đuôi bong bóng nhỏ rơi lại (World), khác đuôi sao của Hồi máu | billboard | stock Additive | ring_thin_010 | 220 ms |
| S3 | VFX_SF_HitShield | Bubble (root) | bong bóng khiên bật lên 0,5 → 1,12 → 0,98 (nảy) rồi tan | billboard | stock Additive (vòng 1: Alpha gần như không thấy trên nền tối) | shield_fill_001 | 250 ms |
| S4 | VFX_SF_HitShield | Rim | mép bong bóng sáng, nảy cùng Bubble (khác vòng lan mảnh của Hồi máu) | billboard | stock Additive | ring_thin_010 | 250 ms |
| S5 | VFX_SF_HitShield | Sparkle | 6 sao lóe trên mép bong bóng, trễ 40 ms cho khớp nhịp nảy | billboard | stock Additive | spark_star_003 | 220 ms |
| K1 | VFX_SF_Block | Face (root) | chớp xanh khiên sáng nhất trong ~40 ms đầu (size 1,15 → 1) rồi tan; là chớp Impact duy nhất | billboard | stock Additive | glow_soft_round_013 | 200 ms |
| K2 | VFX_SF_Block | Crack | vết nứt pha màu khiên, alpha ≤ 0,8, hiện rồi tan | billboard | stock Additive | shield_crack_002 | 200 ms |
| C1 | VFX_SF_ChainFlash | Glow (root) | quầng mềm phủ ô, code tô màu theo icon | billboard | stock Additive | glow_soft_round_013 | 450 ms |
| C2 | VFX_SF_ChainFlash | Sweep | một vệt sáng quét chéo qua ô (xoay có chủ đích 45°) | billboard | stock Additive | Slash_Onhit_006 | 300 ms |

## Bảng texture

| Thành phần | Thư mục Library | Ảnh chốt + dự phòng | Lý do | Đã loại (vì sao) |
|---|---|---|---|---|
| Lõi đạn Sét / Khiên (V1, S2) | `glow/soft_round` | glow_soft_round_005; dự phòng glow_soft_round_004 | alpha thật, xám, lõi đặc + quầng, omni. Cảnh báo `không POT` (329 px): chấp nhận vì hiển thị nhỏ (≤ 1,6 m ≈ 38 px) | glow_soft_round_006 / 007 (nền đen, chỉ Additive), glow_soft_round_010 (đã có màu cam) |
| Quầng / lõi mềm (B3, H1, H6, C1, K1) | `glow/soft_round` | glow_soft_round_013; dự phòng glow_soft_round_014 | alpha thật, xám, mềm đều, 512 px | glow_soft_round_008 / 029 (128 px nền đen, đã ghi sai vai trò), glow_soft_round_027 (có màu) |
| Tia điện quanh lõi / bung (V2, V5) | `lightning/arc_sheet` | lightning_arc_sheet_006 (4×4); dự phòng lightning_arc_sheet_003 (3×3) | tia dày uốn cong, trắng tint được, alpha thật; sheet có hướng nên chỉ 2–3 hạt, không xoay | lightning_arc_sheet_004 / 007 (đã có màu), lightning_arc_sheet_001 (quá mảnh ở 64 px) |
| Tàn sao (V3, V6, B1) | `spark/star` | spark_star_002; dự phòng spark_star_009 | sao 4 cánh nhỏ có quầng, omni. Cảnh báo: 119 px (< 128), dùng ở kích thước nhỏ nên chấp nhận | spark_star_005 / 013 (nền đen), spark_star_006 (sao 5 cánh vàng có màu) |
| Sao lấp lánh (H3, S5) | `spark/star` | spark_star_003; dự phòng spark_star_002 | sao 4 cánh có quầng mềm, xám | spark_star_015 (có màu đỏ / vàng) |
| Sao bay lên (H5) | `spark/star` | spark_star_009; dự phòng spark_star_016 | sao 4 cánh gọn, đọc rõ ở kích thước nhỏ | spark_star_011 (khối mờ to) |
| Chớp va chạm Sét (V4) | `impact/flash_spiky` | impact_flash_spiky_014; dự phòng impact_flash_spiky_007 | sao 8 gai quầng mềm, alpha thật, xám | impact_flash_spiky_004 (có hướng, đã tint màu), impact_flash_spiky_002 (nền đen) |
| Lưỡi Kiếm chạy UV (B2) | `Slash/Main_tex(Uvmesh)` | Slash_Main_tex_Uvmesh_019 (sửa vòng 1); dự phòng Slash_Main_tex_Uvmesh_003 | lưỡi dày mềm, alpha thật, xám (luật slash: Coloso + Library). Vòng 1: Slash_Main_tex_Uvmesh_003 quá mảnh trên cung, quay lên chỉ thấy viền vòng | Slash_Main_tex_Uvmesh_004 / 005 (vệt dày mép rách, nền đen), Slash_Main_tex_Uvmesh_015 (sheet 2×2) |
| Mask lưỡi (B2) | (không thuộc Library) | `Assets/VFX/SF_Cast/Textures/T_VFX_Gradient_01.png` (bản chép từ Slash360) | luật Coloso: `_MaskTex` = T_VFX_Gradient_01 | — |
| Vệt chém va chạm (B4) | `Slash/Onhit` | Slash_Onhit_015 (sửa review 1); dự phòng Slash_Onhit_009 | một vệt mảnh nằm giữa khung, alpha thật, có hướng nên một hạt đặt cố định 30°. Review 1: Slash_Onhit_009 có nội dung lệch khỏi tâm khung, vệt lệch khỏi chớp | Slash_Onhit_002 / 013 (nền đen), Slash_Onhit_004 (đã có màu vàng) |
| Vệt quét lóe chuỗi (C2) | `Slash/Onhit` | Slash_Onhit_006; dự phòng Slash_Onhit_011 | vệt ngang mảnh nhọn hai đầu, alpha thật | Slash_Onhit_012 (nền đen) |
| Quầng vòng hồi máu (H2) | `ring/thin` | ring_thin_005; dự phòng ring_thin_010 | vòng mềm, tâm đúng giữa, alpha thật | ring_thin_007 / 008 (nền đen), ring_thin_013 (đã có màu vàng) |
| Vòng lan (H4) | `ring/thin` | ring_thin_002; dự phòng ring_thin_014 | vòng mảnh sáng, tròn đều, alpha thật | ring_thin_001 (vòng rách), ring_thin_004 (nền đen) |
| Bong bóng / mép bong bóng (S1, S2b, S4) | `ring/thin` | ring_thin_010; dự phòng ring_thin_011 | vòng mềm dày giống mép bong bóng | ring_thin_012 (đã có màu, lòng đen) |
| Mặt khiên (S3) | `shield/fill` | shield_fill_001; dự phòng shield_fill_002 | đĩa tròn mờ mép, alpha thật (chưa có dòng trong `library_props.csv`, đợt 2026-11-19) | — |
| Nứt khiên (K2) | `shield/crack` | shield_crack_002; dự phòng shield_crack_001 | nứt trắng trong khung tròn, alpha thật (chưa có dòng trong `library_props.csv`, đợt 2026-11-19) | — |

Contact sheet đã xem trước khi chốt (bản ở `Game_prj/VFX_LIb/Docs/VFX/_Library/_contact/`, máy này thiếu numpy): `lightning_arc_sheet`, `glow_soft_round`, `Slash_Onhit`, `Slash_Main_tex(Uvmesh)` (contact sheet chỉ tới `019`; ảnh `020`–`030` chưa xem), `spark_star`, `ring_thin`, `trail_ribbon`. `shield/*`, `impact/flash_spiky` không có contact sheet: đã Read từng ảnh ứng viên.

## Khác biệt giữa các effect
Mỗi cặp đạn / va chạm khác nhau ở hình lõi (cầu / cung xoay / đốm / vòng), lớp phụ (tia điện / vệt chém / sao bay lên / bong bóng) và chuyển động (chớp / xoay / rơi lại / bật lên). Không cặp nào chỉ đổi màu.

## Ngân sách
≤ 3 lớp, ≤ 20 hạt mỗi prefab; 15 ảnh Library + 1 mask; 1 mesh; không viết shader mới.

## Giả định
- Lửa / Băng / Đất làm sau (chưa có trong demo).
- `Slash/Onhit` dùng billboard đơn đặt đúng hướng (vệt va chạm, không phải vệt slash chạy UV).
- Kích thước hiển thị theo brief 4.12: đạn 64 px (≈ 2,7 m), va chạm ≤ 104 px cao (≈ 4,3 m), chặn 96 px (4 m), lóe chuỗi trùng ô 96 px (4 m).

## Sửa vòng 1 (tự kiểm preview, 2026-11-27)
- B1/B2: quầng 2,6 → 1,5 m, alpha 0,45 → 0,22; lưỡi đổi sang Slash_Main_tex_Uvmesh_019, quay 1800 → 1080°/s (trước đó đọc thành đĩa / vòng).
- H1: lõi alpha 0,5, tối đa 2 hạt (cháy trắng).
- S3: Alpha → Additive (không thấy bong bóng).
- C1/C2: quầng 4,6 → 4 m alpha 0,7; vệt quét 3,6 → 2,4 m, đường ±0,9 m (lòi ra ngoài ô).
- V2: tia 2,2 → 1,8 m, màu vàng alpha 0,85 (thành cục trắng).

## Sửa vòng 2 (2026-11-27)
- S3: màu đầy đủ (alpha 1, pha trắng 30 %), alpha mở từ 0,3 (bong bóng vẫn quá mờ).
- Lớp loop của đạn: thêm 1 hạt ở t = 0 để khung đầu có lõi.

## Sửa theo review vòng 1 (agent reviewer, 2026-11-27)
- B1/B2: bỏ quầng (thành đĩa xám), root đổi thành tàn thép rơi lại (đuôi); `_MainColor` 1,6–1,9 → 1 (cháy trắng).
- B3/B4: Cut đổi sang Slash_Onhit_015 nằm giữa khung (009 lệch tâm), size 3D giữ tỉ lệ 1:4; Flash nhỏ lại.
- S2b, S3–S5: ProjShield có đuôi bong bóng; HitShield thành bong bóng nảy + mép sáng + sao trên mép, không còn dùng chung vòng lan với HitHeal.
- H1: lõi 1 m alpha 0,4. H5 và V6: thu vào hộp va chạm 104 px.
- K1/K2: Face có đỉnh sáng ~40 ms, Crack pha màu khiên alpha ≤ 0,8.
- maxParticles khớp số hạt thật (lớp một hạt = 1; đuôi 8–12).
- Còn chờ art lead quyết (reviewer ghi KHÔNG CHẮC): khung ngẫu nhiên cho `lightning_arc_sheet_006` (nhãn dir; ít hạt, không xoay); `Slash/Onhit` cho vệt quét lóe chuỗi thay vì `spark/streak` / `trail/streak`; đạn dạng cầu không có đầu dẫn (brief 4.12 yêu cầu cầu / vòng / đốm).

## Sửa theo review vòng 2 (2026-11-27)
- B2: Start Color thép xanh (0,55; 0,7; 0,95) alpha 0,6 (vẫn cháy trắng ~60 % điểm sáng).
- K1: Face đổi sang glow_soft_round_013 màu khiên, đỉnh sáng + phồng nhẹ ở 0–20 % đời (shield_fill_001 vốn mờ nên không thấy lóe). Vẫn một chớp Impact.
- S5: sao trễ 40 ms, bán kính 1,8 m (lệch mép ở khung đầu).
- V3: Sparks max 11 → ProjVolt tổng 20 hạt.

## VFX_SF_VoltLink — tia sét nối ô khi ăn chuỗi Sét (kế hoạch v1, art lead duyệt 2026-11-27, màu xanh-trắng)

Tham chiếu: video art lead `simplescreenrecorder-2026-11-18_16.28.39.mkv` (tia trắng quầng xanh gấp khúc nối từng ô, nháy, ô được nối sáng lên) + `ElectricBolt` đã duyệt 2026-11-09 (`vfx-code/references/electric-bolt.md`).

**Hành vi:** chuỗi Sét dài N ô → game bắn N−1 tia nối ô k → k+1, tia sau trễ 60 ms (nhân hệ số Nhanh). Mỗi ô vẫn có `VFX_SF_ChainFlash` tô màu icon. Icon khác: chỉ `VFX_SF_ChainFlash` (tạm thời giống nhau). Prefab dựng cho ô kề ngang / dọc (102 px = 4,25 m); chéo (144 px = 6 m) thì game đặt `lengthScale` + `_Aspect` (MaterialPropertyBlock) và dời Tip tới B. Cả chuỗi xong ≤ 500 ms.

| ID | Prefab | Layer | Vai trò & timing | Carrier | Shader | Texture | Kết thúc |
|---|---|---|---|---|---|---|---|
| L1 | VFX_SF_VoltLink | Bolt (root) | tia chính A → B: 0–0,36 s, vươn trong 0,05 s, đổi hình 12 lần/s | Stretched Billboard, rộng 1,3 m, lengthScale = dài / rộng (3,27; chéo 4,62) | dùng lại `VFX/FX/Electric Bolt` (lõi HDR trắng, viền HDR xanh) | không (shader tính hình) | mảnh dần rồi đứt khúc (Custom1.x) |
| L2 | VFX_SF_VoltLink | Bolt2 | sợi phụ mảnh, gấp khúc khác: 0,06–0,3 s, 15 lần/s | như L1 | dùng lại `VFX/FX/Electric Bolt` (viền xanh đậm) | không | như L1 |
| L3 | VFX_SF_VoltLink | Tip | sao chớp nhỏ ở B sau khi tia chạm: 0,08–0,23 s | Billboard 1,2 m | dùng lại `VFX/FX/Glow Star` (`_STAR`) | không | co + mờ |

**Khác với `ElectricBolt`:** bố cục (tia ngắn nối ô-ô trên mặt phẳng màn hình thay vì 8 m tay → ngực), timing (0,36 s, chạy nối tiếp), lớp phụ (bỏ quầng tay, cung cuộn, tia lửa; thêm sao ở B). Giữ bất biến tia điện: gấp khúc, ghim hai đầu, nháy, đứt khúc khi tắt.
**Ngân sách:** 3 lớp × 1 hạt; 0 texture; không shader mới (2 shader chép từ project đầy đủ, cùng GUID).

### Tự sửa vòng 1 (VoltLink)
- Quad 0,85 → 1,3 m (aspect 3,3), amp 0,3 / 0,34: tia gấp khúc rõ như video tham chiếu (trước đó gần như thẳng). Lõi / viền thu theo tỉ lệ để giữ độ mảnh.
- Trong game (24 px/m) lõi chỉ ~0,7 px, mảnh và nhạt trên ô vàng: lõi / viền 0,022 / 0,06 → 0,05 / 0,12 (sợi phụ 0,028 / 0,07), glow 0,3.

### Sửa theo review (VoltLink, 2026-11-27)
- Độ đọc trên ô vàng: viền xanh đậm hơn (HDR 0,12 / 0,38 / 1,7), lõi 0,035, viền 0,13; sợi phụ amp 0,34 → 0,26 cho tia ngắn đỡ rối; ô Sét đang nối có quầng ChainFlash alpha 0,4 (icon khác 0,7).
- Tip trễ 0,05 → 0,08 s (sáng trước khi tia chạm B).
- sortingOrder VoltLink 29 / 30 / 31 (Bolt2 trùng 27 với Sweep của ChainFlash).
- Chờ art lead: nối tâm → tâm (đè chữ ô tạm) hay từ mép ô như video; có cần nhánh nhỏ / biên độ lớn hơn; ChainFlash + VoltLink chồng trên ô Sét có rối không. VoltLink chưa có trong danh sách 16 key của brief 4.12 (thêm khi chốt).

## VFX_SF_MatchPop — impact kiểu puzzle khi ăn ô (kế hoạch v1, art lead duyệt 2026-11-27)

**Anatomy:** `Docs/VFX/_Anatomy/match-pop.md`. Bất biến: thẻ nảy có easing bật + lóe đúng hình thẻ; hạt / vòng theo màu icon (chớp trắng hơn); ≤ ~0,45 s, nhiều ô cùng lúc vẫn đọc được; không che thẻ quá ~1 khung, không lan vào thanh báo lượt / panel.

Chạy trên **mỗi ô thuộc chuỗi** khi vào resolving, ≤ 450 ms, thay `VFX_SF_ChainFlash` cho mọi icon; chuỗi Sét vẫn có thêm `VFX_SF_VoltLink`. Game tô mọi lớp theo màu icon (Flash pha trắng nhiều nhất). Không rung màn hình.

**Tham khảo:** Unity Gem Hunter Match (https://unity.com/blog/engine-platform/2d-puzzle-match-3-sample-gem-hunter-match) → vòng sóng mỗi lần ăn (P3); Match-3 PixiJS juice (https://dev.to/roman_guivan_17680f142e28/match-3-game-in-pixijs-103-juice-and-polish-3fff) → nảy thẻ có easing bật (U1); itch.io juicy effects (https://itch.io/blog/1059831/making-a-game-feel-juicy-with-simple-effects) → chùm hạt + hoạt ảnh UI ngắn (P2, U2).

| ID | Prefab / nơi | Thành phần | Vai trò & timing | Carrier | Shader | Texture | Kết thúc |
|---|---|---|---|---|---|---|---|
| U1 | SlotFiveGame (UI) | Nảy thẻ | 1 → 1,18 trong 80 ms, bật về 1 có nảy nhẹ trước 220 ms | RectTransform thẻ | — | — | về 1 |
| U2 | SlotFiveGame (UI) | Chớp trắng thẻ | trắng 0,85 → 0 trong 150 ms, đúng hình thẻ | Image cùng sprite thẻ, tô trắng | UI mặc định | ảnh thẻ | mờ hết |
| P1 | VFX_SF_MatchPop | Flash (root) | chớp tròn ~1,4 → 3,8 m (size 3,6 × 0,4 → 1,05), alpha 0,8, 0–0,15 s | billboard | stock Additive | glow_soft_round_013 | mờ hết |
| P2 | VFX_SF_MatchPop | Burst | 10 sao toả 9–14 m/s, chậm dần, co lại, 0,28–0,35 s | billboard | stock Additive | spark_star_009 | co về 0 |
| P3 | VFX_SF_MatchPop | Ring | vòng sóng ~1,7 → 5 m, 0,25 s (≤ 5 m để ô hàng trên không chạm thanh báo lượt) | billboard | stock Additive | ring_thin_002 | mờ hết |
| P4 | VFX_SF_MatchPop | Chips | 6 mảnh văng 5–8 m/s rồi rơi (lực cục bộ −18 m/s²), 0,32–0,4 s; Stretched theo vận tốc, 1 khung / hạt, không xoay | Stretched (lengthScale 1,8, velocityScale 0), sheet 2×4 | stock Additive | spark_shard_002 | mờ hết |

| Thành phần | Thư mục Library | Ảnh chốt + dự phòng | Lý do | Đã loại |
|---|---|---|---|---|
| Chớp ô (P1) | `glow/soft_round` | glow_soft_round_013; dự phòng glow_soft_round_014 | alpha thật, xám, mềm đều | ảnh nền đen (006 / 007) |
| Sao bắn (P2) | `spark/star` | spark_star_009; dự phòng spark_star_002 | sao 4 cánh gọn, omni, alpha thật | spark_star_006 / 015 (có màu) |
| Vòng sóng (P3) | `ring/thin` | ring_thin_002; dự phòng ring_thin_014 | vòng mảnh tròn đều, alpha thật | ring_thin_001 (rách), 004 (nền đen) |
| Mảnh văng (P4) | `spark/shard` (đã xem contact sheet) | spark_shard_002; dự phòng impact_shard_002 | sheet 2×4 mảnh nhọn, alpha thật, xám; nhãn dir nên Stretched theo vận tốc, ít hạt | spark_shard_001 (nền đen), impact_shard_001 (nền đen) |

**Khác effect đã có:** khác HitVolt / HitHeal ở chỗ có nảy thẻ + chớp đúng hình thẻ, đặt trên ô lưới, chùm sao + mảnh văng rơi; khác ChainFlash: bỏ quầng tĩnh và vệt quét, thay bằng một nhịp pop.
**Ngân sách:** 4 lớp (ngoại lệ so với mức "≤ 3 lớp" chung của bộ cast, vì là pop trên lưới có cả lớp mảnh), 18 hạt / ô (tối đa 16 ô ≈ 288 hạt trong 0,4 s); không texture mới, không shader mới.

### Tự sửa vòng 1 (MatchPop)
- P1: chớp 5 → 3,6 m, alpha 0,8 (che hết thẻ). P2: sao 6–10 → 9–14 m/s (dồn cục quanh tâm). P4: lực rơi −30 → −18 m/s² (rơi quá xa xuống ô dưới).

### Sửa theo review (MatchPop, 2026-11-27)
- Tạo Anatomy `match-pop.md` (+ dòng chỉ mục, effect-index), chép Bất biến vào Plan.
- `TintPop` giữ alpha gốc của từng lớp (trước ép 1 làm mất alpha 0,8 của Flash).
- Ring 6 → 5 m. Bảng P1 / P2 / P4 cập nhật số sau tự sửa; ghi ngoại lệ 4 lớp.
- Chờ art lead: MatchPop thay `sf_chain_flash` (brief 4.12) — đổi key / hành vi khi chốt; pop có đủ "juicy" không.

### Art lead tự chỉnh MatchPop (2026-11-27)
- Art lead sửa tay prefab: thêm lớp `Impact`, Burst dùng `M_SF_Cast_ProjHeal_Sparkle`, Chips dùng `M_SF_Cast_ProjVolt_Core` (size 0,2). **Builder không dựng lại MatchPop khi prefab đã có** (Build All bỏ qua, ghi log); muốn dựng lại bản gốc thì xoá prefab.
- Màu: game tô mọi lớp theo **màu chủ đạo của ảnh icon** (`SlotFiveColors.Accent`, lấy cụm màu lớn nhất của icon bộ fantasy-slot-assets rồi nâng sáng): Kiếm #3A86FF, Hồi máu #6EDC2A, Sét #9C4DE0, Khiên #F0A020, May mắn #FFD84A. Chỉ Flash (root) pha 30 % trắng, Burst 15 %, các lớp khác màu thuần; alpha từng lớp giữ nguyên.
- Art lead "cần vfx to và sáng hơn" (2026-11-27): thêm `matchPopScale` (mặc định 1,4) và `matchPopBrightness` (mặc định 1,6: alpha từng lớp × 1,6, tối đa 1, cộng thêm 15 % trắng) trên `SlotFiveGame`, áp lúc chạy; prefab không đổi. Chỉnh trong Inspector của object `SlotFive`.
