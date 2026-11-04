# EarthTusks — hàng ngà đá trồi theo đường thẳng (Đất)

Dựng ngày 2026-11-04 ("làm luôn với fx đất này", áp dụng nguyên tắc "mỗi effect phải khác nhau"). Thay bản Đất demo của IceSpikeFan (đã lưu ở `Docs/VFX/_ArtDirection/_archive/IceSpikeFan_Earth_demo_2026-11-04/`).

Không gian: ground · điểm đất ngay trước chân nhân vật, đường thẳng dài ~7 m theo +z · camera topdown 60° · một lần ~1,9 s · nền tối · **không có ánh sáng** (đất).
Đã chốt: Đất, không phát sáng, nứt vỡ đất, khác Băng. Đề xuất: đường thẳng 8 khối, sóng từ gần ra xa.

## Khác với effect nào, ở điểm nào (so với IceSpikeFan Băng)

| | IceSpikeFan (Băng) | EarthTusks (Đất) |
|---|---|---|
| Mesh | pha lê `Big_/Small_Crystal_*` | ngà / sừng `SM_VFX_Bone` (dày, thon), mảnh `Debris_Crystal` / `Small_Crystal_03` |
| Bố cục | cụm tròn quanh một điểm, 1 gai giữa dài nhất | **đường thẳng** ~7 m trước mặt, hai hàng xen kẽ trái / phải, dày và cao dần về cuối, uốn vào nhau như hàm |
| Timing | cả cụm gần như cùng lúc, mỗi khối **tuổi thọ ngẫu nhiên** (tan lệch) | **sóng** chạy từ gần ra xa (mỗi khối trễ 0,055 s), đứng ~0,8 s rồi **vỡ theo đúng thứ tự trồi** (khối gần tan trước) |
| Lớp phụ | glow đất + vết nứt sáng + impact (chớp, vòng) + khói giữa cụm + mảnh vỡ bắn lên | **không ánh sáng**: vết nứt tối kéo dài theo đường, bụi và mảnh đá văng **ngang** dọc đường theo sóng, không impact / vòng / glow |
| Shader / vật liệu | pha lê: Rock Facet + MatCap sáng | đá: Rock Facet toon + MatCap nhẹ (chung shader, khác vật liệu) |

## Lớp

| ID | Lớp | Ghi chú |
|---|---|---|
| G2 | `G2_FissureRim` | viền bụi nhạt phía sau vết nứt, 2,7 × 8,6 m, order −4 |
| G1 | `G1_Fissure` | vết nứt tối (texture `GroundCracks_Radial` kéo dãn 1,9 × 7,6 m theo +z), Coloso Alpha nâu đen, order −3 |
| H1–H8 | 8 ngà (`SM_VFX_Bone`) | mỗi khối một Particle System: vị trí, độ trễ, nghiêng, yaw (đổi chiều cong), bề rộng 2,0 → 3,0, cao 1,6 → 3,4 m; trồi 0,13 s có nảy, đứng, vỡ; Rock Facet, order 0 |
| D1 | `D1_DustLine` | bụi `fx_t_smoke_02` + `Mobile/Particles/Alpha Blended`, phát ngẫu nhiên dọc đường theo nhịp sóng, tô nâu xám; order −2 |
| R1 | `R1_RockSpray` | 10 mảnh đá văng ngang, nặng (gravity 3,2); order 1 |

Texture dùng chung với IceSpike: `T_IceSpike_RockPalette.png` (đã vẽ thêm mảng UV của `SM_VFX_Bone`, script `Docs/VFX/IceSpike/make_rock_palette.py`), `T_IceSpike_MatCap.png`, `T_IceSpike_Cracks.png`.
Ngân sách: 8 khối chính (5–9 theo art lead) + bụi / mảnh phụ, 6 material.
Build: menu `VFX → EarthTusks → Build`; builder `Assets/VFX/EarthTusks/Editor/EarthTusksBuild.cs`.

Phát hiện khi làm: `ShapeType.Edge` với `radiusMode = Loop` không rải vị trí phát dọc đường (bụi dồn về một đầu) → dùng `Random` dọc đường, chỉ canh thời điểm theo sóng.
