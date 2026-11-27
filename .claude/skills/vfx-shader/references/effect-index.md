# Chỉ mục theo loại effect (2026-11-26)

Dùng ở bước 1–2 của skill: **tìm loại gần nhất → mở Anatomy (Bất biến) → mở reference + builder mẫu → xem prefab đã có**. Chưa có dòng nào hợp thì research và tạo Anatomy mới (`_Anatomy/README.md`), rồi **thêm một dòng vào bảng này**.

Đường dẫn: Anatomy = `Docs/VFX/_Anatomy/<tên>.md`; reference = `.claude/skills/vfx-shader/references/<tên>.md`; builder = `Assets/VFX/<Effect>/Editor/`; mẫu trong skill = `.claude/skills/vfx-shader/assets/`.

| Loại effect | Anatomy | Reference của skill | Builder / prefab đã có (tham khảo) | Builder mẫu trong skill |
|---|---|---|---|---|
| Vệt chém mesh + UV (Slash) | `slash360` | `coloso` | `Slash360` (Earth / Fire / Water), `OnHitSlash` | `ColosoMeshFxBuild.example.cs` |
| Lưỡi gió chém bay ngang | `wind-slash` | `coloso` | `WindSlash` | |
| Gai băng / đất đâm lên | `ice-spike-fan` | `ground-spike` | `IceSpike` (Ice / Magma / Thorn) | `GroundSpikeBuild.example.cs` |
| Vòng phép: hồi máu, triệu hồi, cast | `heal-circle`, `summon-circle`, `cast-circle` | `magic-circle` | `HealCircle` (4 biến thể), `SummonCircle` (+Rise), `CastCircle` | `MagicCircleBuild.example.cs` |
| Tornado / cột gió xoáy | `tornado` | `tornado`, `study-reference` | `FireTornado` (Frost / Sand), `WindTornado` | `TornadoBuild.example.cs`, `TornadoFireBuild.example.cs` |
| Gió bùng quanh chân | `wind-burst` | | `WindBurst` | |
| Sét đánh từ trời / loạt sét | `lightning-strike`, `violet-thunder`, `violet-storm` | `thunder-core`, `lightning`, `lightning-set` | `LightningStrike`, `VioletThunder` (5 biến thể) + `VioletStorm` | |
| Điện bám vũ khí / vệt điện / aura | `aura-gauntlet` | `lightning-set`, `thunder-core` | `ThunderSpear`, `LightningTrail`, `AuraGauntlet` | |
| Tia điện A→B bằng shader (không texture) | (chưa có) | `vfx-code/references/electric-bolt.md` | `ElectricBolt` | |
| Cầu lửa / đạn bay có đuôi | `hero-projectile`, `fireball-throw` | | `FireballThrow` (Frost / Poison), `FireballStraight`, `FireballCharge` | |
| Lửa thổi / phun / sóng lửa | `fire-breath`, `flamethrower`, `fire-wave-cast`, `fire-hand-flame` | `study-reference` (nếu học prefab) | `FireBreath` | |
| Nổ đất, khói vụ nổ | `explosion` | | `GroundBlast`, `MushroomBlast`, `BlenderBlast` (chưa thấy Anatomy riêng) | |
| Tia laser | `laser-beam` | | (chưa có prefab) | |
| Xúc xắc: vệt + nổ | `die-trail`, `die-explosion` | | `LuckyDice` | |
| Nổ mở phần thưởng | `reward-burst` | | | |
| Tan biến thành cát bụi | `disintegrate` | | bản html trong `Docs/VFX/Disintegrate/` | |
| Đất bung lên khi xe chạy | `dirt-kickup` | | | |
| Thác nước (môi trường loop) | `waterfall` | | | |
| Vệt gió bám vỏ | (chưa có) | | `WindShellTrail` | |

Ghi chú:
- Bảng này chỉ chỉ đường, **không thay Anatomy**: "Bất biến" của loại effect nằm ở Anatomy.
- Chất liệu / nguyên tố (băng, đất, lửa, độc…): `Docs/VFX/_Anatomy/materials.md`.
- Ô trống = chưa có / chưa thấy. Một số hàng chỉ có Anatomy mà chưa có prefab trong `Assets/VFX/`, hoặc ngược lại: thiếu cái nào thì tạo khi làm lần đầu.
- Bảng được dựng từ danh sách thư mục ngày 2026-11-26 và đầu mỗi file Anatomy; chưa kiểm từng builder có chạy được trên Unity hiện tại.
