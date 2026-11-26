# DieTrail — vệt vàng bám xúc xắc rơi (skill Lucky Dice của Hero Lucky God)
Độ chắc: **suy từ ảnh ref art lead (docs Hero – Lucky God, mục IV "Trail Die") + mô tả docs; chưa xem video Envato ref** · Cập nhật: 2026-11-25 · Nguồn: `work/vfx_orders/20261125_sondh_docs/image.png` (xúc xắc trắng, dải lửa vàng xoắn quanh, lấp lánh), docs Google (mục III: "xúc xắc xoay nhẹ khi rơi, vệt khói vàng dài"; mục IV: "khi rơi có trail màu vàng toả ra từ các góc của xúc xắc")

## Nó là gì
Xúc xắc to rơi từ trên trời xuống mục tiêu, **xoay nhẹ**; từ **các góc của khối** toả ra những **dải vàng mảnh xoắn** kéo dài ngược lên phía sau, kèm một dải khói vàng mềm và vài điểm lấp lánh. Nhìn từ 3/4: một cột dải vàng xoắn nối từ trời tới xúc xắc.

## Cấu trúc
| Phần | Vai trò | Hình dáng | Bắt buộc |
|---|---|---|---|
| Dải từ góc | **xương sống**: **4 đỉnh xen kẽ** (art lead 2026-11-25: 8 dải bị vỡ), mỗi đỉnh một dải (ribbon) | mảnh, lõi vàng sáng, mép mềm, nở dần ra ngoài + xoắn nhờ xúc xắc xoay, thon về đuôi | **có** |
| Khói vàng | thân vệt dài phía sau | khối mềm vàng nhạt, nở dần, tan | có |
| Quầng | halo quanh xúc xắc | cầu mềm vàng, không che mặt xúc xắc | có (nhẹ) |
| Tia vụn (v10 BỎ: đọc thành gai chồi ra) | vệt tia ngắn bắn ra từ góc | gạch mảnh Stretched | nên có |
| Lấp lánh | sao 4 cánh nhấp nháy dọc vệt | nhỏ, thưa | nên có |

## Chuyển động / nhịp
Rơi ~0.6 s từ cao 14 m (gia tốc, chạm ~47 m/s; art lead muốn rơi mạnh và cao hơn), xoay tăng theo tốc độ rơi (tối đa 450°/s lúc chạm đất). Vệt dài ~8 m ngược lên; dải tan trong ~0.4 s sau khi xúc xắc dừng, cột khói còn ~0.9 s. Vệt thuộc không gian thế giới (để lại sau lưng), gốc dải dính vào góc xúc xắc.

## Bất biến (mất là không còn là nó)
- Dải **xuất phát từ các đỉnh** của xúc xắc (4 đỉnh xen kẽ; nhìn rõ nhiều dải, không phải một cái đuôi chung từ tâm).
- Dải **liền mạch, mảnh, xoắn**, thon dần về đuôi; không phải chuỗi đốm rời, không phải thanh thẳng cứng.
- **Màu vàng** (theme Hero), lõi sáng hơn mép; không trắng xanh, không cam đỏ.
- Có **khói vàng dài** (docs: "long golden smoke trail") và **lấp lánh**.
- Bám theo xúc xắc (root gắn vào xúc xắc), không đứng yên tại chỗ spawn.

## Được đổi
Màu vàng (vàng chanh / vàng đồng), số dải, độ dài vệt, độ xoắn, mật độ lấp lánh, chất khói (bụi vàng / khói mềm).

## Lỗi biến thể / lỗi dự đoán
- **Ribbon (Trails mode Ribbon): vị trí 0 của width / color over trail là đầu CŨ (đuôi), 1 là đầu mới** (sát hạt gốc). Đặt ngược thì dải dày + cụt phẳng ở xa xúc xắc, mảnh ở sát (reviewer 2026-11-25). Thêm: Noise + hướng ngẫu nhiên của cone + rate over time cho ra dây zig-zag giống **tia sét** (bản thử 1–2 bị chê): dùng rate over distance, không Noise, cone góc ~1°, texture dải mềm (`trail_ribbon_019` ở v1–v2; v3 art lead chê gãy / cứng / đều nên đổi sang một ô của `impact_flipbook_016`; không dùng `trail_streak_005` làm ribbon: mảnh như dây điện).
- **Ribbon: startSize và startColor phải HẰNG cho từng dải** (với `sizeAffectsWidth` + `inheritParticleColor`, mỗi điểm lấy một cỡ / màu ngẫu nhiên khác thì mép dải răng cưa, sọc màu). Biến thiên đặt ở `widthOverTrail` / `colorOverTrail` và khác nhau **giữa các dải** (đời, rộng, tốc độ).
- Ribbon (Trails) cần `renderMode None` ở hạt gốc, nếu không hiện thêm chuỗi chấm dọc dải.
- Texture dải có đầu / đuôi thon theo U: với `impact_flipbook_016` (v3–v4) lấy cửa sổ một ô (tiling 0.32×0.3, offset 0.08/0.07); v5 dùng cả ảnh `trail_ribbon_022` (tiling 1×0.7, offset 0/0.15) để thân dải không bị tối đầu.
- Rate over distance không chạy khi chụp Simulate bằng bước lớn: dùng bước 1/60 s hoặc rate over time.

