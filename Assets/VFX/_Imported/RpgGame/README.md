
## Dùng chung URP + Built-in (2026-11-03)

14 shader URP gốc đã viết lại thành `CGPROGRAM` + `UnityCG.cginc` (không include gì của package URP), nên biên dịch được cả khi **chưa cài URP** lẫn khi đã cài. Lớp ánh xạ hàm kiểu URP (`TransformObjectToHClip`, `TEXTURE2D`, `GetVertexPositionInputs`, ...) ở `Common/VfxPortable.cginc`.

Đã kiểm tra bằng Unity 2022.3.62f3 batchmode ở project tạm: Built-in (không URP) và có URP 14.0.12, 28 shader của `Particle_Basic` + `Dissolve_Slash` đều 0 lỗi (đối chứng: cố ý làm hỏng một shader thì báo lỗi đúng).

Đã đổi so với bản gốc:
- Bỏ tag `RenderPipeline=UniversalPipeline` và `LightMode` ở pass chính (pass không tag được cả hai pipeline vẽ).
- Bỏ các pass phụ (ShadowCaster, DepthOnly, DepthNormals, Meta, Picking...): hạt trong suốt không dùng.
- `VFXShaderAdditive/Alpha/AlphaCutout` có fade theo độ sâu: cần bật Depth Texture (URP: Pipeline Asset; Built-in: camera `depthTextureMode`).
- Mất khả năng SRP Batcher của các shader này (không ảnh hưởng hiển thị).

Chưa làm: 6 Shader Graph chỉ có target URP (Explosion, FireBall, GroundCrack, LightningParticles, ParticlePackAdditive, Smoke) vẫn cần URP; 9 graph còn lại có thêm target Built-in.

## RpgThunder (2026-11-04)
`Assets/VFX/_Imported/RpgThunder/` = bản sao nguyên vẹn của `VFX_BossRaid_Knight_Thunder.prefab` (rpg-game) cùng mọi vật liệu, texture, mesh nó dùng (giữ nguyên đường dẫn con và GUID gốc). Shader `VFX/Master`, `ERB/Particles/Add_CenterGlow`, `Thrust` dùng lại bản đã nhập ở đây (vật liệu đã nối lại GUID). Render thử trong project sạch: giống bản gốc.
