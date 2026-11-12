# Waterfall_Map6 (airport-tycoon, scene S_Map6), 2026-11-12

Thác nước loop cho map 6 của airport-tycoon (`D:\Projects\airport-tycoon`). Làm qua Unity MCP, không có video ref (art lead chưa gửi; duyệt kế hoạch không kèm video).
Tạo hình: `Docs/VFX/_Anatomy/waterfall.md`.

## Không gian
- Đứng yên trong thế giới, Built-in, camera game ortho size 96, nhìn xuống 45°, yaw 334.8°. Scene lớn: dải thác rộng 8–15 m, cao ~22–46 m.
- Dòng chảy: mesh phủ lên mặt thác. Bọt đứng: Billboard. Bọt phẳng + gợn sóng: Billboard + Local, GO xoay X 90.

## File (trong airport-tycoon, `Assets/Anim & VFX/`)
- `Editor/WaterfallMap6Build.cs`: menu **VFX → Waterfall → Build Map6 Waterfall** (mở S_Map6 trước; chạy lại thì thay bản cũ).
- `Shader/WaterfallFlow.shader` (`AnimVFX/Waterfall Flow`): 2 lớp vệt cuộn V xuống, viền toon.
- `Shader/ToonMaskParticle.shader` (`AnimVFX/Toon Mask Particle`): mask = R×A, viền cứng; alpha hạt = ăn mòn hình.
- `Texture/Waterfall/`: `T_Waterfall_Streak` (Library `water/tile/water_tile_005`), `T_Waterfall_FoamBlob_4x4` (`water/splash/water_splash_006`), `T_Waterfall_Ripple` (`ring/thin/ring_thin_014`).
- `Materials/Waterfall/`, `Prefab/Waterfall/VFX_Waterfall_Map6.prefab` + mesh `Waterfall_Map6_Flow.asset`. Instance ở gốc scene, đã lưu scene.

## Lớp
| Lớp | Cách làm | Số chính |
|---|---|---|
| Flow | tam giác của `Road_M6/Plane.037` có normal.y < 0.93, đẩy ra 0.25 m; UV: u = chiếu ngang / 18 m, v = y / 22 m | Speed 0.7 / 1.15 UV/s, cut 0.55 |
| Foam_Blobs | hộp W×1.15 × W×0.75 trước chân thác (dời W×0.3), bắn lên, gravity 0.8 | size 9–17 m, rate 3.5·W·strength, cut 0.22 |
| Foam_Surface | blob sheet nằm phẳng trên nước, dời W×0.45 | size W×0.9–1.5, rate 7·strength |
| Ripples | vòng nở 0.3→2.5× (ease-out), alpha ăn mòn cho mảnh dần | size W×1 × hệ số, 1.1/s, cut 0.12 |

Điểm chân (x,z): Fall_A–D ở mặt sông dưới y −9.79; Pool_Top (y 35.5, gợn ×0.45); Ledge_Mid (y 13.5, không gợn).

## Chưa làm
- Mép tràn (lip) và giọt bắn: chờ art lead xem bản này.

## Ảnh
`preview_close.png`, `preview_mid.png` (bản cuối), `preview_gamezoom.png` (zoom game, trước khi thu gợn ở hồ trên).
