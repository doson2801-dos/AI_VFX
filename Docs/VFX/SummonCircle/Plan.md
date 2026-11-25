# SummonCircle — kế hoạch v1 (2026-11-25)

Vòng triệu hồi nằm đất, bán kính ~3 m (đường kính 6 m), một lần ~2.6 s. Pipeline Built-in (Additive mobile), Scaling Mode Hierarchy.
Không gian (*đề xuất* theo order): ground, nằm đất = Billboard + Render Alignment Local (GameObject xoay X 90°); chùm tia đứng = Stretched Billboard (pivot ở gốc tia); camera 3/4 nhìn xuống 40°; neo cố định tại chỗ triệu hồi (không bám người); nền tối.
Màu (*đề xuất*, tông tím-đỏ): Core `#FFE9F2` · Red `#FF3A55` · Crimson `#D1306E` · Violet `#9A3BFF` · Deep `#4A0F6B`.

## Bất biến (loại "vòng phép nằm đất", theo `_Anatomy/heal-circle.md` + yêu cầu order)
- Vòng đọc được: >= 2 lớp rune xoay ngược chiều, tròn đều, nằm đất, tâm đúng giữa.
- Có chuyển động đi lên từ vòng (tia dựng + hạt) nhưng **ý nghĩa là triệu hồi (nghi lễ), không phải hồi máu**: có chớp trung tâm, tông tối-đỏ, tia nhọn.
- Một ngữ cảnh (ground), **một chớp Impact** (t = 1.2 s: cột trung tâm + Flash + vành sóng lớn).

## Khác HealCircle (>= 2 trục)
- Quy mô 6 m (gốc 2 m), **3 lớp rune** (gốc 2) xoay xen kẽ +14 / -32 / +60 °/s.
- Bố cục: **lồng 8 tia đứng quanh viền** (gốc: một cột giữa), cộng một cột giữa chỉ ở chớp cuối.
- Timing: mở -> tia mọc t=0.6 -> chớp t=1.2 -> tắt dần tới 2.6 s; hạt tro nhiều đợt (6 đợt).
- Hình: tia nhọn, tông đỏ-tím (gốc: mềm, xanh lá).

## Lớp
| # | Layer | Vai trò / timing | Kỹ thuật | sortingOrder |
|---|---|---|---|---|
| 1 | GroundGlow | quầng tím sẫm 7 m | Billboard + Local | -6 |
| 2 | RuneOuter | vòng hoa văn 6 m, +14°/s | Billboard + Local | -5 |
| 3 | RuneMid | vòng vạch 4.3 m, -32°/s, trễ 0.1 | Billboard + Local | -4 |
| 4 | RuneInner | ngôi sao 2.7 m, +60°/s, trễ 0.2 | Billboard + Local | -3 |
| 5 | PulseRings | vành sóng t=0 và t=1.2 | Billboard + Local | -2 |
| 6 | RimBeams | 8 tia đứng r=2.6 m, cao ~2.7 m, mọc t=0.6 | Stretched, pivot (0, lengthScale/2, 0) | 0 |
| 7 | CenterColumn | cột giữa ~5 m, chớp t=1.2 | Stretched | 1 |
| 8 | Flash | chớp lõi t=1.2 | Billboard | 2 |
| 9 | Embers | tro bay lên, 6 đợt, 72 hạt | Billboard, rise + noise | 3 |
| 10 | Sparkles | sao 4 cánh t=1.2 | Billboard | 4 |

## Texture (từng thành phần; tất cả chép từ Library bằng `prep_tex.py`, Library không đổi)
| Thành phần | Thư mục (tra `LIBRARY.md`) | Ảnh chốt | Ảnh dự phòng | Đã loại (contact sheet `rune/circle`, `ring/soft`) |
|---|---|---|---|---|
| RuneOuter | `rune/circle` | `rune_circle_002.png` (vòng đôi + cung + chấm, 2048, tròn đều, xám) | `rune_circle_006` | 001 (mặt quỷ), 003 (quá mảnh ở 6 m, đã dùng ở Arcane), 004 (đá có màu), 005 (hoa = Nature), 007 (tam giác sci-fi), 009 (bông tuyết) |
| RuneMid | `rune/circle` | `rune_circle_006.png` (vành vạch + chấm, 512, omni) | `rune_circle_003` | như trên |
| RuneInner | `rune/circle` | `rune_circle_008.png` (ngôi sao 5 cánh trong vòng đôi, 256 -> 512) | `rune_circle_005` | như trên |
| GroundGlow | `glow/soft_round` | `glow_soft_round_004.png` | `_013`, `_014` | 001 (bong bóng), 010 (cam), 027 (màu) |
| PulseRings | `ring/thin` | `ring_thin_002.png` (vành mảnh mềm) | `ring_thin_011`, `_014` | 004/007/008 (nền đen chạm mép), 009 (quá mảnh), 012 (xanh), 013 (vàng) |
| RimBeams / CenterColumn | `trail/streak` | `trail_streak_001.png` (đáy phẳng, ngọn nhọn, lật ngang: đáy mép PHẢI, ngọn mép TRÁI) | `trail_streak_011` (lật), `spark_streak_002` | `beam_001` (ống nghiệm, mép cứng), `trail_streak_009` (phình đầu), `_010`, `_012` (chạm mép) |
| Flash | `glow/soft_round` | `glow_soft_round_005.png` | `_020` | như GroundGlow |
| Embers | `glow/soft_round` | `glow_soft_round_002.png` | `_022`, `_033` | như GroundGlow |
| Sparkles | `spark/star` | `spark_star_003.png` (sao mềm, omni) | `_001`, `_008` | 006 (5 cánh vàng), 014 (dấu cộng), 015 (đỏ), 017, 010 |

## Kết quả preview (2026-11-25)
Preview 26 khung 0.1 s: `Docs/VFX/SummonCircle/Preview_sheet.png`. Ba vòng đọc được, tia mọc ở viền đúng gốc (pivot ổn), chớp t=1.2 rõ, tắt hết ~2.6 s. Build không lỗi, 248 hạt tối đa.
Chưa chắc: tia hình nón nhọn hơi "gai" (có chủ ý cho triệu hồi, art lead quyết); Showcase chưa có (chờ duyệt); chưa review vfx-director.

## Dựng
Menu `VFX/SummonCircle/Build` hoặc `-executeMethod VfxEffects.SummonCircleBuild.BuildBatch`. Prefab `Assets/VFX/SummonCircle/Prefabs/VFX_SummonCircle.prefab`. Chưa vào `Included`.
