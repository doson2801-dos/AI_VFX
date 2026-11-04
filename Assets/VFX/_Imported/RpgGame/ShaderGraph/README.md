# Shader VFX nhập từ rpg-game (2026-11-03)

Nguồn: `D:\Projects\rpg-game\Assets` (chọn lọc shader liên quan VFX; bỏ TMP, terrain, nước, enemy, sky, OmniShade, Simply Toon, UI Shiny).
Không copy `.meta` của `.shader` / `.cginc` (GUID mới, tránh đụng). Shader Graph + SubGraph giữ `.meta` để giữ liên kết GUID; 6 subgraph trùng GUID với `Assets/shader_water` đã bỏ vì bản đó dùng chung.

| Thư mục | Nội dung |
|---|---|
| `Particle_Basic` | Additive / Alpha / Cutout / Fresnel / Star / Beam / Lightning / Electric / texture-sheet, EmissiveParticle, EnergyOrb |
| `Dissolve_Slash` | Dissolve, Thrust, Slash distortion cutout, SwordBeam, Trail, scroll XY |
| `HunFX` | SH_HunFX common / UI / simple / mobile |
| `Hovl_ERB` | CenterGlow Add/Blend, Electricity (Built-in CGPROGRAM) |
| `Master_Uber` | `VFX/Master`, `ViH_Additive`, Piloto `UberFX`, HCFX 2nd color |
| `CartoonFX` | CFXR Glow / Distortion / Ring / Ubershader + 4 file `CFXR*.cginc` (phải ở cùng thư mục) |
| `ShaderGraph` | Explosion, FireBall, Smoke, GroundCrack, Lightning, Dissolve, Ubershader, UberFXSG, Water AOE/Shield/Wave, Explosion_lab |

Lưu ý: nhiều shader viết cho **Built-in** (CGPROGRAM) và sẽ hồng trong URP; nhóm `UniversalPipeline` / HLSLPROGRAM / Shader Graph dùng được ngay với URP. Cần kiểm tra khi mở Unity.
