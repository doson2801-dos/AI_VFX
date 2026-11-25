# SummonCircle_Rise — kế hoạch (2026-11-25, art lead: "vfx summon làm theo kiểu khác xem")

Bản thứ hai của vòng triệu hồi; bản `VFX_SummonCircle` (magenta, 8 tia gai viền) GIỮ NGUYÊN để so sánh. Built-in (Additive mobile), Scaling Mode Hierarchy, root prefab = Particle System (lớp Motes không xoay).
Không gian (*đề xuất*): ground; vòng nằm ngang = Billboard + Render Alignment Local (node xoay X 90°), nhiều lớp ở các độ cao khác nhau; cột sáng = Stretched (pivot ở gốc); camera 3/4 40°; neo cố định; ~2.5 m đường kính, cao ~3 m, ~2.6 s; nền tối.
**Palette (một họ xanh-tím điện, hue ~245-255°)**: Core `#F2F0FF` · Bright `#A890FF` · Mid `#6A5CFF` · Deep `#1E1466` (quầng đất). Không magenta, không đỏ.

## Bất biến (chép từ `_Anatomy/summon-circle.md`, diễn giải cho bản này)
- >= 2 lớp rune xoay ngược chiều, tròn đều, tâm đúng giữa, đọc được là vòng phép: ở đây là vòng chính dưới đất xoay + 3 tầng rune xoay xen kẽ +30 / -45 / +60 °/s.
- Có chuyển động đi lên từ vòng (ở đây chính là các tầng rune trồi lên) + hạt.
- Một ngữ cảnh (ground), **một chớp** (t = 1.5 s: cột + Flash + vành sóng).
- Triệu hồi (nghi lễ), không phải hồi máu: năng lượng hút vào tâm rồi bùng.

## Khác bản cũ (thực chất, >= 3 trục)
- Bố cục: **trụ rune xếp tầng bay lên** (rune không nằm yên); thay vì 8 tia gai viền; vòng chính dưới đất nhỏ 2.5 m (cũ 6 m).
- Lớp phụ: xoáy năng lượng thu vào tâm (`ring/swirl`) + hạt xoắn hội tụ.
- Timing: mọc tầng liên tục 0.15-1.35 s -> hút vào 0.5-1.5 s -> chớp 1.5 s -> tắt 2.6 s.
- Màu: xanh-tím điện (cũ magenta).

## Lớp
| # | Layer | Vai trò / timing | Kỹ thuật | sortingOrder |
|---|---|---|---|---|
| 1 | GroundGlow | quầng xanh-tím 4.2 m (tông Mid, alpha cao hơn v1 để mặt đất vẫn đọc được khi không có nứt) | Billboard + Local | -9 |
| 2 | GroundRing | vòng chính 2.5 m, +24 °/s | Billboard + Local | -7 |
| 4 | Inflow | xoáy hút vào tâm, 2 nhịp 0.6 / 0.9 s | Billboard + Local, thu nhỏ + xoay -240 °/s | -6 |
| 5 | PulseRings | vành sóng 5 m ở t=1.5 | Billboard + Local | -5 |
| 6a | TierA | rune ngoài, burst 0.15 / 0.95, bay lên 2.5 m/s, thu 1 -> 0.6, +30 °/s | Billboard + Local, velocity World | -4 |
| 6b | TierB | burst 0.35 / 1.15, -45 °/s | như trên | -3 |
| 6c | TierC | burst 0.55 / 1.35, +60 °/s | như trên | -2 |
| 7 | Column | cột sáng ~4.7 m ở t=1.5 | Stretched, pivot (0, lengthScale/2, 0) | 0 |
| 8 | Flash | chớp lõi | Billboard | 1 |
| 9 | Motes (ROOT) | 56 hạt bay vào xoắn hội tụ trục (orbital + radial âm), 4 đợt 0.5-1.1 s | Billboard, shape Circle 1.6 m | 2 |
| 10 | Sparkles | 12 sao 4 cánh ở chớp | Billboard | 3 |

