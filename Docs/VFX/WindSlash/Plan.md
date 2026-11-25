# VFX_WindSlash: kế hoạch v1 (2026-11-25)

Brief: lưỡi gió chém bay ngang ~8 m, hình lưỡi liềm gió, vệt sọc gió phía sau, bụi / lá cuốn, một phát ~0.6 s.
Không gian: dir (bay thẳng +X) · lưỡi nằm ngang cao 1.0 m, nghiêng lăn 18° quanh trục bay · camera 3/4 nhìn xuống 40° · quy mô: dây cung lưỡi ~3 m, bay 8 m trong 0.6 s · neo mặt đất tại điểm bắt đầu · nền lẫn.
*Đề xuất* (art lead chưa chốt): toàn bộ số đo, màu (trắng mint `E0FFF2` / `8CEBD1`, bụi `C7BD94`, lá `8CC74D`), 5 lớp bên dưới, chiều +X.

Khác với: WindTornado (cột xoáy đứng đứng yên) và WindShellTrail (vệt đuôi sau vật bay, không có lưỡi): đây là **lưỡi liềm gió bay một phát** (mesh + UV) kèm vệt, bụi, lá để lại dọc đường.

## Bất biến (viết cho effect này, chưa có file Anatomy riêng: `_Anatomy/wind-slash.md`)
- Có **một lưỡi liềm** (mesh + UV, shader Coloso) bay thẳng, lồi về phía trước, hai mũi kéo ra sau.
- **Sọc gió** kéo dài sau lưỡi (đường mảnh dài theo hướng bay).
- Bụi + lá bị cuốn và **rơi lại dọc đường bay** (không đi cùng lưỡi).
- Một phát, không lặp; không Horizontal / Vertical Billboard; lá = Stretched, đầu = mép trái.

## Lớp
| ID | Lớp | Vai trò / timing | Carrier | Shader | Texture |
|---|---|---|---|---|---|
| L1 | Blade (root) + BladeM | **v1.1**: lưỡi = 2 nửa đối xứng (A và B lật gương, mỗi nửa cung 24% vòng, đầu dày ở giữa u = 0.25, đuôi mỏng ra hai mũi) ghép thành lưỡi liềm; lưỡi chính, sống 0.6 s, bay 13.3 m/s, mờ vào 10% / ra 30% cuối, tan streak theo Custom1.x | mesh `SM_VFX_Slash_Circle_Thin` cắt cung 40% vòng, tâm cung = x của hạt | Coloso Alpha | xem dưới |
| L2 | Edge + EdgeM | viền sáng mỏng trên lưỡi, mỗi nửa cung 17% | cùng mesh, scale ×1.01 | Coloso Additive | xem dưới |
| L3 | Wake | 7 hạt mang theo cùng tốc độ, mỗi hạt kéo một Trails ribbon (đời 0.3 s) = vạch gió dài | Trails PerParticle, World | Mobile Additive | xem dưới |
| L4 | Dust0..7 | 8 trạm dọc đường, mỗi trạm nổ khi lưỡi đi qua (startDelay = x / v), 3 hạt khói bụi | Billboard, World | Mobile Alpha Blended | xem dưới |
| L5 | Leaves0..7 | như L4, 3 lá văng ngẫu nhiên, gravity 0.3 | Stretched Billboard (2x4 ô ngẫu nhiên) | Mobile Alpha Blended | xem dưới |

Thứ tự vẽ: Blade 0, Edge 1, Dust 2, Wake 3, Leaves 4.
Lý do Dust / Leaves dùng trạm: Edge shape + arc Loop **không quét** theo thời gian ở bản Unity này (hạt xuất hiện khắp đường ngay từ 0.04 s trong preview đầu), nên chuyển sang startDelay theo trạm.

## Texture (Library, đã xem contact sheet)
| Thành phần | Thư mục | Chốt | Dự phòng | Đã loại |
|---|---|---|---|---|
| Blade `_MainTex` | `Slash/Main_tex(Uvmesh)` | `Slash_Main_tex_Uvmesh_028` (xám nhiều lớp, đầu trái, đuôi sọc phải = lớp gió) | `Slash_Main_tex_Uvmesh_029` | `025` (hình tia sét), `006` (sao chổi tròn), `016` (khối phồng) |
| Edge `_MainTex` | `Slash/Main_tex(Uvmesh)` | `Slash_Main_tex_Uvmesh_030` (nêm đặc, đuôi sọc) | `027` | `021` (quá cụt) |
| `_MaskTex` | luật Coloso (không phải Library) | `Assets/VFX/Slash360/Textures/T_VFX_Gradient_01.png` | - | `mask_gradient_008` (đã thay theo review: luật bắt buộc T_VFX_Gradient_01) |
| Dissolve | `noise/streak` | `noise_streak_003` (sọc ngang, tan thành sợi) | `noise_streak_006` | `005`/`007` (sọc dọc) |
| Wake ribbon | `trail/streak` | `trail_streak_005` (vạch mảnh nhọn hai đầu, có alpha) | `trail_streak_006` | `trail_streak_012` (khối trắng đặc, đã ghi ở LIBRARY) |
| Dust | `smoke/soft` | `smoke_soft_004` (đốm mềm, alpha) | `smoke_soft_001` | `smoke_soft_003` (nhỏ, có chi tiết), `006` (hạt thô) |
| Lá | `spark/shard` | `spark_shard_002` (sheet 2x4 lưỡi nhọn trắng, dùng làm lá / cọng cỏ) | `spark_shard_001` | `spark_shard_003` (mảnh vỡ rối). Library **không có ảnh lá thật**: đây là xấp xỉ, nói rõ với art lead |

Ghi chú: Frame over Time không dùng (chọn ô ngẫu nhiên, không chạy flipbook).

Builder: `Assets/VFX/WindSlash/Editor/WindSlashBuild.cs` (menu `VFX/WindSlash/Build`). Prefab `Assets/VFX/WindSlash/Prefabs/VFX_WindSlash.prefab`. Preview `Docs/VFX/WindSlash/Preview_sheet.png`.
v1.1 (sau review): bán kính 2.6 m, ghép hai nửa lật gương nên hết đầu sao chổi, ra hình C hai mũi kéo ra sau; xoá code chết Sweeper / Drift.
Chưa chắc: (a) lưỡi vẫn nhỏ so với 8 m đường bay (~2.5 m chord), cần art lead xem; (b) hướng đầu / đuôi của texture trên mesh chỉ kiểm bằng preview; (c) chưa vào `Included`, chưa có đèn demo; (d) Finish() của kit thay scene đang mở bằng scene trống khi chụp preview.
