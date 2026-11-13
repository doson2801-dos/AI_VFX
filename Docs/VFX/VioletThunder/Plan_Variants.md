# VioletThunder — biến thể Crimson và Azure (2026-11-09)

Cùng hiệu ứng với `VFX_VioletThunder` (sét từ trời đánh một điểm đất: tích điện → một tia → nổ trên đất → dòng điện bò trên đất). Mỗi bản đổi **ít nhất hai** trong: mesh/hình tia, bố cục, timing, lớp phụ. Không gian giữ như bản gốc: ground, tia đứng = Stretched Billboard (texture ngang, đầu chạm đất = mép trái), lớp nằm đất = Billboard + Local (GameObject X 90°), camera 3/4 40°, neo điểm đất, tia cao ~6 m, vùng nổ ~3–5 m. Mọi hạt Scaling Mode Hierarchy, Frame over Time tuyến tính, shader `Mobile/Particles/Additive` (không shader mới).

Texture: sheet tia 2×4 và halo của bản gốc (`Assets/VFX/VioletThunder/Textures/T_VioletThunder_Bolt_2x4`, `_BoltGlow_2x4`; trắng + alpha nên tô màu bằng Start Color). **Cần build bản gốc (VFX → VioletThunder → Build) ít nhất một lần trước.** Còn lại lấy từ `Assets/Library/`: `glow/soft_round/glow_soft_round_008`, `glow/flare/glow_flare_005` (sao X), `ring/thin/ring_thin_003`, `ring/ragged/ring_ragged_002`, `ground/crack_radial/ground_crack_radial_001`, `spark/shard/spark_shard_001` (1×4, mũi bên trái), `spark/star/spark_star_001`.

Ghi chú: builder gốc còn trỏ tên cũ trong Library (`glow/glow_023`, `wave/wave_015`...) — Library đã đổi tên, builder gốc sẽ báo thiếu asset nếu build lại. Hai biến thể này dùng đường dẫn mới.

## Crimson (đỏ cam, địa ngục) — menu `VFX/VioletThunder/Build Crimson`, prefab `VFX_VioletThunder_Crimson`
Màu: lõi `FFF1D6`, nóng `FFB040`, cam `FF5A14`, đỏ `D81414`, tối `6A0A10`.

| Trục | Khác bản gốc |
|---|---|
| Bố cục | tia nghiêng 14° (từ trái trên) + tia nhánh mảnh nghiêng −27° (1,9 m, cùng điểm đất); vết nứt đất phát sáng (`crack_radial_001`, 4,4 m) và vòng mảnh co vào điểm đánh lúc tích; dòng điện bò = sheet tia nằm phẳng (hạt 3D 2:1) bán kính 1,9 m, 2 lớp glow + lõi cùng seed |
| Timing | tích 0,6 s (gốc 0,4 s), tia chạm đất 0,64 s; vết nứt âm ỉ ~2,2 s; dòng điện 1,6 s |
| Lớp phụ | chớp = sao X (`flare_005`, một chớp), Cracks, ChargeRing, Embers (mảnh tia lửa Stretched bắn lên rồi rơi, gravity 2), Shock = vòng ragged; bỏ Residue, ImpactStar |

Lớp: Charge (root, order 3), ChargeRing −2, Cracks −3, BoltGlow 4, BoltCore 5, Fork 6, Flash 7, GroundFlash −4, Shock −1, Embers 2, ArcsGlow 0, ArcsCore 1. Thời lượng ~2,7 s (cracks 0,1 + 2,2 s).

## Azure (xanh lam điện) — menu `VFX/VioletThunder/Build Azure`, prefab `VFX_VioletThunder_Azure`
Màu: lõi `EAFBFF`, cyan `4FD8FF`, xanh `2A6BFF`, sâu `1B2CC8`.

| Trục | Khác bản gốc |
|---|---|
| Bố cục | quầng tích điện tụ **trên trời** (5,6 m) rồi loé sao ở gốc tia; tia nghiêng 24°, hẹp hơn (2,6 m); 3 vòng gợn liên tiếp (0 / 0,1 / 0,2 s); vòng tĩnh điện xoay chậm nằm lại trên đất; dòng điện bán kính 2,3 m |
| Timing | tích rất ngắn 0,26 s (gốc 0,4 s), tia 0,24 s (nhanh hơn), tia dội (Echo, mảnh) 0,26 s sau; đất nhiễm điện tồn ~2,3 s (arcs 2,2 s, bắt đầu 14 cung) |
| Lớp phụ | SkyGlow, SkyFlare, Echo, Ripples ×3, StaticRing, Motes (sao lấp lánh bay lên, `spark_star_001`); bỏ Residue, ImpactStar, sóng hồng |

Lớp: SkyGlow (root, order 3), SkyFlare 8, BoltGlow 4, BoltCore 5, Echo 6, Flash 7, GroundFlash −4, Ripples −1, StaticRing −3, ArcsGlow 0, ArcsCore 1, Motes 2. Thời lượng ~2,7 s.

## Chưa xác minh
- Chưa build trong Unity (Unity đang mở). Cần chạy menu, xem preview `Docs/VFX/VioletThunder_Crimson|Azure/Preview_sheet.png` và Review Lab.
- Hướng nghiêng của tia (`shape.rotation = (90 − tilt, 90, 0)`) tính bằng tay: tilt dương phải nghiêng từ trái-trên; nếu ngược dấu thì đổi dấu `tilt`.
- Dòng điện bò dùng frame của sheet tia (2:1, hạt 3D); nếu trông lệch thì đổi thành sheet 4×4 riêng.

