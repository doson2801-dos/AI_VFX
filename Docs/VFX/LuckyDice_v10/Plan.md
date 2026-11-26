# LuckyDice_v10: kế hoạch (2026-11-26, order `20261125_sondh_docs`; người nhận demo: Hoàng, duyệt cuối: Sơn)

**Dựng RIÊNG, không đè bản chỉnh tay của Sơn** (`Assets/VFX/LuckyDice/`, Unity của Sơn đang mở). Builder `Assets/VFX/LuckyDice_v10/Editor/LuckyDiceV10Build.cs` (menu `VFX/LuckyDice_v10/Build`), prefab `VFX_DieTrail_v10`, `VFX_DieExplosion_v10`, `VFX_DieDrop_v10`. Kế thừa script chạy `VfxDieDrop`, `VfxDieTrailControl` (`Assets/VFX/LuckyDice/Runtime/`). Anatomy: `_Anatomy/die-trail.md`, `die-explosion.md`. Kế hoạch gốc: `Docs/VFX/LuckyDice/Plan.md`.

## Feedback của Hoàng (sau demo v9)
1. Trail làm lại mượt hơn, **hết phần gai chồi ra**, có cảm giác "ma thuật"; **cuối trail tỏa ra thêm chút cam**.
2. Bụi vàng đang như **mây bay lên** từ điểm nổ: làm lại theo **đặc tính vụ nổ: bắt đầu nhanh, tỏa ra chậm dần**.
3. Phần lan tỏa dưới đất ổn, **to ra một chút** cho cân với bụi.

## Cách sửa (các số là *đề xuất*)
| Việc | Nguyên nhân em tìm ra | Sửa v10 |
|---|---|---|
| Gai chồi ra (trail) | lớp **Sparks** (vệt Stretched mảnh bắn quanh) + ảnh dải mép răng cưa / cánh nhọn + đuôi doãng ra thành hình nêm | **bỏ Sparks**; ảnh dải `trail_ribbon_019` mép mịn; độ rộng uốn mềm, đuôi **không doãng** (thu về 0.5, mờ dần bằng alpha); `numCornerVertices` 14 |
| Cảm giác ma thuật + đuôi cam | | dải rộng 1.9 m (× 1 / 0.85 / 1.2 / 0.95), xoắn nhờ xúc xắc xoay 600°/s; màu **kem vàng → vàng → cam** (1, 0.58, 0.1) ở đuôi; khói trail chỉ còn lớp mỏng ngả cam (alpha 0.28); sao lấp lánh 40/s, một nửa ngả cam |
| Bụi như mây | tốc độ đầu thấp (5–8 m/s) + vận tốc bốc lên 1.4–2.4 + vòm DustRise bốc lên + bụi nở to chậm | **Dust**: tốc độ đầu **16–24 m/s** theo mặt đất, `speedModifier` 1 → 0.4 (0.12 s) → 0.12 (0.4 s) → 0.03, bốc lên chỉ 0.3–0.9, kích thước 0.45 → 1 → 1.3 lần, alpha vào nhanh (0.04 s) rồi tan tại chỗ; **DustLow** (thay DustRise): 26 hạt nửa cầu, tốc độ 0.5–7 giảm nhanh, lấp tâm; **Motes** 5–16 m/s giảm tốc |
| Vòng dưới đất | | Pool 3.5 → 9.5 m, Ring 1 → 11 m, Ring2 → 9.6 m, chớp nằm đất 8 m, sao nằm đất 9.5 m (v9: 7.5 / 9.2 / 8 / 7 / 8.5); bụi toả ~4.5 m, vòng bán kính ~5.5 m |

Giữ nguyên: không gian (air / dir rơi, ground nổ), camera 3/4 40°, xúc xắc 1.2 m rơi 14 m / 0.6 s (47 m/s), một chớp, 4 đỉnh xen kẽ, Pivot (0,0.5,0) cho billboard đứng, layout order (lớp nằm đất dưới lớp đứng).

