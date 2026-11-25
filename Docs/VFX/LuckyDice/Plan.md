# LuckyDice: kế hoạch v1 (2026-11-25, order `20261125_sondh_docs`, người order: Sơn)

Nguồn: docs "Hero – Lucky God" (skill Lucky Dice): xúc xắc lớn rơi xuống vị trí trúng đạn, xoay nhẹ, vệt khói vàng dài, nổ khi chạm. Hai VFX trong bảng Art: **Trail Die** và **Die explosion** (Sơn xác nhận chỉ có 2 cái). Ảnh ref: `work/vfx_orders/20261125_sondh_docs/image.png`. Link Envato (xúc xắc rơi) chỉ mô tả xúc xắc trắng + sáng ấm, không mô tả vệt; link Adobe Stock bị chặn 403, nên hình dựng theo ảnh ref + chữ trong docs.

Sơn trả lời: game **Built-in**, **chưa có model Die** (dùng 1 khối cube tạm làm Die demo), phần còn lại tự chọn.

## Không gian (các mục *đề xuất* do em chọn)
- Trail Die: **air / dir** (rơi thẳng xuống). Root gắn vào xúc xắc (game cha vào model Die), vệt ở không gian thế giới.
- Die explosion: **ground**, neo ở điểm chạm (y = 0), vòng nằm đất = Billboard + Render Alignment Local (xoay X 90°), phần còn lại Billboard / Stretched. Một chớp.
- Camera 3/4, nhìn xuống 40°. Quy mô *đề xuất*: Die cạnh 1.2 m (nhân vật 2 m), rơi từ cao 8 m, **0.45 s** (nhanh dần; v2: Sơn muốn rơi mạnh hơn, v1 là 0.8 s), xoay ~1 vòng. Nổ bán kính ~4 m, ~1.5 s. Màu vàng theme Hero.
- Pipeline Built-in, shader mobile stock (Additive / Alpha Blended), không shader mới, không texture mới (trừ ảnh mặt Die demo).

## Bất biến (chép từ `_Anatomy/die-trail.md`, `die-explosion.md`)
Trail: dải từ **các góc** xúc xắc (**4 dải** ở 4 đỉnh xen kẽ, liền, xoắn, thon đuôi; v1 có 8 dải bị vỡ) · màu vàng, lõi sáng · khói vàng dài + lấp lánh · bám theo xúc xắc.
Explosion: **một chớp** vàng-trắng · vòng gai nằm đất · tia gai bắn nửa cầu · thân là **bụi vàng mềm tan thành hạt** (không lửa, không khói xám) · **vài điểm lấp lánh** trong bụi · bán kính ~4 m, hết ~1.5 s.

## Prefab
| Prefab | Dùng ở đâu | Ghi chú |
|---|---|---|
| `VFX_DieTrail` | game cha vào model Die, bật khi xúc xắc bắt đầu rơi, tắt `emission` / destroy khi chạm | root = Particle System (khói); 4 con `Corner_0/3/5/6` đặt đúng 4 đỉnh xen kẽ của cube 1.2 m (đổi cỡ Die thì sửa vị trí con) |
| `VFX_DieExplosion` | game spawn tại điểm chạm, một lần | root = Particle System (bụi) |
| `VFX_DieDrop` | **demo / Showcase**: cube tạm có chấm + trail + explosion, script `VfxDieDrop` (rơi 0.45 s, hạ cánh thì tắt cube, dừng phát vệt, nổ) | không dùng trong game thật; model Die do team khác làm |

## Lớp VFX_DieTrail
| ID | Lớp | Vai trò | Carrier / shader | Order |
|---|---|---|---|---|
| T1 | Aura | quầng vàng bám Die, 2.6 m | Billboard, Local, Additive | 0 |
| T2 | Smoke (root) | khói vàng dài để lại sau lưng, 55/s, đời 0.8–1.2 s, nở 0.6→2.0 | Billboard, World, Alpha Blended | 1 |
| T3 | Corner_0, 3, 5, 6 (4 đỉnh xen kẽ, v2) | **xương sống**: mỗi đỉnh một dải ribbon (Trails mode Ribbon), phát theo quãng đường 6 điểm/m, bay ra ngoài theo đường chéo góc 2.0 m/s, đời 0.4 s (~8 m ở tốc độ rơi 0.45 s), rộng ~1.1–1.4 m ở sát xúc xắc, thon dần về đuôi, hạt gốc `renderMode None` | Trails, World, Additive | 2, 5, 7, 8 |
| T4 | Sparks | tia vụn ngắn bắn ra từ khối, 55/s, pivot (0,1,0) | Stretched, World, Additive | 10 |
| T5 | Glints | sao lấp lánh nhấp nháy dọc vệt, 55/s | Billboard, World, Additive | 11 |

