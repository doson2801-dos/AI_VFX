# VFX_SF_VoltStrike — kế hoạch v1 (art lead duyệt 2026-11-27)

Sét của Slot Five: thay đạn Sét (`VFX_SF_ProjVolt`) và va chạm Sét (`VFX_SF_HitVolt`). Tia sét tụ ở chuỗi ô Sét rồi đánh xiên xuống nhân vật bị trúng. Builder `Assets/VFX/SF_VoltStrike/Editor/SFVoltStrikeBuild.cs` (menu **VFX → SF_VoltStrike → Build**), prefab `Assets/VFX/SF_VoltStrike/Prefabs/VFX_SF_VoltStrike.prefab`.

**Không gian:** dir (từ ô Sét xuống nhân vật) trên mặt phẳng màn hình XY · camera trực giao nhìn thẳng (camera game; preview dùng camera phối cảnh nhìn −Z) · neo: root ở A = tâm chuỗi ô Sét, tia theo +X cục bộ; game xoay root quanh Z về phía nhân vật, nhân `lengthScale` + `_Aspect` mọi renderer Stretched theo khoảng cách / 16 m, đặt các con `At*` ở tâm nhân vật và `AtFeet*` ở chân · quy mô 24 px = 1 m, tia dài thiết kế 16 m (~384 px) · nền ảnh lâu đài tím.
*Đã chốt:* điểm đầu là các ô Sét; thay đạn; đủ bộ. *Đề xuất (đã duyệt):* phần còn lại.

**Thời lượng:** 0,65 s theo nhịp cast (bay 350 ms): tụ điện 0 → 0,27 s, tia phóng 0,27 s, chạm 0,33 s (khớp lúc trừ máu), tia giữ ~0,22 s rồi đứt khúc. Chế độ Nhanh: game đặt `simulationSpeed`. Art style stylized, lõi trắng, viền tím HDR theo icon Sét.