## Texture (Library, đã xem contact sheet từng thư mục)
| Thành phần | Thư mục | Chốt | Dự phòng | Đã loại (lý do) |
|---|---|---|---|---|
| T3 Corner trail (v10) | `trail/ribbon` | `trail_ribbon_019` (dải mềm gợn, **mép mịn không răng cưa**, alpha, xám 1024×512; mỗi TrailRenderer một ảnh, tiling x 0.6 offset 0.2; có hướng nhưng không spam) | `trail_ribbon_020`, `trail_ribbon_017` (dải mềm một gợn) | v9 của Sơn `trail_ribbon_003`; v5 `trail_ribbon_022` (nhiều sợi mảnh, ra gai nhọn khi to bản); v3–v4 `impact_flipbook_016` (mép lông vũ); `trail_ribbon_023`/`024` (dải gai), `trail_streak_005` làm dải (mảnh như dây điện) |
| T4 Sparks, X8 Spikes | `trail/streak` | `trail_streak_005` (nhãn `dir` trong CSV nhưng hình là thấu kính **đối xứng** nên dùng được nhiều hạt; vẫn Stretched theo vận tốc, không xoay tay) | `trail_streak_006` | `trail_streak_012` (khối trắng đặc, đã ghi sai vai trò), `003`/`008` (có hướng đầu-đuôi rõ) |
| T2 Smoke, X5 Dust, X6 DustRise | `smoke/soft` | `smoke_soft_005` (= `Assets/VFX/fx_t_smoke_02.png`, khói mặc định theo luật; alpha, omni, 418×397 không POT) | `smoke_soft_004` | `smoke_soft_002` (4 cục rõ), `smoke_soft_006` (nền đen, nhỏ), `smoke_soft_001` (nền đen) |
| T1 Aura, X1 Pool | `glow/soft_round` | `glow_soft_round_005` (alpha, mép mềm; 329 px không POT, đủ cho quầng mềm) | `glow_soft_round_013` | `glow_soft_round_001` (có viền vòng), `010` (đã có màu cam) |
| X7 Motes, X4 FlashGround, X10 FlashCore | `glow/soft_round` | `glow_soft_round_007` (nền đen, Additive; 500 px không POT) | `glow_soft_round_006` | `glow_soft_round_008`/`029` (128 px, quá nhỏ) |
| T5 Glints, X12 Sparkles | `spark/star` | `spark_star_003` (sao 4 cánh có quầng mềm, alpha) | `spark_star_004`, `009` | `spark_star_006`/`007` (đã có màu vàng cố định), `017` (viền xám) |
| X9 FlashStarGround, X11 FlashStar | `impact/flash_spiky` | `impact_flash_spiky_014` (sao 8 gai quầng mềm, alpha, omni) | `impact_flash_spiky_005` | `006`/`010` (đặc, có hướng), `013` (hàng gai dựng đứng) |
| X2 Ring | `impact/radial_ring` | `impact_radial_ring_003` (vòng gai mờ, nền đen = Additive) | `impact_radial_ring_007` | `006` (nền tối đậm cả đĩa) |
| X3 Ring2 | `impact/radial_ring` | `impact_radial_ring_004` | `impact_radial_ring_008` | `010` (đặc, có hướng) |
| Die demo (chỉ VFX_DieDrop) | không thuộc Library | `Assets/VFX/LuckyDice/Textures/T_DieDemo_Faces.png` (atlas 3×2 mặt 1–6, vẽ bằng script) | | Lý do tạo mới: Library không có texture mặt xúc xắc; chỉ để xem demo, game có model Die riêng |

## Đã sửa sau review vfx-director (vòng 1, 2026-11-25)
- Ribbon: ở mode Ribbon, vị trí 0 của `widthOverTrail` / `colorOverTrail` là **đầu cũ (đuôi)**, 1 là đầu mới sát góc xúc xắc; bản đầu để ngược nên dải dày ở xa, cụt phẳng. Đã lật: đuôi tan về 0, dày nhất sát xúc xắc.
- Billboard bị mặt đất cắt (lộ cạnh phẳng): nâng tâm chớp (1.6 / 1.8 m), gốc phát bụi (1.0 m), hạt khác lên cao hơn nửa kích thước.
- Khói đổi sang `smoke_soft_005` (= khói mặc định `fx_t_smoke_02`).
- `VFX_DieDrop`: sortingOrder của Explosion cộng 12 để không trùng với Trail.
- Tia gai dài hơn (đời 0.3–0.55 s, length scale 10), thêm lấp lánh quanh xúc xắc (Glints 55/s).


## Chưa chắc (điểm yếu em biết)
- Ảnh dải `019` là bản mềm: đường viền hơi nhòe; đổi sang `020` / `017` nếu muốn sắc hơn.
- Trail chỉ mượt ở 60 fps (xúc xắc 47 m/s ≈ 1.6 m / khung ở 30 fps, dải gấp khúc nhẹ); em chưa nội suy được điểm giữa khung (thử `AddPosition` bị đảo thứ tự điểm).
- Bụi vẫn là billboard `smoke_soft_005` (khói mặc định), không Erode Sphere: Erode Sphere là luật cho khói vụ nổ lửa / than; brief này là bụi vàng. Art lead quyết nếu muốn khác.
- Vòng bụi nở thành các cụm khá rời nhau ở cuối (1.3 s); chưa có chip vỡ xúc xắc.
- Không bao gồm chỉnh tay của Sơn (width x4, tắt khói trail, tia gai ngắn, chớp 6.66, ảnh dải `003`): v10 là bản dựng mới; cần giữ chỉnh nào thì báo, em đưa vào builder.