## Lớp VFX_DieExplosion (~1.6 s)
| ID | Lớp | Timing / vai trò | Carrier / shader | Order |
|---|---|---|---|---|
| X1 | Pool | quầng vàng trên đất 3→7.5 m, 1.1 s | nằm đất (Local), Additive | 0 |
| X2 | Ring | vòng gai 0.8→9.2 m (2.3R), 0.65 s | nằm đất, Additive | 1 |
| X3 | Ring2 | vòng thứ hai trễ 0.07 s, →8 m (2R) | nằm đất, Additive | 2 |
| X4 | Dust (root) | 30 mảng bụi vàng cuộn ra theo mặt đất + bốc lên, đời 0.9–1.3 s, tan dần | Billboard, World, Alpha Blended | 3 |
| X5 | DustRise | 18 mảng bốc thành vòm (không để bụi dẹt như đĩa) | Billboard, World, Alpha Blended | 4 |
| X6 | Motes | 110 hạt vàng mịn cộng sáng, bay lên chậm, tắt | Billboard, World, Additive | 5 |
| X7 | Spikes | 34 tia gai nửa cầu 11–19 m/s, đời 0.3–0.55 s, pivot (0,1,0) | Stretched, World, Additive | 6 |
| X8 | FlashCore | **một chớp**: cầu sáng 3.6 m, 0.3 s | Billboard, Additive | 7 |
| X9 | FlashStar | sao 8 gai 5 m, cùng chớp | Billboard, Additive | 8 |
| X10 | Sparkles | 16 sao 4 cánh nhấp nháy trong bụi, 0.12–1.4 s | Billboard, World, Additive | 9 |

## Texture (Library, đã xem contact sheet từng thư mục)
| Thành phần | Thư mục | Chốt | Dự phòng | Đã loại (lý do) |
|---|---|---|---|---|
| T3 Corner ribbon (v3) | `impact/flipbook` | `impact_flipbook_016` ô dưới-trái (lưỡi thuôn nhọn hai đầu, mép gợn, alpha, xám; sheet 2×2 có hướng nhưng dùng **một ô** kéo dọc ribbon bằng tiling 0.32×0.3 offset 0.08/0.07, không spam; art lead yêu cầu thử ảnh nhóm impact) | `impact_flipbook_020`, `013`, `impact_shard_002` | **v2 `trail_ribbon_019`** (art lead: dải gãy, cứng, quá đều); ô trên-trái của `016` (mép răng cưa to, ra dải cưa); `impact_flipbook_005` / `023` (chùm mảnh vụn, không phải dải); `007`/`018` (blob) | `trail_ribbon_023`/`024` (dải gai: ra hình dây thép gai), `trail_streak_005` làm ribbon (mảnh như dây điện, bản thử 1 bị chê trông giống tia sét), `014`/`015` (dải lụa to nhiều lớp) |
| T4 Sparks, X7 Spikes | `trail/streak` | `trail_streak_005` (nhãn `dir` trong CSV nhưng hình là thấu kính **đối xứng** nên dùng được nhiều hạt; vẫn Stretched theo vận tốc, không xoay tay) | `trail_streak_006` | `trail_streak_012` (khối trắng đặc, đã ghi sai vai trò), `003`/`008` (có hướng đầu-đuôi rõ) |
| T2 Smoke, X4 Dust, X5 DustRise | `smoke/soft` | `smoke_soft_005` (= `Assets/VFX/fx_t_smoke_02.png`, khói mặc định theo luật; alpha, omni, 418×397 không POT) | `smoke_soft_004` | `smoke_soft_002` (4 cục rõ), `smoke_soft_006` (nền đen, nhỏ), `smoke_soft_001` (nền đen) |
| T1 Aura, X1 Pool | `glow/soft_round` | `glow_soft_round_005` (alpha, mép mềm; 329 px không POT, đủ cho quầng mềm) | `glow_soft_round_013` | `glow_soft_round_001` (có viền vòng), `010` (đã có màu cam) |
| X6 Motes, X8 FlashCore | `glow/soft_round` | `glow_soft_round_007` (nền đen, Additive; 500 px không POT) | `glow_soft_round_006` | `glow_soft_round_008`/`029` (128 px, quá nhỏ) |
| T5 Glints, X10 Sparkles | `spark/star` | `spark_star_003` (sao 4 cánh có quầng mềm, alpha) | `spark_star_004`, `009` | `spark_star_006`/`007` (đã có màu vàng cố định), `017` (viền xám) |
| X9 FlashStar | `impact/flash_spiky` | `impact_flash_spiky_014` (sao 8 gai quầng mềm, alpha, omni) | `impact_flash_spiky_005` | `006`/`010` (đặc, có hướng), `013` (hàng gai dựng đứng) |
| X2 Ring | `impact/radial_ring` | `impact_radial_ring_003` (vòng gai mờ, nền đen = Additive) | `impact_radial_ring_007` | `006` (nền tối đậm cả đĩa) |
| X3 Ring2 | `impact/radial_ring` | `impact_radial_ring_004` | `impact_radial_ring_008` | `010` (đặc, có hướng) |
| Die demo (chỉ VFX_DieDrop) | không thuộc Library | `Assets/VFX/LuckyDice/Textures/T_DieDemo_Faces.png` (atlas 3×2 mặt 1–6, vẽ bằng script) | | Lý do tạo mới: Library không có texture mặt xúc xắc; chỉ để xem demo, game có model Die riêng |

