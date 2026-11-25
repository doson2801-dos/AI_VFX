# CastCircle — kế hoạch v1 (2026-11-25)

Vòng phép **dựng đứng** trước tay người cast, hướng ra phía trước (+Z), đường kính 1.4 m, tâm cao 1.3 m, cách thân 0.9 m; một lần ~1.2 s. Built-in (Additive mobile), Scaling Mode Hierarchy.
Không gian (*đề xuất* theo order): air/dir, dựng đứng = Billboard + Render Alignment Local trên GameObject **không xoay** (pháp tuyến = +Z; không Vertical Billboard); neo bám người (simulation Local, gắn vào bone tay / root nhân vật, hướng theo nhân vật); camera 3/4 40° (nhìn từ sau lưng; vòng méo ~cos40 = 0.77 theo chiều cao); nền tối.
Màu (*đề xuất*, xanh dương-cyan): Core `#E8FDFF` · Cyan `#3FD8FF` · Blue `#2A7BFF` · Deep `#123AA8`.

## Bất biến (loại "vòng phép", theo `_Anatomy/heal-circle.md` + order)
- Vòng đọc được: 3 vòng đồng tâm, xoay xen kẽ chiều (+80 / -130 / +210 °/s), tròn đều, tâm đúng giữa.
- Dựng đứng, mặt hướng ra trước (không nằm đất).
- Một chớp Impact (t = 0.6 s: Flash + vành sóng nở), sau đó thu và tắt đến 1.2 s.

## Khác HealCircle / SummonCircle
- Dựng đứng, gắn tay (hai effect kia nằm đất); quy mô 1.4 m; ngắn 1.2 s.
- Không có tia dựng / hạt bay lên: thay bằng **hạt bắn ra phía trước** (hướng +Z) ở chớp = phép được thả đi.
- Nhịp: nở nhanh 0.22 s -> quay -> nháy trắng -> phồng -> thu tắt.

## Lớp
| # | Layer | Vai trò / timing | Kỹ thuật | sortingOrder |
|---|---|---|---|---|
| 1 | Glow | đĩa sáng nền 2.0 m | Billboard + Local, z -0.03 | -6 |
| 2 | RingOuter | vòng vạch 1.4 m, +80°/s | Billboard + Local | -5 |
| 3 | RingMid | vòng hoa văn 1.0 m, -130°/s, trễ 0.05 | như trên | -4 |
| 4 | RingInner | sao 5 cánh 0.6 m, +210°/s, trễ 0.1 | như trên | -3 |
| 5 | Shock | vành sóng nở 0.3->2.8 m ở t=0.6 | như trên | -2 |
| 6 | Flash | chớp lõi t=0.6 | như trên | 1 |
| 7 | Motes | 28 hạt cone 10° bắn ra +Z | Billboard | 2 |
| 8 | Sparkles | 8 sao 4 cánh quanh viền | Billboard | 3 |

## Texture (chép từ Library bằng `prep_tex.py`, Library không đổi)
| Thành phần | Thư mục | Ảnh chốt | Ảnh dự phòng | Đã loại (contact sheet `rune/circle`) |
|---|---|---|---|---|
| RingOuter | `rune/circle` | `rune_circle_006.png` (vành vạch + chấm, mảnh, sạch ở 1.4 m) | `rune_circle_003` | 001 (mặt quỷ), 004 (đá có màu), 005 (hoa = Nature), 007 (tam giác sci-fi), 009 (bông tuyết) |
| RingMid | `rune/circle` | `rune_circle_002.png` (vòng đôi + cung, 2048) | `rune_circle_005` | như trên |
| RingInner | `rune/circle` | `rune_circle_008.png` (ngôi sao 5 cánh trong vòng đôi) | `rune_circle_002` | như trên |
| Glow | `glow/soft_round` | `glow_soft_round_004.png` | `_013`, `_014` | 001, 010, 027 |
| Shock | `ring/thin` | `ring_thin_002.png` | `ring_thin_011`, `_014` | 004/007/008, 009, 012, 013 |
| Flash | `glow/soft_round` | `glow_soft_round_005.png` | `_020` | như Glow |
| Motes | `glow/soft_round` | `glow_soft_round_002.png` | `_022`, `_033` | như Glow |
| Sparkles | `spark/star` | `spark_star_003.png` | `_001`, `_008` | 006, 014, 015, 017, 010 |

## Kết quả preview (2026-11-25)
`Docs/VFX/CastCircle/Preview_sheet.png` (14 khung, 0.1 s): vòng đứng (tỉ lệ cao/rộng ~0.78 = đúng vòng đứng nhìn 40°), 3 vòng đọc được, chớp t=0.6 + vành sóng, tắt ~1.2 s. Build không lỗi, 140 hạt tối đa.
Chưa chắc: chưa xem trên rig nhân vật thật (vị trí tay phụ thuộc skeleton, cần gắn prefab làm con của bone tay + xoay theo hướng nhân vật); chưa kiểm hạt Motes bay đúng +Z trên preview (khung nhỏ); chưa review vfx-director.

## Dựng
Menu `VFX/CastCircle/Build` hoặc `-executeMethod VfxEffects.CastCircleBuild.BuildBatch`. Prefab `Assets/VFX/CastCircle/Prefabs/VFX_CastCircle.prefab`. Chưa vào `Included`.