**Tham khảo (2b):**
- Lightning Strike VFX, SF Studio (https://sf-studio.gitbook.io/unity-assets/lightning-strike-vfx/lightning-strike-vfx-graph) → chia Flash / Glow / Electricity cho cả lúc tụ (pre-strike) và lúc chạm → T1 tụ điện ở ô, T5–T8 ở nhân vật.
- Unity Discussions, 2D effects với VFX Graph + Shader Graph (https://discussions.unity.com/t/create-2d-special-effects-in-unity-with-the-vfx-graph-and-shader-graph/1646746) → tia vẽ thủ tục bằng shader cộng vài particle → dùng lại `VFX/FX/Electric Bolt`.
- Ringling VFX blog (https://sites.google.com/c.ringling.edu/obsidians-blog/vfx/vfx_05) → chớp phóng to nhanh rồi co chậm → đường cong size của T5.

**Anatomy:** `Docs/VFX/_Anatomy/lightning-strike.md`. Bất biến: có tia sét thật gấp khúc đọc được là sét (không phải laser mờ); chớp lõi gắt ở điểm chạm rồi sóng lan ra; một điểm đánh; cột rõ ≥ 0,2 s. Lệch đã chốt: tia xiên từ ô xuống thay vì thẳng đứng từ trời.

**Khác effect đã có:** so với `VFX_SF_VoltLink`: dài gấp 4, thêm 2 nhánh, lớp tụ điện, bộ chạm (flare, sóng, cung, tàn), màu tím thay xanh. So với `LightningStrike`: tia xiên trên UI 2D thay cột đứng 3D; sóng là vòng dẹt trên mặt phẳng màn hình thay vòng nằm đất; không có nứt đất.

## Thành phần

| ID | Layer | Vai trò & timing | Carrier | Shader | Texture | Kết thúc |
|---|---|---|---|---|---|---|
| T1 | Charge (root, ở A) | quầng tụ điện ở tâm chuỗi ô, 0 → 3 m trong 0,27 s, nhấp nháy (vòng 1 review: 1,8 m gần như không thấy trong game) | billboard | dùng lại `VFX/FX/Glow Star` (`_STAR`) | không | tắt lúc tia phóng (0,3 s) |
| T2 | Bolt | tia chính rộng 2,2 m, phóng tới đích trong 0,06 s, giữ rồi đứt khúc | Stretched, pivot 0 | dùng lại `VFX/FX/Electric Bolt` | không | đứt khúc, hết 0,57 s |
| T3 | Branch1 | nhánh mảnh lệch +6°, dài 60 %, trễ 0,03 s | Stretched | Electric Bolt | không | 0,22 s |
| T4 | Branch2 | nhánh mảnh lệch −8°, dài 45 %, trễ 0,06 s | Stretched | Electric Bolt | không | 0,18 s |
| T5 | AtFlare | chớp lõi sao 8 gai 0 → 6,5 m, chớp Impact duy nhất | billboard | Glow Star (`_STAR`) | không | 0,2 s |
| T6 | AtFeetWave | vòng sóng dẹt 3:1 ở chân, 1,4 → 9 m, sortingOrder 37 (lớp mặt đất, dưới tia) | billboard, size 3D | stock Additive | ring_thin_002 | mờ 0,3 s |
| T7 | AtArcs | 3 cung điện bung quanh điểm chạm, trễ 0,03 s sau khi tia nối tới, khung ngẫu nhiên, không xoay | billboard, sheet 4×4 | stock Additive | lightning_arc_sheet_006 | 0,15 s |
| T8 | AtSparks | 10 tàn sao toả ra | billboard | stock Additive | spark_star_009 | co về 0 trong 0,25 s |

## Bảng texture

| Thành phần | Thư mục Library | Ảnh chốt + dự phòng | Lý do | Đã loại (vì sao) |
|---|---|---|---|---|
| Vòng sóng (T6) | `ring/thin` | ring_thin_002; dự phòng ring_thin_014 | omni, xám, alpha thật, vòng mảnh có glow, 1024 px (contact `Docs/VFX/_Library/_contact/ring_thin.png`) | ring_thin_001 (mép răng cưa, trông như đá vỡ), ring_thin_004 / 007 / 008 (nền đen), ring_thin_012 / 013 (đã có màu), ring_thin_009 (quá mảnh) |
| Cung điện (T7) | `lightning/arc_sheet` | lightning_arc_sheet_006; dự phòng lightning_arc_sheet_003 | đã duyệt ở SF_Cast (V2, V5); sheet có hướng nên chỉ 3 hạt, không xoay | lightning_arc_sheet_004 / 007 (đã có màu), lightning_arc_sheet_001 (quá mảnh) |
| Tàn sao (T8) | `spark/star` | spark_star_009; dự phòng spark_star_016 | sao 4 cánh gọn, omni, xám, 512 px, không cảnh báo (đã duyệt ở SF_Cast H5) | spark_star_002 (vòng 1 review: cảnh báo "nhỏ <128; không POT", 119 px), spark_star_005 / 013 (nền đen), spark_star_006 (sao 5 cánh có màu) |

**Ngân sách:** 8 layer, ~20 hạt cùng lúc, 8 material (5 dùng lại shader không texture: Charge, Flare = Glow Star; Bolt, Branch1, Branch2 = Electric Bolt; 3 stock), 3 texture Library.

## Review
- Vòng 1 (agent độc lập, 2026-11-27): không lỗi chặn. Đã sửa: số trong plan lệch builder, đổi tàn sao sang spark_star_009 (002 có cảnh báo kích thước), vòng sóng xuống dưới tia + to / sáng hơn, cung điện trễ 0,03 s và còn 3 hạt, quầng tụ to hơn. Giữ: `VFX_SF_Block` vẫn sinh khi đòn Sét bị khiên chặn (ngữ cảnh khiên, không phải chớp của sét): chờ art lead quyết.
- Vòng 2 (agent độc lập): không còn LỖI ngoài dòng ngân sách material (đã sửa). Ghi chú: quầng tụ điện vừa đủ thấy; cung / tàn sao nhỏ ở 0,5 s.
