# BlenderBlast — thử vụ nổ dựng bằng Blender MCP (2026-11-11)

Không gian (đã chốt, art lead chọn mặc định): ground · ~3 m (vòm cao ~2,5 m, sóng tới r 3,8 m) · camera 3/4 nhìn xuống 40° · neo điểm nổ · ~1,5 s một phát · lửa cam + khói xám · nền tối.
Cách làm (art lead chọn): **mesh hoạt hình** dựng bằng Python trong Blender 4.3 qua MCP (`mcp__blender__execute_blender_code`), 30 fps, frame 1–50.
Tạo hình: `Docs/VFX/_Anatomy/explosion.md` (tạo mới hôm nay).

Bất biến (chép từ anatomy): một chớp, một ngữ cảnh · thân là cụm khối sần đáy rộng có chiều cao, lửa trong lòng khói · nở nhanh – nguội – tan chậm · màu nóng → nguội.

| # | Lớp | Timing (frame @30) | Dựng |
|---|---|---|---|
| 1 | Flash | 1–6 | cầu sần r 1,7 m, emission vàng trắng, scale lên 2 frame rồi co |
| 2 | Thân (21 cụm × 3 trạng thái) | Hot 1–15 → Ember 6–22 → Smoke 10–50 | icosphere 4 + noise fractal (sần 0,22–0,3); bố cục: 10 cụm vành đáy r 1,1–1,6 · 7 giữa cao 1 m · 4 đỉnh 1,75 m; chuyển trạng thái bằng **đổi scale chéo** giữa 3 object cùng vị trí (vì màu vật liệu không xuất qua FBX); cụm trên bốc nhanh hơn; khói tan bằng co nhỏ |
| 3 | Shockwave | 1–12 | torus mảnh nằm đất, r 0,4 → 3,8 ease-out, dẹt dần |
| 4 | Đá văng | 1–34 | 12 viên sần, đạn đạo g 9,8, xoay, chạm đất dừng, co ở cuối |
| 5 | Tia lửa | 1–17 | 18 khối hộp kéo dài theo vận tốc (quaternion theo hướng bay), drag + trọng lực nhẹ |

File:
- `Assets/VFX/BlenderBlast/Mesh/SM_VFX_BlenderBlast.fbx` (animation baked, cho Unity; Unity chưa có glTFast)
- `Assets/VFX/BlenderBlast/Mesh/SM_VFX_BlenderBlast.glb` (bản tham khảo, giữ emission)
- `Assets/VFX/BlenderBlast/Source~/BlenderBlast.blend` (nguồn; `~` để Unity bỏ qua)
- Preview: `Docs/VFX/BlenderBlast/Preview_sheet.png` (frame 2, 4, 7, 10, 14, 20, 30, 42; EEVEE, camera 3/4 40°)

Chưa làm:
- Prefab `VFX_BlenderBlast` trong Unity: lúc làm, Unity MCP đang nối vào project khác nên chưa import. Cần: Animation Type Legacy (hoặc Generic + Animator), vật liệu Unity (Hot/Core/Ember/Flash/Ring/Spark = Additive hoặc Unlit emission, Smoke/Rock = Lit), Scaling Mode không áp dụng (không phải particle).
- Chưa vào `Included` (chờ art lead duyệt).

Bài học Blender MCP:
- Xoá object không xoá collection đang link vào scene → collection mới bị đặt tên `.001`; xoá collection rỗng trước khi dựng lại.
- `select_set` / `hide_set` trong ngữ cảnh addon không ăn khi xuất; gỡ collection preview khỏi scene rồi xuất cả scene.
- AgX làm lửa cháy trắng → view transform `Standard`, emission thấp (1,5–3).

Nhận xét tự review: đạt 4 bất biến. Yếu: lửa phẳng màu (chưa có gradient sâu), khói tan bằng co nhỏ chứ chưa ăn mòn thành sợi như GroundBlast, viền vòng sóng hơi dày.