Các tầng cách nhau ~0.5 m (burst lệch 0.2 s, tốc độ 2.5 m/s), tổng 6 vòng cùng lúc tối đa ~5, cao tới ~3 m.

## Texture (xem contact sheet `rune/circle` đã có `work/vfx_orders/20261118_haunv_thu1/rune_circle_contact.png` và `ground/crack_radial` + `ring/swirl` ghép riêng; tất cả chép bằng `prep_tex_rise.py`, Library không đổi)
| Thành phần | Thư mục | Ảnh chốt | Ảnh dự phòng | Đã loại |
|---|---|---|---|---|
| GroundRing | `rune/circle` | `rune_circle_002.png` (vòng đôi + cung + chấm) | `rune_circle_006` | 001 (mặt quỷ), 004 (đá, có màu), 005 (hoa = Nature), 007 (tam giác sci-fi), 009 (bông tuyết) |
| TierA | `rune/circle` | `rune_circle_006.png` (vành vạch + chấm, mảnh) | `rune_circle_003` | như trên |
| TierB | `rune/circle` | `rune_circle_003.png` (vòng chữ cổ mảnh) | `rune_circle_006` | như trên |
| TierC | `rune/circle` | `rune_circle_008.png` (sao 5 cánh trong vòng đôi) | `rune_circle_002` | như trên |
| Inflow | `ring/swirl` | `ring_swirl_002.png` (xoáy mềm, lõi rỗng) | `ring_swirl_003` | 001 (cánh nhọn như lưỡi) |
| GroundGlow | `glow/soft_round` | `glow_soft_round_004.png` | `_013`, `_014` | 001, 010, 027 |
| PulseRings | `ring/thin` | `ring_thin_002.png` | `ring_thin_011`, `_014` | 004/007/008, 009, 012, 013 |
| Column | `trail/streak` | `trail_streak_001.png` (lật ngang: đáy mép PHẢI, ngọn mép TRÁI) | `trail_streak_011` (lật) | `beam_001`, `trail_streak_009/010/012` |
| Flash | `glow/soft_round` | `glow_soft_round_005.png` | `_020` | như GroundGlow |
| Motes | `glow/soft_round` | `glow_soft_round_002.png` | `_022`, `_033` | như GroundGlow |
| Sparkles | `spark/star` | `spark_star_003.png` | `_001`, `_008` | 006, 014, 015, 017, 010 |

## v2 (art lead 2026-11-25: gỡ lưới nứt đất)
Luật mới: không thêm decal vỡ địa hình vào magic circle trừ khi art lead yêu cầu. Đã gỡ lớp Cracks (`ground_crack_radial_010`), xoá texture / material Crack; bù bằng quầng đất GroundGlow sáng hơn (màu Mid, alpha đỉnh 0.85) + vòng chính. Các lớp còn lại và sortingOrder giữ nguyên (không dùng -8 nữa). Tối đa 179 hạt.

## Kết quả preview (2026-11-25)
`Docs/VFX/SummonCircle_Rise/Preview_key.png` (9 mốc 0.3-2.5 s) + `Preview_sheet.png` (26 khung 0.1 s). Đối chiếu Bất biến: vòng chính + 3 tầng đọc được, các tầng mọc từ đất rồi trồi lên, thu nhỏ dần, chớp t=1.5 s rõ, tắt ~2.6 s, một tông xanh-tím. Build không lỗi, tối đa 229 hạt.
Chưa chắc: tầng rune bay cao khá mờ (rune mảnh co nhỏ + fade) — nếu art lead muốn rõ hơn thì tăng alpha / giảm thu nhỏ; hạt hút vào nhỏ nên khó thấy ở khung 384 px; chưa review vfx-director.

## Dựng
Menu `VFX/SummonCircle/Build Rise` hoặc `-executeMethod VfxEffects.SummonCircleRiseBuild.BuildBatch`. Prefab `Assets/VFX/SummonCircle/Prefabs/VFX_SummonCircle_Rise.prefab`.