## Đã sửa sau review vfx-director (vòng 1, 2026-11-25)
- Ribbon: ở mode Ribbon, vị trí 0 của `widthOverTrail` / `colorOverTrail` là **đầu cũ (đuôi)**, 1 là đầu mới sát góc xúc xắc; bản đầu để ngược nên dải dày ở xa, cụt phẳng. Đã lật: đuôi tan về 0, dày nhất sát xúc xắc.
- Billboard bị mặt đất cắt (lộ cạnh phẳng): nâng tâm chớp (1.6 / 1.8 m), gốc phát bụi (1.0 m), hạt khác lên cao hơn nửa kích thước.
- Khói đổi sang `smoke_soft_005` (= khói mặc định `fx_t_smoke_02`).
- `VFX_DieDrop`: sortingOrder của Explosion cộng 12 để không trùng với Trail.
- Tia gai dài hơn (đời 0.3–0.55 s, length scale 10), thêm lấp lánh quanh xúc xắc (Glints 55/s).

## v2 (feedback Sơn sau demo v1)
- Tăng tốc độ rơi: 0.8 s → 0.45 s (quadratic, chạm đất ~35 m/s), xoay 800°/s (~1 vòng).
- Trail giảm còn **4 đỉnh** (xen kẽ 0, 3, 5, 6) vì 8 dải bị vỡ; ribbon đời 0.4 s, rộng 1.1–1.4 m (4 dải nên dày hơn).

## v3 (feedback Sơn sau demo v2: "trail bị gãy, cứng, quá đều, đổi thử texture impact khác")
- Texture dải: `trail_ribbon_019` → `impact_flipbook_016` (ô dưới-trái, xem bảng texture).
- Bớt đều: mỗi trong 4 dải một đời (×1 / 0.8 / 1.15 / 0.9), một độ rộng (×1 / 0.85 / 1.2 / 0.95), một tốc độ toả (×1 / 1.35 / 0.75 / 1.15); đường cong độ rộng lên xuống không đều (6 nút) và độ sáng dọc dải đổi (alpha 0.5–1).
- Bớt gãy / cứng (sau review v3: mép dải răng cưa do `startSize` / `startColor` ngẫu nhiên **theo từng hạt**; đã đặt hằng cho từng dải, khác nhau giữa các dải): xoay xúc xắc 800 → 520°/s (~0.65 vòng trong 0.45 s) để góc uốn của dải sát xúc xắc bớt gắt; không dùng Noise (đã thử, ra răng cưa kiểu tia sét).

## Chưa chắc (điểm yếu em biết)
- Chưa xem được video ref (Adobe 403, Envato không mô tả vệt): hình dải dựng theo ảnh ref tĩnh. Ref có dải **xoắn quanh** xúc xắc như lửa; bản này là 4 dải toả ra từ đỉnh + xoắn nhờ xúc xắc xoay (520°/s), xoắn chưa dày bằng ref.
- Bụi vàng chỉ là mảng mềm alpha (chưa có texture bụi hạt mịn riêng); phần "tan thành hạt" nhờ lớp Motes cộng sáng.
- Chưa có chip vỡ của xúc xắc (docs chỉ nói "tan biến thành bụi").
- Chưa thử trên nền sáng; chưa vào `Included` / Showcase (đợi art lead).

Builder: `Assets/VFX/LuckyDice/Editor/LuckyDiceBuild.cs` (menu `VFX/LuckyDice/Build`). Script demo: `Assets/VFX/LuckyDice/Runtime/VfxDieDrop.cs`. Preview: `Preview_sheet.png` (10 khung rơi + nổ, camera 3/4 40°, sàn thật), `Preview_explosion.png` (nổ riêng, không sàn); GIF + sheet demo `work/vfx_orders/20261125_sondh_docs/demo_v1/`; khung gốc `work/vfx_orders/20261125_sondh_docs/frames_cur/`.
