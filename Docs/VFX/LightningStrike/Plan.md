# LightningStrike – sét đánh xuống (2026-11-04)

Không gian (art lead chốt): ground, điểm đánh 1 chỗ trên đất, camera top-down 60°, tia cao ~8 m.
Bố cục: 1 tia chính (3 hình nháy 0 / 0.07 / 0.15 s) + 3 tia nhánh nhỏ hơn, lệch quanh 1.5 m, đánh trễ 0.1 / 0.18 / 0.27 s.
Lớp: S0 vết cháy + ánh sáng nền, S2 nứt đất toả tròn, S1 tia sét, S3 cung điện, S4 impact mix (`Docs/VFX/_Recipes/LightningStrike_Impact.json`).
Cách làm (bản 2, theo mẫu rpg-game đã render): nứt đất toả tròn (T_VFX_Ground_Crack) + tia Stretched Billboard sheet 5 frame (xếp chồng 3) + cung điện trắng sheet 3x3 + impact mix. Xem vfx-shader `references/lightning.md`.
Build: menu VFX → LightningStrike → Build, rồi VFX → Showcase → Build Scene.
Chưa làm: ánh sáng động, tinh chỉnh theo phản hồi art lead.