## Gai chồi ra / cảm giác ma thuật (Hoàng 2026-11-26, v9)
- "Gai chồi ra" do: lớp Sparks (vệt Stretched mảnh bắn quanh), ảnh dải mép răng cưa hoặc đầu nhọn, và **đuôi doãng rộng** (thu về nêm nhọn, ra gai màu hồng). Trail ma thuật = dải **mịn, liền, mềm mép**, xoắn quanh xúc xắc, đuôi **pha cam** (màu kem vàng → vàng → cam, mờ bằng alpha), không có tia ngoài dải; sao lấp lánh nhỏ đi kèm.

## Đoạn đầu trail (Hoàng 2026-11-26, v10 → v11)
- Xúc xắc vừa thả rơi chậm mà xoay nhanh thì 4 đỉnh vẽ vòng nhỏ gấp → TrailRenderer ra mảnh / góc nhọn. **Xoay phải tăng theo tốc độ rơi** (`VfxDieSpin`), và dải bắt đầu phát sau ~0.15 s đầu. Trễ phát dải đã thử rồi bỏ (ra hai thanh phẳng đứng yên). Xoay ∝ tốc độ rơi làm tổng góc xoay giảm (270° → 135°) nên xoắn giữa đoạn rơi giảm. Trễ phát dải đã bỏ; spin tối đa = 450°/s (như v10 lúc chạm đất). Model Die trong game phải xoay theo cùng quy tắc (chậm lúc mới thả). Còn lại: vài vệt ngang mép dưới xúc xắc trong 0.3 s đầu.

## Ghi chú TrailRenderer (v4, art lead 2026-11-25: Trails module vẫn "gãy", thử Trail Renderer)
- Mỗi đỉnh một component TrailRenderer (con của Die): đường cong mượt hơn nhiều (không răng cưa, không móc). `widthCurve` / `colorGradient` của TrailRenderer: 0 = đầu MỚI (ở góc), 1 = đuôi (ngược với Ribbon của PS).
- **`numCapVertices` phải 0**: cap tròn đâm ra TRƯỚC xúc xắc nửa bề rộng (thấy như gậy sáng thò xuống dưới khối).
- TrailRenderer không chạy khi `ParticleSystem.Simulate` / chụp edit mode: preview phải chụp ở Play mode (`VfxDieCapture`, `Time.captureFramerate` 60). `WaitForEndOfFrame` không chạy trong batchmode; `cam.Render()` vào RenderTexture thì chạy.
- **Phụ thuộc fps**: TrailRenderer lấy mẫu mỗi khung; xúc xắc rơi ~35 m/s (v4) / ~47 m/s (v5) nên ở 30 fps cách ~1.2 / ~1.6 m mỗi điểm, dải gấp khúc (bo góc `numCornerVertices` 8 giảm bớt). Nội suy bằng `AddPosition` thử rồi bỏ: `emitting=false` thì không vẽ; `emitting=true` thì thứ tự điểm đảo, dải vỡ.
- Game: gắn `VFX_DieTrail` vào model Die, gọi `VfxDieTrailControl.End()` khi chạm đất.

## Biến thể đã làm
- v12 (2026-11-26, Hoàng; = v10 + xoay ∝ tốc độ rơi `VfxDieSpin`, không đổi gì khác).
- `Assets/VFX/LuckyDice_v10/Prefabs/VFX_DieTrail_v10.prefab` (2026-11-26, Hoàng; dựng riêng, không đè bản chỉnh tay của Sơn): bỏ Sparks, ảnh `trail_ribbon_019`, rộng 1.9, đuôi pha cam, không doãng đuôi.
- `Assets/VFX/LuckyDice/Prefabs/VFX_DieTrail.prefab` (2026-11-25, order sondh_docs, chờ art lead). v2: rơi 0.45 s, 4 đỉnh. v4: dải = 4 TrailRenderer (không còn Trails module). v5: ảnh dải `trail_ribbon_022` (lụa nhiều sợi), thả cao 14 m / 0.6 s. v3: ribbon dùng ô dưới-trái của `impact_flipbook_016`, 4 dải khác đời / rộng / tốc độ, xoay 520°/s.