# Đợt 2026-11-13: Toxic, Gold (biến thể) + VioletStorm (effect mới cùng phong cách)
Builder dùng chung `Editor/VioletThunderKit.cs`. Không gian giữ như bản gốc (ground, tia đứng Stretched, lớp đất Billboard + Local, camera 3/4 40°, tia ~6 m). Cần build bản gốc một lần trước (sheet tia). Menu `VFX/VioletThunder/Build Toxic | Build Gold | Build Storm`.

**Bất biến giữ nguyên (Toxic, Gold):** tích → một phát giáng → vỡ vụn → dư điện; tia toon zig-zag (viền + lõi); một chớp + sóng lan đất.

| Bản | Màu | Bố cục | Timing | Lớp phụ |
|---|---|---|---|---|
| Toxic | lõi `F2FFD8`, lime `9CFF3A`, xanh `2FBF2A`, sâu `0E5A1E` | tích sôi ngay trên đất, tia gần đứng (−8°) béo 3,4 m, vũng axit nằm lại | tích 0,55 s, tia 0,4 s, dư ~3,2 s | Bubbles (vòng bọt nổ), Pool + PoolEdge, Spores bay lên |
| Gold | lõi `FFFBE6`, vàng `FFD24A`, hổ phách `FF9A1E`, sâu `B8560A` | tích trên cao 4,2 m, tia đứng thẳng rộng 4,2 m, Halo đập tại chỗ | tích 0,32 s, tia 0,3 s | Halo, Shards phun cao (rơi lại), 2 gợn, Motes |

**VioletStorm (effect khác, tím-hồng):** mây giông 6 m, 3 điểm đất được báo (vòng co) rồi bị đánh lần lượt (0,30 / 0,52 / 0,74 s), cuối là một tia lớn ở tâm (0,98 s) kèm chớp đất, sóng ragged, dòng điện bò, vết cháy. Mỗi điểm một chớp + một vòng. Sorting: tia 10..17, chớp 30..33, vòng báo −12.., vòng −4...

## Sheet tia riêng từng bản (sửa 2026-11-13 sau góp ý của art lead: "sao không thay texture bolt khác?")
Ban đầu 3 bản dùng chung sheet tia của bản gốc nên nhìn na ná nhau. Đã chọn lại sau khi xem contact sheet `lightning/bolt_sheet`:
| Bản | Sheet Library | Nét | Loại |
|---|---|---|---|
| Toxic | `lightning_bolt_sheet_011` | mảnh, có gân nhánh | |
| Gold | `lightning_bolt_sheet_010` | dày vừa, zig-zag cao | |
| VioletStorm | `lightning_bolt_sheet_009` | ngắn, gấp khúc | |
Ảnh Library là tia **đứng** 4×2 (1024×2048), nên `tools/make_bolt_sheet.py <png> <tiền_tố>` cắt từng khung, xoay 90° cùng chiều kim đồng hồ (đầu chạm đất = mép TRÁI), ghép lại 2 cột × 4 hàng theo thứ tự khung và làm thêm bản glow mờ: `Textures/T_VioletThunder_<Toxic|Gold>_Bolt(Glow)_2x4.png`, `T_VioletStorm_Bolt(Glow)_2x4.png`. Khung sau khi xoay tỉ lệ 4:1 nên Length Scale = 4 (bề rộng Toxic 1,7 / Gold 2,0 / Storm 1,5–2,1 m, tia dài 6–8 m); dòng điện bò dùng hạt 3D 4:1.
Bài học: lớp glow và lõi **phải cùng bề rộng** (cùng Stretch), glow rộng hơn thì lệch khỏi lõi.

## Dòng điện bò trên đất: dùng `lightning/arc_sheet` (sửa 2026-11-13, art lead nhắc)
Lần đầu mình đặt sheet tia nằm phẳng làm arc mà **không tra bảng LIBRARY.md** (vai trò "cung điện" có sẵn `arc_sheet`). Đã làm lại đúng quy trình (tra bảng → contact sheet → chọn):
| Bản | Sheet | Lưới | Nét | Đã loại |
|---|---|---|---|---|
| Toxic | `arc_sheet_006` | 4×4 | dày, uốn cong như chất nhầy | 005 (mờ, khó chia lưới), 004 / 007 (có sẵn màu), `arc_single_001` (một sợi đơn) |
| Gold | `arc_sheet_001` | 3×3 | tia nhỏ lấp lánh (hơi mờ, xem Trạng thái) | |
| Storm | `arc_sheet_003` | 3×3 | zig-zag gọn | |
Ô vuông nên hạt Start Size 1,6–2,8 m, không còn 3D 2:1. Glow = bản làm mờ của chính sheet đó (`tools/make_arc_glow.py` → `Textures/T_..._ArcGlow.png`), đặt dưới sheet Library. **Bài học: mọi thành phần phải tra LIBRARY.md trước, kể cả lớp phụ.**

## Trạng thái
Đã build trong Unity qua MCP (không lỗi compile / console), preview ở `Docs/VFX/VioletThunder_Toxic|Gold`, `VioletStorm/Preview_sheet.png`. Còn yếu: arc của Gold mờ và nhỏ, mây giông Storm còn tròn, tia Toxic mảnh. Chưa đưa vào `Included` (chờ art lead duyệt).
