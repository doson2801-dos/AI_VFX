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
